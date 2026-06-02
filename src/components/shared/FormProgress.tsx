'use client'

import { useWatch } from 'react-hook-form'
import { ProgressBar } from '@/components/shared/ProgressBar'

interface FormProgressProps {
  control: any
  requiredFields: string[]
  label?: string
  className?: string
}

export function FormProgress({
  control,
  requiredFields,
  label = 'Form Completion',
  className,
}: FormProgressProps) {
  const values = useWatch({ control, name: requiredFields })

  const filledCount = values.reduce((count: number, value: any) => {
    if (value === undefined || value === null || value === '') return count
    if (typeof value === 'number' && value === 0) return count
    if (Array.isArray(value) && value.length === 0) return count
    if (typeof value === 'boolean') return count + 1
    return count + 1
  }, 0)

  const percentage = requiredFields.length > 0
    ? Math.round((filledCount / requiredFields.length) * 100)
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
