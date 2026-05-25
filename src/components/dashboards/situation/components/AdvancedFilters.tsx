'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search,
  Filter,
  Calendar,
  MapPin,
  AlertCircle,
  X,
  Plus,
  Download,
  RefreshCw,
  Sliders
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { debounce } from '@/lib/utils/debounce';

// Types for enhanced filtering
interface FilterState {
  incidentId?: string;
  entityTypes: string[];
  severityLevels: string[];
  dateRange: {
    start: string;
    end: string;
  };
  geographicArea: string;
  searchTerm: string;
  assessmentStatus: string[];
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  isDefault?: boolean;
}

interface AdvancedFiltersProps {
  incidentId?: string;
  onFiltersChange: (filters: FilterState) => void;
  className?: string;
}

// Default filter state
const defaultFilters: FilterState = {
  entityTypes: [],
  severityLevels: [],
  dateRange: {
    start: '',
    end: ''
  },
  geographicArea: '',
  searchTerm: '',
  assessmentStatus: []
};

// Predefined filter presets
const filterPresets: SavedFilter[] = [
  {
    id: 'critical-active',
    name: 'Critical Active Incidents',
    isDefault: true,
    filters: {
      ...defaultFilters,
      severityLevels: ['CRITICAL'],
      assessmentStatus: ['ACTIVE']
    }
  },
  {
    id: 'all-active',
    name: 'All Active Incidents',
    filters: {
      ...defaultFilters,
      assessmentStatus: ['ACTIVE', 'CONTAINED']
    }
  },
  {
    id: 'last-7-days',
    name: 'Last 7 Days',
    filters: {
      ...defaultFilters,
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    }
  },
  {
    id: 'health-gaps',
    name: 'Health Service Gaps',
    filters: {
      ...defaultFilters,
      searchTerm: 'health',
      severityLevels: ['CRITICAL', 'HIGH']
    }
  }
];

// Entity type options
const entityTypeOptions = [
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'WARD', label: 'Ward' },
  { value: 'LGA', label: 'Local Government' },
  { value: 'STATE', label: 'State' },
  { value: 'FACILITY', label: 'Facility' },
  { value: 'CAMP', label: 'Camp' }
];

// Severity level options
const severityOptions = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' }
];

// Assessment status options
const assessmentStatusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' }
];

// Geographic area options
const geographicAreas = [
  { value: 'north-central', label: 'North Central' },
  { value: 'north-east', label: 'North East' },
  { value: 'north-west', label: 'North West' },
  { value: 'south-central', label: 'South Central' },
  { value: 'south-east', label: 'South East' },
  { value: 'south-west', label: 'South West' }
];

/**
 * AdvancedFilters Component
 * 
 * Provides comprehensive filtering capabilities for situation dashboard:
 * - Multiple filter categories (type, severity, date range, location)
 * - Saved filter presets for common workflows
 * - Real-time search with debouncing
 * - Geographic and status-based filtering
 * - Export filtered data functionality
 */
