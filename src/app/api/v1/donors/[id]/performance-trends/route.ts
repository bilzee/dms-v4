import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/db/client';
import { z } from 'zod';

const PerformanceTrendsQuerySchema = z.object({
  timeframe: z.enum(['3m', '6m', '1y', '2y']).optional().default('1y'),
  granularity: z.enum(['week', 'month', 'quarter']).optional().default('month')
});

export const GET = withAuth(async (request: NextRequest, context, { params }) => {
  try {
    const { roles } = context;

    // RBAC: DONOR (own), COORDINATOR, ADMIN can view performance trends
    if (!roles.some(r => ['DONOR', 'COORDINATOR', 'ADMIN'].includes(r))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to view performance trends' },
        { status: 403 }
      );
    }

    const donorId = params?.id as string;
    
    if (!donorId) {
      return NextResponse.json(
        { success: false, error: 'Donor ID is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = PerformanceTrendsQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryParams.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: queryParams.error },
        { status: 400 }
      );
    }

    const { timeframe, granularity } = queryParams.data;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '3m':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case '2y':
        startDate.setFullYear(now.getFullYear() - 2);
        break;
      default:
        startDate.setFullYear(now.getFullYear() - 1);
    }

    // Verify donor exists and user has permission
    const donor = await db.donor.findUnique({
      where: { id: donorId },
      select: {
        id: true,
        name: true,
        organization: true,
        createdAt: true
      }
    });

    if (!donor) {
      return NextResponse.json(
        { success: false, error: 'Donor not found' },
        { status: 404 }
      );
    }

    // Get historical commitments and responses for trend calculation
    const [commitments, responses] = await Promise.all([
      db.donorCommitment.findMany({
        where: {
          donorId,
          commitmentDate: {
            gte: startDate,
            lte: now
          }
        },
        select: {
          id: true,
          status: true,
          totalCommittedQuantity: true,
          deliveredQuantity: true,
          verifiedDeliveredQuantity: true,
          totalValueEstimated: true,
          commitmentDate: true,
          lastUpdated: true
        },
        orderBy: {
          commitmentDate: 'asc'
        }
      }),
      db.rapidResponse.findMany({
        where: {
          donorId,
          createdAt: {
            gte: startDate,
            lte: now
          }
        },
        select: {
          id: true,
          verificationStatus: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
    ]);

    // Generate time periods based on granularity
    const periods: string[] = [];
    const current = new Date(startDate);
    
    while (current <= now) {
      let periodKey: string;
      
      switch (granularity) {
        case 'week':
          // ISO week format: YYYY-W##
          const week = Math.ceil(((current.getTime() - new Date(current.getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000) + 1) / 7);
          periodKey = `${current.getFullYear()}-W${week.toString().padStart(2, '0')}`;
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          periodKey = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
          current.setMonth(current.getMonth() + 1);
          break;
        case 'quarter':
          const quarter = Math.ceil((current.getMonth() + 1) / 3);
          periodKey = `${current.getFullYear()}-Q${quarter}`;
          current.setMonth(current.getMonth() + 3);
          break;
        default:
          periodKey = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
          current.setMonth(current.getMonth() + 1);
      }
      
      periods.push(periodKey);
    }

    // Calculate metrics for each period
    const trends = periods.map(period => {
      // Parse period to get date range
      let periodStart: Date, periodEnd: Date;
      
      if (period.includes('-W')) {
        // Week format
        const [year, weekStr] = period.split('-W');
        const week = parseInt(weekStr);
        periodStart = new Date(parseInt(year), 0, 1 + (week - 1) * 7);
        periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (period.includes('-Q')) {
        // Quarter format
        const [year, quarterStr] = period.split('-Q');
        const quarter = parseInt(quarterStr);
        periodStart = new Date(parseInt(year), (quarter - 1) * 3, 1);
        periodEnd = new Date(parseInt(year), quarter * 3, 0);
      } else {
        // Month format
        const [year, month] = period.split('-');
        periodStart = new Date(parseInt(year), parseInt(month) - 1, 1);
        periodEnd = new Date(parseInt(year), parseInt(month), 0);
      }

      // Filter data for this period
      const periodCommitments = commitments.filter(c => {
        const date = new Date(c.commitmentDate);
        return date >= periodStart && date <= periodEnd;
      });

      const periodResponses = responses.filter(r => {
        const date = new Date(r.createdAt);
        return date >= periodStart && date <= periodEnd;
      });

      // Calculate period metrics
      const totalCommitments = periodCommitments.length;
      const completedCommitments = periodCommitments.filter(c => c.status === 'COMPLETE').length;
      const totalCommittedItems = periodCommitments.reduce((sum, c) => sum + c.totalCommittedQuantity, 0);
      const totalDeliveredItems = periodCommitments.reduce((sum, c) => sum + c.deliveredQuantity, 0);
      const totalVerifiedItems = periodCommitments.reduce((sum, c) => sum + c.verifiedDeliveredQuantity, 0);
      const totalValue = periodCommitments.reduce((sum, c) => sum + (c.totalValueEstimated || 0), 0);

      const deliveryRate = totalCommittedItems > 0 ? (totalVerifiedItems / totalCommittedItems) * 100 : 0;
      const commitmentFulfillmentRate = totalCommitments > 0 ? (completedCommitments / totalCommitments) * 100 : 0;

      const totalResponses = periodResponses.length;
      const verifiedResponses = periodResponses.filter(r => 
        r.verificationStatus === 'VERIFIED' || r.verificationStatus === 'AUTO_VERIFIED'
      ).length;
      const responseVerificationRate = totalResponses > 0 ? (verifiedResponses / totalResponses) * 100 : 0;

      return {
        period,
        commitments: totalCommitments,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        fulfillmentRate: Math.round(commitmentFulfillmentRate * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        responses: totalResponses,
        responseVerificationRate: Math.round(responseVerificationRate * 100) / 100,
        totalActivities: totalCommitments + totalResponses
      };
    });

    // Calculate achievements and milestones
    const achievements: Array<{
      date: string;
      type: string;
      description: string;
      badge?: string;
    }> = [];

    // Track delivery rate milestones
    const currentDeliveryRate = trends.length > 0 ? trends[trends.length - 1].deliveryRate : 0;
    if (currentDeliveryRate >= 95) {
      achievements.push({
        date: new Date().toISOString(),
        type: 'delivery_milestone',
        description: 'Achieved 95% verified delivery rate',
        badge: 'Reliable Delivery Gold'
      });
    } else if (currentDeliveryRate >= 85) {
      achievements.push({
        date: new Date().toISOString(),
        type: 'delivery_milestone',
        description: 'Achieved 85% verified delivery rate',
        badge: 'Reliable Delivery Silver'
      });
    } else if (currentDeliveryRate >= 70) {
      achievements.push({
        date: new Date().toISOString(),
        type: 'delivery_milestone',
        description: 'Achieved 70% verified delivery rate',
        badge: 'Reliable Delivery Bronze'
      });
    }

    // Track commitment volume milestones
    const totalCommitments = commitments.length;
    if (totalCommitments >= 50) {
      achievements.push({
        date: new Date().toISOString(),
        type: 'volume_milestone',
        description: 'Completed 50+ commitments',
        badge: 'High Volume Gold'
      });
    } else if (totalCommitments >= 25) {
      achievements.push({
        date: new Date().toISOString(),
        type: 'volume_milestone',
        description: 'Completed 25+ commitments',
        badge: 'High Volume Silver'
      });
    } else if (totalCommitments >= 10) {
      achievements.push({
        date: new Date().toISOString(),
        type: 'volume_milestone',
        description: 'Completed 10+ commitments',
        badge: 'High Volume Bronze'
      });
    }

    // Track consistency milestones
    const monthsActive = Math.ceil((now.getTime() - new Date(donor.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (monthsActive >= 12) {
      achievements.push({
        date: new Date().toISOString(),
        type: 'consistency_milestone',
        description: 'Active for 12+ consecutive months',
        badge: 'Consistency Gold'
      });
    } else if (monthsActive >= 6) {
      achievements.push({
        date: new Date().toISOString(),
        type: 'consistency_milestone',
        description: 'Active for 6+ consecutive months',
        badge: 'Consistency Silver'
      });
    } else if (monthsActive >= 3) {
      achievements.push({
        date: new Date().toISOString(),
        type: 'consistency_milestone',
        description: 'Active for 3+ consecutive months',
        badge: 'Consistency Bronze'
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        donorId,
        donor: {
          name: donor.name,
          organization: donor.organization,
          memberSince: donor.createdAt
        },
        trends,
        achievements,
        summary: {
          totalPeriods: periods.length,
          timeframe,
          granularity,
          totalCommitments: commitments.length,
          totalResponses: responses.length,
          averageDeliveryRate: trends.length > 0 
            ? Math.round((trends.reduce((sum, t) => sum + t.deliveryRate, 0) / trends.length) * 100) / 100
            : 0,
          totalValueContributed: commitments.reduce((sum, c) => sum + (c.totalValueEstimated || 0), 0)
        }
      }
    });

  } catch (error) {
    console.error('Performance trends API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});