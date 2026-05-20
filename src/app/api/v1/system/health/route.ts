import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, handleApiError } from '@/lib/api/response'
import { prisma } from '@/lib/db/client'

let cachedHealth: any = null
let cacheTimestamp = 0
const CACHE_TTL = 30000

export const GET = withAuth(async (request: NextRequest, context) => {
  const now = Date.now()
  if (cachedHealth && (now - cacheTimestamp) < CACHE_TTL) {
    return successResponse(cachedHealth)
  }

  try {
    const dbStart = performance.now()
    await prisma.$queryRaw`SELECT 1`
    const dbResponseTime = Math.round(performance.now() - dbStart)

    const databaseSync = dbResponseTime < 1000 ? 'Healthy' : dbResponseTime < 3000 ? 'Degraded' : 'Down'

    const activeUsersCount = await prisma.user.count({
      where: {
        isActive: true,
        lastLogin: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    const apiResponseTime = dbResponseTime

    const healthData = {
      databaseSync,
      apiResponseTime,
      activeUsers: activeUsersCount,
      storageUsage: 0,
      lastBackup: 'Not configured'
    }

    cachedHealth = healthData
    cacheTimestamp = now

    return successResponse(healthData)
  } catch (error) {
    console.error('Health check error:', error)
    return successResponse({
      databaseSync: 'Down',
      apiResponseTime: 0,
      activeUsers: 0,
      storageUsage: 0,
      lastBackup: 'Unknown'
    })
  }
})
