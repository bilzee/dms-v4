'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Chart as ChartJS,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Equal,
  Target,
  Award,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  LeaderboardEntry, 
  LeaderboardResponse 
} from '@/types/gamification';

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
  const { data: leaderboardData, isLoading } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard-comparison', donorId, comparisonType, metricFocus],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '100',
        sortBy: metricFocus,
        ...(showRegional && region && { region })
      });

      const response = await fetch(`/api/v1/leaderboard?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 2
  });

  const comparisonData = useMemo(() => {
    if (!leaderboardData?.data?.rankings) return null;

    const userRanking = leaderboardData.data.rankings.find(r => r.donor.id === donorId);
    if (!userRanking) return null;

    const rankings = leaderboardData.data.rankings;
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
          <Skeleton className="h-64 w-full" />
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

      {/* Overall Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">#{userRanking.rank}</div>
            <p className="text-sm text-gray-600">Current Rank</p>
            <Badge variant="secondary" className="mt-1">
              {userPercentile.toFixed(1)}% percentile
            </Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {metrics.filter(m => m.trend === 'above').length}
            </div>
            <p className="text-sm text-gray-600">Above Average</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {metrics.filter(m => m.trend === 'average').length}
            </div>
            <p className="text-sm text-gray-600">Average</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {metrics.filter(m => m.trend === 'below').length}
            </div>
            <p className="text-sm text-gray-600">Below Average</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {currentChartType === 'radar' && radarData && (
              <Radar
                data={{
                  labels: radarData.map(d => d.metric),
                  datasets: [
                    {
                      label: 'You',
                      data: radarData.map(d => d['You']),
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      borderColor: 'rgb(59, 130, 246)',
                      pointBackgroundColor: 'rgb(59, 130, 246)',
                    },
                    {
                      label: 'Top 25%',
                      data: radarData.map(d => d['Top 25%']),
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      borderColor: 'rgb(16, 185, 129)',
                      pointBackgroundColor: 'rgb(16, 185, 129)',
                    },
                    {
                      label: 'Average',
                      data: radarData.map(d => d['Average']),
                      backgroundColor: 'rgba(156, 163, 175, 0.2)',
                      borderColor: 'rgb(156, 163, 175)',
                      pointBackgroundColor: 'rgb(156, 163, 175)',
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
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    },
                    {
                      label: 'Top 25%',
                      data: barData.map(d => d['Top 25%']),
                      backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    },
                    {
                      label: 'Average',
                      data: barData.map(d => d['Average']),
                      backgroundColor: 'rgba(156, 163, 175, 0.8)',
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
                  )}>
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