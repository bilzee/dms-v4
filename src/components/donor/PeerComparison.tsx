'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import '@/lib/utils/chart-registration';
import { Radar, Bar } from 'react-chartjs-2';
import { CHART_COLORS, getChartColor, getChartBgColor } from '@/lib/utils/chart-config';
import {
  Users,
  TrendingUp, 
  TrendingDown, 
  Equal,
  Target,
  Award,
  Activity
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { 
  LeaderboardEntry
} from '@/types/gamification';
import { useLeaderboard } from '@/hooks/useLeaderboard';

interface PeerComparisonProps {
  donorId: string;
  region?: string;
  showRegional?: boolean;
  showTopPerformers?: boolean;
  chartType?: 'radar' | 'bar';
  className?: string;
}

interface ComparisonMetrics {
  metric: string;
  user: number;
  average: number;
  top25: number;
  rank: number;
  trend: 'above' | 'below' | 'average';
}

export function PeerComparison({
  donorId,
  region,
  showRegional = true,
  showTopPerformers = true,
  chartType = 'radar',
  className
}: PeerComparisonProps) {
  const [comparisonType, setComparisonType] = useState<'regional' | 'national' | 'global'>('regional');
  const [metricFocus, setMetricFocus] = useState<'delivery_rate' | 'commitment_value' | 'consistency' | 'overall'>('overall');
  const [currentChartType, setCurrentChartType] = useState<'radar' | 'bar'>(chartType);

  // Fetch leaderboard data for comparison
  const { data: leaderboardData, isLoading } = useLeaderboard({
    limit: 100,
    sortBy: metricFocus,
    ...(showRegional && region ? { region } : {})
  });

  const comparisonData = useMemo(() => {
    if (!leaderboardData?.data?.rankings) return null;

    const userRanking = leaderboardData.data.rankings.find((r: any) => r.donor.id === donorId);
    if (!userRanking) return null;

    const rankings: any[] = leaderboardData.data.rankings;
    const totalDonors = rankings.length;

    // Calculate percentiles
    const userPercentile = ((totalDonors - userRanking.rank) / totalDonors) * 100;

    // Calculate averages and quartiles
    const deliveryRates = rankings.map(r => r.metrics.deliveryRates.verified);
    const commitmentValues = rankings.map(r => r.metrics.commitments.totalValue);
    const consistencyScores = rankings.map(r => r.metrics.performance.activityFrequency);
    const overallScores = rankings.map(r => r.metrics.performance.overallScore);

    const top25DeliveryRate = calculatePercentile(deliveryRates, 75);
    const averageDeliveryRate = deliveryRates.reduce((a, b) => a + b, 0) / deliveryRates.length;

    const top25CommitmentValue = calculatePercentile(commitmentValues, 75);
    const averageCommitmentValue = commitmentValues.reduce((a, b) => a + b, 0) / commitmentValues.length;

    const top25Consistency = calculatePercentile(consistencyScores, 75);
    const averageConsistency = consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;

    const top25Overall = calculatePercentile(overallScores, 75);
    const averageOverall = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;

    // Prepare comparison metrics
    const metrics: ComparisonMetrics[] = [
      {
        metric: 'Delivery Rate',
        user: userRanking.metrics.deliveryRates.verified,
        average: averageDeliveryRate,
        top25: top25DeliveryRate,
        rank: getMetricRank(userRanking.metrics.deliveryRates.verified, deliveryRates),
        trend: getTrend(userRanking.metrics.deliveryRates.verified, averageDeliveryRate)
      },
      {
        metric: 'Commitment Value',
        user: userRanking.metrics.commitments.totalValue,
        average: averageCommitmentValue,
        top25: top25CommitmentValue,
        rank: getMetricRank(userRanking.metrics.commitments.totalValue, commitmentValues),
        trend: getTrend(userRanking.metrics.commitments.totalValue, averageCommitmentValue)
      },
      {
        metric: 'Consistency',
        user: userRanking.metrics.performance.activityFrequency,
        average: averageConsistency,
        top25: top25Consistency,
        rank: getMetricRank(userRanking.metrics.performance.activityFrequency, consistencyScores),
        trend: getTrend(userRanking.metrics.performance.activityFrequency, averageConsistency)
      },
      {
        metric: 'Overall Score',
        user: userRanking.metrics.performance.overallScore,
        average: averageOverall,
        top25: top25Overall,
        rank: getMetricRank(userRanking.metrics.performance.overallScore, overallScores),
        trend: getTrend(userRanking.metrics.performance.overallScore, averageOverall)
      }
    ];

    // Find peer group (donors within ±10 ranks)
    const peerGroup = rankings.filter(r => 
      Math.abs(r.rank - userRanking.rank) <= 10 && r.donor.id !== donorId
    ).slice(0, 5);

    return {
      userRanking,
      metrics,
      peerGroup,
      totalDonors,
      userPercentile,
      topPerformers: rankings.slice(0, 5)
    };
  }, [leaderboardData, donorId]);

  // Calculate percentile helper
  const calculatePercentile = (values: number[], percentile: number): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Get metric rank helper
  const getMetricRank = (value: number, values: number[]): number => {
    const sorted = [...values].sort((a, b) => b - a);
    return sorted.indexOf(value) + 1;
  }

  // Get trend helper
  const getTrend = (userValue: number, averageValue: number): 'above' | 'below' | 'average' => {
    const difference = userValue - averageValue;
    const threshold = averageValue * 0.1; // 10% threshold
    
    if (difference > threshold) return 'above';
    if (difference < -threshold) return 'below';
    return 'average';
  }

  // Prepare radar chart data
  const radarData = comparisonData?.metrics.map(metric => ({
    metric: metric.metric,
    'You': (metric.user / Math.max(metric.top25, metric.user)) * 100,
    'Top 25%': (metric.top25 / Math.max(metric.top25, metric.user)) * 100,
    'Average': (metric.average / Math.max(metric.top25, metric.user)) * 100
  }));

  // Prepare bar chart data
  const barData = comparisonData?.metrics.map(metric => ({
    metric: metric.metric,
    'Your Score': metric.user,
    'Top 25%': metric.top25,
    'Average': metric.average
  }));

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48 sm:h-64 w-full" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!comparisonData) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4" />
            <p>No comparison data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { userRanking, metrics, peerGroup, userPercentile, topPerformers } = comparisonData;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-500" />
              <div>
                <CardTitle>Peer Comparison</CardTitle>
                <p className="text-sm text-gray-600">
                  Your performance compared to {comparisonData.totalDonors} donors
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={comparisonType} onValueChange={(value: any) => setComparisonType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="national">National</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={currentChartType} onValueChange={(value: any) => setCurrentChartType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="radar">Radar</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <StatCardGrid columns={4}>
        <StatCard
          label="Current Rank"
          value={`#${userRanking.rank}`}
          severity="info"
          icon={Target}
        />

        <StatCard
          label="Above Average"
          value={metrics.filter(m => m.trend === 'above').length}
          severity="success"
          icon={TrendingUp}
        />

        <StatCard
          label="Average"
          value={metrics.filter(m => m.trend === 'average').length}
          severity="neutral"
          icon={Equal}
        />

        <StatCard
          label="Below Average"
          value={metrics.filter(m => m.trend === 'below').length}
          severity="warning"
          icon={TrendingDown}
        />
      </StatCardGrid>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div role="img" aria-label={`Performance comparison chart: ${radarData ? radarData.map(d => `${d.metric}: You ${d['You'].toFixed(0)}%, Top 25% ${d['Top 25%'].toFixed(0)}%, Average ${d['Average'].toFixed(0)}%`).join(', ') : 'No data'}`} className="h-64 sm:h-80">
            {currentChartType === 'radar' && radarData && (
              <Radar
                data={{
                  labels: radarData.map(d => d.metric),
                  datasets: [
                    {
                      label: 'You',
                      data: radarData.map(d => d['You']),
                      backgroundColor: getChartBgColor(CHART_COLORS.blue),
                      borderColor: getChartColor(CHART_COLORS.blue),
                      pointBackgroundColor: getChartColor(CHART_COLORS.blue),
                    },
                    {
                      label: 'Top 25%',
                      data: radarData.map(d => d['Top 25%']),
                      backgroundColor: getChartBgColor(CHART_COLORS.green),
                      borderColor: getChartColor(CHART_COLORS.green),
                      pointBackgroundColor: getChartColor(CHART_COLORS.green),
                    },
                    {
                      label: 'Average',
                      data: radarData.map(d => d['Average']),
                      backgroundColor: getChartBgColor(CHART_COLORS.gray),
                      borderColor: getChartColor(CHART_COLORS.gray),
                      pointBackgroundColor: getChartColor(CHART_COLORS.gray),
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: { beginAtZero: true, max: 100 }
                  }
                }}
              />
            )}
            
            {currentChartType === 'bar' && barData && (
              <Bar
                data={{
                  labels: barData.map(d => d.metric),
                  datasets: [
                    {
                      label: 'Your Score',
                      data: barData.map(d => d['Your Score']),
                      backgroundColor: getChartColor(CHART_COLORS.blue),
                    },
                    {
                      label: 'Top 25%',
                      data: barData.map(d => d['Top 25%']),
                      backgroundColor: getChartColor(CHART_COLORS.green),
                    },
                    {
                      label: 'Average',
                      data: barData.map(d => d['Average']),
                      backgroundColor: getChartColor(CHART_COLORS.gray),
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { beginAtZero: true }
                  }
                }}
              />
            )}
          </div>
          <details className="mt-2">
            <summary className="sr-only">View chart data as table</summary>
            <table className="sr-only">
              <caption>Performance comparison data</caption>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Your Score</th>
                  <th>Top 25%</th>
                  <th>Average</th>
                </tr>
              </thead>
              <tbody>
                {(radarData || []).map((d, i) => {
                  const m = metrics[i];
                  return (
                    <tr key={d.metric}>
                      <td>{d.metric}</td>
                      <td>{m?.user.toFixed(1)}</td>
                      <td>{m?.top25.toFixed(1)}</td>
                      <td>{m?.average.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    metric.trend === 'above' ? "bg-green-100 text-green-600" :
                    metric.trend === 'below' ? "bg-red-100 text-red-600" :
                    "bg-gray-100 text-gray-600"
                  )} aria-label={metric.trend === 'above' ? 'Above average' : metric.trend === 'below' ? 'Below average' : 'Average'}>
                    {metric.trend === 'above' && <TrendingUp className="w-5 h-5" />}
                    {metric.trend === 'below' && <TrendingDown className="w-5 h-5" />}
                    {metric.trend === 'average' && <Equal className="w-5 h-5" />}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">{metric.metric}</h4>
                    <p className="text-sm text-gray-600">
                      Rank #{metric.rank} out of {comparisonData.totalDonors}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold">{metric.user.toFixed(1)}</div>
                  <div className="text-sm text-gray-500">
                    Avg: {metric.average.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Peer Group */}
      {showTopPerformers && topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((performer, index) => (
                <div 
                  key={performer.donor.id} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    performer.donor.id === donorId && "bg-blue-50 border border-blue-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 ? "bg-yellow-500 text-white" :
                      index === 1 ? "bg-gray-400 text-white" :
                      index === 2 ? "bg-amber-600 text-white" :
                      "bg-gray-200 text-gray-600"
                    )}>
                      {performer.rank}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {performer.donor.organizationName}
                        {performer.donor.id === donorId && " (You)"}
                      </h4>
                      <p className="text-sm text-gray-600">{performer.donor.region}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {performer.metrics.performance.overallScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500">Score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}