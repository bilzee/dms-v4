'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from '@/lib/icons';
import { Button } from '@/components/ui/button';

export interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const gridCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-2 md:grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
} as const;

const gridGap = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
} as const;

const PAIR_SIZE = 2;

function getCardSummary(child: React.ReactNode): string | null {
  if (React.isValidElement(child)) {
    const props = child.props as { label?: string; value?: React.ReactNode; loading?: boolean };
    if (props.loading) {
      return props.label ?? null;
    }
    if (props.label !== undefined && props.value !== undefined) {
      return `${props.label}: ${props.value}`;
    }
  }
  return null;
}

export function StatCardGrid({
  children,
  columns = 4,
  gap = 'md',
  className,
}: StatCardGridProps) {
  const childArray = useMemo(() => React.Children.toArray(children), [children]);

  const pairs = useMemo(() => {
    const result: React.ReactNode[][] = [];
    for (let i = 0; i < childArray.length; i += PAIR_SIZE) {
      result.push(childArray.slice(i, i + PAIR_SIZE));
    }
    return result;
  }, [childArray]);

  const [collapsedPairs, setCollapsedPairs] = useState<Set<number>>(new Set());

  const togglePair = (index: number) => {
    setCollapsedPairs(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <>
      {/* Mobile: grouped collapsible summaries */}
      <div className="sm:hidden space-y-2">
        {pairs.map((pair, pairIndex) => {
          const summary = pair
            .map(getCardSummary)
            .filter(Boolean)
            .join('  ·  ');
          const isExpanded = !collapsedPairs.has(pairIndex);

          return (
            <div key={pairIndex}>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => togglePair(pairIndex)}
              >
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {summary || 'Statistics'}
                </span>
                <ChevronDown className={cn('h-4 w-4 flex-shrink-0 transition-transform', !isExpanded && '-rotate-90')} />
              </Button>
              {isExpanded && (
                <div className={cn('mt-2 grid', gridCols[columns], gridGap[gap], className)}>
                  {pair}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: always expanded grid */}
      <div className={cn('hidden sm:grid', gridCols[columns], gridGap[gap], className)}>
        {children}
      </div>
    </>
  );
}
