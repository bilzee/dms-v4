'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Download,
  MapPin,
  Users,
  TrendingUp,
  AlertTriangle,
  FileText,
  Activity,
  UsersRound,
  ShieldCheck,
  ClipboardList,
  Clock
} from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'

import { EntityInsightsHeader } from '@/components/donor/EntityInsightsHeader'
import { AssessmentViewer } from '@/components/donor/AssessmentViewer'
import { GapAnalysis } from '@/components/donor/GapAnalysis'
import { AssessmentTrends } from '@/components/donor/AssessmentTrends'
import { AssessmentExport } from '@/components/donor/AssessmentExport'
import { useQuery } from '@tanstack/react-query'

// Types for API responses
interface EntityDemographics {
  id: string
  name: string
  type: string
  location?: string
  coordinates?: { lat: number; lng: number }
  demographics?: {
    population?: number
    vulnerableCount?: number
    lga?: string
    ward?: string
    [key: string]: any
  }
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
}

interface LatestAssessmentsResponse {
  entityId: string
  latestAssessments: Array<{
    type: string
    assessment: {
      id: string
      date: string
      status: string
      data: any
      summary: {
        overallScore?: number
        criticalGaps: string[]
        keyMetrics: Record<string, any>
      }
    }
  }>
  lastUpdated: string
}

export default function EntityInsightsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { currentRole, user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch entity demographics
  const { data: demographics, isLoading: demographicsLoading, error: demographicsError } = useQuery({
    queryKey: ['entity-demographics', id],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/donors/entities/${id}/demographics`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch entity demographics')
      }
      return result.data as EntityDemographics
    },
    enabled: !!id
  })

  // Fetch latest assessments
  const { data: latestAssessments, isLoading: assessmentsLoading, error: assessmentsError } = useQuery({
    queryKey: ['latest-assessments', id],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/donors/entities/${id}/assessments/latest`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch latest assessments')
      }
      return result.data as LatestAssessmentsResponse
    },
    enabled: !!id
  })

  // Handle loading and error states
  if (demographicsLoading || assessmentsLoading) {
    return (
      <RoleBasedRoute requiredRole="DONOR">
        <div className="container mx-auto py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </RoleBasedRoute>
    )
  }

  if (demographicsError || assessmentsError || !demographics) {
    return (
      <RoleBasedRoute requiredRole="DONOR">
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Entity Insights</h2>
            <p className="text-gray-600 mb-6">
              {demographicsError?.message || assessmentsError?.message || 'Entity not found or access denied'}
            </p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </RoleBasedRoute>
    )
  }

  return (
    <RoleBasedRoute requiredRole="DONOR">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                {demographics.name}
                <Badge variant="outline">{demographics.type}</Badge>
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {demographics.location || 'Location not specified'}
                {demographics.demographics?.lga && (
                  <span>• {demographics.demographics.lga} LGA</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <AssessmentExport 
              entityId={demographics.id} 
              entityName={demographics.name}
              latestAssessments={latestAssessments?.latestAssessments || []}
            />
          </div>
        </div>

        {/* Entity Header with Demographics */}
        <EntityInsightsHeader demographics={demographics} />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="assessments" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Assessments
            </TabsTrigger>
            <TabsTrigger value="gaps" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Gap Analysis
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latest Assessments Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Latest Assessments
                  </CardTitle>
                  <CardDescription>
                    Most recent verified assessments by category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {latestAssessments && latestAssessments.latestAssessments && latestAssessments.latestAssessments.length > 0 ? (
                    <div className="space-y-4">
                      {latestAssessments.latestAssessments.map((latest, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <p className="font-medium">{latest.type}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(latest.assessment.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={latest.assessment.summary.overallScore && latest.assessment.summary.overallScore >= 80 ? "default" : "secondary"}>
                              {latest.assessment.summary.overallScore ? `${latest.assessment.summary.overallScore}%` : 'N/A'}
                            </Badge>
                            {latest.assessment.summary.criticalGaps.length > 0 && (
                              <p className="text-xs text-red-600 mt-1">
                                {latest.assessment.summary.criticalGaps.length} critical gaps
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No verified assessments available
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {demographics.demographics?.population ? (
                  <StatCard
                    label="Total Population"
                    value={demographics.demographics.population.toLocaleString()}
                    severity="info"
                    variant="compact"
                    icon={Users}
                  />
                ) : null}

                {demographics.demographics?.vulnerableCount ? (
                  <StatCard
                    label="Vulnerable Population"
                    value={demographics.demographics.vulnerableCount.toLocaleString()}
                    severity="warning"
                    variant="compact"
                    icon={UsersRound}
                  />
                ) : null}

                <StatCard
                  label="Verified Assessments"
                  value={demographics.stats?.verifiedAssessments || 0}
                  severity="success"
                  variant="compact"
                  icon={ShieldCheck}
                />

                <StatCard
                  label="Active Commitments"
                  value={demographics.stats?.pendingCommitments || 0}
                  severity="medium"
                  variant="compact"
                  icon={ClipboardList}
                />

                {demographics.latestActivity?.lastAssessment && (
                  <StatCard
                    label="Last Assessment"
                    value={new Date(demographics.latestActivity.lastAssessment).toLocaleDateString()}
                    severity="neutral"
                    variant="compact"
                    icon={Clock}
                  />
                )}
              </div>
            </div>

            {/* Critical Gaps Alert */}
            {latestAssessments?.latestAssessments?.some(latest => latest.assessment.summary.criticalGaps.length > 0) && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Critical Gaps Identified
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {latestAssessments?.latestAssessments
                      ?.filter(latest => latest.assessment.summary.criticalGaps.length > 0)
                      .map((latest, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                          <div>
                            <p className="font-medium text-red-700">{latest.type}</p>
                            <ul className="text-sm text-red-600 list-disc list-inside">
                              {latest.assessment.summary.criticalGaps.map((gap, gapIndex) => (
                                <li key={gapIndex}>{gap}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="mt-4">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setActiveTab('gaps')}
                    >
                      View Detailed Gap Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments">
            <AssessmentViewer entityId={demographics.id} />
          </TabsContent>

          {/* Gap Analysis Tab */}
          <TabsContent value="gaps">
            <GapAnalysis entityId={demographics.id} />
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <AssessmentTrends entityId={demographics.id} />
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export Assessment Reports
                  </CardTitle>
                  <CardDescription>
                    Generate comprehensive reports in PDF or CSV format
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AssessmentExport 
                    entityId={demographics.id} 
                    entityName={demographics.name}
                    latestAssessments={latestAssessments?.latestAssessments || []}
                    expanded={true}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedRoute>
  )
}