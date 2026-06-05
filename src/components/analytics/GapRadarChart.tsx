'use client'

import { useMemo } from 'react'
import { Radar } from 'react-chartjs-2'
import '@/lib/utils/chart-registration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target } from '@/lib/icons'
import type { GapRadarData } from '@/hooks/useCoordinatorAnalytics'

const TYPE_LABELS: Record<string, string> = {
  HEALTH: 'Health',
  WASH: 'WASH',
  SHELTER: 'Shelter',
  FOOD: 'Food',
  SECURITY: 'Security',
  POPULATION: 'Population',
}

const TYPE_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4',
]

export function GapRadarChart({ data }: { data: GapRadarData }) {
  const entityMap = new Map<string, string>()
  for (const g of data.entityGaps) {
    entityMap.set(g.entityId, g.entityName)
  }

  const entities = [...entityMap.entries()].slice(0, 5)

  const assessmentTypes = [...new Set(data.summary.map(s => s.assessmentType))]
    .filter(t => t !== 'POPULATION')

  const chartData = useMemo(() => {
    return {
      labels: assessmentTypes.map(t => TYPE_LABELS[t] || t),
      datasets: entities.map(([id, name], i) => ({
        label: name,
        data: assessmentTypes.map(at => {
          const gap = data.entityGaps.find(g => g.entityId === id && g.assessmentType === at)
          return gap?.gapCount ?? 0
        }),
        borderColor: TYPE_COLORS[i % TYPE_COLORS.length],
        backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] + '20',
        pointBackgroundColor: TYPE_COLORS[i % TYPE_COLORS.length],
        borderWidth: 2,
        pointRadius: 3,
      })),
    }
  }, [data, entities, assessmentTypes])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        grid: { color: '#e5e7eb' },
        angleLines: { color: '#e5e7eb' },
        pointLabels: { color: '#6b7280', font: { size: 12 } },
        ticks: {
          stepSize: 1,
          backdropColor: 'transparent',
          color: '#6b7280',
        },
      },
    } as const,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { usePointStyle: true, padding: 12, font: { size: 11 }, color: '#6b7280' },
      },
    },
  }), [])

  if (entities.length === 0 || assessmentTypes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Gap Analysis Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No gap data available. Top 5 entities shown when data exists.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5" />
          Gap Analysis Radar (Top 5 Entities)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <Radar data={chartData} options={options} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Larger polygons indicate more gaps. Overlapping areas reveal common weaknesses across entities.
        </p>
      </CardContent>
    </Card>
  )
}
