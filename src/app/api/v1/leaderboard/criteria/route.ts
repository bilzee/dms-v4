import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { v4 as uuidv4 } from 'uuid';
import { handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles } = context;
    
    // Allow all authenticated users to view leaderboard criteria
    if (!roles || roles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Define the ranking criteria and weights
    // These could be made configurable in the future via admin settings
    const rankingCriteria = {
      weights: {
        deliveryRate: {
          percentage: 40,
          name: "Verified Delivery Rate",
          description: "Percentage of commitments successfully delivered and verified",
          color: "blue"
        },
        commitmentValue: {
          percentage: 30,
          name: "Commitment Value",
          description: "Total monetary value of commitments made and fulfilled",
          color: "green"
        },
        consistency: {
          percentage: 20,
          name: "Consistency",
          description: "Regularity of contributions and response frequency",
          color: "purple"
        },
        responseSpeed: {
          percentage: 10,
          name: "Response Speed",
          description: "Average time to respond to new incidents and requests",
          color: "orange"
        }
      },
      badgeThresholds: {
        gold: {
          name: "Reliable Delivery Gold",
          requirement: "Top 10%",
          minDeliveryRate: 95,
          icon: "🥇",
          description: "Exceptional performers with 95%+ delivery rate"
        },
        silver: {
          name: "Reliable Delivery Silver", 
          requirement: "Top 25%",
          minDeliveryRate: 85,
          icon: "🥈",
          description: "High performers with 85%+ delivery rate"
        },
        bronze: {
          name: "Reliable Delivery Bronze",
          requirement: "Top 40%", 
          minDeliveryRate: 70,
          icon: "🥉",
          description: "Good performers with 70%+ delivery rate"
        }
      },
      calculation: {
        formula: "Overall Score = (Response Verification Rate × 100) + Total Commitments",
        updateFrequency: "Every 15 minutes",
        dataSource: "Real-time verification and commitment data",
        scoringPeriod: "Rolling 30-day period (configurable)"
      },
      performanceMetrics: {
        responseVerificationRate: {
          calculation: "Verified responses ÷ Total responses × 100",
          description: "Percentage of donor responses that have been verified",
          contribution: "Direct addition to overall score"
        },
        totalCommitments: {
          calculation: "Count of all commitments made by donor",
          description: "Total number of commitments regardless of status",
          contribution: "Direct addition to overall score"
        },
        overallScore: {
          calculation: "(Response Verification Rate × 100) + Total Commitments",
          description: "Simple additive formula prioritizing both verification rate and commitment volume",
          note: "Higher verification rates and more commitments lead to higher rankings"
        }
      }
    };

    // Get some real-time statistics to make the criteria more dynamic
    const [totalDonors, averageDeliveryRate] = await Promise.all([
      prisma.donor.count({ where: { isActive: true } }),
      prisma.donorCommitment.aggregate({
        _avg: {
          deliveredQuantity: true,
          totalCommittedQuantity: true
        }
      })
    ]);

    const avgDeliveryPercentage = averageDeliveryRate._avg.deliveredQuantity && averageDeliveryRate._avg.totalCommittedQuantity
      ? (averageDeliveryRate._avg.deliveredQuantity / averageDeliveryRate._avg.totalCommittedQuantity) * 100
      : 0;

    // Calculate dynamic badge distribution
    const topTenPercent = Math.max(1, Math.ceil(totalDonors * 0.1));
    const topTwentyFivePercent = Math.max(1, Math.ceil(totalDonors * 0.25));
    const topFortyPercent = Math.max(1, Math.ceil(totalDonors * 0.4));

    const dynamicStats = {
      totalActiveDonors: totalDonors,
      averageDeliveryRate: Math.round(avgDeliveryPercentage * 100) / 100,
      badgeDistribution: {
        gold: `Top ${topTenPercent} donors`,
        silver: `Top ${topTwentyFivePercent} donors`,
        bronze: `Top ${topFortyPercent} donors`
      },
      lastCalculated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        criteria: rankingCriteria,
        statistics: dynamicStats
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    });

  } catch (error) {
    console.error('Leaderboard criteria error:', error);
    return handleApiError(error);
  }
});

export const PATCH = withAuth(async (request: NextRequest, context) => {
  try {
    const { userId, roles } = context;
    
    // Only admins can modify ranking criteria
    if (!roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Admin role required to modify criteria' },
        { status: 403 }
      );
    }

    // This endpoint could be expanded to allow admins to modify ranking weights
    // For now, return success to indicate the endpoint exists for future use
    return NextResponse.json({
      success: true,
      message: "Ranking criteria modification endpoint available for admin configuration",
      data: {
        modifiable: ['weights', 'badgeThresholds', 'updateFrequency'],
        currentlyConfigurable: false,
        plannedFeature: true
      }
    });

  } catch (error) {
    console.error('Leaderboard criteria modification error:', error);
    return handleApiError(error);
  }
});