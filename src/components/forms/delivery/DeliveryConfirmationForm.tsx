'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

// UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// Icons
import { 
  Package, 
  MapPin, 
  Camera, 
  Save, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  FileText,
  Wifi,
  WifiOff,
  Loader2,
  Eye,
  Edit
} from 'lucide-react'

// Types and validation
import { ConfirmDeliverySchema, ResponseItem } from '@/lib/validation/response'
import { RapidResponse } from '@/types/response'
import { useAuth } from '@/hooks/useAuth'

// Hooks
import { useGPS, GPSLocation } from '@/hooks/useGPS'
import { useOffline } from '@/hooks/useOffline'

// Services
import { DeliveryOfflineService } from '@/lib/services/delivery-offline.service'
import { apiGet, apiPost } from '@/lib/api'
import { ResponseService } from '@/lib/services/response-client.service'

// Components
import { DeliveryMediaField } from './DeliveryMediaField'

const DeliveryConfirmationSchema = ConfirmDeliverySchema.extend({
  // Add any additional form fields needed for UI
})

type DeliveryConfirmationFormData = z.infer<typeof DeliveryConfirmationSchema>

interface DeliveryConfirmationFormProps {
  responseId: string
  onSuccess?: (data: any) => void
  onCancel?: () => void
  initialData?: Partial<DeliveryConfirmationFormData>
}

