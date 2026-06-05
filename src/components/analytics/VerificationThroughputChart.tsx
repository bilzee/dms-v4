'use client'

import { useMemo } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import '@/lib/utils/chart-registration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, BarChart3 } from '@/lib/icons'
import type { ThroughputData } from '@/hooks/useCoordinatorAnalytics'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface TurnaroundTrendChartProps {
  data: ThroughputData
}

function TurnaroundTrendChart({ data }: TurnaroundTrendChartProps) {
  const chartData = useMemo(() => {
    const allDates = [
      ...new Set([
        ...data.assessmentTurnaround.map(d => d.date),
        ...data.responseTurnaround.map(d => d.date),
      ]),
    ].sort()

    return {
      labels: allDates.map(formatDate),
      datasets: [
        {
          label: 'Assessment Turnaround',
          data: allDates.map(d => {
            const pt = data.assessmentTurnaround.find(a => a.date === d)
            return pt ? pt.avgHours : null
          }),
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f620',
          tension: 0.3,
          pointRadius: 3,
          spanGaps: true,
        },
        {
          label: 'Response Turnaround',
          data: allDates.map(d => {
            const pt = data.responseTurnaround.find(a => a.date === d)
            return pt ? pt.avgHours : null
          }),
          borderColor: '#a855f7',
          backgroundColor: '#a855f720',
          tension: 0.3,
          pointRadius: 3,
          spanGaps: true,
        },
      ],
    }
  }, [data])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}h` } },
      annotation: undefined,
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, title: { display: true, text: 'Hours' } },
    },
  }), [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5" />
          Verification Turnaround Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <Line data={chartData} options={options} />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-8 h-px bg-red-500 inline-block" style={{ borderTop: '2px dashed #ef4444' }} />
            PRD Target: 2h (assessments)
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function TurnaroundDistributionChart({ data }: { data: ThroughputData }) {
  const chartData = useMemo(() => {
    const BUCKET_ORDER = ['<1h', '1-2h', '2-4h', '4-8h', '>8h']
    const BUCKET_COLORS: Record<string, string> = {
      '<1h': '#22c55e',
      '1-2h': '#3b82f6',
      '2-4h': '#f59e0b',
      '4-8h': '#f97316',
      '>8h': '#ef4444',
    }

    const filled = BUCKET_ORDER.map(b => {
      const found = data.distribution.find(d => d.bucket === b)
      return { bucket: b, count: found?.count ?? 0 }
    })

    return {
      labels: filled.map(f => f.bucket),
      datasets: [{
        data: filled.map(f => f.count),
        backgroundColor: filled.map(f => BUCKET_COLORS[f.bucket] + 'cc'),
        borderColor: filled.map(f => BUCKET_COLORS[f.bucket]),
        borderWidth: 1,
        borderRadius: 4,
      }],
    }
  }, [data])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.parsed.y} assessments` } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
    },
  }), [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" />
          Turnaround Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <Bar data={chartData} options={options} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          How many assessments were verified within each time bucket.
        </p>
      </CardContent>
    </Card>
  )
}

export { TurnaroundTrendChart, TurnaroundDistributionChart }
