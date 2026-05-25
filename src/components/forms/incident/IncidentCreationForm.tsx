'use client'

import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormCard } from '@/components/shared/FormCard'
import { FormActionBar } from '@/components/shared/FormActionBar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { useIncident } from '@/hooks/useIncident'
import { IncidentSchema } from '@/lib/validation/incidents'
import { IncidentData } from '@/types/incidents'
import { AlertTriangle, MapPin, Loader2 } from '@/lib/icons'
import { getBadgeClasses } from '@/components/shared/StatusBadge'
import { apiGet, extractArray } from '@/lib/api'
import { z } from 'zod'

type FormData = z.infer<typeof IncidentSchema>

interface IncidentCreationFormProps {
  onSubmit?: (data: IncidentData) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<IncidentData>
  disabled?: boolean
  assessmentId?: string
  showAssessmentLink?: boolean
  autoSave?: boolean
  gpsEnabled?: boolean
}

const severityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' }
]

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CONTAINED', label: 'Contained' },
  { value: 'RESOLVED', label: 'Resolved' }
]

export function IncidentCreationForm({
  onSubmit,
  onCancel,
  initialData,
  disabled = false,
  assessmentId,
  showAssessmentLink = false,
  autoSave = false,
  gpsEnabled = false
}: IncidentCreationFormProps) {
  const { 
    createIncident, 
    createIncidentFromAssessment,
    incidentTypes, 
    isLoading, 
    error, 
    clearError 
  } = useIncident()

  const [customType, setCustomType] = useState('')
  const [showCustomType, setShowCustomType] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [gpsLocation, setGpsLocation] = useState<{lat: number, lng: number} | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [preliminaryAssessments, setPreliminaryAssessments] = useState<Array<{id: string, reportingLGA: string, reportingWard: string, reportingDate: string}>>([])
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('')
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const draftIdRef = useRef<string>(`draft-${Date.now()}`)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(IncidentSchema),
    defaultValues: {
      type: initialData?.type || '',
      subType: initialData?.subType || '',
      severity: initialData?.severity || 'MEDIUM',
      status: initialData?.status || 'ACTIVE',
      description: initialData?.description || '',
      location: initialData?.location || '',
      coordinates: initialData?.coordinates
    }
  })

  const selectedSeverity = watch('severity')
  const watchedValues = watch()

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave) return

    const saveDraft = () => {
      const draftData = {
        ...watchedValues,
        type: showCustomType ? customType : watchedValues.type,
        savedAt: new Date().toISOString()
      }
      
      localStorage.setItem(`incident-draft-${draftIdRef.current}`, JSON.stringify(draftData))
      setLastSaved(new Date())
      setIsDraft(true)
    }

    // Save draft immediately when form changes
    const saveTimer = setTimeout(saveDraft, 2000)
    
    // Set up auto-save interval
    if (!autoSaveIntervalRef.current) {
      autoSaveIntervalRef.current = setInterval(saveDraft, 30000)
    }

    return () => {
      clearTimeout(saveTimer)
    }
  }, [watchedValues, showCustomType, customType, autoSave])

  // Load draft on mount
  useEffect(() => {
    if (!autoSave) return
    
    const savedDraft = localStorage.getItem(`incident-draft-${draftIdRef.current}`)
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        Object.entries(draft).forEach(([key, value]) => {
          if (key !== 'savedAt') {
            setValue(key as any, value)
          }
        })
        setLastSaved(new Date(draft.savedAt))
        setIsDraft(true)
      } catch (error) {
        console.warn('Failed to load draft:', error)
      }
    }
  }, [autoSave, setValue])

  // Fetch available preliminary assessments
  useEffect(() => {
    const fetchPreliminaryAssessments = async () => {
      try {
        const result = await apiGet('/api/v1/preliminary-assessments')
        if (result.success) {
          const data = extractArray(result.data as any)
          const unlinkedAssessments = data.filter((assessment: any) => !assessment.incidentId)
          setPreliminaryAssessments(unlinkedAssessments)
        }
      } catch (error) {
        console.error('Failed to fetch preliminary assessments:', error)
      }
    }
    
    fetchPreliminaryAssessments()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current)
        autoSaveIntervalRef.current = null
      }
    }
  }, [])

  const handleFormSubmit = async (data: FormData) => {
    try {
      clearError()
      
      // Use custom type if selected and include GPS coordinates
      const incidentData = {
        ...data,
        type: showCustomType ? customType : data.type,
        coordinates: gpsLocation || data.coordinates,
        preliminaryAssessmentId: selectedAssessmentId || undefined
      }

      if (assessmentId) {
        await createIncidentFromAssessment(assessmentId, incidentData)
      } else {
        await createIncident({ data: incidentData })
      }
      
      // Clear draft and reset form after successful submission
      if (autoSave) {
        localStorage.removeItem(`incident-draft-${draftIdRef.current}`)
      }
      
      // Call the onSubmit callback if provided (will close the modal)
      if (onSubmit) {
        await onSubmit(incidentData)
      } else {
        onCancel?.()
      }
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleTypeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomType(true)
      setValue('type', '')
    } else {
      setShowCustomType(false)
      setValue('type', value)
    }
  }

  const handleGetLocation = async () => {
    if (!gpsEnabled || !navigator.geolocation) {
      alert('GPS is not available or not enabled')
      return
    }

    setIsGettingLocation(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })

      const { latitude, longitude } = position.coords
      setGpsLocation({ lat: latitude, lng: longitude })
      setValue('coordinates', { lat: latitude, lng: longitude })
    } catch (error) {
      console.error('GPS Error:', error)
      alert('Failed to get GPS location. Please check your location permissions.')
    } finally {
      setIsGettingLocation(false)
    }
  }

  return (
    <FormCard
      title="Create New Incident"
      description={`Create a new incident record for disaster response coordination${autoSave ? ' • Auto-save enabled' : ''}`}
      variant="default"
      className="w-full max-w-2xl"
    >
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {(error as any)?.message || String(error)}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {/* Draft indicator */}
          {isDraft && (
            <div className="flex items-center gap-2 text-xs text-blue-800 bg-blue-50 px-3 py-2 rounded-md">
              <span className="bg-blue-100 px-2 py-0.5 rounded font-medium">
                Draft (Auto-saved: {lastSaved?.toLocaleTimeString()})
              </span>
              {showAssessmentLink && assessmentId && (
                <span className="text-muted-foreground">(from assessment)</span>
              )}
            </div>
          )}
          {/* Incident Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incidentType">
                Incident Type <span className="text-red-500">*</span>
              </Label>
              <Select onValueChange={handleTypeChange} disabled={disabled}>
                <SelectTrigger>
                  <SelectValue placeholder="Select incident type" />
                </SelectTrigger>
                <SelectContent>
                  {incidentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Type...</SelectItem>
                </SelectContent>
              </Select>
              
              {showCustomType && (
                <Input
                  placeholder="Enter custom incident type"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  disabled={disabled}
                />
              )}
              
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subType">Sub-Type</Label>
              <Input
                id="subType"
                {...register('subType')}
                disabled={disabled}
                placeholder="e.g., Flash flood, House fire"
              />
            </div>
          </div>

          {/* Severity and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">
                Severity <span className="text-red-500">*</span>
              </Label>
              <Select 
                onValueChange={(value) => setValue('severity', value as any)} 
                defaultValue="MEDIUM"
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded text-xs ${getBadgeClasses('severity', option.value)}`}>
                          {option.label}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.severity && (
                <p className="text-sm text-red-600">{errors.severity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                onValueChange={(value) => setValue('status', value as any)} 
                defaultValue="ACTIVE"
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Link to Preliminary Assessment (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="preliminaryAssessment">
              Link to Preliminary Assessment <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Select 
              value={selectedAssessmentId} 
              onValueChange={setSelectedAssessmentId}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an existing assessment to link (optional)" />
              </SelectTrigger>
              <SelectContent>
                {preliminaryAssessments.map((assessment) => (
                  <SelectItem key={assessment.id} value={assessment.id}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">
                        {assessment.reportingLGA}, {assessment.reportingWard}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(assessment.reportingDate).toLocaleDateString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              You can link this incident to an existing preliminary assessment for better data integration
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">
              Location <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="location"
                {...register('location')}
                disabled={disabled}
                placeholder="e.g., Lagos Island, Lagos State"
                className="flex-1"
              />
              {gpsEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGetLocation}
                  disabled={disabled || isGettingLocation}
                  title={gpsLocation ? "GPS coordinates captured" : "Get GPS location"}
                  className={gpsLocation ? "bg-green-50 border-green-200" : ""}
                >
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {errors.location && (
              <p className="text-sm text-red-600">{errors.location.message}</p>
            )}
            {gpsLocation && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                GPS: {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
              </p>
            )}
            {gpsEnabled && !gpsLocation && (
              <p className="text-xs text-muted-foreground">
                GPS capture enabled - click the location pin to get coordinates
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              disabled={disabled}
              placeholder="Detailed description of the incident..."
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Severity Warning */}
          {selectedSeverity === 'CRITICAL' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Critical Incident:</strong> This incident will be flagged for immediate attention 
                and will trigger emergency response protocols.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <FormActionBar
            onCancel={onCancel}
            submitLabel={isLoading ? 'Creating...' : 'Create Incident'}
            loading={isLoading}
            disabled={disabled || (!showCustomType && !watch('type')) || (showCustomType && !customType)}
            variant="bordered"
          />
        </form>
    </FormCard>
  )
}