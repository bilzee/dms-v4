'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormActionBar } from '@/components/shared/FormActionBar'
import { TagPillSelect } from '@/components/shared/TagPillSelect'
import { StickyFormHeader } from '@/components/shared/StickyFormHeader'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GPSCapture } from '@/components/shared/GPSCapture'
import { MediaField } from '@/components/shared/MediaField'
import { EntitySelector } from '@/components/shared/EntitySelector'
import { IncidentSelector } from '@/components/shared/IncidentSelector'
import { HealthAssessmentFormProps, HealthAssessment } from '@/types/rapid-assessment'
import { getCurrentUserName, getAssessmentLocationData } from '@/utils/assessment-utils'
import { cn } from '@/lib/utils'
import { Hospital, Activity, Pill, Baby, AlertTriangle } from '@/lib/icons'

const HealthAssessmentSchema = z.object({
  hasFunctionalClinic: z.boolean(),
  hasEmergencyServices: z.boolean(),
  numberHealthFacilities: z.number().int().min(0),
  healthFacilityType: z.string().min(1, 'Health facility type is required'),
  qualifiedHealthWorkers: z.number().int().min(0),
  hasTrainedStaff: z.boolean(),
  hasMedicineSupply: z.boolean(),
  hasMedicalSupplies: z.boolean(),
  hasMaternalChildServices: z.boolean(),
  commonHealthIssues: z.array(z.string()).default([]),
  additionalHealthDetails: z.string().optional()
})

type FormData = z.infer<typeof HealthAssessmentSchema>

interface HealthIssueOption {
  id: string
  label: string
  description: string
  icon: any
}

const healthIssueOptions: HealthIssueOption[] = [
  {
    id: 'Diarrhea',
    label: 'Diarrhea',
    description: 'Cases of acute watery diarrhea',
    icon: Activity
  },
  {
    id: 'Malaria',
    label: 'Malaria',
    description: 'Malaria cases and fever outbreaks',
    icon: Activity
  },
  {
    id: 'Respiratory',
    label: 'Respiratory Infections',
    description: 'Acute respiratory infections',
    icon: Activity
  },
  {
    id: 'Malnutrition',
    label: 'Malnutrition',
    description: 'Severe acute malnutrition cases',
    icon: AlertTriangle
  },
  {
    id: 'Other',
    label: 'Other',
    description: 'Other health concerns',
    icon: Activity
  }
]

const facilityTypes = [
  'Hospital',
  'Primary Health Center',
  'Clinic',
  'Dispensary',
  'Mobile Clinic',
  'Community Health Post',
  'Other'
]

