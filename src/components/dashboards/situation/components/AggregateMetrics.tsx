'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Building,
  FileCheck,
  Truck,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  CheckCircle,
  Clock,
  BarChart3,
  Loader2,
  AlertCircle
} from 'lucide-react';

// Types for aggregate metrics data
interface AggregateMetricsProps {
  incidentId?: string;
  className?: string;
}

interface AggregateMetricsData {
  affectedEntitiesCount: number;
  totalAssessmentsCount: number;
  verifiedAssessmentsCount: number;
  responsesCount: number;
  deliveryRate: number;
  coverageRate: number;
  trends?: {
    assessmentsChange: number;
    responsesChange: number;
    entitiesChange: number;
  };
}

interface MetricCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

const formatPercentage = (value: number): string => {
  return `${Math.round(value * 100)}%`;
};

const getTrendIndicator = (trend: number | undefined) => {
  if (!trend) return null;
  
  const isPositive = trend > 0;
  const isNeutral = trend === 0;
  
  return {
    icon: isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown,
    color: isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600',
    label: isNeutral ? 'No change' : `${isPositive ? '+' : ''}${trend}%`
  };
};

const getDeliveryRateStatus = (rate: number) => {
  if (rate >= 0.8) return { status: 'Excellent', color: 'text-green-600 bg-green-100' };
  if (rate >= 0.6) return { status: 'Good', color: 'text-blue-600 bg-blue-100' };
  if (rate >= 0.4) return { status: 'Fair', color: 'text-yellow-600 bg-yellow-100' };
  return { status: 'Poor', color: 'text-red-600 bg-red-100' };
};

const getCoverageRateStatus = (rate: number) => {
  if (rate >= 1.0) return { status: 'Complete', color: 'text-green-600 bg-green-100' };
  if (rate >= 0.8) return { status: 'Good', color: 'text-blue-600 bg-blue-100' };
  if (rate >= 0.6) return { status: 'Partial', color: 'text-yellow-600 bg-yellow-100' };
  return { status: 'Low', color: 'text-red-600 bg-red-100' };
};

