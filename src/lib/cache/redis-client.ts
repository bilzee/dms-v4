import Redis from 'ioredis'

let redis: Redis | null = null

export function isRedisEnabled(): boolean {
  return process.env.REDIS_ENABLED === 'true'
}

export function getRedisClient(): Redis | null {
  if (!isRedisEnabled()) return null
  if (redis) return redis

  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) return null
      return Math.min(times * 200, 2000)
    },
    lazyConnect: true,
  })

  redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message)
  })

  return redis
}

export async function checkRedisHealth(): Promise<{ healthy: boolean; error?: string }> {
  const client = getRedisClient()
  if (!client) return { healthy: false, error: 'Redis not enabled' }

  try {
    const result = await client.ping()
    return { healthy: result === 'PONG' }
  } catch (error) {
    return { healthy: false, error: (error as Error).message }
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
