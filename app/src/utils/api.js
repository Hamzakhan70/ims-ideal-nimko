// API Configuration
const RAW_BASE = (import.meta.env.VITE_API_URL );
// Remove /api suffix if present to normalize the base URL
export const API_BASE_URL = RAW_BASE;


const withApi = (path) => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const api = {
  // Products
  products: {
    getAll: () => withApi('/products'),
    getById: (id) => withApi(`/products/${id}`),
    create: () => withApi('/products'),
    update: (id) => withApi(`/products/${id}`),
    updateStock: (id) => withApi(`/products/${id}/stock`),
    delete: (id) => withApi(`/products/${id}`),
    uploadImages: () => withApi('/products/upload-images'),
    uploadImage: () => withApi('/products/upload-image'),
    categories: () => withApi('/products/categories/list')
  },

  // Orders
  orders: {
    getAll: () => withApi('/orders'),
    getById: (id) => withApi(`/orders/${id}`),
    create: () => withApi('/orders'),
    update: (id) => withApi(`/orders/${id}`),
    updateStatus: (id) => withApi(`/orders/${id}/status`),
    delete: (id) => withApi(`/orders/${id}`),
    stats: () => withApi('/orders/stats/dashboard')
  },

  // Shopkeeper Orders
  shopkeeperOrders: {
    getAll: () => withApi('/shopkeeper-orders'),
    getById: (id) => withApi(`/shopkeeper-orders/${id}`),
    create: () => withApi('/shopkeeper-orders'),
    updateStatus: (id) => withApi(`/shopkeeper-orders/${id}/status`),
    updatePayment: (id) => withApi(`/shopkeeper-orders/${id}/payment`),
    stats: () => withApi('/shopkeeper-orders/stats/dashboard')
  },

  // Shopkeepers
  shopkeepers: {
    getAll: () => withApi('/shopkeepers')
  },

  // Cities
  cities: {
    getAll: () => withApi('/cities'),
    create: () => withApi('/cities'),
    update: (id) => withApi(`/cities/${id}`),
    delete: (id) => withApi(`/cities/${id}`)
  },

  // Users
  users: {
    getAll: () => withApi('/users'),
    getById: (id) => withApi(`/users/${id}`),
    create: () => withApi('/users'),
    update: (id) => withApi(`/users/${id}`),
    delete: (id) => withApi(`/users/${id}`),
    profile: () => withApi('/users/profile'),
    login: () => withApi('/users/login')
  },

  // Admin
  admin: {
    login: () => withApi('/admin/login'),
    profile: () => withApi('/admin/profile')
  },

  // Distribution
  distribution: {
    getAll: () => withApi('/distribution'),
    create: () => withApi('/distribution'),
    updateStatus: (id) => withApi(`/distribution/${id}/status`)
  },

  // Sales
  sales: {
    getAll: () => withApi('/sales'),
    create: () => withApi('/sales'),
    stats: () => withApi('/sales/stats/dashboard')
  },

  // Assignments
  assignments: {
    getAll: () => withApi('/assignments'),
    getBySalesman: (salesmanId) => withApi(`/assignments/salesman/${salesmanId}`),
    getShopkeepersBySalesman: (salesmanId) => withApi(`/assignments/salesman/${salesmanId}/shopkeepers`),
    create: () => withApi('/assignments'),
    update: (id) => withApi(`/assignments/${id}`),
    delete: (id) => withApi(`/assignments/${id}`),
    getAvailableSalesmen: () => withApi('/assignments/available/salesmen'),
    getAvailableShopkeepers: () => withApi('/assignments/available/shopkeepers')
  },

  // Categories
  categories: {
    getAll: () => withApi('/categories'),
    getAllForAdmin: () => withApi('/categories/all'),
    create: () => withApi('/categories'),
    update: (id) => withApi(`/categories/${id}`),
    delete: (id) => withApi(`/categories/${id}`),
    toggle: (id) => withApi(`/categories/${id}/toggle`),
    reorder: () => withApi('/categories/reorder')
  },

  // Recoveries
  recoveries: {
    getAll: () => withApi('/recoveries'),
    getById: (id) => withApi(`/recoveries/${id}`),
    create: () => withApi('/recoveries'),
    update: (id) => withApi(`/recoveries/${id}`),
    delete: (id) => withApi(`/recoveries/${id}`),
    getStats: () => withApi('/recoveries/stats/summary'),
    getShopkeepers: (salesmanId) => withApi(`/recoveries/shopkeepers/${salesmanId}`)
  },

  // Receipts
  receipts: {
    getAll: () => withApi('/receipts'),
    getById: (id) => withApi(`/receipts/${id}`),
    create: () => withApi('/receipts'),
    updateStatus: (id) => withApi(`/receipts/${id}/status`),
    getStats: () => withApi('/receipts/stats/summary')
  },

  // Analytics
  analytics: {
    getDashboard: () => withApi('/analytics/dashboard'),
    getSalesmanAnalytics: (salesmanId) => withApi(`/analytics/salesman/${salesmanId}`),
    getReceivedPaymentsDetails: () => withApi('/analytics/payments/received-details'),
    getOutstandingBalancesDetails: () => withApi('/analytics/payments/outstanding-details')
  },

  // Notifications
  notifications: {
    getAll: () => withApi('/notifications'),
    getById: (id) => withApi(`/notifications/${id}`),
    markAsRead: (id) => withApi(`/notifications/${id}/read`),
    markAllAsRead: () => withApi('/notifications/read-all'),
    create: () => withApi('/notifications'),
    delete: (id) => withApi(`/notifications/${id}`)
  }
};
