'use client';

/**
 * Assessment Timeline Component
 * 
 * Chronological display of assessment history for entity-incident relationships.
 * Features assessment type and priority visualization, verification status tracking,
 * filtering capabilities, and interactive timeline with zoom and pan.
 */

import React, { useState, useMemo } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Clock, 
  CalendarIcon, 
  Filter, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  User,
  MapPin,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRelationshipTimeline } from '@/hooks/useRelationships';
import type { Priority, AssessmentType, VerificationStatus } from '@prisma/client';

interface AssessmentTimelineProps {
  entityId?: string;
  incidentId?: string;
  assessmentTypes?: AssessmentType[];
  priorityFilter?: Priority[];
  maxItems?: number;
  showVerificationStatus?: boolean;
  onAssessmentClick?: (assessmentId: string) => void;
  className?: string;
}

// Timeline item interface based on API response
interface TimelineItemData {
  entityId: string;
  incidentId: string;
  assessment: {
    id: string;
    type: AssessmentType;
    priority: Priority;
    date: string;
    verificationStatus: string;
    assessorName: string;
    location?: string;
  };
  entity: {
    id: string;
    name: string;
    type: string;
    location?: string;
  };
  incident: {
    id: string;
    type: string;
    description: string;
    location: string;
    severity: Priority;
    status: string;
  };
}

// Priority and verification status styling

const VERIFICATION_ICONS = {
  DRAFT: AlertCircle,
  SUBMITTED: Clock,
  VERIFIED: CheckCircle,
  AUTO_VERIFIED: CheckCircle,
  REJECTED: XCircle,
} as const;

const VERIFICATION_STYLES = {
  DRAFT: 'text-gray-500',
  SUBMITTED: 'text-blue-500',
  VERIFIED: 'text-green-500',
  AUTO_VERIFIED: 'text-green-600',
  REJECTED: 'text-red-500',
} as const;

const ASSESSMENT_TYPE_COLORS = {
  HEALTH: 'bg-red-50 border-red-200',
  WASH: 'bg-blue-50 border-blue-200',
  SHELTER: 'bg-amber-50 border-amber-200',
  FOOD: 'bg-green-50 border-green-200',
  SECURITY: 'bg-purple-50 border-purple-200',
  POPULATION: 'bg-indigo-50 border-indigo-200',
} as const;

