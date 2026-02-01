import express from 'express'
import Customer from '../models/Customer.js'
import { verifyToken } from './auth.js'

const router = express.Router()

/**
 * @route   GET /api/customers
 * @desc    Get all customers for the user
 * @access  Private
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, sortBy = 'createdAt', order = 'desc' } = req.query

    let query = { userId: req.user.id, isActive: true }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    const customers = await Customer.find(query)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .select('-userId')

    res.json({
      success: true,
      count: customers.length,
      data: customers,
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    res.status(500).json({ error: 'Failed to fetch customers' })
  }
})

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).select('-userId')

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    res.json({
      success: true,
      data: customer,
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    res.status(500).json({ error: 'Failed to fetch customer' })
  }
})

/**
 * @route   POST /api/customers
 * @desc    Create new customer
 * @access  Private
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, mobileNumber, email, address, city, state, zipCode, gstNumber, notes } = req.body

    // Validate required fields
    if (!name || !mobileNumber) {
      return res.status(400).json({ error: 'Name and mobile number are required' })
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      userId: req.user.id,
      mobileNumber: mobileNumber.replace(/[- ]/g, ''),
    })

    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer with this mobile number already exists' })
    }

    const newCustomer = new Customer({
      userId: req.user.id,
      name,
      mobileNumber: mobileNumber.replace(/[- ]/g, ''),
      email,
      address,
      city,
      state,
      zipCode,
      gstNumber,
      notes,
    })

    await newCustomer.save()

    res.status(201).json({
      success: true,
      message: 'Customer added successfully',
      data: newCustomer,
    })
  } catch (error) {
    console.error('Error creating customer:', error)
    res.status(500).json({ error: error.message || 'Failed to create customer' })
  }
})

/**
 * @route   PUT /api/customers/:id
 * @desc    Update customer
 * @access  Private
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, mobileNumber, email, address, city, state, zipCode, gstNumber, notes } = req.body

    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    // Check if new mobile number already exists (excluding current customer)
    if (mobileNumber && mobileNumber !== customer.mobileNumber) {
      const existingCustomer = await Customer.findOne({
        userId: req.user.id,
        mobileNumber: mobileNumber.replace(/[- ]/g, ''),
        _id: { $ne: req.params.id },
      })

      if (existingCustomer) {
        return res.status(400).json({ error: 'Mobile number already exists' })
      }
    }

    // Update fields
    if (name) customer.name = name
    if (mobileNumber) customer.mobileNumber = mobileNumber.replace(/[- ]/g, '')
    if (email) customer.email = email
    if (address) customer.address = address
    if (city) customer.city = city
    if (state) customer.state = state
    if (zipCode) customer.zipCode = zipCode
    if (gstNumber) customer.gstNumber = gstNumber
    if (notes !== undefined) customer.notes = notes

    await customer.save()

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    })
  } catch (error) {
    console.error('Error updating customer:', error)
    res.status(500).json({ error: 'Failed to update customer' })
  }
})

/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete customer (soft delete)
 * @access  Private
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    // Soft delete
    customer.isActive = false
    await customer.save()

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting customer:', error)
    res.status(500).json({ error: 'Failed to delete customer' })
  }
})

/**
 * @route   POST /api/customers/verify-mobile
 * @desc    Verify if mobile number exists
 * @access  Private
 */
router.post('/verify-mobile', verifyToken, async (req, res) => {
  try {
    const { mobileNumber } = req.body

    if (!mobileNumber) {
      return res.status(400).json({ error: 'Mobile number is required' })
    }

    const customer = await Customer.findOne({
      userId: req.user.id,
      mobileNumber: mobileNumber.replace(/[- ]/g, ''),
      isActive: true,
    })

    if (customer) {
      res.json({
        success: true,
        exists: true,
        customer: {
          id: customer._id,
          name: customer.name,
          mobileNumber: customer.mobileNumber,
          email: customer.email,
          address: customer.address,
        },
      })
    } else {
      res.json({
        success: true,
        exists: false,
      })
    }
  } catch (error) {
    console.error('Error verifying mobile:', error)
    res.status(500).json({ error: 'Failed to verify mobile number' })
  }
})

export default router
