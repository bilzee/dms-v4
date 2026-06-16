'use client'

import { useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'
import type { Plugin } from 'chart.js'
import '@/lib/utils/chart-registration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart } from '@/lib/icons'

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#2563eb',
}

const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const centerTextPlugin: Plugin<'doughnut'> = {
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, chartArea } = chart
    if (!chartArea) return
    const centerX = (chartArea.left + chartArea.right) / 2
    const centerY = (chartArea.top + chartArea.bottom) / 2
    const total = chart.data.datasets[0].data.reduce((sum: number, v: number) => sum + v, 0)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 24px sans-serif'
    ctx.fillStyle = '#1e293b'
    ctx.fillText(String(total), centerX, centerY - 8)
    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText('Total', centerX, centerY + 14)
    ctx.restore()
  },
}

interface PriorityDistributionChartProps {
  data: Array<{ signalReason: string; priority: string; count: number }>
}

export function PriorityDistributionChart({ data }: PriorityDistributionChartProps) {
  const { chartData, totals, grandTotal } = useMemo(() => {
    const byPriority: Record<string, number> = {}
    for (const item of data) {
      byPriority[item.priority] = (byPriority[item.priority] || 0) + item.count
    }

    const ordered = PRIORITY_ORDER.filter(p => byPriority[p])
    const values = ordered.map(p => byPriority[p])
    const total = values.reduce((s, v) => s + v, 0)

    return {
      chartData: {
        labels: ordered,
        datasets: [{
          data: values,
          backgroundColor: ordered.map(p => PRIORITY_COLORS[p] + 'cc'),
          borderColor: ordered.map(p => PRIORITY_COLORS[p]),
          borderWidth: 2,
          hoverOffset: 6,
        }],
      },
      totals: ordered.map(p => ({ priority: p, count: byPriority[p] })),
      grandTotal: total,
    }
  }, [data])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const pct = grandTotal > 0 ? ((ctx.parsed / grandTotal) * 100).toFixed(1) : '0'
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`
          },
        },
      },
    },
  }), [grandTotal])

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChart className="h-5 w-5" />
            Priority Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 sm:h-64 text-muted-foreground">
            No priority data available.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="h-5 w-5" />
          Priority Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 flex items-center justify-center">
          <Doughnut data={chartData} options={options} plugins={[centerTextPlugin]} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {totals.map(({ priority, count }) => (
            <div key={priority} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: PRIORITY_COLORS[priority] }}
              />
              <span className="text-muted-foreground">{priority}</span>
              <span className="ml-auto font-medium">{count}</span>
              <span className="text-muted-foreground text-xs">
                ({grandTotal > 0 ? ((count / grandTotal) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
