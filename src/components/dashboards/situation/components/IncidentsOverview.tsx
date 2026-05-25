'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBadgeClasses } from '@/components/shared/StatusBadge';
import {
  Activity,
  Droplets,
  Sun,
  Zap,
  Flame,
  Waves,
  Wind,
  Mountain,
  Users,
  Car,
  Building,
  AlertTriangle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp
} from '@/lib/icons';

// Types
interface IncidentsOverviewProps {
  className?: string;
}

interface IncidentTypeSummary {
  type: string;
  activeCount: number;
  containedCount: number;
  totalCount: number;
}

interface DashboardData {
  incidents: Array<{
    id: string;
    type: string;
    status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    createdAt: string;
  }>;
}

// Incident type configuration with icons
const incidentTypeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>, color: string, label: string }> = {
  'FLOOD': { icon: Waves, color: 'text-blue-600', label: 'Flood' },
  'DROUGHT': { icon: Sun, color: 'text-orange-600', label: 'Drought' },
  'EARTHQUAKE': { icon: Mountain, color: 'text-muted-foreground', label: 'Earthquake' },
  'WILDFIRE': { icon: Flame, color: 'text-red-600', label: 'Wildfire' },
  'HURRICANE': { icon: Wind, color: 'text-purple-600', label: 'Hurricane' },
  'TORNADO': { icon: Wind, color: 'text-muted-foreground', label: 'Tornado' },
  'TSUNAMI': { icon: Waves, color: 'text-blue-800', label: 'Tsunami' },
  'VOLCANIC': { icon: Mountain, color: 'text-red-500', label: 'Volcanic' },
  'CONFLICT': { icon: Users, color: 'text-red-700', label: 'Conflict' },
  'ACCIDENT': { icon: Car, color: 'text-yellow-600', label: 'Accident' },
  'BUILDING_COLLAPSE': { icon: Building, color: 'text-foreground', label: 'Building Collapse' },
  'POWER_OUTAGE': { icon: Zap, color: 'text-yellow-500', label: 'Power Outage' },
  'OTHER': { icon: AlertTriangle, color: 'text-muted-foreground', label: 'Other' }
};

/**
 * Format large numbers with commas
 */
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

/**
 * Get time since incident started
 */
const getTimeSince = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
  
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

// Fetch dashboard data for incidents overview
const fetchIncidentsData = async (): Promise<DashboardData> => {
  const params = new URLSearchParams();
  params.append('includeHistorical', 'true');
  params.append('limit', '100'); // Get more incidents for overview

  const response = await apiGet(`/api/v1/dashboard/situation?${params}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch incidents data');
  }

  return response.data;
};

/**
 * IncidentsOverview Component
 * 
 * Displays overview of all active and contained incidents grouped by type
 * with appropriate icons and counts. Only shows incident types that have
 * active or contained incidents.
 */
export function IncidentsOverview({ className }: IncidentsOverviewProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Fetch incidents data
  const {
    data: dashboardData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['incidents-overview'],
    queryFn: fetchIncidentsData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle loading state
  if (isLoading) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader 
          className="pb-3 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="text-lg font-semibold flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Active Incidents Overview
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Loading incidents overview...</p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  // Handle error state
  if (error || !dashboardData) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader 
          className="pb-3 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="text-lg font-semibold flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Incidents Overview
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="text-center py-4 text-red-600">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Failed to load incidents overview</p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  // Process incidents data
  const incidents = dashboardData.incidents || [];
  
  // Filter active and contained incidents and group by type
  const activeContainedIncidents = incidents.filter(incident => 
    incident.status === 'ACTIVE' || incident.status === 'CONTAINED'
  );

  // Group incidents by type
  const incidentsByType: Record<string, IncidentTypeSummary> = {};
  
  activeContainedIncidents.forEach(incident => {
    const type = incident.type.toUpperCase();
    
    if (!incidentsByType[type]) {
      incidentsByType[type] = {
        type,
        activeCount: 0,
        containedCount: 0,
        totalCount: 0
      };
    }
    
    incidentsByType[type].totalCount++;
    
    if (incident.status === 'ACTIVE') {
      incidentsByType[type].activeCount++;
    } else if (incident.status === 'CONTAINED') {
      incidentsByType[type].containedCount++;
    }
  });

  // Convert to array and sort by total count (descending)
  const incidentTypeSummaries = Object.values(incidentsByType)
    .sort((a, b) => b.totalCount - a.totalCount);

  // No active/contained incidents
  if (incidentTypeSummaries.length === 0) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader 
          className="pb-3 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="text-lg font-semibold flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Active Incidents Overview
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="text-center py-4 text-green-600">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No Active Incidents</p>
              <p className="text-xs text-muted-foreground mt-1">All incidents have been resolved</p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader 
        className="pb-3 cursor-pointer hover:bg-muted transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-lg font-semibold flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            Active Incidents Overview
            <Badge variant="secondary">
              {formatNumber(activeContainedIncidents.length)} total
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-3">
        {incidentTypeSummaries.map((summary) => {
          const config = incidentTypeConfig[summary.type] || incidentTypeConfig.OTHER;
          const Icon = config.icon;
          
          return (
            <div key={summary.type} className="flex items-center justify-between p-3 bg-muted rounded-lg border">
              <div className="flex items-center gap-3">
                <Icon className={cn("h-5 w-5", config.color)} />
                <div>
                  <div className="font-medium text-sm">{config.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {summary.totalCount} incident{summary.totalCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {summary.activeCount > 0 && (
                  <Badge variant="outline" className={cn("text-xs h-5", getBadgeClasses('incident', 'ACTIVE'))}>
                    {summary.activeCount} Active
                  </Badge>
                )}
                {summary.containedCount > 0 && (
                  <Badge variant="outline" className={cn("text-xs h-5", getBadgeClasses('incident', 'CONTAINED'))}>
                    {summary.containedCount} Contained
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Quick Stats */}
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Last updated: {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</span>
            </div>
            <div>
              {incidentTypeSummaries.length} type{incidentTypeSummaries.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        </CardContent>
      )}
    </Card>
  );
}

export default IncidentsOverview;