import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { getAuthToken } from '@/lib/auth/token-utils';

export interface CoordinatorActionItem {
  id: string;
  actionType: 'verify-assessment' | 'verify-response' | 'verify-delivery' | 'need-assessor' | 'need-responder';
  entityId: string;
  entityType: string;
  entityName: string;
  entity: {
    id: string;
    name: string;
    type: string;
    location: string | null;
    coordinates: unknown;
  };
  type: string;
  priority: string;
  signalReason: string;
  description: string;
  context: Record<string, any>;
  createdAt: string;
}

export interface CoordinatorActionGroup {
  entityId: string;
  entityName: string;
  entityType: string;
  entityLocation: string | null;
  entityCoordinates: unknown;
  type: string;
  signals: CoordinatorActionItem[];
  count: number;
  highestPriority: string;
}

export function useCoordinatorActions(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['coordinator-action-items'],
    queryFn: async () => {
      const result = await apiGet<any>('/api/v1/coordinator/dashboard/action-items');
      if (!result.success) {
        throw new Error((result as any).error || 'Failed to fetch coordinator actions');
      }
      return (result as any).data as {
        items: CoordinatorActionItem[];
        groups: CoordinatorActionGroup[];
        totalCount: number;
        unresolvedCount: number;
        criticalCount: number;
      };
    },
    staleTime: 15000,
    refetchInterval: 30000,
    enabled: options.enabled !== false && !!getAuthToken(),
  });
}
