'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building } from '@/lib/icons'

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  COMMUNITY: 'Community',
  CAMP: 'Camp',
  SHELTER: 'Shelter',
  HOSPITAL: 'Hospital',
  SCHOOL: 'School',
  HEALTH_CENTER: 'Health Center',
}

interface TopEntitiesTableProps {
  data: Array<{ id: string; name: string; type: string; unresolvedCount: number; highestPriority: string }>
}

export function TopEntitiesTable({ data }: TopEntitiesTableProps) {
  const rows = data.slice(0, 20)

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building className="h-5 w-5" />
            Top Entities by Unresolved Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No entity data available.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building className="h-5 w-5" />
          Top Entities by Unresolved Signals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Entity</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium text-right">Unresolved</th>
                <th className="pb-2 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entity) => (
                <tr key={entity.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 pr-4 font-medium">{entity.name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {ENTITY_TYPE_LABELS[entity.type] || entity.type}
                  </td>
                  <td className="py-2 pr-4 text-right font-medium">{entity.unresolvedCount}</td>
                  <td className="py-2">
                    <Badge
                      variant="outline"
                      className={PRIORITY_BADGE_CLASSES[entity.highestPriority] || ''}
                    >
                      {entity.highestPriority}
                    </Badge>
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
