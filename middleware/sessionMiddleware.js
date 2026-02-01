import * as sessionService from '../services/sessionService.js'

/**
 * Session validation middleware
 * Checks if sessionId is valid and updates last activity time
 */
export const validateSession = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.body?.sessionId
    
    if (sessionId) {
      // Check if session exists and is valid
      const session = await sessionService.getSession(sessionId)
      
      if (session) {
        // Update last activity
        await sessionService.updateSessionActivity(sessionId)
        
        // Attach session data to request
        req.session = session
        req.sessionId = sessionId
      }
    }
    
    next()
  } catch (error) {
    console.error('Session validation error:', error)
    next()
  }
}

/**
 * Optional session check middleware
 * Allows requests with or without session
 */
export const optionalSession = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.body?.sessionId
    
    if (sessionId) {
      const session = await sessionService.getSession(sessionId)
      if (session) {
        await sessionService.updateSessionActivity(sessionId)
        req.session = session
        req.sessionId = sessionId
      }
    }
    
    next()
  } catch (error) {
    console.error('Optional session check error:', error)
    next()
  }
}

/**
 * Required session middleware
 * Returns 401 if no valid session found
 */
export const requireSession = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.body?.sessionId
    
    if (!sessionId) {
      return res.status(401).json({
        error: 'No session provided',
        code: 'NO_SESSION',
      })
    }
    
    const session = await sessionService.getSession(sessionId)
    
    if (!session) {
      return res.status(401).json({
        error: 'Invalid or expired session',
        code: 'INVALID_SESSION',
      })
    }
    
    // Update last activity
    await sessionService.updateSessionActivity(sessionId)
    
    // Attach session data to request
    req.session = session
    req.sessionId = sessionId
    
    next()
  } catch (error) {
    console.error('Session check error:', error)
    res.status(500).json({
      error: 'Session validation failed',
      code: 'SESSION_ERROR',
    })
  }
}

export default {
  validateSession,
  optionalSession,
  requireSession,
}
