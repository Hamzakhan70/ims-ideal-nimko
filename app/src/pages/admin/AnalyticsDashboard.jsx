import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../utils/api';

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetDateRange = (period) => {
  const today = new Date();
  let start;

  switch (period) {
    case 'quarterly': {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), quarterStartMonth, 1);
      break;
    }
    case 'half-yearly': {
      const halfStartMonth = today.getMonth() < 6 ? 0 : 6;
      start = new Date(today.getFullYear(), halfStartMonth, 1);
      break;
    }
    case 'annually':
      start = new Date(today.getFullYear(), 0, 1);
      break;
    case 'monthly':
    default:
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
  }

  return {
    startDate: toInputDate(start),
    endDate: toInputDate(today)
  };
};

const reportTypeLabels = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'half-yearly': 'Half-Yearly',
  annually: 'Annually'
};

const emptyDailySalesSummary = {
  totalShopkeepers: 0,
  totalOrders: 0,
  totalSales: 0,
  totalReceived: 0,
  totalPending: 0,
  totalCommission: 0
};

const performanceTablePageSize = 10;

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalSales: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0
  });
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [distributionStats, setDistributionStats] = useState({});
  const [salesStats, setSalesStats] = useState({});
  const [topProducts, setTopProducts] = useState([]);
  const [salesmanPerformance, setSalesmanPerformance] = useState([]);
  const [shopkeeperPerformance, setShopkeeperPerformance] = useState([]);
  const [cities, setCities] = useState([]);
  const [dailyViewDate, setDailyViewDate] = useState(() => toInputDate(new Date()));
  const [dailyCityFilter, setDailyCityFilter] = useState('');
  const [dailySalesSummary, setDailySalesSummary] = useState(emptyDailySalesSummary);
  const [dailyShopkeeperSales, setDailyShopkeeperSales] = useState([]);
  const [dailySalesLoading, setDailySalesLoading] = useState(true);
  const [dailySalesError, setDailySalesError] = useState('');
  const [topProductsPage, setTopProductsPage] = useState(1);
  const [salesmanPage, setSalesmanPage] = useState(1);
  const [shopkeeperPage, setShopkeeperPage] = useState(1);
  const [expandedSections, setExpandedSections] = useState({
    topProducts: false,
    salesmen: false,
    shopkeepers: false
  });
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('monthly');
  const [dateRange, setDateRange] = useState(() => ({
    startDate: searchParams.get('startDate') || toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    endDate: searchParams.get('endDate') || toInputDate(new Date())
  }));

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchAnalytics, 60000);
    
    return () => clearInterval(interval);
  }, [dateRange]);

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    fetchDailyShopkeeperSales();

    const interval = setInterval(fetchDailyShopkeeperSales, 60000);
    return () => clearInterval(interval);
  }, [dailyViewDate, dailyCityFilter]);

  useEffect(() => {
    setTopProductsPage((currentPage) => {
      const totalPages = Math.max(1, Math.ceil(topProducts.length / performanceTablePageSize));
      return Math.min(currentPage, totalPages);
    });
  }, [topProducts]);

  useEffect(() => {
    setSalesmanPage((currentPage) => {
      const totalPages = Math.max(1, Math.ceil(salesmanPerformance.length / performanceTablePageSize));
      return Math.min(currentPage, totalPages);
    });
  }, [salesmanPerformance]);

  useEffect(() => {
    setShopkeeperPage((currentPage) => {
      const totalPages = Math.max(1, Math.ceil(shopkeeperPerformance.length / performanceTablePageSize));
      return Math.min(currentPage, totalPages);
    });
  }, [shopkeeperPerformance]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await axios.get(`${api.analytics.getDashboard()}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const analytics = response.data.analytics;
      const overview = analytics.overview || {};
      const revenue = analytics.revenue || {};
      const payments = analytics.payments || {};

      const websiteReceived = payments.websiteReceived ?? revenue.websiteOrders ?? 0;
      const shopkeeperAmountPaid = payments.shopkeeperAmountPaid ?? 0;
      const recoveriesCollected = payments.recoveriesCollected ?? revenue.recoveries ?? 0;
      const totalReceived = payments.totalReceived ?? (websiteReceived + shopkeeperAmountPaid + recoveriesCollected);
      const outstandingAmount = payments.outstandingAmount ?? 0;

      setStats({
        totalRevenue: overview.totalRevenue || 0,
        totalProfit: overview.totalProfit ?? revenue.netPayment ?? 0,
        totalSales: overview.totalOrders || 0,
        totalUsers: overview.totalUsers || 0,
        totalProducts: overview.totalProducts || 0,
        totalOrders: overview.totalOrders || 0
      });

      setMonthlyStats(analytics.monthlyStats || []);
      setDistributionStats({
        websiteReceived,
        shopkeeperAmountPaid,
        recoveriesCollected,
        totalReceived,
        outstandingAmount
      });
      setSalesStats({
        totalRevenue: overview.totalRevenue || 0,
        totalOrders: overview.totalOrders || 0,
        averageSaleValue: overview.averageOrderValue || 0,
        totalCommission: payments.totalCommission || 0,
        totalQuantity: payments.totalQuantity || 0,
        totalProfit: overview.totalProfit ?? revenue.netPayment ?? 0
      });
      setTopProducts(analytics.topProducts || []);
      setSalesmanPerformance(analytics.salesmanPerformance || []);
      setShopkeeperPerformance(analytics.shopkeeperPerformance || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      alert('Error fetching analytics: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(api.cities.getAll(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCities(response.data.cities || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchDailyShopkeeperSales = async () => {
    try {
      setDailySalesLoading(true);
      setDailySalesError('');

      const token = localStorage.getItem('adminToken');
      const selectedDate = dailyViewDate ? new Date(`${dailyViewDate}T00:00:00`) : new Date();
      const timezoneOffsetMinutes = Number.isNaN(selectedDate.getTime())
        ? new Date().getTimezoneOffset()
        : selectedDate.getTimezoneOffset();
      const params = new URLSearchParams({
        date: dailyViewDate || toInputDate(new Date()),
        timezoneOffsetMinutes: String(timezoneOffsetMinutes)
      });

      if (dailyCityFilter) {
        params.set('city', dailyCityFilter);
      }

      const response = await axios.get(`${api.analytics.getDailyShopkeeperSales()}?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setDailySalesSummary({
        ...emptyDailySalesSummary,
        ...(response.data.summary || {})
      });
      setDailyShopkeeperSales(response.data.rows || []);
    } catch (error) {
      console.error('Error fetching daily shopkeeper sales:', error);
      setDailySalesSummary(emptyDailySalesSummary);
      setDailyShopkeeperSales([]);
      setDailySalesError(error.response?.data?.error || error.message || 'Unable to load daily shopkeeper sales.');
    } finally {
      setDailySalesLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `PKR ${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount || 0))}`;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const formatSelectedDay = (value) => {
    if (!value) return 'Selected day';

    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleDateString('en-PK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const safeMonthlyStats = monthlyStats || [];

  const normalizedMonthlyStats = useMemo(() => {
    return safeMonthlyStats
      .map((entry) => {
        if (entry?.month) {
          const [year, month] = String(entry.month).split('-').map(Number);
          if (!year || !month) return null;
          return {
            year,
            month,
            orders: Number(entry.orders || 0),
            revenue: Number(entry.revenue || 0)
          };
        }

        if (entry?._id?.year && entry?._id?.month) {
          return {
            year: Number(entry._id.year),
            month: Number(entry._id.month),
            orders: Number(entry.orders || 0),
            revenue: Number(entry.revenue || 0)
          };
        }

        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.year - b.year) || (a.month - b.month));
  }, [safeMonthlyStats]);

  const reportRows = useMemo(() => {
    if (!normalizedMonthlyStats.length) return [];

    if (reportType === 'monthly') {
      return normalizedMonthlyStats.map((row) => ({
        key: `${row.year}-${row.month}`,
        label: new Date(row.year, row.month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        orders: row.orders,
        revenue: row.revenue,
        averageOrderValue: row.orders > 0 ? row.revenue / row.orders : 0,
        sortKey: row.year * 100 + row.month
      }));
    }

    const grouped = new Map();
    normalizedMonthlyStats.forEach((row) => {
      let key;
      let label;
      let sortKey;

      if (reportType === 'quarterly') {
        const quarter = Math.floor((row.month - 1) / 3) + 1;
        key = `${row.year}-Q${quarter}`;
        label = `Q${quarter} ${row.year}`;
        sortKey = row.year * 10 + quarter;
      } else if (reportType === 'half-yearly') {
        const half = row.month <= 6 ? 1 : 2;
        key = `${row.year}-H${half}`;
        label = `H${half} ${row.year}`;
        sortKey = row.year * 10 + half;
      } else {
        key = `${row.year}`;
        label = `${row.year}`;
        sortKey = row.year;
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          label,
          orders: 0,
          revenue: 0,
          sortKey
        });
      }

      const item = grouped.get(key);
      item.orders += row.orders;
      item.revenue += row.revenue;
    });

    return Array.from(grouped.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((item) => ({
        ...item,
        averageOrderValue: item.orders > 0 ? item.revenue / item.orders : 0
      }));
  }, [normalizedMonthlyStats, reportType]);

  const reportSummary = useMemo(() => {
    const totalOrders = reportRows.reduce((sum, row) => sum + row.orders, 0);
    const totalRevenue = reportRows.reduce((sum, row) => sum + row.revenue, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue
    };
  }, [reportRows]);

  const topProductsTotalPages = Math.max(1, Math.ceil(topProducts.length / performanceTablePageSize));
  const salesmanTotalPages = Math.max(1, Math.ceil(salesmanPerformance.length / performanceTablePageSize));
  const shopkeeperTotalPages = Math.max(1, Math.ceil(shopkeeperPerformance.length / performanceTablePageSize));

  const paginatedTopProducts = useMemo(() => {
    const startIndex = (topProductsPage - 1) * performanceTablePageSize;
    return topProducts.slice(startIndex, startIndex + performanceTablePageSize);
  }, [topProducts, topProductsPage]);

  const paginatedSalesmen = useMemo(() => {
    const startIndex = (salesmanPage - 1) * performanceTablePageSize;
    return salesmanPerformance.slice(startIndex, startIndex + performanceTablePageSize);
  }, [salesmanPerformance, salesmanPage]);

  const paginatedShopkeepers = useMemo(() => {
    const startIndex = (shopkeeperPage - 1) * performanceTablePageSize;
    return shopkeeperPerformance.slice(startIndex, startIndex + performanceTablePageSize);
  }, [shopkeeperPerformance, shopkeeperPage]);

  const handleApplyReportPeriod = () => {
    setDateRange(getPresetDateRange(reportType));
  };

  const handlePrintReport = () => {
    if (!reportRows.length) {
      alert('No report data available for selected range.');
      return;
    }
    window.print();
  };

  const getDateRangeQuery = () => {
    return new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }).toString();
  };

  const openReceivedDetails = () => {
    navigate(`/admin/analytics/received-details?${getDateRangeQuery()}`);
  };

  const openOutstandingDetails = () => {
    navigate(`/admin/analytics/outstanding-details?${getDateRangeQuery()}`);
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey]
    }));
  };

  const renderPaginationControls = (currentPage, totalPages, setPage) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
        <p className="text-sm text-gray-500">
          Page {formatNumber(currentPage)} of {formatNumber(totalPages)}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <div className="text-xl mt-4">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #analytics-print-area,
          #analytics-print-area * {
            visibility: visible;
          }
          #analytics-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Analytics Dashboard</h1>
        
        {/* Date Range Filter */}
        <div className="flex flex-wrap gap-4 items-end no-print">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half-yearly">Half-Yearly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <button
            onClick={handleApplyReportPeriod}
            className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Apply {reportTypeLabels[reportType]}
          </button>
          <button
            onClick={fetchAnalytics}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={handlePrintReport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Print {reportTypeLabels[reportType]} Report
          </button>
        </div>
      </div>

      <div id="analytics-print-area" className="bg-white p-6 rounded-lg shadow mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{reportTypeLabels[reportType]} Analytics Report</h2>
            <p className="text-sm text-gray-600">Date Range: {dateRange.startDate} to {dateRange.endDate}</p>
          </div>
          <p className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Period</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Orders</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Revenue</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Avg Order Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportRows.length > 0 ? (
                reportRows.map((row) => (
                  <tr key={row.key}>
                    <td className="px-4 py-2 text-gray-900">{row.label}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{formatNumber(row.orders)}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(row.averageOrderValue)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-gray-500">No data available for selected range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Report Orders</p>
            <p className="text-lg font-semibold text-gray-900">{formatNumber(reportSummary.totalOrders)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Report Revenue</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(reportSummary.totalRevenue)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Report Avg Order</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(reportSummary.avgOrderValue)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Total Received</p>
            <p className="text-lg font-semibold text-green-700">{formatCurrency(distributionStats.totalReceived || 0)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Outstanding Balance</p>
            <p className="text-lg font-semibold text-red-700">{formatCurrency(distributionStats.outstandingAmount || 0)}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8 no-print">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalProfit)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.totalSales)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.totalUsers)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.totalProducts)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.totalOrders)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 no-print">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
          <div className="space-y-4">
            {safeMonthlyStats && safeMonthlyStats.length > 0 ? safeMonthlyStats.slice(0, 6).map((month, index) => {
              try {
                // Handle different data structures
                const monthData = month._id ? {
                  year: month._id.year,
                  month: month._id.month,
                  revenue: month.revenue || 0,
                  orders: month.orders || 0
                } : {
                  year: new Date(month.month).getFullYear(),
                  month: new Date(month.month).getMonth() + 1,
                  revenue: month.revenue || 0,
                  orders: month.orders || 0
                };
                
                const maxRevenue = Math.max(...safeMonthlyStats.map(m => m.revenue || 0));
                const percentage = maxRevenue > 0 ? (monthData.revenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {new Date(monthData.year, monthData.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex items-center space-x-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-20 text-right">
                        {formatCurrency(monthData.revenue)}
                      </span>
                    </div>
                  </div>
                );
              } catch (error) {
                console.error('Error rendering month data:', error, month);
                return (
                  <div key={index} className="flex items-center justify-between text-red-500">
                    <span>Error loading month data</span>
                  </div>
                );
              }
            }) : (
              <div className="text-center text-gray-500 py-4">
                No monthly data available
              </div>
            )}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Website Orders Received</span>
              <span className="text-lg font-semibold text-gray-900">{formatCurrency(distributionStats.websiteReceived || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Shopkeeper Paid at Order</span>
              <span className="text-lg font-semibold text-gray-900">{formatCurrency(distributionStats.shopkeeperAmountPaid || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Recoveries Collected</span>
              <span className="text-lg font-semibold text-gray-900">{formatCurrency(distributionStats.recoveriesCollected || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Received</span>
              <span className="text-lg font-semibold text-green-600">{formatCurrency(distributionStats.totalReceived || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Outstanding Shopkeeper Balance</span>
              <span className="text-lg font-semibold text-red-600">{formatCurrency(distributionStats.outstandingAmount || 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 no-print">
            <button
              type="button"
              onClick={openReceivedDetails}
              className="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <p className="text-sm text-gray-600">Total Received</p>
              <p className="text-3xl font-semibold text-green-700">{formatCurrency(distributionStats.totalReceived || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Click to view who paid this amount</p>
            </button>

            <button
              type="button"
              onClick={openOutstandingDetails}
              className="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-red-400 hover:bg-red-50 transition-colors"
            >
              <p className="text-sm text-gray-600">Outstanding Balance</p>
              <p className="text-3xl font-semibold text-red-700">{formatCurrency(distributionStats.outstandingAmount || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Click to view shopkeeper-wise outstanding</p>
            </button>
          </div>
        </div>
      </div>

      {/* Sales Performance */}
      <div className="bg-white p-6 rounded-lg shadow no-print">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Average Sale Value</p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(salesStats.averageSaleValue || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Commission</p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(salesStats.totalCommission || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Quantity Sold</p>
            <p className="text-2xl font-semibold text-gray-900">{formatNumber(salesStats.totalQuantity || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Profit Margin</p>
            <p className="text-2xl font-semibold text-gray-900">
              {salesStats.totalRevenue > 0 ? `${((salesStats.totalProfit / salesStats.totalRevenue) * 100).toFixed(1)}%` : '0%'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow no-print mt-8">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Daily Shopkeeper Sales View</h3>
            <p className="text-sm text-gray-600 mt-1">
              Check one day at a time to see which shopkeepers placed orders, what was sold, and how much was received.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Date</label>
              <input
                type="date"
                value={dailyViewDate}
                onChange={(e) => setDailyViewDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <select
                value={dailyCityFilter}
                onChange={(e) => setDailyCityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 min-w-[220px]"
              >
                <option value="">All Cities</option>
                {cities.map((city) => (
                  <option key={city._id} value={city._id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setDailyViewDate(toInputDate(new Date()))}
              className="self-end bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Today
            </button>

            <button
              type="button"
              onClick={fetchDailyShopkeeperSales}
              className="self-end bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Refresh Daily View
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Selected Day</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{formatSelectedDay(dailyViewDate)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Daily Sales</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(dailySalesSummary.totalSales)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Amount Received</p>
            <p className="text-lg font-semibold text-green-700 mt-1">{formatCurrency(dailySalesSummary.totalReceived)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Pending Amount</p>
            <p className="text-lg font-semibold text-red-700 mt-1">{formatCurrency(dailySalesSummary.totalPending)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Orders / Shopkeepers</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatNumber(dailySalesSummary.totalOrders)} / {formatNumber(dailySalesSummary.totalShopkeepers)}
            </p>
          </div>
        </div>

        {dailySalesLoading ? (
          <div className="text-sm text-gray-500 py-6">Loading daily shopkeeper sales...</div>
        ) : dailySalesError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {dailySalesError}
          </div>
        ) : dailyShopkeeperSales.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
            No shopkeeper sales found for the selected day and city.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shopkeeper</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Order</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyShopkeeperSales.map((row) => (
                  <tr key={row.shopkeeperId}>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="font-medium">{row.shopkeeperName}</div>
                      <div className="text-xs text-gray-500">{row.shopkeeperEmail || '-'}</div>
                      <div className="text-xs text-gray-500">{row.shopkeeperPhone || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{row.cityName || 'Unassigned'}</td>
                    <td className="px-4 py-4 text-sm text-right text-gray-900">{formatNumber(row.totalOrders)}</td>
                    <td className="px-4 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(row.totalSales)}</td>
                    <td className="px-4 py-4 text-sm text-right text-green-700">{formatCurrency(row.totalReceived)}</td>
                    <td className="px-4 py-4 text-sm text-right text-red-700">{formatCurrency(row.totalPending)}</td>
                    <td className="px-4 py-4 text-sm text-right text-gray-900">{formatCurrency(row.averageOrderValue)}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatDateTime(row.lastOrderDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow no-print">
          <button
            type="button"
            onClick={() => toggleSection('topProducts')}
            className="w-full flex items-center justify-between gap-4 text-left"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900">🏆 Top Products</h3>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(topProducts.length)} records</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-600">
              {expandedSections.topProducts ? 'Collapse' : 'Expand'}
              <svg
                className={`h-5 w-5 transition-transform ${expandedSections.topProducts ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </span>
          </button>

          {expandedSections.topProducts && (
            <>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Sold</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTopProducts.map((product, index) => (
                      <tr key={`${product.productName || 'product'}-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatNumber(product.totalQuantity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(product.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPaginationControls(topProductsPage, topProductsTotalPages, setTopProductsPage)}
            </>
          )}
        </div>
      )}

      {/* Salesman Performance */}
      {salesmanPerformance.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow no-print">
          <button
            type="button"
            onClick={() => toggleSection('salesmen')}
            className="w-full flex items-center justify-between gap-4 text-left"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900">👨‍💼 Top Salesmen</h3>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(salesmanPerformance.length)} records</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-600">
              {expandedSections.salesmen ? 'Collapse' : 'Expand'}
              <svg
                className={`h-5 w-5 transition-transform ${expandedSections.salesmen ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </span>
          </button>

          {expandedSections.salesmen && (
            <>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesman</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Order Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedSalesmen.map((salesman, index) => (
                      <tr key={`${salesman.salesmanName || 'salesman'}-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {salesman.salesmanName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatNumber(salesman.totalOrders)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(salesman.totalRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(salesman.averageOrderValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPaginationControls(salesmanPage, salesmanTotalPages, setSalesmanPage)}
            </>
          )}
        </div>
      )}

      {/* Shopkeeper Performance */}
      {shopkeeperPerformance.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow no-print">
          <button
            type="button"
            onClick={() => toggleSection('shopkeepers')}
            className="w-full flex items-center justify-between gap-4 text-left"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900">🏪 Top Shopkeepers</h3>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(shopkeeperPerformance.length)} records</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-600">
              {expandedSections.shopkeepers ? 'Collapse' : 'Expand'}
              <svg
                className={`h-5 w-5 transition-transform ${expandedSections.shopkeepers ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </span>
          </button>

          {expandedSections.shopkeepers && (
            <>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shopkeeper</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Order Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedShopkeepers.map((shopkeeper, index) => (
                      <tr key={`${shopkeeper.shopkeeperName || 'shopkeeper'}-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {shopkeeper.shopkeeperName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatNumber(shopkeeper.totalOrders)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(shopkeeper.totalRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(shopkeeper.averageOrderValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPaginationControls(shopkeeperPage, shopkeeperTotalPages, setShopkeeperPage)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
