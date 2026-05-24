'use client';

import { useEffect, useState } from 'react';
import { useConflicts } from '@/hooks/useConflicts';
import { ConflictApiResponse, ConflictDisplayGroup, ConflictFilters } from '@/types/conflict';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';

interface ConflictLogProps {
  className?: string;
  compact?: boolean;
}

export const ConflictLog = ({ className = '', compact = false }: ConflictLogProps) => {
  const {
    conflicts,
    summary,
    loading,
    error,
    pagination,
    fetchConflicts,
    fetchSummary,
    exportConflicts,
    refresh
  } = useConflicts();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ConflictFilters>({
    page: 1,
    limit: compact ? 5 : 20
  });

  useEffect(() => {
    fetchConflicts(filters);
    fetchSummary();
  }, [fetchConflicts, fetchSummary, filters]);

  const handleFilterChange = (newFilters: Partial<ConflictFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);
    fetchConflicts(updatedFilters);
  };

  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    fetchConflicts(updatedFilters);
  };

  const toggleGroupExpansion = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const groupConflictsByEntity = (conflicts: ConflictApiResponse[]): ConflictDisplayGroup[] => {
    const groups = new Map<string, ConflictDisplayGroup>();

    conflicts.forEach(conflict => {
      const groupKey = `${conflict.entityType}-${conflict.entityId}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          entityId: conflict.entityId,
          entityType: conflict.entityType,
          entityName: `${conflict.entityType} ${conflict.entityId.slice(0, 8)}`,
          conflicts: [],
          totalConflicts: 0,
          unresolvedCount: 0,
          lastConflictDate: conflict.conflictDate
        });
      }

      const group = groups.get(groupKey)!;
      group.conflicts.push(conflict);
      group.totalConflicts++;
      
      if (!conflict.isResolved) {
        group.unresolvedCount++;
      }

      if (new Date(conflict.conflictDate) > new Date(group.lastConflictDate)) {
        group.lastConflictDate = conflict.conflictDate;
      }
    });

    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.lastConflictDate).getTime() - new Date(a.lastConflictDate).getTime()
    );
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusIcon = (conflict: ConflictApiResponse) => {
    if (conflict.isResolved) {
      return (
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-xs text-green-700 font-medium">Resolved</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-red-700 font-medium">Unresolved</span>
      </div>
    );
  };

  const getResolutionMethodBadge = (method: string) => {
    const colors = {
      'LAST_WRITE_WINS': 'bg-blue-100 text-blue-800',
      'MANUAL': 'bg-purple-100 text-purple-800',
      'MERGE': 'bg-green-100 text-green-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {method.replace('_', '-')}
      </span>
    );
  };

  if (loading && conflicts.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <ContentSkeleton variant="list" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-700">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span className="font-medium">Error loading conflicts</span>
        </div>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button
          onClick={refresh}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const conflictGroups = groupConflictsByEntity(conflicts);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Sync Conflicts
            </h3>
            {summary && (
              <p className="text-sm text-gray-600">
                {summary.totalConflicts} total • {summary.unresolvedConflicts} unresolved
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              title="Refresh"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
              </svg>
            </button>
            
            {!compact && (
              <button
                onClick={() => exportConflicts(filters)}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {!compact && (
          <div className="flex gap-3 mt-4">
            <select
              value={filters.entityType || ''}
              onChange={(e) => handleFilterChange({ 
                entityType: e.target.value as ConflictFilters['entityType'] || undefined 
              })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Types</option>
              <option value="assessment">Assessment</option>
              <option value="response">Response</option>
              <option value="entity">Entity</option>
            </select>

            <select
              value={filters.resolved === undefined ? '' : filters.resolved.toString()}
              onChange={(e) => handleFilterChange({ 
                resolved: e.target.value === '' ? undefined : e.target.value === 'true' 
              })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Status</option>
              <option value="true">Resolved</option>
              <option value="false">Unresolved</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {conflictGroups.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17l6.09-6.09L17.5 9.5 10 17z"/>
            </svg>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No conflicts found</h4>
            <p className="text-gray-600">All data is synchronized without conflicts.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {conflictGroups.map((group) => {
              const groupKey = `${group.entityType}-${group.entityId}`;
              const isExpanded = expandedGroups.has(groupKey);

              return (
                <div key={groupKey} className="border border-gray-200 rounded-lg">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroupExpansion(groupKey)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{group.entityName}</span>
                        <span className="text-sm text-gray-500">({group.entityType})</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {group.totalConflicts} conflicts
                        </span>
                        {group.unresolvedCount > 0 && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                            {group.unresolvedCount} unresolved
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {formatRelativeTime(group.lastConflictDate)}
                      </span>
                      <svg 
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M7.41 8.84L12 13.42l4.59-4.58L18 10.25l-6 6-6-6z"/>
                      </svg>
                    </div>
                  </button>

                  {/* Group Content */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-200">
                      {group.conflicts.map((conflict) => (
                        <div key={conflict.id} className="px-4 py-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getStatusIcon(conflict)}
                                {getResolutionMethodBadge(conflict.resolutionMethod)}
                                <span className="text-sm text-gray-500">
                                  v{conflict.localVersion} ↔ v{conflict.serverVersion}
                                </span>
                              </div>
                              
                              <div className="text-sm text-gray-600">
                                <p>Conflict ID: <span className="font-mono">{conflict.id.slice(0, 8)}</span></p>
                                <p>Detected: {formatRelativeTime(conflict.conflictDate)}</p>
                                {conflict.resolvedAt && (
                                  <p>Resolved: {formatRelativeTime(conflict.resolvedAt)}</p>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm text-gray-900 font-medium mb-1">
                                {new Date(conflict.conflictDate).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(conflict.conflictDate).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!compact && pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} conflicts
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};