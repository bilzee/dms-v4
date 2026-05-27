import { getRedisClient, isRedisEnabled } from './redis-client'

interface CacheEntry {
  value: string
  expiresAt: number | null
}

const memoryCache = new Map<string, CacheEntry>()

function cleanExpired(): void {
  const now = Date.now()
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt && entry.expiresAt < now) {
      memoryCache.delete(key)
    }
  }
}

export class CacheService {
  async get(key: string): Promise<string | null> {
    if (isRedisEnabled()) {
      const client = getRedisClient()!
      return client.get(`dms:${key}`)
    }

    cleanExpired()
    const entry = memoryCache.get(key)
    if (!entry) return null
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      memoryCache.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (isRedisEnabled()) {
      const client = getRedisClient()!
      if (ttlSeconds) {
        await client.set(`dms:${key}`, value, 'EX', ttlSeconds)
      } else {
        await client.set(`dms:${key}`, value)
      }
      return
    }

    memoryCache.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    })
  }

  async del(key: string): Promise<void> {
    if (isRedisEnabled()) {
      const client = getRedisClient()!
      await client.del(`dms:${key}`)
      return
    }

    memoryCache.delete(key)
  }

  async invalidate(pattern: string): Promise<void> {
    if (isRedisEnabled()) {
      const client = getRedisClient()!
      const keys = await client.keys(`dms:${pattern}`)
      if (keys.length > 0) {
        await client.del(...keys)
      }
      return
    }

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key)
      }
    }
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds)
  }

  async publish(channel: string, message: string): Promise<void> {
    if (isRedisEnabled()) {
      const client = getRedisClient()!
      await client.publish(`dms:${channel}`, message)
      return
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<(() => void) | null> {
    if (!isRedisEnabled()) return null

    const subscriber = new (await import('ioredis')).default(
      process.env.REDIS_URL || 'redis://localhost:6379'
    )
    const fullChannel = `dms:${channel}`

    subscriber.on('message', (ch, msg) => {
      if (ch === fullChannel) callback(msg)
    })
    await subscriber.subscribe(fullChannel)

    return async () => {
      await subscriber.unsubscribe(fullChannel)
      subscriber.disconnect()
    }
  }
}

export const cacheService = new CacheService()
