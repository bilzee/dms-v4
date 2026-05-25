'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw, TrendingUp, MapPin, Users, Info } from '@/lib/icons';
import { EntitySelector } from './components/EntitySelector';
import { AssessmentCategorySummary } from './components/AssessmentCategorySummary';
import { AggregationInfoPopup } from './components/AggregationInfoPopup';
import { IndividualEntityGapInfoPopup } from './components/IndividualEntityGapInfoPopup';
import { useIncidentSelection, useEntitySelection } from '@/stores/dashboardLayout.store';

interface EntityAssessmentPanelProps {
  incidentId: string;
  entityId?: string;
  className?: string;
  onEntityChange?: (entityId: string) => void;
}

// Types for aggregated assessment data
interface AggregatedAssessments {
  health: {
    totalEntities: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
    totalHealthFacilities: number;
    totalQualifiedWorkers: number;
  };
  food: {
    totalEntities: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
    averageFoodDuration: number;
    totalAdditionalPersonsRequired: number;
  };
  wash: {
    totalEntities: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
    totalFunctionalLatrines: number;
  };
  shelter: {
    totalEntities: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
    totalSheltersRequired: number;
  };
  security: {
    totalEntities: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
  };
  population: {
    totalEntities: number;
    totalPopulation: number;
    totalHouseholds: number;
    totalLivesLost: number;
    totalInjured: number;
  };
  gapSummary: {
    totalGaps: number;
    totalNoGaps: number;
    criticalGaps: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
  };
}

