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
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  onIncidentEntityChange
}: HealthAssessmentFormProps) {
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>((initialData as any)?.mediaAttachments || [])
  const [selectedEntity, setSelectedEntity] = useState<string>(entityId)
  const [selectedIncident, setSelectedIncident] = useState<string>(incidentId || (initialData as any)?.rapidAssessment?.incidentId || '')
  const [selectedEntityData, setSelectedEntityData] = useState<any>(null)

  // Extract health data from initialData
  const healthData = (initialData as any)?.healthAssessment || (initialData as any);
  
  // Debug logging
  console.log('HealthAssessmentForm - initialData:', initialData);
  console.log('HealthAssessmentForm - healthData:', healthData);
  
  // Track when initialData changes and update form
  useEffect(() => {
    console.log('HealthAssessmentForm - initialData changed:', initialData);
    
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
      
      console.log('HealthAssessmentForm - updating form with values:', newValues);
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

  const watchedValues = form.watch()

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

  const handleHealthIssueChange = (issueId: string, checked: boolean) => {
    const currentIssues = form.getValues('commonHealthIssues')
    if (checked) {
      form.setValue('commonHealthIssues', [...currentIssues, issueId])
    } else {
      form.setValue('commonHealthIssues', currentIssues.filter(id => id !== issueId))
    }
  }

  return (
    <FormCard className="max-w-4xl mx-auto" data-testid="health-assessment-form">
      {/* Gap Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hospital className="h-5 w-5" />
            Health Assessment
            {gapCount > 0 && (
              <Badge variant="destructive">
                {gapCount} Gap{gapCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Assess healthcare facilities, services, and common health issues in the affected area
          </CardDescription>
        </CardHeader>
        {gapCount > 0 && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription data-testid="gap-summary">
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
                onValueChange={handleEntityChange}
                disabled={disabled}
                data-testid="entity-select"
              />
            </CardContent>
          </Card>

          {/* Healthcare Facilities Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Healthcare Facilities</CardTitle>
              <CardDescription>
                Evaluate the availability and functionality of healthcare facilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Boolean Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hasFunctionalClinic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                          data-testid="has-functional-clinic"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Functional Clinic
                          <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                          data-testid="has-emergency-services"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Emergency Services
                          <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
                        </FormLabel>
                        <FormDescription>
                          Emergency medical services are available
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Quantitative Data */}
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
                    <FormControl>
                      <select
                        {...field}
                        disabled={disabled}
                        data-testid="health-facility-type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select facility type</option>
                        {facilityTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormDescription>
                      Main type of healthcare facility available
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Services and Supplies */}
          <Card>
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                          data-testid="has-trained-staff"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Trained Staff
                          <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                          data-testid="has-medicine-supply"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Medicine Supply
                          <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                          data-testid="has-medical-supplies"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Medical Supplies
                          <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                          data-testid="has-maternal-child-services"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Maternal & Child Services
                          <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthIssueOptions.map((issue) => {
                  const Icon = issue.icon
                  const isSelected = form.watch('commonHealthIssues').includes(issue.id)
                  
                  return (
                    <FormField
                      key={issue.id}
                      control={form.control}
                      name="commonHealthIssues"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleHealthIssueChange(issue.id, checked as boolean)}
                              disabled={disabled}
                              data-testid={`health-issue-${issue.id.toLowerCase()}`}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none flex-1">
                            <FormLabel className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {issue.label}
                            </FormLabel>
                            <FormDescription className="text-xs">
                              {issue.description}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          {gapCount > 0 && (
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
                    <Alert key={gap.key} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{gap.label} Gap:</strong> {gap.label} services are not available or insufficient
                      </AlertDescription>
                    </Alert>
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
          />
        </form>
      </Form>
    </FormCard>
  )
}