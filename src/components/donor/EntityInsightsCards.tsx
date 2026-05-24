'use client'

import React from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  MapPin, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  Eye,
  Users,
  Activity,
  Clock,
  BarChart3,
  ChevronRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ContentSkeleton } from '@/components/shared/ContentSkeleton'

interface EntityInsightsCardProps {
  entityId: string
  compact?: boolean
}

interface EntitySummary {
  id: string
  name: string
  type: string
  location?: string
  stats?: {
    verifiedAssessments: number
    totalCommitments: number
    activeResponses: number
    pendingCommitments: number
  }
  latestActivity?: {
    lastAssessment?: string
    lastAssessmentType?: string
    assignmentDate: string
  }
  latestAssessments?: LatestAssessment[]
}

interface LatestAssessment {
  type: string
  assessment: {
    date: string
    status: string
    summary: {
      overallScore?: number
      criticalGaps: string[]
    }
  }
}

export function EntityInsightsCard({ entityId, compact = false }: EntityInsightsCardProps) {
  const { token } = useAuth()
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  // Fetch entity summary data
  const { data: entityData, isLoading, error } = useQuery({
    queryKey: ['entity-insights-summary', entityId],
    queryFn: async () => {
      const result = await apiGet<EntitySummary>(`/api/v1/donors/entities/${entityId}/demographics`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch entity summary')
      }
      return result.data as EntitySummary
    },
    enabled: !!entityId && !!token
  })

  // Fetch latest assessments
  const { data: latestAssessmentsData } = useQuery({
    queryKey: ['entity-latest-assessments', entityId],
    queryFn: async () => {
      const result = await apiGet<{ latestAssessments: LatestAssessment[] }>(`/api/v1/donors/entities/${entityId}/assessments/latest`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch latest assessments')
      }
      return result.data as { latestAssessments: LatestAssessment[] }
    },
    enabled: !!entityId && !!token
  })

  // Fetch gap analysis for overview
  const { data: gapAnalysisData } = useQuery({
    queryKey: ['entity-gap-summary', entityId],
    queryFn: async () => {
      const result = await apiGet<{
        overallGapScore: number
        summary: {
          totalGaps: number
          criticalGaps: number
        }
      }>(`/api/v1/donors/entities/${entityId}/gap-analysis`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch gap analysis')
      }
      return result.data as {
        overallGapScore: number
        summary: {
          totalGaps: number
          criticalGaps: number
        }
      }
    },
    enabled: !!entityId && !!token
  })

  const handleViewDetails = () => {
    router.push(`/donor/entities/${entityId}`)
  }

  if (isLoading || !entityData) {
    return (
      <Card className={cn(compact ? 'h-48' : 'h-64')}>
        <CardContent className="p-4">
          <ContentSkeleton variant="card" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={compact ? 'h-48' : 'h-64'}>
        <CardContent className="p-4 flex items-center justify-center h-full">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm text-gray-600">Unable to load data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const entity = entityData
  const latestAssessments = latestAssessmentsData?.latestAssessments || []
  const gapAnalysis = gapAnalysisData

  // Calculate metrics
  const totalAssessments = entity.stats?.verifiedAssessments || 0
  const criticalGaps = gapAnalysis?.summary?.criticalGaps || 0
  const totalGaps = gapAnalysis?.summary?.totalGaps || 0
  const overallScore = gapAnalysis?.overallGapScore ? 100 - gapAnalysis.overallGapScore : 0

  // Determine status color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getGapColor = (gaps: number) => {
    if (gaps === 0) return 'text-green-600'
    if (gaps <= 2) return 'text-yellow-600'
    if (gaps <= 5) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <Card 
      className={cn(
        compact ? 'h-48' : 'h-64', 
        'cursor-pointer transition-all duration-200 hover:shadow-lg bg-blue-500/5 border-blue-500/15',
        isHovered && 'scale-105'
      )}
      onClick={handleViewDetails}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{entity.name}</h3>
              <Badge variant="outline" className="text-xs">{entity.type}</Badge>
            </div>
            {entity.location && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{entity.location}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Eye className={cn('h-4 w-4 text-gray-400 transition-colors', isHovered && 'text-blue-600')} />
            {isHovered && (
              <ChevronRight className="h-4 w-4 text-blue-600 animate-pulse" />
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="flex-1 space-y-2">
          {/* Overall Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3 text-gray-500" />
              <span className="text-sm text-gray-600">Score</span>
            </div>
            <span className={cn('text-sm font-medium', getScoreColor(overallScore))}>
              {overallScore.toFixed(0)}%
            </span>
          </div>

          <Progress 
            value={overallScore} 
            className="h-1.5"
            // Color based on score
            style={{
              backgroundColor: overallScore >= 80 ? '#10b981' :
                             overallScore >= 60 ? '#f59e0b' :
                             overallScore >= 40 ? '#f97316' : '#ef4444'
            }}
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Assessments</span>
              <span className="font-medium">{totalAssessments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Gaps</span>
              <span className={cn('font-medium', getGapColor(criticalGaps))}>
                {criticalGaps} critical
              </span>
            </div>
          </div>

          {/* Latest Activity */}
          {!compact && entity.latestActivity?.lastAssessment && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Clock className="h-3 w-3" />
              <span>
                Last assessment: {new Date(entity.latestActivity.lastAssessment).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 mt-auto">
          <div className="flex items-center gap-2">
            {latestAssessments.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {latestAssessments.length} categories
              </Badge>
            )}
            {criticalGaps > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalGaps} urgent gaps
              </Badge>
            )}
          </div>
          
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 text-xs px-2"
            onClick={(e) => {
              e.stopPropagation()
              handleViewDetails()
            }}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface EntityInsightsCardsProps {
  maxCards?: number
  compact?: boolean
}

export function EntityInsightsCards({ maxCards = 6, compact = false }: EntityInsightsCardsProps) {
  const { token } = useAuth()
  // Fetch all assigned entities
  const { data: entitiesData, isLoading } = useQuery({
    queryKey: ['donor-entities-cards'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/donors/entities?limit=50')
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch entities')
      }
      return result.data
    },
    enabled: !!token
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(maxCards)].map((_, i) => (
          <Card key={i} className="h-48">
            <CardContent className="p-4">
              <ContentSkeleton variant="card" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const entities = entitiesData?.entities?.slice(0, maxCards) || []

  if (entities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Entities</h3>
          <p className="text-gray-600 mb-4">
            You don&apos;t have any entities assigned to you yet. Contact your coordinator for entity assignments.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Entity Insights Overview</h2>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View All Entities
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map((entity: any) => (
          <EntityInsightsCard
            key={entity.id}
            entityId={entity.id}
            compact={compact}
          />
        ))}
      </div>
      
      {entitiesData?.pagination && entitiesData.pagination.hasMore && (
        <div className="text-center pt-4">
          <Button variant="outline">
            Load More Entities
          </Button>
        </div>
      )}
    </div>
  )
}

// Quick metrics component for dashboard overview
interface EntityMetricsProps {
  entitiesData?: any
  isLoading?: boolean
}

export function EntityMetrics({ entitiesData, isLoading }: EntityMetricsProps) {
  const totalEntities = entitiesData?.summary?.totalAssigned || 0
  const entitiesWithAssessments = entitiesData?.summary?.totalWithResponses || 0
  const entitiesWithCommitments = entitiesData?.summary?.totalWithCommitments || 0

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Entity Performance</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Entities"
          value={totalEntities}
          severity="info"
          variant="tinted"
          icon={MapPin}
          loading={isLoading}
        />
        <StatCard
          label="With Assessments"
          value={entitiesWithAssessments}
          severity="success"
          variant="tinted"
          icon={FileText}
          loading={isLoading}
        />
        <StatCard
          label="With Commitments"
          value={entitiesWithCommitments}
          severity="success"
          variant="tinted"
          icon={Activity}
          loading={isLoading}
        />
      </div>
    </div>
  )
}