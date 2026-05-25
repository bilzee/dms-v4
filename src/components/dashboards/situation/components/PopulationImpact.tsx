'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { useSeverityThresholds } from '@/hooks/useSeverityThresholds';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Users,
  Home,
  Heart,
  AlertTriangle,
  Baby,
  User,
  Accessibility,
  Users2,
  FileText,
  TrendingUp,
  Loader2,
  AlertCircle,
  Calendar,
  BarChart3,
  PieChart,
  Grid3X3,
  Info
} from '@/lib/icons';

// Types for verified population impact data (Population Assessments only)
interface PopulationImpactProps {
  incidentId?: string;
  className?: string;
}

interface VerifiedPopulationData {
  totalPopulation: number;
  totalHouseholds: number;
  livesLost: number;
  injured: number;
  percentageMale: number;
  percentageFemale: number;
  percentageChildren: number;
  pregnantWomen: number;
  lactatingWomen: number;
  demographicBreakdown: {
    under5: number;
    elderly: number;
    pwd: number;
    pregnantWomen: number;
    lactatingMothers: number;
    separatedChildren: number;
    populationMale: number;
    populationFemale: number;
  };
  latestAssessmentDate: string | null;
  assessmentCount: number;
}

interface DemographicItem {
  label: string;
  value: number;
  total: number;
  percentage: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

/**
 * Format large numbers with commas
 */
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

/**
 * Calculate percentage with proper rounding
 */
const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};


/**
 * Format date to readable string
 */
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'No verified assessments';
  
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

