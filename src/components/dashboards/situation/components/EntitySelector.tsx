'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Loader2, AlertCircle, MapPin, Building2, CheckCircle, AlertTriangle, Info, Check, ChevronsUpDown } from '@/lib/icons';
import { useEntitySelection, useEntityActions } from '@/stores/dashboardLayout.store';
import { useIncidentSelection } from '@/stores/dashboardLayout.store';

// Types for entity selector
interface EntityOption {
  id: string;
  name: string;
  type: 'COMMUNITY' | 'WARD' | 'LGA' | 'STATE' | 'FACILITY' | 'CAMP';
  subType?: string;
  location?: string;
  affectedAt: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  severityCount: number;
}

interface EntitySelectorProps {
  selectedEntityId?: string;
  incidentId: string;
  onEntityChange: (entityId: string) => void;
  includeAllOption?: boolean;
  className?: string;
}

// Entity type icons and labels
const entityTypeConfig = {
  COMMUNITY: { label: 'Community', icon: Building2 },
  WARD: { label: 'Ward', icon: MapPin },
  LGA: { label: 'Local Govt', icon: MapPin },
  STATE: { label: 'State', icon: MapPin },
  FACILITY: { label: 'Facility', icon: Building2 },
  CAMP: { label: 'Camp', icon: Building2 }
} as const;

// Severity configuration for entity badges
const getSeverityConfig = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return {
        badgeClass: 'bg-red-600 text-white border-2 border-red-300 animate-pulse',
        icon: AlertTriangle,
        iconClass: 'text-white'
      };
    case 'HIGH':
      return {
        badgeClass: 'bg-orange-600 text-white border-2 border-orange-300 animate-pulse',
        icon: AlertCircle,
        iconClass: 'text-white'
      };
    case 'MEDIUM':
      return {
        badgeClass: 'bg-yellow-600 text-white border-2 border-yellow-300',
        icon: Info,
        iconClass: 'text-white'
      };
    case 'LOW':
      return {
        badgeClass: 'bg-green-600 text-white border-2 border-green-300',
        icon: CheckCircle,
        iconClass: 'text-white'
      };
    default:
      return {
        badgeClass: 'bg-gray-600 text-white border-2 border-gray-300',
        icon: Info,
        iconClass: 'text-white'
      };
  }
};

// Entity severity badge component
const EntitySeverityBadge = ({ severity, count }: { severity: string; count: number }) => {
  const config = getSeverityConfig(severity);
  const IconComponent = config.icon;
  
  return (
    <Badge 
      variant="default" 
      className={cn("text-xs font-bold flex items-center gap-1", config.badgeClass)}
    >
      <IconComponent className={cn("h-3 w-3", config.iconClass)} />
      {severity}
      {count > 0 && (
        <span className="ml-1 text-xs bg-card/20 px-1 rounded">
          {count}
        </span>
      )}
    </Badge>
  );
};

// Fetch entities from dashboard API with entity assessments
const fetchEntities = async (incidentId: string): Promise<EntityOption[]> => {
  if (!incidentId) {
    return [];
  }

  const response = await apiGet(`/api/v1/dashboard/situation?incidentId=${incidentId}&includeEntityAssessments=true`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch entities');
  }

  // Use entityAssessments if available, otherwise fall back to entities
  if (response.data.entityAssessments) {
    return response.data.entityAssessments.map((entity: any) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      location: entity.location,
      affectedAt: entity.affectedAt,
      severity: entity.severity,
      severityCount: entity.severityCount
    }));
  } else {
    // Fallback to original entities data structure
    return response.data.entities.map((entity: any) => ({
      id: entity.entityId,
      name: entity.entityName,
      type: entity.entityType,
      location: entity.location,
      affectedAt: entity.lastUpdated,
      severity: entity.gapSummary?.criticalGaps > 0 ? 'CRITICAL' : 
               entity.gapSummary?.totalGaps > 0 ? 'HIGH' : 'LOW',
      severityCount: 0 // Not available in old format
    }));
  }
};

/**
 * EntitySelector Component
 * 
 * Provides dropdown functionality for selecting entities with:
 * - Entity fetching filtered by selected incident
 * - "All Entities" as default option for aggregated view
 * - Entity type indicators and severity badges
 * - Loading and error states
 * - Integration with dashboard state management
 */
