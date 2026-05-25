'use client';

/**
 * Assessment Relationship Map Component
 * 
 * Interactive map visualization showing entity-incident relationships through assessments.
 * Features priority-based color coding, assessment type filtering, timeline controls,
 * and cluster visualization for performance with large datasets.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, LayerGroup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, MapPin, TrendingUp, AlertTriangle, Maximize2, Minimize2, X } from '@/lib/icons';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { 
  EntityIncidentRelationship,
  RelationshipQueryParams 
} from '@/types/assessment-relationships';
import type { Priority, AssessmentType } from '@prisma/client';
import { useEntityActions } from '@/stores/dashboardLayout.store';
import { useEntityAssessments, useRelationshipStatistics, useRelationships as useRelationshipsHook } from '@/hooks/useRelationships';
import { apiGet } from '@/lib/api';
import { getAuthToken } from '@/lib/auth/token-utils';

// Fix Leaflet default markers
import L from 'leaflet';

// Fix default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface AssessmentRelationshipMapProps {
  incidentId?: string;
  entityId?: string;
  showTimeline?: boolean;
  priorityFilter?: Priority[];
  onEntitySelect?: (entityId: string) => void;
  onIncidentSelect?: (incidentId: string) => void;
  onAssessmentSelect?: (assessmentId: string) => void;
  className?: string;
}

// Entity Severity color mapping
const ENTITY_SEVERITY_COLORS = {
  CRITICAL: '#dc2626', // red-600
  HIGH: '#ea580c',     // orange-600
  MEDIUM: '#ca8a04',   // yellow-600
  LOW: '#16a34a',      // green-600
} as const;

// Assessment type icons/symbols
const ASSESSMENT_TYPE_SYMBOLS = {
  HEALTH: '⚕️',
  WASH: '💧',
  SHELTER: '🏠',
  FOOD: '🍽️',
  SECURITY: '🛡️',
  POPULATION: '👥',
} as const;

export function AssessmentRelationshipMap({
  incidentId,
  entityId,
  showTimeline = true,
  priorityFilter = [],
  onEntitySelect,
  onIncidentSelect,
  onAssessmentSelect,
  className,
}: AssessmentRelationshipMapProps) {
  // State management
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>(priorityFilter);
  const [selectedAssessmentTypes, setSelectedAssessmentTypes] = useState<AssessmentType[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [zoomLevel, setZoomLevel] = useState(10);
  const [mapCenter, setMapCenter] = useState<[number, number]>([11.8311, 13.1511]); // Maiduguri center
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapPosition, setMapPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  
  // Entity selection actions for dropdown integration
  const { setSelectedEntity } = useEntityActions();

  // Maximize/minimize handlers
  const handleMaximize = () => {
    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      setMapPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
    setIsMaximized(true);
    // Prevent body scroll when overlay is active
    document.body.style.overflow = 'hidden';
  };

  const handleMinimize = () => {
    setIsMaximized(false);
    // Restore body scroll
    document.body.style.overflow = '';
  };

  // Cleanup effect to restore body scroll on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Keyboard shortcut effect for Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMaximized) {
        handleMinimize();
      }
    };

    if (isMaximized) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isMaximized]);

  // Effect to handle map resize when maximized state changes
  useEffect(() => {
    // Small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      // Trigger Leaflet resize event if map exists
      window.dispatchEvent(new Event('resize'));
    }, 100);

    return () => clearTimeout(timer);
  }, [isMaximized]);

  // Effect to handle hover state management between original and overlay maps
  useEffect(() => {
    // When maximizing, clear any existing hover to prevent state conflicts
    if (isMaximized) {
      setHoveredEntityId(null);
    }
  }, [isMaximized]);

  // Synchronize filter state with props
  useEffect(() => {
    setSelectedPriorities(priorityFilter);
  }, [priorityFilter]);

  // Query parameters
  const queryParams: RelationshipQueryParams = useMemo(() => ({
    incidentId,
    entityId,
    priorityFilter: selectedPriorities.length > 0 ? selectedPriorities : undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
  }), [incidentId, entityId, selectedPriorities, dateRange]);

  // Fetch latest assessments for hovered entity (for details panel)
  const { data: entityAssessments, isLoading: assessmentsLoading } = useEntityAssessments(hoveredEntityId);

  const relStatsParams: Record<string, string> = {};
  if (queryParams.incidentId) relStatsParams.incidentId = queryParams.incidentId;
  if (queryParams.entityId) relStatsParams.entityId = queryParams.entityId;
  if (queryParams.priorityFilter) relStatsParams.priorityFilter = queryParams.priorityFilter.join(',');
  if (queryParams.startDate) relStatsParams.startDate = queryParams.startDate.toISOString();
  if (queryParams.endDate) relStatsParams.endDate = queryParams.endDate.toISOString();

  const { data: relationships, isLoading, error } = useRelationshipStatistics(relStatsParams);

  // Fetch detailed relationship data for map markers (without server-side filtering)
  const { data: detailedRelationships } = useQuery({
    queryKey: ['detailed-relationships', incidentId],
    queryFn: async () => {
      if (incidentId) {
        const result = await apiGet(`/api/v1/dashboard/situation?incidentId=${incidentId}&includeEntityAssessments=true`)

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch entities')
        }

        console.log('Dashboard API response:', result.data);
        console.log('Number of entities received:', result.data?.entityAssessments?.length || 0);
        
        // Use entityAssessments from dashboard API (same as EntitySelector)
        if (result.data.entityAssessments) {
          return result.data.entityAssessments.map((entity: any) => ({
            entityId: entity.id,
            incidentId: incidentId,
            entity: entity,
            incident: { id: incidentId }, // Will be populated from context
            assessments: [],
            priorityDistribution: entity.priorityDistribution || {
              CRITICAL: 0,
              HIGH: 0,
              MEDIUM: 0,
              LOW: 0,
            },
            latestAssessment: { id: `assessment-${entity.id}` }, // Placeholder
            totalAssessments: entity.assessmentCount || 0,
            firstAssessmentDate: new Date(),
            lastAssessmentDate: new Date(),
          }));
        } else {
          // Fallback to entities if entityAssessments not available
          return result.data.entities?.map((entity: any) => ({
            entityId: entity.entityId,
            incidentId: incidentId,
            entity: {
              ...entity,
              severity: entity.gapSummary?.criticalGaps > 0 ? 'CRITICAL' : 
                       entity.gapSummary?.totalGaps > 0 ? 'HIGH' : 'LOW',
            },
            incident: { id: incidentId },
            assessments: [],
            priorityDistribution: {
              CRITICAL: 0,
              HIGH: 0,
              MEDIUM: 0,
              LOW: 0,
            },
            latestAssessment: { id: `assessment-${entity.entityId}` },
            totalAssessments: 0,
            firstAssessmentDate: new Date(),
            lastAssessmentDate: new Date(),
          })) || [];
        }
      } else {
        // Get comprehensive relationships (no filters)
        const result = await apiGet('/api/v1/relationships')
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch relationship data')
        }
        return result.data as EntityIncidentRelationship[]
      }
    },
    enabled: !!getAuthToken() && !!incidentId,
  });

  // Client-side filtering of relationships based on selected filters
  const filteredRelationships = useMemo(() => {
    if (!detailedRelationships) return [];
    
    return detailedRelationships.filter((relationship: any) => {
      const entity = relationship.entity;
      
      // Priority/Severity filtering only
      if (selectedPriorities.length > 0) {
        const entitySeverity = entity.severity || entity.gapSummary?.overallPriority || 'LOW';
        if (!selectedPriorities.includes(entitySeverity as Priority)) {
          return false;
        }
      }
      
      return true;
    });
  }, [detailedRelationships, selectedPriorities]);

  // Get hovered entity data from the same source as the map (dashboard API)
  const hoveredEntity = useMemo(() => {
    if (!hoveredEntityId || !detailedRelationships) return null;
    
    const relationship = detailedRelationships.find((rel: any) => rel.entityId === hoveredEntityId);
    return relationship?.entity || null;
  }, [hoveredEntityId, detailedRelationships]);

  // Filter handlers
  const handlePriorityFilterChange = (priorities: string[]) => {
    setSelectedPriorities(priorities as Priority[]);
  };

  const handleAssessmentTypeFilterChange = (types: string[]) => {
    setSelectedAssessmentTypes(types as AssessmentType[]);
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
  };

  // Map marker creation
  const createMarkerForRelationship = (relationship: EntityIncidentRelationship) => {
    const entity = relationship.entity;
    const coordinates = entity.coordinates as any;
    
    // console.log('Creating marker for entity:', entity.name, 'coordinates:', coordinates);
    
    if (!coordinates?.lat || !coordinates?.lng) {
      // console.log('No valid coordinates for entity:', entity.name);
      return null;
    }

    // Use Entity Severity only - no fallback colors
    const entitySeverity = null; // Entity model doesn't have severity field
    const markerColor = null;

    console.log(`Creating CircleMarker at [${coordinates.lat}, ${coordinates.lng}] with severity ${entitySeverity || 'no severity'} for ${entity.name}`);
    console.log('Entity severity:', entitySeverity);
    console.log('Marker color:', markerColor);

    // Always render marker, but with transparent fill if no severity

    return (
      <CircleMarker
        key={`${relationship.entityId}-${relationship.incidentId}`}
        center={[coordinates.lat, coordinates.lng]}
        radius={12}
        pathOptions={{
          fillColor: markerColor || '#9ca3af',
          color: '#666666', // Gray border for entities without severity
          weight: 3,
          opacity: 1,
          fillOpacity: markerColor ? 0.8 : 0, // Transparent fill if no severity
        }}
        eventHandlers={{
          mouseover: () => {
            // Show details in left panel on hover
            setHoveredEntityId(relationship.entityId);
          },
          mouseout: () => {
            // Hide details when not hovering
            setHoveredEntityId(null);
          },
          click: () => {
            // console.log(`Clicked on entity: ${entity.name}`);
            setSelectedEntityId(relationship.entityId);
            
            // Update the dropdown selection in the EntitySelector
            setSelectedEntity(relationship.entityId);
            
            // Call the callback props for any external handling
            onEntitySelect?.(relationship.entityId);
            onIncidentSelect?.(relationship.incidentId);
          },
        }}
      />
    );
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full h-80", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground">Loading relationship map...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full h-80", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-destructive">Failed to load relationship data</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className={cn("w-full", className)}>
        <Card ref={mapRef} className="w-full">
          <CardContent className="p-4">
            <div className="w-full flex gap-4 h-80">
            {/* Left Panel: Entity Details (30% width) */}
            <div className="flex-[3] flex flex-col">
              {hoveredEntityId ? (
                <Card className="h-full border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5" />
                      Entity Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto">
                    {assessmentsLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-pulse text-muted-foreground">Loading entity details...</div>
                      </div>
                    ) : hoveredEntity ? (
                      <div className="space-y-4">
                        {/* Entity Info */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">{hoveredEntity.name}</h3>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Type:</span>
                              <Badge variant="outline">{hoveredEntity.type}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Location:</span>
                              <span className="font-medium">{hoveredEntity.location || hoveredEntity.area || hoveredEntity.zone || 'Not specified'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Severity:</span>
                              <Badge 
                                variant="outline"
                                style={{ 
                                  backgroundColor: hoveredEntity.severity ? ENTITY_SEVERITY_COLORS[hoveredEntity.severity as keyof typeof ENTITY_SEVERITY_COLORS] : '#e5e7eb',
                                  color: hoveredEntity.severity ? 'white' : '#374151'
                                }}
                              >
                                {hoveredEntity.severity || 'Not Assessed'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Affected Date:</span>
                              <span className="font-medium">
                                {hoveredEntity.affectedAt 
                                  ? new Date(hoveredEntity.affectedAt).toLocaleDateString()
                                  : hoveredEntity.lastUpdated 
                                    ? new Date(hoveredEntity.lastUpdated).toLocaleDateString()
                                    : hoveredEntity.createdAt 
                                      ? new Date(hoveredEntity.createdAt).toLocaleDateString()
                                      : 'Not specified'
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Assessment Types Available */}
                        {entityAssessments.data.latestAssessments?.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Available Assessment Types:</h4>
                            <div className="flex flex-wrap gap-1">
                              {entityAssessments.data.latestAssessments.map((assessment: any) => (
                                <Badge key={assessment.type} variant="secondary" className="text-xs">
                                  {assessment.type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Verified Responses */}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Verified Responses:</span>
                          <span className="font-medium">
                            {entityAssessments.data.entity.verifiedResponses || entityAssessments.data.entity.responseCount || 0}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center h-full flex items-center justify-center">
                        <div className="text-muted-foreground">No details available</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full border-2 border-dashed">
                  <CardContent className="h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Hover over an entity on the map</p>
                      <p className="text-xs">to view detailed information</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Panel: Leaflet Map (70% width) */}
            <div className="flex-[7] relative">
              <div className="h-full w-full border-2 border-border rounded-lg overflow-hidden">
                <MapContainer
                  center={mapCenter}
                  zoom={zoomLevel}
                  style={{ height: '100%', width: '100%' }}
                  className="z-10"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  <LayerGroup>
                    {filteredRelationships?.map(createMarkerForRelationship).filter(Boolean)}
                  </LayerGroup>
                </MapContainer>
                
                {/* Statistics Overlay with Maximize Button */}
                {relationships?.data && (
                  <Card className="absolute top-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="font-medium">{relationships.data.totalEntities}</div>
                            <div className="text-muted-foreground text-xs">Entities</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <div>
                            <div className="font-medium">{relationships.data.totalIncidents}</div>
                            <div className="text-muted-foreground text-xs">Incidents</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Maximize/Minimize Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={isMaximized ? handleMinimize : handleMaximize}
                        className="w-full flex items-center gap-2 text-xs"
                      >
                        {isMaximized ? (
                          <>
                            <Minimize2 className="h-3 w-3" />
                            Minimize Map
                          </>
                        ) : (
                          <>
                            <Maximize2 className="h-3 w-3" />
                            Maximize Map
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
                
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Overlay when maximized - anchored to original position */}
      {isMaximized && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Calculate the position of the original map and create overlay */}
          <div 
            className="absolute bg-card rounded-lg shadow-2xl border-2 border-blue-200 pointer-events-auto"
            style={{
              // Anchor to original map position and expand upward
              bottom: `${window.innerHeight - mapPosition.top - mapPosition.height}px`,
              left: `${mapPosition.left}px`,
              width: `${Math.max(mapPosition.width, 1200)}px`, // Ensure minimum width
              height: '80vh',
              transform: 'none',
            }}
          >
            {/* Header with minimize control */}
            <div className="absolute top-0 left-0 right-0 z-[10001] bg-card/95 backdrop-blur-sm border-b rounded-t-lg">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold">Interactive Assessment Map</h2>
                  {relationships?.data && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{relationships.data.totalEntities} Entities</span>
                      <span>{relationships.data.totalIncidents} Incidents</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMinimize}
                    className="flex items-center gap-2"
                  >
                    <Minimize2 className="h-4 w-4" />
                    Minimize
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMinimize}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Main content area - same structure as original */}
            <div className="absolute inset-0 pt-16 p-4">
              <div className="w-full h-full flex gap-4">
                {/* Left Panel: Entity Details */}
                <div className="flex-[3] flex flex-col">
                  {hoveredEntityId ? (
                    <Card className="h-full border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <TrendingUp className="h-5 w-5" />
                          Entity Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-y-auto">
                        {assessmentsLoading ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="animate-pulse text-muted-foreground">Loading entity details...</div>
                          </div>
                        ) : hoveredEntity ? (
                          <div className="space-y-4">
                            {/* Entity Info - same as original view */}
                            <div className="space-y-2">
                              <h3 className="font-semibold text-lg">{hoveredEntity.name}</h3>
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Type:</span>
                                  <Badge variant="outline">{hoveredEntity.type}</Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Location:</span>
                                  <span className="font-medium">{hoveredEntity.location || hoveredEntity.area || hoveredEntity.zone || 'Not specified'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Severity:</span>
                                  <Badge 
                                    variant="outline"
                                    style={{ 
                                      backgroundColor: hoveredEntity.severity ? ENTITY_SEVERITY_COLORS[hoveredEntity.severity as keyof typeof ENTITY_SEVERITY_COLORS] : '#e5e7eb',
                                      color: hoveredEntity.severity ? 'white' : '#374151'
                                    }}
                                  >
                                    {hoveredEntity.severity || 'Not Assessed'}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Affected Date:</span>
                                  <span className="font-medium">
                                    {hoveredEntity.affectedAt 
                                      ? new Date(hoveredEntity.affectedAt).toLocaleDateString()
                                      : hoveredEntity.lastUpdated 
                                        ? new Date(hoveredEntity.lastUpdated).toLocaleDateString()
                                        : hoveredEntity.createdAt 
                                          ? new Date(hoveredEntity.createdAt).toLocaleDateString()
                                          : 'Not specified'
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Assessment Types Available - same as original view */}
                            {entityAssessments?.data?.latestAssessments?.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Available Assessment Types:</h4>
                                <div className="flex flex-wrap gap-1">
                                  {entityAssessments.data.latestAssessments.map((assessment: any) => (
                                    <Badge key={assessment.type} variant="secondary" className="text-xs">
                                      {assessment.type}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Verified Responses - same as original view */}
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Verified Responses:</span>
                              <span className="font-medium">
                                {entityAssessments?.data?.entity?.verifiedResponses || entityAssessments?.data?.entity?.responseCount || 0}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <p>No entity details available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="h-full border-2 border-dashed">
                      <CardContent className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Hover over an entity on the map</p>
                          <p className="text-xs">to view detailed information</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Panel: Map */}
                <div className="flex-[7] relative">
                  <MapContainer
                    center={mapCenter}
                    zoom={zoomLevel}
                    className="w-full h-full rounded-lg"
                    whenReady={() => {
                      // Map is ready - invalidateSize called automatically
                    }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {/* Map markers */}
                    <LayerGroup>
                      {detailedRelationships?.map(createMarkerForRelationship).filter(Boolean)}
                    </LayerGroup>
                  </MapContainer>
                  
                  {/* Statistics Overlay in maximized view */}
                  {relationships?.data && (
                    <Card className="absolute top-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            <div>
                              <div className="font-medium">{relationships.data.totalEntities}</div>
                              <div className="text-muted-foreground text-xs">Entities</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <div>
                              <div className="font-medium">{relationships.data.totalIncidents}</div>
                              <div className="text-muted-foreground text-xs">Incidents</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}