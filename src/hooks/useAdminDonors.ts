import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPut } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export function useAdminDonors(filters?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['admin-donors', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.search) params.append('search', filters.search)
      const result = await apiGet(`/api/v1/donors?${params}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch donors')
      return result.data!
    },
    enabled: !!getAuthToken(),
    staleTime: 5 * 60 * 1000,
  })
}
