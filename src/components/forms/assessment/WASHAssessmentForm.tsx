'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormCard } from '@/components/shared/FormCard'
import { FormActionBar } from '@/components/shared/FormActionBar'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GPSCapture } from '@/components/shared/GPSCapture'
import { MediaField } from '@/components/shared/MediaField'
import { EntitySelector } from '@/components/shared/EntitySelector'
import { IncidentSelector } from '@/components/shared/IncidentSelector'
import { WASHAssessmentFormProps, WASHAssessment } from '@/types/rapid-assessment'
import { getCurrentUserName, getAssessmentLocationData } from '@/utils/assessment-utils'
import { cn } from '@/lib/utils'
import { Droplets, AlertTriangle, Toilet, Waves } from '@/lib/icons'

const WASHAssessmentSchema = z.object({
  waterSource: z.array(z.string()).default([]),
  isWaterSufficient: z.boolean(),
  hasCleanWaterAccess: z.boolean(),
  functionalLatrinesAvailable: z.number().int().min(0),
  areLatrinesSufficient: z.boolean(),
  hasHandwashingFacilities: z.boolean(),
  hasOpenDefecationConcerns: z.boolean(),
  additionalWashDetails: z.string().optional()
})

type FormData = z.infer<typeof WASHAssessmentSchema>

interface WaterSourceOption {
  id: string
  label: string
  description: string
  icon?: any
}

const waterSourceOptions: WaterSourceOption[] = [
  {
    id: 'Borehole',
    label: 'Borehole',
    description: 'Groundwater extraction through borehole'
  },
  {
    id: 'River/Stream',
    label: 'River/Stream',
    description: 'Surface water from rivers or streams'
  },
  {
    id: 'Water trucks',
    label: 'Water Trucks',
    description: 'Trucked water supply'
  },
  {
    id: 'Tap water',
    label: 'Tap Water',
    description: 'Piped water supply system'
  },
  {
    id: 'Sachet water',
    label: 'Sachet Water',
    description: 'Commercially packaged water'
  },
  {
    id: 'Other',
    label: 'Other',
    description: 'Other water sources'
  }
]

