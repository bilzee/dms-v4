export const ICON_SIZE = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

export const STAT_VALUE_SIZE = {
  sm: 'text-lg font-semibold tracking-tight',
  md: 'text-2xl font-bold tracking-tight',
  lg: 'text-3xl font-bold tracking-tight',
} as const;

export const CARD_PADDING = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

export const GRID_GAP = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
} as const;

export const RESPONSIVE_GRID = {
  1: 'grid grid-cols-1',
  2: 'grid grid-cols-1 md:grid-cols-2',
  3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  5: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
} as const;

export type SEVERITY_KEYS =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info'
  | 'success'
  | 'warning'
  | 'neutral';

export const SEVERITY_COLOR_MAP = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'green',
  unclassified: 'gray',
  info: 'blue',
  success: 'emerald',
  warning: 'amber',
  neutral: 'gray',
} as const;
