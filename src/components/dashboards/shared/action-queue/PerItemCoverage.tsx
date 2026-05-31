'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PerItemCoverageProps {
  items: Array<{
    name: string;
    needed: number;
    committed: number;
    delivered: number;
    unit: string;
  }>;
  className?: string;
}

export function PerItemCoverage({ items, className }: PerItemCoverageProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className={cn('space-y-1.5', className)}>
      <table className="w-full text-xs" role="table" aria-label="Item coverage breakdown">
        <thead>
          <tr className="text-muted-foreground">
            <th scope="col" className="text-left font-normal pb-1">Item</th>
            <th scope="col" className="text-center font-normal pb-1 w-16">Needed</th>
            <th scope="col" className="text-center font-normal pb-1 w-16">Committed</th>
            <th scope="col" className="text-center font-normal pb-1 w-16">Delivered</th>
            <th scope="col" className="text-right font-normal pb-1 w-12">Gap</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const coveragePercent = item.needed > 0 ? Math.round((item.committed / item.needed) * 100) : 0;
            const isCovered = coveragePercent >= 100;
            const isPartial = coveragePercent > 0 && coveragePercent < 100;
            const gap = Math.max(0, item.needed - item.committed);

            return (
              <tr key={i} className="border-t border-border/50">
                <td className="py-1 font-medium">{item.name}</td>
                <td className="py-1 text-center text-muted-foreground">{item.needed} {item.unit}</td>
                <td className="py-1 text-center">
                  <span className={cn(
                    isCovered && 'text-green-700 dark:text-green-400',
                    isPartial && 'text-amber-700 dark:text-amber-400',
                    !isCovered && !isPartial && 'text-red-700 dark:text-red-400',
                  )}>
                    {item.committed} {item.unit}
                  </span>
                </td>
                <td className="py-1 text-center text-muted-foreground">
                  {item.delivered} {item.unit}
                </td>
                <td className="py-1 text-right">
                  {isCovered ? (
                    <span className="text-green-600" aria-label="Fully covered">&#10003;</span>
                  ) : (
                    <span className={cn(
                      'text-xs font-medium',
                      isPartial ? 'text-amber-600' : 'text-red-600',
                    )}>
                      -{gap}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
