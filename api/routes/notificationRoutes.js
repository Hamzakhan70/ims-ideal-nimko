import express from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin or superadmin
const requireAdmin = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Admin or Super Admin required.' });
  }
  next();
};

// @route   GET /api/notifications
// @desc    Get notifications for the current user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status = 'active' } = req.query;
    const skip = (page - 1) * limit;

    // Build query based on user role
    let query = {
      status,
      $or: [
        { targetUsers: req.user._id },
        { targetRoles: req.user.role }
      ]
    };

    // Add type filter if provided
    if (type) {
      query.type = type;
    }

    // Get notifications
    const notifications = await Notification.find(query)
      .populate('targetUsers', 'name email role')
      .populate('readBy.user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Notification.countDocuments(query);

    // Get unread count - use aggregation to properly check nested array
    const userId = mongoose.Types.ObjectId.isValid(req.user._id) 
      ? new mongoose.Types.ObjectId(req.user._id) 
      : req.user._id;
    
    const unreadResult = await Notification.aggregate([
      { $match: query },
      {
        $addFields: {
          isReadByUser: {
            $anyElementTrue: {
              $map: {
                input: { $ifNull: ['$readBy', []] },
                as: 'read',
                in: { 
                  $eq: [
                    { $ifNull: ['$$read.user', null] }, 
                    userId
                  ] 
                }
              }
            }
          }
        }
      },
      { $match: { isReadByUser: false } },
      { $count: 'count' }
    ]);
    
    const unreadCount = unreadResult[0]?.count || 0;

    // Add isRead flag for each notification
    const notificationsWithReadStatus = notifications.map(notification => {
      try {
        const isRead = notification.isReadBy(req.user._id);
        return {
          ...notification.toObject(),
          isRead
        };
      } catch (error) {
        console.error('Error checking isReadBy for notification:', notification._id, error);
        return {
          ...notification.toObject(),
          isRead: false
        };
      }
    });

    res.json({
      success: true,
      notifications: notificationsWithReadStatus,
      unreadCount,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/notifications/:id
// @desc    Get single notification
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('targetUsers', 'name email role')
      .populate('readBy.user', 'name email');

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Check if user has access to this notification
    const hasAccess = notification.targetUsers.some(user => user._id.toString() === req.user._id.toString()) ||
                     notification.targetRoles.includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      notification: {
        ...notification.toObject(),
        isRead: notification.isReadBy(req.user._id)
      }
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Check if user has access to this notification
    const hasAccess = notification.targetUsers.some(user => user.toString() === req.user._id.toString()) ||
                     notification.targetRoles.includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await notification.markAsRead(req.user._id);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read for current user
// @access  Private
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const query = {
      status: 'active',
      $or: [
        { targetUsers: req.user._id },
        { targetRoles: req.user.role }
      ],
      'readBy.user': { $ne: req.user._id }
    };

    const notifications = await Notification.find(query);
    
    for (const notification of notifications) {
      await notification.markAsRead(req.user._id);
    }

    res.json({
      success: true,
      message: `${notifications.length} notifications marked as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/notifications
// @desc    Create a new notification
// @access  Private (Admin, Super Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      relatedEntity,
      relatedEntityType,
      targetUsers = [],
      targetRoles = [],
      priority = 'medium',
      data = {}
    } = req.body;

    const notification = new Notification({
      type,
      title,
      message,
      relatedEntity,
      relatedEntityType,
      targetUsers,
      targetRoles,
      priority,
      data
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private (Admin, Super Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/notifications/stats/summary
// @desc    Get notification statistics
// @access  Private
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const query = {
      status: 'active',
      $or: [
        { targetUsers: req.user._id },
        { targetRoles: req.user.role }
      ]
    };

    const totalNotifications = await Notification.countDocuments(query);
    const unreadNotifications = await Notification.countDocuments({
      ...query,
      'readBy.user': { $ne: req.user._id }
    });

    const typeStats = await Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: {
            $sum: {
              $cond: [
                { $not: { $in: [req.user._id, '$readBy.user'] } },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        total: totalNotifications,
        unread: unreadNotifications,
        read: totalNotifications - unreadNotifications
      },
      typeStats
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
