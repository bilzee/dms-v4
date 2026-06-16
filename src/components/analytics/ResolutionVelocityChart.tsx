'use client'

import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import '@/lib/utils/chart-registration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from '@/lib/icons'

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

function getBarColor(hours: number): string {
  if (hours > 48) return '#dc2626'
  if (hours > 24) return '#ca8a04'
  return '#059669'
}

interface ResolutionVelocityChartProps {
  data: Array<{ signalReason: string; medianHours: number }>
}

export function ResolutionVelocityChart({ data }: ResolutionVelocityChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.medianHours - a.medianHours)

    return {
      labels: sorted.map(d => SIGNAL_REASON_LABELS[d.signalReason] || d.signalReason),
      datasets: [{
        data: sorted.map(d => d.medianHours),
        backgroundColor: sorted.map(d => getBarColor(d.medianHours) + 'cc'),
        borderColor: sorted.map(d => getBarColor(d.medianHours)),
        borderWidth: 1,
        borderRadius: 4,
      }],
    }
  }, [data])

  const options = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.parsed.x.toFixed(1)}h median`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Median Hours to Resolve',
        },
      },
      y: {
        ticks: {
          font: { size: 11 },
        },
      },
    },
  }), [])

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Resolution Velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 sm:h-64 text-muted-foreground">
            No resolution data available.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5" />
          Resolution Velocity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-80">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
}
