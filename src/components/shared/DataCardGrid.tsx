'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchToolbar, type FilterConfig } from '@/components/shared/SearchToolbar';
import { cn } from '@/lib/utils';

export interface DataCardGridProps<T extends { id?: string }> {
  title?: string;
  description?: string;
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyType?: 'default' | 'data' | 'search';
  columns?: 2 | 3 | 4;
  renderCard: (item: T) => React.ReactNode;
  onCardClick?: (item: T) => void;
  selectedId?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  headerActions?: React.ReactNode;
  className?: string;
}

const gridCols = {
  2: 'grid grid-cols-1 md:grid-cols-2',
  3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
} as const;

export function DataCardGrid<T extends { id?: string }>({
  title,
  description,
  data,
  loading = false,
  emptyMessage = 'No data found',
  emptyType = 'data',
  columns = 3,
  renderCard,
  onCardClick,
  selectedId,
  searchable = false,
  searchPlaceholder = 'Filter...',
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  headerActions,
  className,
}: DataCardGridProps<T>) {
  const showToolbar = searchable || (filters && filters.length > 0);
  const hasContent = title || description || headerActions;

  return (
    <Card className={cn(className)}>
      {hasContent && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              {title && <CardTitle className="text-lg font-semibold leading-none tracking-tight">{title}</CardTitle>}
              {description && <CardDescription className="mt-1.5">{description}</CardDescription>}
            </div>
            {headerActions}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(!hasContent && 'pt-6')}>
        {showToolbar && (
          <SearchToolbar
            searchPlaceholder={searchPlaceholder}
            searchValue={searchValue}
            onSearchChange={searchable ? onSearchChange : undefined}
            filters={filters}
            filterValues={filterValues}
            onFilterChange={onFilterChange}
          />
        )}

        {loading ? (
          <GridSkeleton columns={columns} count={columns} />
        ) : data.length === 0 ? (
          <EmptyState type={emptyType} title={emptyMessage} />
        ) : (
          <div className={cn(gridCols[columns], 'gap-4')}>
            {data.map((item, idx) => {
              const itemId = item.id ?? String(idx);
              const isSelected = selectedId === itemId;

              return (
                <div
                  key={itemId}
                  onClick={() => onCardClick?.(item)}
                  className={cn(
                    'rounded-lg border bg-card text-card-foreground shadow-sm p-5 transition-all',
                    onCardClick && 'cursor-pointer hover:shadow-md',
                    isSelected && 'border-primary/30',
                  )}
                >
                  {renderCard(item)}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GridSkeleton({ columns, count }: { columns: number; count: number }) {
  return (
    <div className={cn(gridCols[columns as keyof typeof gridCols] ?? gridCols[3], 'gap-4')}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-36 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-1.5 w-full rounded-full bg-muted" />
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
