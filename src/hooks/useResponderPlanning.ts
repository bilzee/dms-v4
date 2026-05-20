import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export function usePlannedResponses() {
  return useQuery({
    queryKey: ['planned-responses-assigned'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/responses/planned/assigned?page=1&limit=50')
      if (!result.success) throw new Error(result.error || 'Failed to fetch planned responses')
      return result.data!
    },
    enabled: !!getAuthToken(),
    staleTime: 30 * 1000,
    retry: 2,
  })
}

export function useResponseDetail(responseId: string | null) {
  return useQuery({
    queryKey: ['response-detail', responseId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/responses/${responseId}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch response')
      return result.data!
    },
    enabled: !!getAuthToken() && !!responseId,
  })
}
