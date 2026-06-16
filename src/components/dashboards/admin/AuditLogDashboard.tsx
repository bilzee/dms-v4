'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getAuthToken, createAuthenticatedFetch } from '@/lib/auth/token-utils'
import { apiGet } from '@/lib/api'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { ContentSkeleton } from '@/components/shared/ContentSkeleton'
import {
  History,
  Search,
  Download,
  RefreshCw,
  Filter,
  X,
  User,
  Calendar,
  Activity,
  Clock,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
} from '@/lib/icons'

interface AuditLogDashboardProps {
  initialFilters?: {
    tab?: string
    actions?: string[]
    resources?: string[]
    userIds?: string[]
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    searchText?: string
    dateRange?: any
    export?: string
  }
  className?: string
}

interface AuditLogEntry {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: string
  action: string
  resource: string
  resourceId: string
  oldValues: Record<string, any>
  newValues: Record<string, any>
  timestamp: string
  ipAddress: string | null
  userAgent: string | null
}

interface AuditSummary {
  totalEntries: number
  uniqueUsers: number
  actionTypes: number
  lastActivity: string | null
  actionBreakdown: { action: string; count: number }[]
}

interface AuditFilters {
  availableActions: { action: string; count: number }[]
  availableResources: { resource: string; count: number }[]
}

interface AuditFiltersState {
  action: string
  resource: string
  userId: string
  search: string
  dateRange: 'today' | 'week' | 'month' | 'all'
  page: number
  pageSize: number
}

