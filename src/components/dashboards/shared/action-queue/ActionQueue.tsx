'use client';

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Eye } from '@/lib/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useActionSignals } from '@/hooks/useActionSignals';
import { SignalReasonIcon, REASON_LABELS } from './SignalReasonIcon';
import { SignalPriorityBadge, SignalPriorityDot, PRIORITY_CLASSES } from './SignalPriorityBadge';
import type { ActionSignalItem, SignalPriority } from '@/types/action-signal';

type SortOption = 'priority' | 'type' | 'entity' | 'incident';

interface ActionQueueProps {
  role: 'ASSESSOR' | 'RESPONDER' | 'DONOR' | 'COORDINATOR';
  sortBy?: SortOption;
  onItemSelect?: (signal: ActionSignalItem) => void;
  onItemAction?: (signal: ActionSignalItem) => void;
  onItemView?: (signal: ActionSignalItem) => void;
  selectedSignalId?: string | null;
  className?: string;
}

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

const ACTION_LABELS: Record<string, Record<string, string>> = {
  ASSESSOR: {
    'reassessment-needed': 'Reassess',
    'overdue': 'Start Assessment',
  },
  RESPONDER: {
    'awaiting-plan': 'Create Plan',
    'awaiting-plan-for-commitment': 'Create Plan',
    'awaiting-delivery': 'Confirm Delivery',
    'partially-fulfilled': 'View Commitment',
  },
  DONOR: {
    'assessment-needs-response': 'View',
    'plan-needs-commitment': 'Make Commitment',
    'partially-fulfilled': 'View Commitment',
    'partially-covered': 'View Plan',
  },
  COORDINATOR: {
    'assessment-awaiting-verification': 'Review Assessment',
    'delivery-awaiting-verification': 'Review Delivery',
    'verification-overdue': 'Review Now',
    'entity-needs-responder': 'Assign Responder',
    'entity-needs-donor': 'Assign Donor',
  },
};

export function ActionQueue({
  role,
  sortBy: initialSortBy = 'priority',
  onItemSelect,
  onItemAction,
  onItemView,
  selectedSignalId,
  className,
}: ActionQueueProps) {
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy);

  const result = useActionSignals({
    unresolvedOnly: true,
    limit: 100,
    activeRole: role,
  });

  const signals = (result.data?.signals ?? []) as ActionSignalItem[];
  const unresolvedCount = signals.length;
  const criticalCount = signals.filter(s => s.priority === 'CRITICAL').length;

  const sortedSignals = useMemo(() => {
    return [...signals].sort((a, b) => {
      if (sortBy === 'priority') {
        const pDiff = (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        const eDiff = (a.entity?.name || '').localeCompare(b.entity?.name || '');
        if (eDiff !== 0) return eDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'type') {
        const tDiff = a.type.localeCompare(b.type);
        if (tDiff !== 0) return tDiff;
        return (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
      }
      if (sortBy === 'entity') {
        const eDiff = (a.entity?.name || '').localeCompare(b.entity?.name || '');
        if (eDiff !== 0) return eDiff;
        return (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
      }
      if (sortBy === 'incident') {
        const iDiff = (a.incident?.name || '').localeCompare(b.incident?.name || '');
        if (iDiff !== 0) return iDiff;
        return (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
      }
      return 0;
    });
  }, [signals, sortBy]);

  if (result.isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full" />
        ))}
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="p-4">
        <EmptyState
          type="network"
          title="Failed to load action signals"
          description={result.error.message}
          action={{ label: 'Retry', onClick: () => result.refetch() }}
        />
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          type="default"
          title="All clear"
          description="No pending actions for your assigned entities."
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            Action Queue
          </span>
          <span className="text-xs text-muted-foreground">
            ({unresolvedCount} pending{criticalCount > 0 && `, ${criticalCount} critical`})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['priority', 'type', 'entity', 'incident'] as SortOption[]).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={sortBy === option ? 'default' : 'ghost'}
              className="text-xs h-7 px-2"
              onClick={() => setSortBy(option)}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        role="list"
        aria-label={`Action queue, ${unresolvedCount} pending items`}
        aria-live="polite"
      >
        {sortedSignals.map((signal) => {
          const priorityCls = PRIORITY_CLASSES[signal.priority as SignalPriority] || PRIORITY_CLASSES.MEDIUM;
          const actionLabel = ACTION_LABELS[role]?.[signal.signalReason] || 'View';
          const isSelected = selectedSignalId === signal.id;
          const typeLabel = signal.type !== 'COMMITMENT' && signal.type !== 'GENERAL' ? signal.type : '';

          return (
            <button
              key={signal.id}
              type="button"
              className={cn(
                'w-full text-left flex items-center gap-3 px-4 py-3 min-h-[60px] md:min-h-[72px] lg:min-h-[80px]',
                'transition-colors duration-150 border-b border-l-3',
                'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                priorityCls.border,
                isSelected && 'bg-primary/5 border-l-blue-500',
              )}
              onClick={() => onItemSelect?.(signal)}
              role="option"
              aria-selected={isSelected}
              aria-label={`${signal.entity?.name || 'Entity'} — ${typeLabel} ${REASON_LABELS[signal.signalReason]} — ${signal.priority} priority`}
            >
              <SignalPriorityDot priority={signal.priority as SignalPriority} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">
                    {typeLabel && <span className="text-muted-foreground">{typeLabel} · </span>}
                    {REASON_LABELS[signal.signalReason]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <SignalReasonIcon reason={signal.signalReason} priority={signal.priority as SignalPriority} size={14} />
                  <span className="text-xs text-muted-foreground truncate">
                    {signal.entity?.name || 'Unknown Entity'}
                    {signal.entity?.type && (
                      <span className="ml-1 opacity-60">({signal.entity.type})</span>
                    )}
                  </span>
                </div>
                {signal.incident?.name && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[11px] text-muted-foreground/70 truncate">
                      {signal.incident.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <SignalPriorityBadge priority={signal.priority as SignalPriority} />

                {onItemView && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="hidden lg:inline-flex text-xs h-7 px-2"
                    onClick={(e) => { e.stopPropagation(); onItemView(signal); }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                )}

                {onItemAction && (
                  <Button
                    size="sm"
                    variant="default"
                    className="hidden lg:inline-flex text-xs h-7 px-2"
                    onClick={(e) => { e.stopPropagation(); onItemAction(signal); }}
                  >
                    {actionLabel}
                  </Button>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
