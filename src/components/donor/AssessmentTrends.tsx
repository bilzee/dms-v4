'use client'

import React from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  Activity,
  AlertTriangle,
  BarChart3,
  LineChart
} from 'lucide-react'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { ContentSkeleton } from '@/components/shared/ContentSkeleton'

interface AssessmentTrendsProps {
  entityId: string
}

interface TrendDataPoint {
  period: string
  score: number
  gapCount: number
  assessmentCount: number
  trend: 'improving' | 'declining' | 'stable'
}

interface CategoryTrend {
  type: string
  dataPoints: TrendDataPoint[]
}

interface TrendInsight {
  category: string
  trend: string
  recommendation: string
}

interface AssessmentTrendsResponse {
  entityId: string
  timeframe: {
    start: string
    end: string
    granularity: 'monthly' | 'quarterly' | 'yearly'
  }
  trends: CategoryTrend[]
  insights: TrendInsight[]
}

const TIMEFRAME_OPTIONS = [
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
  { value: '2y', label: 'Last 2 Years' }
]

const GRANULARITY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
]

const CATEGORY_COLORS = {
  'HEALTH': 'bg-blue-500',
  'WASH': 'bg-cyan-500',
  'SHELTER': 'bg-green-500',
  'FOOD': 'bg-yellow-500',
  'SECURITY': 'bg-red-500',
  'POPULATION': 'bg-purple-500'
}

const TREND_ICONS = {
  improving: { icon: TrendingUp, color: 'text-green-600', label: 'Improving' },
  declining: { icon: TrendingDown, color: 'text-red-600', label: 'Declining' },
  stable: { icon: Minus, color: 'text-gray-600', label: 'Stable' }
}

export function AssessmentTrends({ entityId }: AssessmentTrendsProps) {
  const [filters, setFilters] = useState({
    timeframe: '1y',
    granularity: 'monthly',
    categories: ''
  })

  // Fetch trends data
  const { data: trendsData, isLoading, error, refetch } = useQuery({
    queryKey: ['assessment-trends', entityId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeframe: filters.timeframe,
        granularity: filters.granularity,
        ...(filters.categories && { categories: filters.categories })
      })
      
      const result = await apiGet<{ success: boolean; data: AssessmentTrendsResponse }>(`/api/v1/donors/entities/${entityId}/assessments/trends?${params}`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch assessment trends')
      }
      return result.data as { success: boolean; data: AssessmentTrendsResponse }
    },
    enabled: !!entityId
  })

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Assessment Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContentSkeleton variant="card" count={3} />
        </CardContent>
      </Card>
    )
  }

  if (error || !trendsData?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Error Loading Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Unable to load assessment trends data. Please try again later.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { timeframe, trends, insights } = trendsData.data

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Assessment Trends
          </CardTitle>
          <CardDescription>
            Track assessment performance and gaps over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={filters.timeframe} onValueChange={(value) => handleFilterChange('timeframe', value)}>
              <SelectTrigger className="w-full md:w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAME_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.granularity} onValueChange={(value) => handleFilterChange('granularity', value)}>
              <SelectTrigger className="w-full md:w-48">
                <BarChart3 className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRANULARITY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-600 flex items-center">
              <Activity className="h-4 w-4 mr-1" />
              {new Date(timeframe.start).toLocaleDateString()} - {new Date(timeframe.end).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>

      <StatCardGrid columns={3}>
        <StatCard
          label="Categories Tracked"
          value={trends.length}
          severity="info"
          icon={BarChart3}
        />

        <StatCard
          label="Data Points"
          value={trends.reduce((sum, trend) => sum + trend.dataPoints.length, 0)}
          severity="info"
          icon={Activity}
        />

        <StatCard
          label="Time Granularity"
          value={<span className="capitalize">{timeframe.granularity}</span>}
          severity="neutral"
          icon={Calendar}
        />
      </StatCardGrid>

      {/* Category Trends */}
      <div className="space-y-6">
        {trends.map((categoryTrend) => (
          <CategoryTrendCard key={categoryTrend.type} trend={categoryTrend} />
        ))}
      </div>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Key Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.map((insight, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{insight.category}</Badge>
                  <span className="text-sm font-medium">{insight.trend}</span>
                </div>
                <p className="text-sm text-gray-600">{insight.recommendation}</p>
              </div>
            ))}
          </div>
          
          {insights.length === 0 && (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Available</h3>
              <p className="text-gray-600">
                Insufficient data to generate insights. Try a longer timeframe or different granularity.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface CategoryTrendCardProps {
  trend: CategoryTrend
}

function CategoryTrendCard({ trend }: CategoryTrendCardProps) {
  const { type, dataPoints } = trend

  // Calculate trend statistics
  const latestScore = dataPoints[dataPoints.length - 1]?.score || 0
  const earliestScore = dataPoints[0]?.score || 0
  const averageScore = dataPoints.reduce((sum, dp) => sum + dp.score, 0) / dataPoints.length
  const averageGaps = dataPoints.reduce((sum, dp) => sum + dp.gapCount, 0) / dataPoints.length

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getTrendIcon = (trendType: string) => {
    const config = TREND_ICONS[trendType as keyof typeof TREND_ICONS]
    const Icon = config?.icon || Minus
    return <Icon className={`h-4 w-4 ${config?.color || 'text-gray-600'}`} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded ${CATEGORY_COLORS[type as keyof typeof CATEGORY_COLORS]}`}></div>
          {type} Trends
        </CardTitle>
        <CardDescription>
          Performance metrics over the selected timeframe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Current Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(latestScore)}`}>
                {latestScore.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Score</p>
              <p className="text-2xl font-bold">
                {averageScore.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg. Gaps</p>
              <p className="text-2xl font-bold text-orange-600">
                {averageGaps.toFixed(1)}
              </p>
            </div>
          </div>

          {/* Trend Direction */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Overall Trend</span>
            <div className="flex items-center gap-2">
              {getTrendIcon(
                latestScore > earliestScore + 5 ? 'improving' :
                latestScore < earliestScore - 5 ? 'declining' : 'stable'
              )}
              <span className="text-sm">
                {latestScore > earliestScore + 5 ? 'Improving' :
                 latestScore < earliestScore - 5 ? 'Declining' : 'Stable'}
              </span>
            </div>
          </div>

          {/* Data Points Visualization */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Performance Timeline</h4>
            <div className="space-y-2">
              {dataPoints.map((dataPoint, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-20">{dataPoint.period}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ProgressBar
                            value={Math.max(dataPoint.score, 5)}
                            variant={dataPoint.score >= 80 ? 'success' : dataPoint.score >= 60 ? 'warning' : 'danger'}
                            size="sm"
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {dataPoint.score.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {dataPoint.gapCount} gaps
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(dataPoint.trend)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assessment Count */}
          <div className="text-sm text-gray-600">
            Total assessments analyzed: {dataPoints.reduce((sum, dp) => sum + dp.assessmentCount, 0)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}