export function AdvancedFilters({ incidentId, onFiltersChange, className }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(filterPresets);
  const [newFilterName, setNewFilterName] = useState('');

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, searchTerm }));
    }, 300),
    []
  );

  // Handle search input
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value;
    setFilters(prev => ({ ...prev, searchTerm }));
    debouncedSearch(searchTerm);
  };

  // Handle filter change
  const handleFilterChange = (filterType: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  // Apply filters
  const applyFilters = useCallback(() => {
    const activeFilters = {
      ...filters,
      incidentId
    };
    onFiltersChange(activeFilters);
  }, [filters, incidentId, onFiltersChange]);

  // Reset filters
  const resetFilters = () => {
    setFilters(defaultFilters);
    onFiltersChange({ ...defaultFilters, incidentId });
  };

  // Apply saved filter preset
  const applySavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    onFiltersChange({ ...savedFilter.filters, incidentId });
  };

  // Save current filter combination
  const saveCurrentFilter = () => {
    if (!newFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: `custom-${Date.now()}`,
      name: newFilterName,
      filters: { ...filters }
    };

    setSavedFilters(prev => [...prev, newFilter]);
    setNewFilterName('');
    
    // TODO: Save to backend for persistence
    // await saveUserFilter(newFilter);
  };

  // Export filtered data
  const exportFilteredData = useCallback(async () => {
    try {
      const exportParams = new URLSearchParams();
      
      // Add filters as string values
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          exportParams.set(key, value.join(','));
        } else if (typeof value === 'object' && value !== null) {
          exportParams.set(key, JSON.stringify(value));
        } else {
          exportParams.set(key, String(value));
        }
      });
      
      if (incidentId) exportParams.set('incidentId', incidentId);
      exportParams.set('exportFormat', 'csv');
      exportParams.set('includeTimestamp', new Date().toISOString());

      const response = await apiGet(`/api/v1/dashboard/situation/export?${exportParams}`);
      
      if (response.success && response.data.downloadUrl) {
        // Trigger download
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = `situation-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Show error notification
    }
  }, [filters, incidentId]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.entityTypes.length > 0) count++;
    if (filters.severityLevels.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.geographicArea) count++;
    if (filters.assessmentStatus.length > 0) count++;
    return count;
  }, [filters]);

  // Auto-apply filters when they change
  React.useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            Advanced Filters
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Basic Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents, entities, or locations..."
            value={filters.searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {/* Quick Filter Presets */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Quick Filters</label>
          <div className="flex flex-wrap gap-2">
            {filterPresets.map((preset) => (
              <Button
                key={preset.id}
                variant={JSON.stringify(filters) === JSON.stringify(preset.filters) ? "default" : "outline"}
                size="sm"
                onClick={() => applySavedFilter(preset)}
                className="h-8"
              >
                {preset.name}
                {preset.isDefault && (
                  <Badge variant="secondary" className="ml-1 text-xs">Default</Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <Button
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full justify-between h-10"
        >
          <span className="font-medium">Advanced Filters</span>
          <Filter className="h-4 w-4" />
        </Button>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted">
            {/* Entity Types */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Entity Types</label>
              <div className="flex flex-wrap gap-2">
                {entityTypeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.entityTypes.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newTypes = filters.entityTypes.includes(option.value)
                        ? filters.entityTypes.filter(t => t !== option.value)
                        : [...filters.entityTypes, option.value];
                      handleFilterChange('entityTypes', newTypes);
                    }}
                    className="h-8"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Severity Levels */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Severity Levels</label>
              <div className="flex flex-wrap gap-2">
                {severityOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.severityLevels.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newLevels = filters.severityLevels.includes(option.value)
                        ? filters.severityLevels.filter(l => l !== option.value)
                        : [...filters.severityLevels, option.value];
                      handleFilterChange('severityLevels', newLevels);
                    }}
                    className="h-8"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="Start date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { 
                    ...filters.dateRange, 
                    start: e.target.value 
                  })}
                />
                <Input
                  type="date"
                  placeholder="End date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', { 
                    ...filters.dateRange, 
                    end: e.target.value 
                  })}
                />
              </div>
            </div>

            {/* Geographic Area */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Geographic Area</label>
              <Select
                value={filters.geographicArea}
                onValueChange={(value) => handleFilterChange('geographicArea', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select geographic area" />
                </SelectTrigger>
                <SelectContent>
                  {geographicAreas.map((area) => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assessment Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assessment Status</label>
              <div className="flex flex-wrap gap-2">
                {assessmentStatusOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.assessmentStatus.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newStatus = filters.assessmentStatus.includes(option.value)
                        ? filters.assessmentStatus.filter(s => s !== option.value)
                        : [...filters.assessmentStatus, option.value];
                      handleFilterChange('assessmentStatus', newStatus);
                    }}
                    className="h-8"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Save Custom Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Save Current Filter</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Filter name..."
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={saveCurrentFilter}
                  disabled={!newFilterName.trim()}
                  size="sm"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>

            {/* Saved Custom Filters */}
            {savedFilters.filter(f => !f.isDefault).length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Saved Filters</label>
                <div className="flex flex-wrap gap-2">
                  {savedFilters.filter(f => !f.isDefault).map((saved) => (
                    <Button
                      key={saved.id}
                      variant="outline"
                      size="sm"
                      onClick={() => applySavedFilter(saved)}
                      className="h-8"
                    >
                      {saved.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            onClick={resetFilters}
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
          
          <Button
            onClick={exportFilteredData}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default AdvancedFilters;