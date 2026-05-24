'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Filter, X, Save, RotateCcw } from 'lucide-react';
import { VerificationFilters } from '@/stores/verification.store';
import { cn } from '@/lib/utils';
import { getDotColor } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

interface QueueFiltersProps {
  type: 'assessments' | 'deliveries';
  filters: VerificationFilters;
  onFiltersChange: (filters: Partial<VerificationFilters>) => void;
  onClear: () => void;
  visible: boolean;
  onClose: () => void;
}

// Assessment types
const ASSESSMENT_TYPES = [
  'HEALTH',
  'WASH', 
  'SHELTER',
  'FOOD',
  'SECURITY',
  'POPULATION'
];

// Priority levels
const PRIORITY_LEVELS = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' }
];

// Status options
const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'AUTO_VERIFIED', label: 'Auto Verified' },
  { value: 'REJECTED', label: 'Rejected' }
];

// Sort options
const SORT_OPTIONS = [
  { value: 'rapidAssessmentDate', label: 'Assessment Date' },
  { value: 'responseDate', label: 'Response Date' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'entity.name', label: 'Entity Name' }
];

// Preset filters
const PRESET_FILTERS = [
  {
    name: 'Critical Priority',
    description: 'Show only critical priority items',
    filters: { priority: ['CRITICAL'] }
  },
  {
    name: 'Over 1 Hour Old',
    description: 'Items pending over 1 hour',
    filters: { dateTo: format(new Date(Date.now() - 60 * 60 * 1000), 'yyyy-MM-dd HH:mm') }
  },
  {
    name: 'Health Assessments',
    description: 'Health-related assessments only',
    filters: { assessmentType: ['HEALTH'] }
  },
  {
    name: 'Recently Submitted',
    description: 'Items submitted in last 24 hours',
    filters: { dateFrom: format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd HH:mm') }
  }
];

export function QueueFilters({
  type,
  filters,
  onFiltersChange,
  onClear,
  visible,
  onClose
}: QueueFiltersProps) {
  const [localFilters, setLocalFilters] = useState<VerificationFilters>(filters);
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  // Sync local filters with props
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`verification-filters-${type}`);
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  }, [type]);

  const handleFilterChange = (key: keyof VerificationFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange({ [key]: value });
  };

  const handleMultiSelectChange = (key: keyof VerificationFilters, value: string, checked: boolean) => {
    const currentValues = (localFilters[key] as string[]) || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    handleFilterChange(key, newValues);
  };

  const applySavedFilter = (savedFilter: any) => {
    setLocalFilters(savedFilter.filters);
    onFiltersChange(savedFilter.filters);
  };

  const saveCurrentFilter = () => {
    if (!filterName.trim()) return;

    const newFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: { ...localFilters },
      createdAt: new Date().toISOString()
    };

    const updatedFilters = [...savedFilters, newFilter];
    setSavedFilters(updatedFilters);

    try {
      localStorage.setItem(`verification-filters-${type}`, JSON.stringify(updatedFilters));
    } catch (error) {
      console.error('Error saving filter:', error);
    }

    setShowSaveDialog(false);
    setFilterName('');
  };

  const deleteSavedFilter = (id: string) => {
    const updatedFilters = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updatedFilters);

    try {
      localStorage.setItem(`verification-filters-${type}`, JSON.stringify(updatedFilters));
    } catch (error) {
      console.error('Error deleting filter:', error);
    }
  };

  if (!visible) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Queue Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClear}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear All
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick Presets */}
        <div>
          <Label className="text-sm font-medium">Quick Filters</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {PRESET_FILTERS.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => applySavedFilter({ filters: preset.filters })}
                className="justify-start text-xs"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div>
          <Label htmlFor="search" className="text-sm font-medium">Search</Label>
          <Input
            id="search"
            placeholder="Search by entity, assessor, location..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <Label className="text-sm font-medium">Status</Label>
            <div className="mt-2 space-y-2">
              {STATUS_OPTIONS.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={(localFilters.status || []).includes(status.value)}
                    onCheckedChange={(checked) => 
                      handleMultiSelectChange('status', status.value, !!checked)
                    }
                  />
                  <Label 
                    htmlFor={`status-${status.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <Label className="text-sm font-medium">Priority</Label>
            <div className="mt-2 space-y-2">
              {PRIORITY_LEVELS.map((priority) => (
                <div key={priority.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority.value}`}
                    checked={(localFilters.priority || []).includes(priority.value)}
                    onCheckedChange={(checked) => 
                      handleMultiSelectChange('priority', priority.value, !!checked)
                    }
                  />
                  <div className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', getDotColor('severity', priority.value))} />
                    <Label
                      htmlFor={`priority-${priority.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {priority.label}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assessment Type Filter */}
          {type === 'assessments' && (
            <div>
              <Label className="text-sm font-medium">Assessment Type</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {ASSESSMENT_TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={(localFilters.assessmentType || []).includes(type)}
                      onCheckedChange={(checked) => 
                        handleMultiSelectChange('assessmentType', type, !!checked)
                      }
                    />
                    <Label 
                      htmlFor={`type-${type}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateFrom" className="text-sm font-medium">From Date</Label>
            <Input
              id="dateFrom"
              type="datetime-local"
              value={localFilters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="dateTo" className="text-sm font-medium">To Date</Label>
            <Input
              id="dateTo"
              type="datetime-local"
              value={localFilters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Sorting */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Sort By</Label>
            <Select
              value={localFilters.sortBy || 'rapidAssessmentDate'}
              onValueChange={(value) => handleFilterChange('sortBy', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select sort field" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Sort Order</Label>
            <Select
              value={localFilters.sortOrder || 'desc'}
              onValueChange={(value) => handleFilterChange('sortOrder', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Saved Filters</Label>
            <div className="mt-2 space-y-2">
              {savedFilters.map((savedFilter) => (
                <div key={savedFilter.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{savedFilter.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Saved {format(new Date(savedFilter.createdAt), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applySavedFilter(savedFilter)}
                    >
                      Apply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSavedFilter(savedFilter.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Current Filter */}
        <div className="flex items-center gap-2 pt-4 border-t">
          {!showSaveDialog ? (
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(true)}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Current Filter
            </Button>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <Input
                placeholder="Filter name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={saveCurrentFilter}
                disabled={!filterName.trim()}
              >
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false);
                  setFilterName('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Filter Summary Component
export function FilterSummary({
  filters,
  onClear,
  type
}: {
  filters: VerificationFilters;
  onClear: () => void;
  type: 'assessments' | 'deliveries';
}) {
  const getActiveFiltersCount = () => {
    let count = 0;
    
    // Count non-default filters
    if (filters.status && filters.status.length > 0 && 
        !(filters.status.length === 1 && filters.status[0] === 'SUBMITTED')) {
      count += filters.status.length;
    }
    if (filters.priority && filters.priority.length > 0) count += filters.priority.length;
    if (filters.assessmentType && filters.assessmentType.length > 0) count += filters.assessmentType.length;
    if (filters.search) count += 1;
    if (filters.dateFrom) count += 1;
    if (filters.dateTo) count += 1;
    if (filters.sortBy && filters.sortBy !== 'rapidAssessmentDate') count += 1;
    if (filters.sortOrder && filters.sortOrder !== 'desc') count += 1;
    if (filters.entityId) count += 1;
    if (type === 'assessments' && filters.assessorId) count += 1;
    if (type === 'deliveries' && filters.responderId) count += 1;
    
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  if (activeFiltersCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-sm">
      <Filter className="h-4 w-4 text-blue-600" />
      <span className="text-blue-700">
        {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="text-blue-600 hover:text-blue-700 h-6 px-2"
      >
        Clear all
      </Button>
    </div>
  );
}