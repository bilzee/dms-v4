'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface GapIndicatorProps {
  hasGap: boolean;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  field?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// Severity configuration
const severityConfig = {
  CRITICAL: {
    color: 'bg-red-600 border-2 border-red-300 shadow-red-200',
    textColor: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    label: 'Critical Gap',
    description: 'Immediate attention required',
    icon: AlertTriangle,
    animation: 'animate-pulse'
  },
  HIGH: {
    color: 'bg-orange-600 border-2 border-orange-300 shadow-orange-200',
    textColor: 'text-orange-800',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    label: 'High Priority Gap',
    description: 'Urgent attention needed',
    icon: AlertCircle,
    animation: 'animate-pulse'
  },
  MEDIUM: {
    color: 'bg-yellow-600 border-2 border-yellow-300 shadow-yellow-200',
    textColor: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    label: 'Medium Gap',
    description: 'Attention needed',
    icon: Info,
    animation: ''
  },
  LOW: {
    color: 'bg-blue-600 border-2 border-blue-300 shadow-blue-200',
    textColor: 'text-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    label: 'Low Gap',
    description: 'Monitor and address',
    icon: Info,
    animation: ''
  }
} as const;

// Size configuration
const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    badge: 'text-xs px-1.5 py-0.5',
    text: 'text-xs',
    icon: 'w-3 h-3'
  },
  md: {
    dot: 'w-3 h-3',
    badge: 'text-sm px-2 py-1',
    text: 'text-sm',
    icon: 'w-4 h-4'
  },
  lg: {
    dot: 'w-4 h-4',
    badge: 'text-base px-3 py-1.5',
    text: 'text-base',
    icon: 'w-5 h-5'
  }
} as const;

/**
 * GapIndicator Component
 * 
 * Visual indicator for assessment gaps with color-coded severity levels
 * - Red for critical gaps
 * - Orange for high priority gaps  
 * - Yellow for medium gaps
 * - Green for no gaps
 * - Blue for low priority gaps
 */
export function GapIndicator({
  hasGap,
  severity = 'LOW',
  field,
  size = 'md',
  showLabel = false,
  className
}: GapIndicatorProps) {
  const sizeClasses = sizeConfig[size];
  
  const IconComponent = hasGap ? severityConfig[severity].icon : CheckCircle;
  
  if (!hasGap) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "rounded-full bg-green-600 border-2 border-green-300 shadow-sm",
          sizeClasses.dot
        )} aria-hidden="true" />
        <IconComponent className={cn(
          "text-green-600 flex-shrink-0",
          sizeClasses.icon
        )} />
        {showLabel && (
          <span className={cn("text-green-800 font-semibold", sizeClasses.text)}>
            No Gap
          </span>
        )}
      </div>
    );
  }

  const config = severityConfig[severity];

  return (
    <div className={cn(
      "flex items-center gap-2",
      config.animation && "gap-2",
      className
    )}>
      <div className={cn(
        "rounded-full shadow-md",
        config.color,
        config.animation,
        sizeClasses.dot
      )} aria-hidden="true" />
      
      <IconComponent className={cn(
        "flex-shrink-0",
        config.textColor,
        sizeClasses.icon,
        config.animation && config.animation
      )} />
      
      {showLabel && (
        <div className="flex flex-col">
          <span className={cn("font-semibold", config.textColor, sizeClasses.text)}>
            {config.label}
          </span>
          {field && (
            <span className={cn("text-xs text-gray-500")}>
              {field}
            </span>
          )}
        </div>
      )}
      
      {!showLabel && severity !== 'LOW' && (
        <Badge 
          variant="outline" 
          className={cn(
            sizeClasses.badge,
            config.textColor,
            config.borderColor,
            config.bgColor,
            "font-semibold shadow-sm"
          )}
        >
          {severity}
        </Badge>
      )}
    </div>
  );
}

export default GapIndicator;