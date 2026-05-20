'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

// New error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader'
import { EmptyState } from '@/components/shared/EmptyState'

// Icons
import { Plus, Edit, Package, CheckCircle, User, Shield, RefreshCw, AlertTriangle } from 'lucide-react'

// Forms and components
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { useAuth } from '@/hooks/useAuth'
import { ResponsePlanningForm } from '@/components/forms/response'
import { ResponsePlanningDashboard } from '@/components/response/ResponsePlanningDashboard'

// Hooks and utilities
import { useAuthStore } from '@/stores/auth.store'
import { apiGet, extractArray } from '@/lib/api'

function ResponderDashboardContent() {
  const { user, token } = useAuthStore()
  const router = useRouter()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingResponse, setEditingResponse] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

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
            
            <ResponsePlanningDashboard
              onCreateResponse={handleCreateResponse}
              onEditResponse={handleEditResponse}
            />
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