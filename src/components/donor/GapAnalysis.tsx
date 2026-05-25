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
import { StatusBadge, getBadgeClasses } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { ContentSkeleton } from '@/components/shared/ContentSkeleton'
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Filter,
  ArrowRight,
  Users,
  Activity
} from '@/lib/icons'

interface GapAnalysisProps {
  entityId: string
}

interface Gap {
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  affectedPopulation: number
  recommendedActions: string[]
  trend?: 'improving' | 'worsening' | 'stable'
}

interface GapAnalysisResponse {
  entityId: string
  analysisDate: string
  overallGapScore: number
  gaps: Gap[]
  summary: {
    totalGaps: number
    criticalGaps: number
    highPriorityGaps: number
    mostAffectedCategory: string
  }
}


const SEVERITY_ICONS = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: Activity
}

const TREND_ICONS = {
  improving: { icon: TrendingUp, color: 'text-green-600', label: 'Improving' },
  worsening: { icon: TrendingDown, color: 'text-red-600', label: 'Worsening' },
  stable: { icon: Minus, color: 'text-gray-600', label: 'Stable' }
}

export function GapAnalysis({ entityId }: GapAnalysisProps) {
  const [filters, setFilters] = useState({
    severity: 'all-severities',
    category: 'all-categories',
    includeTrends: true
  })

  // Fetch gap analysis data
  const { data: gapData, isLoading, error, refetch } = useQuery({
    queryKey: ['gap-analysis', entityId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        includeTrends: filters.includeTrends.toString(),
        ...(filters.severity && filters.severity !== 'all-severities' && { severity: filters.severity }),
        ...(filters.category && filters.category !== 'all-categories' && { categories: filters.category })
      })
      
      const result = await apiGet<{ success: boolean; data: GapAnalysisResponse }>(`/api/v1/donors/entities/${entityId}/gap-analysis?${params}`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch gap analysis')
      }
      return result.data as { success: boolean; data: GapAnalysisResponse }
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
            <AlertTriangle className="h-5 w-5" />
            Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContentSkeleton variant="card" count={3} />
        </CardContent>
      </Card>
    )
  }

  if (error || !gapData?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Error Loading Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Unable to load gap analysis data. Please try again later.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { overallGapScore, gaps, summary, analysisDate } = gapData.data

  // Filter gaps based on severity filter
  const filteredGaps = filters.severity 
    ? gaps.filter(gap => gap.severity === filters.severity)
    : gaps

  // Get gap score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600'
    if (score >= 60) return 'text-orange-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Critical'
    if (score >= 60) return 'High Priority'
    if (score >= 40) return 'Medium Priority'
    return 'Low Priority'
  }

  return (
    <div className="space-y-6">
      <StatCardGrid columns={4}>
        <StatCard
          label="Overall Gap Score"
          value={`${overallGapScore.toFixed(1)}%`}
          severity="neutral"
          variant="centered"
          icon={Activity}
        />

        <StatCard
          label="Total Gaps"
          value={summary.totalGaps}
          severity="info"
          icon={AlertTriangle}
        />

        <StatCard
          label="Critical Gaps"
          value={summary.criticalGaps}
          severity="critical"
          icon={AlertTriangle}
        />

        <StatCard
          label="Most Affected"
          value={summary.mostAffectedCategory}
          severity="neutral"
          icon={Users}
        />
      </StatCardGrid>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-severities">All Severities</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-categories">All Categories</SelectItem>
                <SelectItem value="HEALTH">Health</SelectItem>
                <SelectItem value="WASH">Water & Sanitation</SelectItem>
                <SelectItem value="SHELTER">Shelter</SelectItem>
                <SelectItem value="FOOD">Food Security</SelectItem>
                <SelectItem value="SECURITY">Security</SelectItem>
                <SelectItem value="POPULATION">Population</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Gap Analysis Details */}
      <Card>
        <CardHeader>
          <CardTitle>Identified Gaps ({filteredGaps.length})</CardTitle>
          <CardDescription>
            Analysis based on latest verified assessments from {new Date(analysisDate).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredGaps.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Critical Gaps Identified</h3>
              <p className="text-gray-600">
                Great! All categories are meeting minimum standards.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGaps.map((gap, index) => {
                const SeverityIcon = SEVERITY_ICONS[gap.severity]
                const trendConfig = gap.trend ? TREND_ICONS[gap.trend] : null
                const TrendIcon = trendConfig?.icon

                return (
                  <div 
                    key={index}
                    className={`border rounded-lg p-4 ${getBadgeClasses('severity', gap.severity)}`}
                  >
                    {/* Gap Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <SeverityIcon className="h-5 w-5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{gap.category}</h3>
                            <StatusBadge domain="severity" status={gap.severity} />
                            {trendConfig && TrendIcon && (
                              <div className={`flex items-center gap-1 ${trendConfig.color}`}>
                                <TrendIcon className="h-4 w-4" />
                                <span className="text-xs">{trendConfig.label}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm mt-1">{gap.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Affected Population */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Affected Population
                        </span>
                        <span className="font-medium">
                          {gap.affectedPopulation.toLocaleString()}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min((gap.affectedPopulation / 1000) * 100, 100)} 
                        className="h-2"
                      />
                    </div>

                    {/* Recommended Actions */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Recommended Actions:</h4>
                      <div className="space-y-1">
                        {gap.recommendedActions.map((action, actionIndex) => (
                          <div key={actionIndex} className="flex items-start gap-2">
                            <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                            <span className="text-sm">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Gap Analysis by Category</CardTitle>
          <CardDescription>
            Overview of gaps across all assessment categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'].map(category => {
              const categoryGaps = gaps.filter(gap => gap.category === category)
              const criticalCount = categoryGaps.filter(gap => gap.severity === 'critical').length
              const highCount = categoryGaps.filter(gap => gap.severity === 'high').length
              
              return (
                <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" aria-hidden="true"></div>
                    <span className="font-medium">{category}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {categoryGaps.length > 0 ? (
                      <>
                        <div className="flex items-center gap-2">
                          {criticalCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {criticalCount} Critical
                            </Badge>
                          )}
                          {highCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {highCount} High
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">
                          {categoryGaps.length} total gaps
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-green-600 font-medium">No gaps identified</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}