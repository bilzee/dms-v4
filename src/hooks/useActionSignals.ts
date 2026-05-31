import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { getAuthToken } from '@/lib/auth/token-utils';
import { offlineDB } from '@/lib/db/offline';
import type { ActionSignalItem, SignalGroup, SignalListResponse } from '@/types/action-signal';
import type { SignalReason, SignalPriority } from '@/types/action-signal';

interface UseActionSignalsOptions {
  priority?: SignalPriority;
  signalReason?: SignalReason;
  activeRole?: string;
  entityId?: string;
  incidentId?: string;
  type?: string;
  unresolvedOnly?: boolean;
  grouped?: boolean;
  page?: number;
  limit?: number;
  refetchInterval?: number;
  enabled?: boolean;
}

interface ActionSignalsResult {
  signals: ActionSignalItem[];
  groups: SignalGroup[];
  totalCount: number;
  unresolvedCount: number;
  criticalCount: number;
}

function getCachedUserId(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function readOfflineSignals(): Promise<ActionSignalsResult> {
  const userId = getCachedUserId();
  if (!userId) {
    return { signals: [], groups: [], totalCount: 0, unresolvedCount: 0, criticalCount: 0 };
  }

  const signals = await offlineDB.getCachedSignals(userId);

  const criticalCount = signals.filter(
    s => s.priority === 'CRITICAL' && !s.resolvedAt
  ).length;

  return {
    signals,
    groups: [],
    totalCount: signals.length,
    unresolvedCount: signals.filter(s => !s.resolvedAt).length,
    criticalCount,
  };
}

export function useActionSignals(options: UseActionSignalsOptions = {}) {
  const {
    priority,
    signalReason,
    activeRole,
    entityId,
    incidentId,
    type,
    unresolvedOnly = true,
    grouped = false,
    page = 1,
    limit = 50,
    refetchInterval = 30000,
    enabled = true,
  } = options;

  return useQuery<ActionSignalsResult>({
    queryKey: ['action-signals', { priority, signalReason, activeRole, entityId, incidentId, type, unresolvedOnly, grouped, page, limit }],
    queryFn: async () => {
      if (!navigator.onLine) {
        return readOfflineSignals();
      }

      try {
        const params = new URLSearchParams();
        if (priority) params.append('priority', priority);
        if (signalReason) params.append('signalReason', signalReason);
        if (activeRole) params.append('activeRole', activeRole);
        if (entityId) params.append('entityId', entityId);
        if (incidentId) params.append('incidentId', incidentId);
        if (type) params.append('type', type);
        params.append('unresolvedOnly', String(unresolvedOnly));
        params.append('grouped', String(grouped));
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        const result = await apiGet<SignalListResponse>(`/api/v1/action-signals?${params}`);
        if (!result.success) {
          throw new Error((result as any).error || 'Failed to fetch action signals');
        }
        const data = (result as any).data as ActionSignalsResult;

        const userId = getCachedUserId();
        if (userId && data?.signals) {
          offlineDB.cacheSignals(data.signals, userId).catch(() => {});
        }

        return data;
      } catch {
        return readOfflineSignals();
      }
    },
    staleTime: 15000,
    refetchInterval: navigator.onLine ? refetchInterval : false,
    enabled: enabled && !!getAuthToken(),
  });
}

export function useInvalidateActionSignals() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['action-signals'] });
  };
}
