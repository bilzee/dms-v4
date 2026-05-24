'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

type ContentSkeletonVariant = 'card' | 'table' | 'list' | 'metric' | 'form'

interface ContentSkeletonProps {
  variant: ContentSkeletonVariant
  rows?: number
  cols?: number
  count?: number
  className?: string
}

function CardSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-2/5" />
    </div>
  )
}

function TableSkeleton({ rows = 3, cols = 4 }: { rows: number; cols: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

function ListSkeleton({ count = 3 }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

function MetricSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="space-y-3 pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

export function ContentSkeleton({
  variant,
  rows = 3,
  cols = 4,
  count = 3,
  className,
}: ContentSkeletonProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      {variant === 'card' && <CardSkeleton />}
      {variant === 'table' && <TableSkeleton rows={rows} cols={cols} />}
      {variant === 'list' && <ListSkeleton count={count} />}
      {variant === 'metric' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
      )}
      {variant === 'form' && <FormSkeleton />}
    </div>
  )
}
