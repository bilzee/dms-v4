'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Package,
  Camera,
  MapPin,
  Trash2,
  Eye,
  BarChart3
} from '@/lib/icons'

import { DeliveryOfflineService, DeliveryOfflineOperation, DeliveryOfflineStats } from '@/lib/services/delivery-offline.service'
import { OfflineSyncStatus } from './OfflineSyncStatus'

interface OfflineSyncDashboardProps {
  className?: string
}

export function OfflineSyncDashboard({ className }: OfflineSyncDashboardProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [operations, setOperations] = useState<DeliveryOfflineOperation[]>([])
  const [stats, setStats] = useState<DeliveryOfflineStats | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    loadData()
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const loadData = async () => {
    setIsRefreshing(true)
    try {
      const [operationsData, statsData] = await Promise.all([
        DeliveryOfflineService.getPendingOperations(),
        DeliveryOfflineService.getOfflineStats()
      ])
      setOperations(operationsData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load offline data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSyncAll = async () => {
    if (!isOnline) return
    
    try {
      const results = await DeliveryOfflineService.syncPendingOperations()
      await loadData() // Refresh data
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const handleCancelOperation = async (operationId: string) => {
    try {
      await DeliveryOfflineService.cancelOperation(operationId)
      await loadData()
    } catch (error) {
      console.error('Failed to cancel operation:', error)
    }
  }

  const handleClearCompleted = async () => {
    try {
      const cleared = await DeliveryOfflineService.clearCompletedOperations()
      await loadData()
      console.log(`Cleared ${cleared} completed operations`)
    } catch (error) {
      console.error('Failed to clear completed operations:', error)
    }
  }

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'delivery_confirmation': return <Package className="h-4 w-4" />
      case 'media_upload': return <Camera className="h-4 w-4" />
      case 'location_capture': return <MapPin className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority <= 3) return 'text-red-600 bg-red-50'
    if (priority <= 6) return 'text-orange-600 bg-orange-50'
    return 'text-blue-600 bg-blue-50'
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              Offline Sync Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {isOnline && (stats?.pendingCount ?? 0) > 0 && (
                <Button size="sm" onClick={handleSyncAll}>
                  Sync All ({stats?.pendingCount ?? 0})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats?.pendingCount || 0})</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <OfflineSyncStatus onSyncComplete={loadData} />
              
              {stats && stats.totalOperations > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5" />
                      Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{stats.pendingCount}</div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.completedCount}</div>
                        <div className="text-sm text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.failedCount}</div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.totalOperations}</div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                    </div>
                    
                    {stats.oldestPending && (
                      <div className="mt-4 text-sm">
                        <span className="text-muted-foreground">Oldest pending: </span>
                        <span className="font-medium">{formatTimestamp(stats.oldestPending)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="pending" className="space-y-4">
              {operations.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No pending operations. All deliveries have been synced.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {operations.map((operation) => (
                      <Card key={operation.uuid} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {getOperationIcon(operation.type)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">
                                  {operation.type.replace('_', ' ')}
                                </span>
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${getPriorityColor(operation.priority)}`}
                                >
                                  Priority {operation.priority}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {operation.action}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Response: {operation.responseId}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Created: {formatTimestamp(operation.metadata.timestamp)}
                                {operation.nextRetry && (
                                  <span> • Next retry: {formatTimestamp(operation.nextRetry)}</span>
                                )}
                              </div>
                              {operation.attempts > 0 && (
                                <div className="text-xs text-orange-600">
                                  Attempts: {operation.attempts}
                                </div>
                              )}
                              {operation.error && (
                                <div className="text-xs text-red-600 mt-1">
                                  Error: {operation.error}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelOperation(operation.uuid)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Sync History</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCompleted}
                >
                  Clear Completed
                </Button>
              </div>
              
              <Alert>
                <AlertDescription>
                  Sync history and completed operations will appear here.
                  This feature is coming soon.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}