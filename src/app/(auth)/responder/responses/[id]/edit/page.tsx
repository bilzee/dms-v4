'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { ResponsePlanningForm } from '@/components/forms/response'

interface Response {
  id: string
  type: string
  status: string
  priority: string
  description?: string
  resources?: any
  rejectionReason?: string
  entityId: string
  assessmentId?: string
  items?: any[]
  entity: {
    id: string
    name: string
    type: string
  }
  assessment?: {
    id: string
    rapidAssessmentType: string
    entity: {
      name: string
    }
  }
}

export default function EditRejectedResponsePage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [response, setResponse] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch response data
  useEffect(() => {
    async function fetchResponse() {
      if (!user || !id) return

      try {
        const result = await apiGet(`/api/v1/responses/${id}`)
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch response')
        }

        const responseData = result.data

        // Only allow editing if verification status is REJECTED
        if (responseData.verificationStatus !== 'REJECTED') {
          setError('Only rejected responses can be edited')
          return
        }

        setResponse(responseData)
        
      } catch (err) {
        console.error('Error fetching response:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch response')
      } finally {
        setLoading(false)
      }
    }

    fetchResponse()
  }, [user, id])

  const handleSuccess = () => {
    // Navigate back to responses list on successful submission
    router.push('/responder/responses')
  }

  const handleCancel = () => {
    router.push('/responder/responses')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Response...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !response) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button onClick={handleCancel} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Responses
            </Button>
            <h1 className="text-2xl font-bold">Edit Rejected Response</h1>
          </div>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button onClick={handleCancel} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Responses
            </Button>
            <h1 className="text-2xl font-bold">Edit Rejected Response</h1>
          </div>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Response not found</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={handleCancel} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Responses
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold">Edit Rejected Response</h1>
          <p className="text-muted-foreground">
            Update response details and resubmit as delivery for coordinator verification
          </p>
        </div>
      </div>

      {/* Rejection Reason Alert */}
      {response.rejectionReason && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Rejection Reason:</strong> {response.rejectionReason}
          </AlertDescription>
        </Alert>
      )}

      {/* Response Planning Form in Resubmit Mode */}
      <ResponsePlanningForm
        mode="resubmit"
        initialData={{
          id: response.id,
          assessmentId: response.assessmentId || '',
          entityId: response.entityId,
          type: response.type as any,
          priority: response.priority as any,
          description: response.description || '',
          assessment: response.assessment,
          items: response.items?.map((item: any) => ({
            name: item.name || '',
            unit: item.unit || '',
            quantity: item.quantity || 1,
            notes: item.notes || ''
          })) || [{ name: '', unit: '', quantity: 1, notes: '' }]
        }}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    </div>
  )
}