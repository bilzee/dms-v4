'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from '@/lib/icons';
import { Button } from '@/components/ui/button';

import { useIncidentSelection } from '@/stores/dashboardLayout.store';
import IncidentSelector from './components/IncidentSelector';
import IncidentSummary from './components/IncidentSummary';
import PopulationImpact from './components/PopulationImpact';
import PreliminaryImpact from './components/PreliminaryImpact';
import IncidentsOverview from './components/IncidentsOverview';

// Types for main panel
interface IncidentOverviewPanelProps {
  incidentId?: string;
  className?: string;
  onIncidentChange?: (incidentId: string) => void;
  dashboardMode?: 'coordinator' | 'executive';
}

interface DashboardData {
  incidents: Array<{
    id: string;
    type: string;
    subType: string;
    status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    location: string;
    createdAt: string;
    updatedAt: string;
  }>;
  selectedIncident?: {
    incident: any;
    populationImpact: any;
    aggregateMetrics: any;
  };
}

/**
 * Fetch dashboard data for selected incident
 */
const fetchDashboardData = async (incidentId?: string): Promise<DashboardData> => {
  const params = new URLSearchParams();
  if (incidentId) {
    params.append('incidentId', incidentId);
  }
  params.append('includeHistorical', 'true'); // Include historical for selector
  params.append('limit', '50');

  const response = await apiGet(`/api/v1/dashboard/situation?${params}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch dashboard data');
  }

  return response.data;
};

/**
 * Loading skeleton for incident overview panel
 */
function IncidentOverviewSkeleton() {
  return (
    <div className="space-y-3"> {/* Reduced spacing */}
      {/* Incident Selector Skeleton */}
      <Card>
        <CardContent className="p-3"> {/* Reduced padding */}
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-9 w-full" /> {/* Reduced height */}
        </CardContent>
      </Card>

      {/* Incident Summary Skeleton */}
      <Card>
        <CardContent className="p-3"> {/* Reduced padding */}
          <Skeleton className="h-5 w-40 mb-3" /> {/* Reduced margin */}
          <div className="space-y-2"> {/* Reduced spacing */}
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full" /> {/* Reduced height */}
          </div>
        </CardContent>
      </Card>

      {/* Population Impact Skeleton */}
      <Card>
        <CardContent className="p-3"> {/* Reduced padding */}
          <Skeleton className="h-5 w-32 mb-3" /> {/* Reduced margin */}
          <div className="grid grid-cols-1 gap-2 mb-3"> {/* Single column for narrow width */}
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-10 w-full" /> {/* Reduced height */}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Error state for incident overview panel
 */
function IncidentOverviewError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-4"> {/* Reduced padding */}
        <div className="flex flex-col gap-2 text-red-700"> {/* Vertical stacking for narrow width */}
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {/* Smaller icon */}
            <div className="font-medium text-sm">Failed to load incident data</div>
          </div>
          <div className="text-xs text-red-600 pl-6"> {/* Indented text */}
            {error.message}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 border-red-300 text-red-700 hover:bg-red-100 text-xs h-8 w-full"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * IncidentOverviewPanel Component
 * 
 * Main incident overview panel that integrates all sub-components:
 * - Incident selector with historical access
 * - Incident summary with real-time duration tracking
 * - Population impact statistics with demographic breakdown
 * - Aggregate metrics with trend analysis
 * - Responsive design for mobile and tablet
 * - Loading and error states with proper accessibility
 * 
 * This panel serves as the left panel in the three-panel situation dashboard layout
 * and provides the incident context that drives the entire dashboard.
 */
export function IncidentOverviewPanel({ 
  incidentId, 
  className, 
  onIncidentChange,
  dashboardMode = 'coordinator' 
}: IncidentOverviewPanelProps) {
  const { selectedIncidentId } = useIncidentSelection();
  
  // Use the incident ID from props or store
  const currentIncidentId = incidentId || selectedIncidentId;

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['api-v1-dashboard-situation', currentIncidentId, 'overview'],
    queryFn: () => fetchDashboardData(currentIncidentId || undefined),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Handle incident change
  const handleIncidentChange = (incidentId: string) => {
    onIncidentChange?.(incidentId);
  };

  // Handle retry
  const handleRetry = () => {
    refetch();
  };

  // Loading state
  if (isLoading && !dashboardData) {
    return (
      <div className={cn("space-y-4", className)}>
        <IncidentOverviewSkeleton />
      </div>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <div className={cn("space-y-4", className)}>
        <IncidentOverviewError error={error as Error} onRetry={handleRetry} />
      </div>
    );
  }

  const selectedIncident = dashboardData?.selectedIncident;
  const incidents = dashboardData?.incidents || [];

  return (
    <div className={cn("space-y-3 h-full overflow-y-auto", className)}> {/* Reduced spacing */}
      
      {/* Incident Selector */}
      <IncidentSelector
        selectedIncidentId={currentIncidentId || undefined}
        onIncidentChange={handleIncidentChange}
        includeHistorical={false}
        className="px-1"
      />


      {/* Selected Incident Content */}
      {selectedIncident ? (
        <>
          {/* Incident Summary */}
          <IncidentSummary
            incident={selectedIncident.incident}
            realTime={selectedIncident.incident.status === 'ACTIVE'}
            className="px-1"
          />

          {/* Population Impact Statistics (Verified) */}
          <PopulationImpact
            incidentId={currentIncidentId || undefined}
            className="px-1"
          />

          {/* Preliminary Impact Assessment - Hidden in Executive mode */}
          {dashboardMode !== 'executive' && (
            <div className="animate-fade-in transition-opacity duration-300 ease-in-out">
              <PreliminaryImpact
                incidentId={currentIncidentId || undefined}
                className="px-1"
              />
            </div>
          )}
        </>
      ) : (
        /* No Incident Selected State */
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              <div className="text-lg font-medium mb-2">
                No Incident Selected
              </div>
              <div className="text-sm">
                Select an incident from the dropdown above to view detailed information
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading indicator for data refresh */}
      {isLoading && dashboardData && (
        <div className="fixed bottom-4 right-4 bg-card shadow-lg rounded-lg p-2 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Updating...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default IncidentOverviewPanel;