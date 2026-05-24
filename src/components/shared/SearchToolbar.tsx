'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface ToolbarAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SearchToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  actions?: ToolbarAction[];
  className?: string;
}

export function SearchToolbar({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  actions,
  className,
}: SearchToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 py-3', className)}>
      {onSearchChange && (
        <div className="relative max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      {filters?.map((filter) => (
        <select
          key={filter.key}
          value={filterValues?.[filter.key] ?? ''}
          onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
          className="flex h-10 w-full max-w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {actions && actions.length > 0 && (
        <>
          <div className="flex-1" />
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Button
                key={i}
                variant={action.variant ?? 'outline'}
                size="sm"
                onClick={action.onClick}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {action.label}
              </Button>
            );
          })}
        </>
      )}
    </div>
  );
}