export function AssessmentTimeline({
  entityId,
  incidentId,
  assessmentTypes = [],
  priorityFilter = [],
  maxItems = 50,
  showVerificationStatus = true,
  onAssessmentClick,
  className,
}: AssessmentTimelineProps) {
  // State management
  const [selectedAssessmentTypes, setSelectedAssessmentTypes] = useState<AssessmentType[]>(assessmentTypes);
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>(priorityFilter);
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Query parameters
  const queryParams = useMemo(() => ({
    ...(entityId && { entityId }),
    ...(incidentId && { incidentId }),
    ...(selectedAssessmentTypes.length > 0 && { 
      assessmentTypeFilter: selectedAssessmentTypes.join(',') 
    }),
    ...(selectedPriorities.length > 0 && { 
      priorityFilter: selectedPriorities.join(',') 
    }),
    ...(selectedVerificationStatus.length > 0 && { 
      verificationStatusFilter: selectedVerificationStatus.join(',') 
    }),
    ...(dateRange.start && { startDate: dateRange.start.toISOString() }),
    ...(dateRange.end && { endDate: dateRange.end.toISOString() }),
    limit: maxItems.toString(),
  }), [entityId, incidentId, selectedAssessmentTypes, selectedPriorities, selectedVerificationStatus, dateRange, maxItems]);

  // Fetch timeline data
  const { data, isLoading, error } = useRelationshipTimeline(queryParams);

  // Filter handlers
  const handleAssessmentTypeToggle = (type: AssessmentType) => {
    setSelectedAssessmentTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handlePriorityToggle = (priority: Priority) => {
    setSelectedPriorities(prev => 
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const handleVerificationStatusToggle = (status: string) => {
    setSelectedVerificationStatus(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Timeline item rendering
  const renderTimelineItem = (item: TimelineItemData, index: number) => {
    const VerificationIcon = VERIFICATION_ICONS[item.assessment.verificationStatus as keyof typeof VERIFICATION_ICONS] || AlertCircle;
    
    return (
      <div key={item.assessment.id} className="relative flex gap-4 pb-8 group">
        {/* Timeline line */}
        <div className="relative flex flex-col items-center">
          <div 
            className={cn(
              "w-3 h-3 rounded-full border-2 bg-white z-10",
              ASSESSMENT_TYPE_COLORS[item.assessment.type]
            )}
          />
          {index < (data?.data?.length - 1) && (
            <div className="w-px h-full bg-gray-200 absolute top-3" />
          )}
        </div>

        {/* Timeline content */}
        <Card 
          className={cn(
            "flex-1 cursor-pointer transition-all duration-200 hover:shadow-md",
            ASSESSMENT_TYPE_COLORS[item.assessment.type]
          )}
          onClick={() => onAssessmentClick?.(item.assessment.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <StatusBadge 
                  status={item.assessment.priority} 
                  domain="severity" 
                />
                <Badge variant="outline">
                  {item.assessment.type}
                </Badge>
                {showVerificationStatus && (
                  <div className="flex items-center gap-1">
                    <VerificationIcon 
                      className={cn(
                        "h-4 w-4", 
                        VERIFICATION_STYLES[item.assessment.verificationStatus as keyof typeof VERIFICATION_STYLES]
                      )} 
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.assessment.verificationStatus}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(parseISO(item.assessment.date), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium">{item.entity.name}</div>
              <div className="text-sm text-muted-foreground">{item.incident.type} - {item.incident.description}</div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {item.assessment.assessorName}
                </div>
                {item.assessment.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {item.assessment.location}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-pulse text-muted-foreground">Loading timeline...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-destructive">Failed to load timeline data</div>
        </CardContent>
      </Card>
    );
  }

  const timelineData = data?.data || [];

  // Count active filters for badge
  const activeFilterCount = 
    selectedAssessmentTypes.length + 
    selectedPriorities.length + 
    selectedVerificationStatus.length + 
    (dateRange.start ? 1 : 0);

  const handleClearAllFilters = () => {
    setSelectedAssessmentTypes([]);
    setSelectedPriorities([]);
    setSelectedVerificationStatus([]);
    setDateRange({ start: null, end: null });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Assessment Timeline
            <Badge variant="outline">
              {timelineData.length} items
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <Filter className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs text-blue-700">{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllFilters}
                  className="h-5 w-5 p-0 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
              {filtersExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Collapsible Filters */}
        {filtersExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
            {/* Assessment Type Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  Assessment Types
                </Label>
                {selectedAssessmentTypes.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAssessmentTypes([])}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'].map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={selectedAssessmentTypes.includes(type as AssessmentType)}
                      onCheckedChange={() => handleAssessmentTypeToggle(type as AssessmentType)}
                    />
                    <label htmlFor={`type-${type}`} className="text-xs cursor-pointer">
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                  Priority
                </Label>
                {selectedPriorities.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPriorities([])}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => (
                  <div key={priority} className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${priority}`}
                      checked={selectedPriorities.includes(priority as Priority)}
                      onCheckedChange={() => handlePriorityToggle(priority as Priority)}
                    />
                    <label htmlFor={`priority-${priority}`} className="text-xs cursor-pointer">
                      {priority}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Status Filter */}
            {showVerificationStatus && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    Verification
                  </Label>
                  {selectedVerificationStatus.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedVerificationStatus([])}
                      className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {['DRAFT', 'SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED'].map(status => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={selectedVerificationStatus.includes(status)}
                        onCheckedChange={() => handleVerificationStatusToggle(status)}
                      />
                      <label htmlFor={`status-${status}`} className="text-xs cursor-pointer">
                        {status.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range Filter */}
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
                    onClick={() => setDateRange({ start: null, end: null })}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
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
                      setDateRange({ 
                        start: range?.from || null, 
                        end: range?.to || null 
                      });
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <div className="md:col-span-2 lg:col-span-4 flex justify-end pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllFilters}
                  className="gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        )}
        {timelineData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No assessments found for the selected criteria</p>
          </div>
        ) : (
          <div className="space-y-0">
            {timelineData.map((item: TimelineItemData, index: number) => 
              renderTimelineItem(item, index)
            )}
            
            {data?.pagination?.hasMore && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm">
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}