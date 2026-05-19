'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIncidents } from '@/hooks/useIncidents'
import { useIncidentAssessmentSummary } from '@/hooks/useIncidentDetails'
import type { 
  EntityIncidentRelationship,
  RelationshipQueryParams 
} from '@/types/assessment-relationships';
import type { Priority, AssessmentType } from '@prisma/client';

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
  const PRIORITY_COLORS = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c', 
    MEDIUM: '#ca8a04',
    LOW: '#16a34a',
  } as const;

  const PRIORITY_STYLES = {
    CRITICAL: 'bg-red-100 text-red-800 border-red-300',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    LOW: 'bg-green-100 text-green-800 border-green-300',
  } as const;

  if (incidentsLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="animate-pulse text-muted-foreground">Loading incidents...</div>
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
          <p className="text-muted-foreground mt-1">
            Interactive visualization showing entity-incident relationships and assessment data
          </p>
        </div>
        <Badge variant="outline">
          {incidents.length} incidents
        </Badge>
      </div>

      {/* Incident Selection and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Incident Selection & Filters
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Incident Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Incident:</label>
              <Select value={selectedIncidentId} onValueChange={handleIncidentChange}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select an incident" />
                </SelectTrigger>
                <SelectContent>
                  {incidents.map((incident) => (
                    <SelectItem key={incident.id} value={incident.id}>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={PRIORITY_STYLES[incident.severity as keyof typeof PRIORITY_STYLES]}
                        >
                          {incident.type}
                        </Badge>
                        <span>{incident.description.substring(0, 40)}...</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filters */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Priority</span>
              </div>
              <div className="flex flex-wrap gap-1">
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
                    className={`text-xs ${
                      priority === 'CRITICAL' ? 'border-red-200 hover:bg-red-50' :
                      priority === 'HIGH' ? 'border-orange-200 hover:bg-orange-50' :
                      priority === 'MEDIUM' ? 'border-yellow-200 hover:bg-yellow-50' :
                      'border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {priority.charAt(0) + priority.slice(1).toLowerCase()}
                  </Button>
                ))}
              </div>
            </div>

  
            {/* Filter Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Active Filters</span>
                {(selectedPriorities.length > 0 || dateRange.start) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handlePriorityFilterChange([]);
                      handleDateRangeChange(null, null);
                    }}
                    className="text-xs flex items-center gap-1 h-6 px-2"
                  >
                    <X className="h-3 w-3" />
                    Clear All
                  </Button>
                )}
              </div>
              
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                  {selectedPriorities.length} priority
                </span>
                {dateRange.start && (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    date range
                  </span>
                )}
              </div>
            </div>

            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Date Range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  onSelect={(range) => {
                    handleDateRangeChange(range?.from || null, range?.to || null);
                  }}
                />
              </PopoverContent>
            </Popover>

            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                window.location.reload();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected Incident Info */}
          {selectedIncident && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedIncident.type} Incident</h3>
                  <p className="text-sm text-muted-foreground">{selectedIncident.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Location: {selectedIncident.location} | 
                    Created: {format(new Date(selectedIncident.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={PRIORITY_STYLES[selectedIncident.severity as keyof typeof PRIORITY_STYLES]}
                >
                  {selectedIncident.severity}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incident Overview Cards */}
      {selectedIncident && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                  <p className="text-2xl font-bold">
                    {summaryLoading ? '...' : assessmentSummary?.totalAssessments || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Affected Entities</p>
                  <p className="text-2xl font-bold">
                    {summaryLoading ? '...' : assessmentSummary?.totalEntities || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical Priority</p>
                  <p className="text-2xl font-bold">
                    {summaryLoading ? '...' : assessmentSummary?.priorityDistribution?.CRITICAL || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

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
        </div>
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