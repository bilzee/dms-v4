'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  X, 
  Filter, 
  RotateCcw,
  ChevronDown,
  Check
} from '@/lib/icons';
import { StatusBadge } from './StatusBadge';
import type { 
  FilterBarProps, 
  FilterConfig, 
  FilterOption, 
  ToolbarAction, 
  FilterSummary 
} from '@/types/filters';

// Hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Helper component for active filter summary
function ActiveFiltersSummary({ 
  summary, 
  onClearAll,
  className 
}: { 
  summary: FilterSummary;
  onClearAll?: () => void;
  className?: string;
}) {
  if (!summary.isActive) return null;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800',
      className
    )}>
      <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span className="text-sm text-blue-700 dark:text-blue-300">
        {summary.totalCount} filter{summary.totalCount !== 1 ? 's' : ''} applied
      </span>
      {summary.activeFilters.length <= 3 && (
        <div className="flex items-center gap-1">
          {summary.activeFilters.map((filter, index) => (
            <Badge key={`${filter.key}-${index}`} variant="secondary" className="text-xs">
              {filter.displayValue}
            </Badge>
          ))}
        </div>
      )}
      {onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}

// Enhanced Select component for filters
function FilterSelect({ 
  config, 
  value, 
  onChange, 
  className 
}: {
  config: FilterConfig;
  value: any;
  onChange: (value: any) => void;
  className?: string;
}) {
  const displayValue = useMemo(() => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return '';
    }
    
    if (config.multiple && Array.isArray(value)) {
      if (value.length === 1) {
        const option = config.options.find(opt => opt.value === value[0]);
        return option?.label || value[0];
      }
      return `${value.length} selected`;
    }
    
    const option = config.options.find(opt => opt.value === value);
    return option?.label || value;
  }, [config, value]);

  if (config.multiple) {
    // For multi-select, we'll use a simplified approach for now
    // In a full implementation, this would be a multi-select dropdown
    return (
      <Select
        value={Array.isArray(value) && value.length > 0 ? 'has-selection' : ''}
        onValueChange={(selectedValue) => {
          if (selectedValue === 'clear') {
            onChange([]);
          } else {
            // This is simplified - full implementation would need proper multi-select
            const option = config.options.find(opt => opt.value === selectedValue);
            if (option) {
              const currentValues = Array.isArray(value) ? value : [];
              const newValues = currentValues.includes(selectedValue)
                ? currentValues.filter(v => v !== selectedValue)
                : [...currentValues, selectedValue];
              onChange(newValues);
            }
          }
        }}
      >
        <SelectTrigger className={cn('min-w-32 max-w-48', className)}>
          <SelectValue placeholder={config.placeholder || config.label}>
            {displayValue || config.placeholder || config.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Array.isArray(value) && value.length > 0 && (
            <SelectItem value="clear" className="text-red-600">
              <X className="h-3 w-3 mr-2" />
              Clear selection
            </SelectItem>
          )}
          {config.options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              <div className="flex items-center">
                {Array.isArray(value) && value.includes(option.value) && (
                  <Check className="h-3 w-3 mr-2" />
                )}
                {option.icon && <option.icon className="h-3 w-3 mr-2" />}
                {option.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select 
      value={value || '__placeholder__'} 
      onValueChange={(newValue) => onChange(newValue === '__placeholder__' ? undefined : newValue)}
    >
      <SelectTrigger className={cn('min-w-32 max-w-48', className)}>
        <SelectValue placeholder={config.placeholder || config.label} />
      </SelectTrigger>
      <SelectContent>
        {config.placeholder && (
          <SelectItem value="__placeholder__">
            {config.placeholder}
          </SelectItem>
        )}
        {config.options.map((option) => (
          <SelectItem 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            <div className="flex items-center">
              {option.icon && <option.icon className="h-3 w-3 mr-2" />}
              {option.label}
              {option.description && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {option.description}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Main FilterBar component
export function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchDebounceMs = 300,
  
  filters = [],
  filterValues = {},
  onFilterChange,
  
  actions = [],
  showClearAll = true,
  onClearAll,
  
  summary,
  loading = false,
  className,
}: FilterBarProps) {
  const [internalSearchValue, setInternalSearchValue] = useState(searchValue);
  const debouncedSearch = useDebounce(internalSearchValue, searchDebounceMs);

  // Update search when external value changes
  useEffect(() => {
    setInternalSearchValue(searchValue);
  }, [searchValue]);

  // Call onSearchChange when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== searchValue && onSearchChange) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, searchValue, onSearchChange]);

  // Generate filter summary if not provided
  const autoSummary = useMemo((): FilterSummary => {
    if (summary) return summary;

    const activeFilters = [];
    let totalCount = 0;

    // Count search
    if (internalSearchValue.trim()) {
      activeFilters.push({
        key: 'search',
        label: 'Search',
        value: internalSearchValue,
        displayValue: `"${internalSearchValue}"`
      });
      totalCount++;
    }

    // Count filter values
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        const config = filters.find(f => f.key === key);
        let displayValue = String(value);
        
        if (config) {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              if (value.length === 1) {
                const option = config.options.find(opt => opt.value === value[0]);
                displayValue = option?.label || value[0];
              } else {
                displayValue = `${value.length} selected`;
              }
              totalCount++;
            }
          } else {
            const option = config.options.find(opt => opt.value === value);
            displayValue = option?.label || value;
            totalCount++;
          }
        } else {
          totalCount++;
        }

        if ((Array.isArray(value) && value.length > 0) || (!Array.isArray(value))) {
          activeFilters.push({
            key,
            label: config?.label || key,
            value,
            displayValue
          });
        }
      }
    });

    return {
      activeFilters,
      totalCount,
      isActive: totalCount > 0
    };
  }, [internalSearchValue, filterValues, filters, summary]);

  const handleClearAll = () => {
    setInternalSearchValue('');
    if (onSearchChange) onSearchChange('');
    if (onClearAll) onClearAll();
  };

  if (loading) {
    return (
      <div className={cn('flex flex-wrap items-center gap-3 py-3', className)}>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-24" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main filter bar */}
      <div className={cn('flex flex-wrap items-center gap-3 py-3', className)}>
        {/* Search input */}
        {onSearchChange && (
          <div className="relative min-w-64 max-w-80 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={internalSearchValue}
              onChange={(e) => setInternalSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Filter selects */}
        {filters.map((filter) => (
          <FilterSelect
            key={filter.key}
            config={filter}
            value={filterValues[filter.key]}
            onChange={(value) => onFilterChange?.(filter.key, value)}
          />
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear all button */}
        {showClearAll && autoSummary.isActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </Button>
        )}

        {/* Action buttons */}
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              size={action.size || 'sm'}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className="gap-2"
            >
              {action.loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                Icon && <Icon className="h-4 w-4" />
              )}
              {action.label}
              {action.shortcut && (
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {action.shortcut}
                </kbd>
              )}
            </Button>
          );
        })}
      </div>

      {/* Active filters summary */}
      <ActiveFiltersSummary 
        summary={autoSummary}
        onClearAll={autoSummary.isActive ? handleClearAll : undefined}
      />
    </div>
  );
}

// Re-export SearchToolbar for backward compatibility
export { SearchToolbar } from './SearchToolbar';

// Export types
export type { FilterBarProps, FilterConfig, FilterOption, ToolbarAction };