import { createClient } from 'redis'

let redisClient

if (process.env.REDIS_URL) {
  // ✅ Production (Render / Cloud Redis)
  redisClient = createClient({
    url: process.env.REDIS_URL,
  })
} else {
  // ✅ Local Redis
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
    },
  })
}

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err.message)
})

redisClient.on('connect', () => {
  console.log('✓ Redis Client Connected')
})

redisClient.on('ready', () => {
  console.log('✓ Redis Client Ready')
})

if (process.env.REDIS_ENABLED === 'true') {
  try {
    console.log(
      'Redis Mode:',
      process.env.REDIS_URL ? 'CLOUD' : 'LOCAL'
    )
    await redisClient.connect()
  } catch (err) {
    console.error('Failed to connect to Redis:', err.message)
  }
}

export default redisClient
