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
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GPSCapture } from '@/components/shared/GPSCapture'
import { MediaField } from '@/components/shared/MediaField'
import { EntitySelector } from '@/components/shared/EntitySelector'
import { IncidentSelector } from '@/components/shared/IncidentSelector'
import { FoodAssessmentFormProps, FoodAssessment } from '@/types/rapid-assessment'
import { getCurrentUserName, getAssessmentLocationData } from '@/utils/assessment-utils'
import { cn } from '@/lib/utils'
import { Utensils, AlertTriangle, Package, Clock } from '@/lib/icons'

const FoodAssessmentSchema = z.object({
  isFoodSufficient: z.boolean(),
  hasRegularMealAccess: z.boolean(),
  hasInfantNutrition: z.boolean(),
  foodSource: z.array(z.string()).default([]),
  availableFoodDurationDays: z.number().int().min(0),
  additionalFoodRequiredPersons: z.number().int().min(0),
  additionalFoodRequiredHouseholds: z.number().int().min(0),
  additionalFoodDetails: z.string().optional()
})

type FormData = z.infer<typeof FoodAssessmentSchema>

interface FoodSourceOption {
  id: string
  label: string
  description: string
}

const foodSourceOptions: FoodSourceOption[] = [
  {
    id: 'Government kitchen',
    label: 'Government Kitchen',
    description: 'Government-supported food distribution'
  },
  {
    id: 'Humanitarian Partners',
    label: 'Humanitarian Partners',
    description: 'NGO and international aid organizations'
  },
  {
    id: 'Community',
    label: 'Community Support',
    description: 'Community-based food sharing initiatives'
  },
  {
    id: 'Individuals',
    label: 'Individual Resources',
    description: 'Personal food stocks and resources'
  },
  {
    id: 'Other',
    label: 'Other Sources',
    description: 'Other food sources not listed above'
  }
]

