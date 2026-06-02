export {
  priorityColors,
  priorityDotColors,
  trendColors,
  statusBadgeColors,
  verificationPriorityBadgeColors,
  verificationPrioritySolidColors,
  verificationStatusBadgeColors,
  deliveryStatusBadgeColors,
  getPriorityBadgeColor,
  getPrioritySolidColor,
  getVerificationStatusColor,
} from './priority-colors';

export type SeverityLevel =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info'
  | 'success'
  | 'warning'
  | 'neutral';

export const severityCardColors = {
  critical: 'bg-red-500/5 border-red-500/15',
  high: 'bg-orange-500/5 border-orange-500/15',
  medium: 'bg-yellow-500/5 border-yellow-500/15',
  low: 'bg-green-500/5 border-green-500/15',
  unclassified: 'bg-gray-500/5 border-gray-500/15',
  info: 'bg-blue-500/5 border-blue-500/15',
  success: 'bg-emerald-500/5 border-emerald-500/15',
  warning: 'bg-amber-500/5 border-amber-500/15',
  neutral: 'bg-gray-500/5 border-gray-500/15',
} as const;

export const severityIconColors = {
  critical: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  low: 'text-green-600 dark:text-green-400',
  unclassified: 'text-gray-500 dark:text-gray-400',
  info: 'text-blue-600 dark:text-blue-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  neutral: 'text-muted-foreground',
} as const;

export const severityValueColors = {
  critical: 'text-red-700 dark:text-red-400',
  high: 'text-orange-700 dark:text-orange-400',
  medium: 'text-yellow-700 dark:text-yellow-400',
  low: 'text-green-700 dark:text-green-400',
  unclassified: 'text-gray-600 dark:text-gray-400',
  info: 'text-blue-700 dark:text-blue-400',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  neutral: 'text-foreground',
} as const;

export const incidentStatusColors = {
  ACTIVE: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  CONTAINED: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  RESOLVED: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
} as const;

export const commitmentStatusColors = {
  PLANNED: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  PARTIAL: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  COMPLETE: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  CANCELLED: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
} as const;

export const systemStatusColors = {
  ONLINE: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  OFFLINE: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  SYNCING: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  ERROR: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
} as const;

export const statusColors = {
  success: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  error: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  neutral: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
} as const;

const severityCardMap = severityCardColors as Record<string, string>;
const severityIconMap = severityIconColors as Record<string, string>;
const severityValueMap = severityValueColors as Record<string, string>;

export function getSeverityCardClasses(severity: string): string {
  return severityCardMap[severity] ?? severityCardMap.neutral;
}

export function getSeverityIconClasses(severity: string): string {
  return severityIconMap[severity] ?? severityIconMap.neutral;
}

export function getSeverityValueClasses(severity: string): string {
  return severityValueMap[severity] ?? severityValueMap.neutral;
}

export function getStatusClasses(
  domain: 'verification' | 'response' | 'incident' | 'commitment' | 'system',
  status: string,
): string {
  const fallback = 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';

  const domainMaps: Record<string, Record<string, string>> = {
    verification: {},
    response: {},
    incident: { ...incidentStatusColors },
    commitment: { ...commitmentStatusColors },
    system: { ...systemStatusColors },
  };

  const map = domainMaps[domain];
  if (!map) return fallback;
  return map[status] ?? fallback;
}
