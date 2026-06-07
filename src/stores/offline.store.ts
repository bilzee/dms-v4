import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { offlineDB } from '@/lib/db/offline';

export interface SyncQueueItem {
  uuid: string;
  type: 'assessment' | 'response' | 'entity';
  action: 'create' | 'update' | 'delete';
  entityUuid: string;
  data?: any;
  priority: number;
  attempts: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  error?: string;
  timestamp: Date;
}

interface OfflineState {
  // Connection status
  isOnline: boolean;
  isConnecting: boolean;
  lastOnline?: Date;
  
  // Sync queue
  syncQueue: SyncQueueItem[];
  isSyncing: boolean;
  syncProgress: number;
  lastSyncAttempt?: Date;
  lastSuccessfulSync?: Date;
  
  // Offline operations counter
  pendingOperations: number;
  
  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  setConnecting: (isConnecting: boolean) => void;
  
  // Sync queue management
  addToSyncQueue: (item: Omit<SyncQueueItem, 'uuid' | 'timestamp'>) => Promise<void>;
  removeFromSyncQueue: (uuid: string) => Promise<void>;
  updateSyncQueueItem: (uuid: string, updates: Partial<SyncQueueItem>) => Promise<void>;
  refreshSyncQueue: () => Promise<void>;
  
  // Sync operations
  startSync: () => void;
  stopSync: () => void;
  setSyncProgress: (progress: number) => void;
  incrementPendingOperations: () => void;
  decrementPendingOperations: () => void;
  
  // Utility
  clearOfflineData: () => Promise<void>;
  getStorageInfo: () => Promise<any>;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // Initial state - Use false to prevent hydration mismatch, will be updated in useEffect
      isOnline: false,
      isConnecting: false,
      syncQueue: [],
      isSyncing: false,
      syncProgress: 0,
      pendingOperations: 0,

      // Connection status actions
      setOnlineStatus: (isOnline: boolean) => {
        set((state) => ({
          isOnline,
          lastOnline: isOnline ? new Date() : state.lastOnline,
          isConnecting: false,
        }));
        
        // Auto-start sync when coming online
        if (isOnline && get().syncQueue.length > 0) {
          get().startSync();
        }
      },

      setConnecting: (isConnecting: boolean) => {
        set({ isConnecting });
      },

      // Sync queue management
      addToSyncQueue: async (item: Omit<SyncQueueItem, 'uuid' | 'timestamp'>) => {
        const uuid = crypto.randomUUID();
        const newItem: SyncQueueItem = {
          ...item,
          uuid,
          timestamp: new Date(),
        };
        
        try {
          await offlineDB.addToSyncQueue({
            ...newItem,
            data: (item as any).data || {}
          });
          
          // Update state
          set((state) => ({
            syncQueue: [...state.syncQueue, newItem],
            pendingOperations: state.pendingOperations + 1,
          }));
        } catch (error) {
          console.error('Failed to add to sync queue:', error);
        }
      },

      removeFromSyncQueue: async (uuid: string) => {
        try {
          await offlineDB.removeSyncQueueItem(uuid);
          set((state) => ({
            syncQueue: state.syncQueue.filter(item => item.uuid !== uuid),
            pendingOperations: Math.max(0, state.pendingOperations - 1),
          }));
        } catch (error) {
          console.error('Failed to remove from sync queue:', error);
        }
      },

      updateSyncQueueItem: async (uuid: string, updates: Partial<SyncQueueItem>) => {
        try {
          await offlineDB.updateSyncQueueItem(uuid, updates);
          set((state) => ({
            syncQueue: state.syncQueue.map(item =>
              item.uuid === uuid ? { ...item, ...updates } : item
            ),
          }));
        } catch (error) {
          console.error('Failed to update sync queue item:', error);
        }
      },

      refreshSyncQueue: async () => {
        try {
          const queueItems = await offlineDB.getSyncQueue();
          set({
            syncQueue: queueItems.map(item => ({
              uuid: item.uuid,
              type: item.type,
              action: item.action,
              entityUuid: item.entityUuid,
              priority: item.priority,
              attempts: item.attempts,
              lastAttempt: item.lastAttempt,
              nextRetry: item.nextRetry,
              error: item.error,
              timestamp: item.timestamp,
            })),
            pendingOperations: queueItems.length,
          });
        } catch (error) {
          console.error('Failed to refresh sync queue:', error);
        }
      },

      // Sync operations
      startSync: () => {
        set({
          isSyncing: true,
          syncProgress: 0,
          lastSyncAttempt: new Date(),
        });
      },

      stopSync: () => {
        set((state) => ({
          isSyncing: false,
          syncProgress: 0,
          lastSuccessfulSync: state.syncQueue.length === 0 ? new Date() : state.lastSuccessfulSync,
        }));
      },

      setSyncProgress: (progress: number) => {
        set({ syncProgress: Math.max(0, Math.min(100, progress)) });
      },

      incrementPendingOperations: () => {
        set((state) => ({
          pendingOperations: state.pendingOperations + 1,
        }));
      },

      decrementPendingOperations: () => {
        set((state) => ({
          pendingOperations: Math.max(0, state.pendingOperations - 1),
        }));
      },

      // Utility
      clearOfflineData: async () => {
        try {
          await offlineDB.clearAll();
          set({
            syncQueue: [],
            pendingOperations: 0,
            syncProgress: 0,
          });
        } catch (error) {
          console.error('Failed to clear offline data:', error);
        }
      },

      getStorageInfo: async () => {
        try {
          return await offlineDB.getStorageInfo();
        } catch (error) {
          console.error('Failed to get storage info:', error);
          return null;
        }
      },
    }),
    {
      name: 'offline-store',
      partialize: (state) => ({
        lastOnline: state.lastOnline,
        lastSyncAttempt: state.lastSyncAttempt,
        lastSuccessfulSync: state.lastSuccessfulSync,
        pendingOperations: state.pendingOperations,
      }),
    }
  )
);