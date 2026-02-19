import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  // Notification type
  type: {
    type: String,
    enum: ['order', 'recovery', 'receipt', 'system'],
    required: true
  },
  
  // Notification title
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  // Notification message
  message: {
    type: String,
    required: true,
    trim: true
  },
  
  // Related entity (order, recovery, etc.)
  relatedEntity: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      return ['order', 'recovery', 'receipt'].includes(this.type);
    }
  },
  
  // Related entity type
  relatedEntityType: {
    type: String,
    enum: ['Order', 'ShopkeeperOrder', 'Recovery', 'Receipt'],
    required: function() {
      return ['order', 'recovery', 'receipt'].includes(this.type);
    }
  },
  
  // Target users (admin, superadmin, specific user)
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Target roles
  targetRoles: [{
    type: String,
    enum: ['admin', 'superadmin', 'salesman', 'shopkeeper']
  }],
  
  // Read status for each user
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Notification priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Notification status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  
  // Additional data
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Expiry date (optional)
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ targetUsers: 1, status: 1 });
NotificationSchema.index({ targetRoles: 1, status: 1 });
NotificationSchema.index({ 'readBy.user': 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for checking if notification is read by a specific user
NotificationSchema.virtual('isRead').get(function() {
  return this.readBy.length > 0;
});

// Method to mark as read by a user
NotificationSchema.methods.markAsRead = function(userId) {
  const userIdStr = userId?.toString ? userId.toString() : String(userId);
  const existingRead = this.readBy.find((read) => {
    if (!read || !read.user) {
      return false;
    }
    const readUser = read.user._id ? read.user._id : read.user;
    const readUserIdStr = readUser?.toString ? readUser.toString() : String(readUser);
    return readUserIdStr === userIdStr;
  });
  if (!existingRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to check if read by a specific user
NotificationSchema.methods.isReadBy = function(userId) {
  if (!this.readBy || !Array.isArray(this.readBy)) {
    return false;
  }
  if (!userId) {
    return false;
  }
  const userIdStr = userId.toString ? userId.toString() : String(userId);
  return this.readBy.some(read => {
    if (!read || !read.user) {
      return false;
    }
    const readUser = read.user._id ? read.user._id : read.user;
    const readUserIdStr = readUser.toString ? readUser.toString() : String(readUser);
    return readUserIdStr === userIdStr;
  });
};

const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification;
