'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type FormCardVariant = 'default' | 'compact' | 'dialog'

interface FormCardContextValue {
  variant: FormCardVariant
}

const FormCardContext = React.createContext<FormCardContextValue>({ variant: 'default' })

interface FormCardProps {
  title?: string
  description?: string
  variant?: FormCardVariant
  columns?: 1 | 2
  className?: string
  children: React.ReactNode
}

const variantPadding: Record<FormCardVariant, string> = {
  default: '',
  compact: '',
  dialog: '',
}

const fieldSpacing: Record<FormCardVariant, string> = {
  default: 'space-y-6',
  compact: 'space-y-4',
  dialog: 'space-y-4',
}

function FormCard({
  title,
  description,
  variant = 'default',
  columns = 1,
  className,
  children,
}: FormCardProps) {
  return (
    <FormCardContext.Provider value={{ variant }}>
      <Card className={cn(variantPadding[variant], className)}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <div
            className={cn(
              fieldSpacing[variant],
              columns === 2 && 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 space-y-0'
            )}
          >
            {children}
          </div>
        </CardContent>
      </Card>
    </FormCardContext.Provider>
  )
}

function FormSection({
  title,
  description,
  children,
  className,
  fullWidth,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
}) {
  return (
    <div className={cn('space-y-4', fullWidth && 'md:col-span-2', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

function FormDivider({ className }: { className?: string }) {
  return <div className={cn('border-t', className)} />
}

FormCard.Section = FormSection
FormCard.Divider = FormDivider

export { FormCard }
export type { FormCardProps, FormCardVariant }
