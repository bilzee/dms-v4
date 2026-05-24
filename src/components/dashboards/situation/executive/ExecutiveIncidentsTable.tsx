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
  Loader2
} from 'lucide-react';

// Types
interface ExecutiveIncidentsTableProps {
  selectedIncidentId?: string;
  onIncidentSelect?: (incidentId: string) => void;
  className?: string;
}

interface Incident {
  id: string;
  name: string;
  type: string;
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  location?: string;
}

interface DashboardData {
  incidents: Incident[];
}

// Incident type configuration with icons
const incidentTypeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>, color: string, label: string }> = {
  'FLOOD': { icon: Waves, color: 'text-blue-600', label: 'Flood' },
  'DROUGHT': { icon: Sun, color: 'text-orange-600', label: 'Drought' },
  'EARTHQUAKE': { icon: Mountain, color: 'text-gray-600', label: 'Earthquake' },
  'WILDFIRE': { icon: Flame, color: 'text-red-600', label: 'Wildfire' },
  'HURRICANE': { icon: Wind, color: 'text-purple-600', label: 'Hurricane' },
  'TORNADO': { icon: Wind, color: 'text-gray-500', label: 'Tornado' },
  'TSUNAMI': { icon: Waves, color: 'text-blue-800', label: 'Tsunami' },
  'VOLCANIC': { icon: Mountain, color: 'text-red-500', label: 'Volcanic' },
  'CONFLICT': { icon: Users, color: 'text-red-700', label: 'Conflict' },
  'ACCIDENT': { icon: Car, color: 'text-yellow-600', label: 'Accident' },
  'BUILDING_COLLAPSE': { icon: Building, color: 'text-gray-700', label: 'Building Collapse' },
  'POWER_OUTAGE': { icon: Zap, color: 'text-yellow-500', label: 'Power Outage' },
  'OTHER': { icon: AlertTriangle, color: 'text-gray-600', label: 'Other' }
};

/**
 * Get time since incident started
 */
const getTimeSince = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    return '< 1h';
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  
  const diffWeeks = Math.floor(diffDays / 7);
  const remainingDays = diffDays % 7;
  
  if (remainingDays === 0) {
    return `${diffWeeks}w`;
  } else {
    return `${diffWeeks}w ${remainingDays}d`;
  }
};


// Fetch dashboard data for incidents overview
const fetchIncidentsData = async (): Promise<DashboardData> => {
  const params = new URLSearchParams();
  params.append('includeHistorical', 'false'); // Only active/contained for executive view
  params.append('limit', '10'); // Limit for executive table

  const response = await apiGet(`/api/v1/dashboard/situation?${params}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch incidents data');
  }

  return response.data;
};

/**
 * ExecutiveIncidentsTable Component
 * 
 * Displays active and contained incidents in a table format with 5 columns:
 * - Incident Type & Name
 * - Status
 * - Severity 
 * - Duration
 * - Location
 */
export function ExecutiveIncidentsTable({ selectedIncidentId, onIncidentSelect, className }: ExecutiveIncidentsTableProps) {
  // Fetch incidents data
  const {
    data: dashboardData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['executive-incidents-table'],
    queryFn: fetchIncidentsData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle loading state
  if (isLoading) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Active Incidents Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Loading incidents overview...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error || !dashboardData) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Active Incidents Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load incidents overview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process incidents data
  const incidents = dashboardData.incidents || [];
  
  // Filter active and contained incidents
  const activeContainedIncidents = incidents.filter(incident => 
    incident.status === 'ACTIVE' || incident.status === 'CONTAINED'
  );

  // No active/contained incidents
  if (activeContainedIncidents.length === 0) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Active Incidents Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-green-600">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No Active Incidents</p>
            <p className="text-xs text-gray-500 mt-1">All incidents have been resolved</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            Active Incidents Overview
            <Badge variant="secondary">
              {activeContainedIncidents.length} total
            </Badge>
          </div>
          <div className="text-xs text-gray-500 font-normal">
            Click to select incident
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-5 gap-3">
          {activeContainedIncidents.map((incident) => {
            const config = incidentTypeConfig[incident.type.toUpperCase()] || incidentTypeConfig.OTHER;
            const Icon = config.icon;
            const statusClasses = getBadgeClasses('incident', incident.status);
            const severityClasses = getBadgeClasses('severity', incident.severity);
            const isSelected = selectedIncidentId === incident.id;
            
            return (
              <div 
                key={incident.id} 
                className={cn(
                  "p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:border-blue-300",
                  isSelected 
                    ? "border-blue-500 bg-blue-50 shadow-md" 
                    : "border-gray-200 bg-white hover:shadow-sm"
                )}
                onClick={() => onIncidentSelect?.(incident.id)}
              >
                {/* Incident Header */}
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={cn("h-4 w-4 flex-shrink-0", config.color)} />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="text-xs text-gray-500">{config.label}</div>
                    <Badge 
                      variant="outline"
                      className={cn("text-xs", severityClasses)}
                    >
                      {incident.severity}
                    </Badge>
                  </div>
                </div>
                
                {/* Incident Name */}
                <div className="mb-3">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {incident.name || `${config.label} Event ${incident.id.slice(-3)}`}
                  </div>
                </div>

                {/* Status */}
                <div className="mb-3">
                  <Badge 
                    variant="outline"
                    className={cn("text-xs w-full justify-center", statusClasses)}
                  >
                    {incident.status}
                  </Badge>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-center gap-1 mb-2 text-sm text-gray-600">
                  <Clock className="h-3 w-3" />
                  <span className="font-bold">{getTimeSince(incident.createdAt)}</span>
                </div>

                {/* Location */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 truncate">
                    {incident.location || 'Not specified'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default ExecutiveIncidentsTable;