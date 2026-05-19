import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/lib/api'

export function usePerformanceExport() {
  return useMutation({
    mutationFn: async (data: any) => {
      const result = await apiPost('/api/v1/reports/performance/export', data)
      if (!result.success) throw new Error(result.error || 'Export failed')
      return result.data!
    },
  })
}
