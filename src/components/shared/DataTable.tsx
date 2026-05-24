'use client';

import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchToolbar, type FilterConfig } from '@/components/shared/SearchToolbar';
import { cn } from '@/lib/utils';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

export interface RowAction {
  label: string;
  onClick: (itemId: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive';
}

export interface PaginationConfig {
  pageSize: number;
  total: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T extends { id?: string }> {
  title?: string;
  description?: string;
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyType?: 'default' | 'data' | 'search';
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  toolbarActions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost';
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  expandable?: boolean;
  renderExpanded?: (item: T) => React.ReactNode;
  pagination?: PaginationConfig;
  onRowClick?: (item: T) => void;
  actions?: RowAction[];
  headerActions?: React.ReactNode;
  className?: string;
}

export function DataTable<T extends { id?: string }>({
  title,
  description,
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  emptyType = 'data',
  searchable = false,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  toolbarActions,
  selectable = false,
  selectedIds,
  onSelectionChange,
  expandable = false,
  renderExpanded,
  pagination,
  onRowClick,
  actions,
  headerActions,
  className,
}: DataTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    const allIds = data.map((item) => item.id ?? '').filter(Boolean);
    if (selectedIds && selectedIds.size === allIds.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allIds));
    }
  }, [data, selectedIds, onSelectionChange]);

  const toggleSelect = useCallback(
    (id: string) => {
      if (!onSelectionChange) return;
      const next = new Set<string>(selectedIds ?? []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  const showToolbar = searchable || (filters && filters.length > 0) || (toolbarActions && toolbarActions.length > 0);

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
            actions={toolbarActions}
          />
        )}

        {loading ? (
          <TableSkeleton columns={columns.length + (expandable ? 1 : 0) + (selectable ? 1 : 0) + (actions ? 1 : 0)} rows={5} />
        ) : data.length === 0 ? (
          <EmptyState type={emptyType} title={emptyMessage} />
        ) : (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectable && (
                    <TableHead className="w-[40px]">
                      <input
                        type="checkbox"
                        checked={selectedIds != null && selectedIds.size === data.length && data.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-input"
                      />
                    </TableHead>
                  )}
                  {expandable && <TableHead className="w-[36px]" />}
                  {columns.map((col) => (
                    <TableHead key={col.key} style={col.width ? { width: col.width } : undefined}>
                      {col.header}
                    </TableHead>
                  ))}
                  {actions && actions.length > 0 && <TableHead className="w-[48px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, idx) => {
                  const itemId = item.id ?? String(idx);
                  const isExpanded = expandedRows.has(itemId);
                  const isSelected = selectedIds?.has(itemId);

                  return (
                    <React.Fragment key={itemId}>
                      <TableRow
                        className={cn(
                          'cursor-pointer',
                          isSelected && 'bg-muted',
                        )}
                        onClick={() => onRowClick?.(item)}
                      >
                        {selectable && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={isSelected ?? false}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelect(itemId);
                              }}
                              className="h-4 w-4 rounded border-input"
                            />
                          </TableCell>
                        )}
                        {expandable && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(itemId);
                              }}
                            >
                              <ChevronRight
                                className={cn(
                                  'h-3.5 w-3.5 text-muted-foreground transition-transform',
                                  isExpanded && 'rotate-90 text-primary',
                                )}
                              />
                            </Button>
                          </TableCell>
                        )}
                        {columns.map((col) => (
                          <TableCell key={col.key}>
                            {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                          </TableCell>
                        ))}
                        {actions && actions.length > 0 && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {actions.map((action, i) => {
                                  const Icon = action.icon;
                                  return (
                                    <DropdownMenuItem
                                      key={i}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        action.onClick(itemId);
                                      }}
                                      className={action.variant === 'destructive' ? 'text-red-600' : undefined}
                                    >
                                      {Icon && <Icon className="mr-2 h-4 w-4" />}
                                      {action.label}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                      {expandable && isExpanded && renderExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell
                            colSpan={
                              columns.length +
                              (expandable ? 1 : 0) +
                              (selectable ? 1 : 0) +
                              (actions ? 1 : 0)
                            }
                            className="p-0"
                          >
                            <div className="border-t p-4 pl-[52px]">
                              {renderExpanded(item)}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
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

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-12 flex-1 animate-pulse rounded bg-muted"
            />
          ))}
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
        Showing {start}-{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          &lsaquo;
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
          const page = i + 1;
          return (
            <Button
              key={page}
              variant={page === currentPage ? 'default' : 'outline'}
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          &rsaquo;
        </Button>
      </div>
    </div>
  );
}
