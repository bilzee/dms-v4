'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';

interface ConfigurationAnalyticsProps {
  className?: string;
  timeRange?: '7d' | '30d' | '90d';
}

interface AnalyticsData {
  overview: {
    totalEntities: number;
    autoApprovalEnabled: number;
    autoApprovalRate: number;
    configurationChanges: number;
    averageProcessingTime: number;
    effectivenessScore: number;
  };
  trends: {
    date: string;
    autoVerified: number;
    manualVerified: number;
    configChanges: number;
  }[];
  entityPerformance: {
    entityId: string;
    entityName: string;
    entityType: string;
    autoVerificationRate: number;
    averageProcessingTime: number;
    totalVerifications: number;
    autoVerified: number;
    manualVerified: number;
    effectivenessScore: number;
  }[];
  configurationImpact: {
    metric: string;
    beforeChange: number;
    afterChange: number;
    improvement: number;
    impact: 'positive' | 'negative' | 'neutral';
  }[];
  recommendations: {
    id: string;
    type: 'optimization' | 'warning' | 'info';
    title: string;
    description: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
    potentialImpact: string;
  }[];
}

async function fetchAnalytics(timeRange: string): Promise<AnalyticsData> {
  const result = await apiGet(`/api/v1/verification/analytics?timeRange=${timeRange}`)
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch analytics data')
  }
  return result.data as AnalyticsData
}

