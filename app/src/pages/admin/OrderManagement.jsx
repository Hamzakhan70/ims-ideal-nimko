import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../utils/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function OrderManagement() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Fetch function for pagination hook
  const fetchOrders = useCallback(async (params) => {
    const token = localStorage.getItem('adminToken');
    const queryParams = new URLSearchParams({
      page: params.page,
      limit: params.limit,
      ...(params.status && { status: params.status }),
      ...(params.search && { search: params.search }),
      ...(params.startDate && { startDate: params.startDate }),
      ...(params.endDate && { endDate: params.endDate }),
    });

    const response = await axios.get(`${api.orders.getAll()}?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response;
  }, []);

  // Use pagination hook
  const {
    data: orders,
    loading,
    pagination,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
    refresh: refreshOrders,
  } = usePagination(fetchOrders, { status: '', search: '', startDate: '', endDate: '' }, 10);

  // Update filters when they change (with debounce for search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleFilterChange('search', searchFilter);
    }, searchFilter ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [searchFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('status', statusFilter);
  }, [statusFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('startDate', startDateFilter);
  }, [startDateFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('endDate', endDateFilter);
  }, [endDateFilter, handleFilterChange]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(api.orders.updateStatus(orderId), { status: newStatus }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      refreshOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.delete(api.orders.delete(orderId), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        refreshOrders();
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const formatCurrency = (amount) => {
    return `PKR ${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount || 0))}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Processing: 'bg-blue-100 text-blue-800',
      Shipped: 'bg-purple-100 text-purple-800',
      Delivered: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Define table columns
  const columns = [
    {
      key: 'orderId',
      header: 'Order ID',
      render: (order) => (
        <span className="text-sm font-medium text-gray-900">#{order._id.slice(-8)}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
          <div className="text-sm text-gray-500">{order.phone}</div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order) => (
        <span className="text-sm text-gray-900">{order.items?.length || 0} item(s)</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (order) => (
        <span className="text-sm text-gray-900">{formatCurrency(order.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => (
        <select
          value={order.status}
          onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 ${getStatusColor(order.status)}`}
        >
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (order) => (
        <span className="text-sm text-gray-500">{new Date(order.orderDate).toLocaleDateString()}</span>
      ),
    },
  ];

  const rowActions = (order) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedOrder(order);
          setShowModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
      >
        View
      </button>
      <button
        onClick={() => handleDeleteOrder(order._id)}
        className="text-red-600 hover:text-red-900"
      >
        Delete
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600">Track and manage customer orders</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Customer name, phone..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchFilter('');
                setStatusFilter('');
                setStartDateFilter('');
                setEndDateFilter('');
                handleFilterChange('search', '');
                handleFilterChange('status', '');
                handleFilterChange('startDate', '');
                handleFilterChange('endDate', '');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          rowActions={rowActions}
          emptyMessage="No orders found."
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

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Order ID</label>
                    <p className="text-sm text-gray-900">#{selectedOrder._id.slice(-8)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Information</label>
                  <div className="mt-1 text-sm text-gray-900">
                    <p><strong>Name:</strong> {selectedOrder.customerName}</p>
                    <p><strong>Phone:</strong> {selectedOrder.phone}</p>
                    <p><strong>Address:</strong> {selectedOrder.address}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Items</label>
                  <div className="mt-1 space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount:</span>
                    <span className="text-xl font-bold text-yellow-600">{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Date</label>
                  <p className="text-sm text-gray-900">{new Date(selectedOrder.orderDate).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
