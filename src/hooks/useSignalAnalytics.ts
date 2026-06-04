import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

type AnalyticsData = {
  volumeOverTime: Array<{ date: string; signalReason: string; count: number }>;
  resolutionVelocity: Array<{ signalReason: string; medianHours: number }>;
  resolutionRate: Array<{ signalReason: string; total: number; within24h: number; within48h: number; within1w: number; rate24h: number; rate48h: number; rate1w: number }>;
  priorityDistribution: Array<{ signalReason: string; priority: string; count: number }>;
  topEntities: Array<{ id: string; name: string; type: string; unresolvedCount: number; highestPriority: string }>;
  roleEngagement: Array<{ role: string; totalSignals: number; resolvedSignals: number; resolutionRate: number }> | null;
};

export function useSignalAnalytics(range: '7d' | '30d' | '90d') {
  return useQuery({
    queryKey: ['signal-analytics', range],
    queryFn: async () => {
      const result = await apiGet<AnalyticsData>(`/api/v1/signals/analytics?range=${range}`);
      if (!result.success) throw new Error(result.error || 'Failed to fetch analytics');
      return result.data as AnalyticsData;
    },
    staleTime: 5 * 60 * 1000,
  });
}
