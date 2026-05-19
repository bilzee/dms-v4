import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
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
      return result.data!;
    },
    enabled: !!localStorage.getItem('auth_token'),
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
    onSuccess: () => {
      // Invalidate and refetch verification queue
      queryClient.invalidateQueries({ queryKey: ['response-verification-queue'] });
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
    onSuccess: () => {
      // Invalidate and refetch verification queue
      queryClient.invalidateQueries({ queryKey: ['response-verification-queue'] });
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
