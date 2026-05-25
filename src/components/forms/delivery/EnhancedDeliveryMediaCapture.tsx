'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Camera, 
  Image as ImageIcon, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  RefreshCw,
  Eye,
  Upload,
  X
} from '@/lib/icons'
import { useGPS } from '@/hooks/useGPS'
import { DeliveryMediaValidator } from '@/lib/utils/delivery-media-validator'
import { GPSLocation } from '@/hooks/useGPS'
import { MediaAttachment } from '@/types/media'

interface EnhancedDeliveryMediaCaptureProps {
  onMediaCapture: (media: MediaAttachment[]) => void
  maxPhotos?: number
  deliveryId?: string
  requireGPS?: boolean
  showQualityIndicator?: boolean
  enableValidation?: boolean
}

interface CapturedMedia {
  file: File
  preview: string
  gps?: GPSLocation
  validation?: any
  timestamp: Date
}

export function EnhancedDeliveryMediaCapture({
  onMediaCapture,
  maxPhotos = 5,
  deliveryId,
  requireGPS = true,
  showQualityIndicator = true,
  enableValidation = true
}: EnhancedDeliveryMediaCaptureProps) {
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const [validationResults, setValidationResults] = useState<Map<string, any>>(new Map())
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  
  const { 
    location: gpsLocation, 
    error: gpsError, 
    isLoading: isGpsLoading, 
    getCurrentLocation 
  } = useGPS()

  const capturePhoto = useCallback(async () => {
    try {
      // Get current GPS location
      const currentGPS = requireGPS ? await getCurrentLocation() : undefined
      if (requireGPS && !currentGPS) {
        alert('GPS location is required. Please enable location services.')
        return
      }

      // Trigger camera capture
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = 'environment' // Use rear camera
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) return

        setIsProcessing(true)
        
        try {
          const preview = await createImagePreview(file)
          const capturedItem: CapturedMedia = {
            file,
            preview,
            gps: currentGPS || undefined,
            timestamp: new Date()
          }

          // Validate media if enabled
          if (enableValidation) {
            const validation = DeliveryMediaValidator.validateDeliveryMedia(
              file,
              currentGPS,
              new Date()
            )
            
            const newValidationResults = new Map(validationResults)
            newValidationResults.set(capturedItem.preview, validation)
            setValidationResults(newValidationResults)
          }

          setCapturedMedia(prev => {
            const updated = [...prev, capturedItem]
            // Notify parent component
            onMediaCapture(updated.map(item => ({
              id: item.preview, // Temporary ID
              filename: item.file.name,
              originalName: item.file.name,
              mimeType: item.file.type,
              fileSize: item.file.size,
              filePath: item.preview, // Temporary
              metadata: {
                capturedFor: 'delivery_proof',
                gps: item.gps,
                deliveryTimestamp: item.timestamp,
                verificationStatus: 'pending'
              } as any,
              uploadedBy: 'responder',
              uploadedAt: item.timestamp,
              syncStatus: 'LOCAL' as const,
              assessmentId: null,
              responseId: null,
              localPath: item.preview,
              thumbnailPath: null
            })) as any)
            return updated
          })
        } catch (error) {
          console.error('Error processing photo:', error)
          alert('Failed to process photo. Please try again.')
        } finally {
          setIsProcessing(false)
        }
      }

      input.click()
    } catch (error) {
      console.error('Error capturing photo:', error)
      alert('Failed to capture photo. Please check camera permissions.')
    }
  }, [requireGPS, getCurrentLocation, enableValidation, validationResults, onMediaCapture])

  const selectFromGallery = useCallback(async () => {
    try {
      // Get current GPS location
      const currentGPS = requireGPS ? await getCurrentLocation() : undefined
      if (requireGPS && !currentGPS) {
        alert('GPS location is required. Please enable location services.')
        return
      }

      fileInputRef.current?.click()
    } catch (error) {
      console.error('Error selecting from gallery:', error)
    }
  }, [requireGPS, getCurrentLocation])

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setIsProcessing(true)
    
    try {
      const newMedia: CapturedMedia[] = []
      
      for (const file of files) {
        if (capturedMedia.length + newMedia.length >= maxPhotos) {
          alert(`Maximum ${maxPhotos} photos allowed`)
          break
        }

        const preview = await createImagePreview(file)
        const capturedItem: CapturedMedia = {
          file,
          preview,
          timestamp: new Date()
        }

        // Get GPS location for each file
        if (requireGPS) {
          try {
            capturedItem.gps = await getCurrentLocation()
          } catch (error) {
            console.warn('Failed to get GPS for selected file:', error)
          }
        }

        // Validate media if enabled
        if (enableValidation) {
          const validation = DeliveryMediaValidator.validateDeliveryMedia(
            file,
            capturedItem.gps,
            capturedItem.timestamp
          )
          
          const newValidationResults = new Map(validationResults)
          newValidationResults.set(capturedItem.preview, validation)
          setValidationResults(newValidationResults)
        }

        newMedia.push(capturedItem)
      }

      setCapturedMedia(prev => {
        const updated = [...prev, ...newMedia]
        onMediaCapture(updated.map(item => ({
          id: item.preview,
          filename: item.file.name,
          originalName: item.file.name,
          mimeType: item.file.type,
          fileSize: item.file.size,
          filePath: item.preview,
          metadata: {
            capturedFor: 'delivery_proof',
            gps: item.gps,
            deliveryTimestamp: item.timestamp,
            verificationStatus: 'pending'
          } as any,
          uploadedBy: 'responder',
          uploadedAt: item.timestamp,
          syncStatus: 'LOCAL' as const,
          assessmentId: null,
          responseId: null,
          localPath: item.preview,
          thumbnailPath: null
        })) as any)
        return updated
      })
    } catch (error) {
      console.error('Error processing selected files:', error)
      alert('Failed to process selected files. Please try again.')
    } finally {
      setIsProcessing(false)
      // Reset file input
      if (event.target) {
        event.target.value = ''
      }
    }
  }, [capturedMedia.length, maxPhotos, requireGPS, getCurrentLocation, enableValidation, validationResults, onMediaCapture])

  const removeMedia = useCallback((index: number) => {
    setCapturedMedia(prev => {
      const updated = prev.filter((_, i) => i !== index)
      onMediaCapture(updated.map(item => ({
        id: item.preview,
        filename: item.file.name,
        originalName: item.file.name,
        mimeType: item.file.type,
        fileSize: item.file.size,
        filePath: item.preview,
        metadata: {
          capturedFor: 'delivery_proof',
          gps: item.gps,
          deliveryTimestamp: item.timestamp,
          verificationStatus: 'pending'
        } as any,
        uploadedBy: 'responder',
        uploadedAt: item.timestamp,
        syncStatus: 'LOCAL' as const,
        assessmentId: null,
        responseId: null,
        localPath: item.preview,
        thumbnailPath: null
      })) as any)
      return updated
    })
  }, [onMediaCapture])

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        resolve('file-preview') // Placeholder for non-image files
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getValidationIcon = (validation: any) => {
    if (!validation) return null
    if (validation.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <AlertTriangle className="h-4 w-4 text-red-500" />
  }

  const getMediaSummary = () => {
    if (capturedMedia.length === 0) return null
    
    const allValidations = Array.from(validationResults.values())
    const avgScore = allValidations.length > 0 
      ? allValidations.reduce((sum, v) => sum + v.score, 0) / allValidations.length 
      : 0
    
    const allWithGPS = capturedMedia.filter(m => m.gps).length
    const completeness = DeliveryMediaValidator.assessMediaCompleteness(
      capturedMedia.length,
      allWithGPS > 0,
      capturedMedia.length > 1,
      false
    )

    return { avgScore, completeness, allWithGPS }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Delivery Photos
        </CardTitle>
        <CardDescription>
          Capture photos as proof of delivery with GPS location tagging
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GPS Status */}
        {requireGPS && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">GPS Location</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={isGpsLoading}
              >
                {isGpsLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {gpsError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{gpsError}</AlertDescription>
              </Alert>
            )}
            
            {gpsLocation && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Location Captured</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                  {gpsLocation.accuracy && (
                    <span className="ml-2">
                      (±{gpsLocation.accuracy.toFixed(0)}m)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Capture Actions */}
        <div className="flex gap-2">
          <Button
            onClick={capturePhoto}
            disabled={isProcessing || capturedMedia.length >= maxPhotos}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
          
          <Button
            variant="outline"
            onClick={selectFromGallery}
            disabled={isProcessing || capturedMedia.length >= maxPhotos}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Select from Gallery
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Media Preview */}
        {capturedMedia.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Captured Photos ({capturedMedia.length}/{maxPhotos})
              </Label>
              
              {showQualityIndicator && getMediaSummary() && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={getQualityColor(getMediaSummary()!.avgScore)}>
                    Quality: {getMediaSummary()!.avgScore.toFixed(0)}%
                  </span>
                  <Badge variant={getMediaSummary()!.completeness.score > 80 ? 'default' : 'secondary'}>
                    Score: {getMediaSummary()!.completeness.score.toFixed(0)}%
                  </Badge>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {capturedMedia.map((media, index) => (
                <div key={index} className="relative group">
                  <div 
                    className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer border-2 border-border hover:border-blue-300 transition-colors"
                    onClick={() => setShowPreview(media.preview)}
                  >
                    {media.file.type.startsWith('image/') ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={media.preview}
                          alt={`Delivery photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Validation Status */}
                    {enableValidation && validationResults.has(media.preview) && (
                      <div className="absolute top-2 right-2">
                        {getValidationIcon(validationResults.get(media.preview))}
                      </div>
                    )}

                    {/* GPS Badge */}
                    {media.gps && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          <MapPin className="h-3 w-3" />
                        </Badge>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="outline" className="text-xs">
                        {media.timestamp.toLocaleTimeString()}
                      </Badge>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeMedia(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Validation Summary */}
            {enableValidation && Array.from(validationResults.values()).some(v => !v.isValid) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some photos have validation issues. Check individual photos for details.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span>Processing photo...</span>
              </div>
              <Progress value={undefined} className="mt-4 w-48" />
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Photo Preview</DialogTitle>
                <DialogDescription>
                  Review captured photo details
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={showPreview}
                    alt="Delivery photo preview"
                    className="max-w-full max-h-96 rounded-lg"
                  />
                </div>

                {/* Photo Details */}
                {capturedMedia.find(m => m.preview === showPreview) && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="font-medium">File Name</Label>
                      <p>{capturedMedia.find(m => m.preview === showPreview)?.file.name}</p>
                    </div>
                    <div>
                      <Label className="font-medium">File Size</Label>
                      <p>
                        {(capturedMedia.find(m => m.preview === showPreview)?.file.size! / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">Capture Time</Label>
                      <p>{capturedMedia.find(m => m.preview === showPreview)?.timestamp.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="font-medium">GPS Location</Label>
                      <p>
                        {capturedMedia.find(m => m.preview === showPreview)?.gps
                          ? `${capturedMedia.find(m => m.preview === showPreview)?.gps?.latitude.toFixed(6)}, ${capturedMedia.find(m => m.preview === showPreview)?.gps?.longitude.toFixed(6)}`
                          : 'No GPS data'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Validation Details */}
                {enableValidation && validationResults.has(showPreview) && (
                  <div className="space-y-2">
                    <Label className="font-medium">Validation Results</Label>
                    <div className={`p-3 rounded-lg ${
                      validationResults.get(showPreview)?.isValid 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {getValidationIcon(validationResults.get(showPreview))}
                        <span className="font-medium">
                          Quality Score: {validationResults.get(showPreview)?.score.toFixed(0)}%
                        </span>
                      </div>
                      
                      {validationResults.get(showPreview)?.errors?.length > 0 && (
                        <div className="space-y-1">
                          <p className="font-medium text-red-700">Errors:</p>
                          {validationResults.get(showPreview).errors.map((error: string, index: number) => (
                            <p key={index} className="text-sm text-red-600">• {error}</p>
                          ))}
                        </div>
                      )}
                      
                      {validationResults.get(showPreview)?.warnings?.length > 0 && (
                        <div className="space-y-1 mt-2">
                          <p className="font-medium text-yellow-700">Warnings:</p>
                          {validationResults.get(showPreview).warnings.map((warning: string, index: number) => (
                            <p key={index} className="text-sm text-yellow-600">• {warning}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}