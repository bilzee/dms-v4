'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

type FormActionBarAlign = 'end' | 'between' | 'start'
type FormActionBarVariant = 'default' | 'bordered'

interface FormActionBarProps {
  onCancel?: () => void
  cancelLabel?: string
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
  align?: FormActionBarAlign
  variant?: FormActionBarVariant
  children?: React.ReactNode
  className?: string
}

const alignClasses: Record<FormActionBarAlign, string> = {
  end: 'justify-end',
  between: 'justify-between',
  start: 'justify-start',
}

function FormActionBar({
  onCancel,
  cancelLabel = 'Cancel',
  onSubmit,
  submitLabel = 'Submit',
  loading = false,
  disabled = false,
  align = 'end',
  variant = 'default',
  children,
  className,
}: FormActionBarProps) {
  return (
    <div
      className={cn(
        'flex gap-3 pt-6',
        alignClasses[align],
        variant === 'bordered' && 'border-t',
        className
      )}
    >
      {children}
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
          {cancelLabel}
        </Button>
      )}
      <Button
        type="submit"
        onClick={onSubmit}
        disabled={disabled || loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  )
}

export { FormActionBar }
export type { FormActionBarProps }
