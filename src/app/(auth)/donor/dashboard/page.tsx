'use client'

import { useAuth } from '@/hooks/useAuth'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, User } from '@/lib/icons'
import { ActionQueue, SignalDetailPanel } from '@/components/dashboards/shared/action-queue'
import { deriveMapPropsFromSignals } from '@/components/dashboards/shared/action-queue/map-utils'

const ActionQueueMapPanel = dynamic(
  () => import('@/components/dashboards/shared/action-queue/ActionQueueMapPanel').then(m => ({ default: m.ActionQueueMapPanel })),
  { ssr: false }
)
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { useActionSignals } from '@/hooks/useActionSignals'
import type { ActionSignalItem } from '@/types/action-signal'
import { DollarSign, Package, CheckCircle, Clock } from '@/lib/icons'
import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { CommitmentDashboard } from '@/components/donor/CommitmentDashboard'

export default function DonorDashboardPage() {
  const { currentRole, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedSignal, setSelectedSignal] = useState<ActionSignalItem | null>(null)
  const [viewSignal, setViewSignal] = useState<ActionSignalItem | null>(null)
  const { data: signalsData } = useActionSignals({ unresolvedOnly: true, limit: 100, activeRole: 'DONOR' })
  const mapProps = useMemo(() => deriveMapPropsFromSignals(signalsData?.signals ?? []), [signalsData?.signals])

  const showCommitmentForm = !!(searchParams.get('tab') === 'commitments' || searchParams.get('action') === 'new-commitment' || searchParams.get('entityId') || searchParams.get('responseId'))
  const preSelectedEntityId = searchParams.get('entityId') || undefined
  const preSelectedIncidentId = searchParams.get('incidentId') || undefined
  const preSelectedResponseId = searchParams.get('responseId') || undefined

  const { data: donorProfile } = useQuery({
    queryKey: ['donor-profile'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/donors/profile')
      if (!result.success) return null
      return result.data?.donor || null
    },
    enabled: !!user,
  })

  const { data: commitmentsData } = useQuery({
    queryKey: ['donor-my-commitments'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/donors/profile')
      if (!result.success) return { active: 0, partial: 0, fulfilledToday: 0 }
      const commitments: any[] = (result.data as any)?.commitments ?? []
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return {
        active: commitments.filter((c: any) => c.status === 'PLANNED' || c.status === 'PARTIAL').length,
        partial: commitments.filter((c: any) => c.status === 'PARTIAL').length,
        fulfilledToday: commitments.filter((c: any) => c.status === 'COMPLETE' && new Date(c.updatedAt) >= todayStart).length,
      }
    },
    enabled: !!user,
    staleTime: 30000,
  })

  const handleSignalAction = (signal: ActionSignalItem) => {
    const params = new URLSearchParams({
      tab: 'commitments',
      entityId: signal.entityId,
      incidentId: signal.incidentId || '',
    })
    if (signal.context?.responseId) {
      params.set('responseId', signal.context.responseId)
    }
    router.push(`/donor/dashboard?${params.toString()}`)
  }

  const handleCommitmentSuccess = () => {
    router.push('/donor/dashboard')
  }

  if (showCommitmentForm && donorProfile) {
    return (
      <RoleBasedRoute requiredRole="DONOR">
        <div className="py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => router.push('/donor/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <CommitmentDashboard
            donorId={donorProfile.id}
            preSelectedEntityId={preSelectedEntityId}
            preSelectedIncidentId={preSelectedIncidentId}
            preSelectedResponseId={preSelectedResponseId}
          />
        </div>
      </RoleBasedRoute>
    )
  }

  return (
    <RoleBasedRoute requiredRole="DONOR">
      <div className="py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
              <div className="text-gray-600 mt-2">
                Welcome back, {user?.name}. Your current role is: <Badge variant="outline">{currentRole}</Badge>
              </div>
            </div>
            <Link href="/donor/profile">
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                My Profile
              </Button>
            </Link>
          </div>
        </div>

        <StatCardGrid columns={4}>
          <StatCard
            label="Pending Actions"
            value={signalsData?.unresolvedCount ?? 0}
            severity="high"
            icon={DollarSign}
            loading={!signalsData}
          />
          <StatCard
            label="My Active Commitments"
            value={commitmentsData?.active ?? 0}
            severity="info"
            icon={Package}
            loading={!commitmentsData}
          />
          <StatCard
            label="Partially Fulfilled"
            value={signalsData?.signals?.filter(s => s.signalReason === 'partially-fulfilled').length ?? 0}
            severity="warning"
            icon={Clock}
            loading={!signalsData}
          />
          <StatCard
            label="Fulfilled Today"
            value={commitmentsData?.fulfilledToday ?? 0}
            severity="success"
            icon={CheckCircle}
            loading={!commitmentsData}
          />
        </StatCardGrid>

        <div className="flex flex-col md:flex-row gap-4 h-[500px]">
          <div className="w-full md:w-[55%] lg:w-[45%] shrink-0 border rounded-lg bg-card overflow-hidden">
            <ActionQueue
              role="DONOR"
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
                const s = signalsData?.signals?.find(sig => sig.entityId === entityId)
                if (s) setSelectedSignal(s)
              }}
            />
          </div>
        </div>

        <SignalDetailPanel signal={viewSignal} onClose={() => setViewSignal(null)} />
      </div>
    </RoleBasedRoute>
  )
}