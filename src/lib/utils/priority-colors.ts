export const priorityColors = {
  critical: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
} as const;

export const priorityDotColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
} as const;

export const trendColors = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-muted-foreground',
} as const;

export const statusBadgeColors = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
} as const;

export const verificationPriorityBadgeColors = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  LOW: 'bg-green-100 text-green-800 border-green-300',
} as const;

export const verificationPrioritySolidColors = {
  CRITICAL: 'bg-red-500 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-white',
  LOW: 'bg-green-500 text-white',
} as const;

export const verificationStatusBadgeColors: Record<string, string> = {
  SUBMITTED: 'bg-amber-100 text-amber-800 border-amber-300',
  VERIFIED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
  AUTO_VERIFIED: 'bg-green-100 text-green-800 border-green-300',
  DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
  PUBLISHED: 'bg-green-100 text-green-800 border-green-300',
};

export const deliveryStatusBadgeColors: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 border-blue-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
};

export function getPriorityBadgeColor(priority: string): string {
  return verificationPriorityBadgeColors[priority as keyof typeof verificationPriorityBadgeColors]
    ?? 'bg-gray-100 text-gray-800 border-gray-300';
}

export function getPrioritySolidColor(priority: string): string {
  return verificationPrioritySolidColors[priority as keyof typeof verificationPrioritySolidColors]
    ?? 'bg-gray-500 text-white';
}

export function getVerificationStatusColor(status: string): string {
  return verificationStatusBadgeColors[status] ?? 'bg-gray-100 text-gray-800 border-gray-300';
}
