import { apiClient } from './client';

export const authApi = {
  loginUser: (payload) => apiClient.post('/users/login', payload),
  loginAdmin: (payload) => apiClient.post('/admin/login', payload),
  getUserProfile: () => apiClient.get('/users/profile'),
  getAdminProfile: () => apiClient.get('/admin/profile')
};

export const productsApi = {
  getAll: () => apiClient.get('/products', { params: { page: 1, limit: 1000 } }),
  updateStock: (productId, payload) => apiClient.put(`/products/${productId}/stock`, payload)
};

export const shopkeeperOrdersApi = {
  getAll: (params = {}) => apiClient.get('/shopkeeper-orders', { params }),
  getShopkeepers: () => apiClient.get('/shopkeeper-orders/shopkeepers'),
  getById: (orderId) => apiClient.get(`/shopkeeper-orders/${orderId}`),
  create: (payload) => apiClient.post('/shopkeeper-orders', payload),
  updateStatus: (orderId, payload) => apiClient.put(`/shopkeeper-orders/${orderId}/status`, payload),
  updatePayment: (orderId, payload) => apiClient.put(`/shopkeeper-orders/${orderId}/payment`, payload)
};

export const assignmentsApi = {
  getShopkeepersBySalesman: (salesmanId, params = {}) => apiClient.get(`/assignments/salesman/${salesmanId}/shopkeepers`, { params })
};

export const recoveriesApi = {
  getAll: (params = {}) => apiClient.get('/recoveries', { params }),
  getStats: (params = {}) => apiClient.get('/recoveries/stats/summary', { params }),
  create: (payload) => apiClient.post('/recoveries', payload),
  getShopkeepers: (salesmanId) => apiClient.get(`/recoveries/shopkeepers/${salesmanId}`)
};

export const receiptsApi = {
  create: (payload) => apiClient.post('/receipts', payload)
};