// Fetch dashboard data with entity assessments
const fetchDashboardData = async (incidentId: string, entityId?: string) => {
  const params = new URLSearchParams({ incidentId });
  if (entityId) {
    params.append('entityId', entityId);
  }

  const response = await apiGet(`/api/v1/dashboard/situation?${params}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch dashboard data');
  }

  return response;
};

/**
 * EntityAssessmentPanel Component
 * 
 * Main panel component that integrates:
 * - Entity selector for filtering
 * - Assessment category summaries for each entity
 * - Aggregated view for "All Entities" selection
 * - Loading and error states
 * - Responsive design for mobile/desktop
 */
export function EntityAssessmentPanel({
  incidentId,
  entityId,
  className,
  onEntityChange
}: EntityAssessmentPanelProps) {
  const { selectedIncidentId } = useIncidentSelection();
  const { selectedEntityId, includeAllEntities } = useEntitySelection();
  
  // State for info popups
  const [showAggregationInfo, setShowAggregationInfo] = useState(false);
  const [showIndividualEntityInfo, setShowIndividualEntityInfo] = useState(false);
  
  const effectiveEntityId = entityId || selectedEntityId;
  const effectiveIncidentId = incidentId || selectedIncidentId;

  
  // Determine the entity ID to use for API call
  const entityIdForApi = useMemo(() => {
    if (includeAllEntities) {
      return 'all'; // Explicitly request all entities
    }
    return effectiveEntityId; // Use selected entity or undefined
  }, [includeAllEntities, effectiveEntityId]);

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['api-v1-dashboard-situation', effectiveIncidentId, entityIdForApi],
    queryFn: () => {
      return fetchDashboardData(effectiveIncidentId!, entityIdForApi || undefined);
    },
    enabled: !!effectiveIncidentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter entities based on selection
  const entityAssessments = useMemo(() => {
    const allEntityAssessments = dashboardData?.data?.entityAssessments || [];
    
    if (includeAllEntities || !effectiveEntityId || effectiveEntityId === 'all') {
      return allEntityAssessments;
    }
    return allEntityAssessments.filter((entity: any) => entity.id === effectiveEntityId);
  }, [dashboardData?.data?.entityAssessments, includeAllEntities, effectiveEntityId]);

  const aggregatedAssessments = dashboardData?.data?.aggregatedAssessments;

  // Handle entity selection
  const handleEntityChange = (newEntityId: string) => {
    onEntityChange?.(newEntityId);
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to load assessment data
            </h3>
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No incident selected
  if (!effectiveIncidentId) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Select an incident
            </h3>
            <p className="text-gray-600">
              Choose an incident from the left panel to view entity assessments
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full h-full flex flex-col", className)}>
      <CardHeader className="pb-3 flex-shrink-0"> {/* Reduced padding + prevent shrinking */}
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Entity Assessment Panel
              {includeAllEntities && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAggregationInfo(true)}
                  className="h-6 w-6 p-0 ml-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                  title="Learn about All Entities aggregation"
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
              {!includeAllEntities && effectiveEntityId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowIndividualEntityInfo(true)}
                  className="h-6 w-6 p-0 ml-2 text-green-600 hover:text-green-800 hover:bg-green-50"
                  title="Learn about individual entity gap assessment"
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Detailed assessment analysis with gap indicators
              {includeAllEntities && (
                <span className="ml-1 text-blue-600">
                  (All Entities View)
                </span>
              )}
              {!includeAllEntities && effectiveEntityId && (
                <span className="ml-1 text-green-600">
                  (Individual Entity View)
                </span>
              )}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-3"> {/* Proper scrolling + tighter spacing */}
        {/* Entity Selector */}
        <EntitySelector
          incidentId={effectiveIncidentId}
          selectedEntityId={effectiveEntityId || undefined}
          onEntityChange={handleEntityChange}
          includeAllOption={true}
        />

        {/* Gap Summary for "All Entities" view */}
        {includeAllEntities && aggregatedAssessments && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-1 pt-2"> {/* Further reduced padding */}
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Aggregated Assessment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-2"> {/* Further reduced padding */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2"> {/* Tighter gap */}
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {aggregatedAssessments.gapSummary.entitiesWithGaps}
                  </div>
                  <div className="text-xs text-gray-600">Entities with Gaps</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {aggregatedAssessments.gapSummary.entitiesWithoutGaps}
                  </div>
                  <div className="text-xs text-gray-600">Entities without Gaps</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">
                    {aggregatedAssessments.gapSummary.criticalGaps}
                  </div>
                  <div className="text-xs text-gray-600">Critical Assessments</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">
                    {aggregatedAssessments.gapSummary.totalGaps}
                  </div>
                  <div className="text-xs text-gray-600">Assessments with Gaps</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

          <Separator />

        {/* Assessment Categories */}
        <div className="space-y-3 flex-1 overflow-hidden"> {/* Reduced spacing and made scrollable */}
          {includeAllEntities && aggregatedAssessments ? (
            // Aggregated view - show aggregated data for each category, always show all 5 categories
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"> {/* 5 columns for better space utilization */}
              {/* Always show all 5 assessment categories - show aggregated data or empty tiles */}
              <AssessmentCategorySummary
                category="health"
                assessment={aggregatedAssessments.health}
                gapAnalysis={aggregatedAssessments.health ? {
                  hasGap: aggregatedAssessments.health.entitiesWithGaps > 0,
                  gapFields: aggregatedAssessments.health.fieldGapAnalysis?.gapFields || [],
                  severity: aggregatedAssessments.health.fieldGapAnalysis?.overallSeverity || 'MEDIUM',
                  fieldSeverityMap: aggregatedAssessments.health.fieldGapAnalysis?.fieldSeverityMap || {},
                  fieldCounts: aggregatedAssessments.health.fieldGapAnalysis?.fieldCounts || {},
                  recommendations: aggregatedAssessments.health.fieldGapAnalysis?.recommendations || []
                } : undefined}
                layout="full"
                showRecommendations={false}
                isAggregated={true}
              />
              <AssessmentCategorySummary
                category="food"
                assessment={aggregatedAssessments.food}
                gapAnalysis={aggregatedAssessments.food ? {
                  hasGap: aggregatedAssessments.food.entitiesWithGaps > 0,
                  gapFields: aggregatedAssessments.food.fieldGapAnalysis?.gapFields || [],
                  severity: aggregatedAssessments.food.fieldGapAnalysis?.overallSeverity || 'MEDIUM',
                  fieldSeverityMap: aggregatedAssessments.food.fieldGapAnalysis?.fieldSeverityMap || {},
                  fieldCounts: aggregatedAssessments.food.fieldGapAnalysis?.fieldCounts || {},
                  recommendations: aggregatedAssessments.food.fieldGapAnalysis?.recommendations || []
                } : undefined}
                layout="full"
                showRecommendations={false}
                isAggregated={true}
              />
              <AssessmentCategorySummary
                category="wash"
                assessment={aggregatedAssessments.wash}
                gapAnalysis={aggregatedAssessments.wash ? {
                  hasGap: aggregatedAssessments.wash.entitiesWithGaps > 0,
                  gapFields: aggregatedAssessments.wash.fieldGapAnalysis?.gapFields || [],
                  severity: aggregatedAssessments.wash.fieldGapAnalysis?.overallSeverity || 'MEDIUM',
                  fieldSeverityMap: aggregatedAssessments.wash.fieldGapAnalysis?.fieldSeverityMap || {},
                  fieldCounts: aggregatedAssessments.wash.fieldGapAnalysis?.fieldCounts || {},
                  recommendations: aggregatedAssessments.wash.fieldGapAnalysis?.recommendations || []
                } : undefined}
                layout="full"
                showRecommendations={false}
                isAggregated={true}
              />
              <AssessmentCategorySummary
                category="shelter"
                assessment={aggregatedAssessments.shelter}
                gapAnalysis={aggregatedAssessments.shelter ? {
                  hasGap: aggregatedAssessments.shelter.entitiesWithGaps > 0,
                  gapFields: aggregatedAssessments.shelter.fieldGapAnalysis?.gapFields || [],
                  severity: aggregatedAssessments.shelter.fieldGapAnalysis?.overallSeverity || 'MEDIUM',
                  fieldSeverityMap: aggregatedAssessments.shelter.fieldGapAnalysis?.fieldSeverityMap || {},
                  fieldCounts: aggregatedAssessments.shelter.fieldGapAnalysis?.fieldCounts || {},
                  recommendations: aggregatedAssessments.shelter.fieldGapAnalysis?.recommendations || []
                } : undefined}
                layout="full"
                showRecommendations={false}
                isAggregated={true}
              />
              <AssessmentCategorySummary
                category="security"
                assessment={aggregatedAssessments.security}
                gapAnalysis={aggregatedAssessments.security ? {
                  hasGap: aggregatedAssessments.security.entitiesWithGaps > 0,
                  gapFields: aggregatedAssessments.security.fieldGapAnalysis?.gapFields || [],
                  severity: aggregatedAssessments.security.fieldGapAnalysis?.overallSeverity || 'MEDIUM',
                  fieldSeverityMap: aggregatedAssessments.security.fieldGapAnalysis?.fieldSeverityMap || {},
                  fieldCounts: aggregatedAssessments.security.fieldGapAnalysis?.fieldCounts || {},
                  recommendations: aggregatedAssessments.security.fieldGapAnalysis?.recommendations || []
                } : undefined}
                layout="full"
                showRecommendations={false}
                isAggregated={true}
              />
            </div>
          ) : entityAssessments.length > 0 ? (
            // Individual entity view - show detailed assessments for selected entity
            <div className="space-y-4 overflow-hidden"> {/* Reduced spacing */}
              {entityAssessments.map((entity: any, index: number) => (
                <div key={entity.id || index} className="space-y-3"> {/* Reduced spacing */}

                  {/* Gap-based Assessments Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"> {/* 5 columns for better space utilization */}
                    {/* Always render all assessment types, showing empty tiles when data is missing */}
                    <AssessmentCategorySummary
                      category="health"
                      assessment={entity.latestAssessments?.health}
                      gapAnalysis={entity.latestAssessments?.health?.gapAnalysis}
                      layout="split"
                    />
                    <AssessmentCategorySummary
                      category="food"
                      assessment={entity.latestAssessments?.food}
                      gapAnalysis={entity.latestAssessments?.food?.gapAnalysis}
                      layout="split"
                    />
                    <AssessmentCategorySummary
                      category="wash"
                      assessment={entity.latestAssessments?.wash}
                      gapAnalysis={entity.latestAssessments?.wash?.gapAnalysis}
                      layout="split"
                    />
                    <AssessmentCategorySummary
                      category="shelter"
                      assessment={entity.latestAssessments?.shelter}
                      gapAnalysis={entity.latestAssessments?.shelter?.gapAnalysis}
                      layout="split"
                    />
                    <AssessmentCategorySummary
                      category="security"
                      assessment={entity.latestAssessments?.security}
                      gapAnalysis={entity.latestAssessments?.security?.gapAnalysis}
                      layout="split"
                    />
                  </div>


                  {index < entityAssessments.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            // No entities found
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No entities found
              </h3>
              <p className="text-gray-600">
                No entities are associated with this incident yet.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Aggregation Info Popup */}
      <AggregationInfoPopup
        isOpen={showAggregationInfo}
        onClose={() => setShowAggregationInfo(false)}
      />
      
      {/* Individual Entity Gap Info Popup */}
      <IndividualEntityGapInfoPopup
        isOpen={showIndividualEntityInfo}
        onClose={() => setShowIndividualEntityInfo(false)}
      />
    </Card>
  );
}

export default EntityAssessmentPanel;