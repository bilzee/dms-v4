'use client';

import React, { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info } from '@/lib/icons';
import { cn } from '@/lib/utils';

// Custom Dialog components with higher z-index to appear over leaflet maps
const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[999] bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[1000] grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-[1001]">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="m18 6-12 12" />
          <path d="m6 6 12 12" />
        </svg>
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName;

interface PriorityInfoPopupProps {
  className?: string;
}

interface PriorityInfo {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  color: string;
  bgStyle: string;
  description: string;
  examples: string[];
  responseTime: string;
  impact: string;
}

const PRIORITY_INFOS: PriorityInfo[] = [
  {
    level: 'CRITICAL',
    color: 'text-red-600',
    bgStyle: 'bg-red-100 text-red-800 border-red-300',
    description: 'Immediate life-threatening situations requiring urgent action',
    examples: [
      'Mass casualties (>10 deaths)',
      'Hospital infrastructure failure',
      'Widespread disease outbreak',
      'Mass displacement (>1000 people)'
    ],
    responseTime: 'Immediate response required',
    impact: 'High risk of loss of life or severe injury'
  },
  {
    level: 'HIGH',
    color: 'text-orange-600',
    bgStyle: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Serious situations requiring prompt response',
    examples: [
      'Multiple injuries (3-10)',
      'Partial infrastructure damage',
      'Localized health concerns',
      'Significant displacement (100-1000 people)'
    ],
    responseTime: 'Response within 1-2 hours',
    impact: 'Potential for escalation if not addressed'
  },
  {
    level: 'MEDIUM',
    color: 'text-yellow-600',
    bgStyle: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    description: 'Moderate situations requiring attention',
    examples: [
      'Minor injuries (<3)',
      'Resource shortages',
      'Isolated incidents',
      'Small-scale displacement (<100 people)'
    ],
    responseTime: 'Response within 4-6 hours',
    impact: 'Manageable with available resources'
  },
  {
    level: 'LOW',
    color: 'text-green-600',
    bgStyle: 'bg-green-100 text-green-800 border-green-300',
    description: 'Minor situations requiring monitoring',
    examples: [
      'Non-critical service disruptions',
      'Supply chain concerns',
      'Information gathering needs',
      'Preventive measures'
    ],
    responseTime: 'Response within 24 hours',
    impact: 'Low immediate risk, monitoring advised'
  }
];

export function PriorityInfoPopup({ className }: PriorityInfoPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("text-muted-foreground hover:text-foreground", className)}
        >
          <Info className="h-4 w-4" />
          Priority Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Understanding Priority Levels
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Introduction */}
          <div className="text-sm text-muted-foreground">
            <p>
              Priority levels indicate the urgency and severity of incidents. They help coordinate 
              response teams prioritize actions and allocate resources effectively.
            </p>
          </div>

          {/* Priority Levels */}
          <div className="grid grid-cols-1 gap-6">
            {PRIORITY_INFOS.map((priority) => (
              <div key={priority.level} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={priority.bgStyle}
                  >
                    {priority.level}
                  </Badge>
                  <span className={cn("text-sm font-medium", priority.color)}>
                    {priority.level === 'CRITICAL' && '🚨'}
                    {priority.level === 'HIGH' && '⚠️'}
                    {priority.level === 'MEDIUM' && '📍'}
                    {priority.level === 'LOW' && '📋'}
                  </span>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{priority.description}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1">Examples</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {priority.examples.map((example, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-xs text-gray-500">Response Time</span>
                    <p className="text-muted-foreground">{priority.responseTime}</p>
                  </div>
                  <div>
                    <span className="font-medium text-xs text-gray-500">Impact</span>
                    <p className="text-muted-foreground">{priority.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Reference Guide */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Quick Reference</h4>
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-16 text-center">🚨</Badge>
                <span>Life-threatening - Immediate action required</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-16 text-center">⚠️</Badge>
                <span>Serious - Prompt response needed</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-16 text-center">📍</Badge>
                <span>Moderate - Attention required</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-16 text-center">📋</Badge>
                <span>Minor - Monitoring advised</span>
              </div>
            </div>
          </div>

          {/* Usage Notes */}
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Usage Notes:</p>
            <ul className="space-y-1">
              <li>• Priorities are assigned by assessors based on initial impact assessment</li>
              <li>• Priorities can be updated as more information becomes available</li>
              <li>• Response teams use priorities to allocate resources and plan interventions</li>
              <li>• Critical incidents automatically trigger immediate notification protocols</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}