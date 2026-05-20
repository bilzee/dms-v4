import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request, context) => {
  try {
    const { roles } = context;
    
    // Check if user has coordinator role
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }

    // Get current date range (today)
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Get verification metrics
    const [
      totalPending,
      totalVerified,
      totalRejected,
      totalAutoVerified,
      pendingByType,
      verificationTimes
    ] = await Promise.all([
      // Count pending assessments
      prisma.rapidAssessment.count({
        where: { verificationStatus: 'SUBMITTED' }
      }),

      // Count verified today
      prisma.rapidAssessment.count({
        where: {
          verificationStatus: 'VERIFIED',
          verifiedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),

      // Count rejected today
      prisma.rapidAssessment.count({
        where: {
          verificationStatus: 'REJECTED',
          verifiedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),

      // Count auto-verified today
      prisma.rapidAssessment.count({
        where: {
          verificationStatus: 'AUTO_VERIFIED',
          verifiedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),

      // Pending by assessment type
      prisma.rapidAssessment.groupBy({
        by: ['rapidAssessmentType'],
        where: { verificationStatus: 'SUBMITTED' },
        _count: true
      }),

      // Get verification times for average calculation
      prisma.rapidAssessment.findMany({
        where: {
          verificationStatus: { in: ['VERIFIED', 'REJECTED'] },
          verifiedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        select: {
          createdAt: true,
          verifiedAt: true
        }
      })
    ]);

    // Calculate average processing time (in seconds)
    let averageProcessingTime = 0;
    if (verificationTimes.length > 0) {
      const totalTime = verificationTimes.reduce((sum: any, item: any) => {
        if (item.verifiedAt) {
          const diff = item.verifiedAt.getTime() - item.createdAt.getTime();
          return sum + (diff / 1000); // Convert to seconds
        }
        return sum;
      }, 0);
      averageProcessingTime = totalTime / verificationTimes.length;
    }

    // Calculate rates
    const totalProcessed = totalVerified + totalRejected + totalAutoVerified;
    const verificationRate = totalProcessed > 0 ? (totalVerified + totalAutoVerified) / totalProcessed : 0;
    const rejectionRate = totalProcessed > 0 ? totalRejected / totalProcessed : 0;

    // Format pending by type
    const pendingByTypeMap: Record<string, number> = {};
    pendingByType.forEach((item: any) => {
      pendingByTypeMap[item.rapidAssessmentType] = item._count;
    });

    const metrics = {
      totalPending,
      totalVerified,
      totalRejected,
      totalAutoVerified,
      averageProcessingTime,
      pendingByType: pendingByTypeMap,
      verificationRate,
      rejectionRate
    };

    return NextResponse.json({
      success: true,
      data: metrics,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID(),
        dateRange: {
          start: startOfDay.toISOString(),
          end: endOfDay.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Verification metrics API error:', error);
    return handleApiError(error);
  }
});