const fetchAggregateMetrics = async (incidentId?: string): Promise<AggregateMetricsData> => {
  const params = new URLSearchParams({
    ...(incidentId && { incidentId }),
    includeEntityLocations: 'false',
    includeDonorAssignments: 'false'
  });

  const response = await apiGet(`/api/v1/dashboard/situation?${params}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch aggregate metrics');
  }

  const { data } = response;
  
  const selectedIncident = incidentId && data.selectedIncident?.aggregateMetrics
    ? data.selectedIncident.aggregateMetrics
    : {
        affectedEntitiesCount: data.entities?.length || 0,
        totalAssessmentsCount: data.entities?.length || 0,
        verifiedAssessmentsCount: 0,
        responsesCount: 0,
        deliveryRate: 0,
        coverageRate: 0
      };

  return {
    affectedEntitiesCount: selectedIncident.affectedEntitiesCount || 0,
    totalAssessmentsCount: selectedIncident.totalAssessmentsCount || 0,
    verifiedAssessmentsCount: selectedIncident.verifiedAssessmentsCount || 0,
    responsesCount: selectedIncident.responsesCount || 0,
    deliveryRate: selectedIncident.deliveryRate || 0,
    coverageRate: selectedIncident.coverageRate || 0,
    trends: selectedIncident.trends
  };
};

export function AggregateMetrics({ incidentId, className }: AggregateMetricsProps) {
  const {
    data: metricsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['aggregateMetrics', incidentId],
    queryFn: () => fetchAggregateMetrics(incidentId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Operational Metrics...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-200 h-4 w-4 animate-pulse" />
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-300 rounded w-24 animate-pulse" />
                      <div className="h-3 bg-gray-300 rounded w-16 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !metricsData) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Operational Metrics Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6 text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load aggregate metrics</p>
            <button
              onClick={() => refetch()}
              className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const deliveryStatus = getDeliveryRateStatus(metricsData.deliveryRate);
  const coverageStatus = getCoverageRateStatus(metricsData.coverageRate);
  const verificationRate = metricsData.totalAssessmentsCount > 0 
    ? metricsData.verifiedAssessmentsCount / metricsData.totalAssessmentsCount 
    : 0;

  const data = metricsData;

  const metrics: MetricCard[] = [
    {
      title: 'Affected Entities',
      value: metricsData.affectedEntitiesCount,
      subtitle: 'Locations impacted',
      icon: Building,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      trend: metricsData.trends?.entitiesChange ? {
        value: metricsData.trends.entitiesChange,
        direction: metricsData.trends.entitiesChange > 0 ? 'up' : 
                   metricsData.trends.entitiesChange < 0 ? 'down' : 'neutral'
      } : undefined
    },
    {
      title: 'Total Assessments',
      value: metricsData.totalAssessmentsCount,
      subtitle: `${metricsData.verifiedAssessmentsCount} verified`,
      icon: FileCheck,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      trend: metricsData.trends?.assessmentsChange ? {
        value: metricsData.trends.assessmentsChange,
        direction: metricsData.trends.assessmentsChange > 0 ? 'up' : 
                   metricsData.trends.assessmentsChange < 0 ? 'down' : 'neutral'
      } : undefined
    },
    {
      title: 'Responses',
      value: metricsData.responsesCount,
      subtitle: 'Resources delivered',
      icon: Truck,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      trend: metricsData.trends?.responsesChange ? {
        value: metricsData.trends.responsesChange,
        direction: metricsData.trends.responsesChange > 0 ? 'up' : 
                   metricsData.trends.responsesChange < 0 ? 'down' : 'neutral'
      } : undefined
    }
  ];

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Operational Metrics
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 gap-3">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const trendIndicator = metric.trend ? getTrendIndicator(metric.trend.value) : null;
            
            return (
              <div 
                key={index}
                className={cn(
                  "p-3 rounded-lg border",
                  metric.bgColor,
                  metric.borderColor
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-white", metric.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {metric.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {metric.subtitle}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className={cn("text-lg font-bold", metric.color)}>
                        {typeof metric.value === 'number' 
                          ? metric.value.toLocaleString() 
                          : metric.value
                        }
                      </div>
                      {trendIndicator && (
                        <div className={cn("flex items-center gap-1 text-xs", trendIndicator.color)}>
                          <trendIndicator.icon className="h-3 w-3" />
                          <span>{trendIndicator.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assessment Verification Status */}
        {data.totalAssessmentsCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Assessment Verification</span>
              <Badge variant="outline" className="text-xs">
                {formatPercentage(verificationRate)} verified
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-600" />
                <div className="text-lg font-bold text-green-700">
                  {data.verifiedAssessmentsCount}
                </div>
                <div className="text-xs text-green-600">Verified</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                <Clock className="h-4 w-4 mx-auto mb-1 text-yellow-600" />
                <div className="text-lg font-bold text-yellow-700">
                  {metricsData.totalAssessmentsCount - metricsData.verifiedAssessmentsCount}
                </div>
                <div className="text-xs text-yellow-600">Pending</div>
              </div>
            </div>
          </div>
        )}

        {/* Response Delivery Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Response Delivery Rate</span>
            <Badge className={cn("gap-1", deliveryStatus.color)}>
              <Activity className="h-3 w-3" />
              {deliveryStatus.status}
            </Badge>
          </div>
          <Progress 
            value={metricsData.deliveryRate * 100} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatPercentage(metricsData.deliveryRate)} delivered</span>
            <span>{metricsData.responsesCount} of {metricsData.totalAssessmentsCount} assessments</span>
          </div>
        </div>

        {/* Entity Coverage Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Entity Coverage</span>
            <Badge className={cn("gap-1", coverageStatus.color)}>
              <Building className="h-3 w-3" />
              {coverageStatus.status}
            </Badge>
          </div>
          <Progress 
            value={Math.min(metricsData.coverageRate * 100, 100)} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatPercentage(Math.min(metricsData.coverageRate, 1))} coverage</span>
            <span>{Math.min(metricsData.affectedEntitiesCount, metricsData.totalAssessmentsCount)} of {metricsData.affectedEntitiesCount} entities</span>
          </div>
        </div>

        {/* Overall Status Summary */}
        <div className="pt-2 border-t border-gray-100">
          <div className="text-sm font-medium text-gray-700 mb-2">Overall Status</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-sm font-medium text-blue-700">
                {formatPercentage(verificationRate)}
              </div>
              <div className="text-xs text-blue-600">Verification</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-sm font-medium text-green-700">
                {formatPercentage(data.deliveryRate)}
              </div>
              <div className="text-xs text-green-600">Delivery</div>
            </div>
          </div>
        </div>

        {/* Trend Information */}
        {data.trends && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-2">24h Trends</div>
            <div className="space-y-1">
              {Object.entries(data.trends).map(([key, value]) => {
                const trendIndicator = getTrendIndicator(value);
                if (!trendIndicator) return null;
                
                const TrendIcon = trendIndicator.icon;
                const labels = {
                  assessmentsChange: 'Assessments',
                  responsesChange: 'Responses', 
                  entitiesChange: 'Entities'
                };
                
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{labels[key as keyof typeof labels]}</span>
                    <div className={cn("flex items-center gap-1", trendIndicator.color)}>
                      <TrendIcon className="h-3 w-3" />
                      <span>{trendIndicator.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AggregateMetrics;
