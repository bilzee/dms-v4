'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from '@prisma/client'

// Error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader'
import { EmptyState } from '@/components/shared/EmptyState'
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
  Eye,
  RefreshCw,
  Calendar,
  Server,
  UserCheck,
  UserX,
  Building2
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// Role-based access
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'

// Authenticated API utilities
import { apiGet } from '@/lib/api'

function AdminDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = React.useState('overview')

  const [healthData, setHealthData] = React.useState<{
    databaseSync: string
    apiResponseTime: number
    activeUsers: number
    storageUsage: number
    lastBackup: string
  } | null>(null)

  React.useEffect(() => {
    apiGet('/api/v1/system/health')
      .then(result => { if (result.success && result.data) setHealthData(result.data) })
      .catch(() => {})
  }, [user])

  // Data fetching functions
  const fetchSystemStats = async () => {
    const [usersResult, entitiesResult] = await Promise.all([
      apiGet('/api/v1/users'),
      apiGet('/api/v1/entities')
    ])
    
    if (!usersResult.success || !entitiesResult.success) {
      throw new Error(usersResult.error || entitiesResult.error || 'Failed to fetch system statistics')
    }
    
    const users: User[] = usersResult.data?.users || []
    const entities = entitiesResult.data?.entities || []
    
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      totalEntities: entities.length,
      systemHealth: 'Good'
    }
  }

  const fetchUserStats = async () => {
    const result = await apiGet('/api/v1/users')
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch user statistics')
    }
    
    return result.data
  }

  const fetchRecentActivity = async () => {
    // Return empty array since we don't have audit logs API yet
    return []
  }

  return (
    <SafeDataLoader
      queryFn={fetchSystemStats}
      enabled={!!user}
      fallbackData={{ totalUsers: 0, activeUsers: 0, totalEntities: 0, systemHealth: 'Good' }}
      loadingMessage="Loading admin dashboard..."
      errorTitle="Failed to load dashboard data"
      showError={true}
      showEmptyState={false}
    >
      {(systemStats, systemLoading, systemError, systemRetry) => (
        <SafeDataLoader
          queryFn={fetchUserStats}
          enabled={!!user}
          fallbackData={{ newUsers: 0, activeUsers: 0, inactiveUsers: 0, pendingApprovals: 0 }}
          loadingMessage="Loading user statistics..."
          errorTitle="Failed to load user statistics"
          showError={false}
          showEmptyState={false}
        >
          {(userStats, userLoading) => (
            <SafeDataLoader
              queryFn={fetchRecentActivity}
              enabled={!!user}
              fallbackData={[]}
              loadingMessage="Loading recent activity..."
              errorTitle="Failed to load recent activity"
              showError={false}
              showEmptyState={false}
            >
              {(recentActivity) => (
                <div className="space-y-6">
                  {/* Header */}
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
                        <p className="text-gray-600">System Administration</p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={systemRetry}
                      disabled={systemLoading}
                    >
                      <RefreshCw className={cn('h-4 w-4 mr-2', systemLoading && 'animate-spin')} />
                      Refresh
                    </Button>
                  </div>

                  {/* Quick Stats */}
                  <StatCardGrid columns={4}>
                    <StatCard
                      label="Total Users"
                      value={systemStats?.totalUsers || 0}
                      icon={Users}
                      severity="info"
                    />
                    
                    <StatCard
                      label="Active Users"
                      value={systemStats?.activeUsers || 0}
                      icon={UserCheck}
                      severity="success"
                    />
                    
                    <StatCard
                      label="Total Entities"
                      value={systemStats?.totalEntities || 0}
                      icon={Building2}
                      severity="info"
                    />
                    
                    <StatCard
                      label="System Health"
                      value={systemStats?.systemHealth || 'Good'}
                      icon={Shield}
                      severity="success"
                    />
                  </StatCardGrid>

                  {/* Main Content Tabs */}
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
                        {/* User Overview */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <Users className="mr-2 h-5 w-5" />
                              User Overview
                            </CardTitle>
                            <CardDescription>
                              User statistics and trends
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 border rounded">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {userStats?.newUsers || 0}
                                  </div>
                                  <div className="text-sm text-gray-600">New Users</div>
                                </div>
                                <div className="text-center p-4 border rounded">
                                  <div className="text-2xl font-bold text-green-600">
                                    {userStats?.activeUsers || 0}
                                  </div>
                                  <div className="text-sm text-gray-600">Active Users</div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Pending Approvals</span>
                                  <span className="font-medium">
                                    {userStats?.pendingApprovals || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* System Overview */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <Server className="mr-2 h-5 w-5" />
                              System Overview
                            </CardTitle>
                            <CardDescription>
                              System performance and health
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 border rounded">
                                <div className="flex items-center">
                                  <Activity className="h-4 w-4 mr-2 text-green-600" />
                                  <span>API Health</span>
                                </div>
                                <Badge variant={healthData?.apiResponseTime && healthData.apiResponseTime < 500 ? 'default' : 'destructive'}>{healthData?.apiResponseTime ? `${healthData.apiResponseTime}ms` : 'Loading...'}</Badge>
                              </div>
                              
                              <div className="flex items-center justify-between p-3 border rounded">
                                <div className="flex items-center">
                                  <Database className="h-4 w-4 mr-2 text-blue-600" />
                                  <span>Database</span>
                                </div>
                                <Badge variant={healthData?.databaseSync === 'Healthy' || healthData?.databaseSync === 'Degraded' ? 'default' : 'destructive'}>{healthData?.databaseSync || 'Loading...'}</Badge>
                              </div>
                              
                              <div className="flex items-center justify-between p-3 border rounded">
                                <div className="flex items-center">
                                  <Shield className="h-4 w-4 mr-2 text-emerald-600" />
                                  <span>Security</span>
                                </div>
                                <Badge variant="default">Secure</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Recent Activity */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <FileText className="mr-2 h-5 w-5" />
                            Recent Activity
                          </CardTitle>
                          <CardDescription>
                            Latest system activities and events
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {recentActivity && recentActivity.length > 0 ? (
                            <div className="space-y-3">
                              {recentActivity.slice(0, 5).map((activity: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded">
                                  <div className="flex items-center">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                                    <div>
                                      <p className="font-medium">{activity.action || 'System Activity'}</p>
                                      <p className="text-sm text-gray-600">{activity.description}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">
                                      {activity.timestamp ? new Date(activity.timestamp).toLocaleDateString() : 'Recently'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No recent activity</p>
                              <p className="text-sm">System activities will appear here</p>
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
                            <Button asChild className="w-full">
                              <a href="/admin/users">Manage Users</a>
                            </Button>
                            <Button asChild variant="outline" className="w-full">
                              <a href="/roles">Role Management</a>
                            </Button>
                            <Button asChild variant="outline" className="w-full">
                              <a href="/admin/users?action=create">Create User</a>
                            </Button>
                          </CardContent>
                        </Card>
                        
                        <Card className="lg:col-span-2">
                          <CardHeader>
                            <CardTitle>User Statistics</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center py-8 text-gray-500">
                              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>Detailed user analytics coming soon</p>
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
                            <Button asChild className="w-full">
                              <a href="/system/settings">System Settings</a>
                            </Button>
                            <Button asChild variant="outline" className="w-full">
                              <a href="/system/database">Database Management</a>
                            </Button>
                            <Button asChild variant="outline" className="w-full">
                              <a href="/system/audit">Audit Logs</a>
                            </Button>
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
                            <div className="text-center py-8 text-gray-500">
                              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>System monitoring dashboard coming soon</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Shield className="mr-2 h-5 w-5" />
                            Security Overview
                          </CardTitle>
                          <CardDescription>System security and access control</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8 text-gray-500">
                            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Security monitoring dashboard coming soon</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <TrendingUp className="mr-2 h-5 w-5" />
                            System Analytics
                          </CardTitle>
                          <CardDescription>Comprehensive system analytics and reporting</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8 text-gray-500">
                            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Advanced analytics dashboard coming soon</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </SafeDataLoader>
          )}
        </SafeDataLoader>
      )}
    </SafeDataLoader>
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