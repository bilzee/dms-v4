import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, XCircle, Shield, FileText } from '@/lib/icons';
import type { StatusIndicatorProps, VerificationStatus } from '@/types/verification';
import { getBadgeClasses } from '@/components/shared/StatusBadge';

const statusConfig: Record<VerificationStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  DRAFT: {
    label: 'Draft',
    icon: FileText,
  },
  SUBMITTED: {
    label: 'Pending Verification',
    icon: Clock,
  },
  VERIFIED: {
    label: 'Verified',
    icon: CheckCircle,
  },
  AUTO_VERIFIED: {
    label: 'Auto-Verified',
    icon: Shield,
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
  }
};

const sizeConfig = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'h-3 w-3',
    text: 'text-xs'
  },
  md: {
    container: 'px-3 py-1.5 text-sm',
    icon: 'h-4 w-4',
    text: 'text-sm'
  },
  lg: {
    container: 'px-4 py-2 text-base',
    icon: 'h-5 w-5',
    text: 'text-base'
  }
};

export function StatusIndicator({ 
  status, 
  size = 'md', 
  showText = true, 
  className 
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const IconComponent = config.icon;
  const badgeClasses = getBadgeClasses('verification', status);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        badgeClasses,
        sizes.container,
        className
      )}
    >
      <IconComponent 
        className={sizes.icon}
      />
      {showText && (
        <span className={sizes.text}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// Helper function to get status color for other components
export function getStatusColor(status: VerificationStatus): string {
  return getBadgeClasses('verification', status);
}

// Helper function to get status label
export function getStatusLabel(status: VerificationStatus): string {
  return statusConfig[status].label;
}

// Verification status badge with animation for status changes
interface StatusBadgeProps extends StatusIndicatorProps {
  previousStatus?: VerificationStatus;
  animate?: boolean;
}

export function StatusBadge({ 
  status, 
  previousStatus, 
  animate = false, 
  ...props 
}: StatusBadgeProps) {
  return (
    <div className={cn(
      'transition-all duration-300',
      animate && previousStatus !== status && 'animate-pulse'
    )}>
      <StatusIndicator status={status} {...props} />
    </div>
  );
}

// Status progress indicator for verification workflow
interface StatusProgressProps {
  currentStatus: VerificationStatus;
  className?: string;
}

export function StatusProgress({ currentStatus, className }: StatusProgressProps) {
  const steps: VerificationStatus[] = ['DRAFT', 'SUBMITTED', 'VERIFIED'];
  const currentIndex = steps.indexOf(currentStatus);
  
  // Handle rejected status separately
  if (currentStatus === 'REJECTED') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="flex-1">
          <div className="flex items-center">
            {steps.map((step, index) => {
              const isCompleted = index <= 1; // Draft and submitted are complete for rejected
              const isRejected = index === 1; // Mark submitted as rejected
              
              return (
                <React.Fragment key={step}>
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2',
                      isRejected
                        ? 'border-red-500 bg-red-50'
                        : isCompleted
                        ? 'border-green-500 bg-green-50'
                        : 'border-border bg-muted'
                    )}
                  >
                    {isRejected ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'h-1 w-full mx-2',
                        isRejected && index === 1
                          ? 'bg-red-200'
                          : isCompleted
                          ? 'bg-green-200'
                          : 'bg-border'
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        <StatusIndicator status="REJECTED" size="sm" />
      </div>
    );
  }
  
  // Handle auto-verified status
  if (currentStatus === 'AUTO_VERIFIED') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Shield className="h-5 w-5 text-blue-500" />
        <span className="text-sm font-medium text-blue-600">Auto-Verified</span>
      </div>
    );
  }
  
  // Normal verification progress
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className="flex-1">
        <div className="flex items-center">
          {steps.map((step, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <React.Fragment key={step}>
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2',
                    isCompleted
                      ? 'border-green-500 bg-green-50'
                      : 'border-border bg-muted'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-1 w-full mx-2',
                      isCompleted ? 'bg-green-200' : 'bg-border'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <StatusIndicator status={currentStatus} size="sm" />
    </div>
  );
}