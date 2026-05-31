'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'

// New error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'

import { 
  Building, 
  User, 
  MapPin, 
  Package, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Eye,
  Plus,
  RefreshCw,
  Calendar,
  Activity,
  BarChart3,
  Target,
  Truck,
  Trophy,
  Award,
  TrendingDown,
  Star
} from '@/lib/icons'

import { DonorProfile } from './DonorProfile'
import { EntitySelector } from './EntitySelector'
import { CommitmentDashboard } from './CommitmentDashboard'
import { DonorPerformanceDashboard } from './DonorPerformanceDashboard'
import { LeaderboardDisplay } from './LeaderboardDisplay'
import { GameBadgeSystem, BadgeProgress } from './GameBadgeSystem'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// Role-based access
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { ContentSkeleton } from '@/components/shared/ContentSkeleton'

// API utilities
import { apiGet } from '@/lib/api'

export function DonorDashboard() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('overview')

  // Handle URL parameters for tab navigation and entity pre-selection
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const actionParam = searchParams.get('action')
    if (tabParam && ['overview', 'entities', 'commitments', 'profile', 'analytics'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
    if (actionParam === 'new-commitment') {
      setActiveTab('commitments')
    }
    if (searchParams.get('entityId') || searchParams.get('responseId')) {
      setActiveTab('commitments')
    }
  }, [searchParams])

  // Data fetching functions
  const fetchDonorProfile = async () => {
    if (!user) throw new Error('User not authenticated')
    
    const result = await apiGet('/api/v1/donors/profile')
    if (!result.success) throw new Error(result.error || 'Failed to fetch donor profile')
    return result.data
  }

  const fetchEntities = async () => {
    const result = await apiGet('/api/v1/donors/entities')
    if (!result.success) throw new Error(result.error || 'Failed to fetch entities')
    return result.data
  }

  const fetchGamificationMetrics = async () => {
    const result = await apiGet('/api/v1/donors/metrics?timeframe=30d')
    if (!result.success) throw new Error(result.error || 'Failed to fetch gamification metrics')
    return result.data
  }

  const fetchLeaderboardPosition = async () => {
    // First get the donor profile to find the donor ID
    const profileResult = await apiGet('/api/v1/donors/profile')
    if (!profileResult.success) return null
    
    const donorId = profileResult.data?.donor?.id
    
    if (!donorId) return null
    
    const leaderboardResult = await apiGet('/api/v1/leaderboard?limit=100&sortBy=overall')
    if (!leaderboardResult.success) {
      throw new Error(leaderboardResult.error || 'Failed to fetch leaderboard')
    }
    
    // Find position by donor ID, not user ID
    const rankings = leaderboardResult.data?.rankings || []
    const userPosition = rankings.find((r: any) => r.donor.id === donorId)
    
    if (userPosition) {
      const rank = rankings.indexOf(userPosition) + 1
      return {
        ...userPosition,
        rank,
        trend: userPosition.previousRank ? (
          userPosition.previousRank > rank ? 'up' :
          userPosition.previousRank < rank ? 'down' : 'stable'
        ) : null,
        previousRank: userPosition.previousRank
      }
    }
    
    return null
  }

  return (
    <SafeDataLoader
      queryFn={fetchDonorProfile}
      enabled={!!user}
      fallbackData={{ donor: null, metrics: { commitments: { total: 0, delivered: 0, deliveryRate: 0 }, responses: { total: 0 }, combined: { totalActivities: 0 } }}}
      loadingMessage="Loading donor dashboard..."
      errorTitle="Failed to load dashboard data"
      showError={true}
      showEmptyState={false}
    >
            {(donorData, isLoading, error, retry) => {
        const donor = donorData?.donor

        
        // Fetch other data sources using nested SafeDataLoaders
        return (
          <SafeDataLoader
            queryFn={fetchEntities}
            enabled={!!user}
            fallbackData={{ entities: [], summary: { totalAssigned: 0 } }}
            loadingMessage="Loading assigned entities..."
            errorTitle="Failed to load entities"
            showError={false} // Don't show this error in the main component
          >
            {(entitiesData, entitiesLoading) => {
              const entities = entitiesData?.entities || []

              return (
                <SafeDataLoader
                  queryFn={fetchGamificationMetrics}
                  enabled={!!user}
                  fallbackData={null}
                  loadingMessage="Loading gamification data..."
                  errorTitle="Failed to load gamification data"
                  showError={false}
                >
                  {(gamificationData, gamificationLoading) => {
                    return (
                      <SafeDataLoader
                        queryFn={fetchLeaderboardPosition}
                        enabled={!!user}
                        fallbackData={null}
                        loadingMessage="Loading leaderboard data..."
                        errorTitle="Failed to load leaderboard data"
                        showError={false}
                      >
                        {(leaderboardData) => {
                          return (
                            <div className="space-y-6">
                              {/* Donor Profile Warning */}
                              {!donor && (
                                <Alert className="border-orange-200 bg-orange-50">
                                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                                  <div className="ml-2">
                                    <h3 className="text-sm font-medium text-orange-800">Donor Profile Not Found</h3>
                                    <p className="text-sm text-orange-700 mt-1">
                                      Your donor profile could not be loaded. Some features may be limited until your donor account is set up.
                                      <Button variant="link" onClick={retry} className="p-0 h-auto text-orange-700 underline ml-1">
                                        Try again
                                      </Button>
                                    </p>
                                  </div>
                                </Alert>
                              )}

                              {/* Header */}
                              <div className="flex items-center justify-between" data-testid="dashboard-header">
                                <div className="flex items-center space-x-4">
                                  <Avatar className="h-12 w-12" data-testid="dashboard-avatar">
                                    <AvatarImage src="" />
                                    <AvatarFallback className="text-lg">
                                      {donor?.name?.charAt(0) || 'D'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h1 className="text-2xl font-bold" data-testid="dashboard-title">{donor?.name || 'Donor Dashboard'}</h1>
                                    <p className="text-gray-600" data-testid="dashboard-subtitle">Donor Dashboard</p>
                                  </div>
                                </div>
                                
                                <Button 
                                  data-testid="dashboard-refresh-button"
                                  variant="outline" 
                                  onClick={retry}
                                  disabled={isLoading}
                                >
                                  <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                                  Refresh
                                </Button>
                              </div>

                              {/* Quick Stats */}
                              <StatCardGrid columns={4} data-testid="dashboard-metrics-grid">
                                <StatCard
                                  label="Assigned Entities"
                                  value={entitiesData?.summary?.totalAssigned || 0}
                                  icon={MapPin}
                                  severity="info"
                                  data-testid="assigned-entities-metric"
                                />
                                
                                <StatCard
                                  label="Total Commitments"
                                  value={donor?.metrics?.commitments?.total || 0}
                                  icon={Package}
                                  severity="success"
                                  data-testid="total-commitments-metric"
                                />
                                
                                <StatCard
                                  label="Delivery Rate"
                                  value={`${donor?.metrics?.commitments?.deliveryRate || 0}%`}
                                  icon={TrendingUp}
                                  severity="success"
                                  data-testid="delivery-rate-metric"
                                />
                                
                                <StatCard
                                  label="Total Responses"
                                  value={donor?.metrics?.responses?.total || 0}
                                  icon={Truck}
                                  severity="info"
                                  data-testid="total-responses-metric"
                                />
                              </StatCardGrid>

                              {/* Main Content Tabs */}
                              <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="dashboard-tabs">
                                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                                  <TabsTrigger value="overview" data-testid="dashboard-overview-tab">Overview</TabsTrigger>
                                  <TabsTrigger value="entities" data-testid="dashboard-entities-tab">Entities</TabsTrigger>
                                  <TabsTrigger value="commitments" data-testid="dashboard-commitments-tab">Commitments</TabsTrigger>
                                  <TabsTrigger value="gamification" data-testid="dashboard-gamification-tab">
                                    <Trophy className="w-4 h-4 mr-1" />
                                    Gamification
                                  </TabsTrigger>
                                  <TabsTrigger value="profile" data-testid="dashboard-profile-tab">Profile</TabsTrigger>
                                  <TabsTrigger value="analytics" data-testid="dashboard-analytics-tab">Analytics</TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="space-y-6">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Recent Entities */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="flex items-center">
                                          <MapPin className="mr-2 h-5 w-5" />
                                          Assigned Entities
                                        </CardTitle>
                                        <CardDescription>
                                          Entities where you can provide support
                                        </CardDescription>
                                      </CardHeader>
                                      <CardContent>
                                        {entitiesLoading ? (
                                          <ContentSkeleton variant="list" count={3} />
                                        ) : entities.length === 0 ? (
                                          <EmptyState
                                            type="data"
                                            title="No Entities Assigned"
                                            description="No entities have been assigned to you yet. Contact coordinators to get assigned."
                                            icon={MapPin}
                                          />
                                        ) : (
                                          <div className="space-y-3">
                                            {entities.slice(0, 5).map((entity: any) => (
                                              <div key={entity.id} className="flex items-center justify-between p-3 border rounded">
                                                <div>
                                                  <p className="font-medium">{entity.name}</p>
                                                  <p className="text-sm text-gray-600">{entity.type}</p>
                                                </div>
                                                <div className="text-right">
                                                  <Badge variant="outline">
                                                    {entity.stats?.responses || 0} responses
                                                  </Badge>
                                                </div>
                                              </div>
                                            ))}
                                            {entities.length > 5 && (
                                              <div className="text-center pt-2">
                                                <Button variant="outline" size="sm">
                                                  View All ({entities.length})
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>

                                    {/* Performance Summary */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="flex items-center">
                                          <BarChart3 className="mr-2 h-5 w-5" />
                                          Performance Summary
                                        </CardTitle>
                                        <CardDescription>
                                          Your contribution impact metrics
                                        </CardDescription>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center p-4 border rounded">
                                              <div className="text-2xl font-bold text-blue-600">
                                                {donor?.metrics?.commitments?.total || 0}
                                              </div>
                                              <div className="text-sm text-gray-600">Commitments</div>
                                            </div>
                                            <div className="text-center p-4 border rounded">
                                              <div className="text-2xl font-bold text-green-600">
                                                {donor?.metrics?.commitments?.delivered || 0}
                                              </div>
                                              <div className="text-sm text-gray-600">Delivered</div>
                                            </div>
                                          </div>

                                          <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                              <span>Delivery Rate</span>
                                              <span className="font-medium">
                                                {donor?.metrics?.commitments?.deliveryRate || 0}%
                                              </span>
                                            </div>
                                            <Progress 
                                              value={donor?.metrics?.commitments?.deliveryRate || 0} 
                                              className="h-2"
                                            />
                                          </div>

                                          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                            <div className="text-center">
                                              <div className="text-lg font-semibold text-purple-600">
                                                {donor?.metrics?.responses?.total || 0}
                                              </div>
                                              <div className="text-xs text-gray-600">Total Responses</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-lg font-semibold text-orange-600">
                                                {donor?.metrics?.combined?.totalActivities || 0}
                                              </div>
                                              <div className="text-xs text-gray-600">Total Activities</div>
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {/* Recent Activity */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center">
                                        <Activity className="mr-2 h-5 w-5" />
                                        Recent Activity
                                      </CardTitle>
                                      <CardDescription>
                                        Your latest contributions and responses
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="text-center py-8 text-gray-500">
                                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No recent activity</p>
                                        <p className="text-sm">Your activities will appear here once you start making commitments and deliveries</p>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </TabsContent>

                                <TabsContent value="entities" className="space-y-6">
                                  <EntitySelector />
                                </TabsContent>

                                <TabsContent value="commitments" className="space-y-6">
                                  {donor ? (
                                    <CommitmentDashboard 
                                      donorId={donor.id}
                                      preSelectedEntityId={searchParams.get('entityId') || undefined}
                                      preSelectedIncidentId={searchParams.get('incidentId') || undefined}
                                      preSelectedResponseId={searchParams.get('responseId') || undefined}
                                    />
                                  ) : (
                                    <EmptyState
                                      type="data"
                                      title="Loading donor information..."
                                      description="Please wait while we load your donor profile."
                                    />
                                  )}
                                </TabsContent>

                                <TabsContent value="gamification" className="space-y-6">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Achievements & Badges */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="flex items-center">
                                          <Award className="mr-2 h-5 w-5" />
                                          Achievements & Badges
                                        </CardTitle>
                                        <CardDescription>
                                          Your earned achievements and current progress
                                        </CardDescription>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        {gamificationLoading ? (
                                          <ContentSkeleton variant="card" />
                                        ) : gamificationData?.donors?.[0]?.badges ? (
                                          <div className="space-y-4">
                                            <GameBadgeSystem 
                                              badges={gamificationData.donors[0].badges}
                                              showProgress={true}
                                              size="md"
                                            />
                                            <BadgeProgress 
                                              currentBadges={gamificationData.donors[0].badges}
                                              totalPossibleBadges={14}
                                            />
                                          </div>
                                        ) : (
                                          <EmptyState
                                            type="data"
                                            title="No Achievements Yet"
                                            description="Start making commitments to earn badges!"
                                            icon={Award}
                                          />
                                        )}
                                      </CardContent>
                                    </Card>

                                    {/* Performance Overview */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="flex items-center">
                                          <TrendingUp className="mr-2 h-5 w-5" />
                                          Performance Overview
                                        </CardTitle>
                                        <CardDescription>
                                          Your gamification metrics and ranking
                                        </CardDescription>
                                      </CardHeader>
                                      <CardContent>
                                        {gamificationLoading ? (
                                          <ContentSkeleton variant="card" />
                                        ) : gamificationData?.donors?.[0] ? (
                                          <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                              <div className="text-center p-3 bg-blue-50 rounded">
                                                <div className="text-lg font-bold text-blue-700">
                                                  {gamificationData.donors[0].metrics?.deliveryRate?.toFixed(1) || '0'}%
                                                </div>
                                                <div className="text-xs text-gray-600">Delivery Rate</div>
                                              </div>
                                              <div className="text-center p-3 bg-green-50 rounded">
                                                <div className="text-lg font-bold text-green-700">
                                                  {gamificationData.donors[0].metrics?.commitments?.total || 0}
                                                </div>
                                                <div className="text-xs text-gray-600">Total Activities</div>
                                              </div>
                                            </div>
                                            
                                            <div className="pt-4 border-t">
                                              <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">Current Ranking</span>
                                                <Badge variant="secondary">
                                                  #{leaderboardData?.rank || 'N/A'}
                                                </Badge>
                                              </div>
                                              {leaderboardData && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                  {leaderboardData.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                                                  {leaderboardData.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                                                  <span>
                                                    {leaderboardData.previousRank 
                                                      ? `#${leaderboardData.previousRank} → #${leaderboardData.rank}`
                                                      : 'New to leaderboard'
                                                    }
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <EmptyState
                                            type="data"
                                            title="No Performance Data Available"
                                            description="Performance tracking will be available once you start contributing."
                                            icon={TrendingUp}
                                          />
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {/* Leaderboard Preview */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          <Trophy className="mr-2 h-5 w-5" />
                                          Leaderboard
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="/donor/leaderboard">View Full Leaderboard</a>
                                        </Button>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <LeaderboardDisplay 
                                        limit={5}
                                        showFilters={false}
                                        timeframe="30d"
                                        sortBy="overall"
                                      />
                                    </CardContent>
                                  </Card>
                                </TabsContent>

                                <TabsContent value="profile" className="space-y-6">
                                  <DonorProfile />
                                </TabsContent>

                                <TabsContent value="analytics" className="space-y-6">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="flex items-center">
                                          <Target className="mr-2 h-5 w-5" />
                                          Commitment Analytics
                                        </CardTitle>
                                        <CardDescription>
                                          Track your commitment trends and patterns
                                        </CardDescription>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="text-center py-8 text-gray-500">
                                          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                          <p>Analytics coming soon</p>
                                          <p className="text-sm">Detailed commitment analytics will be available here</p>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="flex items-center">
                                          <TrendingUp className="mr-2 h-5 w-5" />
                                          Performance Trends
                                        </CardTitle>
                                        <CardDescription>
                                          Historical performance data and insights
                                        </CardDescription>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="text-center py-8 text-gray-500">
                                          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                          <p>Performance tracking coming soon</p>
                                          <p className="text-sm">Historical performance data will be displayed here</p>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {/* Full Performance Dashboard */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          <Star className="mr-2 h-5 w-5" />
                                          Comprehensive Performance Dashboard
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="/donor/performance">Full Dashboard</a>
                                        </Button>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      {donor ? (
                                        <DonorPerformanceDashboard 
                                          donorId={donor.id}
                                          donorName={(donor.name || donor.organization) || undefined}
                                          showRanking={true}
                                          showBadges={true}
                                          showTrends={true}
                                          compact={true}
                                        />
                                      ) : (
                                        <div className="text-center py-8 text-gray-500">
                                          <p>Please log in to view your performance dashboard</p>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                </TabsContent>
                              </Tabs>
                            </div>
                          )
                        }}
                      </SafeDataLoader>
                    )
                  }}
                </SafeDataLoader>
              )
            }}
          </SafeDataLoader>
        )
      }}
    </SafeDataLoader>
  )
}


function DonorDashboardPage() {
  return (
    <RoleBasedRoute requiredRole="DONOR" fallbackPath="/dashboard">
      <DonorDashboard />
    </RoleBasedRoute>
  )
}

export default DonorDashboardPage