export function HealthAssessmentForm({ 
  entityId, 
  incidentId,
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  disabled = false,
  onIncidentEntityChange,
  lockIncidentEntity = false,
  isReassessment = false,
  previousAssessmentDate
}: HealthAssessmentFormProps) {
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>((initialData as any)?.mediaAttachments || [])
  const [selectedEntity, setSelectedEntity] = useState<string>(entityId)
  const [selectedIncident, setSelectedIncident] = useState<string>(incidentId || (initialData as any)?.rapidAssessment?.incidentId || '')
  const [selectedEntityData, setSelectedEntityData] = useState<any>(null)
  const [hasInteracted, setHasInteracted] = useState(isReassessment)

  const healthData = (initialData as any)?.healthAssessment || (initialData as any);

  useEffect(() => {
    if (healthData) {
      const newValues = {
        hasFunctionalClinic: healthData?.hasFunctionalClinic || false,
        hasEmergencyServices: healthData?.hasEmergencyServices || false,
        numberHealthFacilities: healthData?.numberHealthFacilities || 0,
        healthFacilityType: healthData?.healthFacilityType || '',
        qualifiedHealthWorkers: healthData?.qualifiedHealthWorkers || 0,
        hasTrainedStaff: healthData?.hasTrainedStaff || false,
        hasMedicineSupply: healthData?.hasMedicineSupply || false,
        hasMedicalSupplies: healthData?.hasMedicalSupplies || false,
        hasMaternalChildServices: healthData?.hasMaternalChildServices || false,
        commonHealthIssues: parseHealthIssues(healthData?.commonHealthIssues),
        additionalHealthDetails: healthData?.additionalHealthDetails || ''
      };

      form.reset(newValues);
    }
  }, [initialData, healthData]);
  
  // Parse commonHealthIssues from JSON string if needed
  const parseHealthIssues = (issues: any): string[] => {
    if (Array.isArray(issues)) return issues;
    if (typeof issues === 'string') {
      try {
        const parsed = JSON.parse(issues);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const form = useForm<FormData>({
    resolver: zodResolver(HealthAssessmentSchema),
    defaultValues: {
      hasFunctionalClinic: healthData?.hasFunctionalClinic || false,
      hasEmergencyServices: healthData?.hasEmergencyServices || false,
      numberHealthFacilities: healthData?.numberHealthFacilities || 0,
      healthFacilityType: healthData?.healthFacilityType || '',
      qualifiedHealthWorkers: healthData?.qualifiedHealthWorkers || 0,
      hasTrainedStaff: healthData?.hasTrainedStaff || false,
      hasMedicineSupply: healthData?.hasMedicineSupply || false,
      hasMedicalSupplies: healthData?.hasMedicalSupplies || false,
      hasMaternalChildServices: healthData?.hasMaternalChildServices || false,
      commonHealthIssues: parseHealthIssues(healthData?.commonHealthIssues),
      additionalHealthDetails: healthData?.additionalHealthDetails || ''
    }
  })

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

  const watchedBooleans = useWatch({ control: form.control, name: ['hasFunctionalClinic', 'hasEmergencyServices', 'hasTrainedStaff', 'hasMedicineSupply', 'hasMedicalSupplies', 'hasMaternalChildServices'] })
  const watchedValues = Object.fromEntries(
    ['hasFunctionalClinic', 'hasEmergencyServices', 'hasTrainedStaff', 'hasMedicineSupply', 'hasMedicalSupplies', 'hasMaternalChildServices'].map((name, i) => [name, watchedBooleans[i]])
  ) as any

  // Calculate gap analysis
  const gapFields = [
    { key: 'hasFunctionalClinic', label: 'Functional Clinic' },
    { key: 'hasEmergencyServices', label: 'Emergency Services' },
    { key: 'hasTrainedStaff', label: 'Trained Staff' },
    { key: 'hasMedicineSupply', label: 'Medicine Supply' },
    { key: 'hasMedicalSupplies', label: 'Medical Supplies' },
    { key: 'hasMaternalChildServices', label: 'Maternal/Child Services' }
  ]

  const gaps = gapFields.filter(field => !watchedValues[field.key as keyof FormData])
  const gapCount = gaps.length

  const handleSubmit = async (data: FormData) => {
    if (!selectedEntity) {
      return
    }
    
    if (!selectedIncident) {
      throw new Error('Please select an incident for this assessment')
    }

    // Get current user name from auth context
    const currentUserName = getCurrentUserName()
    
    // Get location data from entity or GPS
    const locationData = getAssessmentLocationData(
      selectedEntityData,
      gpsCoordinates ? {
        latitude: gpsCoordinates.lat,
        longitude: gpsCoordinates.lng
      } : undefined
    )

    const assessmentData = {
      type: 'HEALTH' as const,
      rapidAssessmentDate: new Date(),
      assessorName: currentUserName,
      entityId: selectedEntity,
      incidentId: selectedIncident,
      ...locationData,
      mediaAttachments: mediaFiles,
      healthData: data
    }

    await onSubmit(assessmentData)
  }

  const markInteracted = useCallback(() => {
    if (!hasInteracted) setHasInteracted(true)
  }, [hasInteracted])

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="health-assessment-form">
      {/* Gap Analysis Summary */}
      <StickyFormHeader
        icon={<Hospital className="h-5 w-5" />}
        title="Health Assessment"
        description="Assess healthcare facilities, services, and common health issues in the affected area"
        gapCount={gapCount}
        gapLabels={gaps.map(g => g.label)}
        hasInteracted={hasInteracted}
        isReassessment={isReassessment}
        previousAssessmentDate={previousAssessmentDate}
      />

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
                onValueChange={handleEntityChange}
                disabled={disabled || (lockIncidentEntity && !!selectedEntity)}
                data-testid="entity-select"
              />
            </CardContent>
          </Card>

          {/* Gap Assessment — Healthcare Facilities */}
          <Card className="bg-sky-50/50 dark:bg-sky-950/20">
            <CardHeader>
              <CardTitle>Healthcare Facilities</CardTitle>
              <CardDescription>
                Evaluate the availability and functionality of healthcare facilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hasFunctionalClinic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                          data-testid="has-functional-clinic"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Functional Clinic
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          At least one functional healthcare facility exists
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasEmergencyServices"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                          data-testid="has-emergency-services"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Emergency Services
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          Emergency medical services are available
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Context — Healthcare Facility Details */}
          <Card>
            <CardHeader>
              <CardTitle>Facility Details</CardTitle>
              <CardDescription>
                Provide details about healthcare facilities in the area
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numberHealthFacilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Health Facilities</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          data-testid="number-health-facilities"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormDescription>
                        Total number of healthcare facilities in the area
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qualifiedHealthWorkers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualified Health Workers</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          data-testid="qualified-health-workers"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of qualified healthcare workers available
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="healthFacilityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Facility Type</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={disabled}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="health-facility-type">
                            <SelectValue placeholder="Select facility type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {facilityTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormDescription>
                      Main type of healthcare facility available
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Gap Assessment — Services and Supplies */}
          <Card className="bg-sky-50/50 dark:bg-sky-950/20">
            <CardHeader>
              <CardTitle>Services and Supplies</CardTitle>
              <CardDescription>
                Assess available medical services and supplies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hasTrainedStaff"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                          data-testid="has-trained-staff"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Trained Staff
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          Sufficient trained medical staff available
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasMedicineSupply"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                          data-testid="has-medicine-supply"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Medicine Supply
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          Essential medicines are available
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasMedicalSupplies"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                          data-testid="has-medical-supplies"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Medical Supplies
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          Medical equipment and supplies available
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasMaternalChildServices"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                          data-testid="has-maternal-child-services"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Maternal & Child Services
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          Maternal and child health services available
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Common Health Issues */}
          <Card>
            <CardHeader>
              <CardTitle>Common Health Issues</CardTitle>
              <CardDescription>
                Select the most common health issues observed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagPillSelect
                options={healthIssueOptions.map(issue => ({ id: issue.id, label: issue.label, description: issue.description }))}
                selected={form.watch('commonHealthIssues')}
                onChange={(selected) => form.setValue('commonHealthIssues', selected)}
                disabled={disabled}
              />
            </CardContent>
          </Card>

          {hasInteracted && gapCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gaps.map((gap) => (
                    <div key={gap.key} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border" role="status">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">{gap.label} Gap</p>
                        <p className="text-xs text-muted-foreground">{gap.label} services are not available or insufficient</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* GPS Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location Information</CardTitle>
              <CardDescription>
                Capture GPS coordinates of the assessment location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GPSCapture
                onLocationCapture={(lat, lng) => setGpsCoordinates({ lat, lng })}
                disabled={disabled}
                required={false}
                data-testid="capture-gps-button"
              />
            </CardContent>
          </Card>

          {/* Media Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Photo Documentation</CardTitle>
              <CardDescription>
                Add photos of healthcare facilities and conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MediaField
                onPhotosChange={setMediaFiles}
                initialPhotos={mediaFiles}
                maxPhotos={5}
                maxFileSize={10}
                data-testid="photo-upload"
              />
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
              <CardDescription>
                Any additional health-related information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="additionalHealthDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Provide any additional health assessment details..."
                        className="min-h-[100px]"
                        data-testid="additional-details"
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
            submitLabel="Submit Health Assessment"
            loading={isSubmitting}
            disabled={isSubmitting || disabled || !selectedEntity}
            variant="bordered"
            data-testid="health-submit"
          />
        </form>
      </Form>
    </div>
  )
}