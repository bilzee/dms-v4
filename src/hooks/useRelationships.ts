import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export function useEntityAssessments(entityId: string | null) {
  return useQuery({
    queryKey: ['entity-assessments', entityId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/entities/${entityId}/assessments/latest`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch assessments')
      return result.data!
    },
    enabled: !!getAuthToken() && !!entityId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRelationshipStatistics(params?: Record<string, string>) {
  const searchParams = params ? new URLSearchParams(params) : ''
  return useQuery({
    queryKey: ['relationship-statistics', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/relationships/statistics?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch statistics')
      return result.data!
    },
    enabled: !!getAuthToken(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useDashboardSituation(incidentId?: string) {
  return useQuery({
    queryKey: ['dashboard-situation', incidentId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/dashboard/situation?incidentId=${incidentId}&includeEntityAssessments=true`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch situation')
      return result.data!
    },
    enabled: !!getAuthToken() && !!incidentId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRelationships(params?: Record<string, string>) {
  const searchParams = params ? new URLSearchParams(params) : ''
  return useQuery({
    queryKey: ['relationships', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/relationships?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch relationships')
      return result.data!
    },
    enabled: !!getAuthToken(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useRelationshipTimeline(params?: Record<string, string>) {
  const searchParams = params ? new URLSearchParams(params) : ''
  return useQuery({
    queryKey: ['relationship-timeline', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/relationships/timeline?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch timeline')
      return result.data!
    },
    enabled: !!getAuthToken(),
    staleTime: 5 * 60 * 1000,
  })
}
