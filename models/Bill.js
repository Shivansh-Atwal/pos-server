import mongoose from 'mongoose'

const billSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    billNumber: {
      type: String,
      unique: true,
      required: true,
    },
    // Shop Details
    shopName: String,
    shopAddress: String,
    shopPhone: String,
    gstNumber: String, // Income Tax / GST Number
    // Customer Details
    customerName: String,
    customerMobile: String,
    customerEmail: String,
    // Bill Items
    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        productName: String,
        quantity: Number,
        unitPrice: Number,
        totalPrice: Number,
      },
    ],
    subtotal: Number,
    tax: Number,
    taxPercentage: {
      type: Number,
      default: 5,
    },
    discount: {
      type: Number,
      default: 0,
    },
    total: Number,
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'UPI', 'Check'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Pending',
    },
    amountReceived: Number,
    change: Number,
    cashier: String,
    notes: String,
  },
  { timestamps: true }
)

export default mongoose.model('Bill', billSchema)
