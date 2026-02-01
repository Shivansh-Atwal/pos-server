import redisClient from '../config/redis.js'

const SESSION_EXPIRY = 7 * 24 * 60 * 60 // 7 days in seconds

/**
 * Create a new session for a user
 */
export const createSession = async (userId, userData) => {
  try {
    const sessionId = `session:${userId}:${Date.now()}`
    const sessionData = {
      userId,
      username: userData.username,
      email: userData.email,
      shopName: userData.shopName,
      phone: userData.phone,
      shopAddress: userData.shopAddress,
      gstNumber: userData.gstNumber,
      role: userData.role || 'user',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    }

    // Store session in Redis with expiry
    await redisClient.setEx(
      sessionId,
      SESSION_EXPIRY,
      JSON.stringify(sessionData)
    )

    // Store user's current session reference
    await redisClient.setEx(
      `user:${userId}:session`,
      SESSION_EXPIRY,
      sessionId
    )

    console.log(`✓ Session created: ${sessionId}`)
    return {
      sessionId,
      ...sessionData,
    }
  } catch (err) {
    console.error('Error creating session:', err)
    throw err
  }
}

/**
 * Get session data by session ID
 */
export const getSession = async (sessionId) => {
  try {
    const sessionData = await redisClient.get(sessionId)
    if (!sessionData) {
      return null
    }
    return JSON.parse(sessionData)
  } catch (err) {
    console.error('Error getting session:', err)
    return null
  }
}

/**
 * Get user's current active session
 */
export const getUserSession = async (userId) => {
  try {
    const sessionId = await redisClient.get(`user:${userId}:session`)
    if (!sessionId) {
      return null
    }
    return await getSession(sessionId)
  } catch (err) {
    console.error('Error getting user session:', err)
    return null
  }
}

/**
 * Update session activity timestamp
 */
export const updateSessionActivity = async (sessionId) => {
  try {
    const sessionData = await getSession(sessionId)
    if (!sessionData) {
      return null
    }

    sessionData.lastActive = new Date().toISOString()

    // Update session in Redis
    await redisClient.setEx(
      sessionId,
      SESSION_EXPIRY,
      JSON.stringify(sessionData)
    )

    return sessionData
  } catch (err) {
    console.error('Error updating session activity:', err)
    return null
  }
}

/**
 * Invalidate/destroy session
 */
export const destroySession = async (sessionId, userId) => {
  try {
    await redisClient.del(sessionId)
    await redisClient.del(`user:${userId}:session`)
    console.log(`✓ Session destroyed: ${sessionId}`)
    return true
  } catch (err) {
    console.error('Error destroying session:', err)
    return false
  }
}

/**
 * Store temporary data in session (for barcode scanning, cart, etc.)
 */
export const setSessionData = async (userId, key, value, ttl = 3600) => {
  try {
    const dataKey = `session:data:${userId}:${key}`
    await redisClient.setEx(dataKey, ttl, JSON.stringify(value))
    return true
  } catch (err) {
    console.error('Error setting session data:', err)
    return false
  }
}

/**
 * Get temporary data from session
 */
export const getSessionData = async (userId, key) => {
  try {
    const dataKey = `session:data:${userId}:${key}`
    const data = await redisClient.get(dataKey)
    if (!data) {
      return null
    }
    return JSON.parse(data)
  } catch (err) {
    console.error('Error getting session data:', err)
    return null
  }
}

/**
 * Clear temporary data from session
 */
export const clearSessionData = async (userId, key) => {
  try {
    const dataKey = `session:data:${userId}:${key}`
    await redisClient.del(dataKey)
    return true
  } catch (err) {
    console.error('Error clearing session data:', err)
    return false
  }
}

/**
 * Get all active sessions for a user (for multi-device support)
 */
export const getUserSessions = async (userId) => {
  try {
    const pattern = `session:${userId}:*`
    const keys = await redisClient.keys(pattern)

    const sessions = []
    for (const key of keys) {
      const sessionData = await redisClient.get(key)
      if (sessionData) {
        sessions.push({
          sessionId: key,
          ...JSON.parse(sessionData),
        })
      }
    }

    return sessions
  } catch (err) {
    console.error('Error getting user sessions:', err)
    return []
  }
}

/**
 * Clear all sessions for a user (logout from all devices)
 */
export const clearUserSessions = async (userId) => {
  try {
    const sessions = await getUserSessions(userId)
    for (const session of sessions) {
      await destroySession(session.sessionId, userId)
    }
    return true
  } catch (err) {
    console.error('Error clearing user sessions:', err)
    return false
  }
}

export default {
  createSession,
  getSession,
  getUserSession,
  updateSessionActivity,
  destroySession,
  setSessionData,
  getSessionData,
  clearSessionData,
  getUserSessions,
  clearUserSessions,
}
