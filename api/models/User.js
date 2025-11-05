import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'salesman', 'shopkeeper'],
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // For salesmen - assigned by admin
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // For shopkeepers - assigned by salesman
  assignedSalesman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Commission percentage for salesmen
  commissionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Territory/Region
  territory: {
    type: String,
    default: ''
  },
  // City for shopkeepers
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    default: null
  },
  // Pending amount for shopkeepers (outstanding balance)
  pendingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Credit limit for shopkeepers
  creditLimit: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
