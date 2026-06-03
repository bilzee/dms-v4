'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

// New error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader'
import { EmptyState } from '@/components/shared/EmptyState'

// Icons
import { Plus, Edit, Package, CheckCircle, User, Shield, RefreshCw, AlertTriangle, FileText, Truck, Clock } from '@/lib/icons'

// Forms and components
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { useAuth } from '@/hooks/useAuth'
import { ResponsePlanningForm } from '@/components/forms/response'
import { ResponsePlanningDashboard } from '@/components/response/ResponsePlanningDashboard'
import { ActionQueue, SignalDetailPanel } from '@/components/dashboards/shared/action-queue'
import { deriveMapPropsFromSignals } from '@/components/dashboards/shared/action-queue/map-utils'
import { StatCard } from '@/components/shared/StatCard'

const ActionQueueMapPanel = dynamic(
  () => import('@/components/dashboards/shared/action-queue/ActionQueueMapPanel').then(m => ({ default: m.ActionQueueMapPanel })),
  { ssr: false }
)
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { useActionSignals } from '@/hooks/useActionSignals'
import type { ActionSignalItem } from '@/types/action-signal'

// Hooks and utilities
import { apiGet, extractArray } from '@/lib/api'

function ResponderDashboardContent() {
  const { user, token, currentRole, switchRole } = useAuth()
  const router = useRouter()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingResponse, setEditingResponse] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [selectedSignal, setSelectedSignal] = useState<ActionSignalItem | null>(null)
  const [viewSignal, setViewSignal] = useState<ActionSignalItem | null>(null)
  const { data: signalsData } = useActionSignals({ unresolvedOnly: true, limit: 100, activeRole: 'RESPONDER' })
  const mapProps = useMemo(() => deriveMapPropsFromSignals(signalsData?.signals ?? []), [signalsData?.signals])

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (currentRole !== 'RESPONDER') {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
        <p>Session role mismatch. Expected RESPONDER, got {currentRole}.</p>
        <Button onClick={() => switchRole('RESPONDER')} className="mt-4">
          Switch to Responder Role
        </Button>
      </div>
    )
  }

  // Get assigned planned responses for this responder
  const getPlannedResponses = async () => {
    if (!user) throw new Error('User not authenticated')
    
    const result = await apiGet('/api/v1/responses/planned/assigned?page=1&limit=50')
    if (result.error) {
      throw new Error(result.error)
    }
    const responses = extractArray(result.data)
    return {
      responses,
      total: (result as any)?.meta?.total || responses.length
    }
  }

  // Get editing response data
  const getEditingResponse = async () => {
    if (!editingResponse) return null
    
    const result = await apiGet(`/api/v1/responses/${editingResponse}`)
    
    if (!result.success) {
      const errMsg = result.error || 'Failed to fetch response'
      if (errMsg.includes('401')) {
        throw new Error('Authentication failed - please log in again')
      } else if (errMsg.includes('403')) {
        throw new Error('You do not have permission to access this response')
      } else if (errMsg.includes('404')) {
        throw new Error('Response not found')
      } else {
        throw new Error(errMsg)
      }
    }
    
    return result.data
  }

  const handleCreateResponse = () => {
    setShowCreateForm(true)
  }

  const handleEditResponse = (responseId: string) => {
    setEditingResponse(responseId)
  }

  const handleBackToList = () => {
    setShowCreateForm(false)
    setEditingResponse(null)
  }

  const handleSignalAction = (signal: ActionSignalItem) => {
    const params = new URLSearchParams({ entityId: signal.entityId })
    if (signal.incidentId) params.set('incidentId', signal.incidentId)
    if (signal.context?.assessmentId) params.set('assessmentId', signal.context.assessmentId)
    if (signal.context?.commitmentId) params.set('commitmentId', signal.context.commitmentId)
    if (signal.context?.responseType) params.set('type', signal.context.responseType)
    switch (signal.signalReason) {
      case 'awaiting-plan':
      case 'awaiting-plan-for-commitment':
        router.push(`/responder/planning/new?${params.toString()}`)
        break
      case 'awaiting-delivery':
        if (signal.context?.responseId) {
          router.push(`/responder/responses/${signal.context.responseId}/deliver`)
        }
        break
      default:
        break
    }
  }

  // Show create/edit form
  if (showCreateForm || editingResponse) {
    return (
      <SafeDataLoader
        queryFn={getEditingResponse}
        enabled={!!editingResponse && !!user && isClient}
        fallbackData={null}
        loadingMessage="Loading response plan..."
        errorTitle="Failed to load response plan"
      >
        {(editingResponseData, isLoading, error, retry) => {
          if (isLoading) {
            return (
              <Card>
                <CardHeader>
                  <CardTitle>Loading Response Plan...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </CardContent>
              </Card>
            )
          }

          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleBackToList}
                  className="flex items-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  Back to Response Plans
                </Button>
                <Badge variant="outline">
                  {showCreateForm ? 'NEW RESPONSE PLAN' : 'EDITING RESPONSE PLAN'}
                </Badge>
              </div>
              
              <ResponsePlanningForm
                mode={editingResponse ? 'edit' : 'create'}
                initialData={editingResponse ? {
                  id: editingResponse,
                  assessmentId: editingResponseData?.assessmentId || '',
                  entityId: editingResponseData?.entityId || '',
                  type: editingResponseData?.type || 'HEALTH',
                  priority: editingResponseData?.priority || 'MEDIUM',
                  description: editingResponseData?.description || '',
                  assessment: editingResponseData?.assessment,
                  items: editingResponseData?.items?.map((item: any) => ({
                    ...item,
                    // Remove category from display since it's auto-assigned
                    name: item.name,
                    unit: item.unit,
                    quantity: item.quantity,
                    notes: item.notes
                  })) || [{ name: '', unit: '', quantity: 1 }]
                } : undefined}
                onCancel={handleBackToList}
                onSuccess={handleBackToList}
              />
            </div>
          )
        }}
      </SafeDataLoader>
    )
  }

  // Show response plans dashboard
  return (
    <SafeDataLoader
      queryFn={getPlannedResponses}
      enabled={!!user && isClient}
      fallbackData={{ responses: [], total: 0 }}
      loadingMessage="Loading response plans..."
      errorTitle="Failed to load response plans"
    >
      {(data, isLoading, error, retry) => {
        const responses = data?.responses || []
        const total = data?.total || 0

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  RESPONDER DASHBOARD
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              
              <Button
                variant="default"
                size="lg"
                onClick={() => router.push('/responder/responses')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 shadow-lg"
              >
                <CheckCircle className="h-5 w-5" />
                View Response Deliveries
              </Button>
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
                label="Awaiting Delivery"
                value={signalsData?.signals?.filter(s => s.signalReason === 'awaiting-delivery').length ?? 0}
                severity="warning"
                icon={Truck}
                loading={!signalsData}
              />
              <StatCard
                label="Partially Covered"
                value={signalsData?.signals?.filter(s => s.signalReason === 'partially-covered').length ?? 0}
                severity="success"
                icon={CheckCircle}
                loading={!signalsData}
              />
              <StatCard
                label="Active Plans"
                value={responses.length}
                severity="info"
                icon={Clock}
              />
            </StatCardGrid>

            <div className="flex flex-col md:flex-row gap-4 h-[500px]">
              <div className="w-full md:w-[55%] lg:w-[45%] shrink-0 border rounded-lg bg-card overflow-hidden">
                <ActionQueue
                  role="RESPONDER"
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
        )
      }}
    </SafeDataLoader>
  )
}

export default function ResponderDashboard() {
  const { availableRoles } = useAuth()

  // Custom error message for multi-role users who haven't selected RESPONDER role
  const RoleAccessError = () => {
    const hasResponderRole = availableRoles.includes('RESPONDER');
    
    if (!hasResponderRole) {
      return (
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  You do not have permission to access this page. Responder role is required for response planning.
                </AlertDescription>
              </Alert>
              <div className="text-center text-muted-foreground">
                This page is only available to users with the Responder role for planning and managing response operations.
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <User className="h-4 w-4" />
              You need to select the <strong>Responder</strong> role to access this page.
            </AlertDescription>
          </Alert>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Role Selection Required
              </h3>
              <p className="text-blue-700 mb-4">
                You have the Responder role assigned, but you need to actively select it to access response planning features.
              </p>
              <p className="text-sm text-blue-600 mb-6">
                Switch to the Responder role using the role selector in the top-right corner of the page.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Refresh Page After Selecting Role
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <RoleBasedRoute 
      requiredRole="RESPONDER" 
      fallbackPath="/dashboard"
      errorComponent={<RoleAccessError />}
    >
      <ResponderDashboardContent />
    </RoleBasedRoute>
  )
}