async function fetchAuditLogs(
  filters: AuditFiltersState
): Promise<{
  items: AuditLogEntry[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  summary: AuditSummary
  filters: AuditFilters
}> {
  const params = new URLSearchParams()

  if (filters.action && filters.action !== 'all') params.set('action', filters.action)
  if (filters.resource && filters.resource !== 'all') params.set('resource', filters.resource)
  if (filters.userId && filters.userId !== 'all') params.set('userId', filters.userId)
  if (filters.search) params.set('search', filters.search)
  if (filters.page > 1) params.set('page', filters.page.toString())
  if (filters.pageSize !== 50) params.set('pageSize', filters.pageSize.toString())

  const now = new Date()
  if (filters.dateRange === 'today') {
    params.set('startDate', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
  } else if (filters.dateRange === 'week') {
    params.set('startDate', new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString())
  } else if (filters.dateRange === 'month') {
    params.set('startDate', new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString())
  }

  const result = await apiGet<any>(`/api/v1/system/audit?${params.toString()}`)
  if (!result.success) throw new Error(result.error || 'Failed to fetch audit logs')
  return result.data
}

function getActionColor(action: string): string {
  const upper = action.toUpperCase()
  if (upper.includes('CREATE') || upper.includes('ADD') || upper.includes('ASSIGN'))
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('MODIFY'))
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  if (upper.includes('DELETE') || upper.includes('REMOVE'))
    return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
  if (upper.includes('VERIFY') || upper.includes('APPROVE') || upper.includes('CONFIRM'))
    return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
  if (upper.includes('REJECT') || upper.includes('DENY') || upper.includes('DISABLE'))
    return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
  if (upper.includes('LOGIN') || upper.includes('LOGOUT') || upper.includes('AUTH'))
    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
}

export default function AuditLogDashboard({ initialFilters, className }: AuditLogDashboardProps = {}) {
  const [filters, setFilters] = useState<AuditFiltersState>({
    action: initialFilters?.actions?.[0] || 'all',
    resource: initialFilters?.resources?.[0] || 'all',
    userId: initialFilters?.userIds?.[0] || 'all',
    search: initialFilters?.searchText || '',
    dateRange: 'all',
    page: initialFilters?.page || 1,
    pageSize: initialFilters?.pageSize || 50,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.search)

  const token = typeof window !== 'undefined' ? getAuthToken() : null

  const { data: auditData, isLoading, error, refetch } = useQuery({
    queryKey: ['system-audit-logs', filters],
    queryFn: () => {
      if (!token) throw new Error('No authentication token available')
      return fetchAuditLogs(filters)
    },
    staleTime: 30000,
    enabled: !!token,
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams()
      if (filters.action && filters.action !== 'all') params.set('action', filters.action)
      if (filters.resource && filters.resource !== 'all') params.set('resource', filters.resource)
      if (filters.userId && filters.userId !== 'all') params.set('userId', filters.userId)
      if (filters.search) params.set('search', filters.search)

      const now = new Date()
      if (filters.dateRange === 'today') {
        params.set('startDate', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
      } else if (filters.dateRange === 'week') {
        params.set('startDate', new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString())
      } else if (filters.dateRange === 'month') {
        params.set('startDate', new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString())
      }

      const authenticatedFetch = createAuthenticatedFetch
      const response = await authenticatedFetch(`/api/v1/system/audit/export?${params.toString()}`)
      if (!response.ok) throw new Error('Export failed')
      return response.blob()
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Audit log exported successfully')
      setShowExportDialog(false)
    },
    onError: (error: Error) => {
      toast.error('Export failed', { description: error.message })
    },
  })

  const updateFilter = useCallback((key: keyof AuditFiltersState, value: any) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }
      if (key !== 'page') next.page = 1
      return next
    })
  }, [])

  const handleSearch = useCallback(() => {
    setFilters(prev => ({ ...prev, search: searchInput, page: 1 }))
  }, [searchInput])

  const clearFilters = useCallback(() => {
    setFilters({
      action: 'all',
      resource: 'all',
      userId: 'all',
      search: '',
      dateRange: 'all',
      page: 1,
      pageSize: 50,
    })
    setSearchInput('')
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ContentSkeleton variant="metric" count={4} />
        <ContentSkeleton variant="card" />
        <ContentSkeleton variant="table" rows={8} cols={5} />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Activity className="h-12 w-12 mx-auto text-destructive" />
            <h3 className="text-lg font-semibold">Failed to load audit logs</h3>
            <p className="text-muted-foreground">{(error as Error).message}</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const entries = auditData?.items || []
  const pagination = auditData?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 }
  const summary = auditData?.summary || { totalEntries: 0, uniqueUsers: 0, actionTypes: 0, lastActivity: null, actionBreakdown: [] }
  const filterOptions = auditData?.filters || { availableActions: [], availableResources: [] }
  const hasActiveFilters = filters.action !== 'all' || filters.resource !== 'all' || filters.search || filters.dateRange !== 'all'

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <StatCardGrid columns={4}>
        <StatCard
          label="Total Entries"
          value={summary.totalEntries.toLocaleString()}
          severity="info"
          icon={History}
        />
        <StatCard
          label="Active Users"
          value={summary.uniqueUsers.toString()}
          severity="success"
          icon={User}
        />
        <StatCard
          label="Action Types"
          value={summary.actionTypes.toString()}
          severity="neutral"
          icon={Activity}
        />
        <StatCard
          label="Last Activity"
          value={summary.lastActivity ? formatDistanceToNow(new Date(summary.lastActivity), { addSuffix: true }) : 'None'}
          severity="warning"
          icon={Clock}
        />
      </StatCardGrid>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold">Audit Log Entries</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions, resources, users..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400' : ''}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <div className="px-6 pb-4">
            <div className="p-4 border border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/5 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400">Filter Options</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Action Type</label>
                  <Select value={filters.action} onValueChange={(v) => updateFilter('action', v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {filterOptions.availableActions.map(a => (
                        <SelectItem key={a.action} value={a.action}>
                          {a.action} ({a.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Resource Type</label>
                  <Select value={filters.resource} onValueChange={(v) => updateFilter('resource', v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Resources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Resources</SelectItem>
                      {filterOptions.availableResources.map(r => (
                        <SelectItem key={r.resource} value={r.resource}>
                          {r.resource} ({r.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Time Range</label>
                  <Select value={filters.dateRange} onValueChange={(v) => updateFilter('dateRange', v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No audit entries found</h3>
              <p className="text-muted-foreground text-sm">
                {hasActiveFilters
                  ? 'Try adjusting your filters to see more results.'
                  : 'Audit log entries will appear here as users interact with the system.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-2">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <button
                    className="w-full px-4 py-3 flex items-start gap-3 text-left"
                    onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  >
                    {expandedEntry === entry.id ? (
                      <ChevronDown className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-xs font-mono ${getActionColor(entry.action)}`}>
                          {entry.action}
                        </Badge>
                        <span className="text-sm font-medium">{entry.resource}</span>
                        {entry.resourceId && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {entry.resourceId}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {entry.userName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                        </span>
                        {entry.ipAddress && (
                          <span className="text-xs font-mono">{entry.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {expandedEntry === entry.id && (
                    <div className="px-4 pb-4 pl-11 space-y-3">
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {entry.oldValues && Object.keys(entry.oldValues).length > 0 && (
                          <div className="space-y-1.5">
                            <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                              Previous Values
                            </h5>
                            <pre className="text-xs bg-red-500/5 border border-red-500/10 rounded p-3 overflow-auto max-h-40 font-mono">
                              {JSON.stringify(entry.oldValues, null, 2)}
                            </pre>
                          </div>
                        )}
                        {entry.newValues && Object.keys(entry.newValues).length > 0 && (
                          <div className="space-y-1.5">
                            <h5 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
                              New Values
                            </h5>
                            <pre className="text-xs bg-green-500/5 border border-green-500/10 rounded p-3 overflow-auto max-h-40 font-mono">
                              {JSON.stringify(entry.newValues, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        <span><strong>User:</strong> {entry.userName} ({entry.userEmail})</span>
                        <span><strong>Role:</strong> {entry.userRole}</span>
                        {entry.userAgent && <span><strong>Agent:</strong> {entry.userAgent.substring(0, 80)}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => updateFilter('page', pagination.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => updateFilter('page', pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {summary.actionBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Top Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {summary.actionBreakdown.slice(0, 10).map(item => (
                <div key={item.action} className="text-center p-3 rounded-lg border bg-muted/30">
                  <div className="text-lg font-bold">{item.count.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground truncate" title={item.action}>
                    {item.action.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Export Audit Logs
            </DialogTitle>
            <DialogDescription>
              Export the current filtered audit log entries as a CSV file.
              {hasActiveFilters && ' Only matching entries will be exported.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="text-sm text-muted-foreground">
              <p>This will export up to 10,000 entries matching your current filters as a CSV file.</p>
              {hasActiveFilters && (
                <div className="mt-3 space-y-1">
                  <p className="font-medium">Active filters:</p>
                  {filters.action !== 'all' && <p>Action: {filters.action}</p>}
                  {filters.resource !== 'all' && <p>Resource: {filters.resource}</p>}
                  {filters.search && <p>Search: &quot;{filters.search}&quot;</p>}
                  {filters.dateRange !== 'all' && <p>Date Range: {filters.dateRange}</p>}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              {exportMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
