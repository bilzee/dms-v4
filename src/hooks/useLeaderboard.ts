import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export function useLeaderboard(params?: { limit?: number; sortBy?: string; timeframe?: string; region?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.append('limit', params.limit.toString())
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
  if (params?.timeframe) searchParams.append('timeframe', params.timeframe)
  if (params?.region) searchParams.append('region', params.region)

  return useQuery({
    queryKey: ['leaderboard', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/leaderboard?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch leaderboard')
      return result.data!
    },
    enabled: !!getAuthToken(),
    staleTime: 2 * 60 * 1000,
  })
}
