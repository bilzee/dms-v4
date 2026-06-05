'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from '@/lib/icons'
import type { WorkloadData } from '@/hooks/useCoordinatorAnalytics'

function getWorkloadColor(pending: number): string {
  if (pending >= 10) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  if (pending >= 5) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
  return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
}

function WorkloadTable({
  title,
  items,
  label,
}: {
  title: string
  items: WorkloadData['assessors']
  label: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No {label.toLowerCase()} found.
          </div>
        ) : (
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium text-center">Assignments</th>
                  <th className="pb-2 pr-4 font-medium text-center">Completed</th>
                  <th className="pb-2 pr-4 font-medium text-center">Pending</th>
                  <th className="pb-2 font-medium">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.userId} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2 pr-4 font-medium">{item.userName}</td>
                    <td className="py-2 pr-4 text-center">{item.activeAssignments}</td>
                    <td className="py-2 pr-4 text-center">{item.completed}</td>
                    <td className="py-2 pr-4 text-center font-medium">{item.pending}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.activeAssignments > 0 ? (item.completed / item.activeAssignments >= 0.8 ? 'bg-green-500' : item.completed / item.activeAssignments >= 0.5 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-muted'
                            }`}
                            style={{ width: `${item.activeAssignments > 0 ? Math.min((item.completed / item.activeAssignments) * 100, 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.completed}/{item.activeAssignments} done
                        </span>
                      </div>
                    </td>
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

export function WorkloadDistributionChart({ data }: { data: WorkloadData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <WorkloadTable title="Assessor Workload" items={data.assessors} label="Assessors" />
      <WorkloadTable title="Responder Workload" items={data.responders} label="Responders" />
    </div>
  )
}
