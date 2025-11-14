import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { api } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/common/Pagination';

export default function SalesmanOrderManagement() {
  const { showSuccess, showError, showInfo } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    startDate: '',
    endDate: ''
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`${api.shopkeeperOrders.getAll()}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      setOrders(response.data.orders || response.data);
      console.log(response.data.orders,'response.data.orders');
    } catch (error) {
      console.error('Error fetching orders:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch orders';
      showError(`Error fetching orders: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.put(api.shopkeeperOrders.updateStatus(orderId), {
        status: newStatus
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      showSuccess(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update order status';
      showError(`Error updating order status: ${errorMessage}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-purple-100 text-purple-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const viewOrderDetails = async (orderId) => {
    try {
      const response = await axios.get(api.shopkeeperOrders.getById(orderId), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      setSelectedOrder(response.data.order);
      setShowOrderModal(true);
      
    } catch (error) {
      console.error('Error fetching order details:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch order details';
      showError(`Error fetching order details: ${errorMessage}`);
    }
  };

  // Filter and paginate orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesStatus = !filters.status || order.status === filters.status;
      const matchesPriority = !filters.priority || order.priority === filters.priority;
      const matchesStartDate = !filters.startDate || new Date(order.createdAt) >= new Date(filters.startDate);
      const matchesEndDate = !filters.endDate || new Date(order.createdAt) <= new Date(filters.endDate + 'T23:59:59');
      return matchesStatus && matchesPriority && matchesStartDate && matchesEndDate;
    });
  }, [orders, filters]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8">Shopkeeper Orders Management</h1>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Filters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Mobile Card View */}
        <div className="block sm:hidden">
          {paginatedOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No orders found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {paginatedOrders.map((order) => (
                <div key={order._id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-900">#{order._id.slice(-8)}</div>
                      <div className="text-sm text-gray-500">{order.shopkeeper?.name}</div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <div>Items: {order?.orderItems?.length || 0}</div>
                    <div>Total: PKR {order.totalAmount}</div>
                    <div>Date: {new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => viewOrderDetails(order._id)}
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      View
                    </button>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'confirmed')}
                        className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Confirm
                      </button>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'preparing')}
                        className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                      >
                        Start Preparing
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'ready')}
                        className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'delivered')}
                        className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shopkeeper</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
              <tr key={order._id}>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  #{order._id.slice(-8)}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{order.shopkeeper?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{order.shopkeeper?.email || ''}</div>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {order?.orderItems?.length || 0} items
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  PKR {order.totalAmount}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(order.priority)}`}>
                    {order.priority || 'N/A'}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <button
                      onClick={() => viewOrderDetails(order._id)}
                      className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                    >
                      View
                    </button>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'confirmed')}
                        className="text-green-600 hover:text-green-900 text-xs sm:text-sm"
                      >
                        Confirm
                      </button>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'preparing')}
                        className="text-purple-600 hover:text-purple-900 text-xs sm:text-sm"
                      >
                        Start Preparing
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'ready')}
                        className="text-green-600 hover:text-green-900 text-xs sm:text-sm"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'delivered')}
                        className="text-green-600 hover:text-green-900 text-xs sm:text-sm"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredOrders.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Order Details</h2>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  <label className="block text-sm font-medium text-gray-700">Shopkeeper</label>
                  <p className="text-sm text-gray-900">{selectedOrder.shopkeeper?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{selectedOrder.shopkeeper?.email || ''}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
                  <p className="text-sm text-gray-900">{selectedOrder.deliveryAddress}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                  <p className="text-sm text-gray-900">{selectedOrder.deliveryDate ? new Date(selectedOrder.deliveryDate).toLocaleString() : 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Items</label>
                  <div className="space-y-2">
                    {selectedOrder?.orderItems?.length > 0 ? (
                      selectedOrder.orderItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.product?.name || 'Product'}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">PKR {item.unitPrice || '0.00'}</p>
                            <p className="text-sm font-medium text-gray-900">PKR {item.totalPrice || '0.00'}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No items found</p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                    <span className="text-lg font-semibold text-gray-900">PKR {selectedOrder.totalAmount}</span>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-900">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
