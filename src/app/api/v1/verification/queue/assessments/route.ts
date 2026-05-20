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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status')?.split(',') || ['SUBMITTED'];
    const entityId = searchParams.get('entityId');
    const assessmentType = searchParams.get('assessmentType')?.split(',');
    const priority = searchParams.get('priority')?.split(',');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'rapidAssessmentDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const assessorId = searchParams.get('assessorId');
    const search = searchParams.get('search');

    // Build where clause for verification queue with enhanced filtering
    const whereClause: any = {
      verificationStatus: { in: status },
    };

    if (entityId) {
      whereClause.entityId = entityId;
    }

    if (assessmentType) {
      whereClause.rapidAssessmentType = { in: assessmentType };
    }

    if (priority) {
      whereClause.priority = { in: priority };
    }

    if (dateFrom || dateTo) {
      whereClause.rapidAssessmentDate = {};
      if (dateFrom) {
        whereClause.rapidAssessmentDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.rapidAssessmentDate.lte = new Date(dateTo);
      }
    }

    if (assessorId) {
      whereClause.assessorId = assessorId;
    }

    if (search) {
      whereClause.OR = [
        { assessorName: { contains: search, mode: 'insensitive' } },
        { entity: { name: { contains: search, mode: 'insensitive' } } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build order by clause
    const orderBy: any[] = [];
    orderBy.push({ [sortBy]: sortOrder });
    
    // Add secondary sort by priority for stable ordering
    if (sortBy !== 'priority') {
      orderBy.push({ priority: 'desc' });
    }

    // Get total count for pagination
    const total = await prisma.rapidAssessment.count({
      where: whereClause
    });

    // Get paginated verification queue with enhanced includes
    const assessments = await prisma.rapidAssessment.findMany({
      where: whereClause,
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            autoApproveEnabled: true
          }
        },
        assessor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: orderBy,
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    // Calculate queue depth indicators
    const queueDepth = {
      total: total,
      critical: await prisma.rapidAssessment.count({
        where: { 
          verificationStatus: { in: status as any },
          priority: 'CRITICAL',
          ...(entityId && { entityId }),
          ...(assessmentType && { rapidAssessmentType: { in: assessmentType } })
        } as any
      }),
      high: await prisma.rapidAssessment.count({
        where: { 
          verificationStatus: { in: status as any },
          priority: 'HIGH',
          ...(entityId && { entityId }),
          ...(assessmentType && { rapidAssessmentType: { in: assessmentType } })
        } as any
      }),
      medium: await prisma.rapidAssessment.count({
        where: { 
          verificationStatus: { in: status as any },
          priority: 'MEDIUM',
          ...(entityId && { entityId }),
          ...(assessmentType && { rapidAssessmentType: { in: assessmentType } })
        } as any
      }),
      low: await prisma.rapidAssessment.count({
        where: { 
          verificationStatus: { in: status as any },
          priority: 'LOW',
          ...(entityId && { entityId }),
          ...(assessmentType && { rapidAssessmentType: { in: assessmentType } })
        } as any
      })
    };

    // Get queue metrics
    const metrics = {
      averageWaitTime: await calculateAverageWaitTime(whereClause),
      verificationRate: await calculateVerificationRate(),
      oldestPending: await getOldestPendingAssessment(whereClause)
    };

    return NextResponse.json({
      success: true,
      data: assessments,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      queueDepth,
      metrics,
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0',
        requestId: crypto.randomUUID(),
        realTimeUpdate: true,
        nextUpdateIn: 30000 // 30 seconds
      }
    });

  } catch (error) {
    console.error('Verification queue API error:', error);
    return handleApiError(error);
  }
});

// Helper functions for metrics calculation
async function calculateAverageWaitTime(whereClause: any): Promise<number> {
  try {
    const pendingAssessments = await prisma.rapidAssessment.findMany({
      where: {
        ...whereClause,
        verificationStatus: { in: ['SUBMITTED', 'DRAFT'] }
      },
      select: {
        createdAt: true
      }
    });

    if (pendingAssessments.length === 0) return 0;

    const totalWaitTime = pendingAssessments.reduce((total, assessment) => {
      const waitMinutes = (Date.now() - assessment.createdAt.getTime()) / (1000 * 60);
      return total + waitMinutes;
    }, 0);

    return Math.round(totalWaitTime / pendingAssessments.length);
  } catch (error) {
    console.error('Error calculating average wait time:', error);
    return 0;
  }
}

async function calculateVerificationRate(): Promise<number> {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [submitted, verified] = await Promise.all([
      prisma.rapidAssessment.count({
        where: {
          createdAt: { gte: last24Hours }
        } as any
      }),
      prisma.rapidAssessment.count({
        where: {
          createdAt: { gte: last24Hours },
          verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] }
        }
      })
    ]);

    if (submitted === 0) return 0;
    return verified / submitted;
  } catch (error) {
    console.error('Error calculating verification rate:', error);
    return 0;
  }
}

async function getOldestPendingAssessment(whereClause: any): Promise<string | null> {
  try {
    const oldest = await prisma.rapidAssessment.findFirst({
      where: {
        ...whereClause,
        verificationStatus: { in: ['SUBMITTED', 'DRAFT'] }
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        createdAt: true
      }
    });

    return oldest ? oldest.createdAt.toISOString() : null;
  } catch (error) {
    console.error('Error getting oldest pending assessment:', error);
    return null;
  }
}