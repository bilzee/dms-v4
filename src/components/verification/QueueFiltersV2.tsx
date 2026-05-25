'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { FilterPanel } from '@/components/shared/FilterPanel';
import type { 
  FilterPanelProps, 
  FilterGroup, 
  FilterPreset,
  VerificationFilters 
} from '@/types/filters';

interface QueueFiltersV2Props {
  type: 'assessments' | 'responses';
  filters: VerificationFilters;
  onFiltersChange: (filters: Partial<VerificationFilters>) => void;
  onClear: () => void;
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  error?: string;
}

const ASSESSMENT_TYPES = [
  { value: 'HEALTH', label: 'Health' },
  { value: 'WASH', label: 'WASH' },
  { value: 'SHELTER', label: 'Shelter' },
  { value: 'FOOD', label: 'Food Security' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'POPULATION', label: 'Population' }
];

const RESPONSE_TYPES = [
  { value: 'HEALTH', label: 'Health' },
  { value: 'WASH', label: 'WASH' },
  { value: 'SHELTER', label: 'Shelter' },
  { value: 'FOOD', label: 'Food' }
];

const PRIORITY_LEVELS = [
  { 
    value: 'CRITICAL', 
    label: 'Critical',
    icon: () => <div className="w-3 h-3 rounded-full bg-red-500" />
  },
  { 
    value: 'HIGH', 
    label: 'High',
    icon: () => <div className="w-3 h-3 rounded-full bg-orange-500" />
  },
  { 
    value: 'MEDIUM', 
    label: 'Medium',
    icon: () => <div className="w-3 h-3 rounded-full bg-yellow-500" />
  },
  { 
    value: 'LOW', 
    label: 'Low',
    icon: () => <div className="w-3 h-3 rounded-full bg-green-500" />
  }
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'AUTO_VERIFIED', label: 'Auto Verified' },
  { value: 'REJECTED', label: 'Rejected' }
];

const SORT_OPTIONS_ASSESSMENT = [
  { value: 'rapidAssessmentDate', label: 'Assessment Date' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'entity.name', label: 'Entity Name' }
];

const SORT_OPTIONS_RESPONSE = [
  { value: 'responseDate', label: 'Response Date' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'entity.name', label: 'Entity Name' }
];

const SORT_ORDER_OPTIONS = [
  { value: 'desc', label: 'Newest First' },
  { value: 'asc', label: 'Oldest First' }
];

const DEFAULT_ASSESSMENT_FILTERS: VerificationFilters = {
  search: '',
  status: ['SUBMITTED'],
  priority: [],
  assessmentType: [],
  dateFrom: '',
  dateTo: '',
  sortBy: 'rapidAssessmentDate',
  sortOrder: 'desc'
};

const DEFAULT_RESPONSE_FILTERS: VerificationFilters = {
  search: '',
  status: ['SUBMITTED'],
  priority: [],
  responseType: [],
  dateFrom: '',
  dateTo: '',
  sortBy: 'responseDate',
  sortOrder: 'desc'
};

export function getDefaultFilters(type: 'assessments' | 'responses'): VerificationFilters {
  return type === 'assessments' ? { ...DEFAULT_ASSESSMENT_FILTERS } : { ...DEFAULT_RESPONSE_FILTERS };
}

