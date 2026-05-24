'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GPSCapture } from '@/components/shared/GPSCapture'
import { MediaField } from '@/components/shared/MediaField'
import { EntitySelector } from '@/components/shared/EntitySelector'
import { IncidentSelector } from '@/components/shared/IncidentSelector'
import { SecurityAssessmentFormProps, SecurityAssessment } from '@/types/rapid-assessment'
import { getCurrentUserName, getAssessmentLocationData } from '@/utils/assessment-utils'
import { Shield, AlertTriangle, Users, Lightbulb, Phone } from 'lucide-react'

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
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  disabled = false,
  onIncidentEntityChange
}: SecurityAssessmentFormProps) {
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>((initialData as any)?.mediaAttachments || [])
  const [selectedEntity, setSelectedEntity] = useState<string>(entityId)
  const [selectedIncident, setSelectedIncident] = useState<string>('')
  const [selectedEntityData, setSelectedEntityData] = useState<any>(null)

  // Extract security data from initialData
  const securityData = (initialData as any)?.securityAssessment || (initialData as any);
  
  // Debug logging
  console.log('SecurityAssessmentForm - initialData:', initialData);
  console.log('SecurityAssessmentForm - securityData:', securityData);

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
    console.log('SecurityAssessmentForm - initialData changed:', initialData);
    
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
      
      console.log('SecurityAssessmentForm - updating form with values:', newValues);
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

  const watchedValues = form.watch()

  // Calculate security risks
  const violenceRisk = !watchedValues.isSafeFromViolence
  const gbvRisk = watchedValues.gbvCasesReported
  const securityGap = !watchedValues.hasSecurityPresence
  const protectionGap = !watchedValues.hasProtectionReportingMechanism
  const vulnerableGroupRisk = !watchedValues.vulnerableGroupsHaveAccess
  const lightingRisk = !watchedValues.hasLighting
  
  // Gap fields for consistency with other assessment forms
  const gapFields = [
    { key: 'hasSecurityPresence', label: 'Security Presence' },
    { key: 'hasProtectionReportingMechanism', label: 'Protection Reporting Mechanism' },
    { key: 'vulnerableGroupsHaveAccess', label: 'Vulnerable Group Access' },
    { key: 'hasLighting', label: 'Lighting' }
  ]

  const gaps = gapFields.filter(field => !watchedValues[field.key as keyof FormData])
  const gapCount = gaps.length
  
  const criticalRisks = [violenceRisk, gbvRisk].filter(Boolean).length
  const hasSecurityRisks = criticalRisks > 0 || gapCount > 0

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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Protection Assessment
            {criticalRisks > 0 && (
              <Badge variant="destructive">
                {criticalRisks} Critical Risk{criticalRisks > 1 ? 's' : ''}
              </Badge>
            )}
            {gapCount > 0 && (
              <Badge variant="destructive">
                {gapCount} Gap{gapCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Assess safety, security conditions, and protection mechanisms for vulnerable populations
          </CardDescription>
        </CardHeader>
        {criticalRisks > 0 && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Critical Protection Risks Identified:</strong> Immediate intervention required to ensure population safety
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
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
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                onValueChange={(value) => {
                  handleEntityChange(value)
                  setSelectedEntityData(null)
                }}
                disabled={disabled}
              />
            </CardContent>
          </Card>

          {/* Violence & Safety Assessment */}
          <Card>
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
                        Safe from Violence
                        {!field.value && <Badge variant="destructive">Critical Risk</Badge>}
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
                        GBV Cases Reported
                        {field.value && <Badge variant="destructive">High Risk</Badge>}
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
          <Card>
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
                        Security Presence
                        <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
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
                        <Phone className="h-4 w-4" />
                        Protection Reporting Mechanism
                        <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
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
          <Card>
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
                        Vulnerable Groups Have Access
                        <StatusBadge domain="assessment" status={field.value ? "NO_GAP" : "GAP"} label={field.value ? "No Gap" : "Gap"} />
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
          <Card>
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
                        Adequate Lighting
                        {!field.value && <Badge variant="destructive">Safety Risk</Badge>}
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
          {hasSecurityRisks && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {violenceRisk && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Violence Risk:</strong> Population exposed to violence and conflict. Immediate protection measures required.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {gbvRisk && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>GBV Risk:</strong> Gender-based violence reported. Specialized protection services urgently needed.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {gaps.map((gap) => (
                    <Alert key={gap.key} variant="destructive">
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{gap.label} Gap:</strong> {gap.label} is not available or insufficient, increasing security risks
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

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || disabled || !selectedEntity}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Security Assessment'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}