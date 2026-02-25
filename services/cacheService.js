import redisClient from '../config/redis.js'

const CACHE_EXPIRY = {
  PRODUCT: 60 * 60,        // 1 hour
  INVENTORY: 30 * 60,      // 30 minutes
  BARCODE: 24 * 60 * 60,   // 24 hours
  USER: 60 * 60,           // 1 hour
}


/**
 * =====================================
 * PRODUCT CACHE
 * =====================================
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


export const getCachedProduct = async (productId) => {
  try {

    const key = `product:${productId}`

    const data = await redisClient.get(key)

    if (!data) return null

    return JSON.parse(data)

  } catch (err) {

    console.error('Error getting cached product:', err)

    return null
  }
}


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


export const getCachedProductByBarcode = async (barcode) => {
  try {

    const key = `barcode:${barcode}`

    const data = await redisClient.get(key)

    if (!data) return null

    return JSON.parse(data)

  } catch (err) {

    console.error('Error getting cached product by barcode:', err)

    return null
  }
}


export const invalidateProductCache = async (productId, barcode = null) => {
  try {

    await redisClient.del(`product:${productId}`)

    if (barcode)
      await redisClient.del(`barcode:${barcode}`)

    await redisClient.del('products:list')

    return true

  } catch (err) {

    console.error('Error invalidating product cache:', err)

    return false
  }
}



/**
 * =====================================
 * INVENTORY CACHE
 * =====================================
 */

export const cacheInventoryList = async (inventoryList) => {
  try {

    if (!redisClient.isOpen) return false

    await redisClient.setEx(
      'inventory:list',
      CACHE_EXPIRY.INVENTORY,
      JSON.stringify(inventoryList)
    )

    return true

  } catch (err) {

    console.error('Error caching inventory list:', err)

    return false
  }
}


export const getCachedInventoryList = async () => {
  try {

    if (!redisClient.isOpen) return null

    const data = await redisClient.get('inventory:list')

    if (!data) return null

    return JSON.parse(data)

  } catch (err) {

    console.error('Error getting cached inventory list:', err)

    return null
  }
}


/**
 * Invalidate specific inventory cache or list cache
 */
export const invalidateInventoryCache = async (inventoryId = null) => {
  try {

    if (inventoryId)
      await redisClient.del(`inventory:${inventoryId}`)

    await redisClient.del('inventory:list')

    return true

  } catch (err) {

    console.error('Error invalidating inventory cache:', err)

    return false
  }
}


/**
 * Clear ALL inventory cache (used when deleting or bulk updating inventory)
 */
export const clearInventoryCache = async () => {
  try {

    // delete inventory list cache
    await redisClient.del('inventory:list')

    // delete all inventory item caches
    const keys = await redisClient.keys('inventory:*')

    if (keys.length > 0) {
      await redisClient.del(keys)
    }

    console.log('✓ Inventory cache cleared')

    return true

  } catch (err) {

    console.error('Error clearing inventory cache:', err)

    return false
  }
}



/**
 * =====================================
 * USER CACHE
 * =====================================
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


export const getCachedUser = async (userId) => {
  try {

    const key = `user:${userId}`

    const data = await redisClient.get(key)

    if (!data) return null

    return JSON.parse(data)

  } catch (err) {

    console.error('Error getting cached user:', err)

    return null
  }
}


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
 * =====================================
 * CART CACHE
 * =====================================
 */

export const storeCart = async (userId, cartData, ttl = 3600) => {
  try {

    const key = `cart:${userId}`

    await redisClient.setEx(
      key,
      ttl,
      JSON.stringify(cartData)
    )

    return true

  } catch (err) {

    console.error('Error storing cart:', err)

    return false
  }
}


export const getCart = async (userId) => {
  try {

    const key = `cart:${userId}`

    const data = await redisClient.get(key)

    if (!data) return null

    return JSON.parse(data)

  } catch (err) {

    console.error('Error getting cart:', err)

    return null
  }
}


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

  cacheInventoryList,
  getCachedInventoryList,
  invalidateInventoryCache,
  clearInventoryCache,   // ✅ added fix

  cacheUser,
  getCachedUser,
  invalidateUserCache,

  storeCart,
  getCart,
  clearCart,
}
