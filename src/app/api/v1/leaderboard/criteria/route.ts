import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { v4 as uuidv4 } from 'uuid';
import { handleApiError } from '@/lib/api/response';
import { getScoringConfig } from '@/lib/services/scoring-config.service';
import { getCurrencySymbol } from '@/lib/currency';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles } = context;

    if (!roles || roles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const config = await getScoringConfig();
    const curSym = await getCurrencySymbol();
    const dW = config.deliveryWeight;
    const sW = config.speedWeight;
    const vW = config.valueWeight;
    const cW = config.consistencyWeight;

    const rankingCriteria = {
      weights: {
        deliveryRate: {
          percentage: dW,
          name: "Verified Delivery Rate",
          description: "Percentage of commitments successfully delivered and verified",
          color: "blue"
        },
        responseSpeed: {
          percentage: sW,
          name: "Response Speed",
          description: "Average time to respond to new incidents and requests",
          color: "orange"
        },
        commitmentValue: {
          percentage: vW,
          name: "Commitment Value",
          description: `Total monetary value of commitments made and fulfilled (capped at ${curSym}${config.valueCap.toLocaleString()})`,
          color: "green"
        },
        consistency: {
          percentage: cW,
          name: "Consistency",
          description: "Regularity of contributions and response frequency",
          color: "purple"
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
        formula: `Score = (Delivery Rate × ${dW / 100}) + (Response Speed × ${sW / 100}) + (Commitment Value × ${vW / 100}) + (Consistency × ${cW / 100})`,
        updateFrequency: "Every 15 minutes",
        dataSource: "Real-time verification and commitment data",
        scoringPeriod: "Rolling 30-day period (configurable)"
      },
      performanceMetrics: {
        deliveryRate: {
          calculation: "Verified delivered items ÷ Total committed items × 100",
          description: "Percentage of committed items successfully delivered and verified",
          contribution: `${dW}% weight in overall score${dW >= 40 ? ' (primary factor)' : ''}`
        },
        responseSpeed: {
          calculation: `max(0, 100 − (avg response hours ÷ ${config.speedZeroScoreHours}) × 100)`,
          description: `Average time to respond to new incidents (score drops to 0 after ${config.speedZeroScoreHours} hours)`,
          contribution: `${sW}% weight in overall score${sW >= 20 ? ' (secondary factor)' : ''}`
        },
        commitmentValue: {
          calculation: `Total estimated value ÷ ${curSym}${config.valueCap.toLocaleString()} × 100 (capped at 100)`,
          description: `Monetary value of commitments, capped at ${curSym}${config.valueCap.toLocaleString()}`,
          contribution: `${vW}% weight in overall score`
        },
        consistency: {
          calculation: `(Commitments + Responses) ÷ Days since first activity ÷ ${config.consistencyMaxActivitiesPerDay} × 100 (capped at 100)`,
          description: "Regularity of contributions and response frequency",
          contribution: `${cW}% weight in overall score`
        },
        overallScore: {
          calculation: `(Delivery Rate × ${dW / 100}) + (Response Speed × ${sW / 100}) + (Commitment Value × ${vW / 100}) + (Consistency × ${cW / 100})`,
          description: "Weighted composite score prioritizing delivery reliability and response speed",
          note: "Each factor is normalized to 0–100 before weighting. Ties receive the same rank."
        }
      },
      config
    };

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
        version: '2.0.0',
        requestId: uuidv4()
      }
    });

  } catch (error) {
    console.error('Leaderboard criteria error:', error);
    return handleApiError(error);
  }
});
