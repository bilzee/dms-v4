'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Layers } from '@/lib/icons'
import type { PipelineData } from '@/hooks/useCoordinatorAnalytics'

const STAGES = [
  { key: 'draft' as const, label: 'Draft', color: '#94a3b8' },
  { key: 'submitted' as const, label: 'Submitted', color: '#3b82f6' },
  { key: 'verified' as const, label: 'Verified', color: '#22c55e' },
  { key: 'responsePlanned' as const, label: 'Response Planned', color: '#a855f7' },
  { key: 'responseVerified' as const, label: 'Response Verified', color: '#06b6d4' },
  { key: 'delivered' as const, label: 'Delivered', color: '#f59e0b' },
  { key: 'deliveryVerified' as const, label: 'Delivery Verified', color: '#10b981' },
]

function getConversionRate(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round((current / previous) * 100)
}

function getConversionColor(rate: number | null): string {
  if (rate === null) return 'text-muted-foreground'
  if (rate >= 80) return 'text-green-600 dark:text-green-400'
  if (rate >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

interface PipelineFunnelChartProps {
  data: PipelineData
}

export function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
  const maxValue = useMemo(() => {
    return Math.max(...STAGES.map(s => data[s.key]), 1)
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-5 w-5" />
          Assessment-to-Response Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {STAGES.map((stage, i) => {
            const value = data[stage.key]
            const widthPct = Math.max((value / maxValue) * 100, 2)
            const prevValue = i > 0 ? data[STAGES[i - 1].key] : null
            const convRate = prevValue !== null ? getConversionRate(value, prevValue) : null

            return (
              <div key={stage.key} className="flex items-center gap-3">
                <div className="w-36 text-sm font-medium text-right shrink-0">
                  {stage.label}
                </div>
                <div className="flex-1 relative">
                  <div
                    className="h-8 rounded-md flex items-center px-3 transition-all"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: stage.color + '22',
                      borderColor: stage.color,
                      borderWidth: 1,
                    }}
                  >
                    <span className="text-sm font-bold" style={{ color: stage.color }}>
                      {value.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="w-16 text-right">
                  {convRate !== null && (
                    <span className={`text-xs font-semibold ${getConversionColor(convRate)}`}>
                      {convRate}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Percentages show conversion rate from the previous stage.
          Green (&ge;80%), Yellow (50-80%), Red (&lt;50%).
        </p>
      </CardContent>
    </Card>
  )
}