export function FoodAssessmentForm({ 
  entityId, 
  incidentId,
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  disabled = false,
  onIncidentEntityChange,
  lockIncidentEntity = false
}: FoodAssessmentFormProps) {
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>((initialData as any)?.mediaAttachments || [])
  const [selectedEntity, setSelectedEntity] = useState<string>(entityId)
  const [selectedIncident, setSelectedIncident] = useState<string>(incidentId || '')
  const [selectedEntityData, setSelectedEntityData] = useState<any>(null)
  const [hasInteracted, setHasInteracted] = useState(false)

  // Extract food data from initialData
  const foodData = (initialData as any)?.foodAssessment || (initialData as any);
  
  // Parse foodSource from JSON string if needed
  const parseFoodSource = (source: any): string[] => {
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
    if (foodData) {
      const newValues = {
        isFoodSufficient: foodData?.isFoodSufficient || false,
        hasRegularMealAccess: foodData?.hasRegularMealAccess || false,
        hasInfantNutrition: foodData?.hasInfantNutrition || false,
        foodSource: parseFoodSource(foodData?.foodSource),
        availableFoodDurationDays: foodData?.availableFoodDurationDays || 0,
        additionalFoodRequiredPersons: foodData?.additionalFoodRequiredPersons || 0,
        additionalFoodRequiredHouseholds: foodData?.additionalFoodRequiredHouseholds || 0,
        additionalFoodDetails: foodData?.additionalFoodDetails || ''
      };
      
      form.reset(newValues);
    }
  }, [initialData, foodData]);

  // Handle incident and entity changes
  const markInteracted = useCallback(() => {
    if (!hasInteracted) setHasInteracted(true)
  }, [hasInteracted])

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
    resolver: zodResolver(FoodAssessmentSchema),
    defaultValues: {
      isFoodSufficient: foodData?.isFoodSufficient || false,
      hasRegularMealAccess: foodData?.hasRegularMealAccess || false,
      hasInfantNutrition: foodData?.hasInfantNutrition || false,
      foodSource: parseFoodSource(foodData?.foodSource),
      availableFoodDurationDays: foodData?.availableFoodDurationDays || 0,
      additionalFoodRequiredPersons: foodData?.additionalFoodRequiredPersons || 0,
      additionalFoodRequiredHouseholds: foodData?.additionalFoodRequiredHouseholds || 0,
      additionalFoodDetails: foodData?.additionalFoodDetails || ''
    }
  })

  const [isFoodSufficient, hasRegularMealAccess, hasInfantNutrition, availableFoodDurationDays, additionalFoodRequiredPersons] = useWatch({
    control: form.control,
    name: ['isFoodSufficient', 'hasRegularMealAccess', 'hasInfantNutrition', 'availableFoodDurationDays', 'additionalFoodRequiredPersons'] as const
  })
  const watchedValues = { isFoodSufficient, hasRegularMealAccess, hasInfantNutrition, availableFoodDurationDays, additionalFoodRequiredPersons } as any

  // Calculate food security status
  const gapFields = [
    { key: 'isFoodSufficient', label: 'Food Sufficiency' },
    { key: 'hasRegularMealAccess', label: 'Regular Meal Access' },
    { key: 'hasInfantNutrition', label: 'Infant Nutrition' }
  ]

  const gaps = gapFields.filter(field => !watchedValues[field.key as keyof FormData])
  const gapCount = gaps.length

  const hasFoodGaps = gapCount > 0
  const foodDaysRemaining = watchedValues.availableFoodDurationDays
  const urgentNeed = foodDaysRemaining < 7 || watchedValues.additionalFoodRequiredPersons > 0

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
      type: 'FOOD' as const,
      rapidAssessmentDate: new Date(),
      assessorName: currentUserName,
      entityId: selectedEntity,
      incidentId: selectedIncident,
      ...locationData,
      mediaAttachments: mediaFiles,
      foodData: data
    }

    await onSubmit(assessmentData)
  }


  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="food-assessment-form">
      {/* Header */}
      <StickyFormHeader
        icon={<Utensils className="h-5 w-5" />}
        title="Food Security Assessment"
        description="Assess food availability, access, and nutrition security in the affected area"
        gapCount={gapCount}
        gapLabels={gaps.map(g => g.label)}
        hasInteracted={hasInteracted}
        extraBadges={urgentNeed ? <Badge variant="destructive">Urgent Need</Badge> : undefined}
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
                onValueChange={(entityId) => {
                  handleEntityChange(entityId)
                  // Reset entity data when selection changes
                  setSelectedEntityData(null)
                }}
                disabled={disabled || (lockIncidentEntity && !!selectedEntity)}
              />
            </CardContent>
          </Card>

          {/* Food Availability Indicators */}
          <Card className="bg-sky-50/50 dark:bg-sky-950/20">
            <CardHeader>
              <CardTitle>Food Availability & Access</CardTitle>
              <CardDescription>
                Evaluate food availability and access patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="isFoodSufficient"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Food Sufficient
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          Food supplies are sufficient to meet the population&apos;s needs
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasRegularMealAccess"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Regular Meal Access
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          Population has regular access to meals (at least 2 per day)
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasInfantNutrition"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Infant Nutrition Available
                          {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                        </FormLabel>
                        <FormDescription>
                          Adequate nutrition available for infants and young children
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Food Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Current Food Sources</CardTitle>
              <CardDescription>
                Identify the main food sources for the affected population
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagPillSelect
                options={foodSourceOptions.map(s => ({ id: s.id, label: s.label, description: s.description }))}
                selected={form.watch('foodSource')}
                onChange={(selected) => form.setValue('foodSource', selected)}
                disabled={disabled}
              />
            </CardContent>
          </Card>

          {/* Food Supply Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Food Supply Details
              </CardTitle>
              <CardDescription>
                Estimate food supply duration and additional requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="availableFoodDurationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Days of Food Available
                        {field.value > 0 && field.value < 7 && (
                          <Badge variant="destructive">Critical</Badge>
                        )}
                        {field.value >= 7 && field.value < 30 && (
                          <Badge variant="secondary">Limited</Badge>
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
                            field.value > 0 && field.value < 7 && "border-red-200 focus:border-red-400",
                            field.value >= 7 && field.value < 30 && "border-orange-200 focus:border-orange-400"
                          )}
                        />
                      </FormControl>
                      <FormDescription>
                        How many days will current food supplies last
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalFoodRequiredPersons"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Persons Needing Food
                        {field.value > 0 && (
                          <Badge variant="destructive">{field.value} persons</Badge>
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
                        />
                      </FormControl>
                      <FormDescription>
                        Number of additional people requiring food assistance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalFoodRequiredHouseholds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Households Needing Food</FormLabel>
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
                        Number of households requiring food assistance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </CardContent>
          </Card>

          {/* Risk Assessment */}
          {hasInteracted && (hasFoodGaps || urgentNeed) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gaps.map(gap => (
                    <div key={gap.key} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border" role="status">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">{gap.label} Gap</p>
                        <p className="text-xs text-muted-foreground">No adequate {gap.label.toLowerCase()} identified in this assessment.</p>
                      </div>
                    </div>
                  ))}
                  {foodDaysRemaining > 0 && foodDaysRemaining < 7 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border" role="status">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">Critical Food Shortage</p>
                        <p className="text-xs text-muted-foreground">Only {foodDaysRemaining} days of food available. Immediate food assistance required.</p>
                      </div>
                    </div>
                  )}
                  {foodDaysRemaining >= 7 && foodDaysRemaining < 30 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border" role="status">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">Limited Food Supply</p>
                        <p className="text-xs text-muted-foreground">{foodDaysRemaining} days of food available. Food assistance planning recommended.</p>
                      </div>
                    </div>
                  )}
                  {additionalFoodRequiredPersons > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border" role="status">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">Urgent Food Need</p>
                        <p className="text-xs text-muted-foreground">{additionalFoodRequiredPersons} additional persons require immediate food assistance.</p>
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
                Add photos of food distribution points, storage facilities, and affected populations
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
                Any additional food security information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="additionalFoodDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Provide any additional food assessment details..."
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
            submitLabel="Submit Food Assessment"
            loading={isSubmitting}
            disabled={isSubmitting || disabled || !selectedEntity}
            variant="bordered"
            data-testid="food-submit"
          />
        </form>
      </Form>
    </div>
  )
}