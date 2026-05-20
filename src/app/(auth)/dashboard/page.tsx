'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCommitmentStats } from '@/hooks/use-commitment-stats'
import { apiGet } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
} from 'lucide-react'

export default function DashboardPage() {
  const { user, hasPermission, hasRole, token } = useAuth()
  const { stats, recentCommitments, loading, error } = useCommitmentStats()

  const [systemHealth, setSystemHealth] = useState<{
    databaseSync: string
    apiResponseTime: number
    activeUsers: number
    storageUsage: number
    lastBackup: string
  } | null>(null)
  const [activeIncidents, setActiveIncidents] = useState(0)
  const [pendingVerifications, setPendingVerifications] = useState(0)

  useEffect(() => {
    if (!token) return

    const fetchHealth = async () => {
      try {
        const result = await apiGet('/api/v1/system/health')
        if (result.success && result.data) {
          setSystemHealth(result.data)
        }
      } catch {}
    }

    const fetchDashboardCounts = async () => {
      try {
        const [incidentsResult, assessmentsResult] = await Promise.all([
          apiGet('/api/v1/incidents?status=ACTIVE'),
          apiGet('/api/v1/rapid-assessments?status=SUBMITTED&verificationStatus=DRAFT')
        ])
        if (incidentsResult.success) {
          const incData = incidentsResult.data
          setActiveIncidents(incData?.incidents?.length || incData?.length || 0)
        }
        if (assessmentsResult.success) {
          const assData = assessmentsResult.data
          setPendingVerifications(assData?.assessments?.length || assData?.length || 0)
        }
      } catch {}
    }

    fetchHealth()
    fetchDashboardCounts()
    const interval = setInterval(fetchHealth, 60000)
    return () => clearInterval(interval)
  }, [token])

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
            <p className="text-gray-600">Welcome back, {(user as any).name}</p>
          </div>
        </div>
        
        {/* Quick Action Bar */}
        <div className="flex flex-wrap gap-3 mt-6">
          {hasRole('COORDINATOR') && (
            <>
              <Link href="/coordinator/situation-dashboard">
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
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
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
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
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
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
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
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

      {/* At-a-Glance Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* System Status */}
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Status</p>
                <p className={`text-2xl font-bold ${systemHealth?.databaseSync !== 'Down' ? 'text-green-600' : 'text-red-600'}`}>{systemHealth?.databaseSync !== 'Down' ? 'Online' : 'Offline'}</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        {/* Active Incidents */}
        {hasRole('COORDINATOR') && (
          <Card className="border-orange-200 bg-orange-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Incidents</p>
                  <p className="text-2xl font-bold text-orange-600">{activeIncidents}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Commitments */}
        {hasRole('RESPONDER') && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Commitments</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats?.availableCommitments || 0}
                  </p>
                </div>
                <HandHeart className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Verifications */}
        {hasPermission('VERIFY_ASSESSMENTS') && (
          <Card className="border-purple-200 bg-purple-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Verifications</p>
                  <p className="text-2xl font-bold text-purple-600">{pendingVerifications}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>New incident reported in North Region</span>
                <span className="text-muted-foreground ml-auto">2 min ago</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>5 new assessments completed</span>
                <span className="text-muted-foreground ml-auto">15 min ago</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Donor commitment verified</span>
                <span className="text-muted-foreground ml-auto">1 hour ago</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Resource allocation updated</span>
                <span className="text-muted-foreground ml-auto">2 hours ago</span>
              </div>
              <Link href="/coordinator/situation-dashboard">
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
                  <span className={`text-sm ${systemHealth?.databaseSync === 'Healthy' ? 'text-green-600' : systemHealth?.databaseSync === 'Down' ? 'text-red-600' : 'text-yellow-600'}`}>{systemHealth?.databaseSync || '...'}</span>
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
          <Card className="border-teal-200 bg-teal-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-teal-600" />
                Situation Awareness
              </CardTitle>
              <CardDescription>
                Real-time crisis monitoring and response coordination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-white/60 rounded-lg p-4 border border-teal-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Live Incidents</span>
                    <span className="font-bold text-teal-600">{activeIncidents} Active</span>
                  </div>
                </div>
                <Link href="/coordinator/situation-dashboard">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700">
                    Open Situation Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {hasRole('ASSESSOR') && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                Field Assessments
              </CardTitle>
              <CardDescription>
                Create and manage preliminary and rapid assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending Assessments</span>
                    <span className="font-bold text-blue-600">2</span>
                  </div>
                </div>
                <Link href="/assessor/preliminary-assessment">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Create New Assessment
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {hasRole('RESPONDER') && (
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Response Planning
              </CardTitle>
              <CardDescription>
                Plan and coordinate disaster response resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-white/60 rounded-lg p-4 border border-green-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Available Commitments</span>
                    <span className="font-bold text-green-600">
                      {stats?.availableCommitments || 0}
                    </span>
                  </div>
                </div>
                <Link href="/responder/planning/new">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Plan New Response
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {hasPermission('VIEW_DONOR_DASHBOARD') && (
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HandHeart className="h-5 w-5 text-purple-600" />
                Donor Commitments
              </CardTitle>
              <CardDescription>
                Manage your aid commitments and track performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-white/60 rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Commitments</span>
                    <span className="font-bold text-purple-600">
                      {stats?.totalCommitments || 0}
                    </span>
                  </div>
                </div>
                <Link href="/donor/dashboard?action=new-commitment">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Register New Commitment
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {hasPermission('VERIFY_ASSESSMENTS') && (
          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-orange-600" />
                Verification Queue
              </CardTitle>
              <CardDescription>
                Review and verify submitted assessments and deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-white/60 rounded-lg p-4 border border-orange-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending Items</span>
                    <span className="font-bold text-orange-600">{pendingVerifications}</span>
                  </div>
                </div>
                <Link href="/coordinator/verification">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">
                    Review Queue
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {hasPermission('MANAGE_USERS') && (
          <Card className="border-red-200 bg-red-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-red-600" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage system users, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-white/60 rounded-lg p-4 border border-red-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Users</span>
                    <span className="font-bold text-red-600">{systemHealth?.activeUsers || '...'}</span>
                  </div>
                </div>
                <Link href="/admin/users">
                  <Button className="w-full bg-red-600 hover:bg-red-700">
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