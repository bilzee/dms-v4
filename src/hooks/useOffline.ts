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

  // Sync data with server
  const syncData = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    try {
      startSync();
      const queue = await offlineDB.getSyncQueue();
      
      if (queue.length === 0) {
        stopSync();
        return;
      }

      let completed = 0;
      const total = queue.length;

      for (const item of queue) {
        try {
          // TODO: Replace with actual API call to /api/v1/sync/batch when SyncService is implemented
          // Currently removes items from queue without server sync
          // See architecture docs for sync engine design
          
          // Remove from queue on success
          await removeFromSyncQueue(item.uuid);
          
          // Update sync status in local database
          switch (item.type) {
            case 'assessment':
              await offlineDB.updateAssessment(item.entityUuid, { syncStatus: 'synced' });
              break;
            case 'response':
              // Similar update for responses
              break;
            case 'entity':
              // Similar update for entities
              break;
          }
          
          completed++;
          setSyncProgress((completed / total) * 100);
          
        } catch (error) {
          console.error(`Failed to sync ${item.type}:`, error);
          // Update retry info for failed items
          // In production, implement exponential backoff
        }
      }

      stopSync();
    } catch (error) {
      console.error('Sync failed:', error);
      stopSync();
    }
  }, [isOnline, isSyncing, startSync, stopSync, setSyncProgress, removeFromSyncQueue]);

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

  // Auto-sync effect when connection comes back
  useEffect(() => {
    if (isOnline && !isSyncing && pendingOperations > 0) {
      syncData();
    }
  }, [isOnline, isSyncing, pendingOperations, syncData]);

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