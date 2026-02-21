// server/routes/orderRoutes.js
import express from "express";
import Order from "../models/order.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { authenticateToken } from "../middleware/auth.js";
const router = express.Router();

// Helper function to create notifications
const createOrderNotification = async (order) => {
  try {
    // Get all admin and superadmin users
    const adminUsers = await User.find({ 
      role: { $in: ['admin', 'superadmin'] } 
    }).select('_id');

    if (adminUsers.length > 0) {
      const notification = new Notification({
        type: 'order',
        title: 'New Order Received',
        message: `New order #${order._id.toString().slice(-8)} from ${order.customerName} for ₹${order.totalAmount}`,
        relatedEntity: order._id,
        relatedEntityType: 'Order',
        targetUsers: adminUsers.map(user => user._id),
        targetRoles: ['admin', 'superadmin'],
        priority: 'high',
        data: {
          orderId: order._id,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          itemCount: order.items.length
        }
      });

      await notification.save();
    }
  } catch (error) {
    console.error('Error creating order notification:', error);
  }
};

// Public routes
// Create new order
router.post("/", async (req, res) => {
  try {
    const { customerName, phone, address, items, totalAmount } = req.body;
    
    // Validate required fields
    if (!customerName || !phone || !address || !items || !totalAmount) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required and cannot be empty" });
    }
    
    const newOrder = new Order({
      customerName,
      phone,
      address,
      items,
      totalAmount
    });
    
    await newOrder.save();
    
    // Create notification for new order
    createOrderNotification(newOrder);
    
    res.json({ 
      success: true, 
      message: "Order placed successfully!",
      orderId: newOrder._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin routes (protected)
// Get all orders with filtering and pagination
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 10, 
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const orders = await Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Order.countDocuments(query);
    
    // Get order statistics
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" }
        }
      }
    ]);
    
    const statusStats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      stats: stats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
      statusStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.put("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({
      success: true,
      message: "Order status updated successfully",
      order
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update order details
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { customerName, phone, address, items, totalAmount } = req.body;
    
    const updateData = {};
    if (customerName) updateData.customerName = customerName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (items) updateData.items = items;
    if (totalAmount) updateData.totalAmount = totalAmount;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({
      success: true,
      message: "Order updated successfully",
      order
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete order
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({
      success: true,
      message: "Order deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard statistics
router.get("/stats/dashboard", authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stats = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" }
        }
      }
    ]);
    
    const dailyStats = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$orderDate" },
            month: { $month: "$orderDate" },
            day: { $dayOfMonth: "$orderDate" }
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
      }
    ]);
    
    const statusStats = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      stats: stats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
      dailyStats,
      statusStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
