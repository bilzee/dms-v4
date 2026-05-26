'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// New error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader';
import { EmptyState, EmptySearchResults } from '@/components/shared/EmptyState';
import { DataCardList } from '@/components/shared/DataCardList';
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Search,
  Filter,
  RefreshCw
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { GameBadgeSystem } from './GameBadgeSystem';
import type { 
  LeaderboardEntry, 
  LeaderboardResponse,
  LeaderboardQuery,
  BadgeType 
} from '@/types/gamification';

// API utilities
import { apiGet } from '@/lib/api';

type LeaderboardEntryWithActions = LeaderboardEntry & {
  rank: number;
  trend?: 'up' | 'down' | 'same';
  previousRank?: number;
};

interface LeaderboardDisplayProps {
  timeframe?: '7d' | '30d' | '90d' | '1y' | 'all';
  region?: string;
  sortBy?: 'delivery_rate' | 'commitment_value' | 'consistency' | 'overall';
  limit?: number;
  showFilters?: boolean;
  interactive?: boolean;
  className?: string;
}

export function LeaderboardDisplay({
  timeframe = '30d',
  region,
  sortBy = 'overall',
  limit = 50,
  showFilters = true,
  interactive = true,
  className
}: LeaderboardDisplayProps) {
  const { user } = useAuth();
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(region || '');
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [selectedSortBy, setSelectedSortBy] = useState(sortBy);
  const [selectedLimit, setSelectedLimit] = useState(limit);

  // Query parameters
  const queryParams: LeaderboardQuery = {
    timeframe: selectedTimeframe,
    sortBy: selectedSortBy,
    limit: selectedLimit,
    ...(selectedRegion && selectedRegion !== 'all' && { region: selectedRegion })
  };

  // Fetch leaderboard data
  const fetchLeaderboardData = async () => {
    if (!user) throw new Error('User not authenticated')
    
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    const result = await apiGet(`/api/v1/leaderboard?${params}`);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch leaderboard data');
    }
    return result.data;
  };


  // Render rank icon based on position
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-sm font-semibold text-gray-600">
            {rank}
          </div>
        );
    }
  };

  // Render trend indicator
  const getTrendIcon = (trend: 'up' | 'down' | 'stable', previousRank?: number) => {
    if (!previousRank) return null;
    
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <SafeDataLoader
      queryFn={fetchLeaderboardData}
      enabled={!!user}
      fallbackData={{ data: { rankings: [], metadata: { totalParticipants: 0, lastUpdated: null } } }}
      loadingMessage="Loading leaderboard data..."
      errorTitle="Failed to load leaderboard"
    >
      {(leaderboardData, isLoading, error, retry) => {
        // Filter rankings based on search term
        const getFilteredRankings = () => {
          if (!leaderboardData?.rankings) return [];
          
          let filtered = leaderboardData.rankings;
          
          if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter((entry: LeaderboardEntry) => 
              entry.donor.organizationName.toLowerCase().includes(search) ||
              entry.donor.region?.toLowerCase().includes(search)
            );
          }
          
          return filtered;
        };

        const filteredRankings = getFilteredRankings();
        const metadata = leaderboardData?.metadata;

        return (
          <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Donor Leaderboard
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {metadata?.totalParticipants || 0} active donors • Updated {metadata?.lastUpdated ? new Date(metadata.lastUpdated).toLocaleDateString() : 'recently'}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search donors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Timeframe filter */}
            <Select value={selectedTimeframe} onValueChange={(value: any) => setSelectedTimeframe(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort by filter */}
            <Select value={selectedSortBy} onValueChange={(value: any) => setSelectedSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">Overall Score</SelectItem>
                <SelectItem value="delivery_rate">Delivery Rate</SelectItem>
                <SelectItem value="commitment_value">Commitment Value</SelectItem>
                <SelectItem value="consistency">Consistency</SelectItem>
              </SelectContent>
            </Select>

            {/* Region filter */}
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger>
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                <SelectItem value="North">North</SelectItem>
                <SelectItem value="South">South</SelectItem>
                <SelectItem value="East">East</SelectItem>
                <SelectItem value="West">West</SelectItem>
                <SelectItem value="Central">Central</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

        <CardContent className="space-y-2">
          {filteredRankings.length === 0 ? (
            searchTerm || selectedRegion ? (
              <EmptySearchResults onClearFilters={() => {
                setSearchTerm('')
                setSelectedRegion('')
              }} />
            ) : (
              <EmptyState
                type="data"
                title="No leaderboard data"
                description="No donors have been ranked yet."
                action={{
                  label: "Refresh",
                  onClick: retry,
                  variant: "outline"
                }}
                icon={Trophy}
              />
            )
          ) : (
          filteredRankings.map((entry: any) => (
            <div
              key={entry.donor.id}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border transition-all duration-200",
                interactive && "hover:shadow-md hover:border-blue-200 cursor-pointer",
                entry.rank <= 3 && "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200"
              )}
            >
              {/* Left side - Rank, name, location */}
              <div className="flex items-center space-x-4 flex-1">
                <div className="flex items-center space-x-2">
                  {getRankIcon(entry.rank)}
                  {getTrendIcon(entry.trend, entry.previousRank)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {entry.donor.organizationName}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{entry.donor.region || 'Unassigned'}</span>
                    {entry.previousRank && (
                      <span className="text-xs">
                        (#{entry.previousRank} → #{entry.rank})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center - Key metrics */}
              <div className="hidden md:flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {entry.metrics.deliveryRates.verified.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Delivery Rate</div>
                </div>
                
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {entry.metrics.commitments.total}
                  </div>
                  <div className="text-xs text-gray-500">Commitments</div>
                </div>
                
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    ₦{entry.metrics.commitments.totalValue.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Total Value</div>
                </div>
                
                <div className="text-center">
                  <div className="font-semibold text-blue-600">
                    {entry.metrics.performance.overallScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">Score</div>
                </div>
              </div>

              {/* Right side - Badges */}
              <div className="flex items-center space-x-2">
                <GameBadgeSystem 
                  badges={entry.badges as BadgeType[]} 
                  size="sm" 
                  showProgress={false} 
                />
                
                {/* Mobile score display */}
                <div className="md:hidden">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {entry.metrics.performance.overallScore.toFixed(1)}
                  </Badge>
                </div>
              </div>
            </div>
          ))
          )}

          {/* Load more button for large datasets */}
          {filteredRankings.length >= selectedLimit && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedLimit(prev => prev + 25)}
              >
                Load More
              </Button>
            </div>
          )}
        </CardContent>
          </Card>
        )
      }}
    </SafeDataLoader>
  );
}