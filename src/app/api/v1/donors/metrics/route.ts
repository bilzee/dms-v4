import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response';
import { computeOverallScore } from '@/lib/services/gamification.service';
import { getScoringConfig } from '@/lib/services/scoring-config.service';

// Helper function to safely convert BigInt to Number
const safeJsonParse = (data: any): any => {
  if (typeof data === 'bigint') {
    return Number(data);
  }
  if (Array.isArray(data)) {
    return data.map(safeJsonParse);
  }
  if (data && typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = safeJsonParse(value);
    }
    return result;
  }
  return data;
};

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles } = context;
    
    // Check if user has coordinator or donor role
    if (!roles.includes('COORDINATOR') && !roles.includes('DONOR') && !roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator or Donor role required.' },
        { status: 403 }
      );
    }

    const scoringConfig = await getScoringConfig();

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';
    const donorId = searchParams.get('donorId');

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get donor metrics
    const [
      donorStats,
      topDonors,
      donorTrends,
      responseVerificationStats
    ] = await Promise.all([
      // Overall donor statistics
      prisma.donor.aggregate({
        _count: {
          id: true
        }
      }),

      // Top donors by commitments
      prisma.donor.findMany({
        take: 10,
        select: {
          id: true,
          name: true,
          contactEmail: true,
          _count: {
            select: {
              commitments: true
            }
          }
        },
        orderBy: {
          commitments: {
            _count: 'desc'
          }
        }
      }).then(donors => donors.map(donor => ({
        ...donor,
        id: String(donor.id), // Convert BigInt to string
        _count: {
          commitments: Number(donor._count.commitments)
        }
      }))),

      // Donor trends over time
      (prisma.$queryRaw`
        SELECT 
          DATE(d."createdAt") as date,
          COUNT(*) as newDonors
        FROM donors d
        WHERE d."createdAt" >= ${startDate}
        GROUP BY DATE(d."createdAt")
        ORDER BY date DESC
        LIMIT 30
      ` as Promise<Array<{
        date: string;
        newDonors: number;
      }>>),

      // Response verification statistics by donor
      prisma.rapidResponse.groupBy({
        by: ['donorId'],
        where: {
          createdAt: {
            gte: startDate,
            lte: now
          },
          donorId: {
            not: null
          }
        },
        _count: {
          id: true
        }
      }).then(results => results.map(item => ({
        donorId: String(item.donorId), // Convert BigInt to string
        _count: {
          id: Number(item._count.id)
        }
      })))
    ]);

    // Get detailed donor metrics with response verification data
    const donorsWithVerificationData = await prisma.donor.findMany({
      select: {
        id: true,
        name: true,
        contactEmail: true,
        createdAt: true,
        commitments: {
          select: {
            id: true,
            totalCommittedQuantity: true,
            deliveredQuantity: true,
            verifiedDeliveredQuantity: true,
            totalValueEstimated: true,
            status: true
          }
        },
        responses: {
          where: {
            createdAt: {
              gte: startDate,
              lte: now
            }
          },
          select: {
            id: true,
            verificationStatus: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      ...(donorId && { where: { id: donorId } })
    });

    // Calculate verification metrics for each donor
    const donorMetrics = donorsWithVerificationData.map(donor => {
      const totalResponses = Number(donor.responses.length);
      const verifiedResponses = Number(donor.responses.filter(r => 
        r.verificationStatus === 'VERIFIED' || r.verificationStatus === 'AUTO_VERIFIED'
      ).length);
      const rejectedResponses = Number(donor.responses.filter(r => 
        r.verificationStatus === 'REJECTED'
      ).length);
      const pendingResponses = Number(donor.responses.filter(r => 
        r.verificationStatus === 'SUBMITTED'
      ).length);

      const totalCommitments = Number(donor.commitments.length);
      const availableCommitments = Number(donor.commitments.filter(c => 
        c.status === 'PLANNED'
      ).length);
      const totalCommittedItems = Number(donor.commitments.reduce((sum, c) => 
        sum + Number(c.totalCommittedQuantity || 0), 0
      ));
      const totalDeliveredItems = Number(donor.commitments.reduce((sum, c) => 
        sum + Number((c as any).deliveredQuantity || 0), 0
      ));
      const totalVerifiedItems = Number(donor.commitments.reduce((sum, c) => 
        sum + Number((c as any).verifiedDeliveredQuantity || 0), 0
      ));
      const totalCommitmentValue = Number(donor.commitments.reduce((sum, c) => 
        sum + Number((c as any).totalValueEstimated || 0), 0
      ));

      const verificationRate = totalResponses > 0 ? verifiedResponses / totalResponses : 0;
      const commitmentFulfillmentRate = totalCommitments > 0 ? (totalCommitments - availableCommitments) / totalCommitments : 0;

      return {
        donorId: String(donor.id), // Convert BigInt to string
        donorName: donor.name,
        donorEmail: donor.contactEmail,
        donorSince: new Date(donor.createdAt),
        metrics: {
          commitments: {
            total: totalCommitments,
            available: availableCommitments,
            fulfilled: Number(totalCommitments - availableCommitments),
            totalItems: totalCommittedItems,
            fulfillmentRate: commitmentFulfillmentRate,
            totalValue: totalCommitmentValue,
            deliveredItems: totalDeliveredItems,
            verifiedItems: totalVerifiedItems
          },
          responses: {
            total: totalResponses,
            verified: verifiedResponses,
            rejected: rejectedResponses,
            pending: pendingResponses,
            autoVerified: Number(donor.responses.filter(r => r.verificationStatus === 'AUTO_VERIFIED').length),
            verificationRate: verificationRate
          },
          combined: {
            totalActivities: Number(totalCommitments + totalResponses),
            verifiedActivities: Number((totalCommitments - availableCommitments) + verifiedResponses),
            overallSuccessRate: totalCommitments + totalResponses > 0 
              ? Number(((totalCommitments - availableCommitments) + verifiedResponses) / (totalCommitments + totalResponses))
              : 0
          }
        }
      };
    });

    // Calculate overall statistics - convert BigInt to Number
    const overallStats = {
      totalDonors: Number(donorStats._count.id),
      totalCommitments: donorMetrics.reduce((sum, d) => sum + Number(d.metrics.commitments.total || 0), 0),
      totalResponses: donorMetrics.reduce((sum, d) => sum + Number(d.metrics.responses.total || 0), 0),
      averageVerificationRate: donorMetrics.length > 0 
        ? donorMetrics.reduce((sum, d) => sum + d.metrics.responses.verificationRate, 0) / donorMetrics.length
        : 0,
      totalVerifiedResponses: donorMetrics.reduce((sum, d) => sum + Number(d.metrics.responses.verified || 0), 0),
      topPerformers: (() => {
        const scored = donorMetrics.map(d => {
          const verifiedDeliveryRate = d.metrics.commitments.totalItems > 0
            ? (d.metrics.commitments.verifiedItems / d.metrics.commitments.totalItems) * 100
            : 0;
          const daysSinceCreated = Math.max(1, Math.ceil((now.getTime() - new Date(d.donorSince).getTime()) / (1000 * 60 * 60 * 24)));
          const activityFrequency = (d.metrics.commitments.total + d.metrics.responses.total) / daysSinceCreated;
          const overallScore = computeOverallScore({
            verifiedDeliveryRate,
            totalCommitmentValue: d.metrics.commitments.totalValue,
            activityFrequency,
            avgResponseTimeHours: 24
          }, scoringConfig);
          return { ...d, overallScore };
        });
        scored.sort((a, b) => b.overallScore - a.overallScore);
        const ranked: (typeof scored[number] & { rank: number })[] = [];
        for (let i = 0; i < scored.length; i++) {
          const rank = (i > 0 && scored[i].overallScore === scored[i - 1].overallScore)
            ? ranked[i - 1].rank
            : i + 1;
          ranked.push({ ...scored[i], rank });
        }
        return ranked.slice(0, 5).map(d => ({
          donorName: d.donorName,
          successRate: Number(d.overallScore.toFixed(1)),
          verifiedActivities: Number(d.metrics.combined.verifiedActivities),
          totalActivities: Number(d.metrics.combined.totalActivities),
          responseVerificationRate: Number(d.metrics.responses.verificationRate * 100),
          totalCommitments: Number(d.metrics.commitments.total)
        }));
      })()
    };

    // Create JSON-safe response to prevent BigInt serialization
    const responseData = {
      success: true,
      data: {
        overall: overallStats,
        donors: donorMetrics,
        trends: donorTrends,
        topDonors: topDonors,
        responseVerificationStats: responseVerificationStats.reduce((acc, item) => {
          acc[item.donorId || 'unknown'] = Number(item._count.id);
          return acc;
        }, {} as Record<string, number>)
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID(),
        dateRange,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        totalDonors: donorMetrics.length
      }
    };

    // Use JSON.parse(JSON.stringify()) to convert any remaining BigInt values
    const safeResponse = JSON.parse(JSON.stringify(responseData, (key, value) => 
      typeof value === 'bigint' ? Number(value) : value
    ));

    return NextResponse.json(safeResponse);

  } catch (error) {
    console.error('Donor metrics error:', error);
    
    // Handle BigInt serialization errors
    if (error instanceof Error && error.message.includes('BigInt')) {
      return new NextResponse(JSON.stringify({ 
        success: false, 
        error: 'Data serialization error - please try again' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return handleApiError(error);
  }
});