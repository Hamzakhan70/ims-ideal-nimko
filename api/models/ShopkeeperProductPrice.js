import mongoose from 'mongoose';

const shopkeeperProductPriceSchema = new mongoose.Schema({
  shopkeeper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

shopkeeperProductPriceSchema.index({ shopkeeper: 1, product: 1 }, { unique: true });

export default mongoose.model('ShopkeeperProductPrice', shopkeeperProductPriceSchema);
