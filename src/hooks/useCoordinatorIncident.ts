import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export function useCoordinatorIncident(incidentId: string) {
  return useQuery({
    queryKey: ['coordinator-incident', incidentId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/incidents/${incidentId}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch incident')
      return result.data!
    },
    enabled: !!getAuthToken() && !!incidentId,
  })
}

export function useIncidentAssessmentSummary(incidentId: string) {
  return useQuery({
    queryKey: ['incident-assessment-summary', incidentId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/incidents/${incidentId}/assessment-summary`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch assessment summary')
      return result.data!
    },
    enabled: !!getAuthToken() && !!incidentId,
  })
}
