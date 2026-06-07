'use client';

import { useEffect, useCallback } from 'react';
import { useOfflineStore } from '@/stores/offline.store';
import { offlineDB } from '@/lib/db/offline';

export interface OfflineOperation {
  type: 'assessment' | 'response' | 'entity';
  action: 'create' | 'update' | 'delete';
  data: any;
  entityUuid: string;
  priority?: number;
}

export const useOffline = () => {
  const {
    isOnline,
    isConnecting,
    syncQueue,
    isSyncing,
    syncProgress,
    pendingOperations,
    setOnlineStatus,
    addToSyncQueue,
    removeFromSyncQueue,
    startSync,
    stopSync,
    setSyncProgress,
    refreshSyncQueue,
    clearOfflineData,
    getStorageInfo
  } = useOfflineStore();

  // Initialize offline database
  useEffect(() => {
    const initDatabase = async () => {
      try {
        await offlineDB.initializeEncryption();
        await refreshSyncQueue();
      } catch (error) {
        console.error('Failed to initialize offline database:', error);
      }
    };

    initDatabase();
  }, [refreshSyncQueue]);

  // Queue an operation for offline processing
  const queueOperation = useCallback(async (operation: OfflineOperation) => {
    try {
      await addToSyncQueue({
        type: operation.type,
        action: operation.action,
        entityUuid: operation.entityUuid,
        priority: operation.priority || 5,
        attempts: 0
      });

      // Store the actual data in IndexedDB based on type
      switch (operation.type) {
        case 'assessment':
          if (operation.action === 'create') {
            await offlineDB.addAssessment({
              uuid: operation.entityUuid,
              ...operation.data,
              syncStatus: 'pending'
            });
          } else if (operation.action === 'update') {
            await offlineDB.updateAssessment(operation.entityUuid, {
              ...operation.data,
              syncStatus: 'pending'
            });
          }
          break;
        
        case 'response':
          if (operation.action === 'create') {
            await offlineDB.addResponse({
              uuid: operation.entityUuid,
              ...operation.data,
              syncStatus: 'pending'
            });
          }
          break;
        
        case 'entity':
          if (operation.action === 'create') {
            await offlineDB.addEntity({
              uuid: operation.entityUuid,
              ...operation.data,
              syncStatus: 'pending'
            });
          }
          break;
      }

      // Auto-sync will be triggered by useEffect
    } catch (error) {
      console.error('Failed to queue operation:', error);
      throw error;
    }
  }, [addToSyncQueue]);

  // Sync is now handled by SyncEngine (src/lib/sync/engine.ts)
  // This stub is disabled to prevent silent data loss
  const syncData = useCallback(async () => {
    console.warn('useOffline.syncData() is deprecated. SyncEngine handles sync automatically.');
  }, []);

  // Get offline assessment by UUID
  const getOfflineAssessment = useCallback(async (uuid: string) => {
    try {
      return await offlineDB.getAssessment(uuid);
    } catch (error) {
      console.error('Failed to get offline assessment:', error);
      return null;
    }
  }, []);

  // Get offline response by UUID
  const getOfflineResponse = useCallback(async (uuid: string) => {
    try {
      return await offlineDB.getResponse(uuid);
    } catch (error) {
      console.error('Failed to get offline response:', error);
      return null;
    }
  }, []);

  // Get offline entity by UUID
  const getOfflineEntity = useCallback(async (uuid: string) => {
    try {
      return await offlineDB.getEntity(uuid);
    } catch (error) {
      console.error('Failed to get offline entity:', error);
      return null;
    }
  }, []);

  // Check if app is working offline
  const isWorkingOffline = useCallback(() => {
    return !isOnline || pendingOperations > 0;
  }, [isOnline, pendingOperations]);

  // Get storage statistics
  const getOfflineStats = useCallback(async () => {
    try {
      return await getStorageInfo();
    } catch (error) {
      console.error('Failed to get offline stats:', error);
      return null;
    }
  }, [getStorageInfo]);

  // Clear all offline data
  const clearOfflineStorage = useCallback(async () => {
    try {
      await clearOfflineData();
    } catch (error) {
      console.error('Failed to clear offline storage:', error);
      throw error;
    }
  }, [clearOfflineData]);

  // Auto-sync is now handled by SyncEngine (src/lib/sync/engine.ts)
  // SyncEngine.listenConnectivityChange() triggers sync on reconnection

  return {
    // State
    isOnline,
    isConnecting,
    isSyncing,
    syncProgress,
    pendingOperations,
    syncQueue,
    
    // Operations
    queueOperation,
    syncData,
    
    // Data access
    getOfflineAssessment,
    getOfflineResponse,
    getOfflineEntity,
    
    // Utilities
    isWorkingOffline,
    getOfflineStats,
    clearOfflineStorage,
    refreshSyncQueue
  };
};