'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ShelterAssessmentFormProps, ShelterAssessment } from '@/types/rapid-assessment'
import { cn } from '@/lib/utils'
import { getCurrentUserName, getAssessmentLocationData } from '@/utils/assessment-utils'
import { Home, AlertTriangle, Cloud, Users } from '@/lib/icons'

const ShelterAssessmentSchema = z.object({
  areSheltersSufficient: z.boolean(),
  hasSafeStructures: z.boolean(),
  shelterTypes: z.array(z.string()).default([]),
  requiredShelterType: z.array(z.string()).default([]),
  numberSheltersRequired: z.number().int().min(0),
  areOvercrowded: z.boolean(),
  provideWeatherProtection: z.boolean(),
  additionalShelterDetails: z.string().optional()
})

type FormData = z.infer<typeof ShelterAssessmentSchema>

interface ShelterTypeOption {
  id: string
  label: string
  description: string
}

const shelterTypeOptions: ShelterTypeOption[] = [
  {
    id: 'Trampoline',
    label: 'Trampoline/Tent',
    description: 'Emergency tents or temporary structures'
  },
  {
    id: 'Open space',
    label: 'Open Space',
    description: 'Designated open areas for temporary shelter'
  },
  {
    id: 'Local materials',
    label: 'Local Materials',
    description: 'Shelters built with locally available materials'
  },
  {
    id: 'Communal structure',
    label: 'Communal Structures',
    description: 'Public buildings used as shelters'
  },
  {
    id: 'Other',
    label: 'Other',
    description: 'Other types of shelter arrangements'
  }
]

