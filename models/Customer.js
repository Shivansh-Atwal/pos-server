import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^(\+\d{1,3}[- ]?)?\d{10}$/,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: String,
    state: String,
    zipCode: String,
    gstNumber: String,
    notes: String,
    totalBills: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
customerSchema.index({ userId: 1, mobileNumber: 1 })
customerSchema.index({ userId: 1, name: 1 })

const Customer = mongoose.model('Customer', customerSchema)

export default Customer
