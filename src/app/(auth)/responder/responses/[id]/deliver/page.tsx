'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Package, CheckCircle, AlertTriangle, Shield, User } from '@/lib/icons'

import { DeliveryConfirmationForm } from '@/components/forms/delivery'
import { RapidResponse } from '@/types/response'

function DeliveryConfirmationPageContent() {
  const router = useRouter()
  const params = useParams()
  const responseId = params.id as string

  const [deliveryComplete, setDeliveryComplete] = useState(false)
  const [confirmedDelivery, setConfirmedDelivery] = useState<RapidResponse | null>(null)

  const handleSuccess = (deliveryData: RapidResponse) => {
    setConfirmedDelivery(deliveryData)
    setDeliveryComplete(true)
  }

  const handleCancel = () => {
    router.back()
  }

  const handleViewResponses = () => {
    router.push('/responder/responses')
  }

  if (deliveryComplete && confirmedDelivery) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">
              Delivery Confirmed!
            </CardTitle>
            <CardDescription>
              Your delivery has been successfully documented and submitted for verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-4">Delivery Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Entity</label>
                  <p className="font-medium">{confirmedDelivery.entity?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Response Type</label>
                  <p className="font-medium">{confirmedDelivery.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <Badge variant="default" className="bg-green-600">
                    DELIVERED
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Verification</label>
                  <Badge variant="secondary">
                    SUBMITTED
                  </Badge>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-600">Delivery Date</label>
                <p className="font-medium">
                  {confirmedDelivery.responseDate 
                    ? new Date(confirmedDelivery.responseDate).toLocaleString()
                    : new Date().toLocaleString()
                  }
                </p>
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your delivery has been automatically submitted to the coordinator verification queue. 
                You will receive updates once the delivery has been reviewed and verified.
              </AlertDescription>
            </Alert>

            <div className="flex justify-center gap-4">
              <Button onClick={() => router.back()}>
                Confirm Another Delivery
              </Button>
              <Button variant="outline" onClick={handleViewResponses}>
                View All Responses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Responses
        </Button>
        
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-3xl font-bold">Confirm Delivery</h1>
          <Badge variant="outline">Responder</Badge>
        </div>
        
        <p className="text-gray-600 mt-2">
          Document the actual delivery of planned aid items with location verification and photos.
        </p>
      </div>

      <DeliveryConfirmationForm
        responseId={responseId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}

export default function DeliveryConfirmationPage() {
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
                  You do not have permission to access this page. Responder role is required to confirm deliveries.
                </AlertDescription>
              </Alert>
              <div className="text-center text-muted-foreground">
                This page is only available to users with the Responder role for confirming and documenting aid deliveries.
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
                You have the Responder role assigned, but you need to actively select it to confirm deliveries.
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
      <DeliveryConfirmationPageContent />
    </RoleBasedRoute>
  )
}