export function ShelterAssessmentForm({ 
  entityId, 
  incidentId,
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  disabled = false,
  onIncidentEntityChange,
  lockIncidentEntity = false
}: ShelterAssessmentFormProps) {
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>((initialData as any)?.mediaAttachments || [])
  const [selectedEntity, setSelectedEntity] = useState<string>(entityId)
  const [selectedIncident, setSelectedIncident] = useState<string>(incidentId || '')
  const [selectedEntityData, setSelectedEntityData] = useState<any>(null)
  const [hasInteracted, setHasInteracted] = useState(false)

  // Extract shelter data from initialData
  const shelterData = (initialData as any)?.shelterAssessment || (initialData as any);
  
  // Parse array fields from JSON string if needed
  const parseArrayField = (field: any): string[] => {
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Track when initialData changes and update form
  useEffect(() => {
    if (shelterData) {
      const newValues = {
        areSheltersSufficient: shelterData?.areSheltersSufficient || false,
        hasSafeStructures: shelterData?.hasSafeStructures || false,
        shelterTypes: parseArrayField(shelterData?.shelterTypes),
        requiredShelterType: parseArrayField(shelterData?.requiredShelterType),
        numberSheltersRequired: shelterData?.numberSheltersRequired || 0,
        areOvercrowded: shelterData?.areOvercrowded || false,
        provideWeatherProtection: shelterData?.provideWeatherProtection || false,
        additionalShelterDetails: shelterData?.additionalShelterDetails || ''
      };
      
      form.reset(newValues);
    }
  }, [initialData, shelterData]);

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

  const markInteracted = useCallback(() => {
    if (!hasInteracted) setHasInteracted(true)
  }, [hasInteracted])

  const form = useForm<FormData>({
    resolver: zodResolver(ShelterAssessmentSchema),
    defaultValues: {
      areSheltersSufficient: shelterData?.areSheltersSufficient || false,
      hasSafeStructures: shelterData?.hasSafeStructures || false,
      shelterTypes: parseArrayField(shelterData?.shelterTypes),
      requiredShelterType: parseArrayField(shelterData?.requiredShelterType),
      numberSheltersRequired: shelterData?.numberSheltersRequired || 0,
      areOvercrowded: shelterData?.areOvercrowded || false,
      provideWeatherProtection: shelterData?.provideWeatherProtection || false,
      additionalShelterDetails: shelterData?.additionalShelterDetails || ''
    }
  })

  const [areSheltersSufficient, hasSafeStructures, provideWeatherProtection, areOvercrowded, numberSheltersRequired] = useWatch({
    control: form.control,
    name: ['areSheltersSufficient', 'hasSafeStructures', 'provideWeatherProtection', 'areOvercrowded', 'numberSheltersRequired'] as const
  })
  const watchedValues = { areSheltersSufficient, hasSafeStructures, provideWeatherProtection, areOvercrowded, numberSheltersRequired } as any

  // Calculate shelter gaps and risks
  const gapFields = [
    { key: 'areSheltersSufficient', label: 'Shelter Sufficiency' },
    { key: 'hasSafeStructures', label: 'Safe Structures' },
    { key: 'provideWeatherProtection', label: 'Weather Protection' }
  ]

  const gaps = gapFields.filter(field => !watchedValues[field.key as keyof FormData])
  const gapCount = gaps.length

  const shelterGaps = gapCount > 0
  const overcrowdingRisk = watchedValues.areOvercrowded
  const urgentShelterNeed = watchedValues.numberSheltersRequired > 0
  const hasShelterRisks = shelterGaps || overcrowdingRisk

  const handleSubmit = async (data: FormData) => {
    if (!selectedEntity) {
      return
    }
    
    if (!selectedIncident) {
      throw new Error('Please select an incident for this assessment')
    }

    const assessmentData = {
      type: 'SHELTER' as const,
      rapidAssessmentDate: new Date(),
      assessorName: getCurrentUserName(),
      entityId: selectedEntity,
      incidentId: selectedIncident,
      ...getAssessmentLocationData(selectedEntityData, gpsCoordinates ? { latitude: gpsCoordinates.lat, longitude: gpsCoordinates.lng } : undefined),
      mediaAttachments: mediaFiles,
      shelterData: data
    }

    await onSubmit(assessmentData)
  }

  const handleShelterTypeChange = (typeId: string, isCurrent: boolean) => {
    const currentTypes = form.getValues(isCurrent ? 'shelterTypes' : 'requiredShelterType')
    if (isCurrent) {
      form.setValue('shelterTypes', currentTypes.includes(typeId) 
        ? currentTypes.filter(id => id !== typeId)
        : [...currentTypes, typeId]
      )
    } else {
      form.setValue('requiredShelterType', currentTypes.includes(typeId)
        ? currentTypes.filter(id => id !== typeId)
        : [...currentTypes, typeId]
      )
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="shelter-assessment-form">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Shelter Assessment
            {hasInteracted && gapCount > 0 && (
              <Badge variant="destructive">
                {gapCount} Gap{gapCount > 1 ? 's' : ''}
              </Badge>
            )}
            {urgentShelterNeed && (
              <Badge variant="destructive">
                Urgent Need ({watchedValues.numberSheltersRequired})
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Assess shelter conditions, capacity, and protection from elements
          </CardDescription>
        </CardHeader>
        {hasInteracted && gapCount > 0 && (
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
                disabled={disabled || (lockIncidentEntity && !!selectedIncident)}
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
                onValueChange={(value) => {
                  handleEntityChange(value)
                  setSelectedEntityData(null)
                }}
                disabled={disabled || (lockIncidentEntity && !!selectedEntity)}
              />
            </CardContent>
          </Card>

          {/* Shelter Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Shelter Availability & Safety</CardTitle>
              <CardDescription>
                Evaluate current shelter conditions and safety
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="areSheltersSufficient"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Shelters Sufficient
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          Available shelters are sufficient for the affected population
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasSafeStructures"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Safe Structures
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          Existing shelters are structurally safe and secure
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provideWeatherProtection"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Cloud className="h-4 w-4" />
                          Weather Protection
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          Shelters provide adequate protection from weather elements
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="areOvercrowded"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Overcrowding Issues
                          {!hasInteracted ? null : field.value && <StatusBadge domain="assessment" status="PUBLIC_HEALTH_RISK" label="Health Risk" />}
                        </FormLabel>
                        <FormDescription>
                          Shelters are overcrowded beyond safe capacity
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Current Shelter Types */}
          <Card>
            <CardHeader>
              <CardTitle>Current Shelter Types</CardTitle>
              <CardDescription>
                Select the types of shelters currently available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4"><legend className="sr-only">Current Shelter Types</legend>
                {shelterTypeOptions.map((type) => (
                  <FormField
                    key={type.id}
                    control={form.control}
                    name="shelterTypes"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value.includes(type.id)}
                            onCheckedChange={() => handleShelterTypeChange(type.id, true)}
                            disabled={disabled}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none flex-1">
                          <FormLabel>Currently Available</FormLabel>
                          <div className="font-medium">{type.label}</div>
                          <FormDescription className="text-xs">
                            {type.description}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </fieldset>
            </CardContent>
          </Card>

          {/* Required Shelter Types */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Shelter Requirements</CardTitle>
              <CardDescription>
                Select the types of shelters urgently needed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4"><legend className="sr-only">Required Shelter Types</legend>
                {shelterTypeOptions.map((type) => (
                  <FormField
                    key={type.id}
                    control={form.control}
                    name="requiredShelterType"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value.includes(type.id)}
                            onCheckedChange={() => handleShelterTypeChange(type.id, false)}
                            disabled={disabled}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none flex-1">
                          <FormLabel>Urgently Needed</FormLabel>
                          <div className="font-medium">{type.label}</div>
                          <FormDescription className="text-xs">
                            {type.description}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </fieldset>

              <FormField
                control={form.control}
                name="numberSheltersRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Number of Shelters Required
                      {field.value > 0 && (
                        <Badge variant="destructive">{field.value} needed</Badge>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={disabled}
                        className={cn(
                          field.value > 0 && "border-red-200 focus:border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormDescription>
                      Estimated number of additional shelters needed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          {hasInteracted && hasShelterRisks && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shelterGaps && (
                    <div key="shelter-gaps" className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border" role="status">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">Inadequate Shelter Gap</p>
                        <p className="text-xs text-muted-foreground">Insufficient, unsafe, or exposed shelters increase health and safety risks</p>
                      </div>
                    </div>
                  )}
                  
                  {overcrowdingRisk && (
                    <div key="overcrowding" className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border" role="status">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">Overcrowding Risk Gap</p>
                        <p className="text-xs text-muted-foreground">Overcrowded conditions increase disease transmission and safety risks</p>
                      </div>
                    </div>
                  )}

                  {urgentShelterNeed && (
                    <div key="urgent-need" className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border" role="status">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">Urgent Shelter Need Gap</p>
                        <p className="text-xs text-muted-foreground">{watchedValues.numberSheltersRequired} additional shelters required. Immediate intervention needed.</p>
                      </div>
                    </div>
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
                Add photos of shelter conditions, facilities, and affected areas
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
                Any additional shelter-related information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="additionalShelterDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Provide any additional shelter assessment details..."
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
            submitLabel="Submit Shelter Assessment"
            loading={isSubmitting}
            disabled={isSubmitting || disabled || !selectedEntity}
            variant="bordered"
            data-testid="shelter-submit"
          />
        </form>
      </Form>
    </div>
  )
}