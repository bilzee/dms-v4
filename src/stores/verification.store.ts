import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

export interface QueueMetrics {
  averageWaitTime: number;
  verificationRate: number;
  oldestPending: string | null;
}

export interface QueueDepth {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface VerificationFilters {
  status: string[];
  entityId?: string;
  assessmentType?: string[];
  priority?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy: string;
  sortOrder: string;
  search?: string;
  assessorId?: string;
  responderId?: string;
}

export interface VerificationQueueItem {
  id: string;
  rapidAssessmentType?: string;
  rapidAssessmentDate?: string;
  verificationStatus: string;
  priority: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  entity: {
    id: string;
    name: string;
    type: string;
    location?: string;
  };
  assessor?: {
    id: string;
    name: string;
    email: string;
  };
  responder?: {
    id: string;
    name: string;
    email: string;
  };
  // Delivery specific fields
  status?: string;
  responseDate?: string;
  plannedDate?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  rejectionFeedback?: string;
}

export interface VerificationQueueState {
  // Assessment Queue State
  assessments: VerificationQueueItem[];
  assessmentLoading: boolean;
  assessmentError: string | null;
  assessmentPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  assessmentFilters: VerificationFilters;
  assessmentQueueDepth: QueueDepth;
  assessmentMetrics: QueueMetrics;

  // Delivery Queue State
  deliveries: VerificationQueueItem[];
  deliveryLoading: boolean;
  deliveryError: string | null;
  deliveryPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  deliveryFilters: VerificationFilters;
  deliveryQueueDepth: QueueDepth;
  deliveryMetrics: QueueMetrics;

  // Real-time State
  isRealTimeEnabled: boolean;
  lastUpdate: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  
  // Actions
  setAssessments: (assessments: VerificationQueueItem[]) => void;
  setAssessmentsLoading: (loading: boolean) => void;
  setAssessmentsError: (error: string | null) => void;
  setAssessmentPagination: (pagination: Partial<{ page: number; limit: number; total: number; totalPages: number }>) => void;
  setAssessmentFilters: (filters: Partial<VerificationFilters>) => void;
  setAssessmentQueueDepth: (depth: QueueDepth) => void;
  setAssessmentMetrics: (metrics: QueueMetrics) => void;

  setDeliveries: (deliveries: VerificationQueueItem[]) => void;
  setDeliveriesLoading: (loading: boolean) => void;
  setDeliveriesError: (error: string | null) => void;
  setDeliveryPagination: (pagination: Partial<{ page: number; limit: number; total: number; totalPages: number }>) => void;
  setDeliveryFilters: (filters: Partial<VerificationFilters>) => void;
  setDeliveryQueueDepth: (depth: QueueDepth) => void;
  setDeliveryMetrics: (metrics: QueueMetrics) => void;

  setRealTimeEnabled: (enabled: boolean) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting' | 'error') => void;
  updateLastUpdate: () => void;
  
  // Refresh actions
  refreshAssessments: () => Promise<void>;
  refreshDeliveries: () => Promise<void>;
  refreshAll: () => Promise<void>;

