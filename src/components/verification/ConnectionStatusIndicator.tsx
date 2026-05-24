'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  CheckCircle 
} from 'lucide-react';
import { useConnectionStatus, useRealTimeVerification, useVerificationMetrics } from '@/hooks/useRealTimeVerification';
import { cn } from '@/lib/utils';
import { getBadgeClasses } from '@/components/shared/StatusBadge';

interface ConnectionStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function ConnectionStatusIndicator({ 
  className, 
  showDetails = false,
  compact = false 
}: ConnectionStatusIndicatorProps) {
  const { 
    status, 
    lastUpdate, 
    statusColor, 
    statusText, 
    lastUpdateText,
    isConnected 
  } = useConnectionStatus();

  const { manualRefresh, retryCount } = useRealTimeVerification({
    onConnectionChange: (newStatus) => {
      console.log('Connection status changed:', newStatus);
    }
  });

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm text-muted-foreground">
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        {status === 'connected' && <CheckCircle className="h-4 w-4 text-green-500" />}
        {status === 'connecting' && <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />}
        {status === 'disconnected' && <WifiOff className="h-4 w-4 text-orange-500" />}
        {status === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
        
        <Badge 
          variant="outline" 
          className={cn('text-xs', getBadgeClasses('system', status === 'error' ? 'ERROR' : status))}
        >
          {statusText}
        </Badge>
      </div>

      {showDetails && (
        <>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Updated: {lastUpdateText}</span>
          </div>

          {retryCount > 0 && (
            <div className="text-xs text-muted-foreground">
              Retries: {retryCount}
            </div>
          )}
        </>
      )}

      {!isConnected && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => manualRefresh()}
          className="h-7 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reconnect
        </Button>
      )}
    </div>
  );
}

// Real-time Status Panel Component
export function RealTimeStatusPanel() {
  const { 
    isConnected, 
    lastUpdate, 
    lastUpdateText,
    statusText,
    statusColor 
  } = useConnectionStatus();

  const { 
    interval, 
    retryCount, 
    maxRetries, 
    lastSuccessfulUpdate,
    manualRefresh 
  } = useRealTimeVerification();

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Real-time updates are active and working properly.';
      case 'connecting':
        return 'Establishing connection to verification queue...';
      case 'disconnected':
        return 'Connection lost. Attempting to reconnect...';
      case 'error':
        return 'Failed to connect to real-time updates. Please check your connection.';
      default:
        return 'Unknown connection status.';
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Real-time Status</h3>
        <ConnectionStatusIndicator compact />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status:</span>
          <span className={cn('font-medium', statusColor)}>{statusText}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Last Update:</span>
          <span>{lastUpdateText}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Update Interval:</span>
          <span>{interval / 1000}s</span>
        </div>

        {retryCount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Retry Attempts:</span>
            <span>{retryCount} / {maxRetries}</span>
          </div>
        )}

        {lastSuccessfulUpdate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Success:</span>
            <span>{new Date(lastSuccessfulUpdate).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-3">
          {getStatusDescription(statusText)}
        </p>

        {!isConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => manualRefresh()}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Reconnecting
          </Button>
        )}
      </div>
    </div>
  );
}

// Performance Status Component
export function PerformanceStatus() {
  const { 
    combined,
    assessments: assessmentMetrics,
    deliveries: deliveryMetrics 
  } = useVerificationMetrics();

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getWaitTimeColor = (minutes: number) => {
    if (minutes < 30) return 'text-green-600';
    if (minutes < 60) return 'text-yellow-600';
    if (minutes < 120) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-medium">Performance Metrics</h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Total Pending</div>
          <div className="text-lg font-bold">{combined.totalPending}</div>
          <div className="text-xs text-muted-foreground">
            {combined.critical} critical, {combined.high} high
          </div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs">Verification Rate</div>
          <div className="text-lg font-bold">
            {(combined.verificationRate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">last 24h</div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs">Avg Wait Time</div>
          <div className={cn('text-lg font-bold', getWaitTimeColor(combined.averageWaitTime))}>
            {formatWaitTime(combined.averageWaitTime)}
          </div>
          <div className="text-xs text-muted-foreground">pending items</div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs">Oldest Pending</div>
          <div className="text-lg font-bold">
            {combined.oldestPending 
              ? Math.floor((Date.now() - new Date(combined.oldestPending).getTime()) / (1000 * 60)) + 'm'
              : 'N/A'
            }
          </div>
          <div className="text-xs text-muted-foreground">in queue</div>
        </div>
      </div>

      <div className="pt-2 border-t space-y-2">
        <h4 className="text-sm font-medium">Queue Breakdown</h4>
        
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Assessments:</span>
            <span>{assessmentMetrics.averageWaitTime}m avg wait</span>
          </div>
          <div className="flex justify-between">
            <span>Deliveries:</span>
            <span>{deliveryMetrics.averageWaitTime}m avg wait</span>
          </div>
        </div>
      </div>
    </div>
  );
}