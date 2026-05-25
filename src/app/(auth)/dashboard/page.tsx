'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useCommitmentStats } from '@/hooks/use-commitment-stats'
import { apiGet } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  LayoutDashboard,
  Monitor,
  AlertTriangle,
  ClipboardList,
  Package,
  HandHeart,
  Users,
  Settings,
  FileText,
  Shield,
  Activity,
  PlusCircle,
  CheckCircle,
  UserCog,
  TrendingUp,
  Clock
} from '@/lib/icons'

export default function DashboardPage() {
  const { user, hasPermission, hasRole, currentRole, token } = useAuth()
  const { stats, recentCommitments, loading, error } = useCommitmentStats()

  // System health query with auto-refresh every 60s
  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/system/health')
      if (result.success && result.data) return result.data
      throw new Error(result.error || 'Failed to fetch system health')
    },
    enabled: !!token,
    staleTime: 60000,
    refetchInterval: 60000,
  })

  // Active incidents count query
  const { data: activeIncidents = 0 } = useQuery({
    queryKey: ['dashboard-active-incidents'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/incidents?status=ACTIVE')
      if (result.success) {
        const incData = result.data
        return incData?.incidents?.length || incData?.length || 0
      }
      throw new Error(result.error || 'Failed to fetch incidents')
    },
    enabled: !!token,
    staleTime: 60000,
  })

  // Pending verifications count query
  const { data: pendingVerifications = 0 } = useQuery({
    queryKey: ['dashboard-pending-verifications'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/rapid-assessments?verificationStatus=SUBMITTED')
      if (result.success) {
        const assData = result.data
        return assData?.assessments?.length || assData?.length || 0
      }
      throw new Error(result.error || 'Failed to fetch verifications')
    },
    enabled: !!token,
    staleTime: 60000,
  })

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Enhanced Header with Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Home</h1>
            <p className="text-gray-600">Welcome back, {user.name}</p>
          </div>
        </div>
        
        {/* Quick Action Bar */}
        <div className="flex flex-wrap gap-3 mt-6">
          {hasRole('COORDINATOR') && (
            <>
              <Link href="/coordinator/situation-dashboard">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Monitor className="h-4 w-4 mr-2" />
                  Situation Dashboard
                </Button>
              </Link>
              <Link href="/coordinator/incidents?action=create">
                <Button size="sm" variant="outline">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Incident
                </Button>
              </Link>
            </>
          )}
          {hasRole('ASSESSOR') && (
            <>
              <Link href="/assessor/preliminary-assessment">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  New Assessment
                </Button>
              </Link>
              <Link href="/rapid-assessments">
                <Button size="sm" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Assessments
                </Button>
              </Link>
            </>
          )}
          {hasRole('RESPONDER') && (
            <>
              <Link href="/responder/planning/new">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Package className="h-4 w-4 mr-2" />
                  Plan Response
                </Button>
              </Link>
              <Link href="/responder/responses">
                <Button size="sm" variant="outline">
                  <Package className="h-4 w-4 mr-2" />
                  Active Responses
                </Button>
              </Link>
            </>
          )}
          {hasPermission('VIEW_DONOR_DASHBOARD') && (
            <>
              <Link href="/donor/dashboard?action=new-commitment">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <HandHeart className="h-4 w-4 mr-2" />
                  New Commitment
                </Button>
              </Link>
            </>
          )}
          {hasPermission('MANAGE_USERS') && (
            <Link href="/admin/users">
              <Button size="sm" variant="outline">
                <UserCog className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </Link>
          )}
        </div>
      </div>

      <StatCardGrid columns={4}>
        <StatCard
          label="System Status"
          value={systemHealth?.databaseSync !== 'Down' ? 'Online' : 'Offline'}
          severity="success"
          icon={Activity}
        />

        {hasRole('COORDINATOR') && (
          <StatCard
            label="Active Incidents"
            value={activeIncidents}
            severity="critical"
            icon={AlertTriangle}
          />
        )}

        {hasRole('RESPONDER') && (
          <StatCard
            label="Available Commitments"
            value={stats?.availableCommitments || 0}
            severity="info"
            icon={HandHeart}
          />
        )}

        {hasPermission('VERIFY_ASSESSMENTS') && (
          <StatCard
            label="Pending Verifications"
            value={pendingVerifications}
            severity="warning"
            icon={Clock}
          />
        )}
      </StatCardGrid>

      {/* Key Monitoring Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Recent Activity Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // Real activity data should come from an API; using empty array as default
                const recentActivity: Array<{ message: string; color: string; time: string }> = []
                if (recentActivity.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No recent activity to display</p>
                    </div>
                  )
                }
                return recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 ${activity.color} rounded-full`}></div>
                    <span>{activity.message}</span>
                    <span className="text-muted-foreground ml-auto">{activity.time}</span>
                  </div>
                ))
              })()}
              <Link href={currentRole === 'COORDINATOR' ? '/coordinator/situation-dashboard' : currentRole === 'DONOR' ? '/donor/analytics' : '/dashboard'}>
                <Button variant="outline" className="w-full mt-4" size="sm">
                  View All Activity
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* System Health Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database Sync</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 ${systemHealth?.databaseSync === 'Healthy' ? 'bg-green-500' : systemHealth?.databaseSync === 'Down' ? 'bg-red-500' : 'bg-yellow-500'} rounded-full`}></div>
                  <span className={`text-sm ${systemHealth?.databaseSync === 'Healthy' ? 'text-green-600 dark:text-green-400' : systemHealth?.databaseSync === 'Down' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{systemHealth?.databaseSync || '...'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Response Time</span>
                <span className="text-sm font-medium">{systemHealth?.apiResponseTime || '...'}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Users</span>
                <span className="text-sm font-medium">{systemHealth?.activeUsers || '...'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage Usage</span>
                <span className="text-sm font-medium">{systemHealth?.storageUsage ?? '...'}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Backup</span>
                <span className="text-sm font-medium">{systemHealth?.lastBackup || '...'}</span>
              </div>
              <Link href="/system/health">
                <Button variant="outline" className="w-full mt-4" size="sm">
                  Detailed Health Report
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role-Specific Essential Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hasRole('COORDINATOR') && (
          <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                Situation Awareness
              </CardTitle>
              <CardDescription>
                Real-time crisis monitoring and response coordination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-background/60 rounded-lg p-4 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Live Incidents</span>
                    <span className="font-bold text-primary">{activeIncidents} Active</span>
                  </div>
                </div>
                <Link href="/coordinator/situation-dashboard">
                  <Button className="w-full">
                    Open Situation Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {hasRole('ASSESSOR') && (
          <Card className="border-blue-200/50 bg-blue-50/30 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Field Assessments
              </CardTitle>
              <CardDescription>
                Create and manage preliminary and rapid assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-background/60 rounded-lg p-4 border border-blue-200/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending Assessments</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{pendingVerifications}</span>
                  </div>
                </div>
                <Link href="/assessor/preliminary-assessment">
                  <Button className="w-full">
                    Create New Assessment
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {hasRole('RESPONDER') && (
          <Card className="border-green-200/50 bg-green-50/30 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                Response Planning
              </CardTitle>
              <CardDescription>
                Plan and coordinate disaster response resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-background/60 rounded-lg p-4 border border-green-200/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Available Commitments</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {stats?.availableCommitments || 0}
                    </span>
                  </div>
                </div>
                <Link href="/responder/planning/new">
                  <Button className="w-full">
                    Plan New Response
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {hasPermission('VIEW_DONOR_DASHBOARD') && (
          <Card className="border-purple-200/50 bg-purple-50/30 dark:bg-purple-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HandHeart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Donor Commitments
              </CardTitle>
              <CardDescription>
                Manage your aid commitments and track performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-background/60 rounded-lg p-4 border border-purple-200/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Commitments</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {stats?.totalCommitments || 0}
                    </span>
                  </div>
                </div>
                <Link href="/donor/dashboard?action=new-commitment">
                  <Button className="w-full">
                    Register New Commitment
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {hasPermission('VERIFY_ASSESSMENTS') && (
          <Card className="border-orange-200/50 bg-orange-50/30 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                Verification Queue
              </CardTitle>
              <CardDescription>
                Review and verify submitted assessments and deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-background/60 rounded-lg p-4 border border-orange-200/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending Items</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{pendingVerifications}</span>
                  </div>
                </div>
                <Link href="/coordinator/verification">
                  <Button className="w-full">
                    Review Queue
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {hasPermission('MANAGE_USERS') && (
          <Card className="border-red-200/50 bg-red-50/30 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-red-600 dark:text-red-400" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage system users, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-background/60 rounded-lg p-4 border border-red-200/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Users</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{systemHealth?.activeUsers || '...'}</span>
                  </div>
                </div>
                <Link href="/admin/users">
                  <Button className="w-full">
                    Add New User
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}