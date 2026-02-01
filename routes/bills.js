import express from 'express'
import Bill from '../models/Bill.js'
import Product from '../models/Product.js'
import { verifyToken } from './auth.js'
import * as billService from '../services/billService.js'
import * as whatsappService from '../services/whatsappService.js'

const router = express.Router()

/**
 * Generate unique bill number
 */
const generateBillNumber = () => {
  return 'BILL-' + Date.now()
}

// ==================== BILLS MANAGEMENT SECTION ====================

/**
 * @route   POST /api/bills
 * @desc    Create new bill
 * @access  Private
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      items,
      subtotal,
      tax,
      taxPercentage = 5,
      discount,
      total,
      paymentMethod,
      amountReceived,
      notes,
      // Shop details
      shopName,
      shopAddress,
      shopPhone,
      gstNumber,
      // Customer details
      customerName,
      customerMobile,
      customerEmail,
    } = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Bill must have at least one item' })
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' })
    }

    const billNumber = generateBillNumber()
    const change = amountReceived ? amountReceived - total : 0

    const bill = new Bill({
      userId: req.user.id,
      billNumber,
      items,
      subtotal,
      tax,
      taxPercentage,
      discount,
      total,
      paymentMethod,
      amountReceived,
      change,
      paymentStatus: 'Completed',
      notes,
      // Shop details
      shopName,
      shopAddress,
      shopPhone,
      gstNumber,
      // Customer details
      customerName,
      customerMobile,
      customerEmail,
    })

    await bill.save()

    // Invalidate bill list cache
    await billService.invalidateBillListCache(req.user.id)
    await billService.invalidateBillStatsCache()

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: bill,
    })
  } catch (error) {
    console.error('Error creating bill:', error)
    res.status(500).json({ error: 'Failed to create bill' })
  }
})

// ==================== ALL BILLS SECTION ====================

/**
 * @route   GET /api/bills/all
 * @desc    Get all user's bills with pagination and filters
 * @access  Private
 */
router.get('/all', verifyToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      paymentStatus,
      paymentMethod,
      startDate,
      endDate,
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    // Build query
    const query = { userId: req.user.id }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod
    }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        query.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate)
      }
    }

    // Fetch bills with filters
    const bills = await Bill.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limitNum)
      .skip(skip)

    const total = await Bill.countDocuments(query)

    res.json({
      success: true,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalBills: total,
        billsPerPage: limitNum,
      },
      data: bills,
    })
  } catch (error) {
    console.error('Error fetching all bills:', error)
    res.status(500).json({ error: 'Failed to fetch bills' })
  }
})

/**
 * @route   GET /api/bills/summary
 * @desc    Get bills summary and statistics
 * @access  Private
 */
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const query = { userId: req.user.id }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        query.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate)
      }
    }

    const bills = await Bill.find(query)

    // Calculate statistics
    const stats = await billService.calculateBillStats(bills)

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching bill summary:', error)
    res.status(500).json({ error: 'Failed to fetch summary' })
  }
})

/**
 * @route   GET /api/bills/list
 * @desc    Get bills list (legacy endpoint, redirects to /all)
 * @access  Private
 */
router.get('/list', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query

    const bills = await Bill.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Bill.countDocuments({ userId: req.user.id })

    res.json({
      success: true,
      count: bills.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: bills,
    })
  } catch (error) {
    console.error('Error fetching bills:', error)
    res.status(500).json({ error: 'Failed to fetch bills' })
  }
})

// ==================== INDIVIDUAL BILL SECTION ====================

/**
 * @route   GET /api/bills/:id
 * @desc    Get bill by ID
 * @access  Private
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user.id })

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }

    res.json({
      success: true,
      data: bill,
    })
  } catch (error) {
    console.error('Error fetching bill:', error)
    res.status(500).json({ error: 'Failed to fetch bill' })
  }
})

/**
 * @route   PUT /api/bills/:id
 * @desc    Update bill details
 * @access  Private
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { notes, customerName, customerMobile, customerEmail } = req.body

    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user.id })

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }

    // Only allow updating certain fields
    if (notes) bill.notes = notes
    if (customerName) bill.customerName = customerName
    if (customerMobile) bill.customerMobile = customerMobile
    if (customerEmail) bill.customerEmail = customerEmail

    await bill.save()

    // Invalidate caches
    await billService.invalidateBillCache(bill._id)

    res.json({
      success: true,
      message: 'Bill updated successfully',
      data: bill,
    })
  } catch (error) {
    console.error('Error updating bill:', error)
    res.status(500).json({ error: 'Failed to update bill' })
  }
})

/**
 * @route   DELETE /api/bills/:id
 * @desc    Delete bill (soft delete - mark as deleted)
 * @access  Private
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user.id })

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }

    await Bill.deleteOne({ _id: req.params.id })

    // Invalidate caches
    await billService.invalidateBillCache(bill._id)
    await billService.invalidateBillListCache(req.user.id)

    res.json({
      success: true,
      message: 'Bill deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting bill:', error)
    res.status(500).json({ error: 'Failed to delete bill' })
  }
})

// ==================== BILL SEARCH SECTION ====================

/**
 * @route   GET /api/bills/search/by-number/:billNumber
 * @desc    Search bill by bill number
 * @access  Public
 */
router.get('/search/by-number/:billNumber', async (req, res) => {
  try {
    const bill = await Bill.findOne({ billNumber: req.params.billNumber })

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }

    res.json({
      success: true,
      data: bill,
    })
  } catch (error) {
    console.error('Error searching bill:', error)
    res.status(500).json({ error: 'Failed to search bill' })
  }
})

/**
 * @route   GET /api/bills/search/by-customer/:customerMobile
 * @desc    Search bills by customer mobile
 * @access  Private
 */
