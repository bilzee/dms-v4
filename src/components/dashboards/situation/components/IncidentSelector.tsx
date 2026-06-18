'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getBadgeClasses } from '@/components/shared/StatusBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Loader2, AlertCircle, History, Check, ChevronsUpDown } from '@/lib/icons';
import { useIncidentSelection, useIncidentActions } from '@/stores/dashboardLayout.store';

// Types for incident selector
interface IncidentOption {
  id: string;
  type: string;
  subType: string;
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  location: string;
  description: string;
}

interface IncidentSelectorProps {
  selectedIncidentId?: string;
  onIncidentChange: (incidentId: string) => void;
  includeHistorical?: boolean;
  className?: string;
}

// Status badge variants
const statusVariants = {
  ACTIVE: 'destructive',
  CONTAINED: 'secondary', 
  RESOLVED: 'default'
} as const;

// Severity badge variants
const severityVariants = {
  CRITICAL: 'destructive',
  HIGH: 'secondary',
  MEDIUM: 'outline',
  LOW: 'outline'
} as const;

// Note: severity badges now use getBadgeClasses for consistent design system colors

// Fetch incidents from dashboard API
const fetchIncidents = async (includeHistorical = false): Promise<IncidentOption[]> => {
  const params = new URLSearchParams({
    includeHistorical: includeHistorical.toString(),
    limit: '50'
  });

  const response = await apiGet(`/api/v1/dashboard/situation?${params}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch incidents');
  }

  return response.data.incidents.map((incident: any) => ({
    id: incident.id,
    type: incident.type,
    subType: incident.subType,
    status: incident.status,
    severity: incident.severity,
    createdAt: incident.createdAt,
    location: incident.location,
    description: incident.description
  }));
};

/**
 * IncidentSelector Component
 * 
 * Provides dropdown functionality for selecting incidents with:
 * - Real-time incident fetching with filtering
 * - Status and severity indicators
 * - Historical incident access
 * - Loading and error states
 * - Integration with dashboard state management
 */
export function IncidentSelector({
  selectedIncidentId,
  onIncidentChange,
  includeHistorical = false,
  className
}: IncidentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { incidentHistory } = useIncidentSelection();
  const { setSelectedIncident } = useIncidentActions();

  // Fetch incidents data
  const {
    data: incidents = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['incidents', includeHistorical],
    queryFn: () => fetchIncidents(includeHistorical),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Filter incidents based on search query
  const filteredIncidents = useMemo(() => {
    if (!searchQuery.trim()) return incidents;
    
    const query = searchQuery.toLowerCase();
    return incidents.filter(incident => 
      incident.type.toLowerCase().includes(query) ||
      incident.subType.toLowerCase().includes(query) ||
      incident.location.toLowerCase().includes(query) ||
      incident.description.toLowerCase().includes(query) ||
      incident.status.toLowerCase().includes(query) ||
      incident.severity.toLowerCase().includes(query)
    );
  }, [incidents, searchQuery]);

  // Group filtered incidents by status for better organization
  const groupedIncidents = useMemo(() => {
    const groups = {
      active: filteredIncidents.filter(i => i.status === 'ACTIVE'),
      contained: filteredIncidents.filter(i => i.status === 'CONTAINED'),
      resolved: filteredIncidents.filter(i => i.status === 'RESOLVED')
    };
    return groups;
  }, [filteredIncidents]);

  // Get recently selected incidents from history
  const recentIncidents = useMemo(() => {
    return incidentHistory
      .map(id => filteredIncidents.find(i => i.id === id))
      .filter(Boolean) as IncidentOption[];
  }, [incidentHistory, filteredIncidents]);

  // Handle incident selection
  const handleIncidentChange = (incidentId: string) => {
    setSelectedIncident(incidentId);
    onIncidentChange(incidentId);
    setIsOpen(false);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedIncident(null);
    onIncidentChange('');
    setIsOpen(false);
  };

  // Get selected incident details
  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 p-3 border border-red-200 bg-red-50 rounded-md", className)}>
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-700">Failed to load incidents</span>
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
          Incident Selection
        </label>
        {incidentHistory.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <History className="h-3 w-3" />
            <span>{incidentHistory.length} recent</span>
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
                <span>Loading incidents...</span>
              </div>
            ) : selectedIncident ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedIncident.type}</span>
                  {selectedIncident.subType && (
                    <span className="text-muted-foreground text-sm">- {selectedIncident.subType}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={statusVariants[selectedIncident.status]} className="text-xs">
                    {selectedIncident.status}
                  </Badge>
                  <Badge variant="outline" className={cn("text-xs", getBadgeClasses('severity', selectedIncident.severity))}>
                    {selectedIncident.severity}
                  </Badge>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Select an incident...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search incidents..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No incidents found matching your search.</CommandEmpty>
              
              {/* Recently selected incidents */}
              {recentIncidents.length > 0 && (
                <CommandGroup heading="Recently Selected">
                  {recentIncidents.map((incident) => (
                    <CommandItem
                      key={incident.id}
                      value={`${incident.type} ${incident.subType} ${incident.location} ${incident.id}`}
                      onSelect={() => handleIncidentChange(incident.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{incident.type}</span>
                          {incident.subType && (
                            <span className="text-muted-foreground text-xs">- {incident.subType}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={statusVariants[incident.status]} className="text-xs">
                            {incident.status}
                          </Badge>
                          {selectedIncidentId === incident.id && (
                            <Check className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Active incidents */}
              {groupedIncidents.active.length > 0 && (
                <CommandGroup heading={`Active Incidents (${groupedIncidents.active.length})`}>
                  {groupedIncidents.active.map((incident) => (
                    <CommandItem
                      key={incident.id}
                      value={`${incident.type} ${incident.subType} ${incident.location} ${incident.id}`}
                      onSelect={() => handleIncidentChange(incident.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{incident.type}</span>
                          {incident.subType && (
                            <span className="text-muted-foreground text-xs">- {incident.subType}</span>
                          )}
                          <span className="text-muted-foreground text-xs truncate ml-2">
                            {incident.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={cn("text-xs", getBadgeClasses('severity', incident.severity))}>
                            {incident.severity}
                          </Badge>
                          {selectedIncidentId === incident.id && (
                            <Check className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Contained incidents */}
              {includeHistorical && groupedIncidents.contained.length > 0 && (
                <CommandGroup heading={`Contained Incidents (${groupedIncidents.contained.length})`}>
                  {groupedIncidents.contained.map((incident) => (
                    <CommandItem
                      key={incident.id}
                      value={`${incident.type} ${incident.subType} ${incident.location} ${incident.id}`}
                      onSelect={() => handleIncidentChange(incident.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{incident.type}</span>
                          {incident.subType && (
                            <span className="text-muted-foreground text-xs">- {incident.subType}</span>
                          )}
                          <span className="text-muted-foreground text-xs truncate ml-2">
                            {incident.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={cn("text-xs", getBadgeClasses('severity', incident.severity))}>
                            {incident.severity}
                          </Badge>
                          {selectedIncidentId === incident.id && (
                            <Check className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Resolved incidents */}
              {includeHistorical && groupedIncidents.resolved.length > 0 && (
                <CommandGroup heading={`Resolved Incidents (${groupedIncidents.resolved.length})`}>
                  {groupedIncidents.resolved.map((incident) => (
                    <CommandItem
                      key={incident.id}
                      value={`${incident.type} ${incident.subType} ${incident.location} ${incident.id}`}
                      onSelect={() => handleIncidentChange(incident.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{incident.type}</span>
                          {incident.subType && (
                            <span className="text-muted-foreground text-xs">- {incident.subType}</span>
                          )}
                          <span className="text-muted-foreground text-xs truncate ml-2">
                            {incident.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            RESOLVED
                          </Badge>
                          {selectedIncidentId === incident.id && (
                            <Check className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Clear selection option */}
              {selectedIncidentId && (
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

      {/* Selected incident details */}
      {selectedIncident && (
        <div className="mt-2 p-2 bg-muted rounded-md text-xs text-muted-foreground">
          <div className="line-clamp-2">{selectedIncident.description}</div>
          <div className="mt-1 text-muted-foreground">
            Location: {selectedIncident.location}
          </div>
        </div>
      )}
    </div>
  );
}

export default IncidentSelector;