import { cn } from '@/lib/utils';
import { CheckCircle, Shield, Star, Info } from '@/lib/icons';
import { getBadgeClasses } from '@/components/shared/StatusBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  isVerified: boolean;
  verificationMethod?: 'manual' | 'auto' | 'mixed';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  showTooltip?: boolean;
  metrics?: {
    totalVerified?: number;
    totalActivities?: number;
    verificationRate?: number;
    responseVerified?: number;
    commitmentFulfilled?: number;
  };
}

export function VerifiedBadge({ 
  isVerified, 
  verificationMethod = 'manual',
  size = 'md',
  showText = true,
  showTooltip = false,
  metrics,
  className 
}: VerifiedBadgeProps) {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5', 
    lg: 'text-base px-4 py-2 gap-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  // Determine colors and icon based on verification method
  let colors, Icon, text;

  switch (verificationMethod) {
    case 'auto':
      colors = getBadgeClasses('verification', 'AUTO_VERIFIED');
      Icon = Shield;
      text = 'Auto-Verified';
      break;
    case 'mixed':
      colors = getBadgeClasses('verification', 'VERIFIED');
      Icon = CheckCircle;
      text = 'Verified';
      break;
    default:
      colors = getBadgeClasses('verification', 'VERIFIED');
      Icon = Star;
      text = 'Verified';
      break;
  }

  const badgeContent = (
    <div 
      className={cn(
        'inline-flex items-center border rounded-full font-medium',
        sizeClasses[size],
        colors,
        'cursor-default',
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showText && <span>{text}</span>}
      {showTooltip && (
        <Info className={cn(iconSizes[size], 'ml-1 opacity-60')} />
      )}
    </div>
  );

  if (!showTooltip || !metrics) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <div className="font-semibold">Verification Details</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <span>Total Verified:</span>
                <span className="font-medium">{metrics.totalVerified || 0}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Total Activities:</span>
                <span className="font-medium">{metrics.totalActivities || 0}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Success Rate:</span>
                <span className="font-medium">
                  {((metrics.verificationRate || 0) * 100).toFixed(1)}%
                </span>
              </div>
              {metrics.responseVerified !== undefined && (
                <div className="flex justify-between gap-4">
                  <span>Responses Verified:</span>
                  <span className="font-medium">{metrics.responseVerified}</span>
                </div>
              )}
              {metrics.commitmentFulfilled !== undefined && (
                <div className="flex justify-between gap-4">
                  <span>Commitments Fulfilled:</span>
                  <span className="font-medium">{metrics.commitmentFulfilled}</span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 pt-1 border-t">
              Verification method: {verificationMethod}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}