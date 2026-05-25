'use client';

import { useEffect } from 'react';
import { useConflicts } from '@/hooks/useConflicts';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';

interface ConflictSummaryProps {
  className?: string;
  showTitle?: boolean;
  onConflictClick?: () => void;
}

export const ConflictSummary = ({ 
  className = '',
  showTitle = true,
  onConflictClick
}: ConflictSummaryProps) => {
  const { summary, fetchSummary, loading } = useConflicts();

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const getStatusColor = (unresolvedCount: number) => {
    if (unresolvedCount === 0) return 'text-green-600';
    if (unresolvedCount < 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (unresolvedCount: number) => {
    if (unresolvedCount === 0) {
      return (
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      );
    }
    return (
      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
    );
  };

  if (loading || !summary) {
    return (
      <div className={`bg-card rounded-lg border border-border p-4 ${className}`}>
        <ContentSkeleton variant="card" />
      </div>
    );
  }

  return (
    <div 
      className={`bg-card rounded-lg border border-border p-4 ${onConflictClick ? 'cursor-pointer hover:bg-muted transition-colors' : ''} ${className}`}
      onClick={onConflictClick}
    >
      {showTitle && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">Sync Conflicts</h3>
          {onConflictClick && (
            <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          )}
        </div>
      )}

      <div className="space-y-3">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(summary.unresolvedConflicts)}
            <span className="text-sm text-muted-foreground">
              {summary.unresolvedConflicts === 0 ? 'All resolved' : `${summary.unresolvedConflicts} unresolved`}
            </span>
          </div>
          <span className="text-sm font-medium text-foreground">
            {summary.totalConflicts} total
          </span>
        </div>

        {/* Resolution Rate */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Resolution rate</span>
          <span className={`text-sm font-medium ${getStatusColor(summary.unresolvedConflicts)}`}>
            {summary.resolutionRate}%
          </span>
        </div>

        {/* Progress Bar */}
        <ProgressBar value={summary.resolutionRate} variant="success" size="sm" />

        {/* Breakdown by Type (if there are conflicts) */}
        {summary.totalConflicts > 0 && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium text-foreground">{summary.conflictsByType.assessment}</div>
              <div className="text-muted-foreground">Assessments</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-foreground">{summary.conflictsByType.response}</div>
              <div className="text-muted-foreground">Responses</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-foreground">{summary.conflictsByType.entity}</div>
              <div className="text-muted-foreground">Entities</div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {summary.recentConflicts.length > 0 && (
          <div>
            <div className="text-xs font-medium text-foreground mb-1">Recent Activity</div>
            <div className="space-y-1">
              {summary.recentConflicts.slice(0, 2).map((conflict) => (
                <div key={conflict.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${conflict.isResolved ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true"></div>
                    <span className="text-muted-foreground">{conflict.entityType}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(conflict.conflictDate).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No conflicts message */}
        {summary.totalConflicts === 0 && (
          <div className="text-center py-2">
            <svg className="w-8 h-8 text-green-500 mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17l6.09-6.09L17.5 9.5 10 17z"/>
            </svg>
            <div className="text-xs text-muted-foreground">No conflicts detected</div>
          </div>
        )}
      </div>
    </div>
  );
};