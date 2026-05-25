'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { useSeverityThresholds } from '@/hooks/useSeverityThresholds';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle,
  TrendingUp,
  Users,
  Home,
  GraduationCap,
  Hospital,
  Wheat,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  Info
} from '@/lib/icons';

// Types for preliminary impact data
interface PreliminaryImpactProps {
  incidentId?: string;
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
  latestAssessmentDate: string | null;
  assessmentCount: number;
}

/**
 * Format large numbers with commas
 */
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

/**
 * Format date to readable string
 */
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'No assessments';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid date';
  }
};


// Fetch preliminary impact from dashboard API
const fetchPreliminaryImpact = async (incidentId?: string): Promise<PreliminaryImpactData> => {
  if (!incidentId) {
    // Return empty data if no incident selected
    return {
      livesLost: 0,
      injured: 0,
      displaced: 0,
      housesAffected: 0,
      schoolsAffected: 0,
      medicalFacilitiesAffected: 0,
      agriculturalLandAffected: 0,
      latestAssessmentDate: null,
      assessmentCount: 0,
    };
  }

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
    latestAssessmentDate: null,
    assessmentCount: 0,
  };

  return preliminaryData;
};

/**
 * PreliminaryImpact Component
 * 
 * Displays preliminary impact statistics from Preliminary Assessments including:
 * - Lives lost, injured, displaced (casualties)
 * - Infrastructure impact (houses, schools, medical facilities)
 * - Agricultural impact
 * - Latest assessment date and count
 * - Warning about estimates being unverified
 */
export function PreliminaryImpact({ incidentId, className }: PreliminaryImpactProps) {
  // Use configurable severity thresholds
  const { calculateSeverity } = useSeverityThresholds('PRELIMINARY');
  
  // Fetch preliminary impact data
  const {
    data: preliminaryData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['preliminaryImpact', incidentId],
    queryFn: () => fetchPreliminaryImpact(incidentId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!incidentId // Only fetch if incident is selected
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
        <CardContent className="space-y-4">
          <div className="text-center py-6 text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Loading preliminary impact data...</p>
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
            Preliminary Impact Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6 text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load preliminary impact data</p>
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

  // Handle no incident selected
  if (!incidentId) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Preliminary Impact Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6 text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select an incident to view preliminary impact estimates</p>
            <p className="text-xs text-gray-400 mt-1">
              Based on preliminary assessments (not verified)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const severity = calculateSeverity(preliminaryData.livesLost, preliminaryData.injured, preliminaryData.displaced);
  const hasData = preliminaryData.assessmentCount > 0;
  const totalInfrastructureAffected = preliminaryData.housesAffected + 
                                    preliminaryData.schoolsAffected + 
                                    preliminaryData.medicalFacilitiesAffected;

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Preliminary Impact Assessment
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Initial estimated impact (not verified) of the incident can be as high as the following:</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* No data state */}
        {!hasData && (
          <div className="text-center py-6 text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No preliminary assessment data available</p>
            <p className="text-xs text-gray-400 mt-1">
              Complete preliminary assessments to see estimated impact
            </p>
          </div>
        )}

        {hasData && (
          <>
            {/* Casualty Statistics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Human Impact (Estimates)</span>
                <Badge className={cn("gap-1", severity.color)}>
                  <AlertTriangle className="h-3 w-3" />
                  {severity.level}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                  <div className="text-lg font-bold text-red-700">
                    {formatNumber(preliminaryData.livesLost)}
                  </div>
                  <div className="text-xs text-red-600">Lives Lost</div>
                </div>
                
                <div className="text-center p-2 bg-orange-50 rounded border border-orange-200">
                  <div className="text-lg font-bold text-orange-700">
                    {formatNumber(preliminaryData.injured)}
                  </div>
                  <div className="text-xs text-orange-600">Injured</div>
                </div>
                
                <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                  <div className="text-lg font-bold text-yellow-700">
                    {formatNumber(preliminaryData.displaced)}
                  </div>
                  <div className="text-xs text-yellow-600">Displaced</div>
                </div>
              </div>
            </div>

            {/* Infrastructure Impact */}
            {totalInfrastructureAffected > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Infrastructure Impact</span>
                  <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    {formatNumber(totalInfrastructureAffected)} total facilities
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-purple-50 rounded border border-purple-200">
                    <Home className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                    <div className="text-lg font-bold text-purple-700">
                      {formatNumber(preliminaryData.housesAffected)}
                    </div>
                    <div className="text-xs text-purple-600">Houses</div>
                  </div>
                  
                  <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                    <GraduationCap className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                    <div className="text-lg font-bold text-blue-700">
                      {formatNumber(preliminaryData.schoolsAffected)}
                    </div>
                    <div className="text-xs text-blue-600">Schools</div>
                  </div>
                  
                  <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                    <Hospital className="h-4 w-4 mx-auto mb-1 text-green-600" />
                    <div className="text-lg font-bold text-green-700">
                      {formatNumber(preliminaryData.medicalFacilitiesAffected)}
                    </div>
                    <div className="text-xs text-green-600">Medical</div>
                  </div>
                </div>
              </div>
            )}

            {/* Agricultural Impact */}
            {preliminaryData.agriculturalLandAffected > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Agricultural Impact</div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <Wheat className="h-6 w-6 mx-auto mb-1 text-green-600" />
                  <div className="text-xl font-bold text-green-900">
                    {formatNumber(preliminaryData.agriculturalLandAffected)} ha
                  </div>
                  <div className="text-xs text-green-600">Agricultural Land Affected</div>
                </div>
              </div>
            )}

            {/* Assessment Information */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>Latest Assessment:</span>
                <span className="font-medium">{formatDate(preliminaryData.latestAssessmentDate)}</span>
              </div>
              <div className="flex items-center gap-2 ml-5 text-xs text-gray-400">
                <FileText className="h-3 w-3" />
                <span>Based on {preliminaryData.assessmentCount} preliminary assessment{preliminaryData.assessmentCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PreliminaryImpact;