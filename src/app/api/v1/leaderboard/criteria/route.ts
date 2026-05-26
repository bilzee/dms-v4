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
          percentage: 60,
          name: "Verified Delivery Rate",
          description: "Percentage of commitments successfully delivered and verified",
          color: "blue"
        },
        commitmentValue: {
          percentage: 10,
          name: "Commitment Value",
          description: "Total monetary value of commitments made and fulfilled (capped at ₦1,000,000)",
          color: "green"
        },
        consistency: {
          percentage: 10,
          name: "Consistency",
          description: "Regularity of contributions and response frequency",
          color: "purple"
        },
        responseSpeed: {
          percentage: 20,
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
        formula: "Score = (Delivery Rate × 0.6) + (Response Speed × 0.2) + (Commitment Value × 0.1) + (Consistency × 0.1)",
        updateFrequency: "Every 15 minutes",
        dataSource: "Real-time verification and commitment data",
        scoringPeriod: "Rolling 30-day period (configurable)"
      },
      performanceMetrics: {
        deliveryRate: {
          calculation: "Verified delivered items ÷ Total committed items × 100",
          description: "Percentage of committed items successfully delivered and verified",
          contribution: "60% weight in overall score (primary factor)"
        },
        commitmentValue: {
          calculation: "Total estimated value ÷ ₦1,000,000 × 100 (capped at 100)",
          description: "Monetary value of commitments in NGN, capped at ₦1,000,000",
          contribution: "10% weight in overall score"
        },
        consistency: {
          calculation: "(Commitments + Responses) ÷ Days since first activity × 1000 (capped at 100)",
          description: "Regularity of contributions and response frequency",
          contribution: "10% weight in overall score"
        },
        responseSpeed: {
          calculation: "100 − (Avg response hours ÷ 24 × 20), minimum 0",
          description: "Average time to respond to new incidents (every 24h costs 20 points)",
          contribution: "20% weight in overall score (secondary factor)"
        },
        overallScore: {
          calculation: "(Delivery Rate × 0.6) + (Response Speed × 0.2) + (Commitment Value × 0.1) + (Consistency × 0.1)",
          description: "Weighted composite score prioritizing delivery reliability and response speed",
          note: "Each factor is normalized to 0–100 before weighting. Ties receive the same rank."
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