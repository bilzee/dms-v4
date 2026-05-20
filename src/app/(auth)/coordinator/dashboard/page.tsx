'use client';

import { useAuth } from '@/hooks/useAuth';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, AlertTriangle, CheckCircle, Clock, FileText, Activity, PlusCircle, TrendingUp, Shield, BarChart3, Shield as ReportIcon, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { VerificationQueueManagement } from '@/components/dashboards/crisis/VerificationQueueManagement';
import { useVerificationStore } from '@/stores/verification.store';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

export default function CoordinatorDashboard() {
  const { currentRole, user, token } = useAuth();
  const { assessmentQueueDepth, deliveryQueueDepth, refreshAll } = useVerificationStore();
  const [isClient, setIsClient] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Fetch coordinator dashboard stats from backend
  const { 
    data: dashboardStats, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['coordinator-dashboard-stats'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/coordinator/dashboard/stats');
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard statistics');
      }
      
      return result.data ?? null;
    },
    enabled: !!token && isClient,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000 // Auto-refresh every minute
  });

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load verification queue data on mount (with protection)
  useEffect(() => {
    if (!isClient || !token) return; // Only load when client is ready and authenticated
    
    const loadData = async () => {
      try {
        setDashboardError(null);
        await refreshAll();
      } catch (error) {
        console.error('Failed to load initial dashboard data:', error);
        setDashboardError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      }
    };
    
    // Add small delay to prevent immediate API calls on mount
    const timeoutId = setTimeout(loadData, 100);
    
    return () => clearTimeout(timeoutId);
  }, [refreshAll, isClient, token]);

  // Safely extract queue depth data with fallbacks
  const safeAssessmentQueueDepth = assessmentQueueDepth && typeof assessmentQueueDepth === 'object' && !Array.isArray(assessmentQueueDepth) 
    ? assessmentQueueDepth 
    : { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
  
  const safeDeliveryQueueDepth = deliveryQueueDepth && typeof deliveryQueueDepth === 'object' && !Array.isArray(deliveryQueueDepth) 
    ? deliveryQueueDepth 
    : { total: 0, critical: 0, high: 0, medium: 0, low: 0 };

  const totalPendingVerifications = safeAssessmentQueueDepth.total + safeDeliveryQueueDepth.total;

  // Prevent hydration mismatch by showing loading state on server
  if (!isClient) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <RoleBasedRoute requiredRole="COORDINATOR">
      <div className="space-y-6">
        {/* Error Display */}
        {dashboardError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Dashboard Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {dashboardError}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Coordinator Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {typeof user === 'object' && user ? user.name : 'User'}. Your current role is: <Badge variant="outline">{currentRole}</Badge>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStats()}
              disabled={statsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <AlertTriangle className="h-4 w-4 mr-2" />
              New Response
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Responses</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardStats?.activeResponses?.total ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardStats?.activeResponses?.description ?? "Loading..."}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Responders Deployed</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardStats?.responders?.total ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardStats?.responders?.description ?? "Loading..."}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardStats?.pendingVerification?.total ?? totalPendingVerifications}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardStats?.pendingVerification?.description ?? 
                     `${safeAssessmentQueueDepth.critical + safeDeliveryQueueDepth.critical} critical priority`}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardStats?.completedToday?.total ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardStats?.completedToday?.description ?? "Loading..."}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

  
        {/* Verification Queue Management - Story 6.1 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
              Story 6.1
            </Badge>
            <span className="text-sm text-gray-600">Verification Queue Management</span>
          </div>
          <VerificationQueueManagement />
        </div>



        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common coordinator tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/coordinator/situation-dashboard?export=true">
                <Button variant="secondary" size="sm" className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Export Dashboard Data
                </Button>
              </Link>
              <Link href="/coordinator/situation-dashboard?reports=true">
                <Button variant="secondary" size="sm" className="w-full">
                  <Activity className="mr-2 h-4 w-4" />
                  View Export Reports
                </Button>
              </Link>
              <Link href="/coordinator/reports">
                <Button variant="outline" className="w-full justify-start">
                  <ReportIcon className="mr-2 h-4 w-4" />
                  Report Builder ({totalPendingVerifications})
                </Button>
              </Link>
              <Link href="/coordinator/verification">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="mr-2 h-4 w-4" />
                  Verification Queue
                </Button>
              </Link>
              <Link href="/assessor/rapid-assessments">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Assessments
                </Button>
              </Link>
              <Link href="/coordinator/auto-approval">
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Enhanced Auto-Approval Management
                </Button>
              </Link>
              <Link href="/coordinator/resource-management">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  Resource & Donation Management
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Response
              </Button>
            </div>
          </CardContent>
        </Card>


      </div>
    </RoleBasedRoute>
  );
}