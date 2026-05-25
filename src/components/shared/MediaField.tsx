'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Upload, X, Image as ImageIcon, FileVideo, AlertCircle } from '@/lib/icons'

interface MediaFieldProps {
  onPhotosChange: (photos: string[]) => void
  initialPhotos?: string[]
  maxPhotos?: number
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
}

interface PhotoFile {
  id: string
  file: File
  preview: string
  uploadProgress: number
  isUploading: boolean
  error?: string
}

export function MediaField({
  onPhotosChange,
  initialPhotos = [],
  maxPhotos = 5,
  maxFileSize = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
}: MediaFieldProps) {
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [existingPhotos, setExistingPhotos] = useState<string[]>(initialPhotos)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newPhotos: PhotoFile[] = []
    
    Array.from(files).forEach((file) => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not supported`)
        return
      }

      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is ${maxFileSize}MB`)
        return
      }

      // Check photo limit
      if (photos.length + existingPhotos.length >= maxPhotos) {
        alert(`Maximum ${maxPhotos} photos allowed`)
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const preview = e.target?.result as string
        const photoFile: PhotoFile = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview,
          uploadProgress: 0,
          isUploading: false
        }
        newPhotos.push(photoFile)
        
        if (newPhotos.length === Array.from(files).length) {
          const updatedPhotos = [...photos, ...newPhotos]
          setPhotos(updatedPhotos)
          onPhotosChange([...existingPhotos, ...updatedPhotos.map(p => p.preview)])
        }
      }
      reader.readAsDataURL(file)
    })
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

  const removePhoto = (photoId: string) => {
    const updatedPhotos = photos.filter(p => p.id !== photoId)
    setPhotos(updatedPhotos)
    onPhotosChange([...existingPhotos, ...updatedPhotos.map(p => p.preview)])
  }

  const removeExistingPhoto = (photoUrl: string) => {
    const updatedExistingPhotos = existingPhotos.filter(p => p !== photoUrl)
    setExistingPhotos(updatedExistingPhotos)
    onPhotosChange([...updatedExistingPhotos, ...photos.map(p => p.preview)])
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const isImage = (file: File) => file.type.startsWith('image/')
  const isVideo = (file: File) => file.type.startsWith('video/')

  return (
    <div className="space-y-4">
      <Label>Media Attachments</Label>
      
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
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="mt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={openFileDialog}
                disabled={photos.length + existingPhotos.length >= maxPhotos}
              >
                Select Photos
              </Button>
              <p className="mt-2 text-sm text-muted-foreground">
                or drag and drop images here
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP up to {maxFileSize}MB each. Max {maxPhotos} files.
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
          />
        </CardContent>
      </Card>

      {/* Existing Photos */}
      {existingPhotos.length > 0 && (
        <div className="space-y-2">
          <Label>Current Photos ({existingPhotos.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {existingPhotos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt={`Existing photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeExistingPhoto(photo)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Photos */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <Label>New Photos ({photos.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border">
                  {isImage(photo.file) ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.preview}
                        alt={photo.file.name}
                        className="w-full h-full object-cover"
                      />
                    </>
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <FileVideo className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Upload Progress */}
                  {photo.isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-16">
                        <Progress value={photo.uploadProgress} className="h-2" />
                        <p className="text-white text-xs mt-1 text-center">
                          {photo.uploadProgress}%
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Error State */}
                  {photo.error && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                  )}
                </div>
                
                {/* Remove Button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(photo.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {/* File Info */}
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground truncate">{photo.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(photo.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {photo.error && (
                    <Alert className="mt-1">
                      <AlertDescription className="text-xs">
                        {photo.error}
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
          <strong>Photo Guidelines:</strong>
          <ul className="list-disc list-inside text-sm mt-1">
            <li>Take clear, well-lit photos of the affected area</li>
            <li>Include damage to infrastructure if visible</li>
            <li>Show context and scale when possible</li>
            <li>Location data will be automatically embedded when available</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Photo Counter */}
      <div className="flex justify-between items-center">
        <Badge variant="outline">
          {photos.length + existingPhotos.length} / {maxPhotos} photos
        </Badge>
        {(photos.length + existingPhotos.length) >= maxPhotos && (
          <p className="text-sm text-amber-600">
            Maximum photo limit reached
          </p>
        )}
      </div>
    </div>
  )
}