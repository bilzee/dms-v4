'use client';

import React from 'react';
import { LeaderboardDisplay } from '@/components/donor/LeaderboardDisplay';
import { Badge } from '@/components/ui/badge';
import { Trophy, Info, Users, TrendingUp, Clock } from '@/lib/icons';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/dashboards/shared/exports/ExportButton';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function LeaderboardPage() {
  const { 
    data: criteriaData, 
    isLoading: criteriaLoading, 
  } = useQuery({
    queryKey: ['leaderboard-criteria'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/leaderboard/criteria');
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch ranking criteria');
      }
      return result.data || null;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000
  });

  const criteria = criteriaData?.criteria;
  const stats = criteriaData?.statistics;

  return (
    <div className="py-8 space-y-6">
      <div className="relative">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-foreground">Donor Leaderboard</h1>
          </div>
        </div>
        <div className="absolute top-0 right-0">
          <ExportButton dataType="commitments" size="sm" />
        </div>
      </div>

      {stats && (
        <StatCardGrid columns={3} className="max-w-2xl mx-auto">
          <StatCard
            label="Active Donors"
            value={stats.totalActiveDonors}
            icon={Users}
            severity="info"
            variant="compact"
            loading={criteriaLoading}
          />
          <StatCard
            label="Avg Delivery Rate"
            value={`${stats.averageDeliveryRate}%`}
            icon={TrendingUp}
            severity="success"
            variant="compact"
            loading={criteriaLoading}
          />
          <StatCard
            label="Last Updated"
            value={new Date(stats.lastCalculated).toLocaleTimeString()}
            icon={Clock}
            severity="neutral"
            variant="compact"
            loading={criteriaLoading}
          />
        </StatCardGrid>
      )}

      {criteriaLoading ? (
        <div className="max-w-4xl mx-auto flex justify-center gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-32" />
          ))}
        </div>
      ) : criteria ? (
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3 text-sm">
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Info className="w-4 h-4 shrink-0" />
                <span>Ranked by</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>How Rankings Are Calculated</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Each donor&apos;s score is a weighted sum of four factors, each normalized to 0–100 before weighting:
                </p>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <p className="font-semibold text-foreground">Delivery ({criteria.weights.deliveryRate.percentage}%)</p>
                    <p>{criteria.performanceMetrics.deliveryRate.description}</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="font-semibold text-foreground">Response Speed ({criteria.weights.responseSpeed.percentage}%)</p>
                    <p>{criteria.performanceMetrics.responseSpeed.description}</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="font-semibold text-foreground">Commitment Value ({criteria.weights.commitmentValue.percentage}%)</p>
                    <p>{criteria.performanceMetrics.commitmentValue.description}</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="font-semibold text-foreground">Consistency ({criteria.weights.consistency.percentage}%)</p>
                    <p>{criteria.performanceMetrics.consistency.description}</p>
                  </div>
                </div>
                <p className="text-xs border-t pt-3">
                  Ties receive the same rank. Updated every 15 minutes.
                </p>
              </div>
            </DialogContent>
          </Dialog>
          <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400">
            {criteria.weights.deliveryRate.percentage}% Delivery
          </Badge>
          <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400">
            {criteria.weights.responseSpeed.percentage}% Speed
          </Badge>
          <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400">
            {criteria.weights.commitmentValue.percentage}% Value
          </Badge>
          <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400">
            {criteria.weights.consistency.percentage}% Consistency
          </Badge>
        </div>
      ) : null}

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
