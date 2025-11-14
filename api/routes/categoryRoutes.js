// routes/categoryRoutes.js
import express from "express";
import Category from "../models/Category.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: "Access denied. Super admin required." });
  }
  next();
};

// @route   GET /api/categories
// @desc    Get all categories (public for product forms)
// @access  Public
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('name description icon color');

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/categories/all
// @desc    Get all categories including inactive (Super Admin only)
// @access  Private (Super Admin)
router.get("/all", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const limitNumber = Math.max(parseInt(limit) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const [categories, total] = await Promise.all([
      Category.find(query)
        .populate('createdBy', 'name email')
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limitNumber),
      Category.countDocuments(query)
    ]);

    res.json({
      success: true,
      categories,
      pagination: {
        current: pageNumber,
        pages: Math.ceil(total / limitNumber) || 1,
        total,
        limit: limitNumber
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/categories
// @desc    Create new category (Super Admin only)
// @access  Private (Super Admin)
router.post("/", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, description, icon, color, sortOrder } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true 
    });

    if (existingCategory) {
      return res.status(400).json({ error: "Category with this name already exists" });
    }

    const category = new Category({
      name,
      description,
      icon,
      color,
      sortOrder: sortOrder || 0,
      createdBy: req.user._id
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: "Category with this name already exists" });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// @route   PUT /api/categories/:id
// @desc    Update category (Super Admin only)
// @access  Private (Super Admin)
router.put("/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, description, icon, color, sortOrder, isActive } = req.body;

    // Check if category exists
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if new name conflicts with existing category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        isActive: true,
        _id: { $ne: req.params.id }
      });

      if (existingCategory) {
        return res.status(400).json({ error: "Category with this name already exists" });
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, icon, color, sortOrder, isActive },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: "Category with this name already exists" });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category (Super Admin only)
// @access  Private (Super Admin)
router.delete("/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if category is being used by products
    const Product = (await import('../models/project.js')).default;
    const productsUsingCategory = await Product.countDocuments({ category: category.name });
    
    if (productsUsingCategory > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It is being used by ${productsUsingCategory} product(s). Please deactivate instead.` 
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/categories/:id/toggle
// @desc    Toggle category active status (Super Admin only)
// @access  Private (Super Admin)
router.put("/:id/toggle", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if category is being used by products when deactivating
    if (category.isActive) {
      const Product = (await import('../models/project.js')).default;
      const productsUsingCategory = await Product.countDocuments({ category: category.name });
      
      if (productsUsingCategory > 0) {
        return res.status(400).json({ 
          error: `Cannot deactivate category. It is being used by ${productsUsingCategory} product(s).` 
        });
      }
    }

    category.isActive = !category.isActive;
    await category.save();

    res.json({
      success: true,
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/categories/reorder
// @desc    Reorder categories (Super Admin only)
// @access  Private (Super Admin)
router.put("/reorder", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { categoryOrders } = req.body; // Array of { id, sortOrder }

    if (!Array.isArray(categoryOrders)) {
      return res.status(400).json({ error: "categoryOrders must be an array" });
    }

    // Update sort order for each category
    const updatePromises = categoryOrders.map(({ id, sortOrder }) =>
      Category.findByIdAndUpdate(id, { sortOrder }, { new: true })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Categories reordered successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
