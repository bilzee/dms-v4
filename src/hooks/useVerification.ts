import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api';
import { getAuthToken } from '@/lib/auth/token-utils';
import type { 
  VerificationQueueResponse, 
  VerificationQueueFilters,
  VerifyAssessmentRequest,
  RejectAssessmentRequest,
  VerificationMetrics 
} from '@/types/verification';

// Hook for verification queue
export function useVerificationQueue(
  filters: VerificationQueueFilters & { page?: number; limit?: number } = {}
) {
  return useQuery({
    queryKey: ['verification-queue', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.entityId) params.append('entityId', filters.entityId);
      if (filters.assessmentType) params.append('assessmentType', filters.assessmentType);

      const result = await apiGet<VerificationQueueResponse>(`/api/v1/verification/queue/assessments?${params}`);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch verification queue');
      }
      const { success, ...response } = result as any;
      return response as unknown as VerificationQueueResponse;
    },
    staleTime: 30000, // 30 seconds - refresh frequently for real-time updates
    refetchInterval: 60000, // Auto-refresh every minute
    enabled: !!getAuthToken(),
  });
}

// Hook for verification actions
export function useVerificationActions() {
  const queryClient = useQueryClient();
  
  const verifyMutation = useMutation({
    mutationFn: async ({ assessmentId, data }: { assessmentId: string; data: VerifyAssessmentRequest }) => {
      const result = await apiPost(`/api/v1/assessments/${assessmentId}/verify`, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to verify assessment');
      }
      return result;
    },
    onSuccess: (data) => {
      // Invalidate and refetch verification queue
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
      
      toast.success('Assessment verified successfully', {
        description: `Assessment for ${data.data.entity?.name} has been approved.`
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to verify assessment', {
        description: error.message
      });
    },
  });
  
  const rejectMutation = useMutation({
    mutationFn: async ({ assessmentId, data }: { assessmentId: string; data: RejectAssessmentRequest }) => {
      const result = await apiPost(`/api/v1/assessments/${assessmentId}/reject`, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject assessment');
      }
      return result;
    },
    onSuccess: (data) => {
      // Invalidate and refetch verification queue
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
      
      toast.success('Assessment rejected', {
        description: `Assessment for ${data.data.entity?.name} has been rejected.`
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to reject assessment', {
        description: error.message
      });
    },
  });
  
  return {
    verifyAssessment: verifyMutation.mutate,
    rejectAssessment: rejectMutation.mutate,
    isVerifying: verifyMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isLoading: verifyMutation.isPending || rejectMutation.isPending,
  };
}

// Hook for verification metrics (dashboard overview)
export function useVerificationMetrics() {
  return useQuery({
    queryKey: ['verification-metrics'],
    queryFn: async (): Promise<VerificationMetrics> => {
      const result = await apiGet<{ metrics: VerificationMetrics }>('/api/v1/verification/metrics');
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch verification metrics');
      }
      return result.data!.metrics;
    },
    staleTime: 300000, // 5 minutes
    refetchInterval: 300000, // Auto-refresh every 5 minutes
    enabled: !!getAuthToken(),
  });
}

// Hook for real-time verification updates (WebSocket or polling)
export function useVerificationUpdates() {
  const queryClient = useQueryClient();
  
  // For now, using polling - can be enhanced with WebSocket later
  useQuery({
    queryKey: ['verification-updates'],
    queryFn: async () => {
      // Check for updates and invalidate queries if needed
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
      queryClient.invalidateQueries({ queryKey: ['verification-metrics'] });
      return null;
    },
    refetchInterval: 30000, // Poll every 30 seconds
    enabled: true,
  });
}

// Hook for bulk verification actions
export function useBulkVerificationActions() {
  const queryClient = useQueryClient();
  
  const bulkVerifyMutation = useMutation({
    mutationFn: async (assessmentIds: string[]) => {
      const promises = assessmentIds.map(id => {
        const result = apiPost(`/api/v1/assessments/${id}/verify`, { notes: 'Bulk verification' });
        return result;
      });
      return Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
      
      toast.success(`Successfully verified ${data.length} assessments`, {
        description: 'All selected assessments have been approved.'
      });
    },
    onError: (error: Error) => {
      toast.error('Bulk verification failed', {
        description: error.message
      });
    },
  });
  
  return {
    bulkVerify: bulkVerifyMutation.mutate,
    isBulkVerifying: bulkVerifyMutation.isPending,
  };
}

// Custom hook for verification queue filters management
export function useVerificationFilters() {
  const [filters, setFilters] = useState<VerificationQueueFilters>({
    status: 'SUBMITTED', // Default to pending verification
  });
  
  const updateFilter = (key: keyof VerificationQueueFilters, value: string | string[] | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const clearFilters = () => {
    setFilters({ status: 'SUBMITTED' });
  };
  
  const resetToDefaults = () => {
    setFilters({ status: 'SUBMITTED' });
  };
  
  return {
    filters,
    updateFilter,
    clearFilters,
    resetToDefaults,
    setFilters
  };
}
