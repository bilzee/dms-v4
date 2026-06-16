'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormCard } from '@/components/shared/FormCard'
import { FormActionBar } from '@/components/shared/FormActionBar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GPSCapture } from '@/components/shared/GPSCapture'
import dynamic from 'next/dynamic'

// Dynamic import for map component to avoid SSR issues
const MapLocationSelector = dynamic(
  () => import('@/components/forms/LocationSelector').then(mod => ({ default: mod.LocationSelector })),
  { 
    ssr: false,
    loading: () => <div className="h-48 w-full flex items-center justify-center bg-muted rounded-lg">Loading map...</div>
  }
)

import { LocationSelector } from '@/components/shared/LocationSelector'
import { MultipleEntitySelector } from '@/components/shared/MultipleEntitySelector'
import { MediaField } from '@/components/shared/MediaField'
import { usePreliminaryAssessment } from '@/hooks/usePreliminaryAssessment'
import { useActiveIncidents, Incident } from '@/hooks/useIncidents'
import { useAuth } from '@/hooks/useAuth'
import { PreliminaryAssessmentSchema } from '@/lib/validation/preliminary-assessment'
import { PreliminaryAssessmentData } from '@/types/preliminary-assessment'
import { AlertTriangle, Save, Send, Calendar, User, MapPin, Camera, Paperclip, X, CheckCircle2, Map as MapIcon, Crosshair } from '@/lib/icons'
import { z } from 'zod'

type FormData = z.infer<typeof PreliminaryAssessmentSchema>

function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface PreliminaryAssessmentFormProps {
  onSubmit?: (data: PreliminaryAssessmentData) => Promise<void>
  onDraftSave?: (data: Partial<PreliminaryAssessmentData>) => void
  initialData?: Partial<PreliminaryAssessmentData>
  disabled?: boolean
  showIncidentCreation?: boolean
  selectedDraftId?: string | null
  onCancel?: () => void
}

