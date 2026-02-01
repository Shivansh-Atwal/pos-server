import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

// Load environment variables
dotenv.config()

// Import Redis and session services
import redisClient from './config/redis.js'
import { validateSession } from './middleware/sessionMiddleware.js'

// Import routes
import productsRouter from './routes/products.js'
import billsRouter from './routes/bills.js'
import inventoryRouter from './routes/inventory.js'
import authRouter from './routes/auth.js'
import customersRouter from './routes/customers.js'

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Session validation middleware - optional for all routes
app.use(validateSession)

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    redis: 'connected',
  })
})

// API Routes
app.use('/api/auth', authRouter)
app.use('/api/products', productsRouter)
app.use('/api/bills', billsRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/customers', customersRouter)

// Basic route
app.get('/api', (req, res) => {
  res.json({
    message: 'SmartBill POS Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      bills: '/api/bills',
      inventory: '/api/inventory',
    },
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbill-pos'

    await mongoose.connect(mongoURI)

    console.log('✓ MongoDB connected successfully')
  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message)
    // Continue running even without DB for demo
  }
}

// Start Server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB()

    // Start listening
    app.listen(PORT, () => {
      console.log(`\n🚀 SmartBill POS Backend Server`)
      console.log(`📍 Running on http://localhost:${PORT}`)
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`💾 Redis: Connected`)
      console.log(`📚 API Documentation:`)
      console.log(`   - Health: GET http://localhost:${PORT}/health`)
      console.log(`   - API: GET http://localhost:${PORT}/api`)
      console.log(`   - Products: GET http://localhost:${PORT}/api/products`)
      console.log(`   - Bills: GET http://localhost:${PORT}/api/bills`)
      console.log(`   - Inventory: GET http://localhost:${PORT}/api/inventory`)
      console.log(`\n💡 Tip: Frontend runs on http://localhost:5173\n`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nGraceful shutdown initiated...')
  await redisClient.quit()
  await mongoose.connection.close()
  process.exit(0)
})

// Start the server
startServer()

export default app
