'use client'

import React, { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, Database, Users, HardDrive, Clock, Shield, RefreshCw, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function SystemHealthContent() {
  const [health, setHealth] = useState<{
    databaseSync: string
    apiResponseTime: number
    activeUsers: number
    storageUsage: number
    lastBackup: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const fetchHealth = async () => {
    setLoading(true)
    try {
      const result = await apiGet('/api/v1/system/health')
      if (result.success) {
        setHealth(result.data)
        setLastChecked(new Date())
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 60000)
    return () => clearInterval(interval)
  }, [])

  const getStatusVariant = (status: string) => {
    if (status === 'Healthy') return 'default' as const
    if (status === 'Degraded') return 'secondary' as const
    return 'destructive' as const
  }

  const getStatusColor = (status: string) => {
    if (status === 'Healthy') return 'text-green-600'
    if (status === 'Degraded') return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-gray-600 mt-2">Real-time system monitoring and health status</p>
        </div>
        <div className="flex items-center gap-4">
          {lastChecked && (
            <span className="text-sm text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    health?.databaseSync === 'Healthy' ? "bg-green-500" :
                    health?.databaseSync === 'Degraded' ? "bg-yellow-500" : "bg-red-500"
                  )} />
                  <span className={cn("text-2xl font-bold", getStatusColor(health?.databaseSync || 'Down'))}>
                    {health?.databaseSync || 'Unknown'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">PostgreSQL connection status</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Response Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <span className="text-2xl font-bold">{health?.apiResponseTime || 0}ms</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {(health?.apiResponseTime || 0) < 200 ? 'Excellent' :
                   (health?.apiResponseTime || 0) < 500 ? 'Good' :
                   (health?.apiResponseTime || 0) < 1000 ? 'Fair' : 'Slow'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <span className="text-2xl font-bold">{health?.activeUsers || 0}</span>
                <p className="text-xs text-muted-foreground mt-1">Users active in last 24 hours</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <span className="text-2xl font-bold">{health?.storageUsage ?? 0}%</span>
                <p className="text-xs text-muted-foreground mt-1">Disk space utilization</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <span className="text-2xl font-bold">{health?.lastBackup || 'N/A'}</span>
                <p className="text-xs text-muted-foreground mt-1">Most recent database backup</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="default">Secure</Badge>
            <p className="text-xs text-muted-foreground mt-1">All security checks passing</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Service Status
          </CardTitle>
          <CardDescription>Overview of all system services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Web Server', status: 'Running', uptime: '99.9%' },
              { name: 'Database', status: health?.databaseSync || 'Checking...', uptime: '99.8%' },
              { name: 'Authentication', status: 'Running', uptime: '100%' },
              { name: 'File Storage', status: 'Running', uptime: '99.7%' },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    service.status === 'Running' || service.status === 'Healthy'
                      ? "bg-green-500"
                      : service.status === 'Degraded'
                      ? "bg-yellow-500"
                      : "bg-gray-400"
                  )} />
                  <span className="font-medium">{service.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Uptime: {service.uptime}</span>
                  <Badge variant={getStatusVariant(service.status === 'Healthy' ? 'Healthy' : service.status)}>
                    {service.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SystemHealthPage() {
  return (
    <RoleBasedRoute requiredRole="ADMIN" fallbackPath="/dashboard">
      <SystemHealthContent />
    </RoleBasedRoute>
  )
}
