'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AlertCircle, Activity } from '@/lib/icons'
import { useActiveIncidents } from '@/hooks/useIncidents'
import { cn } from '@/lib/utils'

interface IncidentSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  label?: string
  description?: string
  placeholder?: string
  className?: string
}

export function IncidentSelector({
  value,
  onValueChange,
  disabled = false,
  required = true,
  label = 'Incident',
  description = 'Select the incident this assessment is related to',
  placeholder = 'Select an active incident',
  className
}: IncidentSelectorProps) {
  const { data: incidents, isLoading, error } = useActiveIncidents()

  if (error) {
    return (
      <FormItem className={className}>
        <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
          <AlertCircle className="h-4 w-4" />
          Failed to load incidents. Please try again.
        </div>
        <FormMessage />
      </FormItem>
    )
  }

  const getSelectedLabel = () => {
    if (!value || !incidents) return null
    const incident = incidents.find(i => i.id === value)
    if (!incident) return null
    return (
      <span className="flex items-center gap-2">
        <span className="font-medium">{incident.type}</span>
        <span className="text-muted-foreground">—</span>
        <span>{incident.location}</span>
        <StatusBadge status={incident.severity} domain="severity" size="sm" />
      </span>
    )
  }

  return (
    <FormItem className={className}>
      <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
      <Select 
        value={value} 
        onValueChange={onValueChange}
        disabled={disabled || isLoading}
      >
        <FormControl>
          <SelectTrigger className={cn(
            "w-full",
            !value && "text-muted-foreground"
          )}>
            {value && incidents?.length ? getSelectedLabel() : (
              <SelectValue placeholder={isLoading ? "Loading incidents..." : placeholder} />
            )}
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {incidents?.map((incident) => (
            <SelectItem key={incident.id} value={incident.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{incident.type}</span>
                <span className="text-muted-foreground">—</span>
                <span className="text-muted-foreground">{incident.location}</span>
                <StatusBadge 
                  status={incident.severity} 
                  domain="severity" 
                  size="sm" 
                />
              </div>
            </SelectItem>
          ))}
          {incidents?.length === 0 && (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              No active incidents found
            </div>
          )}
        </SelectContent>
      </Select>
      {description && (
        <FormDescription>
          {description}
        </FormDescription>
      )}
      <FormMessage />
    </FormItem>
  )
}
