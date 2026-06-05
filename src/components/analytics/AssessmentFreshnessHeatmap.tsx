'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Timer } from '@/lib/icons'
import type { FreshnessData } from '@/hooks/useCoordinatorAnalytics'

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  HEALTH: 'Health',
  WASH: 'WASH',
  SHELTER: 'Shelter',
  FOOD: 'Food',
  SECURITY: 'Security',
  POPULATION: 'Population',
}

const ASSESSMENT_TYPES = ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'] as const

function getFreshnessColor(hoursAgo: number | null): string {
  if (hoursAgo === null) return 'bg-gray-200 dark:bg-gray-800'
  if (hoursAgo <= 24) return 'bg-green-400 dark:bg-green-600'
  if (hoursAgo <= 72) return 'bg-yellow-400 dark:bg-yellow-600'
  if (hoursAgo <= 168) return 'bg-orange-400 dark:bg-orange-600'
  return 'bg-red-400 dark:bg-red-600'
}

function getFreshnessLabel(hoursAgo: number | null): string {
  if (hoursAgo === null) return 'Never'
  if (hoursAgo <= 24) return `<24h`
  if (hoursAgo <= 72) return `${Math.round(hoursAgo / 24)}d`
  if (hoursAgo <= 168) return `${Math.round(hoursAgo / 24)}d`
  return `${Math.round(hoursAgo / 24)}d`
}

function getFreshnessTextColor(hoursAgo: number | null): string {
  if (hoursAgo === null) return 'text-gray-500 dark:text-gray-400'
  if (hoursAgo <= 24) return 'text-white'
  if (hoursAgo <= 72) return 'text-gray-900 dark:text-gray-100'
  if (hoursAgo <= 168) return 'text-white'
  return 'text-white'
}

export function AssessmentFreshnessHeatmap({ data }: { data: FreshnessData }) {
  const entityMap = new Map<string, { name: string; type: string; byType: Map<string, number | null> }>()

  for (const row of data) {
    if (!entityMap.has(row.entityId)) {
      entityMap.set(row.entityId, { name: row.entityName, type: row.entityType, byType: new Map() })
    }
    entityMap.get(row.entityId)!.byType.set(row.assessmentType, row.hoursAgo)
  }

  const entities = [...entityMap.entries()]
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => {
      const aMax = Math.max(...([...a.byType.values()].filter((v): v is number => v !== null)), -1)
      const bMax = Math.max(...([...b.byType.values()].filter((v): v is number => v !== null)), -1)
      return bMax - aMax
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-5 w-5" />
          Assessment Freshness
        </CardTitle>
        <div className="flex gap-2 mt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600" /> &lt;24h
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-sm bg-yellow-400 dark:bg-yellow-600" /> 1-3d
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-sm bg-orange-400 dark:bg-orange-600" /> 3-7d
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-sm bg-red-400 dark:bg-red-600" /> &gt;7d
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-800" /> Never
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entities.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No entities found.
          </div>
        ) : (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium sticky left-0 bg-background z-10">Entity</th>
                  {ASSESSMENT_TYPES.map(t => (
                    <th key={t} className="pb-2 px-1 font-medium text-center text-xs whitespace-nowrap">
                      {ASSESSMENT_TYPE_LABELS[t]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entities.map(entity => (
                  <tr key={entity.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 font-medium whitespace-nowrap sticky left-0 bg-background z-10">
                      {entity.name}
                      <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                        {entity.type}
                      </Badge>
                    </td>
                    {ASSESSMENT_TYPES.map(t => {
                      const hoursAgo = entity.byType.get(t) ?? null
                      return (
                        <td key={t} className="py-1.5 px-1 text-center">
                          <div
                            className={`rounded-sm px-1 py-1 text-[11px] font-medium ${getFreshnessColor(hoursAgo)} ${getFreshnessTextColor(hoursAgo)}`}
                            title={hoursAgo !== null ? `${Math.round(hoursAgo)}h ago` : 'Never assessed'}
                          >
                            {getFreshnessLabel(hoursAgo)}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
