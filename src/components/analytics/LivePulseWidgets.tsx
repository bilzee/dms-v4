'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Flame, Gauge } from '@/lib/icons'
import type { LivePulseData } from '@/hooks/useCoordinatorAnalytics'

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNCLASSIFIED'] as const
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-600 dark:text-red-400',
  HIGH: 'text-orange-600 dark:text-orange-400',
  MEDIUM: 'text-yellow-600 dark:text-yellow-400',
  LOW: 'text-blue-600 dark:text-blue-400',
  UNCLASSIFIED: 'text-gray-600 dark:text-gray-400',
}
const SEVERITY_BG: Record<string, string> = {
  CRITICAL: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800',
  HIGH: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-800',
  MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-800',
  LOW: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800',
  UNCLASSIFIED: 'bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-800',
}

const EVENT_TYPE_ICONS: Record<string, string> = {
  ASSESSMENT_CREATED: '📋',
  RESPONSE_DELIVERED: '📦',
}

function getEventIcon(eventType: string): string {
  if (eventType.startsWith('SIGNAL_')) return '🔔'
  return EVENT_TYPE_ICONS[eventType] || '•'
}

function getEventBadge(priority: string | null): string {
  if (!priority) return ''
  return SEVERITY_COLORS[priority] || ''
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

export function AlertPulseDashboard({ data }: { data: LivePulseData }) {
  const totalAlerts = data.alertCounts.reduce((s, a) => s + a.count, 0)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SEVERITY_ORDER.map(sev => {
          const found = data.alertCounts.find(a => a.priority === sev)
          const count = found?.count ?? 0
          if (sev === 'UNCLASSIFIED' && count === 0) return null
          return (
            <div
              key={sev}
              className={`rounded-lg border p-4 text-center ${SEVERITY_BG[sev]}`}
            >
              <div className={`text-3xl font-bold ${SEVERITY_COLORS[sev]}`}>
                {count}
              </div>
              <div className="text-xs font-medium mt-1">{sev}</div>
              <div className="text-xs text-muted-foreground">
                {totalAlerts > 0 ? ((count / totalAlerts) * 100).toFixed(0) : 0}% of alerts
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeverityTimeline severityTimeline={data.severityTimeline} />
        <RecentEventsFeed recentEvents={data.recentEvents} />
      </div>
    </>
  )
}

function SeverityTimeline({ severityTimeline }: { severityTimeline: LivePulseData['severityTimeline'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-5 w-5" />
          Incidents by Severity
        </CardTitle>
        <p className="text-xs text-muted-foreground">Active incidents in selected period, sorted by last update</p>
      </CardHeader>
      <CardContent>
        {severityTimeline.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No incidents in this period.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {severityTimeline.map((entry, i) => {
              const date = new Date(entry.date)
              return (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      entry.severity === 'CRITICAL' ? 'bg-red-500' :
                      entry.severity === 'HIGH' ? 'bg-orange-500' :
                      entry.severity === 'MEDIUM' ? 'bg-yellow-500' :
                      entry.severity === 'LOW' ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{entry.name}</div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{entry.type}</span>
                        <span className={`font-semibold ${SEVERITY_COLORS[entry.severity]}`}>{entry.severity}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentEventsFeed({ recentEvents }: { recentEvents: LivePulseData['recentEvents'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5" />
          Live Event Feed
        </CardTitle>
        <p className="text-xs text-muted-foreground">Last 24 hours</p>
      </CardHeader>
      <CardContent>
        {recentEvents.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No recent events.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <span className="text-lg shrink-0 mt-0.5">{getEventIcon(event.eventType)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{event.description}</span>
                    {event.priority && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${getEventBadge(event.priority)}`}
                      >
                        {event.priority}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {timeAgo(event.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
