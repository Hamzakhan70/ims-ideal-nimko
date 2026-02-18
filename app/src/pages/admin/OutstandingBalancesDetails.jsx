import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../utils/api';

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialDateRange = (searchParams) => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    startDate: searchParams.get('startDate') || toInputDate(monthStart),
    endDate: searchParams.get('endDate') || toInputDate(today)
  };
};

export default function OutstandingBalancesDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState(getInitialDateRange(searchParams));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    totalOrdersWithOutstanding: 0,
    shopkeepersWithOutstanding: 0
  });
  const [shopkeepers, setShopkeepers] = useState([]);

  const formatCurrency = (amount) => {
    return `PKR ${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount || 0))}`;
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${api.analytics.getOutstandingBalancesDetails()}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data?.details || {};
      setSummary(data.summary || summary);
      setShopkeepers(data.shopkeepers || []);
    } catch (error) {
      console.error('Error fetching outstanding balance details:', error);
      alert('Error fetching outstanding balance details: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [dateRange.startDate, dateRange.endDate]);

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/admin/analytics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)}
          className="text-blue-600 hover:text-blue-800 mb-3"
        >
          ← Back to Analytics
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Outstanding Balance Details</h1>
        <p className="text-gray-600">See which shopkeepers contribute to outstanding balances.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <button
            onClick={fetchDetails}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Total Outstanding</p>
          <p className="text-lg font-semibold text-red-700">{formatCurrency(summary.totalOutstanding)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Shopkeepers with Outstanding</p>
          <p className="text-lg font-semibold text-gray-900">{summary.shopkeepersWithOutstanding || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Orders with Outstanding</p>
          <p className="text-lg font-semibold text-gray-900">{summary.totalOrdersWithOutstanding || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shopkeeper</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Order Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Last Order Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">Loading...</td>
              </tr>
            ) : shopkeepers.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">No outstanding balances found.</td>
              </tr>
            ) : (
              shopkeepers.map((shopkeeper, index) => (
                <tr key={`${shopkeeper.shopkeeperId || 'unknown'}-${index}`}>
                  <td className="px-4 py-3 text-sm text-gray-900">{shopkeeper.shopkeeperName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>{shopkeeper.shopkeeperEmail || '-'}</div>
                    <div>{shopkeeper.shopkeeperPhone || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-red-700">{formatCurrency(shopkeeper.outstandingAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{shopkeeper.ordersWithOutstanding || 0}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(shopkeeper.totalOrderAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{formatDate(shopkeeper.lastOrderDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
