import express from 'express';
import ShopkeeperOrder from '../models/ShopkeeperOrder.js';
import Product from '../models/project.js';
import User from '../models/User.js';
import ShopSalesmanAssignment from '../models/ShopSalesmanAssignment.js';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper function to create shopkeeper order notifications
const createShopkeeperOrderNotification = async (order) => {
  try {
    // Get all admin and superadmin users
    const adminUsers = await User.find({ 
      role: { $in: ['admin', 'superadmin'] } 
    }).select('_id');

    if (adminUsers.length > 0) {
      const paymentStatusText = order.paymentStatus === 'paid' ? 'Paid' : 'Pending Payment';
      const notification = new Notification({
        type: 'order',
        title: 'New Shopkeeper Order',
        message: `New order #${order._id.toString().slice(-8)} from ${order.shopkeeper?.name || 'Shopkeeper'} for ₹${order.totalAmount} (${paymentStatusText})`,
        relatedEntity: order._id,
        relatedEntityType: 'ShopkeeperOrder',
        targetUsers: adminUsers.map(user => user._id),
        targetRoles: ['admin', 'superadmin'],
        priority: order.paymentStatus === 'pending' ? 'urgent' : 'high',
        data: {
          orderId: order._id,
          shopkeeperName: order.shopkeeper?.name,
          salesmanName: order.salesman?.name,
          totalAmount: order.totalAmount,
          itemCount: order.items.length,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod
        }
      });

      await notification.save();
    }
  } catch (error) {
    console.error('Error creating shopkeeper order notification:', error);
  }
};

// Middleware to check if user is shopkeeper
const requireShopkeeper = (req, res, next) => {
  if (req.user.role !== 'shopkeeper') {
    return res.status(403).json({ error: 'Access denied. Shopkeeper required.' });
  }
  next();
};

