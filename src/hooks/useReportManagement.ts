import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export function useReportConfigurations(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  return useQuery({
    queryKey: ['report-configurations', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/reports/configurations?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch configurations')
      return result.data!
    },
    enabled: !!getAuthToken(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useReportExecutions(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  return useQuery({
    queryKey: ['report-executions', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/reports/executions?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch executions')
      return result.data!
    },
    enabled: !!getAuthToken(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useReportStatistics(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  return useQuery({
    queryKey: ['report-statistics', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/reports/statistics?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch statistics')
      return result.data!
    },
    enabled: !!getAuthToken(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useReportTemplates(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  return useQuery({
    queryKey: ['report-templates', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/reports/templates?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch templates')
      return result.data!
    },
    enabled: !!getAuthToken(),
  })
}

export function useDeleteConfiguration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await apiDelete(`/api/v1/reports/configurations/${id}`)
      if (!result.success) throw new Error(result.error || 'Failed to delete')
      return result.data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report-configurations'] }),
  })
}

export function useDeleteExecution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await apiDelete(`/api/v1/reports/executions/${id}`)
      if (!result.success) throw new Error(result.error || 'Failed to delete')
      return result.data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report-executions'] }),
  })
}

export function useDuplicateConfiguration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await apiPost(`/api/v1/reports/configurations/${id}/duplicate`)
      if (!result.success) throw new Error(result.error || 'Failed to duplicate')
      return result.data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report-configurations'] }),
  })
}

export function useDownloadExecution() {
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await apiGet(`/api/v1/reports/executions/${id}/download`)
      if (!result.success) throw new Error(result.error || 'Failed to download')
      return result.data!
    },
  })
}
