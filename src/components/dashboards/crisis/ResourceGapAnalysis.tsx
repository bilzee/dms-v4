'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Target,
  AlertTriangle,
  Users,
  Search,
  Filter,
  BarChart3,
  Lightbulb,
  RefreshCw,
  Download,
  Eye
} from '@/lib/icons';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, extractArray } from '@/lib/api';
import { severityCardColors } from '@/lib/utils/status-colors';
import { Entity, Incident, Donor } from '@/types/commitment';

interface ResourceGapAnalysisProps {
  className?: string;
}

interface GapAnalysis {
  entityId: string;
  entity: Entity;
  gaps: Array<{
    resourceName: string;
    sourceId: string;
    sourceType: 'plan' | 'commitment';
    requiredQuantity: number | null;
    committedQuantity: number;
    deliveredQuantity: number;
    gap: number;
    percentageMet: number;
    sourcePriority: string;
  }>;
  criticalGaps: number;
  severityCounts: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    UNCLASSIFIED: number;
  };
  entitySeverity: string;
}

interface DonorRecommendation {
  donorId: string;
  donor: Donor;
  compatibilityScore: number;
  recommendedItems: Array<{
    itemName: string;
    maxQuantity: number;
    matchReason: string;
  }>;
  totalCapacity: number;
}

