'use client'

import { cn } from '@/lib/utils'

type ProgressBarVariant = 'default' | 'success' | 'warning' | 'danger' | 'gradient'
type ProgressBarSize = 'sm' | 'default' | 'lg'

interface ProgressBarProps {
  value: number
  variant?: ProgressBarVariant
  size?: ProgressBarSize
  showLabel?: boolean
  label?: string
  className?: string
}

const sizeClasses: Record<ProgressBarSize, string> = {
  sm: 'h-1.5',
  default: 'h-2.5',
  lg: 'h-4',
}

const variantClasses: Record<ProgressBarVariant, string> = {
  default: 'bg-primary',
  success: 'bg-green-500 dark:bg-green-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  danger: 'bg-red-500 dark:bg-red-400',
  gradient: 'bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400',
}

export function ProgressBar({
  value,
  variant = 'default',
  size = 'default',
  showLabel = false,
  label,
  className,
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          {showLabel && (
            <span className="text-xs font-medium text-muted-foreground">{Math.round(clampedValue)}%</span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('rounded-full transition-all duration-300 ease-in-out', sizeClasses[size], variantClasses[variant])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
