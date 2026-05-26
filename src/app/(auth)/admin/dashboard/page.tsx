'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'

import { 
  Users, 
  Settings, 
  Database, 
  FileText,
  TrendingUp, 
  AlertTriangle, 
  Shield,
  Activity,
  RefreshCw,
  Server,
  UserCheck,
  UserX,
  Building2,
  CheckCircle,
  Clock,
  BarChart3,
  HandHeart,
  Package
} from '@/lib/icons'

import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { apiGet } from '@/lib/api'

interface HealthData {
  databaseSync: string
  apiResponseTime: number
  activeUsers: number
  storageUsage: number
  lastBackup: string
  services?: { name: string; status: string; uptime: string }[]
}

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  lockedUsers: number
  totalEntities: number
  totalDonors: number
  activeIncidents: number
  totalIncidents: number
  pendingVerifications: number
  completedToday: number
  totalCommitments: number
  totalDelivered: number
}

interface RoleDistribution {
  role: string
  count: number
}

interface RecentUser {
  id: string
  name: string
  email: string
  isActive: boolean
  lastLogin: string | null
  roles: { role: { name: string } }[]
}

function AdminDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = React.useState('overview')
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const [stats, setStats] = React.useState<DashboardStats>({
    totalUsers: 0, activeUsers: 0, inactiveUsers: 0, lockedUsers: 0,
    totalEntities: 0, totalDonors: 0, activeIncidents: 0, totalIncidents: 0,
    pendingVerifications: 0, completedToday: 0, totalCommitments: 0, totalDelivered: 0,
  })
  const [healthData, setHealthData] = React.useState<HealthData | null>(null)
  const [roleDistribution, setRoleDistribution] = React.useState<RoleDistribution[]>([])
  const [recentUsers, setRecentUsers] = React.useState<RecentUser[]>([])
  const [incidentBreakdown, setIncidentBreakdown] = React.useState<Record<string, number>>({})
  const [donorMetrics, setDonorMetrics] = React.useState<{ totalDonors: number; avgVerificationRate: number; totalCommitments: number } | null>(null)
  const [verificationMetrics, setVerificationMetrics] = React.useState<{ totalPending: number; totalVerified: number; verificationRate: number; rejectionRate: number } | null>(null)

  const loadDashboard = React.useCallback(async () => {
    try {
      const [usersRes, entitiesRes, incidentsRes, healthRes, donorsRes, coordinatorStatsRes, donorMetricsRes, verifMetricsRes] = await Promise.allSettled([
        apiGet('/api/v1/users?limit=1000'),
        apiGet('/api/v1/entities?limit=1000'),
        apiGet('/api/v1/incidents?limit=100'),
        apiGet('/api/v1/system/health'),
        apiGet('/api/v1/donors?limit=1000'),
        apiGet('/api/v1/coordinator/dashboard/stats'),
        apiGet('/api/v1/donors/metrics'),
        apiGet('/api/v1/verification/metrics'),
      ])

      const users = usersRes.status === 'fulfilled' && usersRes.value.success
        ? (usersRes.value.data?.items || usersRes.value.data?.users || [])
        : []
      const entities = entitiesRes.status === 'fulfilled' && entitiesRes.value.success
        ? (entitiesRes.value.data?.items || entitiesRes.value.data?.entities || [])
        : []
      const incidents = incidentsRes.status === 'fulfilled' && incidentsRes.value.success
        ? (incidentsRes.value.data?.items || incidentsRes.value.data?.incidents || [])
        : []
      const health = healthRes.status === 'fulfilled' && healthRes.value.success ? healthRes.value.data : null
      const donors = donorsRes.status === 'fulfilled' && donorsRes.value.success
        ? (donorsRes.value.data?.items || donorsRes.value.data?.donors || [])
        : []
      const coordStats = coordinatorStatsRes.status === 'fulfilled' && coordinatorStatsRes.value.success
        ? coordinatorStatsRes.value.data : null

      const activeUsers = users.filter((u: any) => u.isActive).length
      const inactiveUsers = users.filter((u: any) => !u.isActive).length
      const lockedUsers = users.filter((u: any) => u.isLocked).length
      const activeIncidents = incidents.filter((i: any) => i.status === 'ACTIVE').length

      const roleMap: Record<string, number> = {}
      users.forEach((u: any) => {
        (u.roles || []).forEach((r: any) => {
          const name = r.role?.name || r.roleName || 'Unknown'
          roleMap[name] = (roleMap[name] || 0) + 1
        })
      })
      setRoleDistribution(Object.entries(roleMap).map(([role, count]) => ({ role, count })))

      const bySeverity: Record<string, number> = {}
      incidents.forEach((i: any) => {
        const sev = i.severity || 'Unknown'
        bySeverity[sev] = (bySeverity[sev] || 0) + 1
      })
      setIncidentBreakdown(bySeverity)

      const sorted = [...users].sort((a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )
      setRecentUsers(sorted.slice(0, 8))

      setStats({
        totalUsers: users.length,
        activeUsers,
        inactiveUsers,
        lockedUsers,
        totalEntities: entities.length,
        totalDonors: donors.length,
        activeIncidents,
        totalIncidents: incidents.length,
        pendingVerifications: coordStats?.pendingVerification?.total || 0,
        completedToday: coordStats?.completedToday?.total || 0,
        totalCommitments: coordStats?.pendingVerification?.total || 0,
        totalDelivered: coordStats?.completedToday?.total || 0,
      })

      if (health) setHealthData(health)

      if (donorMetricsRes.status === 'fulfilled' && donorMetricsRes.value.success && donorMetricsRes.value.data?.overall) {
        const o = donorMetricsRes.value.data.overall
        setDonorMetrics({ totalDonors: o.totalDonors, avgVerificationRate: o.averageVerificationRate, totalCommitments: o.totalCommitments })
      }

      if (verifMetricsRes.status === 'fulfilled' && verifMetricsRes.value.success && verifMetricsRes.value.data) {
        const d = verifMetricsRes.value.data
        setVerificationMetrics({ totalPending: d.totalPending, totalVerified: d.totalVerified, verificationRate: d.verificationRate, rejectionRate: d.rejectionRate })
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    if (user) loadDashboard()
  }, [user, loadDashboard])

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboard()
  }

  const healthBadgeVariant = (status: string) => {
    if (status === 'Healthy' || status === 'Running') return 'default' as const
    if (status === 'Degraded') return 'secondary' as const
    return 'destructive' as const
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading admin dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src="" />
            <AvatarFallback className="text-lg">
              {user?.name?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">System Administration &mdash; {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <StatCardGrid columns={4}>
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} severity="info" trend={{ value: stats.activeUsers, label: `${stats.activeUsers} active` }} />
        <StatCard label="Active Incidents" value={stats.activeIncidents} icon={AlertTriangle} severity={stats.activeIncidents > 0 ? 'warning' : 'success'} trend={{ value: stats.totalIncidents, label: `${stats.totalIncidents} total` }} />
        <StatCard label="Total Entities" value={stats.totalEntities} icon={Building2} severity="info" />
        <StatCard label="Donors" value={stats.totalDonors} icon={HandHeart} severity="info" trend={donorMetrics ? { value: Math.round(donorMetrics.avgVerificationRate * 100), label: `${Math.round(donorMetrics.avgVerificationRate * 100)}% verified` } : undefined} />
      </StatCardGrid>

      <StatCardGrid columns={4}>
        <StatCard label="Pending Verifications" value={stats.pendingVerifications} icon={Clock} severity={stats.pendingVerifications > 0 ? 'warning' : 'success'} />
        <StatCard label="Completed Today" value={stats.completedToday} icon={CheckCircle} severity="success" />
        <StatCard label="Inactive Users" value={stats.inactiveUsers} icon={UserX} severity={stats.inactiveUsers > 0 ? 'warning' : 'neutral'} />
        <StatCard label="Locked Accounts" value={stats.lockedUsers} icon={Shield} severity={stats.lockedUsers > 0 ? 'critical' : 'success'} />
      </StatCardGrid>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  User Overview
                </CardTitle>
                <CardDescription>User account statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 border rounded">
                      <div className="text-2xl font-bold text-blue-600">{stats.activeUsers}</div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <div className="text-2xl font-bold text-amber-600">{stats.inactiveUsers}</div>
                      <div className="text-xs text-muted-foreground">Inactive</div>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <div className="text-2xl font-bold text-red-600">{stats.lockedUsers}</div>
                      <div className="text-xs text-muted-foreground">Locked</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Roles Distribution</div>
                    <div className="space-y-2">
                      {roleDistribution.map(({ role, count }) => (
                        <div key={role} className="flex items-center justify-between">
                          <span className="text-sm">{role}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={(count / stats.totalUsers) * 100} className="w-20 h-2" />
                            <span className="text-sm font-medium w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Incident Summary
                </CardTitle>
                <CardDescription>Active incidents by severity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.keys(incidentBreakdown).length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 border rounded">
                          <div className="text-2xl font-bold text-orange-600">{stats.activeIncidents}</div>
                          <div className="text-xs text-muted-foreground">Active</div>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <div className="text-2xl font-bold text-green-600">{stats.totalIncidents - stats.activeIncidents}</div>
                          <div className="text-xs text-muted-foreground">Resolved/Closed</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(incidentBreakdown).map(([severity, count]) => (
                          <div key={severity} className="flex items-center justify-between">
                            <Badge variant={severity === 'CRITICAL' ? 'destructive' : severity === 'HIGH' ? 'default' : 'secondary'}>
                              {severity}
                            </Badge>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No incidents recorded</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Recent Users
              </CardTitle>
              <CardDescription>Latest registered user accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {recentUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(u.roles || []).map((r, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{r.role?.name || 'N/A'}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? 'default' : 'secondary'}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No users found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Quick access to user administration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full"><a href="/admin/users">Manage Users</a></Button>
                <Button asChild variant="outline" className="w-full"><a href="/roles">Role Management</a></Button>
                <Button asChild variant="outline" className="w-full"><a href="/admin/users?action=create">Create User</a></Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  User Statistics
                </CardTitle>
                <CardDescription>Account status and role distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Active vs Inactive</span>
                      <span className="text-sm text-muted-foreground">{stats.activeUsers}/{stats.totalUsers}</span>
                    </div>
                    <Progress value={stats.totalUsers > 0 ? (stats.activeUsers / stats.totalUsers) * 100 : 0} className="h-3" />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-3">Users by Role</div>
                    <div className="space-y-3">
                      {roleDistribution.map(({ role, count }) => (
                        <div key={role} className="flex items-center gap-3">
                          <span className="text-sm w-24">{role}</span>
                          <Progress value={(count / stats.totalUsers) * 100} className="flex-1 h-2" />
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  System Settings
                </CardTitle>
                <CardDescription>Configure system parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full"><a href="/system/settings">System Settings</a></Button>
                <Button asChild variant="outline" className="w-full"><a href="/system/database">Database Management</a></Button>
                <Button asChild variant="outline" className="w-full"><a href="/system/health">System Health</a></Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  System Monitoring
                </CardTitle>
                <CardDescription>Real-time system metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(healthData?.services || []).map((svc) => (
                    <div key={svc.name} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{svc.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={healthBadgeVariant(svc.status)}>{svc.status}</Badge>
                        <span className="text-xs text-muted-foreground">{svc.uptime}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Database</span>
                    </div>
                    <Badge variant={healthBadgeVariant(healthData?.databaseSync || 'Unknown')}>
                      {healthData?.databaseSync || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">API Response</span>
                    </div>
                    <Badge variant={healthData && healthData.apiResponseTime < 500 ? 'default' : 'destructive'}>
                      {healthData ? `${healthData.apiResponseTime}ms` : 'N/A'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Account Security
                </CardTitle>
                <CardDescription>User account security status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Active Accounts</span>
                    </div>
                    <Badge variant="default">{stats.activeUsers}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-amber-600" />
                      <span className="text-sm">Inactive Accounts</span>
                    </div>
                    <Badge variant="secondary">{stats.inactiveUsers}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Locked Accounts</span>
                    </div>
                    <Badge variant={stats.lockedUsers > 0 ? 'destructive' : 'default'}>{stats.lockedUsers}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Users Online (24h)</span>
                    </div>
                    <Badge variant="default">{healthData?.activeUsers || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Verification Status
                </CardTitle>
                <CardDescription>Data verification metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {verificationMetrics ? (
                    <>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">Pending Verification</span>
                        <Badge variant={verificationMetrics.totalPending > 0 ? 'secondary' : 'default'}>{verificationMetrics.totalPending}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">Total Verified</span>
                        <Badge variant="default">{verificationMetrics.totalVerified}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">Verification Rate</span>
                        <Badge variant={verificationMetrics.verificationRate > 0.7 ? 'default' : 'destructive'}>
                          {(verificationMetrics.verificationRate * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">Rejection Rate</span>
                        <Badge variant={verificationMetrics.rejectionRate > 0.2 ? 'destructive' : 'default'}>
                          {(verificationMetrics.rejectionRate * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>Verification data unavailable</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HandHeart className="mr-2 h-5 w-5" />
                  Donor Performance
                </CardTitle>
                <CardDescription>Donor metrics and commitment tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {donorMetrics ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 border rounded">
                          <div className="text-2xl font-bold text-blue-600">{donorMetrics.totalDonors}</div>
                          <div className="text-xs text-muted-foreground">Total Donors</div>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <div className="text-2xl font-bold text-green-600">{donorMetrics.totalCommitments}</div>
                          <div className="text-xs text-muted-foreground">Total Commitments</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">Avg Verification Rate</span>
                        <Badge variant={donorMetrics.avgVerificationRate > 0.7 ? 'default' : 'destructive'}>
                          {(donorMetrics.avgVerificationRate * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>Donor metrics unavailable</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  System Summary
                </CardTitle>
                <CardDescription>Overall system statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Total Users</span>
                    </div>
                    <Badge>{stats.totalUsers}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Tracked Entities</span>
                    </div>
                    <Badge>{stats.totalEntities}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Active Incidents</span>
                    </div>
                    <Badge variant={stats.activeIncidents > 0 ? 'destructive' : 'default'}>{stats.activeIncidents}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <HandHeart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Active Donors</span>
                    </div>
                    <Badge>{stats.totalDonors}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Completed Today</span>
                    </div>
                    <Badge variant="default">{stats.completedToday}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AdminDashboardPage() {
  return (
    <RoleBasedRoute requiredRole="ADMIN" fallbackPath="/dashboard">
      <AdminDashboard />
    </RoleBasedRoute>
  )
}

export default AdminDashboardPage
