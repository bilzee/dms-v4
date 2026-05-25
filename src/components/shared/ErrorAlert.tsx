'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from '@/lib/icons'

type ErrorAlertVariant = 'destructive' | 'warning'

interface ErrorAlertProps {
  title?: string
  message?: string
  onRetry?: () => void
  variant?: ErrorAlertVariant
  className?: string
}

export function ErrorAlert({
  title = 'Error',
  message,
  onRetry,
  variant = 'destructive',
  className,
}: ErrorAlertProps) {
  return (
    <Alert variant={variant === 'destructive' ? 'destructive' : 'default'} className={cn(className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <p className="font-medium">{title}</p>
          {message && <p className="text-sm mt-1">{message}</p>}
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="ml-4 shrink-0">
            <RefreshCw className="mr-2 h-3 w-3" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
