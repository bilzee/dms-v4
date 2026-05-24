'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const gridCols = {
  2: 'grid grid-cols-1 md:grid-cols-2',
  3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  5: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
} as const;

const gridGap = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
} as const;

export function StatCardGrid({
  children,
  columns = 4,
  gap = 'md',
  className,
}: StatCardGridProps) {
  return (
    <div className={cn(gridCols[columns], gridGap[gap], className)}>
      {children}
    </div>
  );
}
