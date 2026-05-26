import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, handleApiError } from '@/lib/api/response'
import { prisma } from '@/lib/db/client'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

let cachedHealth: any = null
let cacheTimestamp = 0
const CACHE_TTL = 30000

const startTime = Date.now()

function getUptimeString(): string {
  const days = Math.floor((Date.now() - startTime) / (1000 * 60 * 60 * 24))
  return days > 0 ? `${days} days` : '< 1 day'
}

async function getLastBackupTime(): Promise<string> {
  try {
    const manifestPath = path.join(process.cwd(), '.backups', 'manifest.json')
    if (!existsSync(manifestPath)) return 'Never'
    const data = JSON.parse(await readFile(manifestPath, 'utf-8'))
    const successfulBackups = data.filter((e: any) => e.status === 'success')
    if (successfulBackups.length === 0) return 'Never'
    const latest = successfulBackups[0]
    const backupDate = new Date(latest.timestamp)
    const now = new Date()
    const diffMs = now.getTime() - backupDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  } catch {
    return 'Unknown'
  }
}

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
    const totalUsers = await prisma.user.count()
    const storageUsage = totalUsers > 0 ? Math.min(100, Math.round((activeUsersCount / totalUsers) * 100)) : 0
    const lastBackup = await getLastBackupTime()

    const services = [
      { name: 'Web Server', status: 'Running', uptime: getUptimeString() },
      { name: 'Database', status: databaseSync, uptime: databaseSync === 'Down' ? 'N/A' : getUptimeString() },
      { name: 'Authentication', status: 'Running', uptime: getUptimeString() },
      { name: 'File Storage', status: 'Running', uptime: getUptimeString() }
    ]

    const healthData = {
      databaseSync,
      apiResponseTime,
      activeUsers: activeUsersCount,
      storageUsage,
      lastBackup,
      services
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
      lastBackup: 'Unknown',
      services: [
        { name: 'Web Server', status: 'Running', uptime: getUptimeString() },
        { name: 'Database', status: 'Down', uptime: 'N/A' },
        { name: 'Authentication', status: 'Degraded', uptime: getUptimeString() },
        { name: 'File Storage', status: 'Degraded', uptime: getUptimeString() }
      ]
    })
  }
})
