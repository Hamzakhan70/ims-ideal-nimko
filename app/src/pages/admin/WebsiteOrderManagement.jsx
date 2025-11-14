import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../utils/api';
import { useNotifications } from '../../context/NotificationContext';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function WebsiteOrderManagement() {
  const [statusFilter, setStatusFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const { notifications, markAsRead } = useNotifications();
  const [unreadOrderIds, setUnreadOrderIds] = useState(new Set());

  // Fetch function for pagination hook
  const fetchOrders = useCallback(async (params) => {
    const token = localStorage.getItem('adminToken');
    const queryParams = new URLSearchParams({
      page: params.page,
      limit: params.limit,
      ...(params.status && { status: params.status }),
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
  } = usePagination(fetchOrders, { status: '', startDate: '', endDate: '' }, 10);

  // Update filters when they change
  useEffect(() => {
    handleFilterChange('status', statusFilter);
  }, [statusFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('startDate', startDateFilter);
  }, [startDateFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('endDate', endDateFilter);
  }, [endDateFilter, handleFilterChange]);

  // Track unread orders from notifications
  useEffect(() => {
    const orderNotifications = notifications.filter(notif => 
      notif.type === 'order' && 
      notif.relatedEntityType === 'Order' && 
      !notif.isRead
    );
    
    const unreadIds = new Set(orderNotifications.map(notif => notif.relatedEntity));
    setUnreadOrderIds(unreadIds);
  }, [notifications]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.put(api.orders.updateStatus(orderId), {
        status: newStatus
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      refreshOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleOrderClick = async (orderId) => {
    // Mark related notification as read
    const relatedNotification = notifications.find(notif => 
      notif.type === 'order' && 
      notif.relatedEntityType === 'Order' && 
      notif.relatedEntity === orderId &&
      !notif.isRead
    );
    
    if (relatedNotification) {
      await markAsRead(relatedNotification._id);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-indigo-100 text-indigo-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Define table columns
  const columns = [
    {
      key: 'orderId',
      header: 'Order ID',
      render: (order) => {
        const isUnread = unreadOrderIds.has(order._id);
        return (
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-900">#{order._id.slice(-8)}</span>
            {isUnread && <span className="ml-2 text-red-500 animate-pulse">●</span>}
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <span className="text-sm text-gray-900">{order.customerName}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Total Amount',
      render: (order) => (
        <span className="text-sm text-gray-900">{formatCurrency(order.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)} capitalize`}>
          {order.status}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Order Date',
      render: (order) => (
        <span className="text-sm text-gray-500">{new Date(order.orderDate).toLocaleDateString()}</span>
      ),
    },
  ];

  const rowActions = (order) => {
    const isUnread = unreadOrderIds.has(order._id);
    return (
      <div className="flex items-center space-x-2">
        <select
          value={order.status}
          onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
          className="px-2 py-1 border rounded-md text-gray-700 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Website Orders Management</h1>
            <p className="text-gray-600">Track and manage customer orders from website</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
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
                setStatusFilter('');
                setStartDateFilter('');
                setEndDateFilter('');
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
          emptyMessage="No website orders found."
          onRowClick={(order) => handleOrderClick(order._id)}
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
}
