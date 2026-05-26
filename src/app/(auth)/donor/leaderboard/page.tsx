'use client';

import React from 'react';
import { LeaderboardDisplay } from '@/components/donor/LeaderboardDisplay';
import { Badge } from '@/components/ui/badge';
import { Trophy, Info } from '@/lib/icons';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/dashboards/shared/exports/ExportButton';

export default function LeaderboardPage() {
  // Fetch leaderboard ranking criteria from backend
  const { 
    data: criteriaData, 
    isLoading: criteriaLoading, 
    error: criteriaError,
    refetch: refetchCriteria
  } = useQuery({
    queryKey: ['leaderboard-criteria'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/leaderboard/criteria');
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch ranking criteria');
      }
      return result.data || null;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 15 * 60 * 1000 // Refresh every 15 minutes
  });

  const criteria = criteriaData?.criteria;
  const stats = criteriaData?.statistics;

  return (
    <div className="py-8 space-y-6">
      {/* Page Header */}
      <div className="relative">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-4xl font-bold text-foreground">Donor Leaderboard</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Recognizing and celebrating our most dedicated disaster response partners. 
          Rankings are updated {criteria?.calculation?.updateFrequency || 'every 15 minutes'} based on response verification rate 
          and total commitments made to ensure both reliability and volume are rewarded.
        </p>
        {stats && (
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>{stats.totalActiveDonors} active donors</span>
            <span>•</span>
            <span>Avg. delivery rate: {stats.averageDeliveryRate}%</span>
            <span>•</span>
            <span>Updated {new Date(stats.lastCalculated).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
      <div className="absolute top-0 right-0">
        <ExportButton dataType="commitments" size="sm" />
      </div>
      </div>

      {/* Leaderboard Explanation */}
      {criteriaLoading ? (
        <div className="max-w-4xl mx-auto flex justify-center gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-32" />
          ))}
        </div>
      ) : criteria ? (
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Info className="w-4 h-4 shrink-0" />
            <span>Ranked by</span>
          </div>
          <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400">
            Verification Rate + Commitments
          </Badge>
          <span className="text-muted-foreground">•</span>
          <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400">
            {criteria.badgeThresholds.gold.icon} Gold {criteria.badgeThresholds.gold.minDeliveryRate}%+
          </Badge>
          <Badge variant="outline" className="bg-gray-50 border-gray-300 text-gray-700 dark:bg-gray-500/10 dark:border-gray-500/20 dark:text-gray-400">
            {criteria.badgeThresholds.silver.icon} Silver {criteria.badgeThresholds.silver.minDeliveryRate}%+
          </Badge>
          <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400">
            {criteria.badgeThresholds.bronze.icon} Bronze {criteria.badgeThresholds.bronze.minDeliveryRate}%+
          </Badge>
          {stats && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {stats.badgeDistribution.gold}G {stats.badgeDistribution.silver}S {stats.badgeDistribution.bronze}B
              </span>
            </>
          )}
          {criteria?.calculation?.formula && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                {criteria.calculation.formula}
              </span>
            </>
          )}
        </div>
      ) : null}

      {/* Main Leaderboard */}
      <div className="max-w-6xl mx-auto">
        <LeaderboardDisplay
          timeframe="30d"
          showFilters={true}
          interactive={true}
          limit={50}
        />
      </div>
    </div>
  );
}