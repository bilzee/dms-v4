'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from '@/lib/icons';
import {
  severityCardColors,
  severityIconColors,
  severityValueColors,
  type SeverityLevel,
} from '@/lib/utils/status-colors';

/**
 * StatCard — unified metric display component for DRMS dashboards.
 *
 * Read StatCard.rules.md (co-located in this directory) for the variant
 * assignment logic. Quick reference:
 *
 *   Row 1 (primary metrics):  variant="tinted" + severity + trend when available
 *   Row 2+ (secondary):       variant="compact" + severity
 *   Rank / score contexts:     variant="centered" + severity="info"|"neutral"
 *
 * Colour semantics — always pick the severity that matches the *meaning*:
 *   critical  → alert / danger  (active incidents, rejected items)
 *   high      → urgent          (high-priority queue items)
 *   medium    → moderate        (in-progress counts)
 *   low       → nominal         (low-priority items)
 *   warning   → pending         (pending verifications, awaiting action)
 *   info      → informational   (total counts, system health)
 *   success   → positive        (verified, completed, approved)
 *   neutral   → generic         (fallback, no strong signal)
 */

type Variant = 'tinted' | 'compact' | 'centered';

export interface TrendData {
  value: number;
  label?: string;
}

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  severity?: SeverityLevel;
  variant?: Variant;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: TrendData | null;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  severity = 'neutral',
  variant = 'tinted',
  icon: Icon,
  trend,
  loading = false,
  className,
}: StatCardProps) {
  const cardBg = severityCardColors[severity];
  const iconColor = severityIconColors[severity];
  const valueColor = severityValueColors[severity];

  if (loading) {
    return <StatCardSkeleton variant={variant} className={className} />;
  }

  const trendDirection = trend && trend.value > 0 ? 'up' : trend && trend.value < 0 ? 'down' : null;

  if (variant === 'compact') {
    return (
      <Card className={cn('transition-colors', cardBg, className)}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            <p className={cn('text-lg font-bold tracking-tight mt-0.5', valueColor)}>
              {value}
            </p>
          </div>
          {Icon && <Icon className={cn('h-5 w-5 shrink-0 ml-2', iconColor)} />}
        </div>
        {trend && trendDirection && (
          <div className="px-4 pb-3 pt-0">
            <TrendIndicator direction={trendDirection} label={trend.label} compact />
          </div>
        )}
      </Card>
    );
  }

  if (variant === 'centered') {
    return (
      <Card className={cn('transition-colors', cardBg, className)}>
        <div className="flex flex-col items-center py-5 px-4 text-center">
          {Icon && <Icon className={cn('h-7 w-7 mb-2', iconColor)} />}
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn('text-2xl font-bold tracking-tight mt-1', valueColor)}>
            {value}
          </p>
          {trend && trendDirection && (
            <div className="mt-2">
              <TrendIndicator direction={trendDirection} label={trend.label} />
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('transition-colors', cardBg, className)}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className={cn('text-2xl font-bold tracking-tight mt-2', valueColor)}>
              {value}
            </p>
            {trend && trendDirection && (
              <div className="mt-3">
                <TrendIndicator direction={trendDirection} label={trend.label} />
              </div>
            )}
          </div>
          {Icon && (
            <Icon className={cn('h-6 w-6 shrink-0 ml-3 mt-0.5 text-muted-foreground')} />
          )}
        </div>
      </div>
    </Card>
  );
}

function TrendIndicator({
  direction,
  label,
  compact = false,
}: {
  direction: 'up' | 'down';
  label?: string;
  compact?: boolean;
}) {
  const isUp = direction === 'up';
  const Arrow = isUp ? ArrowUpRight : ArrowDownRight;
  const color = isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className={cn('inline-flex items-center gap-1', color)}>
      <Arrow className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {label && (
        <span className={compact ? 'text-xs font-medium' : 'text-xs font-medium'}>
          {label}
        </span>
      )}
    </div>
  );
}

export function StatCardSkeleton({
  variant = 'tinted',
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  if (variant === 'compact') {
    return (
      <Card className={cn('animate-pulse', className)}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex-1">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-5 w-14 bg-muted rounded mt-1.5" />
          </div>
          <div className="h-5 w-5 bg-muted rounded shrink-0 ml-2" />
        </div>
      </Card>
    );
  }

  if (variant === 'centered') {
    return (
      <Card className={cn('animate-pulse', className)}>
        <div className="flex flex-col items-center py-5 px-4">
          <div className="h-7 w-7 bg-muted rounded mb-2" />
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-7 w-20 bg-muted rounded mt-1" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('animate-pulse', className)}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-8 w-20 bg-muted rounded mt-2" />
            <div className="h-3 w-16 bg-muted rounded mt-3" />
          </div>
          <div className="h-6 w-6 bg-muted rounded shrink-0 ml-3 mt-0.5" />
        </div>
      </div>
    </Card>
  );
}
