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

export default function ReceivedPaymentsDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState(getInitialDateRange(searchParams));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    websiteReceived: 0,
    shopkeeperOrderPaid: 0,
    recoveriesCollected: 0,
    totalReceived: 0,
    totalTransactions: 0
  });
  const [payers, setPayers] = useState([]);

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
        `${api.analytics.getReceivedPaymentsDetails()}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data?.details || {};
      setSummary(data.summary || summary);
      setPayers(data.payers || []);
    } catch (error) {
      console.error('Error fetching received payment details:', error);
      alert('Error fetching received payment details: ' + (error.response?.data?.error || error.message));
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
        <h1 className="text-3xl font-bold text-gray-900">Total Received Details</h1>
        <p className="text-gray-600">See exactly which customers and shopkeepers contributed to total received amount.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Website Received</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.websiteReceived)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Shopkeeper Paid at Order</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.shopkeeperOrderPaid)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Recoveries Collected</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.recoveriesCollected)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Total Received</p>
          <p className="text-lg font-semibold text-green-700">{formatCurrency(summary.totalReceived)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Transactions</p>
          <p className="text-lg font-semibold text-gray-900">{summary.totalTransactions || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Website</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid at Order</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Recoveries</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Txn</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Last Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="9" className="px-4 py-6 text-center text-gray-500">Loading...</td>
              </tr>
            ) : payers.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-6 text-center text-gray-500">No payment data found.</td>
              </tr>
            ) : (
              payers.map((payer) => (
                <tr key={payer.payerKey}>
                  <td className="px-4 py-3 text-sm text-gray-900">{payer.payerName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{payer.payerType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>{payer.payerEmail || '-'}</div>
                    <div>{payer.payerPhone || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(payer.websiteReceived)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(payer.shopkeeperOrderPaid)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(payer.recoveriesCollected)}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">{formatCurrency(payer.totalReceived)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{payer.transactionCount || 0}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{formatDate(payer.lastReceivedDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
