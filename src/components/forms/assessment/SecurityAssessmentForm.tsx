'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormActionBar } from '@/components/shared/FormActionBar'
import { StickyFormHeader } from '@/components/shared/StickyFormHeader'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GPSCapture } from '@/components/shared/GPSCapture'
import { MediaField } from '@/components/shared/MediaField'
import { EntitySelector } from '@/components/shared/EntitySelector'
import { IncidentSelector } from '@/components/shared/IncidentSelector'
import { SecurityAssessmentFormProps, SecurityAssessment } from '@/types/rapid-assessment'
import { getCurrentUserName, getAssessmentLocationData } from '@/utils/assessment-utils'
import { Shield, AlertTriangle, Users, Lightbulb, Phone } from '@/lib/icons'

const SecurityAssessmentSchema = z.object({
  isSafeFromViolence: z.boolean(),
  gbvCasesReported: z.boolean(),
  hasSecurityPresence: z.boolean(),
  hasProtectionReportingMechanism: z.boolean(),
  vulnerableGroupsHaveAccess: z.boolean(),
  hasLighting: z.boolean(),
  additionalSecurityDetails: z.string().optional()
})

type FormData = z.infer<typeof SecurityAssessmentSchema>

export function SecurityAssessmentForm({ 
  entityId, 
  incidentId,
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  disabled = false,
  onIncidentEntityChange,
  lockIncidentEntity = false
}: SecurityAssessmentFormProps) {
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>((initialData as any)?.mediaAttachments || [])
  const [selectedEntity, setSelectedEntity] = useState<string>(entityId)
  const [selectedIncident, setSelectedIncident] = useState<string>(incidentId || '')
  const [selectedEntityData, setSelectedEntityData] = useState<any>(null)
  const [hasInteracted, setHasInteracted] = useState(false)

  // Extract security data from initialData
  const securityData = (initialData as any)?.securityAssessment || (initialData as any);

  const form = useForm<FormData>({
    resolver: zodResolver(SecurityAssessmentSchema),
    defaultValues: {
      isSafeFromViolence: securityData?.isSafeFromViolence || false,
      gbvCasesReported: securityData?.gbvCasesReported || false,
      hasSecurityPresence: securityData?.hasSecurityPresence || false,
      hasProtectionReportingMechanism: securityData?.hasProtectionReportingMechanism || false,
      vulnerableGroupsHaveAccess: securityData?.vulnerableGroupsHaveAccess || false,
      hasLighting: securityData?.hasLighting || false,
      additionalSecurityDetails: securityData?.additionalSecurityDetails || ''
    }
  })

  // Track when initialData changes and update form
  useEffect(() => {
    if (securityData) {
      const newValues = {
        isSafeFromViolence: securityData?.isSafeFromViolence || false,
        gbvCasesReported: securityData?.gbvCasesReported || false,
        hasSecurityPresence: securityData?.hasSecurityPresence || false,
        hasProtectionReportingMechanism: securityData?.hasProtectionReportingMechanism || false,
        vulnerableGroupsHaveAccess: securityData?.vulnerableGroupsHaveAccess || false,
        hasLighting: securityData?.hasLighting || false,
        additionalSecurityDetails: securityData?.additionalSecurityDetails || ''
      };
      form.reset(newValues);
    }
  }, [initialData, securityData]);

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

  const [isSafeFromViolence, gbvCasesReported, hasSecurityPresence, hasProtectionReportingMechanism, vulnerableGroupsHaveAccess, hasLighting] = useWatch({
    control: form.control,
    name: ['isSafeFromViolence', 'gbvCasesReported', 'hasSecurityPresence', 'hasProtectionReportingMechanism', 'vulnerableGroupsHaveAccess', 'hasLighting'] as const
  })
  const watchedValues = { isSafeFromViolence, gbvCasesReported, hasSecurityPresence, hasProtectionReportingMechanism, vulnerableGroupsHaveAccess, hasLighting } as any

  // Gap fields for consistency with other assessment forms
  const gapFields = [
    { key: 'isSafeFromViolence', label: 'Safe from Violence' },
    { key: 'gbvCasesReported', label: 'GBV Cases Reported', inverted: true },
    { key: 'hasSecurityPresence', label: 'Security Presence' },
    { key: 'hasProtectionReportingMechanism', label: 'Protection Reporting Mechanism' },
    { key: 'vulnerableGroupsHaveAccess', label: 'Vulnerable Group Access' },
    { key: 'hasLighting', label: 'Lighting' }
  ]

  const gaps = gapFields.filter(field => {
    const val = watchedValues[field.key as keyof FormData]
    return field.inverted ? val : !val
  })
  const gapCount = gaps.length
  
  const hasSecurityRisks = gapCount > 0

  const handleSubmit = async (data: FormData) => {
    if (!selectedEntity) {
      return
    }
    
    if (!selectedIncident) {
      throw new Error('Please select an incident for this assessment')
    }

    const assessmentData = {
      type: 'SECURITY' as const,
      rapidAssessmentDate: new Date(),
      assessorName: getCurrentUserName(),
      entityId: selectedEntity,
      incidentId: selectedIncident,
      ...getAssessmentLocationData(selectedEntityData, gpsCoordinates ? { latitude: gpsCoordinates.lat, longitude: gpsCoordinates.lng } : undefined),
      mediaAttachments: mediaFiles,
      securityData: data
    }

    await onSubmit(assessmentData)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="security-assessment-form">
      {/* Header */}
      <StickyFormHeader
        icon={<Shield className="h-5 w-5" />}
        title="Security & Protection Assessment"
        description="Assess safety, security conditions, and protection mechanisms for vulnerable populations"
        gapCount={gapCount}
        gapLabels={gaps.map(g => g.label)}
        hasInteracted={hasInteracted}
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
                onValueChange={(value) => {
                  handleEntityChange(value)
                  setSelectedEntityData(null)
                }}
                disabled={disabled || (lockIncidentEntity && !!selectedEntity)}
              />
            </CardContent>
          </Card>

          {/* Violence & Safety Assessment */}
          <Card className="bg-sky-50/50 dark:bg-sky-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Violence & Safety Assessment
              </CardTitle>
              <CardDescription>
                Evaluate violence risks and general safety conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="isSafeFromViolence"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 border-red-200 bg-background">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        Safe from Violence
                        {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                      </FormLabel>
                      <FormDescription>
                        Population is safe from violence and armed conflict
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gbvCasesReported"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 border-red-200 bg-background">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => { markInteracted(); field.onChange(checked) }}
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        GBV Cases Reported
                        {!hasInteracted ? null : <StatusBadge domain="assessment" status={!field.value ? "NO_GAP" : "GAP"} label={!field.value ? "No Gap" : "Gap"} />}
                      </FormLabel>
                      <FormDescription>
                        Cases of gender-based violence have been reported
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Security & Protection Services */}
          <Card className="bg-sky-50/50 dark:bg-sky-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Protection Services
              </CardTitle>
              <CardDescription>
                Assess available security and protection services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="hasSecurityPresence"
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
                        Security Presence
                        {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                      </FormLabel>
                      <FormDescription>
                        Security personnel or forces are present in the area
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hasProtectionReportingMechanism"
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
                        <Phone className="h-4 w-4" />
                        Protection Reporting Mechanism
                        {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                      </FormLabel>
                      <FormDescription>
                        Mechanisms exist for reporting protection concerns
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Vulnerable Groups Protection */}
          <Card className="bg-sky-50/50 dark:bg-sky-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Vulnerable Groups Protection
              </CardTitle>
              <CardDescription>
                Assess protection access for vulnerable populations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="vulnerableGroupsHaveAccess"
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
                        Vulnerable Groups Have Access
                        {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                      </FormLabel>
                      <FormDescription>
                        Vulnerable groups have access to protection services
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Environmental Safety */}
          <Card className="bg-sky-50/50 dark:bg-sky-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Environmental Safety
              </CardTitle>
              <CardDescription>
                Assess environmental safety conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="hasLighting"
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
                        Adequate Lighting
                        {!hasInteracted ? null : <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />}
                      </FormLabel>
                      <FormDescription>
                        Sufficient lighting available for safety and security
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          {hasInteracted && hasSecurityRisks && (
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
                        <p className="text-xs text-muted-foreground">{gap.label} is not available or insufficient</p>
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
                Add photos of security conditions, protection facilities, and vulnerable areas (ensure no subjects are identifiable)
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
                Any additional security or protection-related information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="additionalSecurityDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Provide any additional security assessment details (avoid sensitive personal information)..."
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
            submitLabel="Submit Security Assessment"
            loading={isSubmitting}
            disabled={isSubmitting || disabled || !selectedEntity}
            variant="bordered"
            data-testid="security-submit"
          />
        </form>
      </Form>
    </div>
  )
}