export function QueueFiltersV2({
  type,
  filters,
  onFiltersChange,
  onClear,
  visible,
  onClose,
  loading = false,
  error
}: QueueFiltersV2Props) {
  
  const filterGroups: FilterGroup[] = useMemo(() => {
    const groups: FilterGroup[] = [
      {
        id: 'search',
        label: 'Search',
        type: 'search',
        key: 'search',
        placeholder: type === 'assessments' 
          ? 'Search by entity, assessor, location...'
          : 'Search by entity, responder, donor...'
      },
      
      {
        id: 'status',
        label: 'Status',
        type: 'checkbox-group',
        key: 'status',
        options: STATUS_OPTIONS
      },
      
      {
        id: 'priority',
        label: 'Priority',
        type: 'checkbox-group',
        key: 'priority',
        options: PRIORITY_LEVELS
      }
    ];

    if (type === 'assessments') {
      groups.push({
        id: 'assessmentType',
        label: 'Assessment Type',
        type: 'checkbox-group',
        key: 'assessmentType',
        options: ASSESSMENT_TYPES
      });
    } else {
      groups.push({
        id: 'responseType',
        label: 'Response Type',
        type: 'checkbox-group',
        key: 'responseType',
        options: RESPONSE_TYPES
      });
    }

    groups.push({
      id: 'dateRange',
      label: 'Date Range',
      type: 'date-range'
    });

    groups.push(
      {
        id: 'sortBy',
        label: 'Sort By',
        type: 'single-select',
        key: 'sortBy',
        options: type === 'assessments' ? SORT_OPTIONS_ASSESSMENT : SORT_OPTIONS_RESPONSE,
        placeholder: 'Select sort field',
        defaultCollapsed: true
      },
      {
        id: 'sortOrder',
        label: 'Sort Order',
        type: 'single-select',
        key: 'sortOrder',
        options: SORT_ORDER_OPTIONS,
        placeholder: 'Select sort order',
        defaultCollapsed: true
      }
    );

    return groups;
  }, [type]);

  const quickPresets: FilterPreset[] = useMemo(() => {
    const basePresets: FilterPreset[] = [
      {
        id: 'critical-priority',
        name: 'Critical Priority',
        description: 'Show only critical priority items',
        filters: { priority: ['CRITICAL'] }
      },
      {
        id: 'over-1-hour',
        name: 'Over 1 Hour Old',
        description: 'Items pending over 1 hour',
        filters: { 
          dateTo: format(new Date(Date.now() - 60 * 60 * 1000), 'yyyy-MM-dd\'T\'HH:mm') 
        }
      },
      {
        id: 'recently-submitted',
        name: 'Recently Submitted',
        description: 'Items submitted in last 24 hours',
        filters: { 
          dateFrom: format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd\'T\'HH:mm') 
        }
      }
    ];

    if (type === 'assessments') {
      basePresets.splice(2, 0, {
        id: 'health-assessments',
        name: 'Health Assessments',
        description: 'Health-related assessments only',
        filters: { assessmentType: ['HEALTH'] }
      });
    } else {
      basePresets.splice(2, 0, {
        id: 'health-responses',
        name: 'Health Responses',
        description: 'Health-related responses only',
        filters: { responseType: ['HEALTH'] }
      });
    }

    return basePresets;
  }, [type]);

  const filterPanelProps: FilterPanelProps<VerificationFilters> = {
    title: 'Queue Filters',
    description: `Filter and search ${type === 'assessments' ? 'assessments' : 'responses'} in the verification queue`,
    visible,
    onClose,
    
    filters,
    onFiltersChange,
    onClear,
    
    filterGroups,
    quickPresets,
    
    enableSavedFilters: true,
    savedFiltersKey: `verification-filters-${type}`,
    
    advancedCollapsible: true,
    defaultAdvancedCollapsed: false,
    
    loading,
    error,
    
    className: 'max-w-5xl'
  };

  return <FilterPanel {...filterPanelProps} />;
}

export function QueueFilters(props: QueueFiltersV2Props) {
  return <QueueFiltersV2 {...props} />;
}

export function FilterSummary({
  filters,
  onClear,
  type
}: {
  filters: VerificationFilters;
  onClear: () => void;
  type: 'assessments' | 'responses';
}) {
  const activeCount = useMemo(() => {
    let count = 0;
    
    if (filters.status && filters.status.length > 0 && 
        !(filters.status.length === 1 && filters.status[0] === 'SUBMITTED')) {
      count += filters.status.length;
    }
    if (filters.priority && filters.priority.length > 0) count += filters.priority.length;
    if (type === 'assessments' && filters.assessmentType && filters.assessmentType.length > 0) count += filters.assessmentType.length;
    if (type === 'responses' && filters.responseType && filters.responseType.length > 0) count += filters.responseType.length;
    if (filters.search) count += 1;
    if (filters.dateFrom) count += 1;
    if (filters.dateTo) count += 1;
    if (filters.sortBy && filters.sortBy !== (type === 'assessments' ? 'rapidAssessmentDate' : 'responseDate')) count += 1;
    if (filters.sortOrder && filters.sortOrder !== 'desc') count += 1;
    if (filters.entityId) count += 1;
    if (type === 'assessments' && filters.assessorId) count += 1;
    if (type === 'responses' && filters.responderId) count += 1;
    
    return count;
  }, [filters, type]);

  if (activeCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-sm">
      <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
      </svg>
      <span className="text-blue-700">
        {activeCount} filter{activeCount !== 1 ? 's' : ''} applied
      </span>
      <button
        onClick={onClear}
        className="text-blue-600 hover:text-blue-700 underline"
      >
        Clear all
      </button>
    </div>
  );
}
