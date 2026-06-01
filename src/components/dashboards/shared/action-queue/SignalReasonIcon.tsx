'use client';

import React from 'react';
import {
  ClipboardList,
  RefreshCw,
  Clock,
  FileText,
  Link,
  Truck,
  PieChart,
  AlertCircle,
  DollarSign,
  Package,
  Timer,
} from '@/lib/icons';
import type { SignalReason, SignalPriority } from '@/types/action-signal';
import { cn } from '@/lib/utils';

import { ShieldCheck, UserPlus } from '@/lib/icons';

type CoordinatorReason = 'verify-assessment' | 'verify-response' | 'verify-delivery' | 'need-assessor' | 'need-responder';

const COORDINATOR_ICON_MAP: Record<CoordinatorReason, React.ComponentType<{ className?: string }>> = {
  'verify-assessment': ShieldCheck,
  'verify-response': ShieldCheck,
  'verify-delivery': Truck,
  'need-assessor': UserPlus,
  'need-responder': UserPlus,
};

const REASON_ICON_MAP: Record<SignalReason, React.ComponentType<{ className?: string }>> = {
  'unassessed': ClipboardList,
  'reassessment-needed': RefreshCw,
  'overdue': Clock,
  'awaiting-plan': FileText,
  'awaiting-plan-for-commitment': Link,
  'awaiting-delivery': Truck,
  'partially-covered': PieChart,
  'assessment-needs-response': AlertCircle,
  'plan-needs-commitment': DollarSign,
  'partially-fulfilled': Package,
  'commitment-awaiting-plan': Timer,
  'assessment-awaiting-verification': ShieldCheck,
  'delivery-awaiting-verification': Truck,
  'verification-overdue': AlertCircle,
};

const COORDINATOR_LABELS: Record<CoordinatorReason, string> = {
  'verify-assessment': 'Assessment to verify',
  'verify-response': 'Response plan to verify',
  'verify-delivery': 'Delivery to verify',
  'need-assessor': 'Needs assessor assigned',
  'need-responder': 'Needs responder assigned',
};

export function getCoordinatorReasonIcon(reason: string) {
  return COORDINATOR_ICON_MAP[reason as CoordinatorReason];
}

export function getCoordinatorReasonLabel(reason: string): string | undefined {
  return COORDINATOR_LABELS[reason as CoordinatorReason];
}

const PRIORITY_SEVERITY_TOKEN: Record<SignalPriority, string> = {
  CRITICAL: '--severity-critical',
  HIGH: '--severity-high',
  MEDIUM: '--severity-warning',
  LOW: '--severity-neutral',
};

interface SignalReasonIconProps {
  reason: SignalReason;
  priority: SignalPriority;
  size?: number;
  className?: string;
}

export function SignalReasonIcon({ reason, priority, size = 22, className }: SignalReasonIconProps) {
  const Icon = REASON_ICON_MAP[reason] || getCoordinatorReasonIcon(reason);
  const token = PRIORITY_SEVERITY_TOKEN[priority] || PRIORITY_SEVERITY_TOKEN.MEDIUM;

  if (!Icon) return null;

  return (
    <span
      className={cn('inline-flex items-center', className)}
      style={{ color: `hsl(var(${token}))`, width: size, height: size }}
      aria-hidden="true"
    >
      <Icon className={cn(className)} />
    </span>
  );
}

export const REASON_LABELS: Record<SignalReason, string> & Record<string, string> = {
  'unassessed': 'Assessment needed',
  'reassessment-needed': 'Reassessment needed',
  'overdue': 'Overdue',
  'awaiting-plan': 'Awaiting plan',
  'awaiting-plan-for-commitment': 'Commitment needs plan',
  'awaiting-delivery': 'Awaiting delivery',
  'partially-covered': 'Partially covered',
  'assessment-needs-response': 'Assessment needs response',
  'plan-needs-commitment': 'Plan needs commitment',
  'partially-fulfilled': 'Partially fulfilled',
  'commitment-awaiting-plan': 'Commitment awaiting plan',
  'assessment-awaiting-verification': 'Assessment to verify',
  'delivery-awaiting-verification': 'Delivery to verify',
  'verification-overdue': 'Verification overdue',
  'verify-assessment': 'Assessment to verify',
  'verify-response': 'Response plan to verify',
  'verify-delivery': 'Delivery to verify',
  'need-assessor': 'Needs assessor assigned',
  'need-responder': 'Needs responder assigned',
};
