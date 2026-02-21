import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from '../config/runtimeConfig.js';
import { JWT_EXPIRES_IN_USER } from '../config/constants.js';

const router = express.Router();
const JWT_SECRET = getRequiredEnv('JWT_SECRET');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN_USER,
  });
};

// Middleware to check if user is superadmin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied. Super admin required.' });
  }
  next();
};

// Middleware to check if user is admin or superadmin
const requireAdmin = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Admin or super admin required.' });
  }
  next();
};

// @route   POST /api/users/login
// @desc    User login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, isActive: true });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        territory: user.territory,
        pendingAmount: user.pendingAmount,
        creditLimit: user.creditLimit,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json({ user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/users
// @desc    Get all users (with role filtering)
// @access  Private (Admin/SuperAdmin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search, city } = req.query;
    let query = {};

    // Super admin can see all users, admin can see salesmen and shopkeepers
    if (req.user.role === 'admin') {
      query.role = { $in: ['salesman', 'shopkeeper'] };
    }

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by city for shopkeepers
    if (city) {
      query.city = city;
    }

    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select('-password')
      .populate('assignedBy', 'name email')
      .populate('assignedSalesman', 'name email')
      .populate('city', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
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

// @route   POST /api/users
// @desc    Create new user
// @access  Private (SuperAdmin)
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const userData = {
      ...req.body,
      assignedBy: req.user._id
    };

    const user = new User(userData);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        territory: user.territory,
        city: user.city,
        pendingAmount: user.pendingAmount,
        creditLimit: user.creditLimit,
        isActive: user.isActive
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (SuperAdmin)
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (SuperAdmin)
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private (SuperAdmin)
router.put('/:id/toggle-status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/users/salesmen
// @desc    Get salesmen for admin
// @access  Private (Admin)
router.get('/salesmen', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const salesmen = await User.find({ 
      role: 'salesman', 
      assignedBy: req.user._id,
      isActive: true 
    }).select('name email phone territory commissionRate');

    res.json({ salesmen });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
