import mongoose from 'mongoose'

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    minStock: {
      type: Number,
      required: true,
      default: 10,
    },
    maxStock: {
      type: Number,
      default: 100,
    },
    location: {
      type: String,
      default: 'Main Store',
    },
    warehouse: {
      type: String,
      default: 'Default',
    },
    lastRestocked: {
      type: Date,
      default: Date.now,
    },
    notes: String,
    reorderLevel: {
      type: Number,
      default: 20,
    },
    status: {
      type: String,
      enum: ['In Stock', 'Low Stock', 'Out of Stock'],
      default: 'In Stock',
    },
  },
  { timestamps: true }
)

// Index for barcode searches
inventorySchema.index({ barcode: 1, productId: 1 })

export default mongoose.model('Inventory', inventorySchema)
