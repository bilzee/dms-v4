import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

export type PipelineData = {
  draft: number
  submitted: number
  verified: number
  responsePlanned: number
  responseVerified: number
  delivered: number
  deliveryVerified: number
}

export type ThroughputData = {
  assessmentTurnaround: Array<{ date: string; avgHours: number }>
  responseTurnaround: Array<{ date: string; avgHours: number }>
  distribution: Array<{ bucket: string; count: number }>
}

export type PopulationData = {
  trend: Array<{ date: string; displaced: number; injured: number; livesLost: number }>
  demographics: {
    totalPopulation: number
    totalHouseholds: number
    populationMale: number
    populationFemale: number
    populationUnder5: number
    pregnantWomen: number
    lactatingMothers: number
    personWithDisability: number
    elderlyPersons: number
    separatedChildren: number
  }
}

export type ResourceData = {
  totalCommitments: number
  byStatus: Array<{ status: string; totalCommitted: number; totalDelivered: number; totalVerified: number }>
  byType: Array<{ type: string; totalCommitted: number; totalDelivered: number }>
}

export type WorkloadData = {
  assessors: Array<{
    userId: string
    userName: string
    activeAssignments: number
    completed: number
    pending: number
  }>
  responders: Array<{
    userId: string
    userName: string
    activeAssignments: number
    completed: number
    pending: number
  }>
}

export type FreshnessData = Array<{
  entityId: string
  entityName: string
  entityType: string
  assessmentType: string
  lastAssessed: string | null
  hoursAgo: number | null
}>

export type GapRadarData = {
  summary: Array<{ assessmentType: string; totalGaps: number; totalAssessments: number }>
  entityGaps: Array<{ entityId: string; entityName: string; assessmentType: string; gapCount: number }>
}

export type LivePulseData = {
  severityTimeline: Array<{ date: string; severity: string; name: string; type: string }>
  alertCounts: Array<{ priority: string; count: number }>
  recentEvents: Array<{
    id: string
    eventType: string
    description: string
    createdAt: string
    priority: string | null
  }>
}

export type AfterActionData = {
  pipelineTiming: Array<{
    incidentId: string
    incidentName: string
    incidentType: string
    timeToFirstAssessment: number | null
    timeToFirstVerification: number | null
    timeToFirstResponse: number | null
    timeToFirstDelivery: number | null
  }>
  rejectionAnalysis: Array<{ reason: string; count: number }>
  assessorRejection: Array<{
    assessorId: string
    assessorName: string
    total: number
    rejected: number
    rejectionRate: number
  }>
  donorReliability: Array<{
    donorId: string
    donorName: string
    donorType: string
    totalCommitted: number
    totalDelivered: number
    totalVerified: number
    totalCommitments: number
    completedCommitments: number
    deliveryRate: number
  }>
  incidentComparison: Array<{
    incidentId: string
    incidentName: string
    incidentType: string
    severity: string
    status: string
    totalAssessments: number
    totalResponses: number
    totalCommitments: number
    populationAffected: number
  }>
}

export type CoordinatorAnalyticsData = {
  pipeline: PipelineData
  throughput: ThroughputData
  population: PopulationData
  resources: ResourceData
  workload: WorkloadData
  freshness: FreshnessData
  gapRadar: GapRadarData
  livePulse: LivePulseData
  afterAction: AfterActionData
}

type CoordinatorAnalyticsParams = {
  incidentId?: string
  entityId?: string
  range?: '7d' | '30d' | '90d'
}

export function useCoordinatorAnalytics(params: CoordinatorAnalyticsParams = {}) {
  const searchParams = new URLSearchParams()
  if (params.incidentId) searchParams.set('incidentId', params.incidentId)
  if (params.entityId) searchParams.set('entityId', params.entityId)
  searchParams.set('range', params.range ?? '7d')

  return useQuery({
    queryKey: ['coordinator-analytics', params],
    queryFn: async () => {
      const result = await apiGet<CoordinatorAnalyticsData>(
        `/api/v1/coordinator/analytics?${searchParams.toString()}`
      )
      if (!result.success) throw new Error(result.error || 'Failed to fetch analytics')
      return result.data as CoordinatorAnalyticsData
    },
    staleTime: 5 * 60 * 1000,
  })
}
