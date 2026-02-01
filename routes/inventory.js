import express from 'express'
import Inventory from '../models/Inventory.js'
import Product from '../models/Product.js'
import * as cacheService from '../services/cacheService.js'

const router = express.Router()

/**
 * @route   GET /api/inventory
 * @desc    Get all inventory with optional filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { warehouse, status, search } = req.query

    // Check cache if no filters applied
    if (!warehouse && !status && !search) {
      const cachedInventory = await cacheService.getCachedInventory()
      if (cachedInventory) {
        return res.json({
          success: true,
          count: cachedInventory.length,
          data: cachedInventory,
          cached: true,
        })
      }
    }

    let query = {}

    if (warehouse) {
      query.warehouse = warehouse
    }

    if (status) {
      query.status = status
    }

    if (search) {
      // Search by product name or barcode
      const products = await Product.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { barcode: search },
        ],
      })
      const productIds = products.map(p => p._id)
      query.$or = [{ productId: { $in: productIds } }, { barcode: search }]
    }

    const inventory = await Inventory.find(query)
      .populate('productId')
      .sort({ warehouse: 1, location: 1 })

    // Cache full inventory if no filters
    if (!warehouse && !status && !search) {
      await cacheService.cacheInventory(inventory)
    }

    res.json({
      success: true,
      count: inventory.length,
      data: inventory,
    })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    res.status(500).json({ error: 'Failed to fetch inventory' })
  }
})

/**
 * @route   GET /api/inventory/low-stock
 * @desc    Get products with low stock
 * @access  Public
 */
router.get('/low-stock', async (req, res) => {
  try {
    const lowStock = await Inventory.find().populate('productId')

    const filtered = lowStock.filter(
      (item) => item.quantity <= item.minStock
    )

    res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    })
  } catch (error) {
    console.error('Error fetching low stock items:', error)
    res.status(500).json({ error: 'Failed to fetch low stock items' })
  }
})

/**
 * @route   GET /api/inventory/barcode/:barcode
 * @desc    Get inventory by barcode
 * @access  Public
 */
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params

    const inventory = await Inventory.findOne({
      barcode: barcode,
    }).populate('productId')

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found by barcode',
      })
    }

    res.json({
      success: true,
      data: inventory,
    })
  } catch (error) {
    console.error('Error fetching inventory by barcode:', error)
    res.status(500).json({ error: 'Failed to fetch inventory by barcode' })
  }
})

/**
 * @route   POST /api/inventory
 * @desc    Add inventory for product
 * @access  Private (Admin only)
 */
router.post('/', async (req, res) => {
  try {
    const { productId, barcode, quantity, minStock, location, warehouse } = req.body

    if (!quantity) {
      return res.status(400).json({ error: 'Quantity is required' })
    }

    // Check if product exists
    let product = null
    if (productId) {
      product = await Product.findById(productId)
      if (!product) {
        return res.status(404).json({ error: 'Product not found' })
      }
    }

    // Check if inventory already exists by barcode
    let inventory = null
    if (barcode) {
      inventory = await Inventory.findOne({ barcode })
    } else if (productId) {
      inventory = await Inventory.findOne({ productId })
    }

    if (inventory) {
      // Update existing inventory
      inventory.quantity += quantity
      inventory.minStock = minStock || inventory.minStock
      inventory.location = location || inventory.location
      inventory.warehouse = warehouse || inventory.warehouse
      inventory.lastRestocked = new Date()
    } else {
      // Create new inventory
      if (!productId && !barcode) {
        return res.status(400).json({
          error: 'Either productId or barcode is required for new inventory',
        })
      }

      inventory = new Inventory({
        productId,
        barcode,
        quantity,
        minStock: minStock || 10,
        location: location || 'Main Store',
        warehouse: warehouse || 'Default',
      })
    }

    // Update status based on quantity
    if (inventory.quantity === 0) {
      inventory.status = 'Out of Stock'
    } else if (inventory.quantity <= inventory.minStock) {
      inventory.status = 'Low Stock'
    } else {
      inventory.status = 'In Stock'
    }

    // Update product stock if product exists
    if (product) {
      product.stock = inventory.quantity
      product.barcode = barcode || product.barcode
      await product.save()
    }

    await inventory.save()

    res.status(201).json({
      success: true,
      data: inventory,
    })
  } catch (error) {
    console.error('Error adding inventory:', error)
    res.status(500).json({ error: 'Failed to add inventory' })
  }
})

/**
 * @route   POST /api/inventory/register-barcode
 * @desc    Register new product with barcode and add to inventory
 * @access  Public
 */
