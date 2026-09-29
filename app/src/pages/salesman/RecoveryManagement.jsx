import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { api } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/common/Pagination';

export default function RecoveryManagement() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [recoveries, setRecoveries] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);
  const [lastRecovery, setLastRecovery] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecoveries, setTotalRecoveries] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const emptyFilters = {
    cityId: '',
    shopkeeperId: '',
    recoveryType: '',
    status: '',
    startDate: '',
    endDate: ''
  };
  const [filters, setFilters] = useState(emptyFilters);
  const [formData, setFormData] = useState({
    shopkeeperId: '',
    recoveryType: 'payment_only',
    amountCollected: '',
    paymentMethod: 'cash',
    items: [],
    notes: '',
    recoveryLocation: '',
    bankDetails: {
      bankName: '',
      accountNumber: '',
      transactionId: '',
      chequeNumber: ''
    }
  });
  const [newItem, setNewItem] = useState({
    product: '',
    quantity: "",
    unitPrice: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchRecoveries();
  }, [currentPage, pageSize, filters]);

  const fetchRecoveries = async () => {
    setListLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ page: currentPage, limit: pageSize });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await axios.get(`${api.recoveries.getAll()}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRecoveries(response.data.recoveries || []);
      setTotalRecoveries(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching recoveries:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load recoveries';
      showError(`Error loading recoveries: ${errorMessage}`);
    } finally {
      setListLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      // Drop a selected shopkeeper that isn't in the newly chosen city
      if (key === 'cityId' && value && prev.shopkeeperId) {
        const selected = shopkeepers.find(s => s._id === prev.shopkeeperId);
        if ((selected?.city?._id || selected?.city) !== value) next.shopkeeperId = '';
      }
      return next;
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Shopkeepers shown in the filter dropdown, narrowed to the selected city
  const filterShopkeepers = filters.cityId
    ? shopkeepers.filter(s => (s.city?._id || s.city) === filters.cityId)
    : shopkeepers;

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const userId = localStorage.getItem('userId');

      const [shopkeepersResponse, productsResponse, citiesResponse] = await Promise.all([
        axios.get(api.assignments.getShopkeepersBySalesman(userId), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        axios.get(api.products.getAll()),
        axios.get(api.cities.getAll(), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ data: { cities: [] } }))
      ]);
      setShopkeepers(shopkeepersResponse.data.shopkeepers || []);
      setProducts(productsResponse.data.products || productsResponse.data || []);
      setCities(citiesResponse.data.cities || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load data';
      showError(`Error loading data: ${errorMessage}`);
    } finally {
      setLoading(false);
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
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load statistics';
      showError(`Error loading statistics: ${errorMessage}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(api.recoveries.create(), formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      showSuccess('Recovery recorded successfully!');
      setLastRecovery(response.data.recovery);
      setShowForm(false);
      setShowReceipt(true);
      setFormData({
        shopkeeperId: '',
        recoveryType: 'payment_only',
        amountCollected: '',
        paymentMethod: 'cash',
        items: [],
        notes: '',
        recoveryLocation: '',
        bankDetails: {
          bankName: '',
          accountNumber: '',
          transactionId: '',
          chequeNumber: ''
        }
      });
      fetchData();
      fetchRecoveries();
    } catch (error) {
      console.error('Error creating recovery:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create recovery';
      showError(`Error creating recovery: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const addItem = () => {
    if (!newItem.product || newItem.quantity <= 0 || newItem.unitPrice < 0) {
      showWarning('Please fill all item fields correctly');
      return;
    }

    const product = products.find(p => p._id === newItem.product);
    if (!product) {
      showError('Product not found');
      return;
    }

    if (product.stock < newItem.quantity) {
      showWarning(`Insufficient stock. Available: ${product.stock}`);
      return;
    }

    const item = {
      product: newItem.product,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      totalPrice: newItem.quantity * newItem.unitPrice
    };

    setFormData({
      ...formData,
      items: [...formData.items, item]
    });

    setNewItem({
      product: '',
      quantity: "",
      unitPrice: ""
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const calculateTotals = () => {
    const itemsValue = formData.items.reduce((total, item) => total + item.totalPrice, 0);
    const netPayment = parseFloat(formData.amountCollected || 0) - itemsValue;
    return { itemsValue, netPayment };
  };

  const printRecoveryReceipt = async () => {
    if (!lastRecovery) return;
    
    const printWindow = window.open('', '_blank');
    const receiptContent = document.getElementById('recovery-receipt-content').innerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Recovery Receipt - ${lastRecovery.shopkeeper?.name || 'Shopkeeper'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; color: #333; }
            .header p { margin: 5px 0 0 0; font-size: 16px; color: #666; }
            .order-info { margin-bottom: 20px; }
            .order-info p { margin: 5px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f2f2f2; }
            .total { font-weight: bold; background-color: #f9f9f9; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              .header { page-break-inside: avoid; }
              .items-table { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Ideal Nimko Ltd.</h1>
            <p>Recovery Receipt</p>
            <div class="shop-name">For: ${lastRecovery.shopkeeper?.name || 'Shopkeeper'}</div>
          </div>
          ${receiptContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
    
    // Record the receipt for admin tracking
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(api.receipts.create(), {
        receiptType: 'recovery',
        recoveryId: lastRecovery._id,
        receiptContent: receiptContent,
        totalAmount: lastRecovery.amountCollected,
        notes: 'Recovery receipt printed by salesman'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error recording receipt:', error);
      // Don't show error to user as printing was successful
    }
  };

  const getSelectedShopkeeper = () => {
    return shopkeepers.find(s => s._id === formData.shopkeeperId);
  };

  // Pagination for recoveries (the server returns one page at a time)
  const totalPages = Math.ceil(totalRecoveries / pageSize);
  const paginatedRecoveries = recoveries;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading recovery data...</div>
      </div>
    );
  }

  const { itemsValue, netPayment } = calculateTotals();
  const selectedShopkeeper = getSelectedShopkeeper();

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Recovery Management</h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => {
              setShowStats(true);
              fetchStats();
            }}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm sm:text-base"
          >
            📊 Statistics
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
          >
            ➕ Record Recovery
          </button>
        </div>
      </div>

      {/* Recovery Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-3 sm:p-6 w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Record Recovery</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shopkeeper *
                  </label>
                  <select
                    value={formData.shopkeeperId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedShopkeeper = shopkeepers.find(s => s._id === selectedId);
                      setFormData({
                        ...formData, 
                        shopkeeperId: selectedId,
                        recoveryLocation: selectedShopkeeper?.address || ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Shopkeeper</option>
                    {shopkeepers.map(shopkeeper => (
                      <option key={shopkeeper._id} value={shopkeeper._id}>
                        {shopkeeper.name} - Pending: PKR {shopkeeper.pendingAmount?.toFixed(2) || '0.00'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recovery Type *
                  </label>
                  <select
                    value={formData.recoveryType}
                    onChange={(e) => setFormData({...formData, recoveryType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="payment_only">Payment Only</option>
                    <option value="payment_with_items">Payment with Items</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Collected (PKR) *
                  </label>
                  <input
                    type="number"
                    value={formData.amountCollected}
                    onChange={(e) => setFormData({...formData, amountCollected: e.target.value})}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Items Section */}
              {formData.recoveryType === 'payment_with_items' && (
                <div className="border rounded-lg p-3 sm:p-4">
                  <h3 className="text-base sm:text-lg font-medium mb-3">📦 Items Delivered</h3>
                  
                  {/* Add Item Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                      <select
                        value={newItem.product}
                        onChange={(e) => {
                          const product = products.find(p => p._id === e.target.value);
                          setNewItem({
                            ...newItem,
                            product: e.target.value,
                            unitPrice: product?.price || 0
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Product</option>
                        {products.map(product => (
                          <option key={product._id} value={product._id}>
                            {product.name} (Stock: {product.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || ""})}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                      <input
                        type="number"
                        value={newItem.unitPrice}
                        onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value) || ""})}
                        min="0"
                        step="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-end sm:col-span-2 lg:col-span-1">
                      <button
                        type="button"
                        onClick={addItem}
                        className="w-full bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                      >
                        ➕ Add Item
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  {formData.items.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm sm:text-base">Added Items:</h4>
                      {formData.items.map((item, index) => {
                        const product = products.find(p => p._id === item.product);
                        return (
                          <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-2 sm:p-3 rounded space-y-2 sm:space-y-0">
                            <div className="flex-1">
                              <div className="font-medium text-sm sm:text-base">{product?.name}</div>
                              <div className="text-gray-500 text-xs sm:text-sm">
                                {item.quantity} × PKR {item.unitPrice} = PKR {item.totalPrice}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800 text-sm px-2 py-1 bg-red-50 rounded"
                            >
                              🗑️ Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Additional Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shop Address
                  </label>
                  <input
                    type="text"
                    value={formData.recoveryLocation}
                    onChange={(e) => setFormData({...formData, recoveryLocation: e.target.value})}
                    placeholder="Auto-filled from selected shopkeeper"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Summary */}
              {selectedShopkeeper && (
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-sm sm:text-base">💰 Recovery Summary</h4>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span>Previous Pending:</span>
                      <span className="font-medium">PKR. {selectedShopkeeper.pendingAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount Collected:</span>
                      <span className="font-medium">PKR. {formData.amountCollected || '0.00'}</span>
                    </div>
                    {formData.recoveryType === 'payment_with_items' && (
                      <>
                        <div className="flex justify-between">
                          <span>Items Value:</span>
                          <span className="font-medium">PKR. {itemsValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net Payment:</span>
                          <span className="font-medium">PKR. {netPayment.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between border-t pt-1">
                      <span className="font-medium">New Pending:</span>
                      <span className="font-bold text-blue-600">PKR. {Math.max(0, (selectedShopkeeper.pendingAmount || 0) - netPayment).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm sm:text-base font-medium"
                >
                  {submitting ? '⏳ Recording...' : '💾 Record Recovery'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-colors text-sm sm:text-base font-medium"
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {showStats && stats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">📊 Recovery Statistics</h2>
              <button
                onClick={() => setShowStats(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">PKR {stats.stats.totalAmountCollected?.toFixed(2) || '0.00'}</div>
                <div className="text-xs sm:text-sm text-gray-600">Total Collected</div>
              </div>
              <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-green-600">PKR {stats.stats.totalNetPayment?.toFixed(2) || '0.00'}</div>
                <div className="text-xs sm:text-sm text-gray-600">Net Payment</div>
              </div>
              <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-purple-600">{stats.stats.totalRecoveries || 0}</div>
                <div className="text-xs sm:text-sm text-gray-600">Total Recoveries</div>
              </div>
              <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-orange-600">PKR {stats.stats.averageRecovery?.toFixed(2) || '0.00'}</div>
                <div className="text-xs sm:text-sm text-gray-600">Average Recovery</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">🔍 Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <select
              value={filters.cityId}
              onChange={(e) => updateFilter('cityId', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city._id} value={city._id}>{city.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shopkeeper</label>
            <select
              value={filters.shopkeeperId}
              onChange={(e) => updateFilter('shopkeeperId', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Shopkeepers</option>
              {filterShopkeepers.map(shopkeeper => (
                <option key={shopkeeper._id} value={shopkeeper._id}>{shopkeeper.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recovery Type</label>
            <select
              value={filters.recoveryType}
              onChange={(e) => updateFilter('recoveryType', e.target.value)}
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
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
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
              value={filters.startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-medium">📋 Recoveries ({totalRecoveries})</h3>
          {listLoading && <span className="text-sm text-gray-500">Loading...</span>}
        </div>

        {recoveries.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500 text-sm sm:text-base">
            {hasActiveFilters
              ? 'No recoveries match your filters.'
              : 'No recoveries found. Record your first recovery above.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              {paginatedRecoveries.map((recovery) => (
                <div key={recovery._id} className="border-b border-gray-200 p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{recovery.shopkeeper?.name}</div>
                      <div className="text-xs text-gray-500">{new Date(recovery.recoveryDate).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-gray-900">PKR {recovery.amountCollected?.toFixed(2)}</div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        recovery.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : recovery.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {recovery.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span className={`inline-flex px-2 py-1 rounded-full ${
                      recovery.recoveryType === 'payment_only' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {recovery.recoveryType === 'payment_only' ? '💰 Payment Only' : '📦 With Items'}
                    </span>
                    <span>{recovery.paymentMethod}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shopkeeper
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRecoveries.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        No recoveries found
                      </td>
                    </tr>
                  ) : (
                    paginatedRecoveries.map((recovery) => (
                    <tr key={recovery._id}>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(recovery.recoveryDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{recovery.shopkeeper?.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{recovery.shopkeeper?.email || ''}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          recovery.recoveryType === 'payment_only' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {recovery.recoveryType === 'payment_only' ? 'Payment Only' : 'With Items'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        PKR {recovery.amountCollected?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {recovery.paymentMethod || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          recovery.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : recovery.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {recovery.status || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Pagination */}
        {recoveries.length > 0 && (
          <div className="mt-4 px-3 sm:px-6 py-3 sm:py-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalRecoveries}
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
      </div>

      {/* Recovery Receipt Modal */}
      {showReceipt && lastRecovery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-3 sm:p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">💰 Recovery Receipt</h2>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div id="recovery-receipt-content">
              <div className="header">
                <h1 className="text-xl sm:text-2xl font-bold">Ideal Nimko Ltd.</h1>
                <p>Recovery Receipt</p>
              </div>
              
              <div className="order-info">
                <p><strong>Recovery ID:</strong> {lastRecovery._id}</p>
                <p><strong>Recovery Date:</strong> {new Date(lastRecovery.recoveryDate).toLocaleString()}</p>
                <p><strong>Shopkeeper:</strong> {lastRecovery.shopkeeper?.name}</p>
                <p><strong>Salesman:</strong> {lastRecovery.salesman?.name}</p>
                <p><strong>Recovery Type:</strong> {lastRecovery.recoveryType === 'payment_only' ? 'Payment Only' : 'Payment with Items'}</p>
                <p><strong>Payment Method:</strong> {lastRecovery.paymentMethod}</p>
                {lastRecovery.recoveryLocation && <p><strong>Location:</strong> {lastRecovery.recoveryLocation}</p>}
                {lastRecovery.receiptNumber && <p><strong>Receipt Number:</strong> {lastRecovery.receiptNumber}</p>}
                {lastRecovery.notes && <p><strong>Notes:</strong> {lastRecovery.notes}</p>}
              </div>

              {lastRecovery.recoveryType === 'payment_with_items' && lastRecovery.items && lastRecovery.items.length > 0 && (
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastRecovery.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.product?.name || 'Product'}</td>
                        <td>{item.quantity}</td>
                        <td>PKR {item.unitPrice?.toFixed(2) || '0.00'}</td>
                        <td>PKR {item.totalPrice?.toFixed(2) || '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3">Items Total:</td>
                      <td>PKR {lastRecovery.itemsValue?.toFixed(2) || '0.00'}</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              <table className="items-table">
                <tbody>
                  <tr>
                    <td><strong>Amount Collected:</strong></td>
                    <td><strong>PKR {lastRecovery.amountCollected?.toFixed(2) || '0.00'}</strong></td>
                  </tr>
                  {lastRecovery.recoveryType === 'payment_with_items' && (
                    <tr>
                      <td>Items Value:</td>
                      <td>PKR {lastRecovery.itemsValue?.toFixed(2) || '0.00'}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Previous Pending Amount:</td>
                    <td>PKR {lastRecovery.previousPendingAmount?.toFixed(2) || '0.00'}</td>
                  </tr>
                  <tr className="total">
                    <td><strong>Net Payment:</strong></td>
                    <td><strong>PKR {lastRecovery.netPayment?.toFixed(2) || '0.00'}</strong></td>
                  </tr>
                  <tr className="total">
                    <td><strong>New Pending Amount:</strong></td>
                    <td><strong>PKR {lastRecovery.newPendingAmount?.toFixed(2) || '0.00'}</strong></td>
                  </tr>
                </tbody>
              </table>
              
              <div className="footer">
                <p>Thank you for your business!</p>
                <p>Generated on: {new Date().toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-colors text-sm sm:text-base font-medium"
              >
                ❌ Close
              </button>
              <button
                onClick={printRecoveryReceipt}
                className="flex-1 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base font-medium"
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
