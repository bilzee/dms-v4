'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SignalReasonIcon, REASON_LABELS } from './SignalReasonIcon';
import { SignalPriorityBadge, SignalPriorityDot, PRIORITY_CLASSES } from './SignalPriorityBadge';
import type { ActionSignalItem, SignalPriority } from '@/types/action-signal';

const ACTION_LABELS: Record<string, Record<string, string>> = {
  ASSESSOR: {
    'unassessed': 'Start Assessment',
    'reassessment-needed': 'Reassess',
    'overdue': 'Start Assessment',
  },
  RESPONDER: {
    'awaiting-plan': 'Create Plan',
    'awaiting-plan-for-commitment': 'Create Plan',
    'awaiting-delivery': 'Confirm Delivery',
    'partially-covered': 'View Plan',
  },
  DONOR: {
    'plan-needs-commitment': 'Make Commitment',
    'partially-fulfilled': 'View Commitment',
    'commitment-awaiting-plan': 'View Details',
    'unassessed': 'View',
    'reassessment-needed': 'View',
    'overdue': 'View',
    'awaiting-plan': 'View',
    'awaiting-delivery': 'View',
  },
  COORDINATOR: {
    'unassessed': 'Assign Assessor',
    'awaiting-plan': 'Assign Responder',
    'awaiting-delivery': 'Review',
    'overdue': 'Review',
    'verify-assessment': 'Verify',
    'verify-response': 'Verify',
    'verify-delivery': 'Verify',
    'need-assessor': 'Assign',
    'need-responder': 'Assign',
  },
};

interface ActionQueueItemProps {
  signal: ActionSignalItem;
  role: string;
  isGrouped?: boolean;
  subItems?: ActionSignalItem[];
  isExpanded?: boolean;
  isSelected?: boolean;
  onSelect: (signal: ActionSignalItem) => void;
  onExpand?: () => void;
  onAction?: (signal: ActionSignalItem) => void;
  className?: string;
}

export function ActionQueueItem({
  signal,
  role,
  isGrouped,
  subItems,
  isExpanded,
  isSelected,
  onSelect,
  onExpand,
  onAction,
  className,
}: ActionQueueItemProps) {
  const priorityCls = PRIORITY_CLASSES[signal.priority as SignalPriority] || PRIORITY_CLASSES.MEDIUM;
  const actionLabel = ACTION_LABELS[role]?.[signal.signalReason] || 'View';

  return (
    <div className={cn('border-b last:border-b-0', className)}>
      <button
        type="button"
        className={cn(
          'w-full text-left flex items-center gap-3 px-4 py-3 min-h-[60px] md:min-h-[72px] lg:min-h-[80px]',
          'transition-colors duration-150 border-l-3',
          'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          priorityCls.border,
          isSelected && 'bg-primary/5 border-l-blue-500',
        )}
        onClick={() => onSelect(signal)}
        role="option"
        aria-selected={isSelected}
        aria-label={`${signal.entity?.name || 'Entity'} — ${signal.type !== 'COMMITMENT' && signal.type !== 'GENERAL' ? signal.type + ' ' : ''}${REASON_LABELS[signal.signalReason]} — ${signal.priority} priority`}
        data-testid="action-queue-item"
      >
        <SignalPriorityDot priority={signal.priority as SignalPriority} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{signal.entity?.name || 'Unknown Entity'}</span>
            {signal.entity?.type && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                {signal.entity.type}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <SignalReasonIcon reason={signal.signalReason} priority={signal.priority as SignalPriority} size={14} />
            <span className="text-xs text-muted-foreground truncate">
              {signal.type !== 'COMMITMENT' && signal.type !== 'GENERAL' ? `${signal.type} ` : ''}
              {REASON_LABELS[signal.signalReason]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SignalPriorityBadge priority={signal.priority as SignalPriority} />

          {onAction && (
            <Button
              size="sm"
              variant="default"
              className="hidden lg:inline-flex text-xs h-7 px-2"
              onClick={(e) => { e.stopPropagation(); onAction(signal); }}
            >
              {actionLabel}
            </Button>
          )}

          {isGrouped && onExpand && (
            <span
              className="p-1 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onExpand(); }}
              role="button"
              aria-expanded={isExpanded}
              tabIndex={0}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
        </div>
      </button>

      {isGrouped && isExpanded && subItems && subItems.length > 0 && (
        <div className="pl-8 border-l-2 ml-5 border-muted">
          {subItems.map((sub) => (
            <SubQueueItem
              key={sub.id}
              signal={sub}
              role={role}
              isSelected={!!isSelected && sub.id === signal.id}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubQueueItem({
  signal,
  role,
  isSelected,
  onSelect,
  onAction,
}: {
  signal: ActionSignalItem;
  role: string;
  isSelected: boolean;
  onSelect: (s: ActionSignalItem) => void;
  onAction?: (s: ActionSignalItem) => void;
}) {
  const priorityCls = PRIORITY_CLASSES[signal.priority as SignalPriority] || PRIORITY_CLASSES.MEDIUM;
  const actionLabel = ACTION_LABELS[role]?.[signal.signalReason] || 'View';

  return (
    <button
      type="button"
      className={cn(
        'w-full text-left flex items-center gap-3 px-3 py-2 min-h-[48px]',
        'transition-colors duration-150 border-l-2',
        'hover:bg-muted/50',
        priorityCls.border,
        isSelected && 'bg-primary/5 border-l-blue-500',
      )}
      onClick={() => onSelect(signal)}
      role="option"
      aria-selected={isSelected}
    >
      <SignalPriorityDot priority={signal.priority as SignalPriority} className="w-2 h-2" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <SignalReasonIcon reason={signal.signalReason} priority={signal.priority as SignalPriority} size={12} />
          <span className="text-xs text-muted-foreground truncate">
            {signal.type !== 'COMMITMENT' && signal.type !== 'GENERAL' ? `${signal.type} ` : ''}
            {REASON_LABELS[signal.signalReason]}
          </span>
        </div>
        {signal.incident?.name && (
          <span className="text-[10px] text-muted-foreground">{signal.incident.name}</span>
        )}
      </div>
      <SignalPriorityBadge priority={signal.priority as SignalPriority} />
      {onAction && (
        <Button
          size="sm"
          variant="outline"
          className="text-[10px] h-6 px-1.5"
          onClick={(e) => { e.stopPropagation(); onAction(signal); }}
        >
          {actionLabel}
        </Button>
      )}
    </button>
  );
}
