'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock } from '@/lib/icons'
import { DeliveryOfflineService, DeliveryOfflineStats } from '@/lib/services/delivery-offline.service'

interface OfflineSyncStatusProps {
  className?: string
  onSyncComplete?: (results: any) => void
}

export function OfflineSyncStatus({ className, onSyncComplete }: OfflineSyncStatusProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [stats, setStats] = useState<DeliveryOfflineStats | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncResults, setSyncResults] = useState<any>(null)

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }
    
    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Load initial stats
    loadStats()

    // Set up periodic stats refresh
    const interval = setInterval(loadStats, 5000) // Every 5 seconds

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      clearInterval(interval)
    }
  }, [])

  const loadStats = async () => {
    try {
      const currentStats = await DeliveryOfflineService.getOfflineStats()
      setStats(currentStats)
      
      if (currentStats.lastSync) {
        setLastSync(currentStats.lastSync)
      }
    } catch (error) {
      console.error('Failed to load offline stats:', error)
    }
  }

  const handleSync = async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    setSyncResults(null)

    try {
      const results = await DeliveryOfflineService.syncPendingOperations()
      setSyncResults(results)
      
      // Reload stats after sync
      await loadStats()
      setLastSync(new Date())
      
      if (onSyncComplete) {
        onSyncComplete(results)
      }
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncResults({
        synced: 0,
        failed: 1,
        skipped: 0,
        errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }]
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const getSyncStatusColor = () => {
    if (!isOnline) return 'text-gray-500'
    if (isSyncing) return 'text-blue-500'
    if (stats?.pendingCount === 0) return 'text-green-500'
    return 'text-orange-500'
  }

  const getSyncStatusText = () => {
    if (!isOnline) return 'Offline'
    if (isSyncing) return 'Syncing...'
    if (stats?.pendingCount === 0) return 'All synced'
    return `${stats?.pendingCount || 0} pending`
  }

  const formatLastSync = () => {
    if (!lastSync) return 'Never'
    
    const now = new Date()
    const diffMs = now.getTime() - lastSync.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            Delivery Sync Status
          </span>
          <div className={`flex items-center gap-1 text-sm ${getSyncStatusColor()}`}>
            {getSyncStatusText()}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Connection</span>
          <Badge variant={isOnline ? 'default' : 'secondary'}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {/* Progress Bar */}
        {stats && stats.totalOperations > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Sync Progress</span>
              <span>{stats.completedCount}/{stats.totalOperations}</span>
            </div>
            <Progress 
              value={(stats.completedCount / stats.totalOperations) * 100} 
              className="h-2"
            />
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="font-medium">{stats.pendingCount}</div>
                <div className="text-muted-foreground">Pending</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-medium">{stats.completedCount}</div>
                <div className="text-muted-foreground">Completed</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <div className="font-medium">{stats.failedCount}</div>
                <div className="text-muted-foreground">Failed</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-medium">{formatLastSync()}</div>
                <div className="text-muted-foreground">Last sync</div>
              </div>
            </div>
          </div>
        )}

        {/* Sync Button */}
        <Button 
          onClick={handleSync}
          disabled={!isOnline || isSyncing || (stats?.pendingCount === 0)}
          className="w-full"
          variant={stats?.pendingCount === 0 ? 'outline' : 'default'}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </>
          )}
        </Button>

        {/* Sync Results */}
        {syncResults && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="font-medium mb-2">Sync Results</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-green-600 font-medium">{syncResults.synced}</div>
                <div className="text-muted-foreground">Synced</div>
              </div>
              <div>
                <div className="text-red-600 font-medium">{syncResults.failed}</div>
                <div className="text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-orange-600 font-medium">{syncResults.skipped}</div>
                <div className="text-muted-foreground">Skipped</div>
              </div>
            </div>
            
            {syncResults.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-600">
                {syncResults.errors.slice(0, 2).map((error: any, index: number) => (
                  <div key={index}>• {error.error}</div>
                ))}
                {syncResults.errors.length > 2 && (
                  <div>... and {syncResults.errors.length - 2} more</div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}