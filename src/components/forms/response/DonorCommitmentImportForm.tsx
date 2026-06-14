'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormCard } from '@/components/shared/FormCard'
import { FormActionBar } from '@/components/shared/FormActionBar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import {
  Package,
  Users,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  Eye,
  Info,
  ArrowLeft,
  Shield,
} from '@/lib/icons'

import { AssessmentSelector } from '@/components/response/AssessmentSelector'

import { useAuth } from '@/hooks/useAuth'
import { apiGet, apiPost, extractArray } from '@/lib/api'
import { getDotColor } from '@/components/shared/StatusBadge'

const CommitmentImportSchema = z.object({
  commitmentId: z.string().min(1, 'Please select a commitment'),
  assessmentId: z.string().min(1, 'Please select an assessment'),
  entityId: z.string().min(1, 'Please select an entity'),
  incidentId: z.string().min(1, 'Please select an incident'),
  type: z.enum([
    'HEALTH',
    'WASH',
    'SHELTER',
    'FOOD',
    'SECURITY',
    'POPULATION',
    'LOGISTICS',
  ]),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().positive(),
        unit: z.string(),
      })
    )
    .min(1, 'At least one item must be selected'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof CommitmentImportSchema>

interface DonorCommitmentImportFormProps {
  onSuccess?: (response: any) => void
  onCancel?: () => void
  entityId?: string
  incidentId?: string
}

export function DonorCommitmentImportForm({
  onSuccess,
  onCancel,
  entityId: preselectedEntityId,
  incidentId: preselectedIncidentId,
}: DonorCommitmentImportFormProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedCommitment, setSelectedCommitment] = useState<any>(null)
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [circularRefError, setCircularRefError] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(CommitmentImportSchema),
    defaultValues: {
      commitmentId: '',
      assessmentId: '',
      entityId: preselectedEntityId || '',
      incidentId: preselectedIncidentId || '',
      type: 'LOGISTICS',
      priority: 'MEDIUM',
      items: [],
      notes: '',
    },
  })

  const selectedEntityId = form.watch('entityId')
  const selectedIncidentId = form.watch('incidentId')

  const { data: entitiesData, isLoading: entitiesLoading } = useQuery({
    queryKey: ['assigned-entities', user?.id],
    queryFn: async () => {
      if (!user?.id) return { data: [] }
      const result = await apiGet(
        `/api/v1/entities/assigned?userId=${user.id}`
      )
      if (!result.success) throw new Error('Failed to fetch entities')
      return result.data
    },
    enabled: !!user?.id,
  })

  const entities = extractArray(entitiesData)

  const { data: incidentsData, isLoading: incidentsLoading } = useQuery({
    queryKey: ['incidents', selectedEntityId],
    queryFn: async () => {
      if (!selectedEntityId) return []
      const result = await apiGet(
        `/api/v1/incidents?entityId=${selectedEntityId}`
      )
      if (!result.success)
        throw new Error(result.error || 'Failed to fetch incidents')
      return extractArray(result.data)
    },
    enabled: !!selectedEntityId,
  })

  const incidents = incidentsData || []

  const { data: assessmentsData = [] } = useQuery({
    queryKey: ['verified-assessments', selectedEntityId],
    queryFn: async () => {
      if (!selectedEntityId) return []
      const result = await apiGet(
        `/api/v1/assessments/verified?entityId=${selectedEntityId}`
      )
      if (!result.success)
        throw new Error('Failed to fetch verified assessments')
      return extractArray(result.data as any)
    },
    enabled: !!selectedEntityId,
  })

  const commitmentsEnabled = !!selectedEntityId && !!selectedIncidentId

  const { data: commitmentsData, isLoading: commitmentsLoading } = useQuery({
    queryKey: [
      'orphaned-commitments',
      selectedEntityId,
      selectedIncidentId,
    ],
    queryFn: async () => {
      const result = await apiGet(
        `/api/v1/commitments?entityId=${selectedEntityId}&incidentId=${selectedIncidentId}&status=PLANNED&limit=100`
      )
      if (!result.success) return []

      const allCommitments = extractArray(result.data)
      if (allCommitments.length === 0) return []

      const planCommitmentsResult = await apiGet(
        `/api/v1/commitments?entityId=${selectedEntityId}&incidentId=${selectedIncidentId}&includeResponses=true&limit=100`
      )
      if (!planCommitmentsResult.success) return allCommitments

      const withResponses = extractArray(planCommitmentsResult.data)
      const linkedCommitmentIds = new Set<string>()

      for (const c of withResponses) {
        if (c.planCommitments && Array.isArray(c.planCommitments)) {
          for (const pc of c.planCommitments) {
            linkedCommitmentIds.add(pc.commitmentId)
          }
        }
        if (c.responses && Array.isArray(c.responses)) {
          linkedCommitmentIds.add(c.id)
        }
      }

      return allCommitments.filter(
        (c: any) => !linkedCommitmentIds.has(c.id)
      )
    },
    enabled: commitmentsEnabled,
  })

  const commitments = commitmentsData || []

  const handleEntityChange = (value: string) => {
    form.setValue('entityId', value)
    form.setValue('incidentId', '')
    form.setValue('assessmentId', '')
    setSelectedCommitment(null)
    setSelectedItems([])
    setCircularRefError(null)
  }

  const handleIncidentChange = (value: string) => {
    form.setValue('incidentId', value)
    setSelectedCommitment(null)
    setSelectedItems([])
    setCircularRefError(null)
  }

  const handleCommitmentSelect = (commitment: any) => {
    if (commitment.sourcePlanId) {
      setCircularRefError(
        'This commitment was created from a response plan and cannot be used to create another plan (circular reference prevention).'
      )
      setSelectedCommitment(null)
      setSelectedItems([])
      form.setValue('commitmentId', '')
      form.setValue('items', [])
      return
    }

    setCircularRefError(null)
    setSelectedCommitment(commitment)
    setSelectedItems(
      (commitment.items || []).map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      }))
    )
    form.setValue('commitmentId', commitment.id)
    form.setValue(
      'items',
      (commitment.items || []).map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      }))
    )
  }

  const handleItemQuantityChange = (itemIndex: number, newQuantity: number) => {
    const updatedItems = [...selectedItems]
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity: newQuantity,
    }
    setSelectedItems(updatedItems)
    form.setValue('items', updatedItems)
    form.clearErrors('items')
  }

  const importMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: any = {
        commitmentId: data.commitmentId,
        items: data.items,
        notes: data.notes,
      }
      const result = await apiPost('/api/v1/responses/from-commitment', payload)
      if (!result.success) {
        throw new Error(result.error || 'Failed to import commitment')
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orphaned-commitments'] })
      queryClient.invalidateQueries({ queryKey: ['planned-responses'] })
      onSuccess?.(data)
    },
  })

  const onSubmit = (data: FormData) => {
    if (selectedItems.length === 0) {
      form.setError('items', { message: 'Please select at least one item' })
      return
    }
    setIsPreviewOpen(true)
  }

  const handleConfirmImport = () => {
    const data = form.getValues()
    data.items = selectedItems.filter((item) => item.quantity > 0)
    importMutation.mutate(data)
    setIsPreviewOpen(false)
  }

  if (entitiesLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <FormCard
        title="Import from Donor Commitment"
        description="Select an entity and incident to find orphaned commitments, then create a response plan from the selected commitment."
        variant="dialog"
      >
        {onCancel && (
          <div className="-mt-2 mb-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="p-0 h-8"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Entity *</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val)
                        handleEntityChange(val)
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an entity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entities
                          .filter(
                            (entity: any) => entity.id && entity.id !== ''
                          )
                          .map((entity: any) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.name} ({entity.type})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="incidentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident *</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val)
                        handleIncidentChange(val)
                      }}
                      value={field.value}
                      disabled={!selectedEntityId || incidentsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedEntityId
                                ? 'Select an entity first'
                                : incidentsLoading
                                  ? 'Loading incidents...'
                                  : 'Select an incident'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {incidents?.map((incident: any) => (
                          <SelectItem key={incident.id} value={incident.id}>
                            <div className="flex items-center gap-2">
                              <span>{incident.type}</span>
                              <Badge variant="outline" className="text-xs">
                                {incident.severity}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                        {incidents?.length === 0 &&
                          selectedEntityId &&
                          !incidentsLoading && (
                            <div className="px-2 py-1 text-sm text-muted-foreground">
                              No incidents found for this entity
                            </div>
                          )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!selectedEntityId || !selectedIncidentId ? (
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {!selectedEntityId
                    ? 'Select a target entity and incident to see available orphaned commitments.'
                    : 'Now select an incident to see available orphaned commitments for this entity.'}
                </AlertDescription>
              </Alert>
            ) : commitmentsLoading ? (
              <div className="space-y-3 mb-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : commitments.length === 0 ? (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No orphaned commitments found for this entity and incident.
                  Commitments that are already linked to response plans are
                  excluded.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Orphaned Commitments
                  </h3>
                  <Badge variant="secondary">
                    {commitments.length} available
                  </Badge>
                </div>
                {commitments.map((commitment: any) => (
                  <Card
                    key={commitment.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedCommitment?.id === commitment.id
                        ? 'ring-2 ring-primary'
                        : ''
                    } ${
                      commitment.sourcePlanId
                        ? 'opacity-60 border-red-200'
                        : ''
                    }`}
                    onClick={() => handleCommitmentSelect(commitment)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">
                              {commitment.donor?.name || 'Unknown Donor'}
                            </span>
                            {commitment.donor?.type && (
                              <Badge
                                variant={
                                  commitment.donor.type === 'ORGANIZATION'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {commitment.donor.type}
                              </Badge>
                            )}
                            {commitment.type && (
                              <Badge variant="outline">{commitment.type}</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {commitment.entity?.name || 'Unknown Entity'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(
                                commitment.commitmentDate
                              ).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {commitment.totalCommittedQuantity ||
                                0}{' '}
                              units committed
                            </div>
                          </div>

                          <div className="text-sm text-foreground">
                            {Array.isArray(commitment.items) &&
                              commitment.items
                                .slice(0, 3)
                                .map((item: any, index: number) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="mr-1 mb-1"
                                  >
                                    {item.name} ({item.quantity} {item.unit})
                                  </Badge>
                                ))}
                            {Array.isArray(commitment.items) &&
                              commitment.items.length > 3 && (
                                <Badge variant="outline" className="mr-1 mb-1">
                                  +{commitment.items.length - 3} more
                                </Badge>
                              )}
                          </div>

                          {commitment.sourcePlanId && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                              <Shield className="h-3 w-3" />
                              Derived from a response plan (circular reference)
                            </div>
                          )}
                        </div>

                        <div className="ml-4">
                          {selectedCommitment?.id === commitment.id ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-border rounded-full" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {circularRefError && (
              <Alert variant="destructive" className="mb-6">
                <Shield className="h-4 w-4" />
                <AlertDescription>{circularRefError}</AlertDescription>
              </Alert>
            )}

            {selectedCommitment && !circularRefError && (
              <>
                <Separator className="my-6" />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Response Details</h3>

                  <FormField
                    control={form.control}
                    name="assessmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessment *</FormLabel>
                        <FormControl>
                          <AssessmentSelector
                            entityId={selectedEntityId}
                            value={field.value}
                            onValueChange={(
                              assessmentId: string,
                              assessment: any
                            ) => {
                              field.onChange(assessmentId)
                              if (
                                assessment &&
                                assessment.rapidAssessmentType
                              ) {
                                form.setValue(
                                  'type',
                                  assessment.rapidAssessmentType
                                )
                              }
                              if (assessment && assessment.priority) {
                                form.setValue('priority', assessment.priority)
                              }
                            }}
                            disabled={!selectedEntityId}
                            showConflictWarning={true}
                            selectedAssessment={assessmentsData.find(
                              (a: any) => a.id === field.value
                            )}
                          />
                        </FormControl>
                        <FormDescription>
                          Select the assessment this response plan is for
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Response Type *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={true}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-muted">
                                <SelectValue placeholder="Auto-populated from assessment..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="HEALTH">Health</SelectItem>
                              <SelectItem value="WASH">WASH</SelectItem>
                              <SelectItem value="SHELTER">Shelter</SelectItem>
                              <SelectItem value="FOOD">Food</SelectItem>
                              <SelectItem value="SECURITY">Security</SelectItem>
                              <SelectItem value="POPULATION">
                                Population
                              </SelectItem>
                              <SelectItem value="LOGISTICS">
                                Logistics
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Auto-populated from assessment
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={true}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-muted">
                                <SelectValue placeholder="Auto-populated from assessment..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CRITICAL">
                                <span className="flex items-center gap-2">
                                  <div
                                    className={`w-3 h-3 ${getDotColor('severity', 'CRITICAL')} rounded-full`}
                                  />
                                  Critical
                                </span>
                              </SelectItem>
                              <SelectItem value="HIGH">
                                <span className="flex items-center gap-2">
                                  <div
                                    className={`w-3 h-3 ${getDotColor('severity', 'HIGH')} rounded-full`}
                                  />
                                  High
                                </span>
                              </SelectItem>
                              <SelectItem value="MEDIUM">
                                <span className="flex items-center gap-2">
                                  <div
                                    className={`w-3 h-3 ${getDotColor('severity', 'MEDIUM')} rounded-full`}
                                  />
                                  Medium
                                </span>
                              </SelectItem>
                              <SelectItem value="LOW">
                                <span className="flex items-center gap-2">
                                  <div
                                    className={`w-3 h-3 ${getDotColor('severity', 'LOW')} rounded-full`}
                                  />
                                  Low
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Auto-populated from assessment
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <h3 className="text-sm font-medium pt-2">
                    Adjust Item Quantities
                  </h3>

                  <FormField
                    control={form.control}
                    name="items"
                    render={() => (
                      <FormItem>
                        <FormDescription>
                          Total:{' '}
                          {selectedItems.reduce(
                            (sum, item) => sum + item.quantity,
                            0
                          )}{' '}
                          units
                        </FormDescription>
                        <FormControl>
                          <div className="space-y-3">
                            {selectedItems.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-4 p-3 border rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {item.unit}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleItemQuantityChange(
                                        index,
                                        Math.max(1, item.quantity - 1)
                                      )
                                    }
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>

                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleItemQuantityChange(
                                        index,
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="w-20 text-center"
                                    min="1"
                                  />

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleItemQuantityChange(
                                        index,
                                        item.quantity + 1
                                      )
                                    }
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any additional notes about this import..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormMessage>
                    {form.formState.errors.items?.message}
                  </FormMessage>

                  <FormActionBar
                    onCancel={onCancel}
                    submitLabel="Preview Import"
                    loading={importMutation.isPending}
                    disabled={
                      importMutation.isPending ||
                      selectedItems.length === 0 ||
                      !!circularRefError
                    }
                    variant="default"
                  />
                </div>
              </>
            )}

            {selectedEntityId &&
              selectedIncidentId &&
              !selectedCommitment &&
              !commitmentsLoading &&
              commitments.length > 0 && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Select a commitment above to configure the response details
                    and import items.
                  </AlertDescription>
                </Alert>
              )}
          </form>
        </Form>
      </FormCard>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl bg-card dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview Commitment Import
            </DialogTitle>
            <DialogDescription className="text-base">
              Review the details below before creating a response plan from
              this commitment.
            </DialogDescription>
          </DialogHeader>

          {selectedCommitment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Donor</label>
                  <p className="text-sm">
                    {selectedCommitment.donor?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Entity</label>
                  <p className="text-sm">
                    {selectedCommitment.entity?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Incident</label>
                  <p className="text-sm">
                    {selectedCommitment.incident?.type || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Quantity</label>
                  <p className="text-sm">
                    {selectedItems.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    )}{' '}
                    units
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Items to Import</label>
                <div className="mt-2 space-y-2">
                  {selectedItems
                    .filter((item) => item.quantity > 0)
                    .map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between p-2 bg-muted rounded"
                      >
                        <span>{item.name}</span>
                        <span>
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {form.watch('notes') && (
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <p className="text-sm">{form.watch('notes')}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="bg-muted dark:bg-gray-800 -mx-6 -mb-6 px-6 py-4 mt-6 flex justify-between">
            <Button
              onClick={handleConfirmImport}
              disabled={importMutation.isPending}
              className="min-w-32 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              {importMutation.isPending ? 'Creating...' : 'Create Plan'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              disabled={importMutation.isPending}
              className="min-w-20"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
