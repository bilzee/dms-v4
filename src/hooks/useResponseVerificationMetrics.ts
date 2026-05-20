import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { getAuthToken } from '@/lib/auth/token-utils';

export interface ResponseVerificationMetrics {
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
  totalAutoVerified: number;
  verificationRate: number;
  rejectionRate: number;
  averageProcessingTime: number;
  pendingByType: Record<string, number>;
  verifiedByType: Record<string, number>;
  autoVerifiedByType: Record<string, number>;
  pendingByDonor: Record<string, number>;
  verifiedByDonor: Record<string, number>;
  dailyTrends: Array<{
    date: string;
    pending: number;
    verified: number;
    rejected: number;
    autoVerified: number;
  }>;
}

export function useResponseVerificationMetrics() {
  return useQuery({
    queryKey: ['response-verification-metrics'],
    queryFn: async () => {
      const result = await apiGet<ResponseVerificationMetrics>('/api/v1/verification/metrics/responses');
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch response verification metrics');
      }
      
      return result.data!;
    },
    enabled: !!getAuthToken(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
