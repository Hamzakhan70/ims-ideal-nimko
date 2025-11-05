import express from 'express';
import City from '../models/City.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied. Super admin required.' });
  }
  next();
};

// @route   GET /api/cities
// @desc    List cities (active by default)
// @access  Private (Admin/SuperAdmin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const query = includeInactive ? {} : { isActive: true };
    const cities = await City.find(query).sort({ name: 1 });
    res.json({ cities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/cities
// @desc    Create city
// @access  Private (SuperAdmin)
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'City name is required' });
    }
    const city = new City({ name: name.trim() });
    await city.save();
    res.status(201).json({ success: true, city });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'City already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});

// @route   PUT /api/cities/:id
// @desc    Update city name or status
// @access  Private (SuperAdmin)
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const update = {};
    if (typeof req.body.name === 'string') {
      update.name = req.body.name.trim();
    }
    if (typeof req.body.isActive === 'boolean') {
      update.isActive = req.body.isActive;
    }
    const city = await City.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!city) {
      return res.status(404).json({ error: 'City not found' });
    }
    res.json({ success: true, city });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// @route   DELETE /api/cities/:id
// @desc    Delete city
// @access  Private (SuperAdmin)
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) {
      return res.status(404).json({ error: 'City not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;


