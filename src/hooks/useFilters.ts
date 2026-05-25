'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { 
  FilterState, 
  FilterHookOptions, 
  FilterHookReturn, 
  FilterSummary 
} from '@/types/filters';

/**
 * Comprehensive hook for managing filter state with persistence and URL sync
 */
export function useFilters<T extends FilterState = FilterState>(
  options: FilterHookOptions<T> = {}
): FilterHookReturn<T> {
  const {
    defaultFilters = {} as Partial<T>,
    debounceMs = 300,
    enableUrlSync = false,
    persistKey,
    validateFilters,
    onFiltersChange
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize filters with defaults, URL params, or localStorage
  const [filters, setFiltersState] = useState<T>(() => {
    let initialFilters = { ...defaultFilters } as T;

    // Try to load from URL if enabled
    if (enableUrlSync && searchParams) {
      const urlFilters = Object.fromEntries(searchParams.entries());
      Object.keys(urlFilters).forEach(key => {
        const value = urlFilters[key];
        try {
          // Try to parse JSON values (for arrays, objects)
          (initialFilters as any)[key] = JSON.parse(value);
        } catch {
          // Use string value if not valid JSON
          (initialFilters as any)[key] = value;
        }
      });
    }
    // Try to load from localStorage if no URL data and persist key provided
    else if (persistKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(persistKey);
        if (stored) {
          const parsedFilters = JSON.parse(stored);
          initialFilters = { ...initialFilters, ...parsedFilters };
        }
      } catch (error) {
        console.warn('Failed to load filters from localStorage:', error);
      }
    }

    return initialFilters;
  });

  // Debounced filters for expensive operations
  const [debouncedFilters, setDebouncedFilters] = useState<T>(filters);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filters, debounceMs]);

  // Update filters with validation
  const setFilters = useCallback((newFilters: Partial<T>) => {
    setFiltersState(prev => {
      const updated = { ...prev, ...newFilters };
      
      // Validate if validator provided
      if (validateFilters && !validateFilters(updated)) {
        console.warn('Filter validation failed:', updated);
        return prev;
      }

      return updated;
    });
  }, [validateFilters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const cleared = { ...defaultFilters } as T;
    setFiltersState(cleared);
  }, [defaultFilters]);

  // Reset to default filters
  const resetFilters = useCallback(() => {
    setFiltersState({ ...defaultFilters } as T);
  }, [defaultFilters]);

  // Get single filter value
  const getFilterValue = useCallback((key: string) => {
    return (filters as any)[key];
  }, [filters]);

  // Set single filter value
  const setFilterValue = useCallback((key: string, value: any) => {
    setFilters({ [key]: value } as Partial<T>);
  }, [setFilters]);

  // Toggle filter value (for arrays)
  const toggleFilter = useCallback((key: string, value: any) => {
    const current = getFilterValue(key);
    if (Array.isArray(current)) {
      const newArray = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setFilterValue(key, newArray);
    } else {
      setFilterValue(key, current === value ? undefined : value);
    }
  }, [getFilterValue, setFilterValue]);

  // Generate filter summary
  const summary: FilterSummary = useMemo(() => {
    const activeFilters: Array<{
      key: string;
      label: string;
      value: any;
      displayValue: string;
    }> = [];
    let totalCount = 0;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        if (Array.isArray(value) && value.length > 0) {
          activeFilters.push({
            key,
            label: key,
            value,
            displayValue: value.length === 1 ? value[0] : `${value.length} selected`
          });
          totalCount++;
        } else if (!Array.isArray(value) && value !== (defaultFilters as any)[key]) {
          activeFilters.push({
            key,
            label: key,
            value,
            displayValue: String(value)
          });
          totalCount++;
        }
      }
    });

    return {
      activeFilters,
      totalCount,
      isActive: totalCount > 0
    };
  }, [filters, defaultFilters]);

  // URL synchronization
  const updateUrl = useCallback(() => {
    if (!enableUrlSync) return;

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        if (Array.isArray(value) && value.length > 0) {
          params.set(key, JSON.stringify(value));
        } else if (!Array.isArray(value) && value !== (defaultFilters as any)[key]) {
          params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      }
    });

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [filters, defaultFilters, enableUrlSync, router]);

  const loadFromUrl = useCallback(() => {
    if (!enableUrlSync || !searchParams) return;

    const urlFilters = {} as Partial<T>;
    searchParams.forEach((value, key) => {
      try {
        (urlFilters as any)[key] = JSON.parse(value);
      } catch {
        (urlFilters as any)[key] = value;
      }
    });

    setFilters(urlFilters);
  }, [enableUrlSync, searchParams, setFilters]);

  // localStorage persistence
  const saveToStorage = useCallback(() => {
    if (!persistKey || typeof window === 'undefined') return;

    try {
      localStorage.setItem(persistKey, JSON.stringify(filters));
    } catch (error) {
      console.error('Failed to save filters to localStorage:', error);
    }
  }, [persistKey, filters]);

  const loadFromStorage = useCallback(() => {
    if (!persistKey || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(persistKey);
      if (stored) {
        const parsedFilters = JSON.parse(stored);
        setFilters(parsedFilters);
      }
    } catch (error) {
      console.error('Failed to load filters from localStorage:', error);
    }
  }, [persistKey, setFilters]);

  // Auto-save to localStorage when filters change
  useEffect(() => {
    if (persistKey) {
      saveToStorage();
    }
  }, [filters, persistKey, saveToStorage]);

  // Auto-update URL when filters change
  useEffect(() => {
    if (enableUrlSync) {
      updateUrl();
    }
  }, [filters, enableUrlSync, updateUrl]);

  // Call onFiltersChange when debounced filters change
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(debouncedFilters);
    }
  }, [debouncedFilters, onFiltersChange]);

  return {
    filters,
    setFilters,
    clearFilters,
    resetFilters,
    
    summary,
    isActive: summary.isActive,
    activeCount: summary.totalCount,
    
    updateUrl,
    loadFromUrl,
    saveToStorage,
    loadFromStorage,
    
    getFilterValue,
    setFilterValue,
    toggleFilter
  };
}

/**
 * Hook for managing saved filters
 */
export function useSavedFilters(key: string) {
  const [savedFilters, setSavedFilters] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(`saved-filters-${key}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveFilter = useCallback((name: string, description: string, filters: any) => {
    const newFilter = {
      id: Date.now().toString(),
      name,
      description,
      filters,
      createdAt: new Date().toISOString()
    };

    setSavedFilters(prev => {
      const updated = [...prev, newFilter];
      try {
        localStorage.setItem(`saved-filters-${key}`, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save filter:', error);
      }
      return updated;
    });

    return newFilter;
  }, [key]);

  const deleteFilter = useCallback((id: string) => {
    setSavedFilters(prev => {
      const updated = prev.filter(f => f.id !== id);
      try {
        localStorage.setItem(`saved-filters-${key}`, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to delete filter:', error);
      }
      return updated;
    });
  }, [key]);

  const loadFilter = useCallback((id: string) => {
    const filter = savedFilters.find(f => f.id === id);
    return filter?.filters;
  }, [savedFilters]);

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
    loadFilter
  };
}

/**
 * Hook for filter presets
 */
export function useFilterPresets(presets: any[]) {
  const applyPreset = useCallback((presetId: string, setFilters: (filters: any) => void) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setFilters(preset.filters);
    }
  }, [presets]);

  return {
    presets,
    applyPreset
  };
}

export type { FilterHookOptions, FilterHookReturn };