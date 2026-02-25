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

// ======================
// Middleware
// ======================
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
)

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Session validation middleware
app.use(validateSession)

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// ======================
// Health check route
// ======================
app.get('/health', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    redis: redisClient.isOpen ? 'connected' : 'disconnected',
    mongodb:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

// ======================
// API Routes
// ======================
app.use('/api/auth', authRouter)
app.use('/api/products', productsRouter)
app.use('/api/bills', billsRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/customers', customersRouter)

// Basic API info route
app.get('/api', (req, res) => {
  res.json({
    message: 'SmartBill POS Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      bills: '/api/bills',
      inventory: '/api/inventory',
      customers: '/api/customers',
      health: '/health',
    },
  })
})

// ======================
// 404 handler
// ======================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  })
})

// ======================
// Error handler
// ======================
app.use((err, req, res, next) => {
  console.error('Error:', err)

  res.status(500).json({
    error: 'Internal server error',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong',
  })
})

// ======================
// MongoDB Connection
// ======================
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartbill-pos'

    await mongoose.connect(mongoURI)

    console.log('✓ MongoDB connected successfully')
  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message)
  }
}

// ======================
// Redis Connection
// ======================
const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect()
      console.log('✓ Redis connected successfully')
    }
  } catch (error) {
    console.error('✗ Redis connection error:', error.message)
  }
}

// ======================
// Start Server
// ======================
const startServer = async () => {
  try {
    console.log('\nStarting SmartBill POS Backend...\n')

    // Connect databases
    await connectDB()
    await connectRedis()

    // Start Express server
    app.listen(PORT, () => {
      console.log('====================================')
      console.log('🚀 SmartBill POS Backend Server')
      console.log('====================================')
      console.log(`📍 URL: http://localhost:${PORT}`)
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(
        `💾 MongoDB: ${
          mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
        }`
      )
      console.log(
        `📦 Redis: ${redisClient.isOpen ? 'Connected' : 'Disconnected'}`
      )
      console.log('')
      console.log('📚 Available Routes:')
      console.log(`   Health:     GET http://localhost:${PORT}/health`)
      console.log(`   API Info:   GET http://localhost:${PORT}/api`)
      console.log(`   Auth:       http://localhost:${PORT}/api/auth`)
      console.log(`   Products:   http://localhost:${PORT}/api/products`)
      console.log(`   Bills:      http://localhost:${PORT}/api/bills`)
      console.log(`   Inventory:  http://localhost:${PORT}/api/inventory`)
      console.log(`   Customers:  http://localhost:${PORT}/api/customers`)
      console.log('')
      console.log('💡 Frontend: http://localhost:5173')
      console.log('====================================\n')
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// ======================
// Graceful Shutdown
// ======================
const shutdown = async () => {
  console.log('\nGraceful shutdown initiated...')

  try {
    if (redisClient.isOpen) {
      await redisClient.quit()
      console.log('✓ Redis disconnected')
    }

    await mongoose.connection.close()
    console.log('✓ MongoDB disconnected')

    console.log('✓ Server shutdown complete')
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// ======================
// Start Application
// ======================
startServer()

export default app
