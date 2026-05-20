// Core gamification interfaces

export interface DonorMetrics {
  donorId: string;
  totalCommitments: number;
  totalCommitmentValue: number;
  completedCommitments: number;
  selfReportedDeliveryRate: number;
  verifiedDeliveryRate: number;
  currentRank?: number;
  previousRank?: number;
  achievementBadges: BadgeType[];
  lastActivityDate: Date;
  regionalRank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  donor: {
    id: string;
    organizationName: string;
    region?: string;
  };
  metrics: {
    commitments: {
      total: number;
      completed: number;
      partial: number;
      totalValue: number;
      totalItems: number;
      deliveredItems: number;
      verifiedItems: number;
    };
    deliveryRates: {
      selfReported: number;
      verified: number;
    };
    responses: {
      total: number;
      verified: number;
      verificationRate: number;
    };
    performance: {
      overallScore: number;
      deliveryScore: number;
      valueScore: number;
      consistencyScore: number;
      speedScore: number;
      activityFrequency: number;
      avgResponseTimeHours: number;
    };
  };
  badges: BadgeType[];
  trend: 'up' | 'down' | 'stable';
  previousRank?: number;
  lastActivityDate: Date;
}

export interface LeaderboardMetadata {
  lastUpdated: string;
  totalParticipants: number;
  updateFrequency: string;
  timeframe: string;
  region: string;
  sortBy: string;
  limit: number;
}

export interface PerformanceTrendPoint {
  period: string; // Format depends on granularity: YYYY-MM, YYYY-Q#, YYYY-W##
  commitments: number;
  deliveryRate: number;
  fulfillmentRate: number;
  totalValue: number;
  responses: number;
  responseVerificationRate: number;
  totalActivities: number;
}

export interface Achievement {
  date: string;
  type: 'delivery_milestone' | 'volume_milestone' | 'speed_milestone' | 'consistency_milestone' | 'ranking_achievement';
  description: string;
  badge?: string;
}

export interface PerformanceTrends {
  donorId: string;
  donor: {
    name: string;
    organization?: string;
    memberSince: Date;
  };
  trends: PerformanceTrendPoint[];
  achievements: Achievement[];
  summary: {
    totalPeriods: number;
    timeframe: string;
    granularity: string;
    totalCommitments: number;
    totalResponses: number;
    averageDeliveryRate: number;
    totalValueContributed: number;
  };
}

export type BadgeType = 
  | 'Reliable Delivery Bronze'
  | 'Reliable Delivery Silver' 
  | 'Reliable Delivery Gold'
  | 'High Volume Bronze'
  | 'High Volume Silver'
  | 'High Volume Gold'
  | 'Quick Response Bronze'
  | 'Quick Response Silver'
  | 'Quick Response Gold'
  | 'Consistency Bronze'
  | 'Consistency Silver'
  | 'Consistency Gold'
  | 'Top Performer Regional'
  | 'Top Performer National';

export interface BadgeDefinition {
  type: BadgeType;
  category: 'delivery' | 'volume' | 'speed' | 'consistency' | 'ranking';
  level: 'bronze' | 'silver' | 'gold' | 'special';
  threshold: number;
  description: string;
  icon?: string;
}

