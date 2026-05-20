import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { v4 as uuidv4 } from 'uuid';
import { handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { userId, roles } = context;
    
    // Check if user has coordinator role
    if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Coordinator or Admin role required' },
        { status: 403 }
      );
    }

    // Get current date for time-based queries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch active rapid responses (incidents with active status)
    const activeResponses = await prisma.incident.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'CONTAINED']
        }
      },
      include: {
        _count: {
          select: {
            rapidAssessments: true
          }
        }
      }
    });

    const criticalResponses = activeResponses.filter(incident => 
      incident.severity === 'CRITICAL'
    ).length;

    // Fetch responders data (users with RESPONDER role who are active)
    const responders = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'RESPONDER'
            }
          }
        },
        isActive: true
      },
      include: {
        responses: {
          where: {
            createdAt: {
              gte: weekAgo
            }
          }
        }
      }
    });

    const deployedResponders = responders.filter(responder => 
      responder.responses.length > 0
    ).length;
    const standbyResponders = responders.length - deployedResponders;

    // Fetch pending verifications
    const [pendingAssessments, pendingDeliveries] = await Promise.all([
      prisma.rapidAssessment.count({
        where: {
          verificationStatus: 'SUBMITTED'
        }
      }),
      prisma.rapidResponse.count({
        where: {
          verificationStatus: 'SUBMITTED'
        }
      })
    ]);

    const totalPendingVerifications = pendingAssessments + pendingDeliveries;

    // Count critical priority pending verifications
    const [criticalAssessments, criticalDeliveries] = await Promise.all([
      prisma.rapidAssessment.count({
        where: {
          verificationStatus: 'SUBMITTED',
          priority: 'CRITICAL'
        }
      }),
      prisma.rapidResponse.count({
        where: {
          verificationStatus: 'SUBMITTED',
          priority: 'CRITICAL'
        }
      })
    ]);

    const criticalPendingVerifications = criticalAssessments + criticalDeliveries;

    // Fetch completed items today
    const [completedAssessmentsToday, completedResponsesToday] = await Promise.all([
      prisma.rapidAssessment.count({
        where: {
          verificationStatus: 'VERIFIED',
          verifiedAt: {
            gte: todayStart
          }
        }
      }),
      prisma.rapidResponse.count({
        where: {
          verificationStatus: 'VERIFIED',
          verifiedAt: {
            gte: todayStart
          }
        }
      })
    ]);

    const completedToday = completedAssessmentsToday + completedResponsesToday;

    // Calculate target achievement (assuming target of 10-15 items per day)
    const dailyTarget = 12;
    const targetAchievement = Math.min((completedToday / dailyTarget) * 100, 100);

    // Prepare stats object
    const stats = {
      activeResponses: {
        total: activeResponses.length,
        critical: criticalResponses,
        description: `${criticalResponses} critical priority`
      },
      responders: {
        total: responders.length,
        deployed: deployedResponders,
        standby: standbyResponders,
        description: `${deployedResponders} in field, ${standbyResponders} on standby`
      },
      pendingVerification: {
        total: totalPendingVerifications,
        critical: criticalPendingVerifications,
        assessments: pendingAssessments,
        deliveries: pendingDeliveries,
        description: `${criticalPendingVerifications} critical priority`
      },
      completedToday: {
        total: completedToday,
        assessments: completedAssessmentsToday,
        responses: completedResponsesToday,
        targetAchievement: Math.round(targetAchievement),
        description: `${Math.round(targetAchievement)}% target achieved`
      },
      lastUpdated: now.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: stats,
      meta: {
        timestamp: now.toISOString(),
        version: '1.0.0',
        requestId: uuidv4(),
        generatedFor: userId
      }
    });

  } catch (error) {
    console.error('Coordinator dashboard stats error:', error);
    return handleApiError(error);
  }
});