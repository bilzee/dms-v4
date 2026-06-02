'use client'

import { useWatch } from 'react-hook-form'
import { ProgressBar } from '@/components/shared/ProgressBar'

interface FormProgressProps {
  control: any
  fields: string[]
  label?: string
  className?: string
}

export function FormProgress({
  control,
  fields,
  label = 'Form Completion',
  className,
}: FormProgressProps) {
  const values = useWatch({ control, name: fields })

  const filledCount = values.reduce((count: number, value: any) => {
    if (value === undefined || value === null || value === '') return count
    if (typeof value === 'number' && value === 0) return count
    if (Array.isArray(value) && value.length === 0) return count
    return count + 1
  }, 0)

  const percentage = fields.length > 0
    ? Math.round((filledCount / fields.length) * 100)
    : 0

  const variant = percentage >= 100 ? 'success' : percentage >= 50 ? 'default' : 'warning'

  return (
    <div className={className} data-testid="form-progress">
      <ProgressBar
        value={percentage}
        variant={variant}
        size="sm"
        showLabel
        label={label}
      />
    </div>
  )
}