export interface GameBadgeSystemProps {
  badges: BadgeType[];
  showProgress?: boolean;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface LeaderboardDisplayProps {
  timeframe?: '7d' | '30d' | '90d' | '1y' | 'all';
  region?: string;
  sortBy?: 'delivery_rate' | 'commitment_value' | 'consistency' | 'overall';
  limit?: number;
  showFilters?: boolean;
  interactive?: boolean;
}

export interface PerformanceChartProps {
  donorId: string;
  timeframe?: '3m' | '6m' | '1y' | '2y';
  granularity?: 'week' | 'month' | 'quarter';
  chartType?: 'line' | 'bar' | 'area';
  showComparison?: boolean;
}

export interface MetricsOverviewProps {
  donorId?: string;
  showRanking?: boolean;
  showBadges?: boolean;
  showTrends?: boolean;
  compact?: boolean;
}

export interface ExportButtonProps {
  donorIds?: string[];
  format?: 'csv' | 'pdf';
  timeframe?: '7d' | '30d' | '90d' | '1y' | 'all';
  includeCharts?: boolean;
  disabled?: boolean;
}

// API response interfaces
export interface LeaderboardResponse {
  success?: true;
  data: {
    rankings: LeaderboardEntry[];
    metadata: LeaderboardMetadata;
  };
  error?: string;
}

export interface PerformanceTrendsResponse {
  success?: true;
  data: PerformanceTrends;
  error?: string;
}

export interface ExportResponse {
  success?: true;
  data?: {
    exportType: 'csv' | 'pdf';
    reportData?: Record<string, any>[];
    metadata: {
      generatedAt: string;
      timeframe: string;
      startDate: string;
      endDate: string;
      totalDonors: number;
      includeCharts: boolean;
    };
  };
  error?: string;
}

// Query parameter interfaces
export interface LeaderboardQuery {
  limit?: number;
  region?: string;
  timeframe?: '7d' | '30d' | '90d' | '1y' | 'all';
  sortBy?: 'delivery_rate' | 'commitment_value' | 'consistency' | 'overall';
}

export interface PerformanceTrendsQuery {
  timeframe?: '3m' | '6m' | '1y' | '2y';
  granularity?: 'week' | 'month' | 'quarter';
}

export interface ExportRequest {
  donorIds?: string[];
  format: 'csv' | 'pdf';
  timeframe: '7d' | '30d' | '90d' | '1y' | 'all';
  includeCharts?: boolean;
}

// Configuration interfaces
export interface GamificationConfig {
  updateFrequency: number; // minutes
  cacheTimeout: number; // milliseconds
  badgeThresholds: {
    deliveryRate: { bronze: number; silver: number; gold: number };
    volume: { bronze: number; silver: number; gold: number };
    responseTime: { bronze: number; silver: number; gold: number };
    consistency: { bronze: number; silver: number; gold: number };
  };
  rankingWeights: {
    verifiedDeliveryRate: number;
    commitmentValue: number;
    consistency: number;
    responseSpeed: number;
  };
  leaderboardSettings: {
    defaultLimit: number;
    maxLimit: number;
    minCommitmentsForRanking: number;
    regionalRankingEnabled: boolean;
  };
}

// Chart.js configuration interfaces
export interface ChartConfiguration {
  type: 'line' | 'bar' | 'radar' | 'area';
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend: { display: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
    tooltip: { enabled: boolean };
    title?: { display: boolean; text?: string };
  };
  scales?: {
    x?: { display: boolean; title?: { display: boolean; text?: string } };
    y?: { 
      display: boolean; 
      beginAtZero: boolean; 
      max?: number;
      title?: { display: boolean; text?: string };
    };
  };
}

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
  tension?: number;
  fill?: boolean;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

// Error handling interfaces
export interface GamificationError {
  code: 'DONOR_NOT_FOUND' | 'INSUFFICIENT_DATA' | 'CALCULATION_ERROR' | 'PERMISSION_DENIED' | 'VALIDATION_ERROR';
  message: string;
  details?: any;
}

// Utility interfaces
export interface DateRange {
  start: Date;
  end: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface FilterParams {
  region?: string;
  timeframe?: string;
  minRank?: number;
  maxRank?: number;
  badges?: BadgeType[];
}

// Hook return types
export interface UseLeaderboardResult {
  data: LeaderboardEntry[] | undefined;
  metadata: LeaderboardMetadata | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UsePerformanceMetricsResult {
  data: PerformanceTrends | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseGamificationExportResult {
  exportData: (request: ExportRequest) => Promise<void>;
  isExporting: boolean;
  exportError: Error | null;
}

// Component state interfaces
export interface LeaderboardState {
  rankings: LeaderboardEntry[];
  filters: FilterParams;
  sorting: SortParams;
  pagination: PaginationParams;
  loading: boolean;
  error: string | null;
}

export interface PerformanceDashboardState {
  selectedDonor: string | null;
  timeframe: '3m' | '6m' | '1y' | '2y';
  granularity: 'week' | 'month' | 'quarter';
  chartType: 'line' | 'bar' | 'area';
  showComparison: boolean;
  exportFormat: 'csv' | 'pdf';
  includeCharts: boolean;
}

// Integration interfaces
export interface NotificationPayload {
  donorId: string;
  type: 'ranking_change' | 'badge_earned' | 'milestone_reached';
  title: string;
  message: string;
  data?: any;
}

export interface AuditLogEntry {
  action: 'view_leaderboard' | 'export_data' | 'update_ranking' | 'earn_badge';
  donorId?: string;
  userId: string;
  timestamp: Date;
  details?: any;
}