// Fetch verified population impact from dashboard API
const fetchVerifiedPopulationImpact = async (incidentId?: string): Promise<VerifiedPopulationData> => {
  if (!incidentId) {
    // Return empty data if no incident selected
    return {
      totalPopulation: 0,
      totalHouseholds: 0,
      livesLost: 0,
      injured: 0,
      percentageMale: 0,
      percentageFemale: 0,
      percentageChildren: 0,
      pregnantWomen: 0,
      lactatingWomen: 0,
      demographicBreakdown: {
        under5: 0,
        elderly: 0,
        pwd: 0,
        pregnantWomen: 0,
        lactatingMothers: 0,
        separatedChildren: 0,
        populationMale: 0,
        populationFemale: 0
      },
      latestAssessmentDate: null,
      assessmentCount: 0
    };
  }

  const params = new URLSearchParams({ incidentId });
  const response = await apiGet(`/api/v1/dashboard/situation?${params}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch verified population impact');
  }

  // Extract verified population impact from selected incident
  const verifiedData = response.data.selectedIncident?.populationImpact?.verified || {
    totalPopulation: 0,
    totalHouseholds: 0,
    livesLost: 0,
    injured: 0,
    percentageMale: 0,
    percentageFemale: 0,
    percentageChildren: 0,
    pregnantWomen: 0,
    lactatingWomen: 0,
    demographicBreakdown: {
      under5: 0,
      elderly: 0,
      pwd: 0,
      pregnantWomen: 0,
      lactatingMothers: 0,
      separatedChildren: 0,
      populationMale: 0,
      populationFemale: 0
    },
    latestAssessmentDate: null,
    assessmentCount: 0
  };

  return verifiedData;
};

/**
 * PopulationImpact Component
 * 
 * Displays verified population impact statistics from Population Assessments including:
 * - Total population and households affected
 * - Verified casualty statistics (lives lost, injured)
 * - Demographic breakdown with percentages
 * - Gender distribution
 * - Vulnerable population highlights
 * - Latest verified assessment date
 */
export function PopulationImpact({ incidentId, className }: PopulationImpactProps) {
  // Use configurable severity thresholds
  const { calculateSeverity } = useSeverityThresholds('POPULATION');
  
  // Chart type states for different sections
  const [vulnerableChartType, setVulnerableChartType] = useState<'bar' | 'pie' | 'tiles'>('bar');
  const [casualtyChartType, setCasualtyChartType] = useState<'bar' | 'pie' | 'tiles'>('tiles');
  const [genderChartType, setGenderChartType] = useState<'bar' | 'pie' | 'tiles'>('tiles');
  
  // Fetch verified population impact data
  const {
    data: populationData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['verifiedPopulationImpact', incidentId],
    queryFn: () => fetchVerifiedPopulationImpact(incidentId),
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
            Population Impact (Verified)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Loading population impact data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error || !populationData) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Verified Population Impact Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6 text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load population impact data</p>
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
            <Users className="h-5 w-5" />
            Population Impact (Verified)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select an incident to view population impact</p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete population assessments to see impact statistics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const casualtySeverity = calculateSeverity(populationData.livesLost, populationData.injured);
  const totalVulnerable = populationData.demographicBreakdown.under5 + 
                          populationData.demographicBreakdown.elderly + 
                          populationData.demographicBreakdown.pwd + 
                          populationData.demographicBreakdown.pregnantWomen + 
                          populationData.demographicBreakdown.lactatingMothers + 
                          populationData.demographicBreakdown.separatedChildren;

  // Demographic data for visualization
  const demographics: DemographicItem[] = [
    {
      label: 'Under 5 years',
      value: populationData.demographicBreakdown.under5,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.under5, populationData.totalPopulation),
      icon: Baby,
      color: 'bg-blue-500'
    },
    {
      label: 'Elderly',
      value: populationData.demographicBreakdown.elderly,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.elderly, populationData.totalPopulation),
      icon: Users2,
      color: 'bg-muted'
    },
    {
      label: 'Persons with Disability',
      value: populationData.demographicBreakdown.pwd,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.pwd, populationData.totalPopulation),
      icon: Accessibility,
      color: 'bg-purple-500'
    },
    {
      label: 'Pregnant Women',
      value: populationData.demographicBreakdown.pregnantWomen,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.pregnantWomen, populationData.totalPopulation),
      icon: User,
      color: 'bg-pink-500'
    },
    {
      label: 'Lactating Mothers',
      value: populationData.demographicBreakdown.lactatingMothers,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.lactatingMothers, populationData.totalPopulation),
      icon: Heart,
      color: 'bg-green-500'
    },
    {
      label: 'Separated Children',
      value: populationData.demographicBreakdown.separatedChildren,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.separatedChildren, populationData.totalPopulation),
      icon: AlertTriangle,
      color: 'bg-yellow-500'
    }
  ];

  // Sort demographics by percentage (highest first)
  const sortedDemographics = demographics.sort((a, b) => b.percentage - a.percentage);

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Population Impact (Verified)
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground hover:text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Verified population data from latest Population Assessments of all affected entities</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* No data state */}
        {populationData.assessmentCount === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No verified population assessment data available</p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete and verify population assessments to see verified impact statistics
            </p>
          </div>
        )}

        {populationData.assessmentCount > 0 && (
          <>
            {/* Total Population and Households */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Users className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <div className="text-xl font-bold text-blue-900">
                  {formatNumber(populationData.totalPopulation)}
                </div>
                <div className="text-xs text-blue-600">Total Population</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <Home className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <div className="text-xl font-bold text-green-900">
                  {formatNumber(populationData.totalHouseholds)}
                </div>
                <div className="text-xs text-green-600">Households</div>
              </div>
            </div>

            {/* Casualty Statistics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Casualty Impact</span>
                  <Badge className={cn("gap-1", casualtySeverity.color)}>
                    <AlertTriangle className="h-3 w-3" />
                    {casualtySeverity.level}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={casualtyChartType === 'bar' ? 'default' : 'outline'}
                    onClick={() => setCasualtyChartType('bar')}
                    className="h-6 px-2 text-xs"
                  >
                    <BarChart3 className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={casualtyChartType === 'pie' ? 'default' : 'outline'}
                    onClick={() => setCasualtyChartType('pie')}
                    className="h-6 px-2 text-xs"
                  >
                    <PieChart className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={casualtyChartType === 'tiles' ? 'default' : 'outline'}
                    onClick={() => setCasualtyChartType('tiles')}
                    className="h-6 px-2 text-xs"
                  >
                    <Grid3X3 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Casualty Visualization */}
              {casualtyChartType === 'pie' ? (
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-center mb-2">
                    <div className="relative w-24 h-24">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {(() => {
                          const casualtyData = [
                            { value: populationData.livesLost, color: '#dc2626', label: 'Lives Lost', percentage: calculatePercentage(populationData.livesLost, populationData.totalPopulation) },
                            { value: populationData.injured, color: '#ea580c', label: 'Injured', percentage: calculatePercentage(populationData.injured, populationData.totalPopulation) }
                          ].filter(item => item.value > 0);
                          
                          const totalCasualtyPercentage = casualtyData.reduce((sum, item) => sum + item.percentage, 0);
                          const nonCasualtyPercentage = 100 - totalCasualtyPercentage;
                          
                          if (totalCasualtyPercentage === 0) return null;
                          
                          let currentAngle = 0;
                          const segments = [];
                          
                          // Add casualty segments
                          casualtyData.forEach((item, index) => {
                            const angle = (item.percentage / 100) * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            currentAngle = endAngle;
                            
                            const x1 = 50 + 35 * Math.cos((startAngle * Math.PI) / 180);
                            const y1 = 50 + 35 * Math.sin((startAngle * Math.PI) / 180);
                            const x2 = 50 + 35 * Math.cos((endAngle * Math.PI) / 180);
                            const y2 = 50 + 35 * Math.sin((endAngle * Math.PI) / 180);
                            
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            
                            const pathData = [
                              `M 50 50`,
                              `L ${x1} ${y1}`,
                              `A 35 35 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                              'Z'
                            ].join(' ');
                            
                            segments.push(
                              <path
                                key={`casualty-${index}`}
                                d={pathData}
                                fill={item.color}
                                stroke="white"
                                strokeWidth="0.5"
                              />
                            );
                          });
                          
                          // Add non-casualty (general) population segment if there's any
                          if (nonCasualtyPercentage > 0) {
                            const angle = (nonCasualtyPercentage / 100) * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            
                            const x1 = 50 + 35 * Math.cos((startAngle * Math.PI) / 180);
                            const y1 = 50 + 35 * Math.sin((startAngle * Math.PI) / 180);
                            const x2 = 50 + 35 * Math.cos((endAngle * Math.PI) / 180);
                            const y2 = 50 + 35 * Math.sin((endAngle * Math.PI) / 180);
                            
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            
                            const pathData = [
                              `M 50 50`,
                              `L ${x1} ${y1}`,
                              `A 35 35 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                              'Z'
                            ].join(' ');
                            
                            segments.push(
                              <path
                                key="non-casualty"
                                d={pathData}
                                fill="#e5e7eb"
                                stroke="white"
                                strokeWidth="0.5"
                              />
                            );
                          }
                          
                          return segments;
                        })()}
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {populationData.livesLost > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-red-600" aria-hidden="true" />
                        <span className="text-muted-foreground flex-1">Lives Lost</span>
                        <span className="font-medium">{formatNumber(populationData.livesLost)}</span>
                        <span className="text-muted-foreground">({calculatePercentage(populationData.livesLost, populationData.totalPopulation)}%)</span>
                      </div>
                    )}
                    {populationData.injured > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-orange-600" aria-hidden="true" />
                        <span className="text-muted-foreground flex-1">Injured</span>
                        <span className="font-medium">{formatNumber(populationData.injured)}</span>
                        <span className="text-muted-foreground">({calculatePercentage(populationData.injured, populationData.totalPopulation)}%)</span>
                      </div>
                    )}
                    {/* Non-casualty population legend */}
                    {((populationData.totalPopulation - populationData.livesLost - populationData.injured) > 0) && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-gray-300" aria-hidden="true" />
                        <span className="text-muted-foreground flex-1">Unaffected Population</span>
                        <span className="font-medium">{formatNumber(populationData.totalPopulation - populationData.livesLost - populationData.injured)}</span>
                        <span className="text-muted-foreground">({calculatePercentage(populationData.totalPopulation - populationData.livesLost - populationData.injured, populationData.totalPopulation)}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : casualtyChartType === 'bar' ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Lives Lost</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatNumber(populationData.livesLost)}</span>
                        <span className="text-muted-foreground">{calculatePercentage(populationData.livesLost, populationData.totalPopulation)}%</span>
                      </div>
                    </div>
                    <Progress 
                      value={calculatePercentage(populationData.livesLost, populationData.totalPopulation)} 
                      className="h-1 bg-red-100 [&>div]:bg-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Injured Persons</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatNumber(populationData.injured)}</span>
                        <span className="text-muted-foreground">{calculatePercentage(populationData.injured, populationData.totalPopulation)}%</span>
                      </div>
                    </div>
                    <Progress 
                      value={calculatePercentage(populationData.injured, populationData.totalPopulation)} 
                      className="h-1 bg-orange-100 [&>div]:bg-orange-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                    <div className="text-lg font-bold text-red-700">
                      {formatNumber(populationData.livesLost)}
                    </div>
                    <div className="text-xs text-red-600">Lives Lost</div>
                    <div className="text-xs text-muted-foreground">
                      {calculatePercentage(populationData.livesLost, populationData.totalPopulation)}%
                    </div>
                  </div>
                  
                  <div className="text-center p-2 bg-orange-50 rounded border border-orange-200">
                    <div className="text-lg font-bold text-orange-700">
                      {formatNumber(populationData.injured)}
                    </div>
                    <div className="text-xs text-orange-600">Injured Persons</div>
                    <div className="text-xs text-muted-foreground">
                      {calculatePercentage(populationData.injured, populationData.totalPopulation)}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Gender Distribution */}
            {(populationData.demographicBreakdown.populationMale > 0 || populationData.demographicBreakdown.populationFemale > 0) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Gender Distribution</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={genderChartType === 'bar' ? 'default' : 'outline'}
                      onClick={() => setGenderChartType('bar')}
                      className="h-6 px-2 text-xs"
                    >
                      <BarChart3 className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={genderChartType === 'pie' ? 'default' : 'outline'}
                      onClick={() => setGenderChartType('pie')}
                      className="h-6 px-2 text-xs"
                    >
                      <PieChart className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={genderChartType === 'tiles' ? 'default' : 'outline'}
                      onClick={() => setGenderChartType('tiles')}
                      className="h-6 px-2 text-xs"
                    >
                      <Grid3X3 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Gender Visualization */}
                {genderChartType === 'pie' ? (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center justify-center mb-2">
                    <div className="relative w-24 h-24">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          {(() => {
                            const genderData = [
                              { value: populationData.demographicBreakdown.populationMale, color: '#2563eb', label: 'Male', percentage: populationData.percentageMale },
                              { value: populationData.demographicBreakdown.populationFemale, color: '#ec4899', label: 'Female', percentage: populationData.percentageFemale }
                            ].filter(item => item.value > 0);
                            
                            const total = genderData.reduce((sum, item) => sum + item.value, 0);
                            if (total === 0) return null;
                            
                            let currentAngle = 0;
                            
                            return genderData.map((item, index) => {
                              const angle = (item.value / total) * 360;
                              const startAngle = currentAngle;
                              const endAngle = currentAngle + angle;
                              currentAngle = endAngle;
                              
                              const x1 = 50 + 35 * Math.cos((startAngle * Math.PI) / 180);
                              const y1 = 50 + 35 * Math.sin((startAngle * Math.PI) / 180);
                              const x2 = 50 + 35 * Math.cos((endAngle * Math.PI) / 180);
                              const y2 = 50 + 35 * Math.sin((endAngle * Math.PI) / 180);
                              
                              const largeArcFlag = angle > 180 ? 1 : 0;
                              
                              const pathData = [
                                `M 50 50`,
                                `L ${x1} ${y1}`,
                                `A 35 35 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                'Z'
                              ].join(' ');
                              
                              return (
                                <path
                                  key={index}
                                  d={pathData}
                                  fill={item.color}
                                  stroke="white"
                                  strokeWidth="0.5"
                                />
                              );
                            });
                          })()}
                        </svg>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-blue-600" aria-hidden="true" />
                        <span className="text-muted-foreground flex-1">Male</span>
                        <span className="font-medium">{formatNumber(populationData.demographicBreakdown.populationMale)}</span>
                        <span className="text-muted-foreground">({populationData.percentageMale}%)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-pink-600" aria-hidden="true" />
                        <span className="text-muted-foreground flex-1">Female</span>
                        <span className="font-medium">{formatNumber(populationData.demographicBreakdown.populationFemale)}</span>
                        <span className="text-muted-foreground">({populationData.percentageFemale}%)</span>
                      </div>
                    </div>
                  </div>
                ) : genderChartType === 'bar' ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Male</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatNumber(populationData.demographicBreakdown.populationMale)}</span>
                          <span className="text-muted-foreground">{populationData.percentageMale}%</span>
                        </div>
                      </div>
                      <Progress 
                        value={populationData.percentageMale} 
                        className="h-1 bg-blue-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Female</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatNumber(populationData.demographicBreakdown.populationFemale)}</span>
                          <span className="text-muted-foreground">{populationData.percentageFemale}%</span>
                        </div>
                      </div>
                      <Progress 
                        value={populationData.percentageFemale} 
                        className="h-1 bg-pink-100 [&>div]:bg-pink-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                      <div className="text-lg font-bold text-blue-700">
                        {formatNumber(populationData.demographicBreakdown.populationMale)}
                      </div>
                      <div className="text-xs text-blue-600">Male</div>
                      <div className="text-xs text-muted-foreground">
                        {populationData.percentageMale}%
                      </div>
                    </div>
                    
                    <div className="text-center p-2 bg-pink-50 rounded border border-pink-200">
                      <div className="text-lg font-bold text-pink-700">
                        {formatNumber(populationData.demographicBreakdown.populationFemale)}
                      </div>
                      <div className="text-xs text-pink-600">Female</div>
                      <div className="text-xs text-muted-foreground">
                        {populationData.percentageFemale}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vulnerable Populations */}
            {totalVulnerable > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Vulnerable Populations</span>
                    <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                      <TrendingUp className="h-3 w-3" />
                      {formatNumber(totalVulnerable)} total
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={vulnerableChartType === 'bar' ? 'default' : 'outline'}
                      onClick={() => setVulnerableChartType('bar')}
                      className="h-6 px-2 text-xs"
                    >
                      <BarChart3 className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={vulnerableChartType === 'pie' ? 'default' : 'outline'}
                      onClick={() => setVulnerableChartType('pie')}
                      className="h-6 px-2 text-xs"
                    >
                      <PieChart className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={vulnerableChartType === 'tiles' ? 'default' : 'outline'}
                      onClick={() => setVulnerableChartType('tiles')}
                      className="h-6 px-2 text-xs"
                    >
                      <Grid3X3 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Chart Visualization */}
                {vulnerableChartType === 'pie' ? (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center justify-center mb-2">
                      <div className="relative w-32 h-32">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          {(() => {
                            const visibleDemographics = sortedDemographics.filter(demo => demo.value > 0);
                            const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#f97316'];
                            let currentAngle = 0;
                            const vulnerablePercentage = (totalVulnerable / populationData.totalPopulation) * 100;
                            const nonVulnerablePercentage = 100 - vulnerablePercentage;
                            
                            const segments = [];
                            
                            // Add vulnerable populations segments
                            visibleDemographics.forEach((demo, index) => {
                              const angle = (demo.percentage / 100) * 360;
                              const startAngle = currentAngle;
                              const endAngle = currentAngle + angle;
                              currentAngle = endAngle;
                              
                              const x1 = 50 + 35 * Math.cos((startAngle * Math.PI) / 180);
                              const y1 = 50 + 35 * Math.sin((startAngle * Math.PI) / 180);
                              const x2 = 50 + 35 * Math.cos((endAngle * Math.PI) / 180);
                              const y2 = 50 + 35 * Math.sin((endAngle * Math.PI) / 180);
                              
                              const largeArcFlag = angle > 180 ? 1 : 0;
                              
                              const pathData = [
                                `M 50 50`,
                                `L ${x1} ${y1}`,
                                `A 35 35 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                'Z'
                              ].join(' ');
                              
                              segments.push(
                                <path
                                  key={`vulnerable-${index}`}
                                  d={pathData}
                                  fill={colors[index % colors.length]}
                                  stroke="white"
                                  strokeWidth="0.5"
                                />
                              );
                            });
                            
                            // Add non-vulnerable (general) population segment if there's any
                            if (nonVulnerablePercentage > 0) {
                              const angle = (nonVulnerablePercentage / 100) * 360;
                              const startAngle = currentAngle;
                              const endAngle = currentAngle + angle;
                              
                              const x1 = 50 + 35 * Math.cos((startAngle * Math.PI) / 180);
                              const y1 = 50 + 35 * Math.sin((startAngle * Math.PI) / 180);
                              const x2 = 50 + 35 * Math.cos((endAngle * Math.PI) / 180);
                              const y2 = 50 + 35 * Math.sin((endAngle * Math.PI) / 180);
                              
                              const largeArcFlag = angle > 180 ? 1 : 0;
                              
                              const pathData = [
                                `M 50 50`,
                                `L ${x1} ${y1}`,
                                `A 35 35 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                'Z'
                              ].join(' ');
                              
                              segments.push(
                                <path
                                  key="non-vulnerable"
                                  d={pathData}
                                  fill="#e5e7eb"
                                  stroke="white"
                                  strokeWidth="0.5"
                                />
                              );
                            }
                            
                            return segments;
                          })()
                          }
                        </svg>
                      </div>
                    </div>
                    {/* Pie chart legend */}
                    <div className="space-y-1">
                      {sortedDemographics
                        .filter(demo => demo.value > 0)
                        .slice(0, 6)
                        .map((demo, index) => {
                          const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#f97316'];
                          const Icon = demo.icon;
                          return (
                            <div key={index} className="flex items-center gap-2 text-xs">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: colors[index % colors.length] }}
                                aria-hidden="true"
                              />
                              <Icon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground flex-1">{demo.label}</span>
                              <span className="font-medium">{formatNumber(demo.value)}</span>
                              <span className="text-muted-foreground">({demo.percentage}%)</span>
                            </div>
                          );
                        })}
                      {/* Non-vulnerable population legend */}
                      {((populationData.totalPopulation - totalVulnerable) > 0) && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-gray-300" aria-hidden="true" />
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground flex-1">General Population</span>
                          <span className="font-medium">{formatNumber(populationData.totalPopulation - totalVulnerable)}</span>
                          <span className="text-muted-foreground">({calculatePercentage(populationData.totalPopulation - totalVulnerable, populationData.totalPopulation)}%)</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : vulnerableChartType === 'tiles' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {sortedDemographics
                      .filter(demo => demo.value > 0)
                      .slice(0, 6) // Show up to 6 tiles
                      .map((demo, index) => {
                        const Icon = demo.icon;
                        const colors = [
                          'bg-blue-50 border-blue-200 text-blue-700',
                          'bg-orange-50 border-orange-200 text-orange-700',
                          'bg-green-50 border-green-200 text-green-700',
                          'bg-red-50 border-red-200 text-red-700',
                          'bg-purple-50 border-purple-200 text-purple-700',
                          'bg-yellow-50 border-yellow-200 text-yellow-700'
                        ];
                        return (
                          <div key={index} className={cn("text-center p-2 rounded border", colors[index % colors.length])}>
                            <Icon className="h-4 w-4 mx-auto mb-1" />
                            <div className="text-sm font-bold">
                              {formatNumber(demo.value)}
                            </div>
                            <div className="text-xs">{demo.label}</div>
                            <div className="text-xs opacity-75">
                              {demo.percentage}%
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedDemographics
                      .filter(demo => demo.value > 0)
                      .slice(0, 4) // Show top 4 most significant
                      .map((demo, index) => {
                        const Icon = demo.icon;
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <Icon className="h-3 w-3" />
                                <span className="text-muted-foreground">{demo.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatNumber(demo.value)}</span>
                                <span className="text-muted-foreground">{demo.percentage}%</span>
                              </div>
                            </div>
                            <Progress 
                              value={demo.percentage} 
                              className="h-1"
                              // Custom color for each demographic type
                            />
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Assessment Information */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Latest Verified Assessment:</span>
                <span className="font-medium">{formatDate(populationData.latestAssessmentDate)}</span>
              </div>
              <div className="flex items-center gap-2 ml-5 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>Based on {populationData.assessmentCount} verified population assessment{populationData.assessmentCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PopulationImpact;