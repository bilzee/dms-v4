import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { apiGet } from '@/lib/api';

interface GapAnalysisSummaryData {
  totalEntities: number;
  severityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  assessmentTypeGaps: {
    [assessmentType: string]: {
      severity: 'high' | 'medium' | 'low';
      entitiesAffected: number;
      percentage: number;
    };
  };
  lastUpdated: string;
}

interface UseGapAnalysisRealtimeOptions {
  incidentId?: string;
  enabled?: boolean;
  refetchInterval?: number; // in milliseconds
  staleTime?: number; // in milliseconds
  onSuccess?: (data: GapAnalysisSummaryData) => void;
  onError?: (error: Error) => void;
}

interface UseGapAnalysisRealtimeReturn {
  data: GapAnalysisSummaryData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  isRefetching: boolean;
  lastUpdated: Date | null;
  refetch: () => void;
  invalidate: () => Promise<void>;
}

/**
 * useGapAnalysisRealtime Hook
 * 
 * Real-time data integration for gap analysis summary using TanStack Query.
 * Features:
 * - Automatic polling with configurable intervals
 * - Optimistic updates handling
 * - Connection status management
 * - Offline scenario handling
 * - Background refetching
 * 
 * @param options Configuration options for the hook
 * @returns Object containing data, loading states, and control functions
 */
export function useGapAnalysisRealtime({
  incidentId,
  enabled = true,
  refetchInterval = 30000, // 30 seconds default polling
  staleTime = 15000, // 15 seconds stale time
  onSuccess,
  onError
}: UseGapAnalysisRealtimeOptions = {}): UseGapAnalysisRealtimeReturn {
  const queryClient = useQueryClient();

  // Build query key with dependencies
  const queryKey = ['gap-analysis-summary', incidentId].filter(Boolean);

  // Fetch gap analysis summary data
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    isRefetching,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!incidentId) {
        throw new Error('Incident ID is required for gap analysis summary');
      }

      const url = `/api/v1/dashboard/situation?incidentId=${encodeURIComponent(incidentId)}&includeGapSummary=true`;

      const result = await apiGet<{ gapAnalysisSummary: GapAnalysisSummaryData }>(url);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch gap analysis summary');
      }

      if (!result.data?.gapAnalysisSummary) {
        throw new Error('Invalid response format or missing gap analysis data');
      }

      return result.data.gapAnalysisSummary;
    },
    enabled: enabled && !!incidentId,
    refetchInterval,
    staleTime,
    retry: (failureCount, error) => {
      // Retry logic with exponential backoff
      if (error instanceof Error) {
        // Don't retry for authentication errors
        if (error.message.includes('401') || error.message.includes('Authentication')) {
          return false;
        }
        // Don't retry for rate limit errors (wait for manual retry)
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          return false;
        }
      }
      
      // Retry up to 3 times with exponential backoff
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Enable background refetching
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Keep previous data while fetching new data
    placeholderData: (previousData) => previousData,
  });

  // Manual invalidate function
  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Calculate last updated date
  const lastUpdated = data?.lastUpdated ? new Date(data.lastUpdated) : null;

  // Handle success and error callbacks
  useEffect(() => {
    if (data && onSuccess) {
      onSuccess(data);
    }
  }, [data, onSuccess]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Connection status management
  useEffect(() => {
    const handleOnline = () => {
      // Refetch when coming back online
      if (enabled && incidentId) {
        refetch();
      }
    };

    const handleOffline = () => {
      // Handle offline scenario - could show offline indicator
      console.log('Device went offline - using cached gap analysis data');
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, incidentId, refetch]);

  return {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    isRefetching,
    lastUpdated,
    refetch,
    invalidate
  };
}

export type { GapAnalysisSummaryData, UseGapAnalysisRealtimeOptions, UseGapAnalysisRealtimeReturn };
export default useGapAnalysisRealtime;
