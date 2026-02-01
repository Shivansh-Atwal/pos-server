import express from 'express'
import Product from '../models/Product.js'
import * as cacheService from '../services/cacheService.js'

const router = express.Router()

/**
 * @route   GET /api/products
 * @desc    Get all products (with optional filtering)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query

    let query = { active: true }

    if (category) {
      query.category = category
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { sku: search },
        { barcode: search },
      ]
    }

    const products = await Product.find(query).limit(100)

    res.json({
      success: true,
      count: products.length,
      data: products,
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

/**
 * @route   GET /api/products/barcode/:barcode
 * @desc    Get product by barcode
 * @access  Public
 */
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params

    // Check cache first
    const cachedProduct = await cacheService.getCachedProductByBarcode(barcode)
    if (cachedProduct) {
      return res.json({
        success: true,
        data: cachedProduct,
        cached: true,
      })
    }

    const product = await Product.findOne({
      barcode: barcode,
      active: true,
    })

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found by barcode',
      })
    }

    // Cache the product
    await cacheService.cacheProductByBarcode(barcode, product)

    res.json({
      success: true,
      data: product,
    })
  } catch (error) {
    console.error('Error fetching product by barcode:', error)
    res.status(500).json({ error: 'Failed to fetch product by barcode' })
  }
})

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    res.json({
      success: true,
      data: product,
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    res.status(500).json({ error: 'Failed to fetch product' })
  }
})

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private (Admin only)
 */
router.post('/', async (req, res) => {
  try {
    const { name, price, category, brand, description, sku, barcode } = req.body

    if (!name || !price || !category) {
      return res
        .status(400)
        .json({ error: 'Name, price, and category are required' })
    }

    // Check if barcode already exists
    if (barcode) {
      const existingProduct = await Product.findOne({ barcode })
      if (existingProduct) {
        return res
          .status(409)
          .json({ error: 'Product with this barcode already exists' })
      }
    }

    const product = new Product({
      name,
      price,
      category,
      brand,
      description,
      sku,
      barcode,
    })

    await product.save()

    res.status(201).json({
      success: true,
      data: product,
    })
  } catch (error) {
    console.error('Error creating product:', error)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0]
      return res.status(409).json({ error: `${field} must be unique` })
    }
    res.status(500).json({ error: 'Failed to create product' })
  }
})

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Admin only)
 */
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    res.json({
      success: true,
      data: product,
    })
  } catch (error) {
    console.error('Error updating product:', error)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product
 * @access  Private (Admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    )

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: product,
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

export default router
