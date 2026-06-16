'use client';

import { useAuth } from '@/hooks/useAuth';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, FileText } from '@/lib/icons';
import { useEffect, useMemo, useState } from 'react';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';
import { ActionQueue, SignalDetailPanel } from '@/components/dashboards/shared/action-queue'
import { deriveMapPropsFromSignals } from '@/components/dashboards/shared/action-queue/map-utils'
import { useActionSignals } from '@/hooks/useActionSignals'
import type { ActionSignalItem } from '@/types/action-signal'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const ActionQueueMapPanel = dynamic(
  () => import('@/components/dashboards/shared/action-queue/ActionQueueMapPanel').then(m => ({ default: m.ActionQueueMapPanel })),
  { ssr: false }
)

export default function CoordinatorDashboard() {
  const { currentRole, user, token } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<ActionSignalItem | null>(null)
  const [viewSignal, setViewSignal] = useState<ActionSignalItem | null>(null)
  const { data: signalsData, refetch: refetchSignals } = useActionSignals({ unresolvedOnly: true, limit: 100, activeRole: 'COORDINATOR', enabled: !!token })
  const coordinatorSignals: ActionSignalItem[] = signalsData?.signals ?? []
  const mapProps = useMemo(() => deriveMapPropsFromSignals(coordinatorSignals), [coordinatorSignals])

  const assessmentVerificationCount = coordinatorSignals.filter(s => s.signalReason === 'assessment-awaiting-verification').length
  const deliveryVerificationCount = coordinatorSignals.filter(s =>
    s.signalReason === 'delivery-awaiting-verification' || s.signalReason === 'verification-overdue'
  ).length
  const overdueCount = coordinatorSignals.filter(s => s.signalReason === 'verification-overdue').length

  const handleSignalAction = (signal: ActionSignalItem) => {
    const ctx = signal.context || {}
    switch (signal.signalReason) {
      case 'assessment-awaiting-verification': {
        const assessmentId = (ctx as any).assessmentId || signal.id
        router.push(`/coordinator/verification?tab=queue&highlightId=${assessmentId}`)
        break
      }
      case 'delivery-awaiting-verification':
      case 'verification-overdue': {
        const responseId = (ctx as any).responseId || signal.id
        router.push(`/coordinator/verification?tab=responses&highlightId=${responseId}`)
        break
      }
      default:
        router.push(`/coordinator/verification`)
        break
    }
  }

  useEffect(() => {
    setIsClient(true);
  }, []);

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-3xl">Coordinator Dashboard</h1>
            <div className="text-gray-600 mt-2 hidden sm:block">
              Welcome back, {typeof user === 'object' && user ? user.name : 'User'}. Your current role is: <Badge variant="outline">{currentRole}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSignals()}
            >
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        <StatCardGrid columns={4}>
          <StatCard
            label="Assessments to Verify"
            value={assessmentVerificationCount}
            severity="high"
            icon={FileText}
            loading={!signalsData}
          />
          <StatCard
            label="Deliveries to Verify"
            value={deliveryVerificationCount}
            severity="warning"
            icon={AlertTriangle}
            loading={!signalsData}
          />
          <StatCard
            label="All Pending Actions"
            value={signalsData?.unresolvedCount ?? 0}
            severity="info"
            icon={Clock}
            loading={!signalsData}
          />
          <StatCard
            label="Verification Overdue"
            value={overdueCount}
            severity="critical"
            icon={AlertTriangle}
            loading={!signalsData}
          />
        </StatCardGrid>

        <div className="flex flex-col md:flex-row gap-4 h-[500px]">
          <div className="w-full md:w-[55%] lg:w-[45%] shrink-0 border rounded-lg bg-card overflow-hidden">
            <ActionQueue
              role="COORDINATOR"
              onItemSelect={setSelectedSignal}
              onItemAction={handleSignalAction}
              onItemView={setViewSignal}
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

        <SignalDetailPanel signal={viewSignal} onClose={() => setViewSignal(null)} />
      </div>
    </RoleBasedRoute>
  );
}