router.post('/register-barcode', async (req, res) => {
  try {
    const {
      barcode,
      name,
      price,
      category,
      brand,
      quantity,
      location,
      warehouse,
    } = req.body

    if (!barcode || !name || !price || !category) {
      return res.status(400).json({
        error: 'Barcode, name, price, and category are required',
      })
    }

    // Check if barcode already exists
    let product = await Product.findOne({ barcode })
    if (!product) {
      // Create new product
      product = new Product({
        barcode,
        name,
        price,
        category,
        brand: brand || '',
        stock: quantity || 0,
      })
      await product.save()
    }

    // Check if inventory exists
    let inventory = await Inventory.findOne({ barcode })
    if (inventory) {
      // Update existing inventory
      inventory.quantity += quantity || 0
      inventory.location = location || inventory.location
      inventory.warehouse = warehouse || inventory.warehouse
      inventory.lastRestocked = new Date()
    } else {
      // Create new inventory
      inventory = new Inventory({
        productId: product._id,
        barcode,
        quantity: quantity || 0,
        minStock: 10,
        location: location || 'Main Store',
        warehouse: warehouse || 'Default',
      })
    }

    // Update status
    if (inventory.quantity === 0) {
      inventory.status = 'Out of Stock'
    } else if (inventory.quantity <= inventory.minStock) {
      inventory.status = 'Low Stock'
    } else {
      inventory.status = 'In Stock'
    }

    await inventory.save()

    // Update product stock
    product.stock = inventory.quantity
    await product.save()

    res.status(201).json({
      success: true,
      message: 'Product and inventory registered successfully',
      data: {
        product,
        inventory,
      },
    })
  } catch (error) {
    console.error('Error registering barcode:', error)
    res.status(500).json({ error: 'Failed to register barcode' })
  }
})

/**
 * @route   PUT /api/inventory/:id
 * @desc    Update inventory
 * @access  Private (Admin only)
 */
router.put('/:id', async (req, res) => {
  try {
    const { quantity, minStock, location, warehouse, notes } = req.body

    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      {
        quantity,
        minStock,
        location,
        warehouse,
        notes,
        lastRestocked: new Date(),
      },
      { new: true }
    ).populate('productId')

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' })
    }

    // Update status
    if (inventory.quantity === 0) {
      inventory.status = 'Out of Stock'
    } else if (inventory.quantity <= inventory.minStock) {
      inventory.status = 'Low Stock'
    } else {
      inventory.status = 'In Stock'
    }

    await inventory.save()

    // Update product stock
    const product = await Product.findById(inventory.productId)
    if (product) {
      product.stock = quantity
      await product.save()
    }

    res.json({
      success: true,
      data: inventory,
    })
  } catch (error) {
    console.error('Error updating inventory:', error)
    res.status(500).json({ error: 'Failed to update inventory' })
  }
})

/**
 * @route   PUT /api/inventory/:id/adjust-quantity
 * @desc    Adjust inventory quantity (add/remove)
 * @access  Public
 */
router.put('/:id/adjust-quantity', async (req, res) => {
  try {
    const { quantity } = req.body

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity adjustment is required' })
    }

    const inventory = await Inventory.findById(req.params.id).populate('productId')

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' })
    }

    inventory.quantity += quantity
    inventory.lastRestocked = new Date()

    // Update status
    if (inventory.quantity === 0) {
      inventory.status = 'Out of Stock'
    } else if (inventory.quantity <= inventory.minStock) {
      inventory.status = 'Low Stock'
    } else {
      inventory.status = 'In Stock'
    }

    await inventory.save()

    // Update product stock
    const product = await Product.findById(inventory.productId)
    if (product) {
      product.stock = inventory.quantity
      await product.save()
    }

    res.json({
      success: true,
      data: inventory,
    })
  } catch (error) {
    console.error('Error adjusting inventory:', error)
    res.status(500).json({ error: 'Failed to adjust inventory' })
  }
})

/**
 * @route   POST /api/inventory/deduct-bill
 * @desc    Deduct inventory for all items in a completed bill
 * @access  Public
 */
router.post('/deduct-bill', async (req, res) => {
  try {
    const { billItems } = req.body

    if (!billItems || !Array.isArray(billItems) || billItems.length === 0) {
      return res.status(400).json({
        error: 'billItems array is required',
      })
    }

    const deductedItems = []
    const errors = []

    // Process each item in the bill
    for (const item of billItems) {
      try {
        const { barcode, id, quantity } = item

        // Find inventory by barcode or productId
        let inventory = null
        if (barcode) {
          inventory = await Inventory.findOne({ barcode })
        } else if (id) {
          inventory = await Inventory.findOne({ productId: id })
        }

        if (!inventory) {
          errors.push({
            product: item.name || barcode || id,
            error: 'Inventory item not found',
          })
          continue
        }

        // Check if sufficient quantity exists
        if (inventory.quantity < quantity) {
          errors.push({
            product: item.name || barcode || id,
            error: `Insufficient quantity. Available: ${inventory.quantity}, Required: ${quantity}`,
          })
          continue
        }

        // Deduct quantity
        inventory.quantity -= quantity

        // Update status based on new quantity
        if (inventory.quantity === 0) {
          inventory.status = 'Out of Stock'
        } else if (inventory.quantity <= inventory.minStock) {
          inventory.status = 'Low Stock'
        } else {
          inventory.status = 'In Stock'
        }

        // Update lastRestocked
        inventory.lastRestocked = new Date()

        await inventory.save()

        // Also update product stock
        const product = await Product.findById(inventory.productId)
        if (product) {
          product.stock = inventory.quantity
          await product.save()
        }

        deductedItems.push({
          barcode: inventory.barcode,
          name: item.name,
          quantity: quantity,
          remainingQuantity: inventory.quantity,
          status: inventory.status,
        })
      } catch (itemError) {
        console.error('Error deducting item:', itemError)
        errors.push({
          product: item.name || item.barcode || item.id,
          error: itemError.message,
        })
      }
    }

    res.json({
      success: true,
      message: 'Inventory deducted for bill completion',
      deductedItems,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error deducting bill inventory:', error)
    res.status(500).json({ error: 'Failed to deduct inventory for bill' })
  }
})

export default router
