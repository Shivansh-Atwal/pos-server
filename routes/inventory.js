import express from 'express'
import Inventory from '../models/Inventory.js'
import Product from '../models/Product.js'
import * as cacheService from '../services/cacheService.js'

const router = express.Router()

/**
 * ======================================
 * GET ALL INVENTORY (Redis fallback supported)
 * ======================================
 */
router.get('/', async (req, res) => {
  try {

    const { warehouse, status, search } = req.query

    const useCache = !warehouse && !status && !search

    // STEP 1: Try Redis fir
    if (useCache) {

      const cachedInventory =
        await cacheService.getCachedInventoryList()

      if (
        cachedInventory &&
        Array.isArray(cachedInventory) &&
        cachedInventory.length > 0
      ) {

        console.log('✓ Inventory served from Redis')

        return res.json({
          success: true,
          count: cachedInventory.length,
          data: cachedInventory,
          cached: true,
        })
      }

      console.log('⚠ Redis empty, fetching from MongoDB')
    }

    // STEP 2: Fetch from MongoDB

    let query = {}

    if (warehouse)
      query.warehouse = warehouse

    if (status)
      query.status = status

    if (search) {

      const products = await Product.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { barcode: search },
        ],
      })

      const productIds = products.map(p => p._id)

      query.$or = [
        { productId: { $in: productIds } },
        { barcode: search },
      ]
    }


    const inventory =
      await Inventory.find(query)
        .populate('productId')
        .sort({ warehouse: 1, location: 1 })

    console.log(`✓ Inventory fetched from MongoDB (count: ${inventory.length})`)    

    // STEP 3: Save to Redis if not empty

    if (useCache && inventory.length > 0) {

      await cacheService.cacheInventoryList(inventory)

      console.log('✓ Inventory cached in Redis')
    }

    // STEP 4: Return result

    res.json({
      success: true,
      count: inventory.length,
      data: inventory,
      cached: false,
    })


  } catch (error) {

    console.error('Inventory fetch error:', error)

    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory',
    })
  }
})

// ADD INVENTORY

router.post('/', async (req, res) => {
  try {

    const {
      productId,
      barcode,
      quantity,
      minStock,
      location,
      warehouse
    } = req.body

    if (quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Quantity is required',
      })
    }

    let inventory = null

    if (barcode)
      inventory = await Inventory.findOne({ barcode })

    else if (productId)
      inventory = await Inventory.findOne({ productId })


    if (inventory) {

      inventory.quantity += quantity

      if (minStock !== undefined)
        inventory.minStock = minStock

      if (location)
        inventory.location = location

      if (warehouse)
        inventory.warehouse = warehouse

      inventory.lastRestocked = new Date()

    } else {

      inventory = new Inventory({
        productId,
        barcode,
        quantity,
        minStock: minStock || 10,
        location: location || 'Main Store',
        warehouse: warehouse || 'Default',
      })
    }


    // Update status
    if (inventory.quantity === 0)
      inventory.status = 'Out of Stock'

    else if (inventory.quantity <= inventory.minStock)
      inventory.status = 'Low Stock'

    else
      inventory.status = 'In Stock'


    await inventory.save()

    // Update product stock
    if (productId) {
      await Product.findByIdAndUpdate(
        productId,
        { stock: inventory.quantity }
      )
    }

    await cacheService.clearInventoryCache()

    res.status(201).json({
      success: true,
      data: inventory,
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      success: false,
      error: 'Failed to add inventory',
    })
  }
})



/**
 * ======================================
 * UPDATE INVENTORY
 * ======================================
 */
router.put('/:id', async (req, res) => {
  try {

    const inventory = await Inventory.findById(req.params.id)

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory not found',
      })
    }

    const {
      quantity,
      minStock,
      location,
      warehouse
    } = req.body


    if (quantity !== undefined)
      inventory.quantity = quantity

    if (minStock !== undefined)
      inventory.minStock = minStock

    if (location)
      inventory.location = location

    if (warehouse)
      inventory.warehouse = warehouse


    inventory.lastRestocked = new Date()


    // Update status
    if (inventory.quantity === 0)
      inventory.status = 'Out of Stock'

    else if (inventory.quantity <= inventory.minStock)
      inventory.status = 'Low Stock'

    else
      inventory.status = 'In Stock'


    await inventory.save()


    // Update product stock
    if (inventory.productId) {
      await Product.findByIdAndUpdate(
        inventory.productId,
        { stock: inventory.quantity }
      )
    }

    await cacheService.clearInventoryCache()

    res.json({
      success: true,
      data: inventory,
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      success: false,
      error: 'Failed to update inventory',
    })
  }
})



/**
 * ======================================
 * DELETE SINGLE INVENTORY
 * ======================================
 */
router.delete('/:id', async (req, res) => {
  try {

    const inventory = await Inventory.findById(req.params.id)

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory not found',
      })
    }

    if (inventory.productId) {
      await Product.findByIdAndUpdate(
        inventory.productId,
        { stock: 0 }
      )
    }

    await Inventory.findByIdAndDelete(req.params.id)

    await cacheService.clearInventoryCache()

    res.json({
      success: true,
      message: 'Inventory deleted successfully',
      deletedId: req.params.id,
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      success: false,
      error: 'Failed to delete inventory',
    })
  }
})



/**
 * ======================================
 * DELETE ALL INVENTORY
 * ======================================
 */
router.delete('/', async (req, res) => {
  try {

    const result = await Inventory.deleteMany({})

    await Product.updateMany({}, { stock: 0 })

    await cacheService.clearInventoryCache()

    res.json({
      success: true,
      deletedCount: result.deletedCount,
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      success: false,
      error: 'Failed to delete all inventory',
    })
  }
})



/**
 * ======================================
 * DELETE INVENTORY OLDER THAN X DAYS
 * ======================================
 */
router.delete('/older-than/:days', async (req, res) => {
  try {

    const days = parseInt(req.params.days)

    const cutoffDate = new Date()

    cutoffDate.setDate(cutoffDate.getDate() - days)

    const result = await Inventory.deleteMany({
      createdAt: { $lt: cutoffDate },
    })

    await cacheService.clearInventoryCache()

    res.json({
      success: true,
      deletedCount: result.deletedCount,
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      success: false,
      error: 'Failed to delete old inventory',
    })
  }
})



/**
 * ======================================
 * DELETE INVENTORY BY WAREHOUSE
 * ======================================
 */
router.delete('/warehouse/:warehouse', async (req, res) => {
  try {

    const result = await Inventory.deleteMany({
      warehouse: req.params.warehouse,
    })

    await cacheService.clearInventoryCache()

    res.json({
      success: true,
      deletedCount: result.deletedCount,
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      success: false,
      error: 'Failed to delete warehouse inventory',
    })
  }
})

export default router
