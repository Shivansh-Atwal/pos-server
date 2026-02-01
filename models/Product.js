import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Snacks',
        'Beverages',
        'Dairy',
        'Bakery',
        'Frozen',
        'Household',
        'Personal Care',
        'Others',
        'Food',
      ],
    },
    brand: String,
    description: String,
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
    },
    image: String,
    stock: {
      type: Number,
      default: 0,
    },
    minStock: {
      type: Number,
      default: 10,
    },
    supplier: String,
    tax: {
      type: Number,
      default: 5,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

export default mongoose.model('Product', productSchema)
