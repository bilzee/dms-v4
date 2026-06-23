'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// UI components
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { ResponseOfflineGuard } from '@/components/offline/OfflineGuard'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Icons
import { ArrowLeft, Package, AlertTriangle, Shield, User } from '@/lib/icons'

// Forms and components
import { ResponsePlanningForm } from '@/components/forms/response'

function NewResponsePlanningPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedEntityId = searchParams.get('entityId') || undefined
  const preselectedAssessmentId = searchParams.get('assessmentId') || undefined
  const preselectedIncidentId = searchParams.get('incidentId') || undefined
  const preselectedCommitmentId = searchParams.get('commitmentId') || undefined
  const preselectedType = searchParams.get('type') as any || undefined

  const handleCancel = () => {
    router.push('/responder/planning')
  }

  const handleSuccess = () => {
    router.push('/responder/planning')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Back to Response Plans</span>
        </Button>
      </div>
      
      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <ResponsePlanningForm
            mode="create"
            onCancel={handleCancel}
            onSuccess={handleSuccess}
            entityId={preselectedEntityId}
            assessmentId={preselectedAssessmentId}
            incidentId={preselectedIncidentId}
            commitmentId={preselectedCommitmentId}
            responseType={preselectedType}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewResponsePlanningPage() {
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
                  You do not have permission to access this page. Responder role is required to create response plans.
                </AlertDescription>
              </Alert>
              <div className="text-center text-muted-foreground">
                This page is only available to users with the Responder role for creating and planning response operations.
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
                You have the Responder role assigned, but you need to actively select it to create new response plans.
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
      <ResponseOfflineGuard>
        <NewResponsePlanningPageContent />
      </ResponseOfflineGuard>
    </RoleBasedRoute>
  )
}