import mongoose from 'mongoose';

const shopkeeperOrderSchema = new mongoose.Schema({
  shopkeeper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  salesman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Track who actually placed the order
  placedBy: {
    type: String,
    enum: ['shopkeeper', 'salesman'],
    default: 'shopkeeper'
  },
  // If placed by salesman, track the salesman who placed it
  placedBySalesman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.placedBy === 'salesman'; }
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    originalUnitPrice: {
      type: Number,
      min: 0
    },
    discountPerUnit: {
      type: Number,
      default: 0,
      min: 0
    },
    discountTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'overdue'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'credit'],
    default: 'cash'
  },
  notes: {
    type: String,
    default: ''
  },
  // Delivery information
  deliveryAddress: {
    type: String,
    default: ''
  },
  deliveryDate: {
    type: Date,
    default: null
  },
  // Payment details
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Commission tracking
  commission: {
    type: Number,
    default: 0
  },
  // Order tracking
  orderDate: {
    type: Date,
    default: Date.now
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('ShopkeeperOrder', shopkeeperOrderSchema);
