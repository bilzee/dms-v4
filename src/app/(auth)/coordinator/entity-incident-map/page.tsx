'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  MapPin, 
  TrendingUp, 
  AlertTriangle, 
  Filter, 
  CalendarIcon,
  Network,
  Activity,
  RefreshCw,
  FileText,
  Users,
  X,
  ChevronDown,
  ChevronRight,
  RotateCcw
} from '@/lib/icons';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIncidents } from '@/hooks/useIncidents'
import { useIncidentAssessmentSummary } from '@/hooks/useIncidentDetails'
import type { 
  EntityIncidentRelationship,
  RelationshipQueryParams 
} from '@/types/assessment-relationships';
import type { Priority, AssessmentType } from '@prisma/client';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';

// Dynamic imports for client-side only components
const AssessmentRelationshipMap = dynamic(
  () => import('@/components/coordinator/AssessmentRelationshipMap').then(mod => ({ default: mod.AssessmentRelationshipMap })),
  { 
    ssr: false,
    loading: () => <div className="h-96 w-full flex items-center justify-center bg-muted rounded-lg">Loading map...</div>
  }
);

const AssessmentTimeline = dynamic(
  () => import('@/components/coordinator/AssessmentTimeline').then(mod => ({ default: mod.AssessmentTimeline })),
  { 
    ssr: false,
    loading: () => <div className="h-64 w-full flex items-center justify-center bg-muted rounded-lg">Loading timeline...</div>
  }
);

