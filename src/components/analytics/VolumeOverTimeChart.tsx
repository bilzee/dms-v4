'use client'

import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import '@/lib/utils/chart-registration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart } from '@/lib/icons'

const COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#2563eb', '#7c3aed', '#059669', '#db2777', '#0891b2', '#4f46e5', '#65a30d', '#e11d48', '#0d9488', '#9333ea', '#d97706']

const SIGNAL_REASON_LABELS: Record<string, string> = {
  'reassessment-needed': 'Reassessment Needed',
  'overdue': 'Population Assessment Overdue',
  'awaiting-plan': 'Response Plan Needed',
  'awaiting-plan-for-commitment': 'Commitment Needs Plan',
  'awaiting-delivery': 'Delivery Confirmation Needed',
  'partially-covered': 'Plan Partially Covered',
  'assessment-needs-response': 'Assessment Needs Resources',
  'plan-needs-commitment': 'Plan Needs Commitment',
  'partially-fulfilled': 'Commitment Partially Fulfilled',
  'assessment-awaiting-verification': 'Assessment Awaiting Review',
  'delivery-awaiting-verification': 'Delivery Awaiting Review',
  'verification-overdue': 'Verification Overdue',
  'entity-needs-responder': 'Entity Needs Responder',
  'entity-needs-donor': 'Entity Needs Donor',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface VolumeOverTimeChartProps {
  data: Array<{ date: string; signalReason: string; count: number }>
}

export function VolumeOverTimeChart({ data }: VolumeOverTimeChartProps) {
  const chartData = useMemo(() => {
    const reasons = [...new Set(data.map(d => d.signalReason))]
    const dates = [...new Set(data.map(d => d.date))].sort()

    return {
      labels: dates.map(formatDate),
      datasets: reasons.map((reason, i) => ({
        label: SIGNAL_REASON_LABELS[reason] || reason,
        data: dates.map(date => {
          const point = data.find(d => d.date === date && d.signalReason === reason)
          return point ? point.count : 0
        }),
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length] + '20',
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false,
      })),
    }
  }, [data])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 12,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          title: (items: any[]) => items[0]?.label || '',
          label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
        },
      },
    },
  }), [])

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChart className="h-5 w-5" />
            Signal Volume Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 sm:h-64 text-muted-foreground">
            No volume data available for this period.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="h-5 w-5" />
          Signal Volume Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-80">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
}