  // Utility actions
  clearAssessmentFilters: () => void;
  clearDeliveryFilters: () => void;
  getAssessmentFiltersCount: () => number;
  getDeliveryFiltersCount: () => number;
}

const defaultFilters: VerificationFilters = {
  status: ['SUBMITTED'],
  sortBy: 'rapidAssessmentDate',
  sortOrder: 'desc'
};

const defaultQueueDepth: QueueDepth = {
  total: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0
};

const defaultMetrics: QueueMetrics = {
  averageWaitTime: 0,
  verificationRate: 0,
  oldestPending: null
};

export const useVerificationStore = create<VerificationQueueState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    assessments: [],
    assessmentLoading: false,
    assessmentError: null,
    assessmentPagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    },
    assessmentFilters: { ...defaultFilters },
    assessmentQueueDepth: { ...defaultQueueDepth },
    assessmentMetrics: { ...defaultMetrics },

    deliveries: [],
    deliveryLoading: false,
    deliveryError: null,
    deliveryPagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    },
    deliveryFilters: { ...defaultFilters },
    deliveryQueueDepth: { ...defaultQueueDepth },
    deliveryMetrics: { ...defaultMetrics },

    isRealTimeEnabled: false,
    lastUpdate: null,
    connectionStatus: 'connected',

    // Assessment Queue Actions
    setAssessments: (assessments) => set({ assessments }),
    setAssessmentsLoading: (loading) => set({ assessmentLoading: loading }),
    setAssessmentsError: (error) => set({ assessmentError: error }),
    setAssessmentPagination: (pagination) => set((state) => ({
      assessmentPagination: { ...state.assessmentPagination, ...pagination }
    })),
    setAssessmentFilters: (filters) => set((state) => ({
      assessmentFilters: { ...state.assessmentFilters, ...filters }
    })),
    setAssessmentQueueDepth: (depth) => set({ assessmentQueueDepth: depth }),
    setAssessmentMetrics: (metrics) => set({ assessmentMetrics: metrics }),

    // Delivery Queue Actions
    setDeliveries: (deliveries) => set({ deliveries }),
    setDeliveriesLoading: (loading) => set({ deliveryLoading: loading }),
    setDeliveriesError: (error) => set({ deliveryError: error }),
    setDeliveryPagination: (pagination) => set((state) => ({
      deliveryPagination: { ...state.deliveryPagination, ...pagination }
    })),
    setDeliveryFilters: (filters) => set((state) => ({
      deliveryFilters: { ...state.deliveryFilters, ...filters }
    })),
    setDeliveryQueueDepth: (depth) => set({ deliveryQueueDepth: depth }),
    setDeliveryMetrics: (metrics) => set({ deliveryMetrics: metrics }),

    // Real-time Actions
    setRealTimeEnabled: (enabled) => set({ isRealTimeEnabled: enabled }),
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    updateLastUpdate: () => set({ lastUpdate: new Date().toISOString() }),

    // Real-time update methods
    updateAssessmentInQueue: (updatedAssessment: VerificationQueueItem) => set((state) => ({
      assessments: state.assessments.map(a => 
        a.id === updatedAssessment.id ? { ...a, ...updatedAssessment } : a
      )
    })),

    updateDeliveryInQueue: (updatedDelivery: VerificationQueueItem) => set((state) => ({
      deliveries: state.deliveries.map(d => 
        d.id === updatedDelivery.id ? { ...d, ...updatedDelivery } : d
      )
    })),

    addAssessmentToQueue: (newAssessment: VerificationQueueItem) => set((state) => ({
      assessments: [newAssessment, ...state.assessments],
      assessmentQueueDepth: {
        ...state.assessmentQueueDepth,
        total: state.assessmentQueueDepth.total + 1
      }
    })),

    addDeliveryToQueue: (newDelivery: VerificationQueueItem) => set((state) => ({
      deliveries: [newDelivery, ...state.deliveries],
      deliveryQueueDepth: {
        ...state.deliveryQueueDepth,
        total: state.deliveryQueueDepth.total + 1
      }
    })),

    removeAssessmentFromQueue: (assessmentId: string) => set((state) => ({
      assessments: state.assessments.filter(a => a.id !== assessmentId),
      assessmentQueueDepth: {
        ...state.assessmentQueueDepth,
        total: Math.max(0, state.assessmentQueueDepth.total - 1)
      }
    })),

    removeDeliveryFromQueue: (deliveryId: string) => set((state) => ({
      deliveries: state.deliveries.filter(d => d.id !== deliveryId),
      deliveryQueueDepth: {
        ...state.deliveryQueueDepth,
        total: Math.max(0, state.deliveryQueueDepth.total - 1)
      }
    })),

    // Batch updates for performance
    batchUpdateQueue: (updates: {
      assessments?: VerificationQueueItem[];
      deliveries?: VerificationQueueItem[];
      assessmentQueueDepth?: QueueDepth;
      deliveryQueueDepth?: QueueDepth;
      assessmentMetrics?: QueueMetrics;
      deliveryMetrics?: QueueMetrics;
    }) => set((state) => ({
      ...(updates.assessments && { assessments: updates.assessments }),
      ...(updates.deliveries && { deliveries: updates.deliveries }),
      ...(updates.assessmentQueueDepth && { assessmentQueueDepth: updates.assessmentQueueDepth }),
      ...(updates.deliveryQueueDepth && { deliveryQueueDepth: updates.deliveryQueueDepth }),
      ...(updates.assessmentMetrics && { assessmentMetrics: updates.assessmentMetrics }),
      ...(updates.deliveryMetrics && { deliveryMetrics: updates.deliveryMetrics }),
      lastUpdate: new Date().toISOString()
    })),

    // Refresh Actions
    refreshAssessments: async () => {
      const { assessmentFilters, assessmentPagination } = get();
      set({ assessmentLoading: true, assessmentError: null });
      
      try {
        const searchParams: Record<string, string> = {
          page: assessmentPagination.page.toString(),
          limit: assessmentPagination.limit.toString()
        };

        // Add non-array filters
        Object.entries(assessmentFilters).forEach(([key, value]) => {
          if (!Array.isArray(value) && value !== undefined && value !== null) {
            searchParams[key] = value.toString();
          }
        });

        const params = new URLSearchParams(searchParams);

        // Add array filters as comma-separated strings
        Object.entries(assessmentFilters).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            params.set(key, value.join(','));
          }
        });

        const response = await fetch(`/api/v1/verification/queue/assessments?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
          set({
            assessments: data.data,
            assessmentPagination: data.pagination,
            assessmentQueueDepth: data.queueDepth,
            assessmentMetrics: data.metrics,
            lastUpdate: new Date().toISOString()
          });
        } else {
          throw new Error(data.error || 'Failed to fetch assessments');
        }
      } catch (error) {
        set({ 
          assessmentError: error instanceof Error ? error.message : 'Unknown error',
          connectionStatus: 'error'
        });
      } finally {
        set({ assessmentLoading: false });
      }
    },

    refreshDeliveries: async () => {
      const { deliveryFilters, deliveryPagination } = get();
      set({ deliveryLoading: true, deliveryError: null });
      
      try {
        const searchParams: Record<string, string> = {
          page: deliveryPagination.page.toString(),
          limit: deliveryPagination.limit.toString()
        };

        // Add non-array filters
        Object.entries(deliveryFilters).forEach(([key, value]) => {
          if (!Array.isArray(value) && value !== undefined && value !== null) {
            searchParams[key] = value.toString();
          }
        });

        const params = new URLSearchParams(searchParams);

        // Add array filters as comma-separated strings
        Object.entries(deliveryFilters).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            params.set(key, value.join(','));
          }
        });

        const response = await fetch(`/api/v1/verification/queue/deliveries?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
          set({
            deliveries: data.data,
            deliveryPagination: data.pagination,
            deliveryQueueDepth: data.queueDepth,
            deliveryMetrics: data.metrics,
            lastUpdate: new Date().toISOString()
          });
        } else {
          throw new Error(data.error || 'Failed to fetch deliveries');
        }
      } catch (error) {
        set({ 
          deliveryError: error instanceof Error ? error.message : 'Unknown error',
          connectionStatus: 'error'
        });
      } finally {
        set({ deliveryLoading: false });
      }
    },

    refreshAll: async () => {
      await Promise.all([
        get().refreshAssessments(),
        get().refreshDeliveries()
      ]);
    },

    // Utility Actions
    clearAssessmentFilters: () => set({ 
      assessmentFilters: { ...defaultFilters },
      assessmentPagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    }),
    
    clearDeliveryFilters: () => set({ 
      deliveryFilters: { ...defaultFilters },
      deliveryPagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    }),

    getAssessmentFiltersCount: () => {
      const { assessmentFilters } = get();
      let count = 0;
      
      // Count non-default filters
      if (assessmentFilters.status.length !== 1 || assessmentFilters.status[0] !== 'SUBMITTED') count++;
      if (assessmentFilters.entityId) count++;
      if (assessmentFilters.assessmentType && assessmentFilters.assessmentType.length > 0) count++;
      if (assessmentFilters.priority && assessmentFilters.priority.length > 0) count++;
      if (assessmentFilters.dateFrom) count++;
      if (assessmentFilters.dateTo) count++;
      if (assessmentFilters.search) count++;
      if (assessmentFilters.assessorId) count++;
      
      return count;
    },

    getDeliveryFiltersCount: () => {
      const { deliveryFilters } = get();
      let count = 0;
      
      // Count non-default filters
      if (deliveryFilters.status.length !== 1 || deliveryFilters.status[0] !== 'SUBMITTED') count++;
      if (deliveryFilters.entityId) count++;
      if (deliveryFilters.assessmentType && deliveryFilters.assessmentType.length > 0) count++;
      if (deliveryFilters.priority && deliveryFilters.priority.length > 0) count++;
      if (deliveryFilters.dateFrom) count++;
      if (deliveryFilters.dateTo) count++;
      if (deliveryFilters.search) count++;
      if (deliveryFilters.responderId) count++;
      
      return count;
    }
  }))
);

