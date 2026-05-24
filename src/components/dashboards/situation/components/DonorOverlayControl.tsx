'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getBadgeClasses } from '@/components/shared/StatusBadge';
import { 
  Users, 
  Package, 
  Eye, 
  EyeOff, 
  Settings,
  HelpCircle,
  X
} from 'lucide-react';

export interface DonorOverlayControlProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  donorAssignments?: Array<{
    donorId: string;
    donorName: string;
    commitmentStatus: string;
    entityCount: number;
  }>;
  className?: string;
}

function DonorOverlayLegend({ 
  donors, 
  onClose 
}: { 
  donors: DonorOverlayControlProps['donorAssignments']; 
  onClose: () => void;
}) {
  if (!donors || donors.length === 0) {
    return (
      <Card className="absolute top-4 left-4 z-[1000] p-4 shadow-lg max-w-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="font-semibold text-sm">Donor Assignments</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          No donor assignments found for the current view.
        </div>
      </Card>
    );
  }


  const statusCount = donors.reduce((acc, donor) => {
    acc[donor.commitmentStatus] = (acc[donor.commitmentStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="absolute top-4 left-4 z-[1000] p-4 shadow-lg max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <span className="font-semibold text-sm">Donor Assignments</span>
          <Badge variant="secondary" className="text-xs">
            {donors.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Status Summary */}
      <div className="mb-3 space-y-1">
        {Object.entries(statusCount).map(([status, count]) => (
          <div key={status} className="flex items-center justify-between text-xs">
            <Badge 
              variant="outline" 
              className={cn("text-xs", getBadgeClasses('commitment', status))}
            >
              {status}
            </Badge>
            <span className="text-muted-foreground">{count}</span>
          </div>
        ))}
      </div>
      
      {/* Donor List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {donors.slice(0, 10).map((donor, index) => (
          <div key={index} className="flex items-center justify-between p-2 rounded border text-xs">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{donor.donorName}</div>
              <div className="text-muted-foreground">{donor.entityCount} entities</div>
            </div>
            <Badge 
              variant="outline" 
              className={cn("text-xs", getBadgeClasses('commitment', donor.commitmentStatus))}
            >
              {donor.commitmentStatus}
            </Badge>
          </div>
        ))}
        {donors.length > 10 && (
          <div className="text-center text-xs text-muted-foreground">
            +{donors.length - 10} more donors
          </div>
        )}
      </div>
    </Card>
  );
}

export function DonorOverlayControl({
  enabled,
  onEnabledChange,
  donorAssignments,
  className
}: DonorOverlayControlProps) {
  const [showLegend, setShowLegend] = useState(false);

  const handleToggle = () => {
    onEnabledChange(!enabled);
  };

  const handleLegendToggle = () => {
    setShowLegend(!showLegend);
  };

  return (
    <>
      {/* Toggle Button */}
      <div className={cn('absolute bottom-4 right-4 z-[1000]', className)}>
        <Card className="p-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Button
              variant={enabled ? "default" : "outline"}
              size="sm"
              onClick={handleToggle}
              className="flex items-center gap-2 h-8 px-3"
            >
              {enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span className="text-xs">Donors</span>
            </Button>
            
            {enabled && (
              <>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLegendToggle}
                  className="h-8 w-8 p-0"
                  title={showLegend ? "Hide donor legend" : "Show donor legend"}
                >
                  <HelpCircle className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Legend Modal */}
      {enabled && showLegend && (
        <DonorOverlayLegend
          donors={donorAssignments}
          onClose={() => setShowLegend(false)}
        />
      )}
    </>
  );
}

export default DonorOverlayControl;