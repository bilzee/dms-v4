import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export function useCommitment(commitmentId: string) {
  return useQuery({
    queryKey: ['commitment', commitmentId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/commitments/${commitmentId}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch commitment')
      return result.data!
    },
    enabled: !!commitmentId && !!getAuthToken(),
  })
}

export function useUpdateCommitment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commitmentId, data }: { commitmentId: string; data: any }) => {
      const result = await apiPatch(`/api/v1/commitments/${commitmentId}`, data)
      if (!result.success) throw new Error(result.error || 'Failed to update commitment')
      return result.data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commitment', variables.commitmentId] })
    },
  })
}

export function usePreliminaryAssessments(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  return useQuery({
    queryKey: ['preliminary-assessments', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/preliminary-assessments?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch assessments')
      return result.data!
    },
    enabled: !!getAuthToken(),
  })
}
