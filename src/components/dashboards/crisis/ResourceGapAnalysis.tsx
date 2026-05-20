'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Target,
  TrendingUp,
  AlertTriangle,
  Package,
  Users,
  Search,
  Filter,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { Entity, Incident, Donor } from '@/types/commitment';

interface ResourceGapAnalysisProps {
  className?: string;
}

interface GapAnalysis {
  entityId: string;
  entity: Entity;
  gaps: Array<{
    resourceName: string;
    requiredQuantity: number;
    committedQuantity: number;
    deliveredQuantity: number;
    gap: number;
    percentageMet: number;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    priority: number;
  }>;
  totalGapValue: number;
  criticalGaps: number;
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
      totalGapValue: number;
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
      return (result.data as any)?.data || result.data || { data: [], summary: {} };
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
      return (result.data as any)?.data || result.data || { data: [] };
    }
  });

  // Fetch entities for filters
  const { data: entities } = useQuery<Entity[]>({
    queryKey: ['entities', token],
    enabled: isAuthenticated && !!token && token.length > 10,
    queryFn: async () => {
      const result = await apiGet('/api/v1/entities')
      if (!result.success) return []
      const d = result.data as any
      return d?.data || d || [];
    }
  });

  // Fetch incidents for filters
  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ['incidents', token],
    enabled: isAuthenticated && !!token && token.length > 10,
    queryFn: async () => {
      const result = await apiGet('/api/v1/incidents')
      if (!result.success) return []
      const d = result.data as any
      return d?.data || d || [];
    }
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      HIGH: { className: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
      MEDIUM: { className: 'bg-amber-100 text-amber-800 border-amber-200', icon: TrendingUp },
      LOW: { className: 'bg-green-100 text-green-800 border-green-200', icon: Package }
    };
    
    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.LOW;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {severity}
      </Badge>
    );
  };

  const getCompatibilityBadge = (score: number) => {
    let className = 'bg-green-100 text-green-800';
    if (score < 70) className = 'bg-amber-100 text-amber-800';
    if (score < 40) className = 'bg-red-100 text-red-800';
    
    return (
      <Badge className={className}>
        {score}% Match
      </Badge>
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entities with Gaps</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gapAnalysisData.summary.totalEntities}</div>
              <p className="text-xs text-muted-foreground">
                Of all active entities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Resource Gaps</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{gapAnalysisData.summary.totalGaps}</div>
              <p className="text-xs text-muted-foreground">
                Across all categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Gaps</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{gapAnalysisData.summary.criticalGaps}</div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gap Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${(gapAnalysisData.summary.totalGapValue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated resource value needed
              </p>
            </CardContent>
          </Card>
        </div>
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
                <SelectItem value="HIGH">Critical</SelectItem>
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
              {filteredGaps?.map((gapAnalysis) => (
                <Card key={gapAnalysis.entityId} className="border-l-4 border-l-orange-500">
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
                      {gapAnalysis.gaps.map((gap, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium">{gap.resourceName}</h4>
                              {getSeverityBadge(gap.severity)}
                            </div>
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
                              <span>{gap.deliveredQuantity} / {gap.requiredQuantity} units</span>
                            </div>
                            <Progress value={gap.percentageMet} className="h-2" />
                          </div>
                          
                          <div className="grid gap-2 md:grid-cols-3 text-sm">
                            <div>
                              <strong>Required:</strong> {gap.requiredQuantity.toLocaleString()} units
                            </div>
                            <div>
                              <strong>Committed:</strong> {gap.committedQuantity.toLocaleString()} units
                            </div>
                            <div>
                              <strong>Delivered:</strong> {gap.deliveredQuantity.toLocaleString()} units
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {gapAnalysis.totalGapValue > 0 && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Total Gap Value:</span>
                            <span className="text-lg font-bold text-red-600">
                              ${gapAnalysis.totalGapValue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                    <Card key={recommendation.donorId} className="border-l-4 border-l-green-500">
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