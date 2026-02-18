import mongoose from 'mongoose';

const ReceiptSchema = new mongoose.Schema({
  // Receipt type
  receiptType: {
    type: String,
    enum: ['order', 'recovery'],
    required: true
  },
  
  // Reference to the original record
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopkeeperOrder',
    required: function() {
      return this.receiptType === 'order';
    }
  },
  
  recoveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recovery',
    required: function() {
      return this.receiptType === 'recovery';
    }
  },
  
  // Receipt details
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // Shopkeeper information
  shopkeeper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Salesman information
  salesman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Receipt content (HTML)
  receiptContent: {
    type: String,
    required: true
  },
  
  // Receipt metadata
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Print information
  printedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  printedAt: {
    type: Date,
    default: Date.now
  },
  
  // Receipt status
  status: {
    type: String,
    enum: ['generated', 'printed', 'cancelled'],
    default: 'generated'
  },
  
  // Additional information
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Generate receipt number before saving
ReceiptSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Receipt').countDocuments();
    const prefix = this.receiptType === 'order' ? 'ORD' : 'REC';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const sequence = (count + 1).toString().padStart(4, '0');
    
    this.receiptNumber = `${prefix}${year}${month}${day}${sequence}`;
  }
  next();
});

// Index for better query performance
ReceiptSchema.index({ receiptType: 1, printedAt: -1 });
ReceiptSchema.index({ shopkeeper: 1, salesman: 1 });

const Receipt = mongoose.model('Receipt', ReceiptSchema);

export default Receipt;
