'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from '@/lib/icons'

const ROLE_CONFIG: Record<string, { label: string; bgClass: string; barClass: string }> = {
  ASSESSOR: {
    label: 'Assessor',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    barClass: 'bg-purple-500',
  },
  RESPONDER: {
    label: 'Responder',
    bgClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    barClass: 'bg-green-500',
  },
  DONOR: {
    label: 'Donor',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    barClass: 'bg-amber-500',
  },
  COORDINATOR: {
    label: 'Coordinator',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    barClass: 'bg-blue-500',
  },
}

interface RoleEngagementCardsProps {
  data: Array<{ role: string; totalSignals: number; resolvedSignals: number; resolutionRate: number }> | null
}

export function RoleEngagementCards({ data }: RoleEngagementCardsProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Role Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No role engagement data available.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" />
          Role Engagement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map((item) => {
            const config = ROLE_CONFIG[item.role]
            if (!config) return null
            return (
              <div
                key={item.role}
                className={`rounded-lg p-4 ${config.bgClass}`}
              >
                <div className="font-semibold text-sm mb-2">{config.label}</div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold">{item.totalSignals}</span>
                  <span className="text-xs opacity-75">signals</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-semibold">{item.resolutionRate.toFixed(0)}%</span>
                  <span className="text-xs opacity-75">resolved</span>
                </div>
                <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${config.barClass}`}
                    style={{ width: `${Math.min(item.resolutionRate, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
