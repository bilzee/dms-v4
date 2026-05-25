'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { 
  Calendar,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  PauseCircle,
  Timer
} from '@/lib/icons';

// Types for incident summary
interface IncidentSummaryProps {
  incident: {
    id: string;
    type: string;
    subType: string;
    status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    createdAt: string;
    updatedAt: string;
    location: string;
    description?: string;
  };
  realTime?: boolean;
  className?: string;
}

interface DurationInfo {
  totalDuration: string;
  inCurrentStatus: string;
  totalDays: number;
  totalHours: number;
  inStatusHours: number;
}

const statusConfig = {
  ACTIVE: {
    label: 'Active',
    icon: AlertTriangle
  },
  CONTAINED: {
    label: 'Contained',
    icon: PauseCircle
  },
  RESOLVED: {
    label: 'Resolved',
    icon: CheckCircle
  }
};

/**
 * Format duration into human-readable string
 */
const formatDuration = (hours: number): string => {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days > 0) {
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
  }
  return `${hours}h`;
};

/**
 * Calculate duration information
 */
const calculateDurationInfo = (createdAt: string, updatedAt: string): DurationInfo => {
  const now = new Date();
  const created = new Date(createdAt);
  const updated = new Date(updatedAt);
  
  const totalHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
  const inStatusHours = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60));
  const totalDays = Math.floor(totalHours / 24);
  
  return {
    totalDuration: formatDuration(totalHours),
    inCurrentStatus: formatDuration(inStatusHours),
    totalDays,
    totalHours,
    inStatusHours: inStatusHours
  };
};

/**
 * IncidentSummary Component
 * 
 * Displays comprehensive incident summary information including:
 * - Declaration date and time
 * - Current status with visual indicators  
 * - Duration calculations (total and in current status)
 * - Real-time duration updates
 * - Severity indicators
 */
export function IncidentSummary({ 
  incident, 
  realTime = false, 
  className 
}: IncidentSummaryProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [durationInfo, setDurationInfo] = useState<DurationInfo>(
    calculateDurationInfo(incident.createdAt, incident.updatedAt)
  );

  // Update duration in real-time
  useEffect(() => {
    if (!realTime) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setDurationInfo(calculateDurationInfo(incident.createdAt, incident.updatedAt));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [realTime, incident.createdAt, incident.updatedAt]);

  const statusInfo = statusConfig[incident.status];
  const StatusIcon = statusInfo.icon;

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Incident Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Incident Type, Status & Severity - Compact Layout */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-base">{incident.type}</span>
            {incident.subType && (
              <span className="text-gray-500 text-sm">- {incident.subType}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <StatusBadge
              status={incident.status}
              domain="incident"
              icon={StatusIcon}
              label={statusInfo.label}
              className="text-xs h-5 gap-1"
            />

            <StatusBadge
              status={incident.severity}
              domain="severity"
              className="text-xs h-5 gap-1"
            />
            
            {realTime && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Timer className="h-3 w-3" />
                <span>Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Compact Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Declaration Date - Compact */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600">
              <Calendar className="h-3 w-3" />
              <span>Declared</span>
            </div>
            <div>
              <div className="font-medium text-xs">
                {new Date(incident.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: '2-digit'
                })}
              </div>
              <div className="text-gray-500 text-xs">
                {new Date(incident.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          {/* Duration - Compact */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="h-3 w-3" />
              <span>Duration</span>
            </div>
            <div>
              <div className="font-medium text-xs">
                {durationInfo.totalDuration}
              </div>
              <div className="text-gray-500 text-xs">
                {statusInfo.label}: {durationInfo.inCurrentStatus}
              </div>
            </div>
          </div>
        </div>

        {/* Compact Progress Bar - Only for incidents > 7 days */}
        {durationInfo.totalDays > 7 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Progress</span>
              <span className="text-xs text-gray-400">{durationInfo.totalDays} days</span>
            </div>
            <ProgressBar
              value={Math.min(100, (durationInfo.totalDays / 30) * 100)}
              variant={
                incident.status === 'ACTIVE' ? 'danger' :
                incident.status === 'CONTAINED' ? 'warning' : 'success'
              }
              size="sm"
            />
          </div>
        )}

              {/* Removed duplicated Location, Description, and timestamp information to prevent scrolling */}
        {/* This information is already displayed elsewhere in the dashboard */}
      </CardContent>
    </Card>
  );
}

export default IncidentSummary;