// Middleware to check if user is salesman or admin
const requireSalesman = (req, res, next) => {
  if (!['salesman', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Salesman, admin or super admin required.' });
  }
  next();
};

// Middleware to check if user can place orders (shopkeeper or salesman)
const requireOrderPlacer = (req, res, next) => {
  if (!['shopkeeper', 'salesman', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Shopkeeper, salesman, admin or super admin required.' });
  }
  next();
};

// @route   POST /api/shopkeeper-orders
// @desc    Place an order (Shopkeeper or Salesman on behalf of shopkeeper)
// @access  Private (Shopkeeper, Salesman, Admin, SuperAdmin)
router.post('/', authenticateToken, requireOrderPlacer, async (req, res) => {
  try {
    const { items, deliveryAddress, notes, paymentMethod, shopkeeperId, amountPaid } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    let shopkeeper, salesman, placedBy, placedBySalesman;

    // Determine who is placing the order and get the appropriate users
    if (req.user.role === 'shopkeeper') {
      // Shopkeeper placing their own order
      shopkeeper = await User.findById(req.user._id);
      
      // Find the salesman assigned to this shopkeeper
      const assignment = await ShopSalesmanAssignment.findOne({
        shopkeeperId: req.user._id,
        isActive: true
      }).populate('salesmanId');
      
      if (!assignment) {
        return res.status(400).json({ error: 'No salesman assigned to you' });
      }
      salesman = assignment.salesmanId;
      placedBy = 'shopkeeper';
    } else if (['salesman', 'admin', 'superadmin'].includes(req.user.role)) {
      // Salesman/Admin placing order on behalf of shopkeeper
      if (!shopkeeperId) {
        return res.status(400).json({ error: 'shopkeeperId is required when placing order on behalf of shopkeeper' });
      }
      
      shopkeeper = await User.findById(shopkeeperId);
      if (!shopkeeper) {
        return res.status(404).json({ error: 'Shopkeeper not found' });
      }
      
      if (shopkeeper.role !== 'shopkeeper') {
        return res.status(400).json({ error: 'Invalid shopkeeper ID' });
      }

      // For salesmen, they can only place orders for their assigned shopkeepers
      if (req.user.role === 'salesman') {
        // Check if there's an active assignment between this salesman and shopkeeper
        const assignment = await ShopSalesmanAssignment.findOne({
          salesmanId: req.user._id,
          shopkeeperId: shopkeeperId,
          isActive: true
        });
        
        if (!assignment) {
          return res.status(403).json({ error: 'You can only place orders for your assigned shopkeepers' });
        }
      }

      salesman = req.user.role === 'salesman' ? req.user : null;
      placedBy = 'salesman';
      placedBySalesman = req.user._id;
    }

    let totalAmount = 0;
    const orderItems = [];

    // Validate and calculate prices for each item
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      // Use custom price if provided, otherwise use product price
      const unitPrice = item.customPrice || product.price;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        unitPrice,
        totalPrice
      });
    }

    // Calculate commission (5% default, can be customized)
    const commissionRate = salesman.commissionRate || 5;
    const commission = (totalAmount * commissionRate) / 100;

    // Calculate amount paid and pending amount
    const paidAmount = parseFloat(amountPaid) || 0;
    const orderPendingAmount = totalAmount - paidAmount;
    
    // Determine payment status based on payment
    let paymentStatus = 'pending';
    if (paidAmount >= totalAmount) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }

    const order = new ShopkeeperOrder({
      shopkeeper: shopkeeper._id,
      salesman: salesman._id,
      placedBy,
      placedBySalesman,
      items: orderItems,
      totalAmount,
      deliveryAddress: deliveryAddress || '',
      notes,
      paymentMethod,
      paymentStatus,
      amountPaid: paidAmount,
      pendingAmount: orderPendingAmount,
      commission
    });

    await order.save();

    // Update shopkeeper's pending amount with the new pending amount from this order
    const currentPendingAmount = shopkeeper.pendingAmount || 0;
    const newPendingAmount = currentPendingAmount + orderPendingAmount;
    
    await User.findByIdAndUpdate(shopkeeper._id, {
      pendingAmount: newPendingAmount
    });

    // Populate the order data
    await order.populate([
      { path: 'shopkeeper', select: 'name email phone pendingAmount creditLimit' },
      { path: 'salesman', select: 'name email phone' },
      { path: 'placedBySalesman', select: 'name email phone' },
      { path: 'items.product', select: 'name category imageURL' }
    ]);

    // Create notification for new shopkeeper order
    createShopkeeperOrderNotification(order);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/shopkeeper-orders
// @desc    Get orders (filtered by user role)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, paymentStatus, page = 1, limit = 10, startDate, endDate } = req.query;
    let query = {};

    // Filter based on user role
    if (req.user.role === 'shopkeeper') {
      query.shopkeeper = req.user._id;
    } else if (req.user.role === 'salesman') {
      query.salesman = req.user._id;
    } else if (req.user.role === 'admin') {
      // Admin can see orders from their assigned salesmen
      const salesmen = await User.find({ assignedBy: req.user._id }).select('_id');
      query.salesman = { $in: salesmen.map(s => s._id) };
    }
    // Super admin can see all orders (no additional filter)

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (startDate && endDate) {
      query.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (page - 1) * limit;
    const orders = await ShopkeeperOrder.find(query)
      .populate('shopkeeper', 'name email phone address pendingAmount creditLimit')
      .populate('salesman', 'name email phone')
      .populate('items.product', 'name category imageURL price')
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ShopkeeperOrder.countDocuments(query);

    res.json({
      orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/shopkeeper-orders/shopkeepers
// @desc    Get assigned shopkeepers for salesman
// @access  Private (Salesman, Admin, SuperAdmin)
router.get('/shopkeepers', authenticateToken, async (req, res) => {
  try {
    let shopkeeperIds = [];
    
    if (req.user.role === 'salesman') {
      // Salesman can only see their assigned shopkeepers
      const assignments = await ShopSalesmanAssignment.find({
        salesmanId: req.user._id,
        isActive: true
      }).select('shopkeeperId');
      shopkeeperIds = assignments.map(a => a.shopkeeperId);
    } else if (req.user.role === 'admin') {
      // Admin can see shopkeepers assigned to their salesmen
      const salesmen = await User.find({ assignedBy: req.user._id, role: 'salesman' }).select('_id');
      const salesmanIds = salesmen.map(s => s._id);
      const assignments = await ShopSalesmanAssignment.find({
        salesmanId: { $in: salesmanIds },
        isActive: true
      }).select('shopkeeperId');
      shopkeeperIds = assignments.map(a => a.shopkeeperId);
    }
    // Super admin can see all shopkeepers

    let query = { role: 'shopkeeper' };
    if (shopkeeperIds.length > 0) {
      query._id = { $in: shopkeeperIds };
    }

    const shopkeepers = await User.find(query).select('name email phone address');

    res.json({ shopkeepers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/shopkeeper-orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await ShopkeeperOrder.findById(req.params.id)
      .populate('shopkeeper', 'name email phone address pendingAmount creditLimit')
      .populate('salesman', 'name email phone')
      .populate('items.product', 'name category imageURL price');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check permissions
    if (req.user.role === 'shopkeeper' && order.shopkeeper._id.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/shopkeeper-orders/:id/status
// @desc    Update order status
// @access  Private (Salesman/Admin)
router.put('/:id/status', authenticateToken, requireSalesman, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const order = await ShopkeeperOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check permissions
    if (req.user.role === 'salesman' && order.salesman.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    order.status = status;
    if (notes) order.notes = notes;

    if (status === 'confirmed') {
      order.confirmedAt = new Date();
    } else if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/shopkeeper-orders/:id/payment
// @desc    Update payment status
// @access  Private (Salesman/Admin)
router.put('/:id/payment', authenticateToken, requireSalesman, async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    const order = await ShopkeeperOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check permissions
    if (req.user.role === 'salesman' && order.salesman.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    order.paymentStatus = paymentStatus;
    if (paymentMethod) order.paymentMethod = paymentMethod;

    await order.save();

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/shopkeeper-orders/stats/dashboard
// @desc    Get order statistics for dashboard
// @access  Private (Admin/SuperAdmin)
router.get('/stats/dashboard', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Admin or super admin required.' });
    }

    const { startDate, endDate } = req.query;
    let matchQuery = {};

    if (startDate && endDate) {
      matchQuery.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Filter by assigned salesmen for admin
    if (req.user.role === 'admin') {
      const salesmen = await User.find({ assignedBy: req.user._id }).select('_id');
      matchQuery.salesman = { $in: salesmen.map(s => s._id) };
    }

    const stats = await ShopkeeperOrder.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commission' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          confirmedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          paidOrders: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      stats: stats[0] || {
        totalOrders: 0,
        totalAmount: 0,
        totalCommission: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        deliveredOrders: 0,
        paidOrders: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
