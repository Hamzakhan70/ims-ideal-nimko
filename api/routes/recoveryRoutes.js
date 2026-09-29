import express from 'express';
import mongoose from 'mongoose';
import Recovery from '../models/Recovery.js';
import User from '../models/User.js';
import Product from '../models/project.js';
import ShopSalesmanAssignment from '../models/ShopSalesmanAssignment.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is salesman or admin
const requireSalesman = (req, res, next) => {
  if (!['salesman', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Salesman, Admin, or Super Admin required.' });
  }
  next();
};

// Middleware to check if user is admin or superadmin
const requireAdmin = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Admin or Super Admin required.' });
  }
  next();
};

// @route   POST /api/recoveries
// @desc    Create a new recovery
// @access  Private (Salesman, Admin, Super Admin)
router.post('/', authenticateToken, requireSalesman, async (req, res) => {
  try {
    const {
      shopkeeperId,
      recoveryType,
      amountCollected,
      paymentMethod,
      items = [],
      notes,
      recoveryLocation,
      receiptNumber,
      bankDetails
    } = req.body;

    // Validate shopkeeper
    const shopkeeper = await User.findById(shopkeeperId);
    if (!shopkeeper || shopkeeper.role !== 'shopkeeper') {
      return res.status(400).json({ error: 'Invalid shopkeeper ID' });
    }

    // For salesmen, check if they are assigned to this shopkeeper
    if (req.user.role === 'salesman') {
      const assignment = await ShopSalesmanAssignment.findOne({
        salesmanId: req.user._id,
        shopkeeperId: shopkeeperId,
        isActive: true
      });
      
      if (!assignment) {
        return res.status(403).json({ error: 'You can only collect recovery from your assigned shopkeepers' });
      }
    }

    // Validate items if recovery type is with items
    if (recoveryType === 'payment_with_items' && items.length > 0) {
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({ error: `Product ${item.product} not found` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
          });
        }
      }
    }

    // Get current pending amount
    const currentPendingAmount = shopkeeper.pendingAmount || 0;

    // Calculate items value
    const itemsValue = items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
    
    // Calculate net payment
    const netPayment = amountCollected - itemsValue;
    
    // Calculate new pending amount
    const newPendingAmount = Math.max(0, currentPendingAmount - netPayment);

    // Create recovery record
    const recovery = new Recovery({
      shopkeeper: shopkeeperId,
      salesman: req.user.role === 'salesman' ? req.user._id : req.body.salesmanId || req.user._id,
      recoveryType,
      amountCollected,
      paymentMethod,
      items,
      itemsValue,
      netPayment,
      previousPendingAmount: currentPendingAmount,
      newPendingAmount,
      notes,
      recoveryLocation,
      receiptNumber,
      bankDetails
    });

    await recovery.save();

    // Update product stock if items were delivered
    if (recoveryType === 'payment_with_items' && items.length > 0) {
      for (const item of items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: -item.quantity } }
        );
      }
    }

    // Update shopkeeper's pending amount
    await User.findByIdAndUpdate(shopkeeperId, {
      pendingAmount: recovery.newPendingAmount
    });

    // Populate the recovery data
    await recovery.populate([
      { path: 'shopkeeper', select: 'name email phone address pendingAmount' },
      { path: 'salesman', select: 'name email phone' },
      { path: 'items.product', select: 'name category imageURL' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Recovery recorded successfully',
      recovery
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/recoveries
// @desc    Get recoveries (filtered by user role)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      shopkeeperId, 
      salesmanId,
      cityId,
      status,
      recoveryType,
      startDate,
      endDate,
      page = 1,
      limit = 10 
    } = req.query;

    let query = {};

    // Filter based on user role. The salesmanId filter may only narrow this scope, never widen it.
    if (req.user.role === 'salesman') {
      query.salesman = req.user._id;
    } else if (req.user.role === 'admin') {
      // Admin can see recoveries from their assigned salesmen
      const salesmen = await User.find({ assignedBy: req.user._id, role: 'salesman' }).select('_id');
      const salesmanIds = salesmen.map(s => String(s._id));
      if (salesmanId) {
        query.salesman = salesmanIds.includes(String(salesmanId)) ? salesmanId : { $in: [] };
      } else {
        query.salesman = { $in: salesmanIds };
      }
    } else if (req.user.role === 'superadmin') {
      // Super admin can see all recoveries
      if (salesmanId) query.salesman = salesmanId;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Additional filters
    if (shopkeeperId) query.shopkeeper = shopkeeperId;
    if (status) query.status = status;
    if (recoveryType) query.recoveryType = recoveryType;

    // City filter: recoveries don't store a city, so match shopkeepers in that city
    if (cityId) {
      if (!mongoose.Types.ObjectId.isValid(cityId)) {
        return res.status(400).json({ error: 'Invalid city' });
      }
      const cityShopkeepers = await User.find({ role: 'shopkeeper', city: cityId }).select('_id');
      const cityShopkeeperIds = cityShopkeepers.map(s => String(s._id));
      query.shopkeeper = shopkeeperId
        ? (cityShopkeeperIds.includes(String(shopkeeperId)) ? shopkeeperId : { $in: [] })
        : { $in: cityShopkeeperIds };
    }

    // Date range filter. Plain dates (YYYY-MM-DD) are whole days in Pakistan time,
    // so the end date includes everything up to 23:59 that day.
    const isPlainDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (startDate || endDate) {
      query.recoveryDate = {};
      if (startDate) {
        query.recoveryDate.$gte = new Date(isPlainDate(startDate) ? `${startDate}T00:00:00+05:00` : startDate);
      }
      if (endDate) {
        query.recoveryDate.$lte = new Date(isPlainDate(endDate) ? `${endDate}T23:59:59.999+05:00` : endDate);
      }
    }

    const skip = (page - 1) * limit;
    const recoveries = await Recovery.find(query)
      .populate('shopkeeper', 'name email phone address pendingAmount')
      .populate('salesman', 'name email phone')
      .populate('items.product', 'name category imageURL')
      .sort({ recoveryDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Recovery.countDocuments(query);

    res.json({
      success: true,
      recoveries,
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

// @route   GET /api/recoveries/:id
// @desc    Get single recovery
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findById(req.params.id)
      .populate('shopkeeper', 'name email phone address pendingAmount')
      .populate('salesman', 'name email phone')
      .populate('items.product', 'name category imageURL');

    if (!recovery) {
      return res.status(404).json({ error: 'Recovery not found' });
    }

    // Check permissions
    if (req.user.role === 'salesman' && recovery.salesman._id.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ recovery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/recoveries/:id
// @desc    Update recovery
// @access  Private (Admin, Super Admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const recovery = await Recovery.findById(req.params.id);
    if (!recovery) {
      return res.status(404).json({ error: 'Recovery not found' });
    }

    if (status !== undefined) recovery.status = status;
    if (notes !== undefined) recovery.notes = notes;

    await recovery.save();

    res.json({
      success: true,
      message: 'Recovery updated successfully',
      recovery
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/recoveries/:id
// @desc    Delete recovery
// @access  Private (Admin, Super Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const recovery = await Recovery.findById(req.params.id);
    if (!recovery) {
      return res.status(404).json({ error: 'Recovery not found' });
    }

    // Reverse the stock changes if items were delivered
    if (recovery.recoveryType === 'payment_with_items' && recovery.items.length > 0) {
      for (const item of recovery.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      }
    }

    // Reverse the pending amount change
    const shopkeeper = await User.findById(recovery.shopkeeper);
    if (shopkeeper) {
      const newPendingAmount = shopkeeper.pendingAmount + recovery.netPayment;
      await User.findByIdAndUpdate(recovery.shopkeeper, {
        pendingAmount: newPendingAmount
      });
    }

    await Recovery.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Recovery deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/recoveries/stats/summary
// @desc    Get recovery statistics
// @access  Private
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchQuery = {};
    
    // Filter based on user role
    if (req.user.role === 'salesman') {
      matchQuery.salesman = req.user._id;
    } else if (req.user.role === 'admin') {
      const salesmen = await User.find({ assignedBy: req.user._id, role: 'salesman' }).select('_id');
      matchQuery.salesman = { $in: salesmen.map(s => s._id) };
    } else if (req.user.role === 'superadmin') {
      // Super admin can see all recovery statistics - no additional filtering needed
    }

    // Date range filter
    if (startDate || endDate) {
      matchQuery.recoveryDate = {};
      if (startDate) matchQuery.recoveryDate.$gte = new Date(startDate);
      if (endDate) matchQuery.recoveryDate.$lte = new Date(endDate);
    }

    const stats = await Recovery.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRecoveries: { $sum: 1 },
          totalAmountCollected: { $sum: '$amountCollected' },
          totalNetPayment: { $sum: '$netPayment' },
          totalItemsValue: { $sum: '$itemsValue' },
          averageRecovery: { $avg: '$amountCollected' }
        }
      }
    ]);

    const typeStats = await Recovery.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$recoveryType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amountCollected' }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalRecoveries: 0,
        totalAmountCollected: 0,
        totalNetPayment: 0,
        totalItemsValue: 0,
        averageRecovery: 0
      },
      typeStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/recoveries/shopkeepers/:salesmanId
// @desc    Get shopkeepers with pending amounts for a salesman
// @access  Private
router.get('/shopkeepers/:salesmanId', authenticateToken, async (req, res) => {
  try {
    const { salesmanId } = req.params;

    // Check permissions
    if (req.user.role === 'salesman' && req.user._id.toString() !== salesmanId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get assigned shopkeepers with pending amounts
    const assignments = await ShopSalesmanAssignment.find({
      salesmanId,
      isActive: true
    }).populate('shopkeeperId', 'name email phone address pendingAmount creditLimit');

    const shopkeepers = assignments
      .map(assignment => assignment.shopkeeperId)
      .filter(shopkeeper => shopkeeper.pendingAmount > 0);

    res.json({
      success: true,
      shopkeepers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
