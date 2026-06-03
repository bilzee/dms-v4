import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api';
import { getAuthToken } from '@/lib/auth/token-utils';
import type { 
  ResponseVerificationQueueResponse, 
  ResponseVerificationFilters,
  VerifyResponseRequest,
  RejectResponseRequest 
} from '@/types/response-verification';

interface UseResponseVerificationQueueParams extends ResponseVerificationFilters {
  page?: number;
  limit?: number;
}

export function useResponseVerificationQueue(params: UseResponseVerificationQueueParams = {}) {
  const {
    page = 1,
    limit = 10,
    ...filters
  } = params;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(filters.verificationStatus && { status: filters.verificationStatus }),
    ...(filters.entityId && { entityId: filters.entityId }),
    ...(filters.responseType && { type: filters.responseType }),
    ...(filters.donorId && { donorId: filters.donorId }),
  });

  return useQuery({
    queryKey: ['response-verification-queue', params],
    queryFn: async () => {
      const result = await apiGet<ResponseVerificationQueueResponse>(`/api/v1/verification/queue/responses?${queryParams}`);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch response verification queue');
      }
      const { success, ...response } = result as any;
      return response as unknown as ResponseVerificationQueueResponse;
    },
    enabled: !!getAuthToken(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useVerifyResponse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ responseId, data }: { responseId: string; data: VerifyResponseRequest }) => {
      const result = await apiPost(`/api/v1/responses/${responseId}/verify`, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to verify response');
      }
      return result.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['response-verification-queue'] });
      queryClient.invalidateQueries({ queryKey: ['verification-metrics'] });
      
      toast.success('Response verified successfully', {
        description: `Response for ${data?.entity?.name || 'entity'} has been approved.`
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to verify response', {
        description: error.message
      });
    },
  });
}

export function useRejectResponse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ responseId, data }: { responseId: string; data: RejectResponseRequest }) => {
      const result = await apiPost(`/api/v1/responses/${responseId}/reject`, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject response');
      }
      return result.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['response-verification-queue'] });
      queryClient.invalidateQueries({ queryKey: ['verification-metrics'] });
      
      toast.success('Response rejected', {
        description: `Response for ${data?.entity?.name || 'entity'} has been rejected.`
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to reject response', {
        description: error.message
      });
    },
  });
}

// Filters hook for response verification
export function useResponseVerificationFilters() {
  const [filters, setFilters] = useState<ResponseVerificationFilters>({});
  
  const updateFilter = (key: keyof ResponseVerificationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const clearFilters = () => {
    setFilters({});
  };
  
  return {
    filters,
    updateFilter,
    clearFilters,
  };
}
