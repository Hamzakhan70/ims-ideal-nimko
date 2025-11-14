import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "ideal_nimko_secret_key_2024";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ No token provided in request');
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Try to find user in new User model first
      let user = await User.findById(decoded.id).select('-password');
      
      // If not found in User model, try Admin model (for backward compatibility)
      if (!user) {
        const admin = await Admin.findById(decoded.id).select('-password');
        if (admin) {
          // Convert admin to user format for compatibility
          user = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role === 'superadmin' ? 'superadmin' : 'admin',
            isActive: true
          };
        }
      }
      
      if (!user || !user.isActive) {
        console.log('❌ User not found or inactive:', decoded.id);
        return res.status(401).json({ error: 'Invalid or inactive user' });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(403).json({ error: 'Invalid or expired token', details: jwtError.message });
    }
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};
