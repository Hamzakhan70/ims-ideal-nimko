import express from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { authenticateToken, requireSuperAdmin } from "../middleware/auth.js";
import { getRequiredEnv } from "../config/runtimeConfig.js";
import { JWT_EXPIRES_IN_ADMIN } from "../config/constants.js";

const router = express.Router();
const JWT_SECRET = getRequiredEnv("JWT_SECRET");

// Admin login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN_ADMIN }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get admin profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      admin: req.admin
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update admin profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { username, email } = req.body;
    
    const admin = await Admin.findByIdAndUpdate(
      req.admin._id,
      { username, email },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: "Profile updated successfully",
      admin
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Change password
router.put("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords are required" });
    }

    const admin = await Admin.findById(req.admin._id).select('+password');
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all admins (super admin only)
router.get("/", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      admins
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new admin (super admin only)
router.post("/", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { username, email, password, role = 'admin' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    const admin = new Admin({ username, email, password, role });
    await admin.save();

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update admin (super admin only)
router.put("/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { username, email, role, isActive } = req.body;
    
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { username, email, role, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({
      success: true,
      message: "Admin updated successfully",
      admin
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete admin (super admin only)
router.delete("/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    if (req.params.id === req.admin._id.toString()) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({
      success: true,
      message: "Admin deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
