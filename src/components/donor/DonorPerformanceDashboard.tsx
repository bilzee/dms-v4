'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import '@/lib/utils/chart-registration';
import { Line, Bar, Radar } from 'react-chartjs-2';
import { CHART_COLORS, getChartColor, getChartBgColor, getDefaultChartOptions, getBarChartOptions, getRadarChartOptions } from '@/lib/utils/chart-config';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Target,
  Download,
  Calendar,
  RefreshCw,
  Activity,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameBadgeSystem, BadgeProgress } from './GameBadgeSystem';
import { ExportButton } from './ExportButton';
import type { 
  PerformanceTrends, 
  PerformanceTrendsResponse,
  PerformanceTrendPoint,
  Achievement,
  BadgeType 
} from '@/types/gamification';


interface DonorPerformanceDashboardProps {
  donorId: string;
  donorName?: string;
  showRanking?: boolean;
  showBadges?: boolean;
  showTrends?: boolean;
  compact?: boolean;
  className?: string;
}

export function DonorPerformanceDashboard({
  donorId,
  donorName,
  showRanking = true,
  showBadges = true,
  showTrends = true,
  compact = false,
  className
}: DonorPerformanceDashboardProps) {
  // State for timeframe and granularity
  const [timeframe, setTimeframe] = useState<'3m' | '6m' | '1y' | '2y'>('1y');
  const [granularity, setGranularity] = useState<'week' | 'month' | 'quarter'>('month');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'radar'>('line');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  // Fetch performance trends
  const {
    data: performanceData,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery<PerformanceTrendsResponse>({
    queryKey: ['performance-trends', donorId, { timeframe, granularity }],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeframe,
        granularity
      });
      
      const result = await apiGet(`/api/v1/donors/${donorId}/performance-trends?${params}`);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch performance trends');
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2
  });

  // Fetch current leaderboard ranking
  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard-current', donorId],
    queryFn: async () => {
      const result = await apiGet('/api/v1/leaderboard?limit=100&sortBy=overall');
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch leaderboard');
      }
      const userRanking = result.data?.rankings?.find((r: any) => r.donor.id === donorId);
      return userRanking;
    },
    enabled: showRanking,
    staleTime: 10 * 60 * 1000
  });

  const data = performanceData?.data;

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data?.trends) return null;

    const labels = data.trends.map(trend => {
      switch (granularity) {
        case 'week':
          return `Week ${trend.period.split('-W')[1]}`;
        case 'month':
          const [year, month] = trend.period.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${monthNames[parseInt(month) - 1]} ${year}`;
        case 'quarter':
          return trend.period;
        default:
          return trend.period;
      }
    });

    const deliveryRateData = data.trends.map(trend => trend.deliveryRate);
    const fulfillmentRateData = data.trends.map(trend => trend.fulfillmentRate);
    const responseVerificationData = data.trends.map(trend => trend.responseVerificationRate);
    const commitmentData = data.trends.map(trend => trend.commitments);
    const valueData = data.trends.map(trend => trend.totalValue);

    return {
      labels,
      datasets: [
        {
          label: 'Delivery Rate (%)',
          data: deliveryRateData,
          borderColor: getChartColor(CHART_COLORS.green),
          backgroundColor: getChartBgColor(CHART_COLORS.green),
          tension: 0.4,
        },
        {
          label: 'Commitment Fulfillment (%)',
          data: fulfillmentRateData,
          borderColor: getChartColor(CHART_COLORS.blue),
          backgroundColor: getChartBgColor(CHART_COLORS.blue),
          tension: 0.4,
        },
        ...(chartType === 'line' ? [{
          label: 'Response Verification (%)',
          data: responseVerificationData,
          borderColor: getChartColor(CHART_COLORS.orange),
          backgroundColor: getChartBgColor(CHART_COLORS.orange),
          tension: 0.4,
        }] : [])
      ]
    };
  }, [data, granularity, chartType]);

  // Performance metrics calculation
  const performanceMetrics = useMemo(() => {
    if (!data?.trends || data.trends.length === 0) return null;

    const latestTrend = data.trends[data.trends.length - 1];
    const earliestTrend = data.trends[0];

    const deliveryRateTrend = latestTrend.deliveryRate - earliestTrend.deliveryRate;
    const commitmentTrend = latestTrend.commitments - earliestTrend.commitments;

    return {
      deliveryRate: latestTrend.deliveryRate,
      fulfillmentRate: latestTrend.fulfillmentRate,
      responseVerificationRate: latestTrend.responseVerificationRate,
      totalValue: latestTrend.totalValue,
      totalCommitments: data.summary.totalCommitments,
      totalResponses: data.summary.totalResponses,
      deliveryRateTrend,
      commitmentTrend,
      periodCount: data.trends.length
    };
  }, [data]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !compact,
        text: 'Performance Trends Over Time'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Percentage (%)'
        }
      },
      x: {
        title: {
          display: !compact,
          text: 'Time Period'
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    }
  };

  // Bar chart options (for commitment counts)
  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count / Value'
        }
      }
    }
  };

  // Radar chart options (different scale structure)
  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !compact,
        text: 'Performance Overview'
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Performance (%)'
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load performance data. 
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetch()}
                className="ml-2"
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {donorName || 'Performance Dashboard'}
          </h2>
          <p className="text-gray-600">
            Member since {data?.donor?.memberSince ? new Date(data.donor.memberSince).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
              <SelectItem value="2y">2 Years</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={granularity} onValueChange={(value: any) => setGranularity(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {performanceMetrics && (
        <StatCardGrid columns={4}>
          <StatCard
            label="Delivery Rate"
            value={`${performanceMetrics.deliveryRate.toFixed(1)}%`}
            severity="success"
            icon={Target}
            trend={{
              value: performanceMetrics.deliveryRateTrend,
              label: `${Math.abs(performanceMetrics.deliveryRateTrend).toFixed(1)}%`
            }}
          />

          <StatCard
            label="Total Commitments"
            value={performanceMetrics.totalCommitments}
            severity="info"
            icon={Activity}
            trend={{
              value: performanceMetrics.commitmentTrend,
              label: `${Math.abs(performanceMetrics.commitmentTrend)}`
            }}
          />

          <StatCard
            label="Total Value"
            value={`$${(performanceMetrics.totalValue / 1000).toFixed(1)}k`}
            severity="info"
            icon={Award}
          />

          {showRanking && leaderboardData && (
            <StatCard
              label="Current Rank"
              value={`#${leaderboardData.rank}`}
              severity="info"
              variant="centered"
              icon={Trophy}
            />
          )}
        </StatCardGrid>
      )}

      {/* Badges Section */}
      {showBadges && data?.achievements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Achievements & Badges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <GameBadgeSystem 
              badges={data.achievements
                .filter(a => a.badge)
                .map(a => a.badge!) as BadgeType[]} 
              showProgress={true}
              size="md"
            />
            
            <BadgeProgress 
              currentBadges={data.achievements.filter(a => a.badge).map(a => a.badge!) as BadgeType[]}
              totalPossibleBadges={14} // Based on BadgeType enum
            />
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      {showTrends && chartData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Performance Trends</CardTitle>
              <div className="flex items-center space-x-2">
                <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="radar">Radar Chart</SelectItem>
                  </SelectContent>
                </Select>
                
                <ExportButton 
                  donorIds={[donorId]}
                  format={exportFormat}
                  timeframe={timeframe === '3m' ? '90d' : timeframe === '6m' ? '90d' : timeframe === '2y' ? 'all' : timeframe}
                  includeCharts={true}
                  disabled={isFetching}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {chartType === 'line' && <Line data={chartData} options={chartOptions} />}
              {chartType === 'bar' && <Bar data={chartData} options={barChartOptions} />}
              {chartType === 'radar' && <Radar data={chartData} options={radarChartOptions} />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Achievements */}
      {data?.achievements && data.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.achievements.slice(0, 5).map((achievement, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {achievement.badge?.includes('Gold') && <span className="text-lg">🏆</span>}
                    {achievement.badge?.includes('Silver') && <span className="text-lg">🥈</span>}
                    {achievement.badge?.includes('Bronze') && <span className="text-lg">🥉</span>}
                    {!achievement.badge?.includes('Gold') && !achievement.badge?.includes('Silver') && !achievement.badge?.includes('Bronze') && <span className="text-lg">🎖️</span>}
                    
                    <div>
                      <p className="font-medium">{achievement.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(achievement.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {achievement.badge && (
                    <Badge variant="outline">
                      {achievement.badge}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}