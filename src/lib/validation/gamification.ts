import { z } from 'zod';

// Leaderboard query validation
export const LeaderboardQuerySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  region: z.string().optional(),
  timeframe: z.enum(['7d', '30d', '90d', '1y', 'all']).optional().default('30d'),
  sortBy: z.enum(['delivery_rate', 'commitment_value', 'consistency', 'overall']).optional().default('overall')
});

// Performance trends query validation
export const PerformanceTrendsQuerySchema = z.object({
  timeframe: z.enum(['3m', '6m', '1y', '2y']).optional().default('1y'),
  granularity: z.enum(['week', 'month', 'quarter']).optional().default('month')
});

// Export request validation
export const ExportRequestSchema = z.object({
  donorIds: z.array(z.string().uuid()).optional(),
  format: z.enum(['csv', 'pdf']).default('csv'),
  timeframe: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
  includeCharts: z.boolean().default(false)
});

// Gamification metrics types
export const DonorMetricsSchema = z.object({
  donorId: z.string().uuid(),
  totalCommitments: z.number().min(0),
  totalCommitmentValue: z.number().min(0),
  completedCommitments: z.number().min(0),
  selfReportedDeliveryRate: z.number().min(0).max(100),
  verifiedDeliveryRate: z.number().min(0).max(100),
  currentRank: z.number().min(1).optional(),
  previousRank: z.number().min(1).optional(),
  achievementBadges: z.array(z.string()),
  lastActivityDate: z.date(),
  regionalRank: z.number().min(1).optional()
});

// Leaderboard ranking
export const LeaderboardRankingSchema = z.object({
  rank: z.number().min(1),
  donor: z.object({
    id: z.string().uuid(),
    organizationName: z.string().min(1),
    region: z.string().optional()
  }),
  metrics: z.object({
    commitments: z.object({
      total: z.number().min(0),
      completed: z.number().min(0),
      partial: z.number().min(0),
      totalValue: z.number().min(0),
      totalItems: z.number().min(0),
      deliveredItems: z.number().min(0),
      verifiedItems: z.number().min(0)
    }),
    deliveryRates: z.object({
      selfReported: z.number().min(0).max(100),
      verified: z.number().min(0).max(100)
    }),
    responses: z.object({
      total: z.number().min(0),
      verified: z.number().min(0),
      verificationRate: z.number().min(0).max(100)
    }),
    performance: z.object({
      overallScore: z.number().min(0).max(100),
      deliveryScore: z.number().min(0).max(100),
      valueScore: z.number().min(0).max(100),
      consistencyScore: z.number().min(0).max(100),
      speedScore: z.number().min(0).max(100),
      activityFrequency: z.number().min(0),
      avgResponseTimeHours: z.number().min(0)
    })
  }),
  badges: z.array(z.string()),
  trend: z.enum(['up', 'down', 'stable']),
  previousRank: z.number().min(1).optional(),
  lastActivityDate: z.date()
});

// Performance trend data point
export const PerformanceTrendPointSchema = z.object({
  period: z.string(), // Format depends on granularity: YYYY-MM, YYYY-Q#, YYYY-W##
  commitments: z.number().min(0),
  deliveryRate: z.number().min(0).max(100),
  fulfillmentRate: z.number().min(0).max(100),
  totalValue: z.number().min(0),
  responses: z.number().min(0),
  responseVerificationRate: z.number().min(0).max(100),
  totalActivities: z.number().min(0)
});

// Achievement/badge schema
export const AchievementSchema = z.object({
  date: z.string().datetime(),
  type: z.enum(['delivery_milestone', 'volume_milestone', 'speed_milestone', 'consistency_milestone', 'ranking_achievement']),
  description: z.string().min(1),
  badge: z.string().optional()
});

// Badge types and thresholds
export const BadgeTypeSchema = z.enum([
  'Reliable Delivery Bronze',
  'Reliable Delivery Silver', 
  'Reliable Delivery Gold',
  'High Volume Bronze',
  'High Volume Silver',
  'High Volume Gold',
  'Quick Response Bronze',
  'Quick Response Silver',
  'Quick Response Gold',
  'Consistency Bronze',
  'Consistency Silver',
  'Consistency Gold',
  'Top Performer Regional',
  'Top Performer National'
]);

// API Response schemas
export const LeaderboardResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    rankings: z.array(LeaderboardRankingSchema),
    metadata: z.object({
      lastUpdated: z.string().datetime(),
      totalParticipants: z.number().min(0),
      updateFrequency: z.string(),
      timeframe: z.string(),
      region: z.string(),
      sortBy: z.string(),
      limit: z.number()
    })
  })
});

export const PerformanceTrendsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    donorId: z.string().uuid(),
    donor: z.object({
      name: z.string(),
      organization: z.string().optional(),
      memberSince: z.date()
    }),
    trends: z.array(PerformanceTrendPointSchema),
    achievements: z.array(AchievementSchema),
    summary: z.object({
      totalPeriods: z.number().min(0),
      timeframe: z.string(),
      granularity: z.string(),
      totalCommitments: z.number().min(0),
      totalResponses: z.number().min(0),
      averageDeliveryRate: z.number().min(0).max(100),
      totalValueContributed: z.number().min(0)
    })
  })
});

export const ExportResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    exportType: z.enum(['csv', 'pdf']),
    reportData: z.array(z.record(z.any())).optional(), // For PDF structured data
    metadata: z.object({
      generatedAt: z.string().datetime(),
      timeframe: z.string(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      totalDonors: z.number(),
      includeCharts: z.boolean()
    })
  }).optional()
});

// Type inference from schemas
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
export type PerformanceTrendsQuery = z.infer<typeof PerformanceTrendsQuerySchema>;
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type DonorMetrics = z.infer<typeof DonorMetricsSchema>;
export type LeaderboardRanking = z.infer<typeof LeaderboardRankingSchema>;
export type PerformanceTrendPoint = z.infer<typeof PerformanceTrendPointSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type BadgeType = z.infer<typeof BadgeTypeSchema>;
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
export type PerformanceTrendsResponse = z.infer<typeof PerformanceTrendsResponseSchema>;
export type ExportResponse = z.infer<typeof ExportResponseSchema>;

// Badge achievement thresholds
export const BADGE_THRESHOLDS = {
  DELIVERY_RATE: {
    BRONZE: 70,
    SILVER: 85,
    GOLD: 95
  },
  VOLUME: {
    BRONZE: 10,
    SILVER: 25,
    GOLD: 50
  },
  RESPONSE_TIME: {
    BRONZE: 24, // hours
    SILVER: 12,
    GOLD: 6
  },
  CONSISTENCY: {
    BRONZE: 3, // months
    SILVER: 6,
    GOLD: 12
  },
  TOP_PERFORMER: {
    REGIONAL: 0.1, // Top 10%
    NATIONAL: 0.01 // Top 1%
  }
} as const;

// Ranking calculation weights (as specified in story requirements)
export const RANKING_WEIGHTS = {
  VERIFIED_DELIVERY_RATE: 0.6,  // 60% - Primary importance
  RESPONSE_SPEED: 0.2,          // 20% - Secondary importance
  COMMITMENT_VALUE: 0.1,        // 10% - Tertiary importance
  CONSISTENCY: 0.1              // 10% - Quaternary importance
} as const;

export const VALUE_CAP_NGN = 1_000_000;