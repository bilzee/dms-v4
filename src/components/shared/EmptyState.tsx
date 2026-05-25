'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { 
  Package, 
  FileText, 
  Users, 
  MapPin, 
  TrendingUp, 
  AlertTriangle, 
  Plus,
  Search,
  Filter,
  RefreshCw,
  Inbox,
  Database
} from '@/lib/icons'

interface EmptyStateProps {
  type?: 'default' | 'data' | 'search' | 'error' | 'network'
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  className?: string
  children?: React.ReactNode
}

const emptyStateConfig = {
  default: {
    icon: Inbox,
    title: "No data available",
    description: "There's nothing to show here right now."
  },
  data: {
    icon: Database,
    title: "No data found",
    description: "No data is available at the moment. Check back later or try refreshing."
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "Try adjusting your search terms or filters to find what you're looking for."
  },
  error: {
    icon: AlertTriangle,
    title: "Something went wrong",
    description: "We encountered an error while loading this content."
  },
  network: {
    icon: AlertTriangle,
    title: "Connection error",
    description: "Please check your internet connection and try again."
  }
}

export function EmptyState({ 
  type = 'default',
  title,
  description,
  icon: customIcon,
  action,
  className,
  children
}: EmptyStateProps) {
  const config = emptyStateConfig[type]
  const Icon = customIcon || config.icon

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-lg font-medium text-foreground mb-2">
          {title || config.title}
        </h3>
        
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description || config.description}
        </p>

        {children}

        {action && (
          <Button 
            variant={action.variant || 'default'} 
            onClick={action.onClick}
            className="flex items-center gap-2"
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Specific empty state components for different use cases
interface SpecificEmptyStateProps {
  onRefresh?: () => void
  onCreate?: () => void
  onSearch?: () => void
  onClearFilters?: () => void
  onAssign?: () => void
  className?: string
}

export function EmptyAssessments({ onCreate, onRefresh }: SpecificEmptyStateProps) {
  return (
    <EmptyState
      type="data"
      icon={FileText}
      title="No assessments yet"
      description="Create your first preliminary or rapid assessment to get started."
      action={onCreate ? {
        label: "Create Assessment",
        onClick: onCreate,
        variant: "default"
      } : onRefresh ? {
        label: "Refresh",
        onClick: onRefresh,
        variant: "outline"
      } : undefined}
    />
  )
}

export function EmptyResponses({ onCreate, onRefresh }: SpecificEmptyStateProps) {
  return (
    <EmptyState
      type="data"
      icon={Package}
      title="No responses assigned"
      description="You don't have any assigned responses yet. Contact your coordinator for assignments."
      action={onRefresh ? {
        label: "Refresh",
        onClick: onRefresh,
        variant: "outline"
      } : undefined}
    />
  )
}

export function EmptyEntities({ onAssign, onRefresh }: SpecificEmptyStateProps) {
  return (
    <EmptyState
      type="data"
      icon={MapPin}
      title="No entities assigned"
      description="No entities have been assigned to you yet. Contact coordinators to get assigned."
      action={onRefresh ? {
        label: "Refresh",
        onClick: onRefresh,
        variant: "outline"
      } : undefined}
    />
  )
}

export function EmptyCommitments({ onCreate, onRefresh }: SpecificEmptyStateProps) {
  return (
    <EmptyState
      type="data"
      icon={Package}
      title="No commitments yet"
      description="Make your first commitment to start supporting disaster response efforts."
      action={onCreate ? {
        label: "Make Commitment",
        onClick: onCreate,
        variant: "default"
      } : onRefresh ? {
        label: "Refresh", 
        onClick: onRefresh,
        variant: "outline"
      } : undefined}
    />
  )
}

export function EmptyIncidents({ onCreate, onRefresh }: SpecificEmptyStateProps) {
  return (
    <EmptyState
      type="data"
      icon={AlertTriangle}
      title="No incidents reported"
      description="No incidents have been reported in the system yet."
      action={onRefresh ? {
        label: "Refresh",
        onClick: onRefresh,
        variant: "outline"
      } : undefined}
    />
  )
}

export function EmptySearchResults({ onClearFilters, onSearch }: SpecificEmptyStateProps) {
  return (
    <EmptyState
      type="search"
      title="No results found"
      description="Try adjusting your search terms or filters to find what you're looking for."
      action={onClearFilters ? {
        label: "Clear Filters",
        onClick: onClearFilters,
        variant: "outline"
      } : undefined}
    />
  )
}

export function NetworkError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      type="network"
      action={{
        label: "Try Again",
        onClick: onRetry,
        variant: "default"
      }}
    />
  )
}