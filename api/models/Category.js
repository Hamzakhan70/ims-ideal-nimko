// models/Category.js
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Optional: Category icon or image
  icon: {
    type: String,
    default: ''
  },
  // Optional: Category color for UI
  color: {
    type: String,
    default: '#3B82F6' // Default blue color
  },
  // Sort order for display
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });

// Ensure unique active category names
categorySchema.index(
  { name: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export default mongoose.model('Category', categorySchema);
