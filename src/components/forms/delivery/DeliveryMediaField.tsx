'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  FileVideo, 
  AlertCircle,
  MapPin,
  Camera,
  Wifi,
  WifiOff
} from '@/lib/icons'
import { 
  DeliveryMediaFieldProps, 
  MediaAttachment, 
  MediaUploadProgress, 
  GPSMetadata,
  DeliveryMediaMetadata,
  DEFAULT_DELIVERY_MEDIA_RULES
} from '@/types/media'

export function DeliveryMediaField({
  onResponseMediaChange,
  initialMedia = [],
  deliveryId,
  assessmentId,
  maxPhotos = 5,
  maxFileSize = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  requireGPS = true,
  offlineEnabled = true,
  showLocationPreview = true
}: DeliveryMediaFieldProps) {
  const [uploadProgress, setUploadProgress] = useState<MediaUploadProgress[]>([])
  const [existingMedia, setExistingMedia] = useState<MediaAttachment[]>(initialMedia)
  const [dragActive, setDragActive] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [currentGPS, setCurrentGPS] = useState<GPSMetadata | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Get current GPS location
  const getCurrentGPS = (): Promise<GPSMetadata> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gps: GPSMetadata = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            timestamp: new Date(position.timestamp),
            deviceHeading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined
          }
          setCurrentGPS(gps)
          setGpsError(null)
          resolve(gps)
        },
        (error) => {
          const errorMessage = `GPS Error: ${error.message}`
          setGpsError(errorMessage)
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000 // 30 seconds
        }
      )
    })
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return

    const newUploads: MediaUploadProgress[] = []
    
    for (const file of Array.from(files)) {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not supported`)
        continue
      }

      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is ${maxFileSize}MB`)
        continue
      }

      // Check photo limit
      if (uploadProgress.length + existingMedia.length >= maxPhotos) {
        alert(`Maximum ${maxPhotos} photos allowed`)
        break
      }

      try {
        // Get GPS location if required
        let gpsMetadata: GPSMetadata | undefined
        if (requireGPS) {
          try {
            gpsMetadata = await getCurrentGPS()
          } catch (error) {
            alert(`GPS location required: ${(error as Error).message}`)
            continue
          }
        }

        // Create delivery metadata
        const deliveryMetadata: DeliveryMediaMetadata = {
          capturedFor: 'delivery_proof',
          deliveryId,
          assessmentId,
          gps: gpsMetadata!, // We know it exists if requireGPS is true
          deliveryTimestamp: new Date()
        }

        const uploadItem: MediaUploadProgress = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          uploadProgress: 0,
          isUploading: false,
          isCompleted: false,
          gpsMetadata,
          deliveryMetadata
        }
        
        newUploads.push(uploadItem)
      } catch (error) {
        console.error('Error processing file:', error)
        alert(`Error processing ${file.name}: ${(error as Error).message}`)
      }
    }

    if (newUploads.length > 0) {
      const updatedUploads = [...uploadProgress, ...newUploads]
      setUploadProgress(updatedUploads)
      
      // Start upload process
      newUploads.forEach(upload => uploadMediaFile(upload))
    }
  }

  const uploadMediaFile = async (upload: MediaUploadProgress) => {
    try {
      // Mark as uploading
      setUploadProgress(prev => 
        prev.map(u => u.id === upload.id ? { ...u, isUploading: true, uploadProgress: 0 } : u)
      )

      if (isOnline) {
        // Online upload simulation
        const formData = new FormData()
        formData.append('file', upload.file)
        formData.append('metadata', JSON.stringify(upload.deliveryMetadata))
        
        if (deliveryId) formData.append('responseId', deliveryId)
        if (assessmentId) formData.append('assessmentId', assessmentId)

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          setUploadProgress(prev => 
            prev.map(u => u.id === upload.id ? { ...u, uploadProgress: progress } : u)
          )
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        // Mark as completed
        setUploadProgress(prev => 
          prev.map(u => u.id === upload.id ? { ...u, isCompleted: true, isUploading: false } : u)
        )
      } else {
        // Offline storage
        setUploadProgress(prev => 
          prev.map(u => u.id === upload.id ? { 
            ...u, 
            uploadProgress: 100, 
            isCompleted: true, 
            isUploading: false,
            localPath: `/offline/${upload.file.name}`
          } : u)
        )
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadProgress(prev => 
        prev.map(u => u.id === upload.id ? { 
          ...u, 
          isUploading: false, 
          error: (error as Error).message 
        } : u)
      )
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const removeUpload = (uploadId: string) => {
    const updatedUploads = uploadProgress.filter(u => u.id !== uploadId)
    setUploadProgress(updatedUploads)
    onResponseMediaChange([...existingMedia, ...updatedUploads.filter(u => u.isCompleted).map(u => ({
      id: u.id,
      filename: u.file.name,
      originalName: u.file.name,
      mimeType: u.file.type,
      fileSize: u.file.size,
      filePath: u.localPath || `uploads/${u.file.name}`,
      localPath: u.localPath,
      metadata: u.deliveryMetadata as any,
      uploadedAt: new Date(),
      uploadedBy: 'current-user', // Would come from auth context
      syncStatus: isOnline ? 'SYNCED' : 'LOCAL',
      responseId: deliveryId || null,
      assessmentId: assessmentId || null,
      thumbnailPath: null,
      url: u.localPath || `uploads/${u.file.name}`
    } as MediaAttachment))])
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const isImage = (file: File) => file.type.startsWith('image/')
  const completedUploads = uploadProgress.filter(u => u.isCompleted)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Delivery Documentation Photos</Label>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="default" className="text-green-600">
              <Wifi className="h-3 w-3 mr-1" />
              Online
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-orange-600">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
          {requireGPS && (
            <Badge variant={currentGPS ? "default" : "destructive"}>
              <MapPin className="h-3 w-3 mr-1" />
              {currentGPS ? "GPS Ready" : "GPS Required"}
            </Badge>
          )}
        </div>
      </div>

      {/* GPS Status */}
      {requireGPS && (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            {currentGPS ? (
              <span className="text-sm">
                GPS Location: {currentGPS.latitude.toFixed(6)}, {currentGPS.longitude.toFixed(6)}
                {currentGPS.accuracy && (
                  <span className="text-muted-foreground ml-2">
                    (±{currentGPS.accuracy.toFixed(0)}m accuracy)
                  </span>
                )}
              </span>
            ) : (
              <span className="text-sm text-orange-600">
                GPS location will be captured when you take photos
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="mt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={openFileDialog}
                disabled={uploadProgress.length + existingMedia.length >= maxPhotos}
              >
                <Upload className="h-4 w-4 mr-2" />
                Take/Select Photos
              </Button>
              <p className="mt-2 text-sm text-muted-foreground">
                or drag and drop delivery photos here
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP up to {maxFileSize}MB each. Max {maxPhotos} files.
                {requireGPS && " GPS location will be automatically captured."}
              </p>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            capture="environment" // Suggest camera on mobile devices
          />
        </CardContent>
      </Card>

      {/* GPS Error */}
      {gpsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{gpsError}</AlertDescription>
        </Alert>
      )}

      {/* Existing Media */}
      {existingMedia.length > 0 && (
        <div className="space-y-2">
          <Label>Existing Photos ({existingMedia.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {existingMedia.map((media, index) => (
              <div key={(media as any).id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={(media as any).filePath}
                    alt={`Delivery photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {showLocationPreview && ((media as any).metadata as any)?.gps && (
                  <div className="absolute bottom-2 left-2 bg-white/90 rounded px-2 py-1 text-xs">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {((media as any).metadata as any).gps.latitude.toFixed(4)}, {((media as any).metadata as any).gps.longitude.toFixed(4)}
                  </div>
                )}
                <Badge 
                  variant={(media as any).syncStatus === 'SYNCED' ? 'default' : 'secondary'}
                  className="absolute top-2 left-2 text-xs"
                >
                  {(media as any).syncStatus}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {completedUploads.length > 0 && (
        <div className="space-y-2">
          <Label>New Photos ({completedUploads.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {completedUploads.map((upload) => (
              <div key={upload.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border">
                  {isImage(upload.file) ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(upload.file)}
                        alt={upload.file.name}
                        className="w-full h-full object-cover"
                      />
                    </>
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <FileVideo className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Upload Progress */}
                  {upload.isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-16">
                        <Progress value={upload.uploadProgress} className="h-2" />
                        <p className="text-white text-xs mt-1 text-center">
                          {upload.uploadProgress}%
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Error State */}
                  {upload.error && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                  )}
                </div>
                
                {/* GPS Location Badge */}
                {showLocationPreview && upload.gpsMetadata && (
                  <div className="absolute bottom-2 left-2 bg-white/90 rounded px-2 py-1 text-xs">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {upload.gpsMetadata.latitude.toFixed(4)}, {upload.gpsMetadata.longitude.toFixed(4)}
                  </div>
                )}
                
                {/* Sync Status Badge */}
                <div className="absolute top-2 left-2">
                  <Badge variant={isOnline ? "default" : "secondary"} className="text-xs">
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                
                {/* Remove Button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeUpload(upload.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {/* File Info */}
                <div className="mt-2">
                  <p className="text-xs text-gray-600 truncate">{upload.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {upload.error && (
                    <Alert className="mt-1">
                      <AlertDescription className="text-xs">
                        {upload.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <Alert>
        <ImageIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Delivery Photo Requirements:</strong>
          <ul className="list-disc list-inside text-sm mt-1">
            <li>Take clear photos showing delivered items and recipients</li>
            <li>Include location context when possible</li>
            <li>Photos must be taken at the delivery location</li>
            <li>GPS location will be automatically captured</li>
            <li>Photos will be time-stamped for verification</li>
            {offlineEnabled && <li>Photos can be taken offline and will sync when connection is available</li>}
          </ul>
        </AlertDescription>
      </Alert>

      {/* Photo Counter */}
      <div className="flex justify-between items-center">
        <Badge variant="outline">
          {existingMedia.length + completedUploads.length} / {maxPhotos} photos
        </Badge>
        {(existingMedia.length + completedUploads.length) >= maxPhotos && (
          <p className="text-sm text-amber-600">
            Maximum photo limit reached
          </p>
        )}
      </div>
    </div>
  )
}