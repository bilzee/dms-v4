import type { ChartOptions } from 'chart.js'

export type ChartColorSet = {
  light: string
  dark: string
  bgLight: string
  bgDark: string
}

export const CHART_COLORS = {
  blue: { light: 'rgba(59, 130, 246, 0.8)', dark: 'rgba(96, 165, 250, 0.8)', bgLight: 'rgba(59, 130, 246, 0.1)', bgDark: 'rgba(96, 165, 250, 0.1)' },
  green: { light: 'rgba(34, 197, 94, 0.8)', dark: 'rgba(74, 222, 128, 0.8)', bgLight: 'rgba(34, 197, 94, 0.1)', bgDark: 'rgba(74, 222, 128, 0.1)' },
  orange: { light: 'rgba(251, 146, 60, 0.8)', dark: 'rgba(253, 186, 116, 0.8)', bgLight: 'rgba(251, 146, 60, 0.1)', bgDark: 'rgba(253, 186, 116, 0.1)' },
  red: { light: 'rgba(239, 68, 68, 0.8)', dark: 'rgba(248, 113, 113, 0.8)', bgLight: 'rgba(239, 68, 68, 0.1)', bgDark: 'rgba(248, 113, 113, 0.1)' },
  purple: { light: 'rgba(168, 85, 247, 0.8)', dark: 'rgba(192, 132, 252, 0.8)', bgLight: 'rgba(168, 85, 247, 0.1)', bgDark: 'rgba(192, 132, 252, 0.1)' },
  gray: { light: 'rgba(156, 163, 175, 0.8)', dark: 'rgba(156, 163, 175, 0.8)', bgLight: 'rgba(156, 163, 175, 0.1)', bgDark: 'rgba(156, 163, 175, 0.1)' },
} as const

export const SEMANTIC_COLORS = {
  primary: CHART_COLORS.blue,
  success: CHART_COLORS.green,
  warning: CHART_COLORS.orange,
  danger: CHART_COLORS.red,
  neutral: CHART_COLORS.gray,
} as const

export const SERIES_PALETTE = [
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.orange,
  CHART_COLORS.purple,
  CHART_COLORS.red,
] as const

export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export function getChartColor(color: ChartColorSet): string {
  return isDarkMode() ? color.dark : color.light
}

export function getChartBgColor(color: ChartColorSet): string {
  return isDarkMode() ? color.bgDark : color.bgLight
}

const GRID_COLOR_LIGHT = '#e5e7eb'
const TICK_COLOR_LIGHT = '#6b7280'
const GRID_COLOR_DARK = '#374151'
const TICK_COLOR_DARK = '#9ca3af'

function gridColor(): string {
  return isDarkMode() ? GRID_COLOR_DARK : GRID_COLOR_LIGHT
}

function tickColor(): string {
  return isDarkMode() ? TICK_COLOR_DARK : TICK_COLOR_LIGHT
}

export function getDefaultChartOptions(): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: tickColor(), usePointStyle: true, padding: 16 },
      },
      tooltip: {
        backgroundColor: isDarkMode() ? '#1e293b' : '#ffffff',
        titleColor: isDarkMode() ? '#e2e8f0' : '#1e293b',
        bodyColor: isDarkMode() ? '#94a3b8' : '#475569',
        borderColor: isDarkMode() ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: gridColor() },
        ticks: { color: tickColor() },
      },
      y: {
        grid: { color: gridColor() },
        ticks: { color: tickColor() },
      },
    },
  }
}

export function getBarChartOptions(): ChartOptions {
  return {
    ...getDefaultChartOptions(),
    plugins: {
      ...getDefaultChartOptions().plugins,
      legend: { display: false },
    },
  }
}

export function getRadarChartOptions(): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: tickColor(), usePointStyle: true, padding: 16 },
      },
    },
    scales: {
      r: {
        grid: { color: gridColor() },
        angleLines: { color: gridColor() },
        pointLabels: { color: tickColor() },
        ticks: { color: tickColor(), backdropColor: 'transparent' },
      },
    },
  }
}
