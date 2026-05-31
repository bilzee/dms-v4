import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import type { ActionSignalItem, SignalGroup, SignalReason, SignalPriority } from '@/types/action-signal';
import { apiGet } from '@/lib/api';

interface ActionSignalFilters {
  priority?: SignalPriority;
  signalReason?: SignalReason;
  entityId?: string;
  incidentId?: string;
  type?: string;
  search?: string;
}

interface ActionSignalState {
  signals: ActionSignalItem[];
  groups: SignalGroup[];
  totalCount: number;
  unresolvedCount: number;
  criticalCount: number;
  loading: boolean;
  error: string | null;
  filters: ActionSignalFilters;
  selectedEntityId: string | null;
  expandedGroups: Set<string>;
  lastUpdated: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';

  setSignals: (signals: ActionSignalItem[]) => void;
  setGroups: (groups: SignalGroup[]) => void;
  setCounts: (total: number, unresolved: number, critical: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<ActionSignalFilters>) => void;
  clearFilters: () => void;
  setSelectedEntity: (entityId: string | null) => void;
  toggleGroup: (groupKey: string) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
  refresh: () => Promise<void>;
  addSignal: (signal: ActionSignalItem) => void;
  removeSignal: (signalId: string) => void;
  resolveSignal: (signalId: string) => void;
}

const defaultFilters: ActionSignalFilters = {};

export const useActionSignalStore = create<ActionSignalState>()(
  subscribeWithSelector((set, get) => ({
    signals: [],
    groups: [],
    totalCount: 0,
    unresolvedCount: 0,
    criticalCount: 0,
    loading: false,
    error: null,
    filters: { ...defaultFilters },
    selectedEntityId: null,
    expandedGroups: new Set<string>(),
    lastUpdated: null,
    connectionStatus: 'disconnected',

    setSignals: (signals) => set({ signals }),
    setGroups: (groups) => set({ groups }),
    setCounts: (total, unresolved, critical) =>
      set({ totalCount: total, unresolvedCount: unresolved, criticalCount: critical }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setFilters: (filters) =>
      set((state) => ({ filters: { ...state.filters, ...filters } })),
    clearFilters: () => set({ filters: { ...defaultFilters } }),
    setSelectedEntity: (entityId) => set({ selectedEntityId: entityId }),
    toggleGroup: (groupKey) =>
      set((state) => {
        const next = new Set(state.expandedGroups);
        if (next.has(groupKey)) next.delete(groupKey);
        else next.add(groupKey);
        return { expandedGroups: next };
      }),
    setConnectionStatus: (status) => set({ connectionStatus: status }),

    refresh: async () => {
      const { filters } = get();
      set({ loading: true, error: null });

      try {
        const params = new URLSearchParams();
        params.append('unresolvedOnly', 'true');
        params.append('grouped', 'true');
        params.append('page', '1');
        params.append('limit', '100');
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.signalReason) params.append('signalReason', filters.signalReason);
        if (filters.entityId) params.append('entityId', filters.entityId);
        if (filters.incidentId) params.append('incidentId', filters.incidentId);
        if (filters.type) params.append('type', filters.type);

        const result = await apiGet(`/api/v1/action-signals?${params}`);
        if (!result.success) {
          throw new Error((result as any).error || 'Failed to fetch signals');
        }

        const data = (result as any).data;
        set({
          signals: data.signals || [],
          groups: data.groups || [],
          totalCount: data.totalCount || 0,
          unresolvedCount: data.unresolvedCount || 0,
          criticalCount: data.criticalCount || 0,
          lastUpdated: new Date().toISOString(),
        });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        set({ loading: false });
      }
    },

    addSignal: (signal) =>
      set((state) => ({
        signals: [signal, ...state.signals],
        unresolvedCount: state.unresolvedCount + 1,
        totalCount: state.totalCount + 1,
        criticalCount: signal.priority === 'CRITICAL' ? state.criticalCount + 1 : state.criticalCount,
      })),

    removeSignal: (signalId) =>
      set((state) => ({
        signals: state.signals.filter((s) => s.id !== signalId),
        totalCount: Math.max(0, state.totalCount - 1),
        unresolvedCount: Math.max(0, state.unresolvedCount - 1),
      })),

    resolveSignal: (signalId) =>
      set((state) => ({
        signals: state.signals.map((s) =>
          s.id === signalId ? { ...s, resolvedAt: new Date() } : s
        ),
        unresolvedCount: Math.max(0, state.unresolvedCount - 1),
      })),
  }))
);

export const useActionSignalSummary = () => {
  return useActionSignalStore(
    (state) => ({
      totalCount: state.totalCount,
      unresolvedCount: state.unresolvedCount,
      criticalCount: state.criticalCount,
      loading: state.loading,
      error: state.error,
      lastUpdated: state.lastUpdated,
      connectionStatus: state.connectionStatus,
    }),
    shallow
  );
};

export const useActionSignalFilters = () => {
  return useActionSignalStore(
    (state) => ({
      filters: state.filters,
      selectedEntityId: state.selectedEntityId,
      setFilters: state.setFilters,
      clearFilters: state.clearFilters,
      setSelectedEntity: state.setSelectedEntity,
    }),
    shallow
  );
};
