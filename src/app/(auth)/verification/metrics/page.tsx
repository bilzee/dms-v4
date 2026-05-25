'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BarChart3, CheckCircle, XCircle, Clock, Users, FileText } from '@/lib/icons'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'

interface VerificationMetrics {
  totalPending: number
  totalVerified: number
  totalRejected: number
  totalAutoVerified: number
  verificationRate: number
  rejectionRate: number
  averageProcessingTime: number
  pendingByType: Record<string, number>
}

export default function VerificationMetricsPage() {
  const { user, token } = useAuth()

  const { data: metrics, isLoading: loading, error: queryError } = useQuery<VerificationMetrics | null>({
    queryKey: ['verification-metrics'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/verification/metrics')
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch metrics')
      }
      const d = result.data as { data?: VerificationMetrics } | VerificationMetrics | undefined
      const unwrapped = (d && typeof d === 'object' && 'data' in d ? d.data : d) ?? null
      return unwrapped as VerificationMetrics | null
    },
    enabled: !!user && !!token,
    staleTime: 60000,
  })

  const error = queryError ? queryError.message : null

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading metrics...</h1>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertDescription>No metrics data available</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Verification Metrics
        </h1>
        <p className="text-muted-foreground">Assessment verification performance and statistics</p>
      </div>

      <StatCardGrid columns={4}>
        <StatCard
          label="Total Assessments"
          value={metrics.totalPending + metrics.totalVerified + metrics.totalRejected + metrics.totalAutoVerified}
          severity="info"
          icon={FileText}
        />
        <StatCard
          label="Pending Verification"
          value={metrics.totalPending}
          severity="warning"
          icon={Clock}
        />
        <StatCard
          label="Verified"
          value={metrics.totalVerified}
          severity="success"
          icon={CheckCircle}
        />
        <StatCard
          label="Rejected"
          value={metrics.totalRejected}
          severity="critical"
          icon={XCircle}
        />
      </StatCardGrid>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Verification Statistics</CardTitle>
            <CardDescription>Performance metrics and processing rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Auto-Verified</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-600 font-bold">{metrics.totalAutoVerified}</span>
                  <Badge variant="secondary" className="text-xs">Auto</Badge>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Verification Rate</span>
                <span className="text-sm font-bold">{(metrics.verificationRate * 100).toFixed(1)}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Avg. Processing Time</span>
                <span className="text-sm font-bold">{metrics.averageProcessingTime.toFixed(1)} hours</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Rejection Rate</span>
                <span className="text-sm font-bold">{(metrics.rejectionRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Control</CardTitle>
            <CardDescription>Data quality and approval breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Approved (Manual)</span>
                  <span className="font-medium text-green-600">{metrics.totalVerified}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ 
                      width: `${(metrics.totalPending + metrics.totalVerified + metrics.totalRejected + metrics.totalAutoVerified) > 0 ? (metrics.totalVerified / (metrics.totalPending + metrics.totalVerified + metrics.totalRejected + metrics.totalAutoVerified)) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Auto-Approved</span>
                  <span className="font-medium text-blue-600">{metrics.totalAutoVerified}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ 
                      width: `${(metrics.totalPending + metrics.totalVerified + metrics.totalRejected + metrics.totalAutoVerified) > 0 ? (metrics.totalAutoVerified / (metrics.totalPending + metrics.totalVerified + metrics.totalRejected + metrics.totalAutoVerified)) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Rejected</span>
                  <span className="font-medium text-red-600">{metrics.totalRejected}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ 
                      width: `${(metrics.totalPending + metrics.totalVerified + metrics.totalRejected + metrics.totalAutoVerified) > 0 ? (metrics.totalRejected / (metrics.totalPending + metrics.totalVerified + metrics.totalRejected + metrics.totalAutoVerified)) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!user.roles?.some(ur => ur.role.name === 'COORDINATOR') && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            This dashboard shows verification metrics for all assessments. For verification queue management and approval actions, coordinator access is required.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
