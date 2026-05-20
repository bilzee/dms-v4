'use client';

/**
 * Assessment Timeline Component
 * 
 * Chronological display of assessment history for entity-incident relationships.
 * Features assessment type and priority visualization, verification status tracking,
 * filtering capabilities, and interactive timeline with zoom and pan.
 */

import React, { useState, useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  MapPin
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
const PRIORITY_STYLES = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200',
} as const;

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
                <Badge 
                  variant="outline" 
                  className={PRIORITY_STYLES[item.assessment.priority]}
                >
                  {item.assessment.priority}
                </Badge>
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

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Assessment Timeline
          <Badge variant="outline">
            {timelineData.length} items
          </Badge>
        </CardTitle>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-4 border rounded-lg bg-gray-50">
          {/* Assessment Type Filter */}
          <div className="space-y-3 p-3 bg-white rounded-md border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <label className="text-sm font-medium text-gray-900">Assessment Types</label>
            </div>
            <div className="grid grid-cols-2 gap-2">
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
          <div className="space-y-3 p-3 bg-white rounded-md border">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <label className="text-sm font-medium text-gray-900">Priority</label>
            </div>
            <div className="space-y-2">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => (
                <div key={priority} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={selectedPriorities.includes(priority as Priority)}
                    onCheckedChange={() => handlePriorityToggle(priority as Priority)}
                  />
                  <label htmlFor={`priority-${priority}`} className="text-sm cursor-pointer">
                    {priority}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Status Filter */}
          {showVerificationStatus && (
            <div className="space-y-3 p-3 bg-white rounded-md border">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <label className="text-sm font-medium text-gray-900">Verification Status</label>
              </div>
              <div className="space-y-2">
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
          <div className="space-y-3 p-3 bg-white rounded-md border">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-purple-600" />
              <label className="text-sm font-medium text-gray-900">Date Range</label>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateRange.start && dateRange.end 
                    ? `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd')}`
                    : 'Select dates'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
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
        </div>
      </CardHeader>

      <CardContent>
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