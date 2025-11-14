import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../utils/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function CategoryManagement() {
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    color: '#3B82F6',
    sortOrder: 0
  });

  // Fetch function for pagination hook
  const fetchCategories = useCallback(async (params) => {
    const token = localStorage.getItem('adminToken');
    const queryParams = new URLSearchParams({
      page: params.page,
      limit: params.limit,
      ...(params.search && { search: params.search }),
    });

    const response = await axios.get(`${api.categories.getAllForAdmin()}?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response;
  }, []);

  // Use pagination hook
  const {
    data: categories,
    loading,
    pagination,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
    refresh: refreshCategories,
  } = usePagination(fetchCategories, { search: '' }, 20);

  // Update filters when search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleFilterChange('search', searchTerm);
    }, searchTerm ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, handleFilterChange]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = editingCategory ? api.categories.update(editingCategory._id) : api.categories.create();
      const method = editingCategory ? 'put' : 'post';
      
      const response = await axios[method](url, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      alert(editingCategory ? 'Category updated successfully!' : 'Category created successfully!');
      setShowForm(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', icon: '', color: '#3B82F6', sortOrder: 0 });
      refreshCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error saving category: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      color: category.color || '#3B82F6',
      sortOrder: category.sortOrder || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(api.categories.delete(categoryId), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      alert('Category deleted successfully!');
      refreshCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleToggle = async (categoryId) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(api.categories.toggle(categoryId), {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      alert('Category status updated successfully!');
      refreshCategories();
    } catch (error) {
      console.error('Error toggling category:', error);
      alert('Error updating category: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon: '', color: '#3B82F6', sortOrder: 0 });
  };

  // Define table columns
  const columns = [
    {
      key: 'category',
      header: 'Category',
      render: (category) => (
        <div className="flex items-center">
          {category.icon && (
            <span className="text-2xl mr-3">{category.icon}</span>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900 flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-2" 
                style={{ backgroundColor: category.color }}
              ></div>
              {category.name}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (category) => (
        <span className="text-sm text-gray-500">{category.description || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (category) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          category.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {category.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'sortOrder',
      header: 'Sort Order',
      render: (category) => (
        <span className="text-sm text-gray-900">{category.sortOrder}</span>
      ),
    },
    {
      key: 'createdBy',
      header: 'Created By',
      render: (category) => (
        <span className="text-sm text-gray-500">{category.createdBy?.name || '-'}</span>
      ),
    },
  ];

  const rowActions = (category) => (
    <div className="flex gap-2">
      <button
        onClick={() => handleEdit(category)}
        className="text-blue-600 hover:text-blue-900"
      >
        Edit
      </button>
      <button
        onClick={() => handleToggle(category._id)}
        className={`${category.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
      >
        {category.isActive ? 'Deactivate' : 'Activate'}
      </button>
      <button
        onClick={() => handleDelete(category._id)}
        className="text-red-600 hover:text-red-900"
      >
        Delete
      </button>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create New Category
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                handleFilterChange('search', '');
              }}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Category Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
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
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon (Optional)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({...formData, icon: e.target.value})}
                  placeholder="e.g., 🍕, 📱, 👕"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
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

      {/* Categories List */}
      <DataTable
        columns={columns}
        data={categories}
        loading={loading}
        rowActions={rowActions}
        emptyMessage="No categories found. Create your first category above."
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
