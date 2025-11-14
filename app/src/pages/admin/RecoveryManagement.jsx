import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../utils/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';

const RecoveryManagement = () => {
  const [stats, setStats] = useState(null);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [shopkeeperFilter, setShopkeeperFilter] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [recoveryTypeFilter, setRecoveryTypeFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Fetch function for pagination hook
  const fetchRecoveries = useCallback(async (params) => {
    const token = localStorage.getItem('adminToken');
    const queryParams = new URLSearchParams({
      page: params.page,
      limit: params.limit,
      ...(params.shopkeeperId && { shopkeeperId: params.shopkeeperId }),
      ...(params.salesmanId && { salesmanId: params.salesmanId }),
      ...(params.status && { status: params.status }),
      ...(params.recoveryType && { recoveryType: params.recoveryType }),
      ...(params.startDate && { startDate: params.startDate }),
      ...(params.endDate && { endDate: params.endDate }),
    });

    const response = await axios.get(`${api.recoveries.getAll()}?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response;
  }, []);

  // Use pagination hook
  const {
    data: recoveries,
    loading,
    pagination,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
    refresh: refreshRecoveries,
  } = usePagination(fetchRecoveries, {
    shopkeeperId: '',
    salesmanId: '',
    status: '',
    recoveryType: '',
    startDate: '',
    endDate: ''
  }, 10);

  useEffect(() => {
    fetchShopkeepers();
    fetchSalesmen();
    fetchStats();
  }, []);

  // Update filters when they change
  useEffect(() => {
    handleFilterChange('shopkeeperId', shopkeeperFilter);
  }, [shopkeeperFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('salesmanId', salesmanFilter);
  }, [salesmanFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('status', statusFilter);
  }, [statusFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('recoveryType', recoveryTypeFilter);
  }, [recoveryTypeFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('startDate', startDateFilter);
  }, [startDateFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('endDate', endDateFilter);
  }, [endDateFilter, handleFilterChange]);

  const fetchShopkeepers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(api.shopkeepers.getAll(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setShopkeepers(response.data.shopkeepers || []);
    } catch (error) {
      console.error('Error fetching shopkeepers:', error);
    }
  };

  const fetchSalesmen = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(api.users.getAll(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const salesmenData = response.data.users?.filter(user => user.role === 'salesman') || [];
      setSalesmen(salesmenData);
    } catch (error) {
      console.error('Error fetching salesmen:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(api.recoveries.getStats(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const clearFilters = () => {
    setShopkeeperFilter('');
    setSalesmanFilter('');
    setStatusFilter('');
    setRecoveryTypeFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    handleFilterChange('shopkeeperId', '');
    handleFilterChange('salesmanId', '');
    handleFilterChange('status', '');
    handleFilterChange('recoveryType', '');
    handleFilterChange('startDate', '');
    handleFilterChange('endDate', '');
  };

  const formatCurrency = (amount) => {
    return `PKR${amount?.toFixed(2) || '0.00'}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Define table columns
  const columns = [
    {
      key: 'recoveryId',
      header: 'Recovery ID',
      render: (recovery) => (
        <span className="text-sm font-medium text-gray-900">{recovery._id.slice(-8)}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (recovery) => (
        <span className="text-sm text-gray-500">{formatDate(recovery.recoveryDate)}</span>
      ),
    },
    {
      key: 'shopkeeper',
      header: 'Shopkeeper',
      render: (recovery) => (
        <span className="text-sm text-gray-900">{recovery.shopkeeper?.name || 'N/A'}</span>
      ),
    },
    {
      key: 'salesman',
      header: 'Salesman',
      render: (recovery) => (
        <span className="text-sm text-gray-900">{recovery.salesman?.name || 'N/A'}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (recovery) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          recovery.recoveryType === 'payment_only' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {recovery.recoveryType === 'payment_only' ? 'Payment Only' : 'With Items'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (recovery) => (
        <span className="text-sm font-medium text-gray-900">{formatCurrency(recovery.amountCollected)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (recovery) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          recovery.status === 'completed' 
            ? 'bg-green-100 text-green-800' 
            : recovery.status === 'pending'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {recovery.status}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">💰 Recovery Management</h1>
        <p className="text-gray-600">View and manage all recovery records</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Recoveries</p>
                <p className="text-xl font-semibold">{stats.stats?.totalRecoveries || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Collected</p>
                <p className="text-xl font-semibold">{formatCurrency(stats.stats?.totalAmountCollected)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Net Payment</p>
                <p className="text-xl font-semibold">{formatCurrency(stats.stats?.totalNetPayment)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Average Recovery</p>
                <p className="text-xl font-semibold">{formatCurrency(stats.stats?.averageRecovery)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">🔍 Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading && (
            <div className="col-span-full flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Applying filters...</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shopkeeper</label>
            <select
              value={shopkeeperFilter}
              onChange={(e) => setShopkeeperFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Shopkeepers</option>
              {shopkeepers.map(shopkeeper => (
                <option key={shopkeeper._id} value={shopkeeper._id}>
                  {shopkeeper.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salesman</label>
            <select
              value={salesmanFilter}
              onChange={(e) => setSalesmanFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Salesmen</option>
              {salesmen.map(salesman => (
                <option key={salesman._id} value={salesman._id}>
                  {salesman.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recovery Type</label>
            <select
              value={recoveryTypeFilter}
              onChange={(e) => setRecoveryTypeFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="payment_only">Payment Only</option>
              <option value="payment_with_items">Payment with Items</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              🗑️ Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Recoveries List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">📋 Recovery Records ({pagination.total || 0})</h3>
        </div>

        <DataTable
          columns={columns}
          data={recoveries}
          loading={loading}
          emptyMessage="No recovery records found. No recovery records match your current filters."
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
    </div>
  );
};

export default RecoveryManagement;
