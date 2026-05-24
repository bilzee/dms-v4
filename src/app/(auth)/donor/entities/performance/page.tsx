'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  PieChart,
  Activity,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Eye,
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Types for entity performance data
interface EntityPerformanceMetrics {
  id: string;
  name: string;
  type: string;
  location: string;
  demographics: {
    totalPopulation: number;
    vulnerableCount: number;
    households: number;
  };
  performanceScores: {
    overall: number;
    health: number;
    food: number;
    wash: number;
    shelter: number;
    security: number;
  };
  assessmentCoverage: number;
  lastAssessment: string | null;
  criticalGaps: string[];
  isActive: boolean;
}

interface EntityPerformanceResponse {
  totalEntities: number;
  activeEntities: number;
  averagePerformanceScore: number;
  topPerforming: EntityPerformanceMetrics[];
  needsAttention: EntityPerformanceMetrics[];
  entities: EntityPerformanceMetrics[];
  overallStats: {
    totalAssessments: number;
    totalPopulationServed: number;
    averageCoverage: number;
  };
}

export default function EntityPerformancePage() {
  const router = useRouter();
  const { currentRole } = useAuth();
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed'>('overview');
  const [sortBy, setSortBy] = useState<'performance' | 'population' | 'coverage'>('performance');

  // Fetch entity performance metrics using the new aggregated endpoints
  const { 
    data: performanceData, 
    isLoading: performanceLoading, 
    error: performanceError,
    refetch: refetchPerformance 
  } = useQuery({
    queryKey: ['entity-performance-metrics'],
    queryFn: async () => {
      // Fetch demographics and assessments data
      const [demographicsResult, assessmentsResult] = await Promise.all([
        apiGet('/api/v1/donors/entities/impact/demographics'),
        apiGet('/api/v1/donors/entities/impact/assessments/latest')
      ]);

      if (!demographicsResult.success || !assessmentsResult.success) {
        throw new Error('Failed to fetch entity performance data');
      }

      const demographicsData = demographicsResult.data;
      const assessmentsData = assessmentsResult.data;

      // Process and combine the data to create performance metrics
      const entities = demographicsData.data.entities || [];
      const assessmentsByCategory = assessmentsData.data.latestAssessmentsByCategory || {};

      const entityMetrics: EntityPerformanceMetrics[] = entities.map((entity: any) => {
        // Calculate performance scores based on assessments
        const scores = {
          overall: 0,
          health: 0,
          food: 0,
          wash: 0,
          shelter: 0,
          security: 0
        };

        let totalCategories = 0;
        let totalScore = 0;
        const criticalGaps: string[] = [];

        // Process each assessment category
        Object.entries(assessmentsByCategory).forEach(([category, assessments]) => {
          const entityAssessment = Array.isArray(assessments) ? assessments.find(a => a.entity.id === entity.id) : null;
          if (entityAssessment && entityAssessment.summary) {
            const score = entityAssessment.summary.overallScore || 0;
            const categoryKey = category.toLowerCase() as keyof typeof scores;
            
            if (categoryKey !== 'overall' && scores.hasOwnProperty(categoryKey)) {
              scores[categoryKey] = score;
              totalScore += score;
              totalCategories++;
            }

            // Collect critical gaps
            if (entityAssessment.summary.criticalGaps) {
              criticalGaps.push(...entityAssessment.summary.criticalGaps);
            }
          }
        });

        // Calculate overall score
        scores.overall = totalCategories > 0 ? Math.round(totalScore / totalCategories) : 0;

        // Calculate assessment coverage
        const assessmentCoverage = entity.stats?.verifiedAssessments > 0 ? 
          Math.min(100, (entity.stats.verifiedAssessments / 6) * 100) : 0;

        return {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          location: entity.location,
          demographics: {
            totalPopulation: entity.demographics.population || 0,
            vulnerableCount: entity.demographics.vulnerableCount || 0,
            households: entity.demographics.households || 0
          },
          performanceScores: scores,
          assessmentCoverage,
          lastAssessment: entity.latestActivity?.lastAssessment || null,
          criticalGaps: [...new Set(criticalGaps)], // Remove duplicates
          isActive: entity.isActive
        };
      });

      // Calculate aggregate statistics
      const activeEntities = entityMetrics.filter(e => e.isActive);
      const averagePerformanceScore = activeEntities.length > 0 
        ? Math.round(activeEntities.reduce((sum, e) => sum + e.performanceScores.overall, 0) / activeEntities.length)
        : 0;

      // Sort entities for top performing and needs attention
      const sortedByPerformance = [...activeEntities].sort((a, b) => 
        b.performanceScores.overall - a.performanceScores.overall
      );

      const topPerforming = sortedByPerformance.slice(0, 3);
      const needsAttention = sortedByPerformance
        .filter(e => e.performanceScores.overall < 50 || e.criticalGaps.length > 0)
        .slice(0, 3);

      return {
        totalEntities: entities.length,
        activeEntities: activeEntities.length,
        averagePerformanceScore,
        topPerforming,
        needsAttention,
        entities: entityMetrics,
        overallStats: {
          totalAssessments: demographicsData.data.overallStats?.totalVerifiedAssessments || 0,
          totalPopulationServed: demographicsData.data.aggregatedDemographics?.totalPopulation || 0,
          averageCoverage: Math.round((entityMetrics.reduce((sum, e) => sum + e.assessmentCoverage, 0) / entityMetrics.length) * 100) / 100
        }
      } as EntityPerformanceResponse;
    }
  });

  // Sort entities based on selected criteria
  const sortedEntities = useMemo(() => {
    if (!performanceData?.entities) return [];
    
    const entities = [...performanceData.entities];
    
    switch (sortBy) {
      case 'performance':
        return entities.sort((a, b) => b.performanceScores.overall - a.performanceScores.overall);
      case 'population':
        return entities.sort((a, b) => b.demographics.totalPopulation - a.demographics.totalPopulation);
      case 'coverage':
        return entities.sort((a, b) => b.assessmentCoverage - a.assessmentCoverage);
      default:
        return entities;
    }
  }, [performanceData?.entities, sortBy]);

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 80) return <Badge variant="secondary" className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 60) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge variant="secondary" className="bg-red-100 text-red-800">Needs Attention</Badge>;
  };

  if (performanceLoading) {
    return (
      <RoleBasedRoute requiredRole="DONOR">
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </RoleBasedRoute>
    );
  }

  if (performanceError) {
    return (
      <RoleBasedRoute requiredRole="DONOR">
        <div className="container mx-auto py-6">
          <Alert className="max-w-2xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load entity performance data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </RoleBasedRoute>
    );
  }

  return (
    <RoleBasedRoute requiredRole="DONOR">
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Entity Performance</h1>
              <p className="text-gray-600 mt-2">
                Track impact metrics and performance across all assigned entities
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchPerformance()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <StatCardGrid columns={4} gap="lg">
          <StatCard
            label="Total Entities"
            value={performanceData?.totalEntities || 0}
            severity="info"
            icon={Activity}
          />
          <StatCard
            label="Average Performance"
            value={`${performanceData?.averagePerformanceScore || 0}%`}
            severity="info"
            icon={TrendingUp}
          />
          <StatCard
            label="People Served"
            value={performanceData?.overallStats.totalPopulationServed.toLocaleString() || 0}
            severity="success"
            icon={Users}
          />
          <StatCard
            label="Assessment Coverage"
            value={`${performanceData?.overallStats.averageCoverage || 0}%`}
            severity="info"
            icon={BarChart3}
          />
        </StatCardGrid>

        {/* Quick Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Performing Entities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top Performing Entities
              </CardTitle>
              <CardDescription>
                Entities with highest overall performance scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData?.topPerforming.map((entity, index) => (
                  <div key={entity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{entity.name}</p>
                        <p className="text-sm text-gray-600">{entity.type} • {entity.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{entity.performanceScores.overall}%</p>
                      <p className="text-xs text-gray-500">{entity.assessmentCoverage}% coverage</p>
                    </div>
                  </div>
                ))}
                {(!performanceData?.topPerforming || performanceData.topPerforming.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No performance data available yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Entities Needing Attention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Needs Attention
              </CardTitle>
              <CardDescription>
                Entities with low scores or critical gaps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData?.needsAttention.map((entity) => (
                  <div key={entity.id} className="flex items-start justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <p className="font-medium">{entity.name}</p>
                      <p className="text-sm text-gray-600">{entity.type} • {entity.location}</p>
                      {entity.criticalGaps.length > 0 && (
                        <p className="text-sm text-red-600 mt-1">
                          {entity.criticalGaps.slice(0, 2).join(', ')}
                          {entity.criticalGaps.length > 2 && ` +${entity.criticalGaps.length - 2} more`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{entity.performanceScores.overall}%</p>
                      <p className="text-xs text-gray-500">{entity.assessmentCoverage}% coverage</p>
                    </div>
                  </div>
                ))}
                {(!performanceData?.needsAttention || performanceData.needsAttention.length === 0) && (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-green-600 font-medium">All entities performing well</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Entity Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Entity Performance Details</CardTitle>
                <CardDescription>
                  Detailed performance metrics for all entities
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance Score</SelectItem>
                    <SelectItem value="population">Population Served</SelectItem>
                    <SelectItem value="coverage">Assessment Coverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedEntities.map((entity) => (
                <div key={entity.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{entity.name}</h3>
                        {getPerformanceBadge(entity.performanceScores.overall)}
                        {!entity.isActive && (
                          <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {entity.type} • {entity.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {entity.demographics.totalPopulation.toLocaleString()} people
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          {entity.assessmentCoverage}% coverage
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-2xl font-bold",
                        entity.performanceScores.overall >= 80 ? "text-green-600" :
                        entity.performanceScores.overall >= 60 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {entity.performanceScores.overall}%
                      </p>
                      <p className="text-sm text-gray-500">Overall Score</p>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(entity.performanceScores).map(([category, score]) => {
                      if (category === 'overall') return null;
                      return (
                        <div key={category} className="text-center">
                          <p className="text-sm font-medium capitalize text-gray-700">{category}</p>
                          <p className={cn(
                            "text-lg font-bold",
                            score >= 80 ? "text-green-600" :
                            score >= 60 ? "text-yellow-600" : 
                            score > 0 ? "text-red-600" : "text-gray-400"
                          )}>
                            {score > 0 ? `${score}%` : 'N/A'}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Critical Gaps */}
                  {entity.criticalGaps.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-800 mb-1">Critical Gaps:</p>
                      <p className="text-sm text-red-700">
                        {entity.criticalGaps.slice(0, 3).join(' • ')}
                        {entity.criticalGaps.length > 3 && ` • +${entity.criticalGaps.length - 3} more`}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/donor/entities/${entity.id}`)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleBasedRoute>
  );
}