import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPut } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export function useAdminDonorDetail(donorId: string) {
  return useQuery({
    queryKey: ['admin-donor-detail', donorId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/donors/${donorId}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch donor')
      return result.data!
    },
    enabled: !!getAuthToken() && !!donorId,
  })
}

export function useUpdateDonor(donorId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const result = await apiPut(`/api/v1/donors/${donorId}`, data)
      if (!result.success) throw new Error(result.error || 'Failed to update donor')
      return result.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-donor-detail', donorId] })
      queryClient.invalidateQueries({ queryKey: ['admin-donors'] })
    },
  })
}