export function DeliveryConfirmationForm({ 
  responseId, 
  onSuccess, 
  onCancel,
  initialData
}: DeliveryConfirmationFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [locationCaptureTime, setLocationCaptureTime] = useState<Date | null>(null)
  const [mediaAttachments, setMediaAttachments] = useState<any[]>([])
  
  const { user, token } = useAuth()
  const { isOnline } = useOffline()
  const { 
    location: gpsLocation, 
    error: gpsError, 
    isLoading: isGpsLoading, 
    getCurrentLocation 
  } = useGPS()

  const queryClient = useQueryClient()

  // Form setup
  const form = useForm<DeliveryConfirmationFormData>({
    resolver: zodResolver(DeliveryConfirmationSchema),
    defaultValues: {
      deliveredItems: initialData?.deliveredItems || [],
      deliveryLocation: initialData?.deliveryLocation || {
        latitude: 0,
        longitude: 0
      },
      deliveryNotes: initialData?.deliveryNotes || ''
    }
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'deliveredItems'
  })

  // Fetch response details
  const { data: response, isLoading: isLoadingResponse, error: responseError } = useQuery({
    queryKey: ['response', responseId],
    queryFn: async () => {
      if (!token) throw new Error('User not authenticated')
      const result = await apiGet(`/api/v1/responses/${responseId}`)
      if (!result.success) throw new Error('Failed to fetch response')
      return (result.data as any)?.data || result.data as RapidResponse
    },
    enabled: !!responseId && !!token
  })

  // Setup initial items from response data
  useEffect(() => {
    if (response && !initialData?.deliveredItems && fields.length === 0) {
      const responseItems = response.items as ResponseItem[] || []
      if (responseItems.length > 0) {
        // Use a flag to prevent multiple appends during React strict mode
        const hasItems = form.getValues('deliveredItems').length > 0
        if (!hasItems) {
          responseItems.forEach(item => {
            append(item)
          })
        }
      }
    }
  }, [response, initialData, fields.length, append, form])

  // Capture GPS location
  const captureGPSLocation = useCallback(async () => {
    try {
      const location = await getCurrentLocation()
      setLocationCaptureTime(new Date())
      
      // Update form with GPS location
      form.setValue('deliveryLocation', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      })
      
      form.clearErrors('deliveryLocation')
    } catch (error) {
      console.error('Failed to capture GPS location:', error)
    }
  }, [form, getCurrentLocation])

  // Auto-capture GPS on mount
  useEffect(() => {
    captureGPSLocation()
  }, [captureGPSLocation])

  // Delivery confirmation mutation
  const confirmDeliveryMutation = useMutation({
    mutationFn: async (data: DeliveryConfirmationFormData) => {
      const payload = {
        ...data,
        mediaAttachmentIds: mediaAttachments.map(m => m.id)
      }

      // Check if we're online and can sync immediately
      if (isOnline) {
        try {
          const res = await apiPost(`/api/v1/responses/${responseId}/deliver`, payload)
          if (!res.success) {
            throw new Error(res.error || 'Failed to confirm delivery')
          }
          return res
        } catch (onlineError) {
          console.warn('Online delivery failed, falling back to offline mode:', onlineError)
          // Fall through to offline mode
        }
      }

      // Offline mode or online fallback - use delivery offline service
      if (!gpsLocation) {
        throw new Error('GPS location is required for offline delivery confirmation')
      }

      // Prepare media files for offline storage
      const mediaFiles = mediaAttachments.map(media => ({
        id: media.id,
        file: new File([], media.filename), // We'll need to pass actual file data
        localPath: media.url || media.id,
        metadata: media.metadata
      }))

      const offlineResult = await DeliveryOfflineService.storeDeliveryConfirmation(
        payload,
        responseId,
        gpsLocation,
        mediaFiles,
        (user as any)?.id || ''
      )

      // Return a mock response that matches the online API response format
      return {
        success: offlineResult.success,
        data: {
          id: responseId,
          status: offlineResult.networkStatus === 'online' ? 'DELIVERED' : 'DELIVERED',
          deliveryData: payload,
          deliveryLocation: gpsLocation,
          deliveryTimestamp: offlineResult.timestamp,
          networkStatus: offlineResult.networkStatus,
          operationId: offlineResult.operationId
        },
        message: offlineResult.networkStatus === 'online' 
          ? 'Delivery confirmed successfully' 
          : 'Delivery confirmation stored for offline sync'
      }
    },
    onSuccess: (data) => {
      console.log('✅ Delivery confirmation processed:', data)
      queryClient.invalidateQueries({ queryKey: ['response', responseId] })
      queryClient.invalidateQueries({ queryKey: ['responses'] })
      
      // Show different success message based on sync status
      const message = data.data.networkStatus === 'offline'
        ? 'Delivery confirmation stored for offline sync. It will be automatically synced when you\'re back online.'
        : 'Delivery confirmed successfully'
        
      onSuccess?.({ ...data.data, message })
    },
    onError: (error: Error) => {
      console.error('❌ Delivery confirmation failed:', error)
      form.setError('root', {
        message: error.message
      })
    }
  })

  const onSubmit = form.handleSubmit(async (data) => {
    // Validate GPS location
    if (!gpsLocation) {
      form.setError('deliveryLocation', {
        message: 'GPS location is required. Please capture your current location.'
      })
      return
    }

    // Validate at least one delivered item
    if (data.deliveredItems.length === 0) {
      form.setError('deliveredItems', {
        message: 'At least one delivered item is required'
      })
      return
    }

    confirmDeliveryMutation.mutate({
      ...data,
      mediaAttachmentIds: mediaAttachments.map(m => m.id)
    })
  })

  const handleItemQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity >= 0) {
      update(index, { ...fields[index], quantity: newQuantity })
    }
  }

  const handleMediaChange = (media: any[]) => {
    setMediaAttachments(media)
    form.setValue('mediaAttachmentIds', media.map(m => m.id))
  }

  // Loading state
  if (isLoadingResponse) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (responseError) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Error Loading Response
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load response details. Please try again or contact support.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Confirm Delivery
              </CardTitle>
              <CardDescription>
                Document the actual delivery of planned aid items
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  Online
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
              <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Delivery Confirmation Preview</DialogTitle>
                    <DialogDescription>
                      Review the delivery information before confirming
                    </DialogDescription>
                  </DialogHeader>
                  <DeliveryPreview 
                    response={response!}
                    formData={form.getValues()}
                    gpsLocation={gpsLocation}
                    locationCaptureTime={locationCaptureTime}
                    mediaAttachmentIds={mediaAttachments.map(m => m.id)}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowPreview(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Response Information */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Response Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Entity</label>
                <p className="font-medium">{response.entity?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Assessment Type</label>
                <p className="font-medium">{response.assessment?.rapidAssessmentType || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Priority</label>
                <Badge variant={getPriorityVariant(response.priority)}>
                  {response.priority}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Planned Date</label>
                <p className="font-medium">
                  {new Date(response.plannedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Confirmation Form */}
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* GPS Location Capture */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Location
              </CardTitle>
              <CardDescription>
                Capture the GPS coordinates where the delivery is being made
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={captureGPSLocation}
                    disabled={isGpsLoading}
                    className="flex items-center gap-2"
                  >
                    {isGpsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    {isGpsLoading ? 'Capturing...' : 'Capture Location'}
                  </Button>
                  
                  {locationCaptureTime && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {locationCaptureTime.toLocaleTimeString()}
                    </Badge>
                  )}
                </div>

                {gpsError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{gpsError}</AlertDescription>
                  </Alert>
                )}

                {gpsLocation && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Latitude</label>
                      <p className="font-mono">{gpsLocation.latitude.toFixed(6)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Longitude</label>
                      <p className="font-mono">{gpsLocation.longitude.toFixed(6)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Accuracy</label>
                      <p className="font-mono">{gpsLocation.accuracy?.toFixed(0)}m</p>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="deliveryLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="hidden"
                          {...field}
                          value={JSON.stringify(field.value)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value)
                              field.onChange(parsed)
                            } catch (error) {
                              // Handle JSON parse error
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivered Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Delivered Items</CardTitle>
                  <CardDescription>
                    Confirm the actual items delivered
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? 'Stop Editing' : 'Edit Items'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.length === 0 ? (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      No items found in the planned response. Please check the response details.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {fields.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Item Name</label>
                            <p className="font-medium">{item.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Unit</label>
                            <p className="font-medium">{item.unit}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Quantity</label>
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.quantity}
                                  onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 0)}
                                  className="w-20"
                                />
                              ) : (
                                <span className="font-medium">{item.quantity}</span>
                              )}
                              <span className="text-sm text-gray-500">{item.unit}</span>
                            </div>
                          </div>
                          {item.notes && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Notes</label>
                              <p className="text-sm text-gray-600">{item.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="deliveredItems"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="hidden"
                          {...field}
                          value={JSON.stringify(field.value)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value)
                              field.onChange(parsed)
                            } catch (error) {
                              // Handle JSON parse error
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Notes</CardTitle>
              <CardDescription>
                Add any additional observations or notes about the delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="deliveryNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any delivery notes, observations, or special circumstances..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Media Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Delivery Photos
              </CardTitle>
              <CardDescription>
                Add photos as proof of delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeliveryMediaField
                onResponseMediaChange={handleMediaChange}
                deliveryId={responseId}
                assessmentId={response?.assessmentId}
                maxPhotos={5}
                requireGPS={false} // GPS already captured above
                showLocationPreview={true}
              />
            </CardContent>
          </Card>

          {/* Form Errors */}
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={confirmDeliveryMutation.isPending}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={confirmDeliveryMutation.isPending || !gpsLocation || fields.length === 0}
              className="flex items-center gap-2"
            >
              {confirmDeliveryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm Delivery
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

// Helper components and functions
function getPriorityVariant(priority: string) {
  switch (priority) {
    case 'CRITICAL': return 'destructive'
    case 'HIGH': return 'destructive'
    case 'MEDIUM': return 'default'
    case 'LOW': return 'secondary'
    default: return 'default'
  }
}

function DeliveryPreview({ 
  response, 
  formData, 
  gpsLocation, 
  locationCaptureTime,
  mediaAttachmentIds 
}: {
  response: RapidResponse
  formData: DeliveryConfirmationFormData
  gpsLocation: GPSLocation | null
  locationCaptureTime: Date | null
  mediaAttachmentIds: string[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-500">Entity</label>
          <p className="font-medium">{response.entity?.name || 'N/A'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Response Type</label>
          <p className="font-medium">{response.type}</p>
        </div>
      </div>
      
      <Separator />
      
      <div>
        <label className="text-sm font-medium text-gray-500">Delivery Location</label>
        {gpsLocation ? (
          <div className="p-3 bg-gray-50 rounded">
            <p className="font-mono text-sm">
              {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Captured at {locationCaptureTime?.toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-red-500">Location not captured</p>
        )}
      </div>
      
      <div>
        <label className="text-sm font-medium text-gray-500">Items Delivered</label>
        <div className="space-y-1 mt-2">
          {formData.deliveredItems.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>{item.name}</span>
              <span className="font-medium">{item.quantity} {item.unit}</span>
            </div>
          ))}
        </div>
      </div>
      
      {formData.deliveryNotes && (
        <div>
          <label className="text-sm font-medium text-gray-500">Delivery Notes</label>
          <p className="text-sm mt-1">{formData.deliveryNotes}</p>
        </div>
      )}
      
      <div>
        <label className="text-sm font-medium text-gray-500">Media Attachments</label>
        <p className="text-sm mt-1">{mediaAttachmentIds.length} photo(s) attached</p>
      </div>
    </div>
  )
}