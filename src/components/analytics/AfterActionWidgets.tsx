'use client'

import { useMemo } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import '@/lib/utils/chart-registration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Clock, Award, AlertTriangle, TrendingUp } from '@/lib/icons'
import type { AfterActionData } from '@/hooks/useCoordinatorAnalytics'

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  UNCLASSIFIED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

function formatHours(hours: number | null): string {
  if (hours === null) return 'N/A'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

function PipelineTimingChart({ data }: { data: AfterActionData }) {
  const stages = [
    { key: 'timeToFirstAssessment' as const, label: 'To First Assessment', target: 2 },
    { key: 'timeToFirstVerification' as const, label: 'To First Verification', target: 4 },
    { key: 'timeToFirstResponse' as const, label: 'To First Response Plan', target: 8 },
    { key: 'timeToFirstDelivery' as const, label: 'To First Delivery', target: 24 },
  ]

  const avgByStage = stages.map(s => {
    const values = data.pipelineTiming
      .map(i => i[s.key])
      .filter((v): v is number => v !== null)
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    return { ...s, avg }
  })

  const chartData = useMemo(() => ({
    labels: avgByStage.map(s => s.label),
    datasets: [{
      data: avgByStage.map(s => s.avg),
      backgroundColor: avgByStage.map(s =>
        s.avg <= s.target ? '#22c55ecc' : s.avg <= s.target * 2 ? '#f59e0bcc' : '#ef4444cc'
      ),
      borderColor: avgByStage.map(s =>
        s.avg <= s.target ? '#22c55e' : s.avg <= s.target * 2 ? '#f59e0b' : '#ef4444'
      ),
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [avgByStage])

  const options = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.parsed.x.toFixed(1)}h average` } },
    },
    scales: {
      x: { beginAtZero: true, title: { display: true, text: 'Hours' } },
    },
  }), [])

  if (data.pipelineTiming.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            End-to-End Response Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No incident pipeline data available.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <StatCardGrid columns={4}>
        {avgByStage.map(s => (
          <StatCard
            key={s.key}
            label={s.label}
            value={formatHours(s.avg)}
            severity={s.avg <= s.target ? 'success' : s.avg <= s.target * 2 ? 'warning' : 'critical'}
            icon={Clock}
            variant="compact"
          />
        ))}
      </StatCardGrid>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Average Time by Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <Bar data={chartData} options={options} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function RejectionAnalysis({ data }: { data: AfterActionData }) {
  const totalRejected = data.rejectionAnalysis.reduce((s, r) => s + r.count, 0)

  const chartData = useMemo(() => ({
    labels: data.rejectionAnalysis.map(r => r.reason.replace(/_/g, ' ').toLowerCase()),
    datasets: [{
      data: data.rejectionAnalysis.map(r => r.count),
      backgroundColor: ['#ef4444cc', '#f59e0bcc', '#3b82f6cc', '#a855f7cc', '#22c55ecc', '#06b6d4cc', '#94a3b8cc'],
      borderWidth: 2,
      hoverOffset: 6,
    }],
  }), [data])

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: { legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 8, font: { size: 10 } } } },
  }), [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5" />
            Rejection Reasons
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.rejectionAnalysis.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No rejections in this period.
            </div>
          ) : (
            <div className="h-48 sm:h-64">
              <Doughnut data={chartData} options={doughnutOptions} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5" />
            Assessor Rejection Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.assessorRejection.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No assessor rejections.
            </div>
          ) : (
            <div className="overflow-auto max-h-48 sm:max-h-64">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Assessor</th>
                    <th className="pb-2 pr-4 font-medium text-right">Total</th>
                    <th className="pb-2 pr-4 font-medium text-right">Rejected</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assessorRejection.map(a => (
                    <tr key={a.assessorId} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4 font-medium">{a.assessorName}</td>
                      <td className="py-2 pr-4 text-right">{a.total}</td>
                      <td className="py-2 pr-4 text-right font-medium">{a.rejected}</td>
                      <td className="py-2 text-right">
                        <span className={`font-semibold ${
                          a.rejectionRate > 30 ? 'text-red-600 dark:text-red-400' :
                          a.rejectionRate > 15 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {a.rejectionRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DonorReliabilityTable({ data }: { data: AfterActionData }) {
  if (data.donorReliability.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5" />
            Donor Reliability Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No donor data available.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-5 w-5" />
          Donor Reliability Scorecard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Donor</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium text-right">Committed</th>
                <th className="pb-2 pr-4 font-medium text-right">Delivered</th>
                <th className="pb-2 pr-4 font-medium text-right">Fulfillment Rate</th>
                <th className="pb-2 font-medium text-right">Completed</th>
              </tr>
            </thead>
            <tbody>
              {data.donorReliability.map(d => (
                <tr key={d.donorId} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 pr-4 font-medium">{d.donorName}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{d.donorType}</td>
                  <td className="py-2 pr-4 text-right">{d.totalCommitted.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right">{d.totalDelivered.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right">
                    <span className={`font-semibold ${
                      d.fulfillmentRate >= 80 ? 'text-green-600 dark:text-green-400' :
                      d.fulfillmentRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {d.fulfillmentRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {d.completedCommitments}/{d.totalCommitments}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function IncidentComparisonTable({ data }: { data: AfterActionData }) {
  if (data.incidentComparison.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Incident Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No incidents to compare.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5" />
          Incident Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Incident</th>
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 pr-3 font-medium">Severity</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium text-right">Assessments</th>
                <th className="pb-2 pr-3 font-medium text-right">Responses</th>
                <th className="pb-2 pr-3 font-medium text-right">Committed</th>
                <th className="pb-2 font-medium text-right">Population</th>
              </tr>
            </thead>
            <tbody>
              {data.incidentComparison.map(i => (
                <tr key={i.incidentId} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 pr-3 font-medium">{i.incidentName}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{i.incidentType}</td>
                  <td className="py-2 pr-3">
                    <Badge variant="outline" className={PRIORITY_BADGE_CLASSES[i.severity] || ''}>
                      {i.severity}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge variant="outline">{i.status}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-right">{i.totalAssessments}</td>
                  <td className="py-2 pr-3 text-right">{i.totalResponses}</td>
                  <td className="py-2 pr-3 text-right">{i.totalCommitments.toLocaleString()}</td>
                  <td className="py-2 text-right">{i.populationAffected.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export { PipelineTimingChart, RejectionAnalysis, DonorReliabilityTable, IncidentComparisonTable }
