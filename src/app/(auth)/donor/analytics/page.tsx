'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  MapPin, 
  Activity,
  Target,
  Eye,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Building,
  Users,
  AlertTriangle,
  Trophy
} from 'lucide-react'

import { EntityInsightsCards } from '@/components/donor/EntityInsightsCards'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { useDonorMetrics } from '@/hooks/useDonorMetrics'

interface EntityData {
  id: string
  name: string
  type: string
  location?: string
  demographics?: {
    population?: number
    vulnerableCount?: number
    lga?: string
  }
  stats?: {
    verifiedAssessments: number
    responses: number
    commitments: number
  }
}

interface DonorMetrics {
  totalDonors: number
  commitments: number
  totalResponses: number
  averageVerificationRate: number
  totalVerifiedResponses: number
  topPerformers: Array<{
    donorName: string
    successRate: number
    verifiedActivities: number
    totalActivities: number
  }>
}

export default function DonorAnalyticsPage() {
  const { currentRole, user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState('overview')

  // Fetch all entities assigned to donor
  const { data: entitiesData, isLoading: entitiesLoading, error: entitiesError } = useQuery({
    queryKey: ['donor-entities-analytics'],
    queryFn: async () => {
      try {
        const result = await apiGet('/api/v1/donors/entities?limit=100')
        if (!result.success) {
          console.warn('Entities API returned:', result.error)
          return [] // Return empty array instead of throwing error
        }
        return result.data?.entities as EntityData[] || []
      } catch (error) {
        console.warn('Failed to fetch entities:', error)
        return [] // Return empty array on error
      }
    }
  })

  // Fetch donor metrics via shared hook
  const { data: metricsResponse, isLoading: metricsLoading } = useDonorMetrics({ dateRange: '30d' })
  const metrics: DonorMetrics | null = metricsResponse?.overall
    ? {
        totalDonors: metricsResponse.overall.totalDonors,
        commitments: metricsResponse.overall.totalCommitments,
        totalResponses: metricsResponse.overall.totalResponses,
        averageVerificationRate: metricsResponse.overall.averageVerificationRate,
        totalVerifiedResponses: metricsResponse.overall.totalVerifiedResponses,
        topPerformers: metricsResponse.overall.topPerformers,
      }
    : null

  const isLoading = entitiesLoading || metricsLoading

  const entities = entitiesData || []

  return (
    <RoleBasedRoute requiredRole="DONOR">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Donor Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive analytics and insights across all assigned entities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entities.length}</div>
              <p className="text-xs text-muted-foreground">
                Assigned entities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commitments</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.commitments || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active commitments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalResponses || 0}</div>
              <p className="text-xs text-muted-foreground">
                Assessment responses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verification Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((metrics?.averageVerificationRate || 0) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average success rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="entities" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Entities
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performing Entities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Entity Performance Overview
                  </CardTitle>
                  <CardDescription>
                    Quick view of your assigned entities and their performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {entities.length > 0 ? (
                    <div className="space-y-3">
                      {entities.slice(0, 5).map((entity) => (
                        <div key={entity.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <Building className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium">{entity.name}</p>
                              <p className="text-sm text-gray-600">
                                <Badge variant="outline">{entity.type}</Badge>
                                {entity.location && (
                                  <span className="ml-2">
                                    <MapPin className="inline h-3 w-3" /> {entity.location}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {entity.stats?.verifiedAssessments || 0}
                            </p>
                            <p className="text-xs text-gray-600">Verified</p>
                          </div>
                        </div>
                      ))}
                      {entities.length > 5 && (
                        <p className="text-center text-sm text-gray-600 pt-2">
                          And {entities.length - 5} more entities
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No entities assigned yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Population Coverage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Population Coverage
                  </CardTitle>
                  <CardDescription>
                    Total population served across all assigned entities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {entities.reduce((total, entity) => 
                          total + (entity.demographics?.population || 0), 0
                        ).toLocaleString()}
                      </div>
                      <p className="text-sm text-gray-600">Total Population</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-xl font-semibold text-orange-600">
                          {entities.reduce((total, entity) => 
                            total + (entity.demographics?.vulnerableCount || 0), 0
                          ).toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-600">Vulnerable</p>
                      </div>
                      <div>
                        <div className="text-xl font-semibold text-green-600">
                          {entities.reduce((total, entity) => 
                            total + (entity.stats?.responses || 0), 0
                          )}
                        </div>
                        <p className="text-xs text-gray-600">Active</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => router.push('/donor/entities')}
                  >
                    <Building className="h-6 w-6 mb-2" />
                    View All Entities
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => router.push('/donor/reports')}
                  >
                    <Download className="h-6 w-6 mb-2" />
                    Generate Reports
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => router.push('/donor/performance')}
                  >
                    <TrendingUp className="h-6 w-6 mb-2" />
                    Performance Metrics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entities Tab */}
          <TabsContent value="entities">
            <EntityInsightsCards />
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Verification Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Verification Performance</CardTitle>
                  <CardDescription>
                    Assessment verification rates and success metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Verification Rate</span>
                      <Badge variant="outline">
                        {((metrics?.averageVerificationRate || 0) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Verified</span>
                      <Badge variant="default">
                        {metrics?.totalVerifiedResponses || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Responses</span>
                      <Badge variant="outline">
                        {metrics?.totalResponses || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Commitment Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Commitment Metrics</CardTitle>
                  <CardDescription>
                    Commitment tracking and delivery metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Commitments</span>
                      <Badge variant="default">
                        {metrics?.commitments || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Entities</span>
                      <Badge variant="outline">
                        {entities.length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Avg per Entity</span>
                      <Badge variant="outline">
                        {entities.length > 0 
                          ? Math.round((metrics?.commitments || 0) / entities.length)
                          : 0
                        }
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Top Performance Rankings
                </CardTitle>
                <CardDescription>
                  Best performing entities based on verification success rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.topPerformers && metrics.topPerformers.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.topPerformers.map((performer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-yellow-600">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{performer.donorName}</p>
                            <p className="text-sm text-gray-600">
                              {performer.verifiedActivities}/{performer.totalActivities} activities
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="default">
                            {(performer.successRate * 100).toFixed(1)}%
                          </Badge>
                          <p className="text-xs text-gray-600">Success rate</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No performance data available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>
                  AI-powered insights and recommendations based on your analytics data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {entities.length === 0 ? (
                    <div className="text-center py-8">
                      <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Entities Assigned</h3>
                      <p className="text-gray-600 mb-4">
                        Start by getting entities assigned to your organization to see insights here.
                      </p>
                      <Button onClick={() => router.push('/donor/entities')}>
                        View Entities
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Coverage Analysis</h4>
                        <p className="text-sm text-gray-600">
                          You&apos;re serving approximately {entities.reduce((total, entity) => 
                            total + (entity.demographics?.population || 0), 0
                          ).toLocaleString()} people across {entities.length} entities.
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Performance Trend</h4>
                        <p className="text-sm text-gray-600">
                          Your average verification rate is {((metrics?.averageVerificationRate || 0) * 100).toFixed(1)}%, which is {((metrics?.averageVerificationRate || 0) * 100) > 80 ? 'above average' : 'below average'}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedRoute>
  )
}