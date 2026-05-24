import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  verificationStatusBadgeColors,
  responseStatusBadgeColors,
} from '@/lib/utils/status-colors'

type Domain = 'severity' | 'verification' | 'response' | 'incident' | 'commitment' | 'system' | 'report' | 'role' | 'donorType' | 'conflictResolution' | 'assessment'

const severityBadgeColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  LOW: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  critical: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  high: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  low: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
}

const incidentBadgeColors: Record<string, string> = {
  ACTIVE: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  CONTAINED: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
}

const commitmentBadgeColors: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  PARTIAL: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  COMPLETE: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  FULFILLED: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
}

const systemBadgeColors: Record<string, string> = {
  ONLINE: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  OFFLINE: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  SYNCING: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  ERROR: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  connected: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  connecting: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  disconnected: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
}

const reportBadgeColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  RUNNING: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  FAILED: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
}

const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  COORDINATOR: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  ASSESSOR: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  RESPONDER: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  DONOR: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
}

const donorTypeBadgeColors: Record<string, string> = {
  ORGANIZATION: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  INDIVIDUAL: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  GOVERNMENT: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  NGO: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
}

const conflictResolutionBadgeColors: Record<string, string> = {
  LAST_WRITE_WINS: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  MANUAL: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  MERGE: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
}

const assessmentBadgeColors: Record<string, string> = {
  GAP: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  NO_GAP: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  PUBLIC_HEALTH_RISK: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
}

const responseBadgeColors: Record<string, string> = {
  ...responseStatusBadgeColors,
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
}

const domainMaps: Record<Domain, Record<string, string>> = {
  severity: severityBadgeColors,
  verification: verificationStatusBadgeColors,
  response: responseBadgeColors,
  incident: incidentBadgeColors,
  commitment: commitmentBadgeColors,
  system: systemBadgeColors,
  report: reportBadgeColors,
  role: roleBadgeColors,
  donorType: donorTypeBadgeColors,
  conflictResolution: conflictResolutionBadgeColors,
  assessment: assessmentBadgeColors,
}

const FALLBACK = 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'

const dotColorMap: Record<Domain, Record<string, string>> = {
  severity: {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-green-500',
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  },
  verification: {
    DRAFT: 'bg-gray-500',
    SUBMITTED: 'bg-amber-500',
    VERIFIED: 'bg-green-500',
    AUTO_VERIFIED: 'bg-blue-500',
    REJECTED: 'bg-red-500',
    PUBLISHED: 'bg-blue-500',
  },
  response: {
    PLANNED: 'bg-blue-500',
    IN_PROGRESS: 'bg-yellow-500',
    COMPLETED: 'bg-green-500',
    CANCELLED: 'bg-gray-500',
  },
  incident: {
    ACTIVE: 'bg-red-500',
    CONTAINED: 'bg-yellow-500',
    RESOLVED: 'bg-green-500',
  },
  commitment: {
    PLANNED: 'bg-blue-500',
    PARTIAL: 'bg-amber-500',
    COMPLETE: 'bg-green-500',
    FULFILLED: 'bg-green-500',
    CANCELLED: 'bg-gray-500',
  },
  system: {
    ONLINE: 'bg-green-500',
    OFFLINE: 'bg-red-500',
    SYNCING: 'bg-blue-500',
    ERROR: 'bg-red-500',
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-orange-500',
  },
  report: {
    PENDING: 'bg-yellow-500',
    RUNNING: 'bg-blue-500',
    COMPLETED: 'bg-green-500',
    FAILED: 'bg-red-500',
  },
  role: {
    ADMIN: 'bg-purple-500',
    COORDINATOR: 'bg-blue-500',
    ASSESSOR: 'bg-green-500',
    RESPONDER: 'bg-orange-500',
    DONOR: 'bg-teal-500',
  },
  donorType: {
    ORGANIZATION: 'bg-blue-500',
    INDIVIDUAL: 'bg-green-500',
    GOVERNMENT: 'bg-purple-500',
    NGO: 'bg-teal-500',
  },
  conflictResolution: {
    LAST_WRITE_WINS: 'bg-yellow-500',
    MANUAL: 'bg-orange-500',
    MERGE: 'bg-blue-500',
  },
  assessment: {
    GAP: 'bg-red-500',
    NO_GAP: 'bg-green-500',
    PUBLIC_HEALTH_RISK: 'bg-red-500',
  },
}

const statusBadgeVariants = cva('', {
  variants: {
    size: {
      sm: 'text-xs px-2 py-0.5',
      default: 'text-xs px-2.5 py-0.5',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

function getBadgeClasses(domain: Domain, status: string): string {
  return domainMaps[domain]?.[status] ?? FALLBACK
}

function getDotColor(domain: Domain, status: string): string {
  return dotColorMap[domain]?.[status] ?? 'bg-gray-500'
}

function formatLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

export interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: string
  domain: Domain
  label?: string
  icon?: React.ComponentType<{ className?: string }>
  dot?: boolean
  className?: string
}

export function StatusBadge({
  status,
  domain,
  label,
  icon: Icon,
  dot = false,
  size,
  className,
}: StatusBadgeProps) {
  const colorClasses = getBadgeClasses(domain, status)

  if (dot) {
    const dotColor = getDotColor(domain, status)
    return (
      <div className={cn('inline-flex items-center gap-1.5', statusBadgeVariants({ size }), className)}>
        <span className={cn('h-2 w-2 rounded-full shrink-0', dotColor)} />
        <span className="font-medium">{label ?? formatLabel(status)}</span>
      </div>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn(colorClasses, statusBadgeVariants({ size }), 'font-medium', className)}
    >
      {Icon && <Icon className="h-3 w-3 mr-1" />}
      {label ?? formatLabel(status)}
    </Badge>
  )
}

export { getBadgeClasses, getDotColor, formatLabel }
