import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export function useVerificationDeliveries(filters?: { page?: number; limit?: number; status?: string }) {
  const params = new URLSearchParams()
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())
  if (filters?.status) params.append('status', filters.status)

  return useQuery({
    queryKey: ['verification-deliveries', filters],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/verification/queue/deliveries?${params}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch deliveries')
      return result.data!
    },
    enabled: !!getAuthToken(),
    staleTime: 30000,
  })
}

export function useVerifyDelivery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ deliveryId, data }: { deliveryId: string; data: any }) => {
      const result = await apiPost(`/api/v1/verification/queue/deliveries/${deliveryId}/verify`, data)
      if (!result.success) throw new Error(result.error || 'Failed to verify delivery')
      return result.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-deliveries'] })
    },
  })
}
