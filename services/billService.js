import Bill from '../models/Bill.js'
import * as cacheService from './cacheService.js'

const CACHE_EXPIRY = {
  BILL_LIST: 5 * 60, // 5 minutes
  BILL_DETAIL: 10 * 60, // 10 minutes
  BILL_STATS: 1 * 60, // 1 minute
}

/**
 * Cache bill list for user
 */
export const cacheBillList = async (userId, bills) => {
  try {
    const key = `bills:${userId}`
    await redisClient.setEx(key, CACHE_EXPIRY.BILL_LIST, JSON.stringify(bills))
    return true
  } catch (err) {
    console.error('Error caching bill list:', err)
    return false
  }
}

/**
 * Get cached bill list
 */
export const getCachedBillList = async (userId) => {
  try {
    const key = `bills:${userId}`
    const data = await redisClient.get(key)
    if (!data) return null
    return JSON.parse(data)
  } catch (err) {
    console.error('Error getting cached bill list:', err)
    return null
  }
}

/**
 * Cache individual bill
 */
export const cacheBill = async (billId, billData) => {
  try {
    const key = `bill:${billId}`
    await redisClient.setEx(key, CACHE_EXPIRY.BILL_DETAIL, JSON.stringify(billData))
    return true
  } catch (err) {
    console.error('Error caching bill:', err)
    return false
  }
}

/**
 * Get cached bill by ID
 */
export const getCachedBill = async (billId) => {
  try {
    const key = `bill:${billId}`
    const data = await redisClient.get(key)
    if (!data) return null
    return JSON.parse(data)
  } catch (err) {
    console.error('Error getting cached bill:', err)
    return null
  }
}

/**
 * Cache bill by bill number
 */
export const cacheBillByNumber = async (billNumber, billData) => {
  try {
    const key = `bill-number:${billNumber}`
    await redisClient.setEx(key, CACHE_EXPIRY.BILL_DETAIL, JSON.stringify(billData))
    return true
  } catch (err) {
    console.error('Error caching bill by number:', err)
    return false
  }
}

/**
 * Get cached bill by bill number
 */
export const getCachedBillByNumber = async (billNumber) => {
  try {
    const key = `bill-number:${billNumber}`
    const data = await redisClient.get(key)
    if (!data) return null
    return JSON.parse(data)
  } catch (err) {
    console.error('Error getting cached bill by number:', err)
    return null
  }
}

/**
 * Cache bill statistics
 */
export const cacheBillStats = async (statsKey, statsData) => {
  try {
    const key = `bill-stats:${statsKey}`
    await redisClient.setEx(key, CACHE_EXPIRY.BILL_STATS, JSON.stringify(statsData))
    return true
  } catch (err) {
    console.error('Error caching bill stats:', err)
    return false
  }
}

/**
 * Get cached bill statistics
 */
export const getCachedBillStats = async (statsKey) => {
  try {
    const key = `bill-stats:${statsKey}`
    const data = await redisClient.get(key)
    if (!data) return null
    return JSON.parse(data)
  } catch (err) {
    console.error('Error getting cached bill stats:', err)
    return null
  }
}

/**
 * Invalidate user's bill list cache
 */
export const invalidateBillListCache = async (userId) => {
  try {
    const key = `bills:${userId}`
    await redisClient.del(key)
    return true
  } catch (err) {
    console.error('Error invalidating bill list cache:', err)
    return false
  }
}

/**
 * Invalidate specific bill cache
 */
export const invalidateBillCache = async (billId) => {
  try {
    const key = `bill:${billId}`
    await redisClient.del(key)
    return true
  } catch (err) {
    console.error('Error invalidating bill cache:', err)
    return false
  }
}

/**
 * Invalidate bill by number cache
 */
export const invalidateBillByNumberCache = async (billNumber) => {
  try {
    const key = `bill-number:${billNumber}`
    await redisClient.del(key)
    return true
  } catch (err) {
    console.error('Error invalidating bill by number cache:', err)
    return false
  }
}

/**
 * Invalidate all bill statistics cache
 */
export const invalidateBillStatsCache = async () => {
  try {
    const keys = await redisClient.keys('bill-stats:*')
    if (keys.length > 0) {
      await redisClient.del(keys)
    }
    return true
  } catch (err) {
    console.error('Error invalidating bill stats cache:', err)
    return false
  }
}

/**
 * Get bills by date range with filters
 */
export const getBillsByDateRange = async (userId, startDate, endDate, filters = {}) => {
  try {
    const query = {
      userId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }

    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus
    }

    if (filters.paymentMethod) {
      query.paymentMethod = filters.paymentMethod
    }

    if (filters.minAmount) {
      query.total = { $gte: filters.minAmount }
    }

    if (filters.maxAmount) {
      query.total = { ...query.total, $lte: filters.maxAmount }
    }

    const bills = await Bill.find(query).sort({ createdAt: -1 })
    return bills
  } catch (err) {
    console.error('Error getting bills by date range:', err)
    throw err
  }
}

/**
 * Calculate bill statistics
 */
export const calculateBillStats = async (bills) => {
  const totalBills = bills.length
  const totalRevenue = bills.reduce((sum, bill) => sum + bill.total, 0)
  const totalTax = bills.reduce((sum, bill) => sum + bill.tax, 0)
  const totalDiscount = bills.reduce((sum, bill) => sum + bill.discount, 0)
  const averageBill = totalBills > 0 ? totalRevenue / totalBills : 0

  const paymentMethodBreakdown = {}
  bills.forEach((bill) => {
    if (!paymentMethodBreakdown[bill.paymentMethod]) {
      paymentMethodBreakdown[bill.paymentMethod] = { count: 0, total: 0 }
    }
    paymentMethodBreakdown[bill.paymentMethod].count += 1
    paymentMethodBreakdown[bill.paymentMethod].total += bill.total
  })

  return {
    totalBills,
    totalRevenue,
    totalTax,
    totalDiscount,
    averageBill,
    paymentMethodBreakdown,
  }
}

/**
 * Get popular products from bills
 */
export const getPopularProducts = async (userId, limit = 10) => {
  try {
    const bills = await Bill.find({ userId })

    const productCount = {}
    const productDetails = {}

    bills.forEach((bill) => {
      bill.items.forEach((item) => {
        const productId = item.productId
        if (!productCount[productId]) {
          productCount[productId] = {
            count: 0,
            revenue: 0,
          }
          productDetails[productId] = {
            name: item.productName,
            quantity: 0,
            totalSold: 0,
          }
        }
        productCount[productId].count += 1
        productCount[productId].revenue += item.totalPrice
        productDetails[productId].quantity += item.quantity
        productDetails[productId].totalSold += item.totalPrice
      })
    })

    const popular = Object.entries(productCount)
      .map(([productId, data]) => ({
        productId,
        ...data,
        ...productDetails[productId],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return popular
  } catch (err) {
    console.error('Error getting popular products:', err)
    throw err
  }
}

/**
 * Export bills to array format
 */
export const exportBills = async (bills) => {
  return bills.map((bill) => ({
    billNumber: bill.billNumber,
    date: bill.createdAt,
    customerName: bill.customerName,
    customerMobile: bill.customerMobile,
    total: bill.total,
    paymentMethod: bill.paymentMethod,
    paymentStatus: bill.paymentStatus,
    itemCount: bill.items.length,
  }))
}
