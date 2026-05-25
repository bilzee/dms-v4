'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Home,
  GraduationCap,
  Hospital,
  Wheat,
  Building,
  AlertTriangle,
  Loader2,
  AlertCircle
} from '@/lib/icons';

// Types
interface GroupedImpactSummaryProps {
  incidentId: string;
  className?: string;
}

interface PreliminaryImpactData {
  livesLost: number;
  injured: number;
  displaced: number;
  housesAffected: number;
  schoolsAffected: number;
  medicalFacilitiesAffected: number;
  agriculturalLandAffected: number;
}

interface ImpactGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  items: Array<{
    label: string;
    value: number;
    unit?: string;
  }>;
}

/**
 * Format large numbers with commas
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return new Intl.NumberFormat().format(num);
};

// Fetch preliminary impact from dashboard API
const fetchPreliminaryImpact = async (incidentId: string): Promise<PreliminaryImpactData> => {
  const params = new URLSearchParams({ incidentId });
  const response = await apiGet(`/api/v1/dashboard/situation?${params}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch preliminary impact');
  }

  // Extract preliminary impact from selected incident
  const preliminaryData = response.data.selectedIncident?.populationImpact?.preliminary || {
    livesLost: 0,
    injured: 0,
    displaced: 0,
    housesAffected: 0,
    schoolsAffected: 0,
    medicalFacilitiesAffected: 0,
    agriculturalLandAffected: 0,
  };

  return preliminaryData;
};

/**
 * GroupedImpactSummary Component
 * 
 * Displays preliminary impact assessment data grouped into three categories:
 * - Human Impact (Lives Lost, Injured, Displaced)
 * - Infrastructure Impact (Houses, Schools, Medical Facilities)  
 * - Agricultural Impact (Land Affected)
 */
export function GroupedImpactSummary({ incidentId, className }: GroupedImpactSummaryProps) {
  // Fetch preliminary impact data
  const {
    data: preliminaryData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['grouped-impact-summary', incidentId],
    queryFn: () => fetchPreliminaryImpact(incidentId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!incidentId
  });

  // Handle loading state
  if (isLoading) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Preliminary Impact Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Loading impact assessment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error || !preliminaryData) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Preliminary Impact Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load impact assessment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group impact data
  const impactGroups: ImpactGroup[] = [
    {
      title: 'Human Impact',
      icon: Users,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      items: [
        { label: 'Lives Lost', value: preliminaryData.livesLost },
        { label: 'Injured', value: preliminaryData.injured },
        { label: 'Displaced', value: preliminaryData.displaced }
      ]
    },
    {
      title: 'Infrastructure',
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      items: [
        { label: 'Houses', value: preliminaryData.housesAffected },
        { label: 'Schools', value: preliminaryData.schoolsAffected },
        { label: 'Medical', value: preliminaryData.medicalFacilitiesAffected }
      ]
    },
    {
      title: 'Agricultural',
      icon: Wheat,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      items: [
        { label: 'Land Affected', value: preliminaryData.agriculturalLandAffected, unit: 'ha' }
      ]
    }
  ];

  // Check if any impact data exists
  const hasImpactData = impactGroups.some(group => 
    group.items.some(item => item.value > 0)
  );

  if (!hasImpactData) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-gray-500" />
            Preliminary Impact Assessment
            <Badge variant="secondary" className="text-xs">
              No data
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No preliminary assessment data available</p>
            <p className="text-xs text-gray-400 mt-1">
              Complete preliminary assessments to see estimated impact
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create individual tiles exactly like the right panel
  const impactTiles = [
    {
      label: 'Lives Lost',
      value: preliminaryData.livesLost,
      icon: Users,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      labelColor: 'text-red-600'
    },
    {
      label: 'Injured',
      value: preliminaryData.injured,
      icon: Users,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700',
      labelColor: 'text-orange-600'
    },
    {
      label: 'Displaced',
      value: preliminaryData.displaced,
      icon: Users,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      labelColor: 'text-yellow-600'
    },
    {
      label: 'Houses',
      value: preliminaryData.housesAffected,
      icon: Home,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      labelColor: 'text-purple-600'
    },
    {
      label: 'Schools',
      value: preliminaryData.schoolsAffected,
      icon: GraduationCap,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      labelColor: 'text-blue-600'
    },
    {
      label: 'Medical',
      value: preliminaryData.medicalFacilitiesAffected,
      icon: Hospital,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      labelColor: 'text-green-600'
    },
    {
      label: 'Agricultural Land',
      value: preliminaryData.agriculturalLandAffected,
      icon: Wheat,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700',
      labelColor: 'text-emerald-600',
      unit: 'ha'
    }
  ];

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Preliminary Impact Assessment
            <Badge variant="secondary" className="text-xs">
              Estimates
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-700 font-normal">
            <AlertTriangle className="h-3 w-3" />
            <span>Preliminary estimates - not verified</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex gap-3">
          {/* Human Impact Group */}
          <div className="flex-1 p-3 border border-red-200 rounded-lg bg-red-25">
            <div className="text-xs font-medium text-red-700 mb-3 text-center">Human Impact</div>
            <div className="grid grid-cols-3 gap-3">
              {impactTiles.slice(0, 3).map((tile, index) => {
                const Icon = tile.icon;
                return (
                  <div key={index} className={cn(
                    "text-center p-3 rounded border",
                    tile.bgColor,
                    tile.borderColor
                  )}>
                    <Icon className={cn("h-4 w-4 mx-auto mb-1", tile.labelColor)} />
                    <div className={cn("text-lg font-bold", tile.textColor)}>
                      {formatNumber(tile.value)}{tile.unit && ` ${tile.unit}`}
                    </div>
                    <div className={cn("text-xs", tile.labelColor)}>
                      {tile.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Infrastructure Impact Group */}
          <div className="flex-1 p-3 border border-blue-200 rounded-lg bg-blue-25">
            <div className="text-xs font-medium text-blue-700 mb-3 text-center">Infrastructure Impact</div>
            <div className="grid grid-cols-3 gap-3">
              {impactTiles.slice(3, 6).map((tile, index) => {
                const Icon = tile.icon;
                return (
                  <div key={index + 3} className={cn(
                    "text-center p-3 rounded border",
                    tile.bgColor,
                    tile.borderColor
                  )}>
                    <Icon className={cn("h-4 w-4 mx-auto mb-1", tile.labelColor)} />
                    <div className={cn("text-lg font-bold", tile.textColor)}>
                      {formatNumber(tile.value)}{tile.unit && ` ${tile.unit}`}
                    </div>
                    <div className={cn("text-xs", tile.labelColor)}>
                      {tile.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agricultural Impact Group */}
          <div className="flex-[0.5] p-3 border border-green-200 rounded-lg bg-green-25 flex flex-col">
            <div className="text-xs font-medium text-green-700 mb-3 text-center">Agricultural Impact</div>
            <div className="flex-1 flex items-center justify-center">
              {impactTiles.slice(6, 7).map((tile, index) => {
                const Icon = tile.icon;
                return (
                  <div key={index + 6} className={cn(
                    "text-center p-3 rounded border w-full",
                    tile.bgColor,
                    tile.borderColor
                  )}>
                    <Icon className={cn("h-4 w-4 mx-auto mb-1", tile.labelColor)} />
                    <div className={cn("text-lg font-bold", tile.textColor)}>
                      {formatNumber(tile.value)}{tile.unit && ` ${tile.unit}`}
                    </div>
                    <div className={cn("text-xs", tile.labelColor)}>
                      {tile.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GroupedImpactSummary;