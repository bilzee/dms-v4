'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  Calendar,
  Download,
  RefreshCw
} from '@/lib/icons';
import { useVerificationMetrics } from '@/hooks/useRealTimeVerification';
import { useAuth } from '@/hooks/useAuth';
import { useVerificationStore } from '@/stores/verification.store';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { cn } from '@/lib/utils';
import { priorityDotColors, statusBadgeColors } from '@/lib/utils/priority-colors';
import { apiGet } from '@/lib/api';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface VerificationAnalyticsProps {
  className?: string;
}

export function VerificationAnalytics({ className }: VerificationAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<{
    totalProcessed: number;
    throughput: number;
    verificationRate: number;
    systemLoad: string;
    timeSeries: Array<{ time: string; assessments: number; deliveries: number; verified: number }>;
  } | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!token) return;
      try {
        const result = await apiGet(`/api/v1/verification/analytics?timeRange=${timeRange}`)
        if (result.success) {
          setAnalyticsData(result.data as any)
        }
      } catch (error) {
        console.error('Error fetching verification analytics:', error)
      }
    };
    fetchAnalytics();
  }, [token, timeRange]);

  const { combined: metrics, assessmentQueueDepth, deliveryQueueDepth } = useVerificationMetrics();
  const { 
    assessments, 
    deliveries,
    refreshAssessments,
    refreshDeliveries 
  } = useVerificationStore();

  // Time range options
  const timeRanges = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Calculate trends
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { trend: 'neutral', value: 0 };
    const change = ((current - previous) / previous) * 100;
    return {
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      value: Math.abs(change)
    };
  };

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    return {
      totalProcessed: analyticsData?.totalProcessed ?? 0,
      averageProcessingTime: metrics.averageWaitTime,
      throughput: analyticsData?.throughput ?? 0,
      backlogTrend: calculateTrend(assessmentQueueDepth.total, assessmentQueueDepth.total),
      systemLoad: analyticsData?.systemLoad || 'Unknown'
    };
  }, [metrics, assessmentQueueDepth, analyticsData]);

  // Queue distribution data
  const queueDistribution = useMemo(() => {
    return {
      assessments: {
        total: assessmentQueueDepth.total,
        critical: assessmentQueueDepth.critical,
        high: assessmentQueueDepth.high,
        medium: assessmentQueueDepth.medium,
        low: assessmentQueueDepth.low
      },
      deliveries: {
        total: deliveryQueueDepth.total,
        critical: deliveryQueueDepth.critical,
        high: deliveryQueueDepth.high,
        medium: deliveryQueueDepth.medium,
        low: deliveryQueueDepth.low
      }
    };
  }, [assessmentQueueDepth, deliveryQueueDepth]);

  // Time series data (mock data for visualization)
  const timeSeriesData = useMemo(() => {
    if (analyticsData?.timeSeries && analyticsData.timeSeries.length > 0) {
      return analyticsData.timeSeries;
    }
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 * 24 : 30 * 24;
    return Array.from({ length: Math.min(hours, 24) }, (_, i) => ({
      time: i === 0 ? 'Now' : `-${i}h`,
      assessments: 0,
      deliveries: 0,
      verified: 0
    })).reverse();
  }, [timeRange, analyticsData]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        refreshAssessments(),
        refreshDeliveries()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      timeRange,
      metrics: performanceMetrics,
      queueDistribution,
      verificationRate: metrics.verificationRate
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-analytics-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Verification Analytics</h2>
          <p className="text-muted-foreground hidden sm:block">
            Performance metrics and trends for verification queues
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 sm:mr-2', isLoading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      <StatCardGrid columns={4}>
        <StatCard
          label="Items Processed"
          value={performanceMetrics.totalProcessed.toLocaleString()}
          icon={CheckCircle}
          severity="success"
          trend={{ value: performanceMetrics.backlogTrend.value, label: `${performanceMetrics.backlogTrend.value.toFixed(1)}% from previous period` }}
        />

        <StatCard
          label="Avg Processing Time"
          value={performanceMetrics.averageProcessingTime < 60 ? `${performanceMetrics.averageProcessingTime}m` : `${Math.floor(performanceMetrics.averageProcessingTime / 60)}h ${performanceMetrics.averageProcessingTime % 60}m`}
          icon={Clock}
          severity="info"
          trend={null}
        />

        <StatCard
          label="Throughput"
          value={`${performanceMetrics.throughput.toLocaleString()} items/hr`}
          icon={BarChart3}
          severity="info"
          trend={null}
        />

        <StatCard
          label="Verification Rate"
          value={`${(metrics.verificationRate * 100).toFixed(1)}%`}
          icon={TrendingUp}
          severity="success"
          trend={null}
        />
      </StatCardGrid>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queues">Queue Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Queue Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Queue Status
                </CardTitle>
                <CardDescription>
                  Current queue depth and priority distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <QueueStatusCard
                    title="Assessments"
                    data={queueDistribution.assessments}
                    color="blue"
                  />
                  <QueueStatusCard
                    title="Deliveries"
                    data={queueDistribution.deliveries}
                    color="green"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Processing Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Processing Metrics
                </CardTitle>
                <CardDescription>
                  Time-based processing performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProcessingMetricsChart data={timeSeriesData} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Queue Depth Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of verification queue status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QueueAnalysis 
                assessmentData={queueDistribution.assessments}
                deliveryData={queueDistribution.deliveries}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verification Trends</CardTitle>
              <CardDescription>
                Processing trends over the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendsChart data={timeSeriesData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceAnalysis metrics={performanceMetrics} systemLoad={analyticsData?.systemLoad} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Queue Status Card Component
interface QueueStatusCardProps {
  title: string;
  data: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  color: string;
}

function QueueStatusCard({ title, data, color }: QueueStatusCardProps) {
  const total = data.total || 0;
  const criticalPercent = total > 0 ? (data.critical / total) * 100 : 0;
  const highPercent = total > 0 ? (data.high / total) * 100 : 0;

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">{title}</h3>
        <Badge variant="outline" className={cn(
          color === 'blue' && 'border-blue-500/50 text-blue-700 dark:text-blue-400',
          color === 'green' && 'border-green-500/50 text-green-700 dark:text-green-400'
        )}>
          {total} items
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full" aria-hidden="true"></div>
            Critical
          </span>
          <span className="font-medium">{data.critical} ({criticalPercent.toFixed(1)}%)</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full" aria-hidden="true"></div>
            High
          </span>
          <span className="font-medium">{data.high} ({highPercent.toFixed(1)}%)</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" aria-hidden="true"></div>
            Medium/Low
          </span>
          <span className="font-medium">{data.medium + data.low}</span>
        </div>
      </div>
    </div>
  );
}

// Processing Metrics Chart Component
function ProcessingMetricsChart({ data }: { data: any[] }) {
  return (
    <div role="img" aria-label="Processing metrics chart showing verification throughput" className="space-y-4">
      {data.slice(-8).map((item, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="w-12 text-sm text-muted-foreground">{item.time}</div>
          <div className="flex-1 flex gap-2">
            <div className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded" style={{ 
              width: `${(item.assessments / Math.max(...data.map(d => d.assessments), 1)) * 100}%` 
            }}>
              <div className="h-6 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-300">
                {item.assessments}
              </div>
            </div>
            <div className="flex-1 bg-green-100 dark:bg-green-900/30 rounded" style={{ 
              width: `${(item.deliveries / Math.max(...data.map(d => d.deliveries), 1)) * 100}%` 
            }}>
              <div className="h-6 flex items-center justify-center text-xs font-medium text-green-700 dark:text-green-300">
                {item.deliveries}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
        <div className="w-12"></div>
        <div className="flex-1 flex gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded" aria-hidden="true"></div>
            Assessments
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" aria-hidden="true"></div>
            Deliveries
          </div>
        </div>
      </div>
    </div>
  );
}

// Queue Analysis Component
function QueueAnalysis({ 
  assessmentData, 
  deliveryData 
}: { 
  assessmentData: any;
  deliveryData: any;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-medium mb-4">Assessment Queue Breakdown</h3>
        <div className="space-y-3">
          <PriorityBreakdown data={assessmentData} />
        </div>
      </div>
      
      <div>
        <h3 className="font-medium mb-4">Delivery Queue Breakdown</h3>
        <div className="space-y-3">
          <PriorityBreakdown data={deliveryData} />
        </div>
      </div>
    </div>
  );
}

// Priority Breakdown Component
function PriorityBreakdown({ data }: { data: any }) {
  const total = data.total || 0;
  
  return (
    <div className="space-y-2">
      {[
        { priority: 'Critical', value: data.critical, color: priorityDotColors.critical },
        { priority: 'High', value: data.high, color: priorityDotColors.high },
        { priority: 'Medium', value: data.medium, color: priorityDotColors.medium },
        { priority: 'Low', value: data.low, color: priorityDotColors.low }
      ].map(({ priority, value, color }) => {
        const percentage = total > 0 ? (value / total) * 100 : 0;
        
        return (
          <div key={priority} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{priority}</span>
              <span>{value} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn('h-2 rounded-full', color)}
                style={{ width: `${percentage}%` }}
                aria-hidden="true"
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Trends Chart Component
function TrendsChart({ data }: { data: any[] }) {
  return (
    <div className="space-y-4">
      <StatCardGrid columns={3}>
        <StatCard
          variant="centered"
          label="Total Assessments"
          value={data.reduce((sum, item) => sum + item.assessments, 0).toLocaleString()}
          severity="info"
        />
        <StatCard
          variant="centered"
          label="Total Deliveries"
          value={data.reduce((sum, item) => sum + item.deliveries, 0).toLocaleString()}
          severity="success"
        />
        <StatCard
          variant="centered"
          label="Total Verified"
          value={data.reduce((sum, item) => sum + item.verified, 0).toLocaleString()}
          severity="success"
        />
      </StatCardGrid>
      
      <ProcessingMetricsChart data={data} />
    </div>
  );
}

// Performance Analysis Component
function PerformanceAnalysis({ metrics, systemLoad }: { metrics: any; systemLoad?: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Processing Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Items per Hour</span>
              <span className="font-bold">{metrics.throughput}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Average Time</span>
              <span className="font-bold">{metrics.averageProcessingTime}m</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Processed</span>
              <span className="font-bold">{metrics.totalProcessed}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Queue Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Backlog Trend</span>
              <Badge className={cn(
                metrics.backlogTrend.trend === 'down' 
                  ? statusBadgeColors.success 
                  : metrics.backlogTrend.trend === 'up'
                  ? statusBadgeColors.error
                  : statusBadgeColors.neutral
              )}>
                {metrics.backlogTrend.trend === 'down' ? 'Improving' : 
                 metrics.backlogTrend.trend === 'up' ? 'Worsening' : 'Stable'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>System Load</span>
              <Badge className={cn(
                systemLoad === 'Low' ? statusBadgeColors.success :
                systemLoad === 'High' ? statusBadgeColors.error :
                statusBadgeColors.warning
              )}>{systemLoad || 'Unknown'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}