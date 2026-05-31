import { db } from '@/lib/db/client';
import { 
  BadgeType, 
  DonorMetrics, 
  BADGE_THRESHOLDS, 
  RANKING_WEIGHTS,
  VALUE_CAP_NGN,
  Achievement 
} from '@/lib/validation/gamification';
import type { ScoringConfig } from '@/lib/services/scoring-config.service';

export interface OverallScoreInputs {
  verifiedDeliveryRate: number;
  totalCommitmentValue: number;
  activityFrequency: number;
  avgResponseTimeHours: number;
}

export function computeOverallScore(metrics: OverallScoreInputs, config?: ScoringConfig): number {
  const valueCap = config?.valueCap ?? VALUE_CAP_NGN;
  const consistencyMultiplier = config?.consistencyMaxActivitiesPerDay
    ? 1 / config.consistencyMaxActivitiesPerDay
    : 1000;
  const speedZeroHours = config?.speedZeroScoreHours ?? 120;

  const normalizedDeliveryScore = Math.min(100, metrics.verifiedDeliveryRate);
  const normalizedValueScore = Math.min(100, (metrics.totalCommitmentValue / valueCap) * 100);
  const normalizedConsistencyScore = Math.min(100, metrics.activityFrequency * consistencyMultiplier);
  const normalizedSpeedScore = Math.max(0, 100 - (metrics.avgResponseTimeHours / speedZeroHours) * 100);

  const wDelivery = (config?.deliveryWeight ?? RANKING_WEIGHTS.VERIFIED_DELIVERY_RATE * 100) / 100;
  const wSpeed = (config?.speedWeight ?? RANKING_WEIGHTS.RESPONSE_SPEED * 100) / 100;
  const wValue = (config?.valueWeight ?? RANKING_WEIGHTS.COMMITMENT_VALUE * 100) / 100;
  const wConsistency = (config?.consistencyWeight ?? RANKING_WEIGHTS.CONSISTENCY * 100) / 100;

  return (
    (normalizedDeliveryScore * wDelivery) +
    (normalizedValueScore * wValue) +
    (normalizedConsistencyScore * wConsistency) +
    (normalizedSpeedScore * wSpeed)
  );
}

export interface CalculatedMetrics {
  donorId: string;
  totalCommitments: number;
  totalCommitmentValue: number;
  completedCommitments: number;
  selfReportedDeliveryRate: number;
  verifiedDeliveryRate: number;
  responseVerificationRate: number;
  activityFrequency: number;
  avgResponseTimeHours: number;
  overallScore: number;
  achievementBadges: BadgeType[];
  regionalRank?: number;
  lastActivityDate: Date;
}

/**
 * Calculate comprehensive metrics for a donor
 */
