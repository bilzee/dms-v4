// Entity Insights TypeScript Interfaces
// This file contains type definitions for the Entity Insights feature

export interface EntityDemographics {
  id: string
  name: string
  type: EntityType
  location?: string
  coordinates?: {
    lat: number
    lng: number
  }
  demographics?: {
    population?: number
    vulnerableCount?: number
    lga?: string
    ward?: string
    state?: string
    campDetails?: {
      capacity?: number
      currentOccupancy?: number
      campType?: string
      amenities?: Record<string, any>
    }
    communityDetails?: {
      dominantOccupation?: string
      mainWaterSource?: string
      electricityAccess?: boolean
      schoolCount?: number
      healthCenterCount?: number
    }
    facilityDetails?: {
      facilityType?: string
      capacity?: number
      services?: string[]
      operatingHours?: string
    }
    householdCount?: number
    malePopulation?: number
    femalePopulation?: number
    childrenUnder5?: number
    elderlyCount?: number
    disabilityCount?: number
  }
  stats?: {
    verifiedAssessments: number
    totalCommitments: number
    activeResponses: number
    pendingCommitments: number
  }
  latestActivity?: {
    lastAssessment?: string
    lastAssessmentType?: AssessmentType
    assignmentDate: string
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AssessmentData {
  id: string
  type: AssessmentType
  date: Date
  status: VerificationStatus
  data: Record<string, any>
  assessor: {
    id: string
    name: string
    organization?: string
  }
  entity: {
    id: string
    name: string
    type: EntityType
  }
}

export interface EntityAssessmentsResponse {
  success?: true
  entity: EntityDemographics
  assessments: AssessmentData[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  summary: {
    totalAssessments: number
    verifiedAssessments: number
    categories: CategorySummary[]
  }
}

export interface CategorySummary {
  type: AssessmentType
  count: number
  latestDate?: Date
}

export interface LatestAssessmentsResponse {
  success?: true
  entityId: string
  latestAssessments: LatestAssessment[]
  lastUpdated: Date
}

export interface LatestAssessment {
  type: AssessmentType
  assessment: {
    id: string
    date: Date
    status: VerificationStatus
    data: Record<string, any>
    summary: AssessmentSummary
  }
}

export interface AssessmentSummary {
  overallScore?: number
  criticalGaps: string[]
  keyMetrics: Record<string, any>
}

export interface GapAnalysisResponse {
  success?: true
  entityId: string
  analysisDate: Date
  overallGapScore: number
  gaps: Gap[]
  summary: GapSummary
}

export interface Gap {
  category: AssessmentType
  severity: GapSeverity
  description: string
  affectedPopulation: number
  recommendedActions: string[]
  trend?: TrendDirection
}

export interface GapSummary {
  totalGaps: number
  criticalGaps: number
  highPriorityGaps: number
  mostAffectedCategory: AssessmentType
}

export interface AssessmentTrendsResponse {
  success?: true
  entityId: string
  timeframe: {
    start: Date
    end: Date
    granularity: TimeGranularity
  }
  trends: CategoryTrend[]
  insights: TrendInsight[]
}

export interface CategoryTrend {
  type: AssessmentType
  dataPoints: TrendDataPoint[]
}

export interface TrendDataPoint {
  period: string
  score: number
  gapCount: number
  assessmentCount: number
  trend: TrendDirection
}

export interface TrendInsight {
  category: AssessmentType
  trend: string
  recommendation: string
}

export interface ExportRequest {
  format: ExportFormat
  categories?: AssessmentType[]
  timeframe?: string
  includeCharts?: boolean
  includeGapAnalysis?: boolean
  includeTrends?: boolean
}

export interface ExportResponse {
  success?: true
  data: {
    downloadUrl: string
    expiresAt: Date
    fileSize: number
    format: string
    metadata: ExportMetadata
  }
}

export interface ExportMetadata {
  entityId: string
  generatedAt: Date
  categories?: AssessmentType[]
  timeframe?: string
  includeCharts?: boolean
}

// Enums (aligned with database schema)
export type EntityType = 'COMMUNITY' | 'WARD' | 'LGA' | 'STATE' | 'FACILITY' | 'CAMP'
export type AssessmentType = 'HEALTH' | 'WASH' | 'SHELTER' | 'FOOD' | 'SECURITY' | 'POPULATION'
export type VerificationStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'AUTO_VERIFIED' | 'REJECTED'
export type GapSeverity = 'critical' | 'high' | 'medium' | 'low'
export type TrendDirection = 'improving' | 'declining' | 'stable'
export type TimeGranularity = 'monthly' | 'quarterly' | 'yearly'
export type ExportFormat = 'pdf' | 'csv'

// Component Props
export interface EntityInsightsHeaderProps {
  demographics: EntityDemographics
}

export interface AssessmentViewerProps {
  entityId: string
}

export interface GapAnalysisProps {
  entityId: string
}

export interface AssessmentTrendsProps {
  entityId: string
}

export interface AssessmentExportProps {
  entityId: string
  entityName: string
  latestAssessments: LatestAssessment[]
  expanded?: boolean
}

// Query Options and Filters
export interface AssessmentFilters {
  category?: AssessmentType
  status?: VerificationStatus
  search?: string
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}

export interface TrendsFilters {
  timeframe: string
  granularity: TimeGranularity
  categories?: AssessmentType[]
}

export interface GapFilters {
  categories?: AssessmentType[]
  severity?: GapSeverity
  includeTrends?: boolean
}

// API Query Keys (for React Query)
export const ENTITY_INSIGHTS_QUERY_KEYS = {
  demographics: (entityId: string) => ['entity-demographics', entityId],
  assessments: (entityId: string, filters: AssessmentFilters) => ['entity-assessments', entityId, filters],
  latestAssessments: (entityId: string, categories?: AssessmentType[]) => ['latest-assessments', entityId, categories],
  trends: (entityId: string, filters: TrendsFilters) => ['assessment-trends', entityId, filters],
  gapAnalysis: (entityId: string, filters: GapFilters) => ['gap-analysis', entityId, filters],
} as const

// Utility Types
export interface ApiError {
  success: false
  error: string
  details?: any
}

// Chart Data Types
export interface ChartDataPoint {
  x: string
  y: number
  label?: string
}

export interface CategoryChartData {
  category: AssessmentType
  data: ChartDataPoint[]
  color: string
}

// Statistics Types
export interface EntityStatistics {
  totalAssessments: number
  verifiedAssessments: number
  categories: number
  lastAssessment?: Date
  totalGaps: number
  criticalGaps: number
  overallScore: number
}

// Export Report Data
export interface ReportData {
  fileSize: number
  content: string | Buffer
  fileName: string
  mimeType: string
}

// Configuration Types
export interface ExportConfig {
  maxFileSize: number
  retentionHours: number
  allowedFormats: ExportFormat[]
}

export interface TrendConfig {
  defaultTimeframe: string
  defaultGranularity: TimeGranularity
  maxDataPoints: number
}