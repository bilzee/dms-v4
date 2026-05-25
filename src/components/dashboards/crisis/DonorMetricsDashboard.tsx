'use client';

import { useState } from 'react';
import { useDonorMetrics, useVerifiedBadgeDisplay, type DonorMetrics } from '@/hooks/useDonorMetrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { VerifiedBadge } from '@/components/dashboards/crisis/VerifiedBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Users, 
  HandHeart, 
  CheckCircle, 
  Star,
  Shield,
  BarChart3,
  RefreshCw,
  Calendar,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';


export function DonorMetricsDashboard() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedDonor, setSelectedDonor] = useState<string | null>(null);

  const { 
    data: donorMetrics, 
    isLoading, 
    error, 
    refetch 
  } = useDonorMetrics({ dateRange });

  const handleRefresh = () => {
    refetch();
  };

  const filteredDonors = selectedDonor 
    ? donorMetrics?.donors.filter(d => d.donorId === selectedDonor) || []
    : donorMetrics?.donors || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Donor Metrics</h1>
          <p className="text-muted-foreground">
            Comprehensive donor performance and response verification metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <Tabs value={dateRange} onValueChange={(value) => setDateRange(value as '7d' | '30d' | '90d')}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Failed to load donor metrics
              </h3>
              <p className="text-red-700">{error?.message || 'Unknown error'}</p>
              <Button onClick={handleRefresh} variant="outline" className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Statistics */}
      {donorMetrics && (
        <StatCardGrid columns={4}>
          <StatCard
            label="Total Donors"
            value={donorMetrics.overall.totalDonors}
            icon={Users}
            severity="info"
            loading={isLoading}
          />
          
          <StatCard
            label="Total Commitments"
            value={donorMetrics.overall.totalCommitments}
            icon={HandHeart}
            severity="success"
            loading={isLoading}
          />
          
          <StatCard
            label="Verified Responses"
            value={donorMetrics.overall.totalVerifiedResponses}
            icon={CheckCircle}
            severity="success"
            loading={isLoading}
          />
          
          <StatCard
            label="Average Verification Rate"
            value={`${(donorMetrics.overall.averageVerificationRate * 100).toFixed(1)}%`}
            icon={TrendingUp}
            severity="info"
            loading={isLoading}
          />
        </StatCardGrid>
      )}

      {/* Main Content: Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Top Performing Donors */}
        <div className="lg:col-span-1">
          {donorMetrics?.overall.topPerformers && donorMetrics.overall.topPerformers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Top Performing Donors
                </CardTitle>
                <CardDescription>
                  Click on a donor to view their detailed metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {donorMetrics.overall.topPerformers.map((donor, index) => (
                    <button
                      key={donor.donorName}
                      onClick={() => {
                        // Find the actual donor by name since topPerformers only has donorName
                        const actualDonor = donorMetrics?.donors.find(d => d.donorName === donor.donorName);
                        const donorId = actualDonor?.donorId;
                        setSelectedDonor(
                          selectedDonor === donorId ? null : donorId || null
                        );
                      }}
                      className={cn(
                        "w-full text-left p-3 border rounded-lg transition-all duration-200",
                        (() => {
                          const actualDonor = donorMetrics?.donors.find(d => d.donorName === donor.donorName);
                          const donorId = actualDonor?.donorId;
                          return selectedDonor === donorId
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-sm";
                        })()
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 flex items-center justify-center min-w-8 min-h-8 w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{donor.donorName}</p>
                            <p className="text-sm text-muted-foreground">
                              {donor.verifiedActivities} / {donor.totalActivities} activities
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            {donor.successRate.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            performance score
                          </div>
                          <div className="text-xs text-gray-400">
                            Rate: {(donor.responseVerificationRate * 100).toFixed(1)}% + {donor.totalCommitments} commits
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel: Donor Details */}
        <div className="lg:col-span-2">
          {selectedDonor ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Donor Performance Details
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of the selected donor&apos;s metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="p-4 border rounded-lg">
                    <ContentSkeleton variant="card" />
                  </div>
                ) : (
                  <div>
                    {filteredDonors.map((donor) => (
                      <DonorRow key={donor.donorId} donor={donor} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Select a Donor</h3>
                  <p>Click on a donor from the left panel to view their detailed performance metrics</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Donor Row Component
interface DonorRowProps {
  donor: DonorMetrics;
}

function DonorRow({ donor }: DonorRowProps) {
  const verifiedDisplay = useVerifiedBadgeDisplay(donor.donorId);
  
  return (
    <div className="p-4 border rounded-lg space-y-4">
      {/* Donor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-semibold text-lg">{donor.donorName}</h3>
            <p className="text-sm text-muted-foreground">{donor.donorEmail}</p>
            <p className="text-xs text-gray-500">
              Donor since {new Date(donor.donorSince).toLocaleDateString()}
            </p>
          </div>
          
          {verifiedDisplay.showVerifiedBadge && (
            <VerifiedBadge
              isVerified={verifiedDisplay.showVerifiedBadge}
              verificationMethod={verifiedDisplay.verificationMethod || 'manual'}
              size="sm"
              metrics={{
                totalVerified: verifiedDisplay.totalVerified,
                totalActivities: verifiedDisplay.totalActivities,
                verificationRate: verifiedDisplay.verificationRate,
                responseVerified: donor.metrics.responses.verified,
                commitmentFulfilled: donor.metrics.commitments.fulfilled
              }}
              showTooltip
            />
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Commitment Metrics */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <HandHeart className="h-4 w-4" />
            Commitments
          </h4>
          
          <div className="space-y-2">
            <MetricRow
              label="Total"
              value={donor.metrics.commitments.total}
              color="text-blue-600"
            />
            <MetricRow
              label="Available"
              value={donor.metrics.commitments.available}
              color="text-green-600"
            />
            <MetricRow
              label="Fulfilled"
              value={donor.metrics.commitments.fulfilled}
              color="text-purple-600"
            />
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Fulfillment Rate</span>
                <span className="font-medium">
                  {(donor.metrics.commitments.fulfillmentRate * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={donor.metrics.commitments.fulfillmentRate * 100} 
                className="h-2"
              />
            </div>
          </div>
        </div>

        {/* Response Verification Metrics */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Response Verification
          </h4>
          
          <div className="space-y-2">
            <MetricRow
              label="Total"
              value={donor.metrics.responses.total}
              color="text-blue-600"
            />
            <MetricRow
              label="Verified"
              value={donor.metrics.responses.verified}
              color="text-green-600"
            />
            <MetricRow
              label="Auto-Verified"
              value={donor.metrics.responses.autoVerified}
              color="text-blue-500"
            />
            <MetricRow
              label="Pending"
              value={donor.metrics.responses.pending}
              color="text-orange-600"
            />
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Verification Rate</span>
                <span className="font-medium">
                  {(donor.metrics.responses.verificationRate * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={donor.metrics.responses.verificationRate * 100} 
                className="h-2"
              />
            </div>
          </div>
        </div>

        {/* Overall Performance */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overall Performance
          </h4>
          
          <div className="space-y-2">
            <MetricRow
              label="Total Activities"
              value={donor.metrics.combined.totalActivities}
              color="text-blue-600"
            />
            <MetricRow
              label="Verified Activities"
              value={donor.metrics.combined.verifiedActivities}
              color="text-green-600"
            />
            
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Overall Success Rate</span>
                <span className="font-bold text-lg">
                  {(donor.metrics.combined.overallSuccessRate * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={donor.metrics.combined.overallSuccessRate * 100} 
                className="h-2 mt-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function MetricRow({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: string; 
}) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={cn("text-sm font-medium", color)}>{value}</span>
    </div>
  );
}