import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../../utils/api';
import { AUTH_TOKEN_STORAGE_KEY } from '../../config/appConfig';

export default function ShopkeeperDashboard() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [defaultPriceMap, setDefaultPriceMap] = useState({});
  const [orders, setOrders] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    deliveryAddress: '',
    deliveryDate: '',
    notes: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      const [productsResult, pricingResult] = await Promise.allSettled([
        axios.get(api.products.getAll()),
        axios.get(api.shopkeeperOrders.getDefaultPrices(), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (productsResult.status === 'fulfilled') {
        setProducts(productsResult.value.data.products || productsResult.value.data || []);
      } else {
        console.error('Error fetching products:', productsResult.reason);
      }

      if (pricingResult.status === 'fulfilled') {
        setDefaultPriceMap(pricingResult.value.data?.priceMap || {});
      } else {
        console.error('Error fetching saved shopkeeper prices:', pricingResult.reason);
        setDefaultPriceMap({});
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(api.shopkeeperOrders.getAll(), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResolvedPrice = (productId, fallbackPrice) => {
    const savedPrice = Number(defaultPriceMap?.[productId]);
    if (Number.isFinite(savedPrice) && savedPrice >= 0) {
      return Number(savedPrice.toFixed(2));
    }

    const basePrice = Number(fallbackPrice);
    return Number.isFinite(basePrice) && basePrice >= 0 ? Number(basePrice.toFixed(2)) : 0;
  };

  const addToCart = (product) => {
    const resolvedPrice = getResolvedPrice(product._id, product.price);
    const existingItem = cart.find(item => item.product._id === product._id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product._id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, price: resolvedPrice, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product._id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.product._id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = (items = cart) => {
    return items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    try {
      await axios.post(api.shopkeeperOrders.create(), {
        items: cart.map(item => ({
          productId: item.product._id,
          quantity: item.quantity,
          originalPrice: item.product.price,
          customPrice: item.price
        })),
        ...orderForm
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      setShowOrderModal(false);
      setCart([]);
      setOrderForm({
        deliveryAddress: '',
        deliveryDate: '',
        notes: '',
        priority: 'medium'
      });
      fetchOrders();
    } catch (error) {
      console.error('Error placing order:', error);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopkeeper Dashboard</h1>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cart ({getTotalItems()} items)</h3>
              <p className="text-sm text-gray-500">{cart.length} products selected</p>
              <p className="text-gray-600">Total: PKR {getTotalAmount()}</p>
            </div>
            <button
              onClick={() => setShowOrderModal(true)}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Place Order
            </button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const displayPrice = getResolvedPrice(product._id, product.price);
            const hasSavedShopkeeperPrice = displayPrice !== product.price;
            const isLowStock = product.stock < 5;
            const isOutOfStock = product.stock <= 0;
            
            return (
              <div 
                key={product._id} 
                className={`bg-white rounded-lg shadow overflow-hidden transition-all duration-300 ${
                  isLowStock ? 'ring-2 ring-red-300 border-red-200' : ''
                } ${isOutOfStock ? 'opacity-75' : ''}`}
              >
                <div className="relative">
                  <img
                    src={product.imageURL}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  {/* Low Stock Warning Overlay */}
                  {isLowStock && !isOutOfStock && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
                      Low Stock!
                    </div>
                  )}
                  {/* Out of Stock Overlay */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
                        Out of Stock
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                    {isLowStock && !isOutOfStock && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Limited Stock
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-xl font-bold text-yellow-600">PKR {displayPrice}</span>
                      {hasSavedShopkeeperPrice && (
                        <div className="text-xs text-green-600">Base: PKR {product.price}</div>
                      )}
                    </div>
                    <div className={`text-sm font-medium ${
                      isOutOfStock 
                        ? 'text-red-600' 
                        : isLowStock 
                          ? 'text-red-500' 
                          : 'text-gray-500'
                    }`}>
                      {hasSavedShopkeeperPrice && (
                        <div className="text-xs text-green-600">Saved price</div>
                      )}
                      <div>
                        Stock: {product.stock}
                        {isLowStock && !isOutOfStock && (
                          <span className="ml-1 text-red-600">⚠️</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={`w-full px-4 py-2 rounded-lg transition-all duration-300 ${
                      isOutOfStock 
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                        : isLowStock 
                          ? 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 transform' 
                          : 'bg-yellow-500 text-white hover:bg-yellow-600 hover:scale-105 transform'
                    }`}
                  >
                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Items */}
      {cart.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cart Items</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cart.map((item) => (
                  <tr key={item.product._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={item.product.imageURL}
                          alt={item.product.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                          <div className="text-sm text-gray-500">{item.product.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      PKR {item.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                          className="bg-gray-200 text-gray-600 px-2 py-1 rounded"
                        >
                          -
                        </button>
                        <span className="mx-3">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                          className="bg-gray-200 text-gray-600 px-2 py-1 rounded"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      PKR {item.price * item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => removeFromCart(item.product._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders History */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Order History</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    #{order._id.slice(-8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order?.orderItems?.length} items
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    PKR {order.totalAmount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Place Order</h2>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                  <textarea
                    required
                    rows={3}
                    value={orderForm.deliveryAddress}
                    onChange={(e) => setOrderForm({...orderForm, deliveryAddress: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Enter delivery address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={orderForm.deliveryDate}
                    onChange={(e) => setOrderForm({...orderForm, deliveryDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={orderForm.priority}
                    onChange={(e) => setOrderForm({...orderForm, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    rows={3}
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Any special instructions"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Order Summary</h3>
                  <div className="space-y-1">
                    {cart.map((item) => (
                      <div key={item.product._id} className="flex justify-between text-sm">
                        <span>{item.product.name} x {item.quantity}</span>
                        <span>PKR {item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm text-gray-600 pt-2">
                      <span>Total Items:</span>
                      <span>{getTotalItems()}</span>
                    </div>
                    <div className="border-t pt-2 font-semibold">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span>PKR {getTotalAmount()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Place Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
