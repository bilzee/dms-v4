import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response';
import { computeOverallScore } from '@/lib/services/gamification.service';

const LeaderboardQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  region: z.string().optional(),
  timeframe: z.enum(['7d', '30d', '90d', '1y', 'all']).optional().default('30d'),
  sortBy: z.enum(['delivery_rate', 'commitment_value', 'consistency', 'overall']).optional().default('overall')
});

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles } = context;
    
    // RBAC: DONOR (own ranking), COORDINATOR, ADMIN can view leaderboard
    if (!roles.some(r => ['DONOR', 'COORDINATOR', 'ADMIN'].includes(r))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to view leaderboard' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = LeaderboardQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryParams.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: queryParams.error },
        { status: 400 }
      );
    }

    const { limit, region, timeframe, sortBy } = queryParams.data;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(2020); // Far back date
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Region filter: filter donors whose commitments target entities in a specific location
    // Derived from commitment -> entity -> location field

    // Fetch donors with comprehensive metrics data
    // Note: We don't require donors to have commitments in the date range at the top level.
    // Instead, we fetch all active donors and let the metrics calculation handle empty data.
    // This ensures new donors or donors with only responses still appear on the leaderboard.
    const donorsWithMetrics = await prisma.donor.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        organization: true,
        selfReportedDeliveryRate: true,
        verifiedDeliveryRate: true,
        leaderboardRank: true,
        createdAt: true,
        commitments: {
          where: {
            commitmentDate: {
              gte: startDate,
              lte: now
            },
            ...(region ? {
              entity: {
                location: { contains: region, mode: 'insensitive' as const }
              }
            } : {})
          },
          select: {
            id: true,
            status: true,
            totalCommittedQuantity: true,
            deliveredQuantity: true,
            verifiedDeliveredQuantity: true,
            totalValueEstimated: true,
            commitmentDate: true,
            lastUpdated: true,
            entity: {
              select: { location: true }
            }
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
            createdAt: true,
            assessment: {
              select: { createdAt: true }
            }
          }
        }
      }
    });

    // Calculate comprehensive metrics for each donor
    const leaderboardData = donorsWithMetrics.map(donor => {
      // Commitment metrics
      const totalCommitments = donor.commitments.length;
      const completedCommitments = donor.commitments.filter(c => c.status === 'COMPLETE').length;
      const partialCommitments = donor.commitments.filter(c => c.status === 'PARTIAL').length;
      const totalCommittedItems = donor.commitments.reduce((sum, c) => sum + c.totalCommittedQuantity, 0);
      const totalDeliveredItems = donor.commitments.reduce((sum, c) => sum + c.deliveredQuantity, 0);
      const totalVerifiedItems = donor.commitments.reduce((sum, c) => sum + c.verifiedDeliveredQuantity, 0);
      const totalCommitmentValue = donor.commitments.reduce((sum, c) => sum + (c.totalValueEstimated || 0), 0);

      // Delivery rate calculations
      const selfReportedDeliveryRate = totalCommittedItems > 0 ? (totalDeliveredItems / totalCommittedItems) * 100 : 0;
      const verifiedDeliveryRate = totalCommittedItems > 0 ? (totalVerifiedItems / totalCommittedItems) * 100 : 0;

      // Response metrics
      const totalResponses = donor.responses.length;
      const verifiedResponses = donor.responses.filter(r => 
        r.verificationStatus === 'VERIFIED' || r.verificationStatus === 'AUTO_VERIFIED'
      ).length;
      const responseVerificationRate = totalResponses > 0 ? (verifiedResponses / totalResponses) * 100 : 0;

      // Consistency metrics (activity frequency)
      const daysSinceFirstActivity = donor.commitments.length > 0 
        ? Math.max(1, Math.ceil((now.getTime() - new Date(donor.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
        : 1;
      const activityFrequency = (totalCommitments + totalResponses) / daysSinceFirstActivity;

      // Speed metrics (response time = response created - assessment created)
      const avgResponseTime = donor.responses.length > 0
        ? donor.responses.reduce((sum, r) => {
            const responseMs = new Date(r.createdAt).getTime();
            const assessmentMs = r.assessment ? new Date(r.assessment.createdAt).getTime() : responseMs;
            const responseHours = Math.max(0, (responseMs - assessmentMs) / (1000 * 60 * 60));
            return sum + Math.min(responseHours, 168);
          }, 0) / donor.responses.length
        : 24;

      const overallScore = computeOverallScore({
        verifiedDeliveryRate,
        totalCommitmentValue,
        activityFrequency,
        avgResponseTimeHours: avgResponseTime
      });

      // Keep normalized scores for backward compatibility with UI components
      const normalizedDeliveryScore = Math.min(100, verifiedDeliveryRate);
      const normalizedValueScore = Math.min(100, (totalCommitmentValue / 1000000) * 100);
      const normalizedConsistencyScore = Math.min(100, activityFrequency * 1000);
      const normalizedSpeedScore = Math.max(0, 100 - (avgResponseTime / 24) * 20);

      // Achievement badges
      const badges: string[] = [];
      if (verifiedDeliveryRate >= 95) badges.push('Reliable Delivery Gold');
      else if (verifiedDeliveryRate >= 85) badges.push('Reliable Delivery Silver');
      else if (verifiedDeliveryRate >= 70) badges.push('Reliable Delivery Bronze');

      if (completedCommitments >= 50) badges.push('High Volume Gold');
      else if (completedCommitments >= 25) badges.push('High Volume Silver');
      else if (completedCommitments >= 10) badges.push('High Volume Bronze');

      if (totalResponses > 0 && avgResponseTime <= 6) badges.push('Quick Response Gold');
      else if (totalResponses > 0 && avgResponseTime <= 12) badges.push('Quick Response Silver');
      else if (totalResponses > 0 && avgResponseTime <= 24) badges.push('Quick Response Bronze');

      const monthsActive = Math.ceil(daysSinceFirstActivity / 30);
      if (monthsActive >= 12) badges.push('Consistency Gold');
      else if (monthsActive >= 6) badges.push('Consistency Silver');
      else if (monthsActive >= 3) badges.push('Consistency Bronze');

      return {
        donorId: donor.id,
        donor: {
          id: donor.id,
          organizationName: donor.organization || donor.name,
          region: donor.commitments.length > 0
            ? donor.commitments[0].entity?.location || 'Unknown'
            : 'Unassigned'
        },
        metrics: {
          commitments: {
            total: totalCommitments,
            completed: completedCommitments,
            partial: partialCommitments,
            totalValue: totalCommitmentValue,
            totalItems: totalCommittedItems,
            deliveredItems: totalDeliveredItems,
            verifiedItems: totalVerifiedItems
          },
          deliveryRates: {
            selfReported: selfReportedDeliveryRate,
            verified: verifiedDeliveryRate
          },
          responses: {
            total: totalResponses,
            verified: verifiedResponses,
            verificationRate: responseVerificationRate
          },
          performance: {
            overallScore,
            deliveryScore: normalizedDeliveryScore,
            valueScore: normalizedValueScore,
            consistencyScore: normalizedConsistencyScore,
            speedScore: normalizedSpeedScore,
            activityFrequency,
            avgResponseTimeHours: avgResponseTime
          }
        },
        badges,
        lastActivityDate: donor.commitments.length > 0 
          ? donor.commitments.reduce((latest, c) => 
              new Date(c.lastUpdated) > new Date(latest) ? c.lastUpdated : latest, 
              donor.commitments[0].lastUpdated
            )
          : donor.createdAt
      };
    });

    // Sort based on selected criteria
    let sortedData = [...leaderboardData];
    switch (sortBy) {
      case 'delivery_rate':
        sortedData.sort((a, b) => b.metrics.deliveryRates.verified - a.metrics.deliveryRates.verified);
        break;
      case 'commitment_value':
        sortedData.sort((a, b) => b.metrics.commitments.totalValue - a.metrics.commitments.totalValue);
        break;
      case 'consistency':
        sortedData.sort((a, b) => b.metrics.performance.activityFrequency - a.metrics.performance.activityFrequency);
        break;
      case 'overall':
      default:
        sortedData.sort((a, b) => b.metrics.performance.overallScore - a.metrics.performance.overallScore);
        break;
    }

    // Add ranking and trend information with tie handling
    const sliced = sortedData.slice(0, limit);
    const getScore = (item: typeof sliced[number]) => {
      switch (sortBy) {
        case 'delivery_rate': return item.metrics.deliveryRates.verified;
        case 'commitment_value': return item.metrics.commitments.totalValue;
        case 'consistency': return item.metrics.performance.activityFrequency;
        default: return item.metrics.performance.overallScore;
      }
    };
    const rankings: (typeof sliced[number] & { rank: number; trend: 'up' | 'down' | 'stable'; previousRank: number })[] = [];
    for (let index = 0; index < sliced.length; index++) {
      const item = sliced[index];
      const currentRank = (index > 0 && getScore(item) === getScore(sliced[index - 1]))
        ? rankings[index - 1].rank
        : index + 1;
      const previousRank = item.donor.id ? 
        donorsWithMetrics.find(d => d.id === item.donor.id)?.leaderboardRank || currentRank 
        : currentRank;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (currentRank < previousRank) trend = 'up';
      else if (currentRank > previousRank) trend = 'down';

      rankings.push({
        rank: currentRank,
        ...item,
        trend,
        previousRank
      });
    }

    // Update leaderboard ranks in database (async, don't wait)
    rankings.forEach(async (item) => {
      try {
        await prisma.donor.update({
          where: { id: item.donorId },
          data: { 
            leaderboardRank: item.rank,
            selfReportedDeliveryRate: item.metrics.deliveryRates.selfReported,
            verifiedDeliveryRate: item.metrics.deliveryRates.verified
          }
        });
      } catch (error) {
        console.warn(`Failed to update rank for donor ${item.donorId}:`, error);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        rankings,
        metadata: {
          lastUpdated: new Date().toISOString(),
          totalParticipants: donorsWithMetrics.length,
          updateFrequency: '15 minutes',
          timeframe,
          region: region || 'All Regions',
          sortBy,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return handleApiError(error);
  }
});