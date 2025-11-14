import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../utils/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function UserManagement() {
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [cities, setCities] = useState([]);
  const [selectedCityFilter, setSelectedCityFilter] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'shopkeeper',
    phone: '',
    address: '',
    territory: '',
    city: '',
    pendingAmount: 0,
    creditLimit: 0
  });

  // Fetch function for pagination hook
  const fetchUsers = useCallback(async (params) => {
    const token = localStorage.getItem('adminToken');
    const queryParams = new URLSearchParams({
      page: params.page,
      limit: params.limit,
      ...(params.search && { search: params.search }),
      ...(params.role && { role: params.role }),
      ...(params.city && { city: params.city }),
    });

    const response = await axios.get(`${api.users.getAll()}?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response;
  }, []);

  // Use pagination hook
  const {
    data: users,
    loading,
    pagination,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
    refresh: refreshUsers,
  } = usePagination(fetchUsers, { search: '', role: '', city: '' }, 20);

  useEffect(() => {
    fetchCities();
  }, []);

  // Update filters when search/role/city changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleFilterChange('search', searchTerm);
    }, searchTerm ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('role', selectedRoleFilter);
  }, [selectedRoleFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('city', selectedCityFilter);
  }, [selectedCityFilter, handleFilterChange]);

  const fetchCities = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(api.cities.getAll(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCities(response.data.cities || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = editingUser ? api.users.update(editingUser._id) : api.users.create();
      const method = editingUser ? 'put' : 'post';
      
      // Prepare data for submission
      const submitData = { ...formData };
      if (editingUser && !submitData.password) {
        // Don't send password if it's empty during update
        delete submitData.password;
      }
      if (!submitData.city) {
        delete submitData.city;
      }
      
      const response = await axios[method](url, submitData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      alert(editingUser ? 'User updated successfully!' : 'User created successfully!');
      setShowForm(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'shopkeeper',
        phone: '',
        address: '',
        territory: '',
        city: '',
        pendingAmount: 0,
        creditLimit: 0
      });
      refreshUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    fetchCities(); // Refresh cities list when editing
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't pre-fill password
      role: user.role,
      phone: user.phone,
      address: user.address,
      territory: user.territory || '',
      city: (user.city && (user.city._id || user.city)) || '',
      pendingAmount: user.pendingAmount || 0,
      creditLimit: user.creditLimit || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(api.users.delete(userId), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      alert('User deleted successfully!');
      refreshUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'shopkeeper',
      phone: '',
      address: '',
      territory: '',
      city: '',
      pendingAmount: 0,
      creditLimit: 0
    });
  };

  // Define table columns
  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (user) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{user.name}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
          {user.territory && (
            <div className="text-xs text-gray-400">{user.territory}</div>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
          user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
          user.role === 'salesman' ? 'bg-green-100 text-green-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {user.role}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (user) => (
        <div className="text-sm text-gray-500">
          <div>{user.phone}</div>
          <div className="text-xs">{user.address}</div>
        </div>
      ),
    },
    {
      key: 'pendingAmount',
      header: 'Pending Amount',
      render: (user) => (
        <span className="text-sm text-gray-900">
          {user.role === 'shopkeeper' ? `PKR${(user.pendingAmount || 0).toFixed(2)}` : '-'}
        </span>
      ),
    },
    {
      key: 'creditLimit',
      header: 'Credit Limit',
      render: (user) => (
        <span className="text-sm text-gray-900">
          {user.role === 'shopkeeper' ? `PKR${(user.creditLimit || 0).toFixed(2)}` : '-'}
        </span>
      ),
    },
  ];

  const rowActions = (user) => (
    <div className="flex gap-2">
      <button
        onClick={() => handleEdit(user)}
        className="text-blue-600 hover:text-blue-900"
      >
        Edit
      </button>
      <button
        onClick={() => handleDelete(user._id)}
        className="text-red-600 hover:text-red-900"
      >
        Delete
      </button>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => {
            fetchCities(); // Refresh cities list when opening form
            setShowForm(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create New User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              <option value="shopkeeper">Shopkeeper</option>
              <option value="salesman">Salesman</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <select
              value={selectedCityFilter}
              onChange={(e) => setSelectedCityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Cities</option>
              {cities.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedRoleFilter('');
              setSelectedCityFilter('');
              handleFilterChange('search', '');
              handleFilterChange('role', '');
              handleFilterChange('city', '');
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingUser ? 'Edit User' : 'Create New User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password {editingUser ? '(Leave empty to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="shopkeeper">Shopkeeper</option>
                    <option value="salesman">Salesman</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Territory
                  </label>
                  <input
                    type="text"
                    value={formData.territory}
                    onChange={(e) => setFormData({...formData, territory: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Shopkeeper specific fields */}
              {formData.role === 'shopkeeper' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select city</option>
                      {cities.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pending Amount (PKR)
                    </label>
                    <input
                      type="number"
                      value={formData.pendingAmount}
                      onChange={(e) => setFormData({...formData, pendingAmount: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Outstanding balance for this shopkeeper</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credit Limit (PKR)
                    </label>
                    <input
                      type="number"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({...formData, creditLimit: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum credit allowed for this shopkeeper</p>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        rowActions={rowActions}
        emptyMessage="No users found. Create your first user above."
      />

      {/* Pagination */}
      <Pagination
        currentPage={pagination.current}
        totalPages={pagination.pages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
