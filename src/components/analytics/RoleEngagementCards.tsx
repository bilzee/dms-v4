'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from '@/lib/icons'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'

const ROLE_CONFIG: Record<string, { label: string; severity: 'neutral' | 'info' | 'warning' | 'success' | 'critical' }> = {
  ASSESSOR: { label: 'Assessor', severity: 'neutral' },
  RESPONDER: { label: 'Responder', severity: 'success' },
  DONOR: { label: 'Donor', severity: 'warning' },
  COORDINATOR: { label: 'Coordinator', severity: 'info' },
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
        <StatCardGrid columns={2}>
          {data.map((item) => {
            const config = ROLE_CONFIG[item.role]
            if (!config) return null
            return (
              <StatCard
                key={item.role}
                label={config.label}
                value={item.totalSignals}
                severity={config.severity}
                variant="compact"
              />
            )
          })}
        </StatCardGrid>
      </CardContent>
    </Card>
  )
}
