'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { SignalPriority } from '@/types/action-signal';

const PRIORITY_CLASSES: Record<SignalPriority, { dot: string; text: string; bg: string; border: string; pulse: string }> = {
  CRITICAL: {
    dot: 'bg-red-500 dark:bg-red-500',
    text: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-l-red-500 dark:border-l-red-500',
    pulse: 'animate-pulse',
  },
  HIGH: {
    dot: 'bg-orange-500 dark:bg-orange-500',
    text: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-l-orange-500 dark:border-l-orange-500',
    pulse: '',
  },
  MEDIUM: {
    dot: 'bg-amber-500 dark:bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-l-amber-500 dark:border-l-amber-500',
    pulse: '',
  },
  LOW: {
    dot: 'bg-slate-400 dark:bg-slate-400',
    text: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-950/30',
    border: 'border-l-slate-400 dark:border-l-slate-400',
    pulse: '',
  },
};

interface SignalPriorityBadgeProps {
  priority: SignalPriority;
  showDot?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export function SignalPriorityBadge({ priority, showDot = true, size = 'sm', className }: SignalPriorityBadgeProps) {
  const cls = PRIORITY_CLASSES[priority];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5 rounded' : 'text-xs px-2 py-0.5 rounded',
        cls.text,
        cls.bg,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'rounded-full',
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
            cls.dot,
            cls.pulse
          )}
        />
      )}
      {priority}
    </span>
  );
}

export function SignalPriorityDot({ priority, className }: { priority: SignalPriority; className?: string }) {
  const cls = PRIORITY_CLASSES[priority];
  return (
    <span
      className={cn('w-3 h-3 rounded-full shrink-0', cls.dot, cls.pulse, className)}
      aria-hidden="true"
    />
  );
}

export { PRIORITY_CLASSES };