export function PreliminaryAssessmentForm({
  onSubmit,
  onDraftSave,
  initialData,
  disabled = false,
  showIncidentCreation = true,
  selectedDraftId,
  onCancel
}: PreliminaryAssessmentFormProps) {
  const { user } = useAuth()
  const { 
    createAssessment, 
    saveDraft, 
    currentDraft,
    drafts,
    isLoading,
    error,
    clearError 
  } = usePreliminaryAssessment()

  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('')
  const { data: availableIncidents = [] } = useActiveIncidents()
  const [mediaFiles, setMediaFiles] = useState<string[]>((initialData as any)?.mediaAttachments || [])
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [showMapSelector, setShowMapSelector] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isDirty }
  } = useForm<FormData>({
    resolver: zodResolver(PreliminaryAssessmentSchema),
    defaultValues: {
      reportingDate: initialData?.reportingDate 
        ? formatDatetimeLocal(new Date(initialData.reportingDate))
        : formatDatetimeLocal(new Date()),
      reportingLatitude: initialData?.reportingLatitude || 0,
      reportingLongitude: initialData?.reportingLongitude || 0,
      reportingLGA: initialData?.reportingLGA || '',
      reportingWard: initialData?.reportingWard || '',
      numberLivesLost: initialData?.numberLivesLost || 0,
      numberInjured: initialData?.numberInjured || 0,
      numberDisplaced: initialData?.numberDisplaced || 0,
      numberHousesAffected: initialData?.numberHousesAffected || 0,
      schoolsAffected: initialData?.schoolsAffected || '',
      medicalFacilitiesAffected: initialData?.medicalFacilitiesAffected || '',
      estimatedAgriculturalLandsAffected: initialData?.estimatedAgriculturalLandsAffected || undefined,
      reportingAgent: (user as any)?.name || '', // Always set to current user
      additionalDetails: initialData?.additionalDetails || '',
      affectedEntityIds: initialData?.affectedEntityIds || []
    }
  })

  // Load draft data if available
  useEffect(() => {
    if (selectedDraftId) {
      // Load the specific draft by ID
      const selectedDraft = drafts.find(d => d.id === selectedDraftId)
      
      if (selectedDraft?.data && !initialData) {
        Object.entries(selectedDraft.data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            setValue(key as keyof FormData, value as any)
          }
        })
      }
    } else if (currentDraft?.data && !initialData) {
      Object.entries(currentDraft.data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          setValue(key as keyof FormData, value as any)
        }
      })
    }
  }, [selectedDraftId, drafts, currentDraft, setValue, initialData])


  // Show feedback and auto-hide
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [feedbackMessage])

  // Auto-save draft every 30 seconds when form is dirty
  useEffect(() => {
    if (!isDirty) return

    const interval = setInterval(() => {
      const formData = watch()
      const cleanedData = {
        ...formData,
        incidentId: selectedIncidentId || undefined
      }
      saveDraft(cleanedData, true) // auto-save
      onDraftSave?.(cleanedData)
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [isDirty, watch, saveDraft, onDraftSave])

  const handleLocationCapture = (lat: number, lng: number) => {
    setValue('reportingLatitude', lat)
    setValue('reportingLongitude', lng)
  }

  // Handle location selection from map
  const handleLocationSelect = (latitude: number, longitude: number) => {
    setValue('reportingLatitude', latitude)
    setValue('reportingLongitude', longitude)
    setShowMapSelector(false)
  }

  const handleLocationChange = (lga: string, ward: string) => {
    setValue('reportingLGA', lga)
    setValue('reportingWard', ward)
  }

  const handleSaveDraft = () => {
    const formData = watch()
    const cleanedData = {
      ...formData,
      incidentId: selectedIncidentId || undefined
    }
    saveDraft(cleanedData, false) // manual save
    onDraftSave?.(cleanedData)
    setFeedbackMessage({ type: 'success', message: 'Draft saved successfully!' })
  }


  const handleFormSubmit = async (data: FormData) => {
    try {
      clearError()
      
      const submissionData = {
        ...data,
        reportingDate: new Date(data.reportingDate), // Convert string back to Date for backend
        estimatedAgriculturalLandsAffected: data.estimatedAgriculturalLandsAffected || undefined,
        incidentId: selectedIncidentId || '',
        mediaFiles
      }

      if (onSubmit) {
        await onSubmit(submissionData as any)
      } else {
        await createAssessment({ data: submissionData as any })
      }
      
      setFeedbackMessage({ type: 'success', message: 'Assessment submitted successfully!' })
      
      // Clear form after successful submission
      reset()
      setMediaFiles([])
      setSelectedIncidentId('')
      
      // Go back to main page
      setTimeout(() => {
        onCancel?.()
      }, 2000)
    } catch (error) {
      setFeedbackMessage({ type: 'error', message: 'Submission failed. Please try again.' })
    }
  }

  const watchedCoordinates = {
    lat: watch('reportingLatitude'),
    lng: watch('reportingLongitude')
  }

  return (
    <div className="space-y-6" data-testid="preliminary-assessment-form">
      {feedbackMessage && (
        <Alert variant={feedbackMessage.type === 'success' ? 'default' : 'destructive'}>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{feedbackMessage.message}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {(error as any)?.message || String(error)}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <FormCard
          title="Preliminary Assessment"
          description="Initial assessment of disaster impact and affected areas"
          columns={2}
        >

        {/* Reporting Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Reporting Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportingDate">
                  Reporting Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reportingDate"
                  type="datetime-local"
                  {...register('reportingDate')}
                  readOnly={true}
                  className="bg-muted text-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">Automatically set to current date and time</p>
                {errors.reportingDate && (
                  <p className="text-sm text-red-600">{errors.reportingDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportingAgent">
                  Reporting Agent <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reportingAgent"
                    {...register('reportingAgent')}
                    readOnly={true}
                    className="bg-muted text-foreground cursor-not-allowed"
                    placeholder="Automatically set to current user"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Automatically set to current logged-in user</p>
                {errors.reportingAgent && (
                  <p className="text-sm text-red-600">{errors.reportingAgent.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <GPSCapture
              onLocationCapture={handleLocationCapture}
              initialLocation={watchedCoordinates.lat && watchedCoordinates.lng ? watchedCoordinates : undefined}
              disabled={disabled}
              required
            />
            
            {/* Map Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Map Selection</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMapSelector(true)}
                disabled={disabled}
                className="w-full h-32 border-2 border-dashed border-border hover:border-blue-300 flex flex-col items-center justify-center text-muted-foreground hover:text-blue-600 transition-colors"
              >
                <MapIcon className="h-6 w-6 mb-2" />
                <span className="text-sm">Click to Select on Map</span>
                <span className="text-xs">Alternative to GPS capture</span>
              </Button>
              <p className="text-xs text-muted-foreground">
                Click on the map to select coordinates for the incident location
              </p>
            </div>

            {/* Current coordinates display */}
            {(watchedCoordinates.lat !== 0 || watchedCoordinates.lng !== 0) && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Crosshair className="h-4 w-4 text-primary" />
                  <span className="font-medium">Current Coordinates:</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Latitude: {watchedCoordinates.lat?.toFixed(6) || '0'}, Longitude: {watchedCoordinates.lng?.toFixed(6) || '0'}
                </div>
              </div>
            )}
            
            <Separator />
            
            <LocationSelector
              onLocationChange={handleLocationChange}
              initialLGA={watch('reportingLGA')}
              initialWard={watch('reportingWard')}
              disabled={disabled}
              required
            />

            <Separator />

            <div className="space-y-2">
              <Label>Affected Entities (Optional)</Label>
              <MultipleEntitySelector
                value={watch('affectedEntityIds')}
                onValueChange={(entityIds) => setValue('affectedEntityIds', entityIds)}
                disabled={disabled}
                placeholder="Select entities affected by this disaster"
              />
              <p className="text-sm text-muted-foreground">
                Select the entities (hospitals, schools, communities, etc.) that are affected by this disaster incident.
              </p>
              {errors.affectedEntityIds && (
                <p className="text-sm text-red-600">{errors.affectedEntityIds.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Impact Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Impact Assessment</CardTitle>
            <CardDescription className="hidden sm:block">
              Numerical assessment of disaster impact on people and housing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberLivesLost">Lives Lost</Label>
                <Input
                  id="numberLivesLost"
                  type="number"
                  min="0"
                  {...register('numberLivesLost', { 
                    setValueAs: (value) => value === '' ? 0 : Number(value)
                  })}
                  disabled={disabled}
                />
                {errors.numberLivesLost && (
                  <p className="text-sm text-red-600">{errors.numberLivesLost.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberInjured">Injured</Label>
                <Input
                  id="numberInjured"
                  type="number"
                  min="0"
                  {...register('numberInjured', { 
                    setValueAs: (value) => value === '' ? 0 : Number(value)
                  })}
                  disabled={disabled}
                />
                {errors.numberInjured && (
                  <p className="text-sm text-red-600">{errors.numberInjured.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberDisplaced">Displaced</Label>
                <Input
                  id="numberDisplaced"
                  type="number"
                  min="0"
                  {...register('numberDisplaced', { 
                    setValueAs: (value) => value === '' ? 0 : Number(value)
                  })}
                  disabled={disabled}
                />
                {errors.numberDisplaced && (
                  <p className="text-sm text-red-600">{errors.numberDisplaced.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberHousesAffected">Houses Affected</Label>
                <Input
                  id="numberHousesAffected"
                  type="number"
                  min="0"
                  {...register('numberHousesAffected', { 
                    setValueAs: (value) => value === '' ? 0 : Number(value)
                  })}
                  disabled={disabled}
                />
                {errors.numberHousesAffected && (
                  <p className="text-sm text-red-600">{errors.numberHousesAffected.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Infrastructure Impact */}
        <Card>
          <CardHeader>
            <CardTitle>Infrastructure Impact</CardTitle>
            <CardDescription className="hidden sm:block">
              Description of affected infrastructure and facilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberSchoolsAffected">
                  Number of Schools Affected <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="numberSchoolsAffected"
                  type="number"
                  min="0"
                  {...register('numberSchoolsAffected', { 
                    setValueAs: (value) => value === '' ? 0 : Number(value)
                  })}
                  disabled={disabled}
                />
                {errors.numberSchoolsAffected && (
                  <p className="text-sm text-red-600">{errors.numberSchoolsAffected.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberMedicalFacilitiesAffected">
                  Number of Medical Facilities Affected <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="numberMedicalFacilitiesAffected"
                  type="number"
                  min="0"
                  {...register('numberMedicalFacilitiesAffected', { 
                    setValueAs: (value) => value === '' ? 0 : Number(value)
                  })}
                  disabled={disabled}
                />
                {errors.numberMedicalFacilitiesAffected && (
                  <p className="text-sm text-red-600">{errors.numberMedicalFacilitiesAffected.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolsAffected">Schools Affected (Details)</Label>
              <Textarea
                id="schoolsAffected"
                {...register('schoolsAffected')}
                disabled={disabled}
                placeholder="List affected schools and nature of damage (optional)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicalFacilitiesAffected">Medical Facilities Affected (Details)</Label>
              <Textarea
                id="medicalFacilitiesAffected"
                {...register('medicalFacilitiesAffected')}
                disabled={disabled}
                placeholder="List affected hospitals, clinics, and health centers (optional)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedAgriculturalLandsAffected">Agricultural Lands Affected (Hectares)</Label>
              <Input
                id="estimatedAgriculturalLandsAffected"
                type="number"
                min="0"
                step="0.1"
                {...register('estimatedAgriculturalLandsAffected', {
                  setValueAs: (value) => value === '' ? undefined : Number(value)
                })}
                disabled={disabled}
                placeholder="Enter hectares of affected agricultural land"
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="additionalDetails">Additional Information</Label>
              <Textarea
                id="additionalDetails"
                {...register('additionalDetails')}
                disabled={disabled}
                placeholder="Any other relevant information about the disaster"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Related Incident */}
        <Card>
          <CardHeader>
            <CardTitle>Related Incident</CardTitle>
            <CardDescription className="hidden sm:block">
              Select an existing incident if this assessment is related to one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="relatedIncident">Related Incident (Optional)</Label>
              <Select value={selectedIncidentId} onValueChange={setSelectedIncidentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an existing incident..." />
                </SelectTrigger>
                <SelectContent>
                  {availableIncidents.map((incident: Incident) => (
                    <SelectItem key={incident.id} value={incident.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{incident.type}{incident.location ? ` - ${incident.location}` : ''}</span>
                        {incident.description && (
                          <span className="text-sm text-muted-foreground">{incident.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Media Attachments
            </CardTitle>
            <CardDescription className="hidden sm:block">
              Attach photos related to the assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MediaField
              onPhotosChange={setMediaFiles}
              initialPhotos={mediaFiles}
              maxPhotos={5}
              maxFileSize={10}
            />
          </CardContent>
        </Card>

        </FormCard>
        <FormActionBar
          onCancel={onCancel}
          cancelLabel="Cancel"
          onSubmit={() => handleSubmit(handleFormSubmit)()}
          submitLabel={isLoading ? 'Submitting...' : 'Submit Assessment'}
          loading={isLoading}
          disabled={disabled || isLoading}
          align="between"
          variant="bordered"
          data-testid="preliminary-submit"
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={disabled || !isDirty}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
        </FormActionBar>
      </form>

      {/* Map Selector Dialog */}
      <Dialog open={showMapSelector} onOpenChange={setShowMapSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Incident Location on Map</DialogTitle>
            <DialogDescription>
              Click anywhere on the map to select coordinates for this incident location, or close to cancel.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <MapLocationSelector
              onLocationSelect={handleLocationSelect}
              initialCoordinates={{
                latitude: watchedCoordinates.lat || 11.8311,
                longitude: watchedCoordinates.lng || 13.1511
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}