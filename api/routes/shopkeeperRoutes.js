import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/shopkeepers
// @desc    Get assigned shopkeepers for salesman
// @access  Private (Salesman, Admin, SuperAdmin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = {};
    const { city } = req.query;
    
    if (req.user.role === 'salesman') {
      // Salesman can only see their assigned shopkeepers
      query.assignedSalesman = req.user._id;
    } else if (req.user.role === 'admin') {
      // Admin can see shopkeepers assigned to their salesmen
      const salesmen = await User.find({ assignedBy: req.user._id, role: 'salesman' }).select('_id');
      const salesmanIds = salesmen.map(s => s._id);
      query.assignedSalesman = { $in: salesmanIds };
    }
    // Super admin can see all shopkeepers

    query.role = 'shopkeeper';
    if (city) {
      query.city = city;
    }

    const shopkeepers = await User.find(query)
      .select('name email phone address pendingAmount creditLimit city')
      .populate('city', 'name');

    res.json({ shopkeepers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
