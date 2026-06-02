'use client'

import { useState, useEffect, useMemo } from 'react'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button'
import { PlusCircle, Activity, FileText, Clock, CheckCircle } from '@/lib/icons'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import { apiGet, extractArray } from '@/lib/api'
import { ActionQueue } from '@/components/dashboards/shared/action-queue'
import { deriveMapPropsFromSignals } from '@/components/dashboards/shared/action-queue/map-utils'

const ActionQueueMapPanel = dynamic(
  () => import('@/components/dashboards/shared/action-queue/ActionQueueMapPanel').then(m => ({ default: m.ActionQueueMapPanel })),
  { ssr: false }
)
import { useActionSignals } from '@/hooks/useActionSignals'
import type { ActionSignalItem } from '@/types/action-signal'

const assessmentTypes = [
  { value: 'HEALTH', label: 'Health Assessment' },
  { value: 'POPULATION', label: 'Population Assessment' },
  { value: 'FOOD', label: 'Food Security Assessment' },
  { value: 'WASH', label: 'WASH Assessment' },
  { value: 'SHELTER', label: 'Shelter Assessment' },
  { value: 'SECURITY', label: 'Security Assessment' }
]

export default function AssessorDashboard() {
  const [selectedType, setSelectedType] = useState<string>('')
  const [assessments, setAssessments] = useState<any[]>([])
  const [selectedSignal, setSelectedSignal] = useState<ActionSignalItem | null>(null)
  const router = useRouter()
  const { token } = useAuth()
  const { data: signalsData } = useActionSignals({ unresolvedOnly: true, limit: 100, activeRole: 'ASSESSOR' })
  const mapProps = useMemo(() => deriveMapPropsFromSignals(signalsData?.signals ?? []), [signalsData?.signals])

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        if (token) {
          const result = await apiGet('/api/v1/rapid-assessments?userId=me')
          if (result.success) {
            setAssessments(extractArray(result.data))
          }
        }
      } catch (error) {
        console.error('Error fetching assessments:', error)
      }
    }
    fetchAssessments()
  }, [token])

  const handleSignalAction = (signal: ActionSignalItem) => {
    const params = new URLSearchParams({ entityId: signal.entityId, type: signal.type })
    if (signal.incidentId) params.set('incidentId', signal.incidentId)
    if (signal.signalReason) params.set('signalReason', signal.signalReason)
    router.push(`/assessor/rapid-assessments/new?${params.toString()}`)
  }

  const handleNewAssessment = () => {
    if (selectedType) {
      router.push(`/assessor/rapid-assessments/new?type=${selectedType}`)
    }
  }

  return (
    <RoleBasedRoute requiredRole="ASSESSOR">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assessor Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage and create rapid assessments for affected communities
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-64 h-10 px-3 py-2 border rounded-md"
              data-testid="assessment-type-select"
            >
              <option value="">Select assessment type</option>
              {assessmentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <Button 
              onClick={handleNewAssessment}
              disabled={!selectedType}
              data-testid="new-assessment-button"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
          </div>
        </div>

        <StatCardGrid columns={4}>
          <StatCard
            label="Pending Actions"
            value={signalsData?.unresolvedCount ?? 0}
            severity="high"
            icon={FileText}
            loading={!signalsData}
          />
          <StatCard
            label="Overdue"
            value={signalsData?.signals?.filter(s => s.signalReason === 'overdue').length ?? 0}
            severity="critical"
            icon={Clock}
            loading={!signalsData}
          />
          <StatCard
            label="Completed Today"
            value={assessments.filter(a => a.verificationStatus === 'VERIFIED' || a.verificationStatus === 'AUTO_VERIFIED').length}
            severity="success"
            icon={CheckCircle}
          />
          <StatCard
            label="Total Assessments"
            value={assessments.length}
            severity="info"
            icon={Activity}
          />
        </StatCardGrid>

        <div className="flex flex-col md:flex-row gap-4 h-[500px]">
          <div className="w-full md:w-[55%] lg:w-[45%] shrink-0 border rounded-lg bg-card overflow-hidden">
            <ActionQueue
              role="ASSESSOR"
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
                const s = signalsData?.signals?.find(sig => sig.entityId === entityId)
                if (s) setSelectedSignal(s)
              }}
            />
          </div>
        </div>
      </div>
    </RoleBasedRoute>
  )
}