router.get('/search/by-customer/:customerMobile', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query

    const bills = await Bill.find({
      userId: req.user.id,
      customerMobile: req.params.customerMobile,
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Bill.countDocuments({
      userId: req.user.id,
      customerMobile: req.params.customerMobile,
    })

    res.json({
      success: true,
      count: bills.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: bills,
    })
  } catch (error) {
    console.error('Error searching bills by customer:', error)
    res.status(500).json({ error: 'Failed to search bills' })
  }
})

// ==================== BILL STATISTICS SECTION ====================

/**
 * @route   GET /api/bills/stats/daily
 * @desc    Get daily bill statistics
 * @access  Public
 */
router.get('/stats/daily', async (req, res) => {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const bills = await Bill.find({
      createdAt: { $gte: startOfDay },
      paymentStatus: 'Completed',
    })

    const totalBills = bills.length
    const totalRevenue = bills.reduce((sum, bill) => sum + bill.total, 0)
    const averageBill = totalBills > 0 ? totalRevenue / totalBills : 0

    res.json({
      success: true,
      data: {
        totalBills,
        totalRevenue,
        averageBill,
        date: startOfDay.toISOString().split('T')[0],
      },
    })
  } catch (error) {
    console.error('Error fetching daily stats:', error)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

/**
 * @route   GET /api/bills/stats/monthly
 * @desc    Get monthly bill statistics
 * @access  Private
 */
router.get('/stats/monthly', verifyToken, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query

    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0, 23, 59, 59)

    const bills = await Bill.find({
      userId: req.user.id,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      paymentStatus: 'Completed',
    })

    const stats = await billService.calculateBillStats(bills)

    res.json({
      success: true,
      period: { year, month },
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

/**
 * @route   GET /api/bills/stats/yearly
 * @desc    Get yearly bill statistics
 * @access  Private
 */
router.get('/stats/yearly', verifyToken, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query

    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)

    const bills = await Bill.find({
      userId: req.user.id,
      createdAt: { $gte: startOfYear, $lte: endOfYear },
      paymentStatus: 'Completed',
    })

    const stats = await billService.calculateBillStats(bills)

    res.json({
      success: true,
      year,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching yearly stats:', error)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

/**
 * @route   GET /api/bills/stats/popular-products
 * @desc    Get popular products from bills
 * @access  Private
 */
router.get('/stats/popular-products', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query

    const popular = await billService.getPopularProducts(req.user.id, parseInt(limit))

    res.json({
      success: true,
      count: popular.length,
      data: popular,
    })
  } catch (error) {
    console.error('Error fetching popular products:', error)
    res.status(500).json({ error: 'Failed to fetch popular products' })
  }
})

/**
 * @route   GET /api/bills/stats/payment-methods
 * @desc    Get payment methods breakdown
 * @access  Private
 */
router.get('/stats/payment-methods', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const query = { userId: req.user.id }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }

    const bills = await Bill.find(query)

    const paymentBreakdown = {}
    bills.forEach((bill) => {
      if (!paymentBreakdown[bill.paymentMethod]) {
        paymentBreakdown[bill.paymentMethod] = { count: 0, total: 0, average: 0 }
      }
      paymentBreakdown[bill.paymentMethod].count += 1
      paymentBreakdown[bill.paymentMethod].total += bill.total
    })

    // Calculate averages
    Object.keys(paymentBreakdown).forEach((method) => {
      paymentBreakdown[method].average =
        paymentBreakdown[method].total / paymentBreakdown[method].count
    })

    res.json({
      success: true,
      data: paymentBreakdown,
    })
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    res.status(500).json({ error: 'Failed to fetch payment methods' })
  }
})

// ==================== BILL EXPORT SECTION ====================

/**
 * @route   GET /api/bills/export/csv
 * @desc    Export bills as CSV
 * @access  Private
 */
router.get('/export/csv', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const query = { userId: req.user.id }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }

    const bills = await Bill.find(query).sort({ createdAt: -1 })

    const csvData = await billService.exportBills(bills)

    // Convert to CSV format
    const csv =
      'Bill Number,Date,Customer Name,Mobile,Total,Payment Method,Status,Items\n' +
      csvData
        .map(
          (bill) =>
            `${bill.billNumber},${bill.date},${bill.customerName},${bill.customerMobile},${bill.total},${bill.paymentMethod},${bill.paymentStatus},${bill.itemCount}`
        )
        .join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="bills.csv"')
    res.send(csv)
  } catch (error) {
    console.error('Error exporting bills:', error)
    res.status(500).json({ error: 'Failed to export bills' })
  }
})

/**
 * @route   POST /api/bills/send-whatsapp
 * @desc    Send bill via WhatsApp
 * @access  Private
 */
router.post('/send-whatsapp', verifyToken, async (req, res) => {
  try {
    const { billId, phoneNumber, pdfBase64 } = req.body

    if (!phoneNumber || !pdfBase64) {
      return res.status(400).json({ error: 'Phone number and PDF are required' })
    }

    const result = await whatsappService.sendBillViaWhatsApp(phoneNumber, pdfBase64, 'bill.pdf')

    res.json(result)
  } catch (error) {
    console.error('Error sending bill via WhatsApp:', error)
    res.status(500).json({ error: error.message || 'Failed to send bill via WhatsApp' })
  }
})

/**
 * @route   POST /api/bills/send-message
 * @desc    Send text message via WhatsApp
 * @access  Private
 */
router.post('/send-message', verifyToken, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' })
    }

    const result = await whatsappService.sendTextMessage(phoneNumber, message)

    res.json(result)
  } catch (error) {
    console.error('Error sending message via WhatsApp:', error)
    res.status(500).json({ error: error.message || 'Failed to send message via WhatsApp' })
  }
})

export default router