export function ResourceGapAnalysis({ className }: ResourceGapAnalysisProps) {
  const { token, isAuthenticated } = useAuth();

  const [activeView, setActiveView] = useState('gaps');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    severity: 'all',
    entityId: 'all',
    incidentId: 'all'
  });
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  // Fetch gap analysis data
  const { data: gapAnalysisData, isLoading: gapsLoading, error: gapsError, refetch: refetchGaps } = useQuery<{
    data: GapAnalysis[];
    summary: {
      totalEntities: number;
      totalGaps: number;
      criticalGaps: number;
      avgDelivery: number;
      bySeverity: Record<string, number>;
    };
  }>({
    queryKey: ['resource-gap-analysis', filters, token],
    enabled: isAuthenticated && !!token && token.length > 10,
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });

      const result = await apiGet(`/api/v1/dashboard/resource-management/gap-analysis?${params}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch gap analysis')
      const inner = result.data as any
      return inner?.data ? inner : { data: [], summary: {} };
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch donor recommendations for selected entity
  const { data: donorRecommendations, isLoading: recommendationsLoading } = useQuery<{
    data: DonorRecommendation[];
  }>({
    queryKey: ['donor-recommendations', selectedEntity, token],
    enabled: !!selectedEntity && isAuthenticated && !!token && token.length > 10,
    queryFn: async () => {
      const result = await apiGet(`/api/v1/entities/${selectedEntity}/donor-recommendations`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch donor recommendations')
      const inner = result.data as any;
      return inner?.data ? inner : { data: [] };
    }
  });

  // Fetch entities for filters
  const { data: entities } = useQuery<Entity[]>({
    queryKey: ['entities', token],
    enabled: isAuthenticated && !!token && token.length > 10,
    queryFn: async () => {
      const result = await apiGet('/api/v1/entities')
      if (!result.success) return []
      return extractArray<Entity>(result.data as any);
    }
  });

  // Fetch incidents for filters
  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ['incidents', token],
    enabled: isAuthenticated && !!token && token.length > 10,
    queryFn: async () => {
      const result = await apiGet('/api/v1/incidents')
      if (!result.success) return []
      return extractArray<Incident>(result.data as any);
    }
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getCompatibilityBadge = (score: number) => {
    const status = score >= 70 ? 'COMPLETE' : score >= 40 ? 'PARTIAL' : 'CANCELLED';

    return (
      <StatusBadge
        domain="commitment"
        status={status}
        label={`${score}% Match`}
      />
    );
  };

  const filteredGaps = gapAnalysisData?.data?.filter(gap => {
    const matchesSearch = !searchTerm || 
      gap.entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gap.gaps.some(g => g.resourceName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const handleRefresh = () => {
    refetchGaps();
  };

  const handleExportAnalysis = () => {
    // Export functionality to be implemented
    console.log('Exporting gap analysis...');
  };

  if (gapsError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load resource gap analysis. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Target className="h-5 w-5" />
                Resource Gap Analysis
              </CardTitle>
              <CardDescription>
                Identify unmet needs and match them with suitable donor capabilities
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportAnalysis}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={gapsLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${gapsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Statistics */}
      {gapAnalysisData?.summary && (
        <StatCardGrid columns={4} className="mb-6">
          <StatCard
            label="Entities with Resource Gaps"
            value={gapAnalysisData.summary.totalEntities}
            severity="warning"
            icon={Users}
          />
          <StatCard
            label="Total Resource Gaps"
            value={gapAnalysisData.summary.totalGaps}
            severity="info"
            icon={Target}
          />
          <StatCard
            label="Critical Assessment Gaps"
            value={gapAnalysisData.summary.criticalGaps}
            severity="critical"
            icon={AlertTriangle}
          />
          <StatCard
            label="Avg. Delivery"
            value={`${gapAnalysisData.summary.avgDelivery || 0}%`}
            severity="success"
            icon={BarChart3}
          />
        </StatCardGrid>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entities or resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.entityId} onValueChange={(value) => handleFilterChange('entityId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities?.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.incidentId} onValueChange={(value) => handleFilterChange('incidentId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Incidents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Incidents</SelectItem>
                {incidents?.map((incident) => (
                  <SelectItem key={incident.id} value={incident.id}>
                    {incident.type} - {incident.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Resource Gaps
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2" disabled={!selectedEntity}>
            <Lightbulb className="h-4 w-4" />
            Donor Recommendations
            {selectedEntity && <Badge variant="secondary" className="ml-1">1 Entity</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Resource Gaps Tab */}
        <TabsContent value="gaps" className="space-y-6">
          {gapsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-96 mb-4" />
                    <Skeleton className="h-4 w-64" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredGaps?.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No resource gaps found
              </h3>
              <p className="text-muted-foreground">
                All entity requirements are currently met or no data matches the filters.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGaps?.map((gapAnalysis) => {
                const entitySevKey = (gapAnalysis.entitySeverity || 'UNCLASSIFIED').toLowerCase();
                const entityCardClass = severityCardColors[entitySevKey as keyof typeof severityCardColors] || severityCardColors.neutral;
                return (
                <Card key={gapAnalysis.entityId} className={entityCardClass}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{gapAnalysis.entity.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{gapAnalysis.gaps.length} gaps</Badge>
                        {gapAnalysis.criticalGaps > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            {gapAnalysis.criticalGaps} critical
                          </Badge>
                        )}
                        {(gapAnalysis.severityCounts?.CRITICAL ?? 0) > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            {gapAnalysis.severityCounts.CRITICAL} CRITICAL
                          </Badge>
                        )}
                        {(gapAnalysis.severityCounts?.HIGH ?? 0) > 0 && (
                          <Badge className="bg-orange-100 text-orange-800">
                            {gapAnalysis.severityCounts.HIGH} HIGH
                          </Badge>
                        )}
                        {(gapAnalysis.severityCounts?.MEDIUM ?? 0) > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {gapAnalysis.severityCounts.MEDIUM} MEDIUM
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEntity(gapAnalysis.entityId)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Find Donors
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {gapAnalysis.gaps.map((gap, index) => {
                        const itemSevKey = (gap.sourcePriority || 'UNCLASSIFIED').toLowerCase();
                        const itemCardClass = severityCardColors[itemSevKey as keyof typeof severityCardColors] || severityCardColors.neutral;
                        return (
                        <div key={index} className={`border rounded-lg p-4 ${itemCardClass}`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{gap.resourceName}</h4>
                            <div className="text-right">
                              <div className="font-semibold text-red-600">
                                Gap: {gap.gap.toLocaleString()} units
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {gap.percentageMet}% met
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{gap.deliveredQuantity} / {gap.requiredQuantity !== null ? gap.requiredQuantity.toLocaleString() : 'unspecified'} units</span>
                            </div>
                            <Progress value={gap.percentageMet} className="h-2" />
                          </div>
                          
                          <div className="grid gap-2 md:grid-cols-3 text-sm">
                            <div>
                              <strong>Required:</strong> {gap.requiredQuantity !== null ? `${gap.requiredQuantity.toLocaleString()} units` : 'unspecified'}
                            </div>
                            <div>
                              <strong>Committed:</strong> {gap.committedQuantity.toLocaleString()} units
                            </div>
                            <div>
                              <strong>Delivered:</strong> {gap.deliveredQuantity.toLocaleString()} units
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Donor Recommendations Tab */}
        <TabsContent value="recommendations">
          {selectedEntity ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedEntity(null)}
                >
                  ← Back to All Gaps
                </Button>
                <div>
                  <h3 className="font-medium">Donor Recommendations for</h3>
                  <p className="text-muted-foreground">
                    {entities?.find(e => e.id === selectedEntity)?.name}
                  </p>
                </div>
              </div>

              {recommendationsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-96 mb-4" />
                        <Skeleton className="h-4 w-64" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : donorRecommendations?.data?.length === 0 ? (
                <div className="text-center py-12">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No suitable donors found
                  </h3>
                  <p className="text-muted-foreground">
                    No donors match the resource requirements for this entity.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {donorRecommendations?.data?.map((recommendation) => (
                    <Card key={recommendation.donorId} className="bg-emerald-500/5 border-emerald-500/15">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg">{recommendation.donor.name}</h4>
                              {getCompatibilityBadge(recommendation.compatibilityScore)}
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              Type: {recommendation.donor.type} | Capacity: {recommendation.totalCapacity.toLocaleString()} units
                            </div>
                            {recommendation.donor.contactEmail && (
                              <div className="text-sm text-muted-foreground">
                                Contact: {recommendation.donor.contactEmail}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h5 className="font-medium">Recommended Contributions:</h5>
                          {recommendation.recommendedItems.map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                              <div>
                                <span className="font-medium">{item.itemName}</span>
                                <div className="text-sm text-muted-foreground">{item.matchReason}</div>
                              </div>
                              <Badge variant="outline">
                                Up to {item.maxQuantity.toLocaleString()} units
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Select an entity to view donor recommendations
              </h3>
              <p className="text-muted-foreground">
                Click &quot;Find Donors&quot; on any entity with resource gaps to see compatible donors.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}