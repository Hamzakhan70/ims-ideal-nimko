import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../utils/api';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function ShopkeeperOrderManagement() {
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Fetch function for pagination hook
  const fetchOrders = useCallback(async (params) => {
    const token = localStorage.getItem('adminToken');
    const queryParams = new URLSearchParams({
      page: params.page,
      limit: params.limit,
      ...(params.status && { status: params.status }),
      ...(params.paymentStatus && { paymentStatus: params.paymentStatus }),
      ...(params.startDate && { startDate: params.startDate }),
      ...(params.endDate && { endDate: params.endDate }),
    });

    const response = await axios.get(`${api.shopkeeperOrders?.getAll() || '/api/shopkeeper-orders'}?${queryParams}`, {
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
  } = usePagination(fetchOrders, { status: '', paymentStatus: '', startDate: '', endDate: '' }, 10);

  // Update filters when they change
  useEffect(() => {
    handleFilterChange('status', statusFilter);
  }, [statusFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('paymentStatus', paymentStatusFilter);
  }, [paymentStatusFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('startDate', startDateFilter);
  }, [startDateFilter, handleFilterChange]);

  useEffect(() => {
    handleFilterChange('endDate', endDateFilter);
  }, [endDateFilter, handleFilterChange]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(api.shopkeeperOrders.updateStatus(orderId), 
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      refreshOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status: ' + (error.response?.data?.error || error.message));
    }
  };

  const handlePaymentUpdate = async (orderId, paymentStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(api.shopkeeperOrders.updatePayment(orderId), 
        { paymentStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      refreshOrders();
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Error updating payment status: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
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
      key: 'order',
      header: 'Order',
      render: (order) => (
        <div>
          <div className="text-sm font-medium text-gray-900">#{order._id.slice(-8)}</div>
          <div className="text-sm text-gray-500">{formatDate(order.orderDate)}</div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{order.shopkeeper?.name || 'N/A'}</div>
          <div className="text-sm text-gray-500">{order.shopkeeper?.email || ''}</div>
          <div className="text-sm text-gray-500">{order.shopkeeper?.phone || ''}</div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order) => (
        <div>
          <div className="text-sm text-gray-900">
            {order.items?.length || 0} item(s)
          </div>
          <div className="text-sm text-gray-500">
            {order.items?.slice(0, 2).map(item => item.product?.name || 'N/A').join(', ')}
            {order.items?.length > 2 && '...'}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (order) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{formatCurrency(order.totalAmount)}</div>
          <div className="text-sm text-gray-500">Commission: {formatCurrency(order.commission || 0)}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (order) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
          {order.paymentStatus}
        </span>
      ),
    },
  ];

  const rowActions = (order) => (
    <div className="flex flex-col gap-2">
      <select
        value={order.status}
        onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
        className="text-xs border border-gray-300 rounded px-2 py-1"
      >
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="processing">Processing</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <select
        value={order.paymentStatus}
        onChange={(e) => handlePaymentUpdate(order._id, e.target.value)}
        className="text-xs border border-gray-300 rounded px-2 py-1"
      >
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="partial">Partial</option>
        <option value="overdue">Overdue</option>
      </select>
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Shopkeeper Orders</h1>
        
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">All Payment</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
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
                setPaymentStatusFilter('');
                setStartDateFilter('');
                setEndDateFilter('');
                handleFilterChange('status', '');
                handleFilterChange('paymentStatus', '');
                handleFilterChange('startDate', '');
                handleFilterChange('endDate', '');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
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
  );
}
