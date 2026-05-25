'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
// Simple collapsible implementation since @/components/ui/collapsible doesn't exist
const Collapsible = ({ 
  children, 
  open, 
  onOpenChange 
}: { 
  children: React.ReactNode; 
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}) => (
  <div>{children}</div>
);

const CollapsibleTrigger = ({ asChild, children, ...props }: { asChild?: boolean; children: React.ReactNode; [key: string]: any }) => 
  asChild ? React.cloneElement(children as React.ReactElement, props) : <div {...props}>{children}</div>;

const CollapsibleContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Filter, 
  Search, 
  X, 
  RotateCcw,
  Save,
  Download,
  ChevronDown,
  ChevronRight,
  Settings,
  Star,
  Trash2,
  Calendar,
  Clock
} from '@/lib/icons';
import { StatusBadge, getDotColor } from './StatusBadge';
import { format, parseISO } from 'date-fns';
import type { 
  FilterPanelProps, 
  FilterGroup, 
  FilterPreset, 
  SavedFilter,
  FilterState,
  FilterOption
} from '@/types/filters';

// Helper hook for localStorage management
function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = (newValue: T | ((prev: T) => T)) => {
    try {
      const valueToStore = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;
      setValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving to localStorage:`, error);
    }
  };

  return [value, setStoredValue];
}

// Search input with debouncing
function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'Search...',
  debounceMs = 300,
  className 
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState(value || '');

  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== value && onChange) {
        onChange(internalValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, value, onChange, debounceMs]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}

// Multi-select checkbox group
function CheckboxGroup({ 
  group, 
  values, 
  onChange,
  className 
}: {
  group: FilterGroup;
  values: string[];
  onChange: (values: string[]) => void;
  className?: string;
}) {
  const handleChange = (optionValue: string, checked: boolean) => {
    const newValues = checked 
      ? [...values, optionValue]
      : values.filter(v => v !== optionValue);
    onChange(newValues);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-sm font-medium">{group.label}</Label>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {group.options?.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`${group.id}-${option.value}`}
              checked={values.includes(option.value)}
              onCheckedChange={(checked) => 
                handleChange(option.value, !!checked)
              }
              disabled={option.disabled}
            />
            <Label 
              htmlFor={`${group.id}-${option.value}`}
              className="flex items-center gap-2 text-sm font-normal cursor-pointer"
            >
              {option.icon && <option.icon className="h-3 w-3" />}
              <span>{option.label}</span>
              {option.description && (
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              )}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

// Date range inputs
function DateRangeInput({ 
  fromValue, 
  toValue, 
  onFromChange, 
  onToChange,
  label = 'Date Range',
  className 
}: {
  fromValue?: string;
  toValue?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="datetime-local"
            value={fromValue || ''}
            onChange={(e) => onFromChange?.(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="datetime-local"
            value={toValue || ''}
            onChange={(e) => onToChange?.(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

// Quick preset buttons
function QuickPresets({ 
  presets, 
  onApplyPreset,
  className 
}: {
  presets: FilterPreset[];
  onApplyPreset: (preset: FilterPreset) => void;
  className?: string;
}) {
  if (!presets.length) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-sm font-medium">Quick Filters</Label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            variant="outline"
            size="sm"
            onClick={() => onApplyPreset(preset)}
            className="justify-start text-xs h-8"
          >
            {preset.icon && <preset.icon className="h-3 w-3 mr-1" />}
            {preset.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Saved filters management
function SavedFiltersSection({ 
  savedFilters, 
  onLoadFilter, 
  onDeleteFilter,
  currentFilters,
  onSaveFilter,
  className 
}: {
  savedFilters: SavedFilter[];
  onLoadFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (id: string) => void;
  currentFilters: any;
  onSaveFilter: (filter: SavedFilter) => void;
  className?: string;
}) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');

  const handleSave = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      description: filterDescription.trim() || undefined,
      filters: { ...currentFilters },
      createdAt: new Date().toISOString()
    };

    onSaveFilter(newFilter);
    setSaveDialogOpen(false);
    setFilterName('');
    setFilterDescription('');
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Saved Filters</Label>
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Save className="h-3 w-3 mr-1" />
              Save Current
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Save Filter</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="filter-name" className="text-sm">Name</Label>
                <Input
                  id="filter-name"
                  placeholder="My custom filter"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="filter-description" className="text-sm">Description (optional)</Label>
                <Input
                  id="filter-description"
                  placeholder="Brief description..."
                  value={filterDescription}
                  onChange={(e) => setFilterDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!filterName.trim()}>
                  Save Filter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {savedFilters.length > 0 ? (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {savedFilters.map((filter) => (
            <div 
              key={filter.id} 
              className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {filter.isDefault && <Star className="h-3 w-3 text-yellow-500" />}
                  <span className="font-medium text-sm truncate">{filter.name}</span>
                </div>
                {filter.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {filter.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  Saved {format(parseISO(filter.createdAt), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLoadFilter(filter)}
                  className="h-7 text-xs"
                >
                  Apply
                </Button>
                {!filter.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteFilter(filter.id)}
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4">
          No saved filters yet
        </div>
      )}
    </div>
  );
}

// Export options
function ExportSection({ 
  onExport, 
  exportFormats = [],
  className 
}: {
  onExport: () => void;
  exportFormats?: Array<{ label: string; value: string; icon?: React.ComponentType<{ className?: string }> }>;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {exportFormats.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {exportFormats.map((format) => (
              <DropdownMenuItem key={format.value} onClick={onExport}>
                {format.icon && <format.icon className="h-4 w-4 mr-2" />}
                {format.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      )}
    </div>
  );
}

// Main FilterPanel component
export function FilterPanel<T extends FilterState = FilterState>({
  title = 'Filters',
  description,
  visible,
  onClose,
  
  filters,
  onFiltersChange,
  onClear,
  
  filterGroups = [],
  quickPresets = [],
  
  enableSavedFilters = false,
  savedFiltersKey,
  onSaveFilter,
  onDeleteFilter,
  onLoadFilter,
  
  advancedCollapsible = true,
  defaultAdvancedCollapsed = false,
  
  enableExport = false,
  onExport,
  exportFormats,
  
  loading = false,
  error,
  className
}: FilterPanelProps<T>) {
  const [advancedExpanded, setAdvancedExpanded] = useState(!defaultAdvancedCollapsed);
  const [savedFilters, setSavedFilters] = useLocalStorage<SavedFilter[]>(
    savedFiltersKey || 'filter-panel-saved', 
    []
  );

  // Auto-generate filter groups if not provided
  const autoFilterGroups = useMemo((): FilterGroup[] => {
    if (filterGroups.length > 0) return filterGroups;

    const groups: FilterGroup[] = [];
    
    // Add search if exists
    if (filters.search !== undefined) {
      groups.push({
        id: 'search',
        label: 'Search',
        type: 'search',
        key: 'search',
        placeholder: 'Search by name, description, location...'
      });
    }

    return groups;
  }, [filterGroups, filters]);

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({ [key]: value } as Partial<T>);
  };

  const handlePresetApply = (preset: FilterPreset) => {
    onFiltersChange(preset.filters as Partial<T>);
  };

  const handleSaveFilter = (filter: SavedFilter) => {
    setSavedFilters((prev: SavedFilter[]) => [...prev, filter]);
    if (onSaveFilter) onSaveFilter(filter);
  };

  const handleDeleteFilter = (id: string) => {
    setSavedFilters((prev: SavedFilter[]) => prev.filter((f: SavedFilter) => f.id !== id));
    if (onDeleteFilter) onDeleteFilter(id);
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    onFiltersChange(filter.filters as Partial<T>);
    if (onLoadFilter) onLoadFilter(filter);
  };

  const renderFilterGroup = (group: FilterGroup) => {
    const value = filters[group.key || group.id];

    switch (group.type) {
      case 'search':
        return (
          <SearchInput
            key={group.id}
            value={value || ''}
            onChange={(newValue) => handleFilterChange(group.key || group.id, newValue)}
            placeholder={group.placeholder}
            className="w-full"
          />
        );

      case 'single-select':
        return (
          <div key={group.id} className="space-y-2">
            <Label className="text-sm font-medium">{group.label}</Label>
            <Select 
              value={value || ''} 
              onValueChange={(newValue) => handleFilterChange(group.key || group.id, newValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder={group.placeholder || `Select ${group.label}`} />
              </SelectTrigger>
              <SelectContent>
                {group.placeholder && (
                  <SelectItem value="">{group.placeholder}</SelectItem>
                )}
                {group.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                    <div className="flex items-center">
                      {option.icon && <option.icon className="h-4 w-4 mr-2" />}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'multi-select':
      case 'checkbox-group':
        return (
          <CheckboxGroup
            key={group.id}
            group={group}
            values={Array.isArray(value) ? value : []}
            onChange={(newValues) => handleFilterChange(group.key || group.id, newValues)}
          />
        );

      case 'date-range':
        return (
          <DateRangeInput
            key={group.id}
            fromValue={filters.dateFrom}
            toValue={filters.dateTo}
            onFromChange={(newValue) => handleFilterChange('dateFrom', newValue)}
            onToChange={(newValue) => handleFilterChange('dateTo', newValue)}
            label={group.label}
          />
        );

      default:
        return null;
    }
  };

  if (!visible) return null;

  if (loading) {
    return (
      <Card className={cn('w-full max-w-4xl', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const basicGroups = autoFilterGroups.filter(g => !g.defaultCollapsed);
  const advancedGroups = autoFilterGroups.filter(g => g.defaultCollapsed);

  return (
    <Card className={cn('w-full max-w-4xl', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
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
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quick presets */}
        {quickPresets.length > 0 && (
          <QuickPresets presets={quickPresets} onApplyPreset={handlePresetApply} />
        )}

        {/* Basic filter groups */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {basicGroups.map(renderFilterGroup)}
        </div>

        {/* Advanced filters (collapsible) */}
        {advancedCollapsible && advancedGroups.length > 0 && (
          <Collapsible open={advancedExpanded} onOpenChange={setAdvancedExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 font-medium">
                {advancedExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Settings className="h-4 w-4" />
                Advanced Filters
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                {advancedGroups.map(renderFilterGroup)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Saved filters */}
        {enableSavedFilters && (
          <div className="border-t pt-6">
            <SavedFiltersSection
              savedFilters={savedFilters}
              onLoadFilter={handleLoadFilter}
              onDeleteFilter={handleDeleteFilter}
              currentFilters={filters}
              onSaveFilter={handleSaveFilter}
            />
          </div>
        )}

        {/* Export section */}
        {enableExport && onExport && (
          <div className="border-t pt-4 flex justify-end">
            <ExportSection 
              onExport={() => onExport(filters)}
              exportFormats={exportFormats}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export types and components
export type { FilterPanelProps, FilterGroup, FilterPreset, SavedFilter };
export { CheckboxGroup, DateRangeInput, QuickPresets, SearchInput };