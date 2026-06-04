'use client'

import { useState } from 'react'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { useSignalAnalytics } from '@/hooks/useSignalAnalytics'
import { VolumeOverTimeChart } from '@/components/analytics/VolumeOverTimeChart'
import { ResolutionVelocityChart } from '@/components/analytics/ResolutionVelocityChart'
import { PriorityDistributionChart } from '@/components/analytics/PriorityDistributionChart'
import { TopEntitiesTable } from '@/components/analytics/TopEntitiesTable'
import { RoleEngagementCards } from '@/components/analytics/RoleEngagementCards'
import { ContentSkeleton } from '@/components/shared/ContentSkeleton'
import { Button } from '@/components/ui/button'
import { BarChart3, RefreshCw, AlertTriangle, Download, FileSpreadsheet } from '@/lib/icons'
import { getAuthHeaders } from '@/lib/api'

const RANGE_OPTIONS = [
  { value: '7d' as const, label: '7 Days' },
  { value: '30d' as const, label: '30 Days' },
  { value: '90d' as const, label: '90 Days' },
]

export default function SignalAnalyticsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d')
  const { data, isLoading, error, refetch } = useSignalAnalytics(range)

  return (
    <RoleBasedRoute requiredRole="COORDINATOR">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Signal Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor action signal trends, resolution performance, and role engagement.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border bg-muted p-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRange(opt.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                    range === opt.value
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const resp = await fetch(`/api/v1/signals/analytics/export?range=${range}&format=csv`, { headers: getAuthHeaders() })
                if (!resp.ok) return
                const blob = await resp.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `signal-analytics-${range}-${new Date().toISOString().split('T')[0]}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const resp = await fetch(`/api/v1/signals/analytics/export?range=${range}&format=xlsx`, { headers: getAuthHeaders() })
                if (!resp.ok) return
                const blob = await resp.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `signal-analytics-${range}-${new Date().toISOString().split('T')[0]}.xlsx`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-6">
            <ContentSkeleton variant="metric" count={4} />
            <ContentSkeleton variant="card" count={3} />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Failed to Load Analytics</h2>
            <p className="text-muted-foreground mb-4">
              {(error as Error)?.message || 'An unexpected error occurred.'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {data && !isLoading && !error && (
          <div className="space-y-6">
            <VolumeOverTimeChart data={data.volumeOverTime} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResolutionVelocityChart data={data.resolutionVelocity} />
              <PriorityDistributionChart data={data.priorityDistribution} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopEntitiesTable data={data.topEntities} />
              <RoleEngagementCards data={data.roleEngagement} />
            </div>
          </div>
        )}
      </div>
    </RoleBasedRoute>
  )
}
