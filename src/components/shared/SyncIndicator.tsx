'use client';

import { useEffect } from 'react';
import { useOfflineStore } from '@/stores/offline.store';

export const SyncIndicator = () => {
  const {
    syncQueue,
    isSyncing,
    syncProgress,
    pendingOperations,
    refreshSyncQueue,
    isOnline
  } = useOfflineStore();

  useEffect(() => {
    // Refresh sync queue on component mount
    refreshSyncQueue();
  }, [refreshSyncQueue]);

  const getSyncIcon = () => {
    if (isSyncing) {
      return (
        <div className="animate-spin">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
        </div>
      );
    }

    if (pendingOperations > 0) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17l6.09-6.09L17.5 9.5 10 17z"/>
      </svg>
    );
  };

  const getSyncText = () => {
    if (isSyncing) {
      return `Syncing... ${Math.round(syncProgress)}%`;
    }

    if (pendingOperations > 0) {
      return `${pendingOperations} pending`;
    }

    if (!isOnline) {
      return 'Offline';
    }

    return 'Synced';
  };

  const getSyncColor = () => {
    if (isSyncing) return 'text-blue-600 dark:text-blue-400';
    if (pendingOperations > 0) return isOnline ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground';
    if (!isOnline) return 'text-muted-foreground';
    return 'text-green-600 dark:text-green-400';
  };

  const getBgColor = () => {
    if (isSyncing) return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
    if (pendingOperations > 0) return isOnline ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800' : 'bg-muted border-border';
    if (!isOnline) return 'bg-muted border-border';
    return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
  };

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getSyncColor()} ${getBgColor()}`}
      data-testid="sync-indicator"
    >
      {getSyncIcon()}
      <span className="text-sm font-medium">
        {getSyncText()}
      </span>
      
      {isSyncing && syncProgress > 0 && (
        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300 ease-out"
            style={{ width: `${syncProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};