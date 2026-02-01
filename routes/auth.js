import express from 'express'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'
import * as sessionService from '../services/sessionService.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' })
  }
}

// Signup Route
router.post(
  '/signup',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('shopName').trim().notEmpty().withMessage('Shop name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { username, email, password, shopName, phone } = req.body

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
      })

      if (existingUser) {
        return res.status(400).json({
          error: 'User with this username or email already exists',
        })
      }

      // Create new user
      const newUser = new User({
        username,
        email,
        password,
        shopName,
        phone,
        active: true,
      })

      await newUser.save()

      // Create Redis session
      const sessionId = await sessionService.createSession(newUser._id.toString(), {
        username: newUser.username,
        email: newUser.email,
        shopName: newUser.shopName,
        phone: newUser.phone || '',
        shopAddress: newUser.shopAddress || '',
        gstNumber: newUser.gstNumber || '',
        role: newUser.role || 'user',
      })

      // Generate JWT token
      const token = jwt.sign(
        {
          id: newUser._id,
          username: newUser.username,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      res.status(201).json({
        message: 'User created successfully',
        token,
        sessionId,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          shopName: newUser.shopName,
        },
      })
    } catch (error) {
      console.error('Signup error:', error)
      res.status(500).json({ error: 'Server error during signup' })
    }
  }
)

// Login Route
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { username, password } = req.body

      // Find user
      const user = await User.findOne({ username })

      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' })
      }

      // Compare password
      const isPasswordMatch = await user.comparePassword(password)

      if (!isPasswordMatch) {
        return res.status(401).json({ error: 'Invalid username or password' })
      }

      if (!user.active) {
        return res.status(401).json({ error: 'User account is inactive' })
      }

      // Update last login
      user.lastLogin = new Date()
      await user.save()

      // Create Redis session
      const sessionId = await sessionService.createSession(user._id.toString(), {
        username: user.username,
        email: user.email,
        shopName: user.shopName,
        phone: user.phone,
        shopAddress: user.shopAddress || '',
        gstNumber: user.gstNumber || '',
        role: user.role || 'user',
      })

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      res.json({
        message: 'Login successful',
        token,
        sessionId,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          shopName: user.shopName,
          role: user.role,
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({ error: 'Server error during login' })
    }
  }
)

// Get current user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        shopName: user.shopName,
        phone: user.phone,
        shopAddress: user.shopAddress,
        gstNumber: user.gstNumber,
        shopEmail: user.shopEmail,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    res.status(500).json({ error: 'Server error fetching profile' })
  }
})

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { shopName, shopAddress, phone, gstNumber, shopEmail } = req.body

    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update fields
    if (shopName) user.shopName = shopName
    if (shopAddress) user.shopAddress = shopAddress
    if (phone) user.phone = phone
    if (gstNumber) user.gstNumber = gstNumber
    if (shopEmail) user.shopEmail = shopEmail

    await user.save()

    // Update Redis session
    const sessionId = req.body.sessionId
    if (sessionId) {
      await sessionService.destroySession(sessionId, req.user.id)
      const newSessionId = await sessionService.createSession(user._id.toString(), {
        username: user.username,
        email: user.email,
        shopName: user.shopName,
        phone: user.phone,
        shopAddress: user.shopAddress,
        gstNumber: user.gstNumber,
        shopEmail: user.shopEmail,
        role: user.role,
      })
      return res.json({
        message: 'Profile updated successfully',
        sessionId: newSessionId,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          shopName: user.shopName,
          phone: user.phone,
          shopAddress: user.shopAddress,
          gstNumber: user.gstNumber,
          shopEmail: user.shopEmail,
          role: user.role,
        },
      })
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        shopName: user.shopName,
        phone: user.phone,
        shopAddress: user.shopAddress,
        gstNumber: user.gstNumber,
        shopEmail: user.shopEmail,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ error: 'Server error updating profile' })
  }
})

// Logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    // Destroy Redis session if available
    const sessionId = req.body.sessionId
    if (sessionId) {
      await sessionService.destroySession(sessionId, req.user.id)
    }
    
    res.json({ message: 'Logout successful' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Server error during logout' })
  }
})

export default router
