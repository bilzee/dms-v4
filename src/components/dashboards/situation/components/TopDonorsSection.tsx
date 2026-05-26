'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Medal,
  Award,
  Loader2,
  AlertCircle,
  Users,
  Info
} from '@/lib/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiGet, extractArray } from '@/lib/api';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';

interface TopDonorsProps {
  incidentId?: string;
  className?: string;
}

interface TopDonor {
  donorName: string;
  successRate: number;
  verifiedActivities: number;
  totalActivities: number;
  responseVerificationRate: number;
  totalCommitments: number;
}

// Fetch top performing donors with updated formula
const fetchTopDonors = async (incidentId?: string): Promise<TopDonor[]> => {
  const result = await apiGet('/api/v1/donors/metrics?dateRange=30d')
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch donor metrics')
  }
  const d = result.data as any
  const performers = d?.data?.overall?.topPerformers || d?.overall?.topPerformers || []
  return extractArray<TopDonor>(performers).slice(0, 3)
};

/**
 * TopDonorsSection Component
 * 
 * Displays the top 3 performing donors for the selected incident
 * using the weighted ranking formula: Delivery (40%) + Value (30%) + Consistency (20%) + Speed (10%)
 */
export function TopDonorsSection({ incidentId, className }: TopDonorsProps) {
  const {
    data: topDonors,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['topDonors', incidentId],
    queryFn: () => fetchTopDonors(incidentId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Handle loading state
  if (isLoading) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Top Donors...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContentSkeleton variant="list" count={3} />
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error || !topDonors) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Top Donors Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4 text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load top donors</p>
            <button
              onClick={() => refetch()}
              className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle no donors case
  if (topDonors.length === 0) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Performing Donors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No donor data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Define ranking colors and icons
  const getRankingConfig = (index: number) => {
    const configs = [
      { icon: Trophy, bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-700', iconColor: 'text-yellow-500' },
      { icon: Medal, bgColor: 'bg-muted', borderColor: 'border-border', textColor: 'text-foreground', iconColor: 'text-gray-400' },
      { icon: Award, bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700', iconColor: 'text-amber-600' }
    ];
    return configs[index] || configs[2];
  };

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Top Performing Donors
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {incidentId ? 'For selected incident' : 'Overall performance'}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {topDonors.map((donor, index) => {
          const config = getRankingConfig(index);
          const Icon = config.icon;
          
          return (
            <div 
              key={donor.donorName}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                config.bgColor,
                config.borderColor
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-full bg-card", config.textColor)}>
                  <Icon className={cn("h-4 w-4", config.iconColor)} />
                </div>
                <div className={cn("text-sm font-bold", config.textColor)}>
                  #{index + 1}
                </div>
              </div>
              
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm">
                  {donor.donorName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {donor.verifiedActivities} of {donor.totalActivities} activities
                </div>
              </div>
              
              <div className="text-right">
                <div className={cn("text-sm font-bold", config.textColor)}>
                  {donor.successRate.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">
                  score
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Formula explanation */}
        <div className="pt-2 border-t border-border">
          <TooltipProvider delayDuration={0}>
            <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <span>Ranking formula</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <Info className="w-3.5 h-3.5 cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium mb-1">Score = (Delivery × 0.6) + (Speed × 0.2) + (Value × 0.1) + (Consistency × 0.1)</p>
                  <p className="text-xs">Delivery: verified / committed items. Speed: response time. Value: ₦ commitment value. Consistency: activity frequency.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

export default TopDonorsSection;