'use client';

import { useEffect, useState } from 'react';
import { useSyncStore, useSyncStatus, useSyncQueue, useSyncErrors, useSyncActions } from '@/stores/sync.store';

export interface SyncQueueProps {
  compact?: boolean;
  showControls?: boolean;
  maxItems?: number;
}

export const SyncQueue = ({ 
  compact = false, 
  showControls = true, 
  maxItems = 10 
}: SyncQueueProps) => {
  const status = useSyncStatus();
  const { items, metrics, refreshQueue, removeItem, prioritizeItem } = useSyncQueue();
  const { errors, dismissError, clearErrors } = useSyncErrors();
  const { triggerManualSync, retryFailedItems, clearFailedItems } = useSyncActions();
  
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  const handleManualSync = async () => {
    await triggerManualSync();
  };

  const handleRetryFailed = async () => {
    await retryFailedItems();
  };

  const handleClearFailed = async () => {
    await clearFailedItems();
  };

  const handleRemoveItem = async (uuid: string) => {
    await removeItem(uuid);
  };

  const handlePrioritizeItem = async (uuid: string, priority: number) => {
    await prioritizeItem(uuid, priority);
  };

  const getStatusIcon = () => {
    if (status.syncInProgress) {
      return (
        <div className="animate-spin">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
        </div>
      );
    }

    if (!status.isOnline) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM12 17.5L6.5 12h3v-4h5v4h3L12 17.5z"/>
        </svg>
      );
    }

    if (metrics && metrics.pending > 0) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,15.4L16.2,16.2Z"/>
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
      </svg>
    );
  };

  const getStatusColor = () => {
    if (status.syncInProgress) return 'text-blue-600';
    if (!status.isOnline) return 'text-muted-foreground';
    if (metrics && metrics.pending > 0) return 'text-orange-600';
    if (metrics && metrics.failed > 0) return 'text-red-600';
    return 'text-green-600';
  };

  const getBgColor = () => {
    if (status.syncInProgress) return 'bg-blue-50 border-blue-200';
    if (!status.isOnline) return 'bg-muted border-border';
    if (metrics && metrics.pending > 0) return 'bg-orange-50 border-orange-200';
    if (metrics && metrics.failed > 0) return 'bg-red-50 border-red-200';
    return 'bg-green-50 border-green-200';
  };

  const getStatusText = () => {
    if (status.syncInProgress) {
      return status.syncMessage || `Syncing... ${Math.round(status.syncProgress)}%`;
    }
    
    if (!status.isOnline) {
      return `Offline${metrics ? ` (${metrics.pending} pending)` : ''}`;
    }

    if (metrics) {
      if (metrics.pending > 0) {
        return `${metrics.pending} pending`;
      }
      if (metrics.failed > 0) {
        return `${metrics.failed} failed`;
      }
      if (metrics.total === 0) {
        return 'All synced';
      }
    }

    return 'Synced';
  };

  const getItemStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <div className="w-2 h-2 bg-orange-500 rounded-full"></div>;
      case 'retrying':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>;
      case 'failed':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      case 'max_retries':
        return <div className="w-2 h-2 bg-muted rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / (1000 * 60)),
      'minute'
    );
  };

  if (compact) {
    return (
      <div 
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${getStatusColor()} ${getBgColor()}`}
        onClick={() => setExpanded(!expanded)}
        data-testid="sync-queue-compact"
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        
        {status.syncInProgress && status.syncProgress > 0 && (
          <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${status.syncProgress}%` }}
            />
          </div>
        )}

        {metrics && (metrics.pending > 0 || metrics.failed > 0) && (
          <div className="text-xs bg-card px-2 py-1 rounded-full">
            {metrics.pending + metrics.failed}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className={`flex items-center justify-between p-4 rounded-lg border ${getBgColor()}`}>
        <div className="flex items-center gap-3">
          <span className={getStatusColor()}>{getStatusIcon()}</span>
          <div>
            <h3 className="font-medium text-foreground">Sync Status</h3>
            <p className={`text-sm ${getStatusColor()}`}>{getStatusText()}</p>
          </div>
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={status.syncInProgress || !status.isOnline}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sync Now
            </button>
            
            {metrics && metrics.failed > 0 && (
              <>
                <button
                  onClick={handleRetryFailed}
                  className="px-3 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Retry Failed
                </button>
                <button
                  onClick={handleClearFailed}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Clear Failed
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sync Progress Bar */}
      {status.syncInProgress && (
        <div className="bg-card border rounded-lg p-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>{status.syncMessage || 'Syncing...'}</span>
            <span>{Math.round(status.syncProgress)}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${status.syncProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.slice(0, 5).map((error) => (
            <div
              key={error.id}
              className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-sm text-red-800">{error.message}</span>
              </div>
              <button
                onClick={() => dismissError(error.id)}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          ))}
          
          {errors.length > 5 && (
            <button
              onClick={clearErrors}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear all {errors.length} errors
            </button>
          )}
        </div>
      )}

      {/* Queue Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-3">
            <div className="text-2xl font-bold text-foreground">{metrics.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600">{metrics.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600">{metrics.retrying}</div>
            <div className="text-sm text-muted-foreground">Retrying</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600">{metrics.failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
        </div>
      )}

      {/* Queue Items */}
      {items.length > 0 && (
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Queue Items</h4>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {expanded ? 'Show Less' : `Show All (${items.length})`}
              </button>
            </div>
          </div>
          
          <div className="divide-y">
            {(expanded ? items : items.slice(0, maxItems)).map((item) => (
              <div key={item.uuid} className="p-4 hover:bg-muted">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getItemStatusIcon(item.status)}
                    <div>
                      <div className="font-medium text-sm text-foreground">
                        {item.type} • {item.action}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.entityUuid.slice(0, 8)}... • Priority {item.priority}
                      </div>
                      {item.error && (
                        <div className="text-xs text-red-600 mt-1">{item.error}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(item.timestamp)}
                    </span>
                    {item.attempts > 0 && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {item.attempts} attempts
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveItem(item.uuid)}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};