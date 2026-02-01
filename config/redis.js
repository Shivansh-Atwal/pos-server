import redis from 'redis'

// Initialize Redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
})

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err)
})

redisClient.on('connect', () => {
  console.log('✓ Redis Client Connected')
})

redisClient.on('ready', () => {
  console.log('✓ Redis Client Ready')
})

// Connect to Redis
await redisClient.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err)
  process.exit(1)
})

export default redisClient
