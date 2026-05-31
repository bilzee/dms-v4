'use client';

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ActionQueueItem } from './ActionQueueItem';
import { useActionSignals } from '@/hooks/useActionSignals';
import { useCoordinatorActions } from '@/hooks/useCoordinatorActions';
import { SIGNAL_REASON_ROLES } from '@/types/action-signal';
import type { ActionSignalItem } from '@/types/action-signal';

type SortOption = 'priority' | 'type' | 'entity';

interface ActionQueueProps {
  role: 'ASSESSOR' | 'RESPONDER' | 'DONOR' | 'COORDINATOR';
  sortBy?: SortOption;
  onItemSelect?: (signal: ActionSignalItem) => void;
  onItemAction?: (signal: ActionSignalItem) => void;
  selectedSignalId?: string | null;
  className?: string;
}

export function ActionQueue({
  role,
  sortBy: initialSortBy = 'priority',
  onItemSelect,
  onItemAction,
  selectedSignalId,
  className,
}: ActionQueueProps) {
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const isCoordinator = role === 'COORDINATOR';

  const signalsResult = useActionSignals({
    unresolvedOnly: true,
    grouped: true,
    limit: 100,
    activeRole: role,
    enabled: !isCoordinator,
  });

  const coordinatorResult = useCoordinatorActions({
    enabled: isCoordinator,
  });

  const activeResult = isCoordinator ? coordinatorResult : signalsResult;

  const allSignals: ActionSignalItem[] = useMemo(() => {
    if (isCoordinator) {
      const items = coordinatorResult.data?.items ?? [];
      return items.map(item => ({
        id: item.id,
        userId: '',
        entityId: item.entityId,
        incidentId: null,
        type: item.type,
        signalReason: item.signalReason as any,
        priority: item.priority as any,
        context: item.context as any,
        createdAt: new Date(item.createdAt),
        resolvedAt: null,
        entity: item.entity,
      }));
    }
    return (signalsResult.data?.signals ?? []) as ActionSignalItem[];
  }, [isCoordinator, coordinatorResult.data, signalsResult.data]);

  const groups = useMemo(() => {
    if (isCoordinator) {
      const coordGroups = coordinatorResult.data?.groups ?? [];
      return coordGroups.map(g => ({
        entityId: g.entityId,
        entityName: g.entityName,
        entityType: g.entityType,
        entityLocation: g.entityLocation,
        entityCoordinates: g.entityCoordinates,
        type: g.type,
        signals: g.signals.map(item => ({
          id: item.id,
          userId: '',
          entityId: item.entityId,
          incidentId: null,
          type: item.type,
          signalReason: item.signalReason as any,
          priority: item.priority as any,
          context: item.context as any,
          createdAt: new Date(item.createdAt),
          resolvedAt: null,
          entity: item.entity,
        })),
        count: g.count,
        highestPriority: g.highestPriority as any,
      }));
    }

    const allGroups = signalsResult.data?.groups ?? [];
    return allGroups.map(g => ({
      ...g,
      signals: g.signals.filter(s => {
        const allowedReasons = Object.entries(SIGNAL_REASON_ROLES)
          .filter(([, r]) => r.includes(role as any))
          .map(([reason]) => reason);
        return allowedReasons.includes(s.signalReason);
      }),
    })).filter(g => g.signals.length > 0).map(g => ({
      ...g,
      count: g.signals.length,
    }));
  }, [isCoordinator, coordinatorResult.data, signalsResult.data, role]);

  const signals = useMemo(() => {
    if (isCoordinator) return allSignals;
    return allSignals.filter(s => {
      const allowedReasons = Object.entries(SIGNAL_REASON_ROLES)
        .filter(([, r]) => r.includes(role as any))
        .map(([reason]) => reason);
      return allowedReasons.includes(s.signalReason);
    });
  }, [allSignals, role, isCoordinator]);

  const isLoading = activeResult.isLoading;
  const error = activeResult.error;

  const unresolvedCount = signals.length;
  const criticalCount = signals.filter(s => s.priority === 'CRITICAL').length;

  const sortedGroups = useMemo(() => {
    if (sortBy === 'priority') return groups;
    return [...groups].sort((a, b) => {
      if (sortBy === 'type') return a.type.localeCompare(b.type);
      if (sortBy === 'entity') return a.entityName.localeCompare(b.entityName);
      return 0;
    });
  }, [groups, sortBy]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <EmptyState
          type="network"
          title="Failed to load action signals"
          description={error.message}
          action={{ label: 'Retry', onClick: () => activeResult.refetch() }}
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
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            Action Queue
          </span>
          <span className="text-xs text-muted-foreground">
            ({unresolvedCount} pending{criticalCount > 0 && `, ${criticalCount} critical`})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['priority', 'type', 'entity'] as SortOption[]).map((option) => (
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
        {sortedGroups.map((group) => {
          const groupKey = `${group.entityId}:${group.type}`;
          const isExpanded = expandedGroups.has(groupKey);
          const primarySignal = group.signals[0];

          return (
            <ActionQueueItem
              key={groupKey}
              signal={primarySignal}
              role={role}
              isGrouped={group.count > 1}
              subItems={group.signals.slice(1)}
              isExpanded={isExpanded}
              isSelected={selectedSignalId === primarySignal.id}
              onSelect={(s) => onItemSelect?.(s)}
              onExpand={() => toggleGroup(groupKey)}
              onAction={onItemAction}
            />
          );
        })}
      </div>
    </div>
  );
}
