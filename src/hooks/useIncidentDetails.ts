import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export function useIncidentDetail(incidentId: string) {
  return useQuery({
    queryKey: ['incident-detail', incidentId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/incidents/${incidentId}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch incident')
      return result.data!
    },
    enabled: !!incidentId && !!getAuthToken(),
  })
}

export function useIncidentAssessmentSummary(incidentId: string) {
  return useQuery({
    queryKey: ['incident-assessment-summary', incidentId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/incidents/${incidentId}/assessment-summary`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch summary')
      return result.data!
    },
    enabled: !!incidentId && !!getAuthToken(),
  })
}
