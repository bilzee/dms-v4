'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchToolbar, type FilterConfig } from '@/components/shared/SearchToolbar';
import { cn } from '@/lib/utils';
import { ChevronRight } from '@/lib/icons';
import { getSeverityCardClasses, type SeverityLevel } from '@/lib/utils/status-colors';

export interface ExpandedCardProps {
  isExpanded: boolean;
  toggleExpand: () => void;
}

export interface PaginationConfig {
  pageSize: number;
  total: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export interface DataCardListProps<T extends { id?: string }> {
  title?: string;
  description?: string;
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyType?: 'default' | 'data' | 'search';
  renderCard: (item: T, expandProps: ExpandedCardProps) => React.ReactNode;
  getSeverity?: (item: T) => SeverityLevel;
  expandable?: boolean;
  renderExpanded?: (item: T) => React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  pagination?: PaginationConfig;
  cardPadding?: 'sm' | 'md' | 'lg';
  headerActions?: React.ReactNode;
  className?: string;
}

const paddingMap = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

export function DataCardList<T extends { id?: string }>({
  title,
  description,
  data,
  loading = false,
  emptyMessage = 'No data found',
  emptyType = 'data',
  renderCard,
  getSeverity,
  expandable = false,
  renderExpanded,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  pagination,
  cardPadding = 'md',
  headerActions,
  className,
}: DataCardListProps<T>) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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
          <CardListSkeleton count={4} />
        ) : data.length === 0 ? (
          <EmptyState type={emptyType} title={emptyMessage} />
        ) : (
          <div className="flex flex-col gap-3">
            {data.map((item, idx) => {
              const itemId = item.id ?? String(idx);
              const isExpanded = expandedItems.has(itemId);
              const severity = getSeverity?.(item);
              const severityBg = severity ? getSeverityCardClasses(severity) : '';

              return (
                <div
                  key={itemId}
                  className={cn(
                    'card rounded-lg border bg-card text-card-foreground shadow-sm transition-colors',
                    severityBg,
                    paddingMap[cardPadding],
                  )}
                >
                  {renderCard(item, {
                    isExpanded,
                    toggleExpand: () => toggleExpanded(itemId),
                  })}
                  {expandable && isExpanded && renderExpanded && (
                    <div className="mt-3 border-t pt-4">
                      {renderExpanded(item)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pagination && (
          <PaginationBar
            currentPage={pagination.currentPage}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={pagination.onPageChange}
          />
        )}
      </CardContent>
    </Card>
  );
}

export { ChevronRight };

function CardListSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-6">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PaginationBar({
  currentPage,
  total,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex items-center justify-between py-3 text-sm text-muted-foreground">
      <span>
        Showing {start}-{end} of {total} items
      </span>
      <div className="flex items-center gap-1">
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          &lsaquo;
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
          const page = i + 1;
          const isActive = page === currentPage;
          return (
            <button
              key={page}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground border border-primary'
                  : 'border border-input bg-background hover:bg-accent',
              )}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          );
        })}
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          &rsaquo;
        </button>
      </div>
    </div>
  );
}
