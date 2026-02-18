import express from 'express';
import User from '../models/User.js';
import Order from '../models/order.js';
import ShopkeeperOrder from '../models/ShopkeeperOrder.js';
import Recovery from '../models/Recovery.js';
import Receipt from '../models/Receipt.js';
import Product from '../models/project.js';
import SalesRecord from '../models/SalesRecord.js';
import ProductDistribution from '../models/ProductDistribution.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin or superadmin
const requireAdmin = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Admin or Super Admin required.' });
  }
  next();
};

// @route   GET /api/analytics/dashboard
// @desc    Get comprehensive analytics dashboard data
// @access  Private (Admin, Super Admin)
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Parse YYYY-MM-DD boundaries in UTC so selected "end date" includes full day.
    const parseDateBoundary = (dateValue, endOfDay = false) => {
      if (!dateValue) return null;
      const [year, month, day] = String(dateValue).split('-').map(Number);
      if (!year || !month || !day) return null;
      return new Date(Date.UTC(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
      ));
    };

    const now = new Date();
    const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const start = parseDateBoundary(startDate, false) || monthStartUtc;
    const end = parseDateBoundary(endDate, true) || now;

    const orderDateFilter = {
      orderDate: {
        $gte: start,
        $lte: end
      }
    };

    const recoveryDateFilter = {
      recoveryDate: {
        $gte: start,
        $lte: end
      }
    };

    const receiptDateFilter = {
      createdAt: {
        $gte: start,
        $lte: end
      }
    };

    // Get basic counts
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalShopkeeperOrders,
      totalRecoveries,
      totalReceipts
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ['shopkeeper', 'salesman'] } }),
      Product.countDocuments(),
      Order.countDocuments(orderDateFilter),
      ShopkeeperOrder.countDocuments(orderDateFilter),
      Recovery.countDocuments(recoveryDateFilter),
      Receipt.countDocuments(receiptDateFilter)
    ]);

    // Get revenue data from orders
    const orderRevenue = await Order.aggregate([
      { $match: orderDateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get revenue data from shopkeeper orders
    const shopkeeperOrderRevenue = await ShopkeeperOrder.aggregate([
      { $match: orderDateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalAmountPaid: { $sum: '$amountPaid' },
          totalPendingAmount: { $sum: '$pendingAmount' },
          totalCommission: { $sum: '$commission' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get recovery data
    const recoveryStats = await Recovery.aggregate([
      { $match: { ...recoveryDateFilter, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalAmountCollected: { $sum: '$amountCollected' },
          totalNetPayment: { $sum: '$netPayment' },
          totalItemsValue: { $sum: '$itemsValue' }
        }
      }
    ]);

    // Get monthly breakdown
    const monthlyStats = await Order.aggregate([
      { $match: orderDateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get shopkeeper order monthly breakdown
    const shopkeeperMonthlyStats = await ShopkeeperOrder.aggregate([
      { $match: orderDateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get user role distribution
    const userRoleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top products by sales
    const topProducts = await ShopkeeperOrder.aggregate([
      { $match: orderDateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: {
              $ifNull: [
                '$items.totalPrice',
                { $multiply: ['$items.quantity', '$items.unitPrice'] }
              ]
            }
          }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    // Get salesman performance
    const salesmanPerformance = await ShopkeeperOrder.aggregate([
      { $match: orderDateFilter },
      {
        $group: {
          _id: '$salesman',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'salesman'
        }
      },
      { $unwind: '$salesman' }
    ]);

    // Get shopkeeper performance
    const shopkeeperPerformance = await ShopkeeperOrder.aggregate([
      { $match: orderDateFilter },
      {
        $group: {
          _id: '$shopkeeper',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'shopkeeper'
        }
      },
      { $unwind: '$shopkeeper' }
    ]);

    // Quantity sold from both order sources
    const [websiteQuantityStats, shopkeeperQuantityStats] = await Promise.all([
      Order.aggregate([
        { $match: orderDateFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$items.quantity' }
          }
        }
      ]),
      ShopkeeperOrder.aggregate([
        { $match: orderDateFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$items.quantity' }
          }
        }
      ])
    ]);

    const totalWebsiteRevenue = orderRevenue[0]?.totalRevenue || 0;
    const totalShopkeeperRevenue = shopkeeperOrderRevenue[0]?.totalRevenue || 0;
    const totalRecoveriesCollected = recoveryStats[0]?.totalAmountCollected || 0;
    const totalShopkeeperAmountPaid = shopkeeperOrderRevenue[0]?.totalAmountPaid || 0;
    const totalOutstanding = shopkeeperOrderRevenue[0]?.totalPendingAmount || 0;
    const totalCommission = shopkeeperOrderRevenue[0]?.totalCommission || 0;
    const totalQuantitySold = (websiteQuantityStats[0]?.totalQuantity || 0) + (shopkeeperQuantityStats[0]?.totalQuantity || 0);
    const totalReceived = totalWebsiteRevenue + totalShopkeeperAmountPaid + totalRecoveriesCollected;

    // Calculate total revenue from all sources
    const totalRevenue = totalWebsiteRevenue + totalShopkeeperRevenue + totalRecoveriesCollected;

    // Calculate total orders
    const totalAllOrders = totalOrders + totalShopkeeperOrders;

    // Calculate average order value
    const totalOrderValue = totalWebsiteRevenue + totalShopkeeperRevenue;
    const averageOrderValue = totalAllOrders > 0 ? totalOrderValue / totalAllOrders : 0;

    // Combine monthly stats from both website and shopkeeper orders
    const monthMap = new Map();
    [...monthlyStats, ...shopkeeperMonthlyStats].forEach(stat => {
      const key = `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}`;
      const existing = monthMap.get(key) || {
        year: stat._id.year,
        month: stat._id.month,
        revenue: 0,
        orders: 0
      };

      existing.revenue += stat.revenue || 0;
      existing.orders += stat.orders || 0;
      monthMap.set(key, existing);
    });

    const combinedMonthlyStats = Array.from(monthMap.values())
      .sort((a, b) => (a.year - b.year) || (a.month - b.month))
      .map(stat => ({
        month: `${stat.year}-${stat.month.toString().padStart(2, '0')}`,
        revenue: stat.revenue,
        orders: stat.orders
      }));

    res.json({
      success: true,
      analytics: {
        overview: {
          totalRevenue,
          totalSalesRevenue: totalOrderValue,
          totalReceived,
          totalProfit: recoveryStats[0]?.totalNetPayment || 0,
          totalOrders: totalAllOrders,
          averageOrderValue,
          totalUsers,
          totalProducts,
          totalRecoveries,
          totalReceipts
        },
        revenue: {
          websiteOrders: totalWebsiteRevenue,
          shopkeeperOrders: totalShopkeeperRevenue,
          recoveries: totalRecoveriesCollected,
          netPayment: recoveryStats[0]?.totalNetPayment || 0,
          itemsValue: recoveryStats[0]?.totalItemsValue || 0
        },
        payments: {
          websiteReceived: totalWebsiteRevenue,
          shopkeeperAmountPaid: totalShopkeeperAmountPaid,
          recoveriesCollected: totalRecoveriesCollected,
          totalReceived,
          outstandingAmount: totalOutstanding,
          totalCommission,
          totalQuantity: totalQuantitySold
        },
        monthlyStats: combinedMonthlyStats,
        userRoleStats,
        topProducts: topProducts.map(item => ({
          productName: item.product.name,
          totalQuantity: item.totalQuantity,
          totalRevenue: item.totalRevenue
        })),
        salesmanPerformance: salesmanPerformance.map(item => ({
          salesmanName: item.salesman.name,
          totalOrders: item.totalOrders,
          totalRevenue: item.totalRevenue,
          averageOrderValue: item.averageOrderValue
        })),
        shopkeeperPerformance: shopkeeperPerformance.map(item => ({
          shopkeeperName: item.shopkeeper.name,
          totalOrders: item.totalOrders,
          totalRevenue: item.totalRevenue,
          averageOrderValue: item.averageOrderValue
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/analytics/payments/received-details
// @desc    Get received payment details grouped by payer
// @access  Private (Admin, Super Admin)
router.get('/payments/received-details', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const parseDateBoundary = (dateValue, endOfDay = false) => {
      if (!dateValue) return null;
      const [year, month, day] = String(dateValue).split('-').map(Number);
      if (!year || !month || !day) return null;
      return new Date(Date.UTC(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
      ));
    };

    const now = new Date();
    const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const start = parseDateBoundary(startDate, false) || monthStartUtc;
    const end = parseDateBoundary(endDate, true) || now;

    const orderDateFilter = {
      orderDate: {
        $gte: start,
        $lte: end
      }
    };

    const recoveryDateFilter = {
      recoveryDate: {
        $gte: start,
        $lte: end
      }
    };

    const [websiteReceivedByCustomer, shopkeeperPaidAtOrder, recoveriesByShopkeeper] = await Promise.all([
      Order.aggregate([
        { $match: orderDateFilter },
        {
          $group: {
            _id: { $ifNull: ['$customerName', 'Unknown Customer'] },
            websiteReceived: { $sum: '$totalAmount' },
            transactionCount: { $sum: 1 },
            lastReceivedDate: { $max: '$orderDate' }
          }
        },
        {
          $project: {
            _id: 0,
            payerKey: { $concat: ['customer:', '$_id'] },
            payerId: null,
            payerName: '$_id',
            payerType: 'Website Customer',
            payerEmail: '',
            payerPhone: '',
            websiteReceived: 1,
            shopkeeperOrderPaid: { $literal: 0 },
            recoveriesCollected: { $literal: 0 },
            transactionCount: 1,
            lastReceivedDate: 1
          }
        }
      ]),
      ShopkeeperOrder.aggregate([
        { $match: { ...orderDateFilter, amountPaid: { $gt: 0 } } },
        {
          $lookup: {
            from: 'users',
            localField: 'shopkeeper',
            foreignField: '_id',
            as: 'shopkeeper'
          }
        },
        {
          $unwind: {
            path: '$shopkeeper',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: '$shopkeeper._id',
            payerName: { $first: { $ifNull: ['$shopkeeper.name', 'Unknown Shopkeeper'] } },
            payerEmail: { $first: { $ifNull: ['$shopkeeper.email', ''] } },
            payerPhone: { $first: { $ifNull: ['$shopkeeper.phone', ''] } },
            shopkeeperOrderPaid: { $sum: '$amountPaid' },
            transactionCount: { $sum: 1 },
            lastReceivedDate: { $max: '$orderDate' }
          }
        },
        {
          $project: {
            _id: 0,
            payerKey: {
              $concat: [
                'shopkeeper:',
                { $ifNull: [{ $toString: '$_id' }, '$payerName'] }
              ]
            },
            payerId: '$_id',
            payerName: 1,
            payerType: { $literal: 'Shopkeeper' },
            payerEmail: 1,
            payerPhone: 1,
            websiteReceived: { $literal: 0 },
            shopkeeperOrderPaid: 1,
            recoveriesCollected: { $literal: 0 },
            transactionCount: 1,
            lastReceivedDate: 1
          }
        }
      ]),
      Recovery.aggregate([
        { $match: { ...recoveryDateFilter, amountCollected: { $gt: 0 }, status: { $ne: 'cancelled' } } },
        {
          $lookup: {
            from: 'users',
            localField: 'shopkeeper',
            foreignField: '_id',
            as: 'shopkeeper'
          }
        },
        {
          $unwind: {
            path: '$shopkeeper',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: '$shopkeeper._id',
            payerName: { $first: { $ifNull: ['$shopkeeper.name', 'Unknown Shopkeeper'] } },
            payerEmail: { $first: { $ifNull: ['$shopkeeper.email', ''] } },
            payerPhone: { $first: { $ifNull: ['$shopkeeper.phone', ''] } },
            recoveriesCollected: { $sum: '$amountCollected' },
            transactionCount: { $sum: 1 },
            lastReceivedDate: { $max: '$recoveryDate' }
          }
        },
        {
          $project: {
            _id: 0,
            payerKey: {
              $concat: [
                'shopkeeper:',
                { $ifNull: [{ $toString: '$_id' }, '$payerName'] }
              ]
            },
            payerId: '$_id',
            payerName: 1,
            payerType: { $literal: 'Shopkeeper' },
            payerEmail: 1,
            payerPhone: 1,
            websiteReceived: { $literal: 0 },
            shopkeeperOrderPaid: { $literal: 0 },
            recoveriesCollected: 1,
            transactionCount: 1,
            lastReceivedDate: 1
          }
        }
      ])
    ]);

    const payerMap = new Map();

    const mergePayerRows = (rows = []) => {
      rows.forEach((row) => {
        const key = row.payerKey;
        const existing = payerMap.get(key) || {
          payerKey: key,
          payerId: row.payerId || null,
          payerName: row.payerName || 'Unknown',
          payerType: row.payerType || 'Unknown',
          payerEmail: row.payerEmail || '',
          payerPhone: row.payerPhone || '',
          websiteReceived: 0,
          shopkeeperOrderPaid: 0,
          recoveriesCollected: 0,
          transactionCount: 0,
          lastReceivedDate: null
        };

        existing.websiteReceived += Number(row.websiteReceived || 0);
        existing.shopkeeperOrderPaid += Number(row.shopkeeperOrderPaid || 0);
        existing.recoveriesCollected += Number(row.recoveriesCollected || 0);
        existing.transactionCount += Number(row.transactionCount || 0);
        if (row.lastReceivedDate) {
          if (!existing.lastReceivedDate || new Date(row.lastReceivedDate) > new Date(existing.lastReceivedDate)) {
            existing.lastReceivedDate = row.lastReceivedDate;
          }
        }

        payerMap.set(key, existing);
      });
    };

    mergePayerRows(websiteReceivedByCustomer);
    mergePayerRows(shopkeeperPaidAtOrder);
    mergePayerRows(recoveriesByShopkeeper);

    const payers = Array.from(payerMap.values())
      .map((payer) => ({
        ...payer,
        totalReceived: payer.websiteReceived + payer.shopkeeperOrderPaid + payer.recoveriesCollected
      }))
      .sort((a, b) => b.totalReceived - a.totalReceived);

    const summary = payers.reduce(
      (acc, payer) => {
        acc.websiteReceived += payer.websiteReceived;
        acc.shopkeeperOrderPaid += payer.shopkeeperOrderPaid;
        acc.recoveriesCollected += payer.recoveriesCollected;
        acc.totalReceived += payer.totalReceived;
        acc.totalTransactions += payer.transactionCount;
        return acc;
      },
      {
        websiteReceived: 0,
        shopkeeperOrderPaid: 0,
        recoveriesCollected: 0,
        totalReceived: 0,
        totalTransactions: 0
      }
    );

    res.json({
      success: true,
      details: {
        startDate: start,
        endDate: end,
        summary,
        payers
      }
    });
  } catch (error) {
    console.error('Error fetching received payment details:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/analytics/payments/outstanding-details
// @desc    Get outstanding balances grouped by shopkeeper
// @access  Private (Admin, Super Admin)
router.get('/payments/outstanding-details', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const parseDateBoundary = (dateValue, endOfDay = false) => {
      if (!dateValue) return null;
      const [year, month, day] = String(dateValue).split('-').map(Number);
      if (!year || !month || !day) return null;
      return new Date(Date.UTC(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
      ));
    };

    const now = new Date();
    const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const start = parseDateBoundary(startDate, false) || monthStartUtc;
    const end = parseDateBoundary(endDate, true) || now;

    const outstandingByShopkeeper = await ShopkeeperOrder.aggregate([
      {
        $match: {
          orderDate: { $gte: start, $lte: end },
          pendingAmount: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$shopkeeper',
          outstandingAmount: { $sum: '$pendingAmount' },
          ordersWithOutstanding: { $sum: 1 },
          totalOrderAmount: { $sum: '$totalAmount' },
          lastOrderDate: { $max: '$orderDate' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'shopkeeper'
        }
      },
      {
        $unwind: {
          path: '$shopkeeper',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          shopkeeperId: '$_id',
          shopkeeperName: { $ifNull: ['$shopkeeper.name', 'Unknown Shopkeeper'] },
          shopkeeperEmail: { $ifNull: ['$shopkeeper.email', ''] },
          shopkeeperPhone: { $ifNull: ['$shopkeeper.phone', ''] },
          outstandingAmount: 1,
          ordersWithOutstanding: 1,
          totalOrderAmount: 1,
          lastOrderDate: 1
        }
      },
      { $sort: { outstandingAmount: -1 } }
    ]);

    const summary = outstandingByShopkeeper.reduce(
      (acc, shopkeeper) => {
        acc.totalOutstanding += Number(shopkeeper.outstandingAmount || 0);
        acc.totalOrdersWithOutstanding += Number(shopkeeper.ordersWithOutstanding || 0);
        return acc;
      },
      {
        totalOutstanding: 0,
        totalOrdersWithOutstanding: 0
      }
    );
    summary.shopkeepersWithOutstanding = outstandingByShopkeeper.length;

    res.json({
      success: true,
      details: {
        startDate: start,
        endDate: end,
        summary,
        shopkeepers: outstandingByShopkeeper
      }
    });
  } catch (error) {
    console.error('Error fetching outstanding balance details:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/analytics/salesman/:salesmanId
// @desc    Get analytics for specific salesman
// @access  Private (Admin, Super Admin)
router.get('/salesman/:salesmanId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { salesmanId } = req.params;
    const { startDate, endDate } = req.query;

    const parseDateBoundary = (dateValue, endOfDay = false) => {
      if (!dateValue) return null;
      const [year, month, day] = String(dateValue).split('-').map(Number);
      if (!year || !month || !day) return null;
      return new Date(Date.UTC(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
      ));
    };

    const now = new Date();
    const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const start = parseDateBoundary(startDate, false) || monthStartUtc;
    const end = parseDateBoundary(endDate, true) || now;

    const orderDateFilter = {
      salesman: salesmanId,
      orderDate: {
        $gte: start,
        $lte: end
      }
    };

    const recoveryDateFilter = {
      salesman: salesmanId,
      recoveryDate: {
        $gte: start,
        $lte: end
      }
    };

    // Get salesman orders
    const orderStats = await ShopkeeperOrder.aggregate([
      { $match: orderDateFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get salesman recoveries
    const recoveryStats = await Recovery.aggregate([
      { $match: recoveryDateFilter },
      {
        $group: {
          _id: null,
          totalRecoveries: { $sum: 1 },
          totalAmountCollected: { $sum: '$amountCollected' },
          totalNetPayment: { $sum: '$netPayment' }
        }
      }
    ]);

    // Get monthly performance
    const monthlyPerformance = await ShopkeeperOrder.aggregate([
      { $match: orderDateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      analytics: {
        overview: {
          totalOrders: orderStats[0]?.totalOrders || 0,
          totalRevenue: orderStats[0]?.totalRevenue || 0,
          averageOrderValue: orderStats[0]?.averageOrderValue || 0,
          totalRecoveries: recoveryStats[0]?.totalRecoveries || 0,
          totalAmountCollected: recoveryStats[0]?.totalAmountCollected || 0,
          totalNetPayment: recoveryStats[0]?.totalNetPayment || 0
        },
        monthlyPerformance: monthlyPerformance.map(stat => ({
          month: `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}`,
          revenue: stat.revenue,
          orders: stat.orders
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching salesman analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
