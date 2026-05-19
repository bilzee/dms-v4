import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export interface DonorMetrics {
  donorId: string;
  donorName: string;
  donorEmail: string;
  donorSince: Date;
  metrics: {
    commitments: {
      total: number;
      available: number;
      fulfilled: number;
      totalItems: number;
      fulfillmentRate: number;
    };
    responses: {
      total: number;
      verified: number;
      rejected: number;
      pending: number;
      autoVerified: number;
      verificationRate: number;
    };
    combined: {
      totalActivities: number;
      verifiedActivities: number;
      overallSuccessRate: number;
    };
  };
}

export interface DonorMetricsResponse {
  overall: {
    totalDonors: number;
    totalCommitments: number;
    totalResponses: number;
    averageVerificationRate: number;
    totalVerifiedResponses: number;
    topPerformers: Array<{
      donorName: string;
      successRate: number;
      verifiedActivities: number;
      totalActivities: number;
      responseVerificationRate: number;
      totalCommitments: number;
    }>;
  };
  donors: DonorMetrics[];
  trends: Array<{
    date: string;
    newDonors: number;
  }>;
  topDonors: Array<{
    id: string;
    name: string;
    contactEmail: string;
    _count: {
      commitments: number;
    };
  }>;
  responseVerificationStats: Record<string, number>;
}

export function useDonorMetrics(params?: {
  dateRange?: '7d' | '30d' | '90d';
  donorId?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.dateRange) {
    searchParams.set('dateRange', params.dateRange);
  }
  if (params?.donorId) {
    searchParams.set('donorId', params.donorId);
  }

  return useQuery({
    queryKey: ['donor-metrics', params],
    queryFn: async () => {
      const url = `/api/v1/donors/metrics${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const result = await apiGet<DonorMetricsResponse>(url);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch donor metrics');
      }
      
      return result.data!;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for verified badge display logic
export function useVerifiedBadgeDisplay(donorId?: string) {
  const { data: donorMetrics } = useDonorMetrics({ donorId });
  
  if (!donorId || !donorMetrics?.donors.length) {
    return {
      showVerifiedBadge: false,
      verificationMethod: null,
      totalVerified: 0,
      totalActivities: 0
    };
  }

  const donor = donorMetrics.donors.find(d => d.donorId === donorId);
  if (!donor) {
    return {
      showVerifiedBadge: false,
      verificationMethod: null,
      totalVerified: 0,
      totalActivities: 0
    };
  }

  const hasVerifiedResponses = donor.metrics.responses.verified > 0;
  const hasAutoVerifiedResponses = donor.metrics.responses.autoVerified > 0;
  const hasFulfilledCommitments = donor.metrics.commitments.fulfilled > 0;
  
  const totalVerified = donor.metrics.combined.verifiedActivities;
  const totalActivities = donor.metrics.combined.totalActivities;
  
  // Show verified badge if donor has any verified activities
  const showVerifiedBadge = hasVerifiedResponses || hasAutoVerifiedResponses || hasFulfilledCommitments;
  
  // Determine verification method
  let verificationMethod: 'manual' | 'auto' | null = null;
  if (hasAutoVerifiedResponses && !hasVerifiedResponses) {
    verificationMethod = 'auto';
  } else if (hasVerifiedResponses || hasFulfilledCommitments) {
    verificationMethod = 'manual';
  }

  return {
    showVerifiedBadge,
    verificationMethod,
    totalVerified,
    totalActivities,
    verificationRate: donor.metrics.combined.overallSuccessRate,
    metrics: donor.metrics
  };
}
