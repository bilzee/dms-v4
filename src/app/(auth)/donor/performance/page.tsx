'use client';

import React, { Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DonorPerformanceDashboard } from '@/components/donor/DonorPerformanceDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, AlertCircle } from '@/lib/icons';

// New error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader';
import { EmptyState } from '@/components/shared/EmptyState';

// API utilities
import { apiGet } from '@/lib/api';
import { ExportButton } from '@/components/dashboards/shared/exports/ExportButton';

// Component to fetch and display performance data
function PerformanceDashboardContent() {
  const { user, isAuthenticated } = useAuth();
  
  // Fetch donor ID for the current user
  const fetchDonorData = async () => {
    if (!user) throw new Error('User not authenticated')
    
    const result = await apiGet('/api/v1/users/me/donor');
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch donor information');
    }
    
    return result;
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view your performance dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <SafeDataLoader
      queryFn={fetchDonorData}
      enabled={!!user && isAuthenticated}
      fallbackData={null}
      loadingMessage="Loading donor information..."
      errorTitle="Failed to load donor information"
    >
      {(donorData, isLoading, error, retry) => {
        if (!donorData?.success) {
          return (
            <EmptyState
              type="error"
              title="Donor role required"
              description="Please ensure you have a donor role assigned to view the performance dashboard."
              action={{
                label: "Retry",
                onClick: retry,
                variant: "outline"
              }}
              icon={AlertCircle}
            />
          )
        }

        return (
          <DonorPerformanceDashboard
            donorId={donorData.data.donorId}
            donorName={donorData.data.donor.name || donorData.data.donor.organization || 'Your Organization'}
            showRanking={true}
            showBadges={true}
            showTrends={true}
            compact={false}
          />
        );
      }}
    </SafeDataLoader>
  );
}

export default function PerformancePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <User className="w-8 h-8 text-blue-500" />
                Performance Dashboard
              </h1>
              <p className="text-muted-foreground mt-2 hidden sm:block">
                Track your donation performance, achievements, and ranking over time.
              </p>
            </div>
            <ExportButton dataType="commitments" size="sm" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={
          <div className="space-y-6">
            <Skeleton className="h-96 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        }>
          <PerformanceDashboardContent />
        </Suspense>
      </div>

      {/* Quick Links Section */}
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a 
                href="/donor/leaderboard" 
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-semibold text-blue-600">View Leaderboard</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  See how you rank among other donors
                </p>
              </a>
              
              <a
                href="/donor/dashboard?tab=commitments"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-semibold text-green-600">Manage Commitments</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Update and track your current commitments
                </p>
              </a>
              
              <a 
                href="/donor/profile" 
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-semibold text-purple-600">Update Profile</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your organization details
                </p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}