export function ConfigurationAnalytics({ className, timeRange: defaultTimeRange = '30d' }: ConfigurationAnalyticsProps) {
  const { token } = useAuth();
  const [timeRange, setTimeRange] = useState(defaultTimeRange);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'trends' | 'performance' | 'impact' | 'recommendations'>('overview');

  const { 
    data: analyticsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['configuration-analytics', timeRange],
    queryFn: () => {
      if (!token) throw new Error('No authentication token available');
      return fetchAnalytics(timeRange);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!token,
  });

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      default: return 'Last 30 days';
    }
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <Card className={cn(className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to load analytics
            </h3>
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)} data-testid="configuration-analytics">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Configuration Analytics & Reporting
          </h2>
          <p className="text-muted-foreground">
            Auto-approval effectiveness analysis and optimization insights
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'trends', label: 'Trends', icon: TrendingUp },
          { id: 'performance', label: 'Entity Performance', icon: BarChart3 },
          { id: 'impact', label: 'Configuration Impact', icon: Shield },
          { id: 'recommendations', label: 'Recommendations', icon: CheckCircle },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={selectedTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab(tab.id as any)}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <ContentSkeleton variant="card" count={3} className="space-y-6" />
      ) : (
        <div className="space-y-6">
          {/* Overview Tab */}
          {selectedTab === 'overview' && analyticsData && (
            <>
              {/* Key Metrics */}
              <StatCardGrid columns={6}>
                <StatCard
                  label="Total Entities"
                  value={analyticsData.overview.totalEntities}
                  severity="info"
                  icon={Shield}
                />
                <StatCard
                  label="Auto-Approval Enabled"
                  value={analyticsData.overview.autoApprovalEnabled}
                  severity="success"
                  icon={CheckCircle}
                />
                <StatCard
                  label="Auto-Approval Rate"
                  value={formatPercentage(analyticsData.overview.autoApprovalRate)}
                  severity="success"
                  icon={TrendingUp}
                />
                <StatCard
                  label="Config Changes"
                  value={analyticsData.overview.configurationChanges}
                  severity="info"
                  icon={Activity}
                />
                <StatCard
                  label="Avg Processing Time"
                  value={formatTime(analyticsData.overview.averageProcessingTime)}
                  severity="info"
                  icon={Clock}
                />
                <StatCard
                  label="Effectiveness Score"
                  value={`${Math.round(analyticsData.overview.effectivenessScore)}/100`}
                  severity="success"
                  variant="centered"
                  icon={BarChart3}
                />
              </StatCardGrid>

              {/* Quick Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Insights - {getTimeRangeLabel(timeRange)}</CardTitle>
                  <CardDescription>
                    Key performance indicators and trends summary
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Performance Highlights</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Entities with auto-approval</span>
                          <span className="font-medium">
                            {analyticsData.overview.autoApprovalEnabled} of {analyticsData.overview.totalEntities}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Overall auto-approval rate</span>
                          <span className="font-medium text-green-600">
                            {formatPercentage(analyticsData.overview.autoApprovalRate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Configuration changes</span>
                          <span className="font-medium">{analyticsData.overview.configurationChanges}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Optimization Opportunities</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Average processing time</span>
                          <span className="font-medium">
                            {formatTime(analyticsData.overview.averageProcessingTime)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Effectiveness score</span>
                          <span className={cn(
                            'font-medium',
                            analyticsData.overview.effectivenessScore >= 80 ? 'text-green-600' :
                            analyticsData.overview.effectivenessScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                          )}>
                            {Math.round(analyticsData.overview.effectivenessScore)}/100
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {analyticsData.overview.effectivenessScore >= 80 ? 'Excellent performance' :
                           analyticsData.overview.effectivenessScore >= 60 ? 'Good performance, room for improvement' :
                           'Significant optimization potential'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Entity Performance Tab */}
          {selectedTab === 'performance' && analyticsData?.entityPerformance && (
            <Card>
              <CardHeader>
                <CardTitle>Entity Performance Analysis</CardTitle>
                <CardDescription>
                  Auto-approval performance by entity - {getTimeRangeLabel(timeRange)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.entityPerformance.map((entity) => (
                    <div key={entity.entityId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{entity.entityName}</h4>
                          <p className="text-sm text-gray-600">{entity.entityType}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {formatPercentage(entity.autoVerificationRate)} auto-approval rate
                          </Badge>
                          <Badge 
                            className={cn(
                              entity.effectivenessScore >= 80 ? 'bg-green-100 text-green-800' :
                              entity.effectivenessScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            )}
                          >
                            Score: {Math.round(entity.effectivenessScore)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Verifications:</span>
                          <div className="font-medium">{entity.totalVerifications}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Auto-Verified:</span>
                          <div className="font-medium text-green-600">{entity.autoVerified}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Manual Verified:</span>
                          <div className="font-medium text-orange-600">{entity.manualVerified}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Processing Time:</span>
                          <div className="font-medium">{formatTime(entity.averageProcessingTime)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuration Impact Tab */}
          {selectedTab === 'impact' && analyticsData?.configurationImpact && (
            <Card>
              <CardHeader>
                <CardTitle>Configuration Impact Analysis</CardTitle>
                <CardDescription>
                  Impact of recent configuration changes on system performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.configurationImpact.map((impact, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{impact.metric}</h4>
                        <div className="text-sm text-gray-600 flex items-center gap-4">
                          <span>Before: {impact.beforeChange}</span>
                          <span>After: {impact.afterChange}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn('text-lg font-bold', getImpactColor(impact.impact))}>
                          {impact.improvement > 0 ? '+' : ''}{impact.improvement}%
                        </div>
                        <div className={cn('text-sm', getImpactColor(impact.impact))}>
                          {impact.impact === 'positive' && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              Improved
                            </div>
                          )}
                          {impact.impact === 'negative' && (
                            <div className="flex items-center gap-1">
                              <TrendingDown className="h-4 w-4" />
                              Declined
                            </div>
                          )}
                          {impact.impact === 'neutral' && 'No significant change'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations Tab */}
          {selectedTab === 'recommendations' && analyticsData?.recommendations && (
            <div className="space-y-4">
              {analyticsData.recommendations.map((rec) => (
                <Card key={rec.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getPriorityBadgeColor(rec.priority)}>
                            {rec.priority} priority
                          </Badge>
                          <Badge variant="outline">
                            {rec.type}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-2">{rec.title}</h3>
                        <p className="text-gray-600 mb-3">{rec.description}</p>
                        <div className="text-sm text-gray-500">
                          <strong>Potential Impact:</strong> {rec.potentialImpact}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        {rec.action}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}