export function EntitySelector({
  selectedEntityId,
  incidentId,
  onEntityChange,
  includeAllOption = true,
  className
}: EntitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { entityHistory, includeAllEntities } = useEntitySelection();
  const { setSelectedEntity, setIncludeAllEntities } = useEntityActions();

  // Fetch entities data
  const {
    data: entities = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['api-v1-dashboard-situation', incidentId, 'selector'],
    queryFn: () => fetchEntities(incidentId),
    enabled: !!incidentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Filter entities based on search query
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;
    
    const query = searchQuery.toLowerCase();
    return entities.filter(entity => 
      entity.name.toLowerCase().includes(query) ||
      entity.type.toLowerCase().includes(query) ||
      entity.subType?.toLowerCase().includes(query) ||
      entity.location?.toLowerCase().includes(query) ||
      entity.severity.toLowerCase().includes(query)
    );
  }, [entities, searchQuery]);

  // Group filtered entities by type for better organization
  const groupedEntities = useMemo(() => {
    const groups: Record<string, EntityOption[]> = {};
    
    filteredEntities.forEach(entity => {
      if (!groups[entity.type]) {
        groups[entity.type] = [];
      }
      groups[entity.type].push(entity);
    });

    // Sort entities within each group by name
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [filteredEntities]);

  // Get recently selected entities from history
  const recentEntities = useMemo(() => {
    return entityHistory
      .map(id => filteredEntities.find(e => e.id === id))
      .filter(Boolean) as EntityOption[];
  }, [entityHistory, filteredEntities]);

  // Handle entity selection
  const handleEntityChange = (entityId: string) => {
    setSelectedEntity(entityId);
    onEntityChange(entityId);
    setIsOpen(false);
  };

  // Handle "All Entities" selection
  const handleAllEntitiesSelection = () => {
    setIncludeAllEntities(true);
    onEntityChange('all');
    setIsOpen(false);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedEntity(null);
    onEntityChange('');
    setIsOpen(false);
  };

  // Get selected entity details
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  // Show loading state when incident changes
  if (!incidentId) {
    return (
      <div className={cn("p-3 border border-border bg-muted rounded-md", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Select an incident first</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 p-3 border border-red-200 bg-red-50 rounded-md", className)}>
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-700">Failed to load entities</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="ml-auto text-red-700 hover:text-red-800"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">
          Entity Selection
        </label>
        {entityHistory.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{entityHistory.length} recent</span>
          </div>
        )}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between h-auto min-h-[2.5rem] px-3 py-2"
            disabled={isLoading}
          >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading entities...</span>
            </div>
          ) : includeAllEntities ? (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">All Entities</span>
              <span className="text-muted-foreground">({entities.length} total)</span>
            </div>
          ) : selectedEntity ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {React.createElement(entityTypeConfig[selectedEntity.type].icon, {
                  className: "h-4 w-4"
                })}
                <span className="font-medium">{selectedEntity.name}</span>
                <span className="text-muted-foreground text-xs">
                  ({entityTypeConfig[selectedEntity.type].label})
                </span>
              </div>
              <EntitySeverityBadge severity={selectedEntity.severity} count={selectedEntity.severityCount} />
            </div>
          ) : (
            <span>Select an entity...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search entities..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No entities found matching your search.</CommandEmpty>
              
              {/* "All Entities" option */}
              {includeAllOption && (
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={handleAllEntitiesSelection}
                    className="font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>All Entities</span>
                      <span className="text-muted-foreground">({entities.length} total)</span>
                      {includeAllEntities && (
                        <Check className="h-4 w-4 ml-auto" />
                      )}
                    </div>
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Recently selected entities */}
              {recentEntities.length > 0 && (
                <CommandGroup heading="Recently Selected">
                  {recentEntities.map((entity) => (
                    <CommandItem
                      key={entity.id}
                      value={`${entity.name} ${entity.type} ${entity.location} ${entity.id}`}
                      onSelect={() => handleEntityChange(entity.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {React.createElement(entityTypeConfig[entity.type].icon, {
                            className: "h-4 w-4"
                          })}
                          <span className="font-medium">{entity.name}</span>
                          <span className="text-muted-foreground text-xs">
                            ({entityTypeConfig[entity.type].label})
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <EntitySeverityBadge severity={entity.severity} count={entity.severityCount} />
                          {selectedEntityId === entity.id && (
                            <Check className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Entities grouped by type */}
              {Object.entries(groupedEntities).map(([type, typeEntities]) => (
                <CommandGroup key={type} heading={`${entityTypeConfig[type as keyof typeof entityTypeConfig].label} (${typeEntities.length})`}>
                  {typeEntities.map((entity) => (
                    <CommandItem
                      key={entity.id}
                      value={`${entity.name} ${entity.type} ${entity.location} ${entity.id}`}
                      onSelect={() => handleEntityChange(entity.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entity.name}</span>
                          {entity.location && (
                            <span className="text-muted-foreground text-xs truncate ml-2">
                              📍 {entity.location}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <EntitySeverityBadge severity={entity.severity} count={entity.severityCount} />
                          {selectedEntityId === entity.id && (
                            <Check className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}

              {/* Clear selection option */}
              {selectedEntityId && (
                <CommandItem
                  onSelect={handleClearSelection}
                  className="text-center text-red-600"
                >
                  Clear Selection
                </CommandItem>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

    </div>
  );
}

export default EntitySelector;