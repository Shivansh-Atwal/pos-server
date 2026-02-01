import redisClient from '../config/redis.js'

const CACHE_EXPIRY = {
  PRODUCT: 60 * 60, // 1 hour
  INVENTORY: 30 * 60, // 30 minutes
  BARCODE: 24 * 60 * 60, // 24 hours
  USER: 60 * 60, // 1 hour
}

/**
 * Cache product data
 */
export const cacheProduct = async (productId, productData) => {
  try {
    const key = `product:${productId}`
    await redisClient.setEx(
      key,
      CACHE_EXPIRY.PRODUCT,
      JSON.stringify(productData)
    )
    return true
  } catch (err) {
    console.error('Error caching product:', err)
    return false
  }
}

/**
 * Get cached product
 */
export const getCachedProduct = async (productId) => {
  try {
    const key = `product:${productId}`
    const data = await redisClient.get(key)
    if (!data) {
      return null
    }
    return JSON.parse(data)
  } catch (err) {
    console.error('Error getting cached product:', err)
    return null
  }
}

/**
 * Cache product by barcode
 */
export const cacheProductByBarcode = async (barcode, productData) => {
  try {
    const key = `barcode:${barcode}`
    await redisClient.setEx(
      key,
      CACHE_EXPIRY.BARCODE,
      JSON.stringify(productData)
    )
    return true
  } catch (err) {
    console.error('Error caching product by barcode:', err)
    return false
  }
}

/**
 * Get cached product by barcode
 */
export const getCachedProductByBarcode = async (barcode) => {
  try {
    const key = `barcode:${barcode}`
    const data = await redisClient.get(key)
    if (!data) {
      return null
    }
    return JSON.parse(data)
  } catch (err) {
    console.error('Error getting cached product by barcode:', err)
    return null
  }
}

/**
 * Invalidate product cache
 */
export const invalidateProductCache = async (productId, barcode = null) => {
  try {
    await redisClient.del(`product:${productId}`)
    if (barcode) {
      await redisClient.del(`barcode:${barcode}`)
    }
    // Invalidate product list cache
    await redisClient.del('products:list')
    return true
  } catch (err) {
    console.error('Error invalidating product cache:', err)
    return false
  }
}

/**
 * Cache inventory data
 */
export const cacheInventory = async (inventoryId, inventoryData) => {
  try {
    const key = `inventory:${inventoryId}`
    await redisClient.setEx(
      key,
      CACHE_EXPIRY.INVENTORY,
      JSON.stringify(inventoryData)
    )
    return true
  } catch (err) {
    console.error('Error caching inventory:', err)
    return false
  }
}

/**
 * Get cached inventory
 */
export const getCachedInventory = async (inventoryId) => {
  try {
    const key = `inventory:${inventoryId}`
    const data = await redisClient.get(key)
    if (!data) {
      return null
    }
    return JSON.parse(data)
  } catch (err) {
    console.error('Error getting cached inventory:', err)
    return null
  }
}

/**
 * Invalidate inventory cache
 */
export const invalidateInventoryCache = async (inventoryId = null) => {
  try {
    if (inventoryId) {
      await redisClient.del(`inventory:${inventoryId}`)
    }
    // Invalidate inventory list cache
    await redisClient.del('inventory:list')
    return true
  } catch (err) {
    console.error('Error invalidating inventory cache:', err)
    return false
  }
}

/**
 * Cache user data
 */
export const cacheUser = async (userId, userData) => {
  try {
    const key = `user:${userId}`
    await redisClient.setEx(
      key,
      CACHE_EXPIRY.USER,
      JSON.stringify(userData)
    )
    return true
  } catch (err) {
    console.error('Error caching user:', err)
    return false
  }
}

/**
 * Get cached user
 */
export const getCachedUser = async (userId) => {
  try {
    const key = `user:${userId}`
    const data = await redisClient.get(key)
    if (!data) {
      return null
    }
    return JSON.parse(data)
  } catch (err) {
    console.error('Error getting cached user:', err)
    return null
  }
}

/**
 * Invalidate user cache
 */
export const invalidateUserCache = async (userId) => {
  try {
    await redisClient.del(`user:${userId}`)
    return true
  } catch (err) {
    console.error('Error invalidating user cache:', err)
    return false
  }
}

/**
 * Store cart data temporarily
 */
export const storeCart = async (userId, cartData, ttl = 3600) => {
  try {
    const key = `cart:${userId}`
    await redisClient.setEx(key, ttl, JSON.stringify(cartData))
    return true
  } catch (err) {
    console.error('Error storing cart:', err)
    return false
  }
}

/**
 * Get cart data
 */
export const getCart = async (userId) => {
  try {
    const key = `cart:${userId}`
    const data = await redisClient.get(key)
    if (!data) {
      return null
    }
    return JSON.parse(data)
  } catch (err) {
    console.error('Error getting cart:', err)
    return null
  }
}

/**
 * Clear cart
 */
export const clearCart = async (userId) => {
  try {
    const key = `cart:${userId}`
    await redisClient.del(key)
    return true
  } catch (err) {
    console.error('Error clearing cart:', err)
    return false
  }
}

export default {
  cacheProduct,
  getCachedProduct,
  cacheProductByBarcode,
  getCachedProductByBarcode,
  invalidateProductCache,
  cacheInventory,
  getCachedInventory,
  invalidateInventoryCache,
  cacheUser,
  getCachedUser,
  invalidateUserCache,
  storeCart,
  getCart,
  clearCart,
}