export function WASHAssessmentForm({ 
  entityId, 
  incidentId,
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  disabled = false,
  onIncidentEntityChange
}: WASHAssessmentFormProps) {
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>((initialData as any)?.mediaAttachments || [])
  const [selectedEntity, setSelectedEntity] = useState<string>(entityId)
  const [selectedIncident, setSelectedIncident] = useState<string>(incidentId || '')
  const [selectedEntityData, setSelectedEntityData] = useState<any>(null)

  // Extract WASH data from initialData
  const washData = (initialData as any)?.washAssessment || (initialData as any);
  
  // Parse waterSource from JSON string if needed
  const parseWaterSource = (source: any): string[] => {
    if (Array.isArray(source)) return source;
    if (typeof source === 'string') {
      try {
        const parsed = JSON.parse(source);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Track when initialData changes and update form
  useEffect(() => {
    console.log('WASHAssessmentForm - initialData changed:', initialData);
    
    if (washData) {
      const newValues = {
        waterSource: parseWaterSource(washData?.waterSource),
        isWaterSufficient: washData?.isWaterSufficient || false,
        hasCleanWaterAccess: washData?.hasCleanWaterAccess || false,
        functionalLatrinesAvailable: washData?.functionalLatrinesAvailable || 0,
        areLatrinesSufficient: washData?.areLatrinesSufficient || false,
        hasHandwashingFacilities: washData?.hasHandwashingFacilities || false,
        hasOpenDefecationConcerns: washData?.hasOpenDefecationConcerns || false,
        additionalWashDetails: washData?.additionalWashDetails || ''
      };
      
      console.log('WASHAssessmentForm - updating form with values:', newValues);
      form.reset(newValues);
    }
  }, [initialData, washData]);

  // Handle incident and entity changes
  const handleIncidentChange = (incidentId: string) => {
    setSelectedIncident(incidentId);
    if (selectedEntity && onIncidentEntityChange) {
      onIncidentEntityChange(incidentId, selectedEntity);
    }
  };

  const handleEntityChange = (entityId: string) => {
    setSelectedEntity(entityId);
    if (selectedIncident && onIncidentEntityChange) {
      onIncidentEntityChange(selectedIncident, entityId);
    }
  };

  const form = useForm<FormData>({
    resolver: zodResolver(WASHAssessmentSchema),
    defaultValues: {
      waterSource: parseWaterSource(washData?.waterSource),
      isWaterSufficient: washData?.isWaterSufficient || false,
      hasCleanWaterAccess: washData?.hasCleanWaterAccess || false,
      functionalLatrinesAvailable: washData?.functionalLatrinesAvailable || 0,
      areLatrinesSufficient: washData?.areLatrinesSufficient || false,
      hasHandwashingFacilities: washData?.hasHandwashingFacilities || false,
      hasOpenDefecationConcerns: washData?.hasOpenDefecationConcerns || false,
      additionalWashDetails: washData?.additionalWashDetails || ''
    }
  })

  const watchedValues = form.watch()

  // Calculate WASH gaps and needs
  const gapFields = [
    { key: 'isWaterSufficient', label: 'Water Sufficiency' },
    { key: 'hasCleanWaterAccess', label: 'Clean Water Access' },
    { key: 'areLatrinesSufficient', label: 'Latrine Sufficiency' },
    { key: 'hasHandwashingFacilities', label: 'Handwashing Facilities' }
  ]

  const gaps = gapFields.filter(field => !watchedValues[field.key as keyof FormData])
  const gapCount = gaps.length

  // Legacy variables for compatibility with existing logic
  const waterGaps = !watchedValues.isWaterSufficient || !watchedValues.hasCleanWaterAccess
  const sanitationGaps = !watchedValues.areLatrinesSufficient || watchedValues.functionalLatrinesAvailable === 0
  const hygieneGaps = !watchedValues.hasHandwashingFacilities
  const hasWashGaps = gapCount > 0
  const hasDefecationIssues = watchedValues.hasOpenDefecationConcerns

  // Calculate latrine coverage (assuming 50 people per latrine as SPHERE standard)
  const estimatedPopulation = 1000 // This should come from entity data
  const latrineCoverage = watchedValues.functionalLatrinesAvailable > 0 
    ? Math.round((watchedValues.functionalLatrinesAvailable * 50) / estimatedPopulation * 100)
    : 0

  const handleSubmit = async (data: FormData) => {
    if (!selectedEntity) {
      return
    }
    
    if (!selectedIncident) {
      throw new Error('Please select an incident for this assessment')
    }

    const assessmentData = {
      type: 'WASH' as const,
      rapidAssessmentDate: new Date(),
      assessorName: getCurrentUserName(),
      entityId: selectedEntity,
      incidentId: selectedIncident,
      ...getAssessmentLocationData(
        selectedEntityData,
        gpsCoordinates ? {
          latitude: gpsCoordinates.lat,
          longitude: gpsCoordinates.lng
        } : undefined
      ),
      mediaAttachments: mediaFiles,
      washData: data
    }

    await onSubmit(assessmentData)
  }

  const handleWaterSourceChange = (sourceId: string, checked: boolean) => {
    const currentSources = form.getValues('waterSource')
    if (checked) {
      form.setValue('waterSource', [...currentSources, sourceId])
    } else {
      form.setValue('waterSource', currentSources.filter(id => id !== sourceId))
    }
  }

  return (
    <FormCard className="max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            WASH Assessment
            {gapCount > 0 && (
              <Badge variant="destructive">
                {gapCount} Gap{gapCount > 1 ? 's' : ''}
              </Badge>
            )}
            {hasDefecationIssues && (
              <Badge variant="destructive">
                Public Health Risk
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Assess water, sanitation, and hygiene (WASH) facilities and practices
          </CardDescription>
        </CardHeader>
        {gapCount > 0 && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Gaps Identified:</strong> {gaps.map(g => g.label).join(', ')}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          {/* Incident Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Incident Information</CardTitle>
              <CardDescription>
                Select the incident this assessment is related to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IncidentSelector
                value={selectedIncident}
                onValueChange={handleIncidentChange}
                disabled={disabled}
                required
              />
            </CardContent>
          </Card>

          {/* Entity Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Location</CardTitle>
              <CardDescription>
                Select the entity being assessed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EntitySelector
                value={selectedEntity}
                onValueChange={(entityId) => {
                  handleEntityChange(entityId)
                  // Reset entity data when selection changes
                  setSelectedEntityData(null)
                }}
                disabled={disabled}
                data-testid="entity-select"
              />
            </CardContent>
          </Card>

          {/* Water Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Water Sources</CardTitle>
              <CardDescription>
                Identify available water sources for the affected population
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {waterSourceOptions.map((source) => (
                  <FormField
                    key={source.id}
                    control={form.control}
                    name="waterSource"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value.includes(source.id)}
                            onCheckedChange={(checked) => handleWaterSourceChange(source.id, checked as boolean)}
                            disabled={disabled}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none flex-1">
                          <FormLabel>{source.label}</FormLabel>
                          <FormDescription className="text-xs">
                            {source.description}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Water Access */}
          <Card>
            <CardHeader>
              <CardTitle>Water Access and Availability</CardTitle>
              <CardDescription>
                Evaluate water access and sufficiency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isWaterSufficient"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Water Sufficient
                          <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
                        </FormLabel>
                        <FormDescription>
                          Water quantity is sufficient for basic needs
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasCleanWaterAccess"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Clean Water Access
                          <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
                        </FormLabel>
                        <FormDescription>
                          Population has access to safe drinking water
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sanitation Facilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Toilet className="h-5 w-5" />
                Sanitation Facilities
              </CardTitle>
              <CardDescription>
                Assess toilet and sanitation facilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="functionalLatrinesAvailable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Functional Latrines
                        <Badge variant="outline">{latrineCoverage}% coverage</Badge>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of functional latrines available
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="areLatrinesSufficient"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Latrines Sufficient
                          <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
                        </FormLabel>
                        <FormDescription>
                          Number of latrines is sufficient for population
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hasOpenDefecationConcerns"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 border-red-200">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2 text-red-600">
                          Open Defecation Concerns
                          {field.value && <StatusBadge domain="assessment" status="PUBLIC_HEALTH_RISK" label="Public Health Risk" />}
                        </FormLabel>
                        <FormDescription>
                          Open defecation practices observed (disease transmission risk)
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>

          {/* Hygiene Facilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5" />
                Hygiene Practices
              </CardTitle>
              <CardDescription>
                Assess handwashing and hygiene facilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="hasHandwashingFacilities"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        Handwashing Facilities Available
                        <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
                      </FormLabel>
                      <FormDescription>
                        Handwashing facilities with soap/water are available
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          {(hasWashGaps || hasDefecationIssues) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {waterGaps && (
                    <Alert variant="destructive">
                      <Droplets className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Water Security Risk:</strong> Insufficient or unsafe water access increases risk of waterborne diseases
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {sanitationGaps && (
                    <Alert variant="destructive">
                      <Toilet className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Sanitation Risk:</strong> Inadequate toilet facilities increases disease transmission risk
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {hygieneGaps && (
                    <Alert variant="destructive">
                      <Waves className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Hygiene Risk:</strong> Lack of handwashing facilities increases infection risk
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {hasDefecationIssues && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>High Public Health Risk:</strong> Open defecation practices create significant disease transmission risk. Immediate intervention required.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* GPS Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location Information</CardTitle>
            </CardHeader>
            <CardContent>
              <GPSCapture
                onLocationCapture={(lat, lng) => setGpsCoordinates({ lat, lng })}
                disabled={disabled}
                required={false}
              />
            </CardContent>
          </Card>

          {/* Media Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Photo Documentation</CardTitle>
              <CardDescription>
                Add photos of water sources, sanitation facilities, and hygiene stations
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

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
              <CardDescription>
                Any additional WASH-related information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="additionalWashDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Provide any additional WASH assessment details..."
                        className="min-h-[100px]"
                        {...field}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <FormActionBar
            onCancel={onCancel}
            submitLabel="Submit WASH Assessment"
            loading={isSubmitting}
            disabled={isSubmitting || disabled || !selectedEntity}
            variant="bordered"
          />
        </form>
      </Form>
    </FormCard>
  )
}