export async function calculateDonorMetrics(
  donorId: string, 
  timeframe: { start: Date; end: Date }
): Promise<CalculatedMetrics> {
  // Fetch donor data with related commitments
  const donor = await db.donor.findUnique({
    where: { id: donorId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      commitments: {
        where: {
          commitmentDate: {
            gte: timeframe.start,
            lte: timeframe.end
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
        }
      }
    }
  });

  // Fetch responses through PlanCommitment
  const responses = donor ? await db.rapidResponse.findMany({
    where: {
      planCommitments: {
        some: {
          commitment: {
            donorId: donor.id
          }
        }
      },
      createdAt: {
        gte: timeframe.start,
        lte: timeframe.end
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
  }) : [];

  if (!donor) {
    throw new Error(`Donor not found: ${donorId}`);
  }

  // Calculate commitment metrics
  const totalCommitments = donor.commitments.length;
  const completedCommitments = donor.commitments.filter(c => c.status === 'COMPLETE').length;
  const totalCommittedItems = donor.commitments.reduce((sum, c) => sum + c.totalCommittedQuantity, 0);
  const totalDeliveredItems = donor.commitments.reduce((sum, c) => sum + c.deliveredQuantity, 0);
  const totalVerifiedItems = donor.commitments.reduce((sum, c) => sum + c.verifiedDeliveredQuantity, 0);
  const totalCommitmentValue = donor.commitments.reduce((sum, c) => sum + (c.totalValueEstimated || 0), 0);

  // Calculate delivery rates
  const selfReportedDeliveryRate = totalCommittedItems > 0 ? (totalDeliveredItems / totalCommittedItems) * 100 : 0;
  const verifiedDeliveryRate = totalCommittedItems > 0 ? (totalVerifiedItems / totalCommittedItems) * 100 : 0;

  // Calculate response metrics
  const totalResponses = responses.length;
  const verifiedResponses = responses.filter(r => 
    r.verificationStatus === 'VERIFIED' || r.verificationStatus === 'AUTO_VERIFIED'
  ).length;
  const responseVerificationRate = totalResponses > 0 ? (verifiedResponses / totalResponses) * 100 : 0;

  // Calculate activity frequency
  const daysSinceFirstActivity = donor.commitments.length > 0 
    ? Math.max(1, Math.ceil((timeframe.end.getTime() - new Date(donor.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;
  const activityFrequency = (totalCommitments + totalResponses) / daysSinceFirstActivity;

  // Calculate average response time (response created - assessment created)
  const avgResponseTimeHours = responses.length > 0
    ? responses.reduce((sum, r) => {
        const responseMs = new Date(r.createdAt).getTime();
        const assessmentMs = r.assessment ? new Date(r.assessment.createdAt).getTime() : responseMs;
        const responseHours = Math.max(0, (responseMs - assessmentMs) / (1000 * 60 * 60));
        return sum + Math.min(responseHours, 168);
      }, 0) / responses.length
    : 24;

  const overallScore = computeOverallScore({
    verifiedDeliveryRate,
    totalCommitmentValue,
    activityFrequency,
    avgResponseTimeHours
  });

  // Calculate achievement badges
  const achievementBadges = calculateAchievementBadges({
    verifiedDeliveryRate,
    completedCommitments,
    avgResponseTimeHours,
    monthsActive: Math.ceil(daysSinceFirstActivity / 30)
  });

  // Find last activity date
  const lastActivityDate = donor.commitments.length > 0 
    ? donor.commitments.reduce((latest, c) => 
        new Date(c.lastUpdated) > new Date(latest) ? c.lastUpdated : latest, 
        donor.commitments[0].lastUpdated
      )
    : donor.createdAt;

  return {
    donorId,
    totalCommitments,
    totalCommitmentValue,
    completedCommitments,
    selfReportedDeliveryRate: Math.round(selfReportedDeliveryRate * 100) / 100,
    verifiedDeliveryRate: Math.round(verifiedDeliveryRate * 100) / 100,
    responseVerificationRate: Math.round(responseVerificationRate * 100) / 100,
    activityFrequency: Math.round(activityFrequency * 1000) / 1000,
    avgResponseTimeHours: Math.round(avgResponseTimeHours * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
    achievementBadges,
    lastActivityDate: new Date(lastActivityDate)
  };
}

/**
 * Calculate achievement badges based on performance thresholds
 */
export function calculateAchievementBadges(metrics: {
  verifiedDeliveryRate: number;
  completedCommitments: number;
  avgResponseTimeHours: number;
  monthsActive: number;
}): BadgeType[] {
  const badges: BadgeType[] = [];

  // Delivery rate badges
  if (metrics.verifiedDeliveryRate >= BADGE_THRESHOLDS.DELIVERY_RATE.GOLD) {
    badges.push('Reliable Delivery Gold');
  } else if (metrics.verifiedDeliveryRate >= BADGE_THRESHOLDS.DELIVERY_RATE.SILVER) {
    badges.push('Reliable Delivery Silver');
  } else if (metrics.verifiedDeliveryRate >= BADGE_THRESHOLDS.DELIVERY_RATE.BRONZE) {
    badges.push('Reliable Delivery Bronze');
  }

  // Volume badges
  if (metrics.completedCommitments >= BADGE_THRESHOLDS.VOLUME.GOLD) {
    badges.push('High Volume Gold');
  } else if (metrics.completedCommitments >= BADGE_THRESHOLDS.VOLUME.SILVER) {
    badges.push('High Volume Silver');
  } else if (metrics.completedCommitments >= BADGE_THRESHOLDS.VOLUME.BRONZE) {
    badges.push('High Volume Bronze');
  }

  // Response time badges
  if (metrics.avgResponseTimeHours <= BADGE_THRESHOLDS.RESPONSE_TIME.GOLD) {
    badges.push('Quick Response Gold');
  } else if (metrics.avgResponseTimeHours <= BADGE_THRESHOLDS.RESPONSE_TIME.SILVER) {
    badges.push('Quick Response Silver');
  } else if (metrics.avgResponseTimeHours <= BADGE_THRESHOLDS.RESPONSE_TIME.BRONZE) {
    badges.push('Quick Response Bronze');
  }

  // Consistency badges
  if (metrics.monthsActive >= BADGE_THRESHOLDS.CONSISTENCY.GOLD) {
    badges.push('Consistency Gold');
  } else if (metrics.monthsActive >= BADGE_THRESHOLDS.CONSISTENCY.SILVER) {
    badges.push('Consistency Silver');
  } else if (metrics.monthsActive >= BADGE_THRESHOLDS.CONSISTENCY.BRONZE) {
    badges.push('Consistency Bronze');
  }

  return badges;
}

/**
 * Calculate leaderboard rankings and update donor records
 */
export async function calculateLeaderboardRankings(
  timeframe: { start: Date; end: Date },
  region?: string
): Promise<{ donorId: string; rank: number; score: number; previousRank?: number }[]> {
  // Build entity filter for regional rankings
  const entityFilter = region ? {
    entityAssignments: {
      some: {
        entity: {
          location: {
            contains: region,
            mode: 'insensitive' as const
          }
        }
      }
    }
  } : {};

  // Get all eligible donors
  const donors = await db.donor.findMany({
    where: {
      isActive: true,
      ...entityFilter,
      commitments: {
        some: {
          commitmentDate: {
            gte: timeframe.start,
            lte: timeframe.end
          }
        }
      }
    },
    select: {
      id: true,
      leaderboardRank: true // Get current rank for trend calculation
    }
  });

  // Calculate metrics for all donors
  const donorMetrics = await Promise.all(
    donors.map(async (donor) => {
      const metrics = await calculateDonorMetrics(donor.id, timeframe);
      return {
        donorId: donor.id,
        score: metrics.overallScore,
        previousRank: donor.leaderboardRank || undefined,
        metrics
      };
    })
  );

  // Sort by overall score (descending)
  const sortedDonors = donorMetrics.sort((a, b) => b.score - a.score);

  // Assign new rankings
  const rankings = sortedDonors.map((donor, index) => ({
    donorId: donor.donorId,
    rank: index + 1,
    score: donor.score,
    previousRank: donor.previousRank
  }));

  return rankings;
}

/**
 * Update donor leaderboard ranks and metrics in database
 */
export async function updateDonorRankings(
  rankings: { donorId: string; rank: number; score: number }[]
): Promise<void> {
  // Batch update donor records
  const updatePromises = rankings.map(async ({ donorId, rank }) => {
    // Get current metrics to update delivery rates
    const donor = await db.donor.findUnique({
      where: { id: donorId },
      select: {
        commitments: {
          select: {
            totalCommittedQuantity: true,
            deliveredQuantity: true,
            verifiedDeliveredQuantity: true
          }
        }
      }
    });

    if (!donor) return;

    // Recalculate delivery rates
    const totalCommittedItems = donor.commitments.reduce((sum, c) => sum + c.totalCommittedQuantity, 0);
    const totalDeliveredItems = donor.commitments.reduce((sum, c) => sum + c.deliveredQuantity, 0);
    const totalVerifiedItems = donor.commitments.reduce((sum, c) => sum + c.verifiedDeliveredQuantity, 0);

    const selfReportedDeliveryRate = totalCommittedItems > 0 ? (totalDeliveredItems / totalCommittedItems) * 100 : 0;
    const verifiedDeliveryRate = totalCommittedItems > 0 ? (totalVerifiedItems / totalCommittedItems) * 100 : 0;

    return db.donor.update({
      where: { id: donorId },
      data: {
        leaderboardRank: rank,
        selfReportedDeliveryRate: Math.round(selfReportedDeliveryRate * 100) / 100,
        verifiedDeliveryRate: Math.round(verifiedDeliveryRate * 100) / 100
      }
    });
  });

  await Promise.all(updatePromises);
}

/**
 * Get regional rankings for a donor
 */
export async function getRegionalRanking(
  donorId: string, 
  timeframe: { start: Date; end: Date }
): Promise<number | undefined> {
  // Find donor's region through entity assignments
  const donorWithRegion = await db.donor.findUnique({
    where: { id: donorId },
    select: {
      id: true,
      name: true
    }
  });

  if (!(donorWithRegion as any)?.entityAssignments?.[0]?.entity?.location) {
    return undefined;
  }

  const region = (donorWithRegion as any)?.entityAssignments?.[0]?.entity?.location;
  
  // Calculate regional rankings
  const regionalRankings = await calculateLeaderboardRankings(timeframe, region);
  
  // Find donor's position in regional rankings
  const donorRanking = regionalRankings.find(r => r.donorId === donorId);
  return donorRanking?.rank;
}

/**
 * Generate achievement notifications for milestone completions
 */
export async function generateAchievementNotifications(
  donorId: string,
  newBadges: BadgeType[]
): Promise<Achievement[]> {
  const achievements: Achievement[] = [];
  const now = new Date();

  for (const badge of newBadges) {
    let description: string;
    let type: Achievement['type'];

    if (badge.includes('Delivery')) {
      type = 'delivery_milestone';
      const level = badge.split(' ')[2].toLowerCase();
      const threshold = BADGE_THRESHOLDS.DELIVERY_RATE[level.toUpperCase() as keyof typeof BADGE_THRESHOLDS.DELIVERY_RATE];
      description = `Achieved ${threshold}% verified delivery rate`;
    } else if (badge.includes('Volume')) {
      type = 'volume_milestone';
      const level = badge.split(' ')[2].toLowerCase();
      const threshold = BADGE_THRESHOLDS.VOLUME[level.toUpperCase() as keyof typeof BADGE_THRESHOLDS.VOLUME];
      description = `Completed ${threshold}+ commitments`;
    } else if (badge.includes('Response')) {
      type = 'speed_milestone';
      const level = badge.split(' ')[2].toLowerCase();
      const threshold = BADGE_THRESHOLDS.RESPONSE_TIME[level.toUpperCase() as keyof typeof BADGE_THRESHOLDS.RESPONSE_TIME];
      description = `Average response time under ${threshold} hours`;
    } else if (badge.includes('Consistency')) {
      type = 'consistency_milestone';
      const level = badge.split(' ')[1].toLowerCase();
      const threshold = BADGE_THRESHOLDS.CONSISTENCY[level.toUpperCase() as keyof typeof BADGE_THRESHOLDS.CONSISTENCY];
      description = `Active for ${threshold}+ consecutive months`;
    } else {
      type = 'ranking_achievement';
      description = `Earned ${badge} recognition`;
    }

    achievements.push({
      date: now.toISOString(),
      type,
      description,
      badge
    });
  }

  return achievements;
}