'use client';

import { useAuth } from '@/hooks/useAuth';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, RefreshCw } from '@/lib/icons';
import { useVerificationStore } from '@/stores/verification.store';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';
import { ActionQueue } from '@/components/dashboards/shared/action-queue'
import { deriveMapPropsFromSignals } from '@/components/dashboards/shared/action-queue/map-utils'

const ActionQueueMapPanel = dynamic(
  () => import('@/components/dashboards/shared/action-queue/ActionQueueMapPanel').then(m => ({ default: m.ActionQueueMapPanel })),
  { ssr: false }
)
import { useCoordinatorActions } from '@/hooks/useCoordinatorActions'
import type { ActionSignalItem } from '@/types/action-signal'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'


export default function CoordinatorDashboard() {
  const { currentRole, user, token } = useAuth();
  const router = useRouter();
  const { assessmentQueueDepth, deliveryQueueDepth, refreshAll } = useVerificationStore();
  const [isClient, setIsClient] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<ActionSignalItem | null>(null)
  const { data: coordinatorData } = useCoordinatorActions({ enabled: !!token })
  const coordinatorSignals: ActionSignalItem[] = useMemo(() =>
    (coordinatorData?.items ?? []).map(item => ({
      id: item.id,
      userId: '',
      entityId: item.entityId,
      incidentId: null,
      type: item.type,
      signalReason: item.signalReason as any,
      priority: item.priority as any,
      context: item.context as any,
      createdAt: new Date(item.createdAt),
      resolvedAt: null,
      entity: item.entity,
    })),
    [coordinatorData]
  )
  const mapProps = useMemo(() => deriveMapPropsFromSignals(coordinatorSignals), [coordinatorSignals])

  const handleSignalAction = (signal: ActionSignalItem) => {
    const ctx = signal.context || {}
    switch (signal.signalReason) {
      case 'verify-assessment': {
        const assessmentId = (ctx as any).assessmentId || signal.id.replace('verify-assessment-', '')
        router.push(`/coordinator/verification?tab=queue&highlightId=${assessmentId}`)
        break
      }
      case 'verify-response': {
        const responseId = (ctx as any).responseId || signal.id.replace('verify-response-', '')
        router.push(`/coordinator/verification?tab=responses&highlightId=${responseId}`)
        break
      }
      case 'verify-delivery': {
        const responseId = (ctx as any).responseId || signal.id.replace('verify-delivery-', '')
        router.push(`/coordinator/verification?tab=responses&highlightId=${responseId}`)
        break
      }
      case 'need-assessor':
      case 'need-responder':
        router.push(`/coordinator/entities?entityId=${signal.entityId}`)
        break
      default:
        router.push(`/coordinator/verification`)
        break
    }
  }

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
        <ContentSkeleton variant="card" />
      </div>
    );
  }

  return (
    <RoleBasedRoute requiredRole="COORDINATOR">
      <div className="space-y-6">
        {/* Error Display */}
        {dashboardError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">Dashboard Error</h3>
                <div className="mt-2 text-sm text-destructive/80">
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
            <div className="text-gray-600 mt-2">
              Welcome back, {typeof user === 'object' && user ? user.name : 'User'}. Your current role is: <Badge variant="outline">{currentRole}</Badge>
            </div>
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
          </div>
        </div>

        {/* Stats Cards */}
        <StatCardGrid columns={4}>
          <StatCard
            label="Pending Verifications"
            value={dashboardStats?.pendingVerification?.total ?? totalPendingVerifications}
            severity="high"
            icon={Clock}
            loading={statsLoading}
          />
          <StatCard
            label="Pending Deliveries"
            value={safeDeliveryQueueDepth.total}
            severity="warning"
            icon={AlertTriangle}
            loading={statsLoading}
          />
          <StatCard
            label="Verified Today"
            value={dashboardStats?.completedToday?.total ?? 0}
            severity="success"
            icon={CheckCircle}
            loading={statsLoading}
          />
          <StatCard
            label="Overdue"
            value={coordinatorData?.criticalCount ?? 0}
            severity="critical"
            icon={AlertTriangle}
            loading={!coordinatorData}
          />
        </StatCardGrid>

        <div className="flex flex-col md:flex-row gap-4 min-h-[400px]">
          <div className="w-full md:w-[55%] lg:w-[45%] shrink-0 border rounded-lg bg-card">
            <ActionQueue
              role="COORDINATOR"
              onItemSelect={setSelectedSignal}
              onItemAction={handleSignalAction}
              selectedSignalId={selectedSignal?.id}
            />
          </div>
          <div className="hidden md:block md:w-[45%] lg:w-[55%] border rounded-lg bg-card overflow-hidden relative">
            <ActionQueueMapPanel
              activeEntityIds={mapProps.activeEntityIds}
              entityPriorities={mapProps.entityPriorities}
              selectedEntityId={selectedSignal?.entityId}
              onEntitySelect={(entityId) => {
                const s = coordinatorSignals.find(sig => sig.entityId === entityId)
                if (s) setSelectedSignal(s)
              }}
            />
          </div>
        </div>

      </div>
    </RoleBasedRoute>
  );
}