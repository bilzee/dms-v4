'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, CheckCircle, Clock, Package, MapPin, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'

interface Response {
  id: string
  type: string
  deliveryStatus: string
  priority: string
  entityId: string
  assessmentId?: string
  responderId?: string
  donorId?: string
  plannedDate?: string
  deliveredDate?: string
  verificationStatus: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
  verifiedAt?: string
  deliveredAt?: string
  items: any[]
  resources?: any
  assessment?: {
    id: string
    rapidAssessmentType: string
    rapidAssessmentDate: string
    status: string
    verificationStatus: string
    location?: string
    coordinates?: any
    entity: {
      id: string
      name: string
      type: string
      location?: string
      coordinates?: any
    }
  }
  entity: {
    id: string
    name: string
    type: string
    location?: string
    coordinates?: any
  }
  responder?: {
    id: string
    name: string
    email: string
  }
  donor?: {
    id: string
    name: string
    type: string
    contactEmail: string
  }
}

export default function ResponseDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [response, setResponse] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResponse = async () => {
      try {
        const result = await apiGet(`/api/v1/responses/${params.id}`)
        if (!result.success) {
          throw new Error(result.error || 'Response not found')
        }
        setResponse(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load response')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchResponse()
    }
  }, [params.id])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>
      case 'VERIFIED':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
      case 'PLANNING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Planning</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>
      case 'medium':
        return <Badge variant="secondary">Medium Priority</Badge>
      case 'low':
        return <Badge variant="outline">Low Priority</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading response details...</div>
        </div>
      </div>
    )
  }

  if (error || !response) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Response Not Found</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Responses
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Response Details</h1>
          <p className="text-muted-foreground">
            {response.type} Response for {response.entity.name}
          </p>
        </div>
      </div>

      {/* Response Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Response Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Entity</label>
              <p className="font-semibold">{response.entity.name}</p>
              <p className="text-sm text-muted-foreground">{response.entity.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Response Type</label>
              <p className="font-semibold">{response.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="font-semibold">
                {new Date(response.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Location Information */}
          {(response.entity.location || response.assessment?.location) && (
            <div className="flex items-start gap-2 pt-4">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Location</label>
                <p className="text-sm">
                  {response.entity.location || response.assessment?.location}
                </p>
                {(response.entity.coordinates || response.assessment?.coordinates) && (
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const coords = response.entity.coordinates || response.assessment?.coordinates;
                      if (coords && typeof coords === 'object') {
                        const lat = coords.latitude || coords.lat;
                        const lng = coords.longitude || coords.lng;
                        const accuracy = coords.accuracy;
                        if (lat && lng) {
                          return `${lat.toFixed(6)}, ${lng.toFixed(6)}${accuracy ? ` (±${accuracy}m)` : ''}`;
                        }
                      }
                      return null;
                    })()}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {getStatusBadge(response.deliveryStatus)}
            {getPriorityBadge(response.priority)}
          </div>

          {/* Timeline */}
          <div className="pt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Timeline</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span>Created: {new Date(response.createdAt).toLocaleString()}</span>
              </div>
              {response.verifiedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Verified: {new Date(response.verifiedAt).toLocaleString()}</span>
                </div>
              )}
              {response.deliveredAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Delivered: {new Date(response.deliveredAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            {/* Responder Information */}
            {response.responder && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assigned Responder</label>
                <div>
                  <p className="font-semibold">{response.responder.name}</p>
                  <p className="text-sm text-muted-foreground">{response.responder.email}</p>
                </div>
              </div>
            )}

            {/* Donor Information */}
            {response.donor && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Donor</label>
                <div>
                  <p className="font-semibold">{response.donor.name}</p>
                  <p className="text-sm text-muted-foreground">{response.donor.type}</p>
                  {response.donor.contactEmail && (
                    <p className="text-sm text-muted-foreground">{response.donor.contactEmail}</p>
                  )}
                </div>
              </div>
            )}

            {/* Assessment Information */}
            {response.assessment && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Related Assessment</label>
                <div>
                  <p className="font-semibold">{response.assessment.rapidAssessmentType} Assessment</p>
                  <p className="text-sm text-muted-foreground">
                    Conducted on {new Date(response.assessment.rapidAssessmentDate).toLocaleDateString()}
                  </p>
                  <Badge variant={response.assessment.verificationStatus === 'VERIFIED' ? 'default' : 'secondary'}>
                    {response.assessment.verificationStatus}
                  </Badge>
                </div>
              </div>
            )}

            {/* Planned/Delivery Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {response.plannedDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Planned Date</label>
                  <p className="font-semibold">{new Date(response.plannedDate).toLocaleDateString()}</p>
                </div>
              )}
              {response.deliveredDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Delivered Date</label>
                  <p className="font-semibold">{new Date(response.deliveredDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {/* Verification Status */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Verification Status</label>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={response.verificationStatus === 'VERIFIED' ? 'default' : response.verificationStatus === 'REJECTED' ? 'destructive' : 'secondary'}>
                  {response.verificationStatus}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Items */}
      {response.items && response.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {response.items.map((item: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{item.name || 'Unnamed Item'}</h4>
                    {item.quantity && (
                      <Badge variant="outline">
                        Qty: {item.quantity} {item.unit || ''}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                  )}
                  {item.urgency && (
                    <Badge variant={item.urgency === 'HIGH' ? 'destructive' : 'secondary'}>
                      {item.urgency} Urgency
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resources/Notes */}
      {response.resources && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            {response.resources.deliveryNotes && (
              <div className="mb-4">
                <h4 className="font-semibold text-sm mb-2">Delivery Notes</h4>
                <p className="text-sm text-muted-foreground">{response.resources.deliveryNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  )
}