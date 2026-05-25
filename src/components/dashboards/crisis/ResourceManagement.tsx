'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Package,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  BarChart3,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Edit
} from '@/lib/icons';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { ResourceGapAnalysis } from './ResourceGapAnalysis';
import { DonorCommitment, Donor, Entity, Incident } from '@/types/commitment';

interface ResourceManagementProps {
  className?: string;
}

interface CommitmentStats {
  totalCommitments: number;
  totalValue: number;
  totalCommittedQuantity: number;
  totalDeliveredQuantity: number;
  averageDeliveryRate: number;
  byStatus: Record<string, number>;
  criticalGaps: number;
}

const STATUS_ICONS = {
  PLANNED: Clock,
  PARTIAL: Truck,
  COMPLETE: CheckCircle2,
  CANCELLED: XCircle
};

export function ResourceManagement({ className }: ResourceManagementProps) {
  const { token, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    donorId: 'all',
    entityId: 'all',
    incidentId: 'all'
  });

  // Fetch resource management statistics
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery<CommitmentStats>({
    queryKey: ['resource-management-stats', filters, token],
    enabled: isAuthenticated && !!token && token.length > 10, // More robust token validation
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });

      const result = await apiGet(`/api/v1/dashboard/resource-management/stats?${params}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch resource management stats')
      return (result.data as any)?.data || result.data || {};
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  // Fetch active commitments for overview
  const { data: commitmentsData, isLoading: commitmentsLoading, refetch: refetchCommitments } = useQuery<{
    data: DonorCommitment[];
    pagination: any;
  }>({
    queryKey: ['active-commitments', filters, searchTerm, token],
    enabled: isAuthenticated && !!token && token.length > 10, // More robust token validation
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });
      if (searchTerm) params.append('search', searchTerm);

      const result = await apiGet(`/api/v1/dashboard/resource-management/commitments?${params}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch commitments')
      return (result.data as any)?.data || result.data || { data: [], pagination: {} };
    },
    refetchInterval: 30000
  });

  // Fetch critical gaps for alerts
  const { data: criticalGaps, isLoading: gapsLoading, refetch: refetchGaps } = useQuery<{
    criticalGaps: Array<{
      entity: Entity;
      resource: string;
      unmetNeed: number;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
  }>({
    queryKey: ['critical-gaps', token],
    enabled: isAuthenticated && !!token && token.length > 10, // More robust token validation
    queryFn: async () => {
      const result = await apiGet('/api/v1/dashboard/resource-management/critical-gaps')
      if (!result.success) throw new Error(result.error || 'Failed to fetch critical gaps')
      return (result.data as any)?.data || result.data || { criticalGaps: [] };
    },
    refetchInterval: 60000 // Check gaps every minute
  });

  const handleRefresh = () => {
    refetchStats();
    refetchCommitments();
    refetchGaps();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusBadge = (status: string) => {
    const Icon = STATUS_ICONS[status as keyof typeof STATUS_ICONS] || Clock;
    return (
      <StatusBadge
        domain="commitment"
        status={status}
        icon={Icon}
      />
    );
  };

  const calculateDeliveryProgress = (committed: number, delivered: number) => {
    if (committed === 0) return 0;
    return Math.round((delivered / committed) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle errors gracefully - don't block the entire UI
  const hasAuthError = statsError?.message?.includes('401') || statsError?.message?.includes('Unauthorized');
  
  // Provide fallback data when there are errors or no data
  const fallbackStats = {
    totalCommitments: 0,
    totalValue: 0,
    totalCommittedQuantity: 0,
    totalDeliveredQuantity: 0,
    averageDeliveryRate: 0,
    byStatus: {},
    criticalGaps: 0
  };
  
  const displayStats = stats || fallbackStats;
  const displayCommitments = commitmentsData?.data || [];
  const displayCriticalGaps = criticalGaps?.criticalGaps || [];

  // Wait for authentication to be ready
  if (!isAuthenticated || !token || token.length < 10) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading resource management data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={statsLoading || commitmentsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {hasAuthError && (
            <div className="text-amber-600 text-sm flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Data loading in progress...
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <StatCardGrid columns={4} className="mb-6">
          <StatCard
            label="Total Commitments"
            value={displayStats.totalCommitments || 0}
            severity="info"
            icon={Package}
          />
          <StatCard
            label="Delivery Progress"
            value={`${calculateDeliveryProgress(displayStats.totalCommittedQuantity || 0, displayStats.totalDeliveredQuantity || 0)}%`}
            severity="success"
            icon={Target}
          />
          <StatCard
            label="Active Donors"
            value={(displayStats.byStatus as any)?.PLANNED || 0}
            severity="info"
            icon={Users}
          />
          <StatCard
            label="Critical Gaps"
            value={displayCriticalGaps.length || 0}
            severity="critical"
            icon={AlertTriangle}
          />
        </StatCardGrid>

      {/* Critical Gaps Alert */}
      {displayCriticalGaps.length > 0 && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{displayCriticalGaps.length} critical resource gap(s) identified.</strong> Review the Gap Analysis tab for details and recommended actions.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Donation Overview
          </TabsTrigger>
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Gap Analysis
          </TabsTrigger>
        </TabsList>

        {/* Donation Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search commitments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="PARTIAL">In Progress</SelectItem>
                    <SelectItem value="COMPLETE">Complete</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.entityId} onValueChange={(value) => handleFilterChange('entityId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {/* Will be populated from API */}
                  </SelectContent>
                </Select>

                <Select value={filters.incidentId} onValueChange={(value) => handleFilterChange('incidentId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Incidents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Incidents</SelectItem>
                    {/* Will be populated from API */}
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => setFilters({ status: 'all', donorId: 'all', entityId: 'all', incidentId: 'all' })}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Commitments List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Commitments</CardTitle>
              <CardDescription>
                {commitmentsData?.pagination ? 
                  `Showing ${commitmentsData.data.length} commitments` :
                  'Latest donor commitments and delivery progress'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commitmentsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : displayCommitments.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No commitments found
                  </h3>
                  <p className="text-muted-foreground">
                    No commitments match the current filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayCommitments.map((commitment) => (
                    <Card key={commitment.id} className="bg-blue-500/5 border-blue-500/15">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">
                                {commitment.items.length === 1 
                                  ? `${commitment.items[0].quantity} ${commitment.items[0].unit} of ${commitment.items[0].name}`
                                  : `${commitment.items.length} items`
                                }
                              </h3>
                              {getStatusBadge(commitment.status)}
                            </div>
                            
                            <div className="grid gap-2 md:grid-cols-3 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>Donor: {commitment.donor.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span>Entity: {commitment.entity.name}</span>
                              </div>
                              <div>
                                Created: {formatDate(commitment.commitmentDate)}
                              </div>
                            </div>

                            {/* Delivery Progress */}
                            <div className="mb-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span>Delivery Progress</span>
                                <span className="font-medium">
                                  {commitment.deliveredQuantity} / {commitment.totalCommittedQuantity} units
                                  ({calculateDeliveryProgress(commitment.totalCommittedQuantity, commitment.deliveredQuantity)}%)
                                </span>
                              </div>
                              <Progress 
                                value={calculateDeliveryProgress(commitment.totalCommittedQuantity, commitment.deliveredQuantity)} 
                                className="h-2"
                              />
                            </div>

                            {/* Items Summary */}
                            <div className="bg-muted/50 rounded-lg p-3">
                              <h4 className="font-medium text-sm mb-2">Commitment Items:</h4>
                              <div className="grid gap-1 text-sm">
                                {Array.isArray(commitment.items) && commitment.items.map((item: any, index: number) => (
                                  <div key={index} className="flex justify-between">
                                    <span>{item.quantity} {item.unit} of {item.name}</span>
                                    <span className="text-muted-foreground">
                                      ${(item.estimatedValue || 0) * item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gap Analysis Tab */}
        <TabsContent value="gaps">
          <ResourceGapAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}