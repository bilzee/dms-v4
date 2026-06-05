'use client'

import { useState } from 'react'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { ContentSkeleton } from '@/components/shared/ContentSkeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, RefreshCw, AlertTriangle, Download, FileSpreadsheet } from '@/lib/icons'
import { getAuthHeaders } from '@/lib/api'
import { useSignalAnalytics } from '@/hooks/useSignalAnalytics'
import { useCoordinatorAnalytics } from '@/hooks/useCoordinatorAnalytics'
import { VolumeOverTimeChart } from '@/components/analytics/VolumeOverTimeChart'
import { ResolutionVelocityChart } from '@/components/analytics/ResolutionVelocityChart'
import { PriorityDistributionChart } from '@/components/analytics/PriorityDistributionChart'
import { TopEntitiesTable } from '@/components/analytics/TopEntitiesTable'
import { RoleEngagementCards } from '@/components/analytics/RoleEngagementCards'
import { PipelineFunnelChart } from '@/components/analytics/PipelineFunnelChart'
import { TurnaroundTrendChart, TurnaroundDistributionChart } from '@/components/analytics/VerificationThroughputChart'
import { PopulationTrendChart, VulnerablePopulationBreakdown, DemographicSummary } from '@/components/analytics/PopulationImpactCharts'
import { CommitmentPipelineChart, ResourceTypeBreakdown } from '@/components/analytics/ResourcePipelineCharts'
import { WorkloadDistributionChart } from '@/components/analytics/WorkloadDistributionChart'
import { AssessmentFreshnessHeatmap } from '@/components/analytics/AssessmentFreshnessHeatmap'
import { GapRadarChart } from '@/components/analytics/GapRadarChart'
import { AlertPulseDashboard } from '@/components/analytics/LivePulseWidgets'
import { PipelineTimingChart, RejectionAnalysis, DonorReliabilityTable, IncidentComparisonTable } from '@/components/analytics/AfterActionWidgets'

const RANGE_OPTIONS = [
  { value: '7d' as const, label: '7 Days' },
  { value: '30d' as const, label: '30 Days' },
  { value: '90d' as const, label: '90 Days' },
]

export default function CoordinatorAnalyticsHub() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d')
  const [activeTab, setActiveTab] = useState('signals')

  const signalQuery = useSignalAnalytics(range)
  const coordinatorQuery = useCoordinatorAnalytics({ range })

  return (
    <RoleBasedRoute requiredRole="COORDINATOR">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Analytics Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Operational analytics for disaster response coordination.
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
              onClick={() => {
                signalQuery.refetch()
                coordinatorQuery.refetch()
              }}
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
                a.download = `analytics-${range}-${new Date().toISOString().split('T')[0]}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="signals">Signals</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="population">Population</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="coverage">Coverage</TabsTrigger>
            <TabsTrigger value="live">Live Pulse</TabsTrigger>
            <TabsTrigger value="after-action">After Action</TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="mt-6 space-y-6">
            <SignalsTab
              isLoading={signalQuery.isLoading}
              error={signalQuery.error}
              data={signalQuery.data}
              refetch={() => signalQuery.refetch()}
              range={range}
            />
          </TabsContent>

          <TabsContent value="pipeline" className="mt-6 space-y-6">
            <OperationalTabWrapper
              isLoading={coordinatorQuery.isLoading}
              error={coordinatorQuery.error}
              refetch={() => coordinatorQuery.refetch()}
            >
              {coordinatorQuery.data && (
                <>
                  <PipelineFunnelChart data={coordinatorQuery.data.pipeline} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TurnaroundTrendChart data={coordinatorQuery.data.throughput} />
                    <TurnaroundDistributionChart data={coordinatorQuery.data.throughput} />
                  </div>
                </>
              )}
            </OperationalTabWrapper>
          </TabsContent>

          <TabsContent value="population" className="mt-6 space-y-6">
            <OperationalTabWrapper
              isLoading={coordinatorQuery.isLoading}
              error={coordinatorQuery.error}
              refetch={() => coordinatorQuery.refetch()}
            >
              {coordinatorQuery.data && (
                <>
                  <DemographicSummary data={coordinatorQuery.data.population} />
                  <PopulationTrendChart data={coordinatorQuery.data.population} />
                  <VulnerablePopulationBreakdown data={coordinatorQuery.data.population} />
                </>
              )}
            </OperationalTabWrapper>
          </TabsContent>

          <TabsContent value="resources" className="mt-6 space-y-6">
            <OperationalTabWrapper
              isLoading={coordinatorQuery.isLoading}
              error={coordinatorQuery.error}
              refetch={() => coordinatorQuery.refetch()}
            >
              {coordinatorQuery.data && (
                <>
                  <CommitmentPipelineChart data={coordinatorQuery.data.resources} />
                  <ResourceTypeBreakdown data={coordinatorQuery.data.resources} />
                  <WorkloadDistributionChart data={coordinatorQuery.data.workload} />
                </>
              )}
            </OperationalTabWrapper>
          </TabsContent>

          <TabsContent value="coverage" className="mt-6 space-y-6">
            <OperationalTabWrapper
              isLoading={coordinatorQuery.isLoading}
              error={coordinatorQuery.error}
              refetch={() => coordinatorQuery.refetch()}
            >
              {coordinatorQuery.data && (
                <>
                  <AssessmentFreshnessHeatmap data={coordinatorQuery.data.freshness} />
                  <GapRadarChart data={coordinatorQuery.data.gapRadar} />
                </>
              )}
            </OperationalTabWrapper>
          </TabsContent>

          <TabsContent value="live" className="mt-6 space-y-6">
            <OperationalTabWrapper
              isLoading={coordinatorQuery.isLoading}
              error={coordinatorQuery.error}
              refetch={() => coordinatorQuery.refetch()}
            >
              {coordinatorQuery.data && (
                <AlertPulseDashboard data={coordinatorQuery.data.livePulse} />
              )}
            </OperationalTabWrapper>
          </TabsContent>

          <TabsContent value="after-action" className="mt-6 space-y-6">
            <OperationalTabWrapper
              isLoading={coordinatorQuery.isLoading}
              error={coordinatorQuery.error}
              refetch={() => coordinatorQuery.refetch()}
            >
              {coordinatorQuery.data && (
                <>
                  <PipelineTimingChart data={coordinatorQuery.data.afterAction} />
                  <RejectionAnalysis data={coordinatorQuery.data.afterAction} />
                  <DonorReliabilityTable data={coordinatorQuery.data.afterAction} />
                  <IncidentComparisonTable data={coordinatorQuery.data.afterAction} />
                </>
              )}
            </OperationalTabWrapper>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedRoute>
  )
}

function SignalsTab({
  isLoading,
  error,
  data,
  refetch,
  range,
}: {
  isLoading: boolean
  error: any
  data: any
  refetch: () => void
  range: '7d' | '30d' | '90d'
}) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <ContentSkeleton variant="metric" count={4} />
        <ContentSkeleton variant="card" count={3} />
      </div>
    )
  }

  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Failed to Load Signal Analytics</h2>
        <p className="text-muted-foreground mb-4">
          {(error as Error)?.message || 'An unexpected error occurred.'}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

  return (
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
  )
}

function OperationalTabWrapper({
  isLoading,
  error,
  refetch,
  children,
}: {
  isLoading: boolean
  error: any
  refetch: () => void
  children: React.ReactNode
}) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <ContentSkeleton variant="metric" count={4} />
        <ContentSkeleton variant="card" count={3} />
      </div>
    )
  }

  if (error && !isLoading) {
    return (
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
    )
  }

  return <>{children}</>
}
