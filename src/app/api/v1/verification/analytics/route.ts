import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

function getTimeRangeFilter(timeRange: string): Date {
  const now = new Date()
  switch (timeRange) {
    case '1h': return new Date(now.getTime() - 60 * 60 * 1000)
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    default: return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }
}

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    const since = getTimeRangeFilter(timeRange)

    const hoursInRRange = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720

    const totalProcessed = await prisma.rapidAssessment.count({
      where: {
        verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED', 'REJECTED'] },
        createdAt: { gte: since }
      }
    })

    const totalDeliveriesProcessed = await prisma.rapidResponse.count({
      where: {
        createdAt: { gte: since }
      }
    })

    const throughput = hoursInRRange > 0 ? Math.round((totalProcessed + totalDeliveriesProcessed) / hoursInRRange * 10) / 10 : 0

    const pendingCount = await prisma.rapidAssessment.count({
      where: { verificationStatus: 'SUBMITTED' }
    })

    const verifiedCount = await prisma.rapidAssessment.count({
      where: {
        verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
        createdAt: { gte: since }
      }
    })

    const verificationRate = totalProcessed > 0 ? verifiedCount / totalProcessed : 0

    const bucketCount = Math.min(hoursInRRange, 24)
    const bucketSizeMs = (Date.now() - since.getTime()) / bucketCount

    const timeSeries = []
    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = new Date(since.getTime() + i * bucketSizeMs)
      const bucketEnd = new Date(since.getTime() + (i + 1) * bucketSizeMs)

      const [assessments, deliveries, verified] = await Promise.all([
        prisma.rapidAssessment.count({
          where: { createdAt: { gte: bucketStart, lt: bucketEnd } }
        }),
        prisma.rapidResponse.count({
          where: { createdAt: { gte: bucketStart, lt: bucketEnd } }
        }),
        prisma.rapidAssessment.count({
          where: {
            verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
            createdAt: { gte: bucketStart, lt: bucketEnd }
          }
        })
      ])

      timeSeries.push({
        time: i === bucketCount - 1 ? 'Now' : `-${bucketCount - 1 - i}${timeRange === '1h' ? 'm' : 'h'}`,
        assessments,
        deliveries,
        verified
      })
    }

    const systemLoad = pendingCount > 50 ? 'High' : pendingCount > 20 ? 'Moderate' : 'Low'

    const analyticsData = {
      totalProcessed,
      throughput,
      verificationRate,
      systemLoad,
      timeSeries
    }

    return NextResponse.json({
      data: analyticsData,
      meta: { timestamp: new Date().toISOString(), version: '1.0.0', requestId: uuidv4() }
    })
  } catch (error) {
    console.error('Verification analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