export default function EntityIncidentMapPage() {
  // State management
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Fetch all incidents for dropdown
  const { data: incidents, isLoading: incidentsLoading } = useIncidents({ status: 'ALL', limit: 100 });

  // Set default incident when incidents are loaded
  useEffect(() => {
    if (incidents && incidents.length > 0 && !selectedIncidentId) {
      // Select the first incident by default
      setSelectedIncidentId(incidents[0].id);
    }
  }, [incidents, selectedIncidentId]);

  // Get selected incident details and assessment summary
  const selectedIncident = incidents?.find(inc => inc.id === selectedIncidentId);

  // Get assessment summary for selected incident
  const { data: assessmentSummary, isLoading: summaryLoading } = useIncidentAssessmentSummary(selectedIncidentId);

  // Query parameters
  const queryParams: RelationshipQueryParams = useMemo(() => ({
    incidentId: selectedIncidentId || undefined,
    priorityFilter: selectedPriorities.length > 0 ? selectedPriorities : undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
  }), [selectedIncidentId, selectedPriorities, dateRange]);

  // Filter handlers
  const handleIncidentChange = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
  };

  const handlePriorityFilterChange = (priorities: string[]) => {
    setSelectedPriorities(priorities as Priority[]);
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
  };

  // Priority styling and colors
  const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c', 
    MEDIUM: '#ca8a04',
    LOW: '#16a34a',
    UNCLASSIFIED: '#9ca3af',
  };

  if (incidentsLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <ContentSkeleton variant="card" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!incidents || incidents.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Incidents Available</h3>
              <p className="text-muted-foreground">Create incidents to see their entity relationships on the map.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Entity-Incident Relationship Map</h1>
          <p className="text-muted-foreground mt-1 hidden sm:block">
            Interactive visualization showing entity-incident relationships and assessment data
          </p>
        </div>
        <Badge variant="outline">
          {incidents.length} incidents
        </Badge>
      </div>

      {/* Incident Selection and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Incident Selection & Filters
              </CardTitle>
              <CardDescription className="mt-1">
                Choose an incident to visualize entity relationships
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Active filter summary pills */}
              {(selectedPriorities.length > 0 || dateRange.start) && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <Filter className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs text-blue-700">
                    {selectedPriorities.length > 0 && `${selectedPriorities.length} priority`}
                    {selectedPriorities.length > 0 && dateRange.start && ', '}
                    {dateRange.start && 'date range'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handlePriorityFilterChange([]);
                      handleDateRangeChange(null, null);
                    }}
                    className="h-5 w-5 p-0 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  window.location.reload();
                }}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Primary filter row - Incident selector */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5 text-muted-foreground" />
                Incident
              </Label>
              <Select value={selectedIncidentId} onValueChange={handleIncidentChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an incident" />
                </SelectTrigger>
                <SelectContent>
                  {incidents.map((incident) => (
                    <SelectItem key={incident.id} value={incident.id}>
                      <div className="flex items-center gap-2">
                        <StatusBadge 
                          status={incident.severity} 
                          domain="severity" 
                          label={incident.type} 
                        />
                        <span className="truncate max-w-[280px]">{incident.description.substring(0, 50)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="gap-1.5 h-10"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {(selectedPriorities.length > 0 || dateRange.start) && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {selectedPriorities.length + (dateRange.start ? 1 : 0)}
                </Badge>
              )}
              {filtersExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Collapsible advanced filters */}
          {filtersExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/30">
              {/* Priority Filter Group */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
                    Priority Level
                  </Label>
                  {selectedPriorities.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePriorityFilterChange([])}
                      className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((priority) => (
                    <Button
                      key={priority}
                      variant={selectedPriorities.includes(priority) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newPriorities = selectedPriorities.includes(priority)
                          ? selectedPriorities.filter(p => p !== priority)
                          : [...selectedPriorities, priority];
                        handlePriorityFilterChange(newPriorities);
                      }}
                      className={cn(
                        "text-xs gap-1.5",
                        selectedPriorities.includes(priority) && priority === 'CRITICAL' && "bg-red-600 hover:bg-red-700",
                        selectedPriorities.includes(priority) && priority === 'HIGH' && "bg-orange-600 hover:bg-orange-700",
                        selectedPriorities.includes(priority) && priority === 'MEDIUM' && "bg-yellow-600 hover:bg-yellow-700",
                        selectedPriorities.includes(priority) && priority === 'LOW' && "bg-green-600 hover:bg-green-700",
                        !selectedPriorities.includes(priority) && priority === 'CRITICAL' && "border-red-200 text-red-700 hover:bg-red-50",
                        !selectedPriorities.includes(priority) && priority === 'HIGH' && "border-orange-200 text-orange-700 hover:bg-orange-50",
                        !selectedPriorities.includes(priority) && priority === 'MEDIUM' && "border-yellow-200 text-yellow-700 hover:bg-yellow-50",
                        !selectedPriorities.includes(priority) && priority === 'LOW' && "border-green-200 text-green-700 hover:bg-green-50"
                      )}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[priority] }} />
                      {priority.charAt(0) + priority.slice(1).toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date Range Filter Group */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-purple-600" />
                    Date Range
                  </Label>
                  {dateRange.start && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDateRangeChange(null, null)}
                      className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 justify-start text-left font-normal">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {dateRange.start && dateRange.end
                          ? `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd')}`
                          : dateRange.start
                          ? `From ${format(dateRange.start, 'MMM dd')}`
                          : 'Pick a date range'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        numberOfMonths={2}
                        selected={{ from: dateRange.start || undefined, to: dateRange.end || undefined }}
                        onSelect={(range) => {
                          handleDateRangeChange(range?.from || null, range?.to || null);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {dateRange.start && (
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">
                      {Math.ceil(
                        ((dateRange.end || new Date()).getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
                      )}d
                    </Badge>
                  )}
                </div>
              </div>

              {/* Clear all */}
              {(selectedPriorities.length > 0 || dateRange.start) && (
                <div className="md:col-span-2 flex justify-end pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handlePriorityFilterChange([]);
                      handleDateRangeChange(null, null);
                    }}
                    className="gap-1.5"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Selected Incident Info */}
          {selectedIncident && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold flex items-center gap-2">
                    {selectedIncident.type} Incident
                    <StatusBadge 
                      status={selectedIncident.severity} 
                      domain="severity" 
                    />
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{selectedIncident.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedIncident.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(selectedIncident.createdAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incident Overview Cards */}
      {selectedIncident && (
        <StatCardGrid columns={4}>
          <StatCard
            label="Total Assessments"
            value={summaryLoading ? '...' : assessmentSummary?.totalAssessments || 0}
            severity="info"
            icon={FileText}
            loading={summaryLoading}
          />
          <StatCard
            label="Affected Entities"
            value={summaryLoading ? '...' : assessmentSummary?.totalEntities || 0}
            severity="warning"
            icon={Users}
            loading={summaryLoading}
          />
          <StatCard
            label="Critical Priority"
            value={summaryLoading ? '...' : assessmentSummary?.priorityDistribution?.CRITICAL || 0}
            severity="critical"
            icon={AlertTriangle}
            loading={summaryLoading}
          />
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{selectedIncident.location}</p>
                </div>
                <MapPin className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Created {format(new Date(selectedIncident.createdAt), 'MMM dd, yyyy')}
              </p>
            </CardContent>
          </Card>
        </StatCardGrid>
      )}

      {/* Assessment Visualization Tabs */}
      {selectedIncident && (
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Relationship Map
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Assessment Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            <AssessmentRelationshipMap 
              incidentId={selectedIncidentId}
              showTimeline={true}
              priorityFilter={selectedPriorities}
              onEntitySelect={(entityId) => {
                console.log('Selected entity:', entityId);
              }}
              onIncidentSelect={(incidentId) => {
                setSelectedIncidentId(incidentId);
              }}
              onAssessmentSelect={(assessmentId) => {
                console.log('Selected assessment:', assessmentId);
              }}
            />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <AssessmentTimeline
              incidentId={selectedIncidentId}
              showVerificationStatus={true}
              maxItems={100}
              onAssessmentClick={(assessmentId) => {
                console.log('Assessment clicked:', assessmentId);
              }}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}