// Selectors for optimized component usage
export const useAssessmentQueue = () => {
  return useVerificationStore(
    (state) => ({
      items: state.assessments,
      loading: state.assessmentLoading,
      error: state.assessmentError,
      pagination: state.assessmentPagination,
      filters: state.assessmentFilters,
      queueDepth: state.assessmentQueueDepth,
      metrics: state.assessmentMetrics,
      refresh: state.refreshAssessments,
      setFilters: state.setAssessmentFilters,
      clearFilters: state.clearAssessmentFilters,
      getFiltersCount: state.getAssessmentFiltersCount
    }),
    shallow
  );
};

export const useDeliveryQueue = () => {
  return useVerificationStore(
    (state) => ({
      items: state.deliveries,
      loading: state.deliveryLoading,
      error: state.deliveryError,
      pagination: state.deliveryPagination,
      filters: state.deliveryFilters,
      queueDepth: state.deliveryQueueDepth,
      metrics: state.deliveryMetrics,
      refresh: state.refreshDeliveries,
      setFilters: state.setDeliveryFilters,
      clearFilters: state.clearDeliveryFilters,
      getFiltersCount: state.getDeliveryFiltersCount
    }),
    shallow
  );
};

export const useRealTimeStatus = () => {
  return useVerificationStore(
    (state) => ({
      isEnabled: state.isRealTimeEnabled,
      status: state.connectionStatus,
      lastUpdate: state.lastUpdate,
      setEnabled: state.setRealTimeEnabled,
      setStatus: state.setConnectionStatus
    }),
    shallow
  );
};