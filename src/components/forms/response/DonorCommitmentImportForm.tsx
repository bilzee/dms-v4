'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

// UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Icons
import { Package, AlertTriangle, Search, Filter, Users, MapPin, Calendar, CheckCircle, AlertCircle, Plus, Minus, Eye, EyeOff } from 'lucide-react'

// Shared components
import { AssessmentSelector } from '@/components/response/AssessmentSelector'

// Services and types
import { useAuthStore } from '@/stores/auth.store'
import { apiGet, apiPost, extractArray } from '@/lib/api'
import { CommitmentService, type CommitmentItem } from '@/lib/services/commitment.service'
import { ResponseService } from '@/lib/services/response.service'
import { CreateDeliveredResponseInput } from '@/lib/validation/response'

// Validation schema
const CommitmentImportSchema = z.object({
  commitmentId: z.string().min(1, 'Please select a commitment'),
  assessmentId: z.string().min(1, 'Please select an assessment'),
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'LOGISTICS']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().positive(),
    unit: z.string()
  })).min(1, 'At least one item must be selected'),
  notes: z.string().optional()
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
  incidentId: preselectedIncidentId
}: DonorCommitmentImportFormProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedCommitment, setSelectedCommitment] = useState<any>(null)
  const [selectedItems, setSelectedItems] = useState<CommitmentItem[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [filters, setFilters] = useState({
    entityId: preselectedEntityId || 'all',
    incidentId: preselectedIncidentId || 'all',
    status: 'PLANNED'
  })

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(CommitmentImportSchema),
    defaultValues: {
      commitmentId: '',
      assessmentId: '',
      type: 'LOGISTICS',
      priority: 'MEDIUM',
      items: [],
      notes: ''
    }
  })

  // Query available commitments
  const { data: commitmentsData, isLoading, error } = useQuery({
    queryKey: ['available-commitments', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.entityId && filters.entityId !== 'all') params.append('entityId', filters.entityId)
      if (filters.incidentId && filters.incidentId !== 'all') params.append('incidentId', filters.incidentId)
      if (filters.status) params.append('status', filters.status)
      const result = await apiGet(`/api/v1/commitments/available?${params}`)
      if (!result.success) throw new Error('Failed to fetch commitments')
      return result.data
    },
  })

  // Query assigned entities for filtering
  const { data: entitiesData } = useQuery({
    queryKey: ['assigned-entities', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available')
      const result = await apiGet(`/api/v1/entities/assigned?userId=${user.id}`)
      if (!result.success) throw new Error('Failed to fetch entities')
      return result.data
    },
    enabled: !!user?.id
  })

  // Query verified assessments for the selected entity
  const { data: assessmentsData = [] } = useQuery({
    queryKey: ['verified-assessments', filters.entityId],
    queryFn: async () => {
      if (!filters.entityId || filters.entityId === 'all') return []
      const result = await apiGet(`/api/v1/assessments/verified?entityId=${filters.entityId}`)
      if (!result.success) throw new Error('Failed to fetch verified assessments')
      return extractArray(result.data as any)
    },
    enabled: !!filters.entityId && filters.entityId !== 'all'
  })

  // Import commitment mutation
  const importMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const result = await apiPost('/api/v1/responses/from-commitment', data)
      if (!result.success) {
        throw new Error(result.error || 'Failed to import commitment')
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['available-commitments'] })
      queryClient.invalidateQueries({ queryKey: ['planned-responses'] })
      onSuccess?.(data)
    }
  })

  // Create delivered response mutation
  const createDeliveredMutation = useMutation({
    mutationFn: async (data: CreateDeliveredResponseInput) => {
      if (!user) throw new Error('User not authenticated')
      
      // Add user ID to data
      const dataWithUser = { ...data, responderId: user.id }
      
      return await ResponseService.createDeliveredResponse(dataWithUser, user.id)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['available-commitments'] })
      queryClient.invalidateQueries({ queryKey: ['delivered-responses'] })
      onSuccess?.(data)
    },
    onError: (error: any) => {
      console.error('Error creating delivered response:', error)
      // You might want to set an error state here
    }
  })

  // Handle commitment selection
  const handleCommitmentSelect = (commitment: any) => {
    setSelectedCommitment(commitment)
    setSelectedItems(commitment.items || [])
    form.setValue('commitmentId', commitment.id)
    form.setValue('items', commitment.items || [])
  }

  // Handle item quantity change
  const handleItemQuantityChange = (itemIndex: number, newQuantity: number) => {
    const maxAvailable = selectedCommitment?.availableQuantity || 0
    const totalSelected = selectedItems.reduce((sum, item, index) => 
      index === itemIndex ? sum + newQuantity : sum + item.quantity, 0
    )

    if (totalSelected > maxAvailable) {
      form.setError('items', { 
        message: `Total quantity (${totalSelected}) exceeds available (${maxAvailable})` 
      })
      return
    }

    const updatedItems = [...selectedItems]
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity: newQuantity
    }
    setSelectedItems(updatedItems)
    form.setValue('items', updatedItems)
    form.clearErrors('items')
  }

  // Handle form submission
  const onSubmit = (data: FormData) => {
    if (selectedItems.length === 0) {
      form.setError('items', { message: 'Please select at least one item' })
      return
    }

    // Open preview dialog before submission
    setIsPreviewOpen(true)
  }

  // Confirm import after preview
  const handleConfirmImport = () => {
    const data = form.getValues()
    data.items = selectedItems.filter(item => item.quantity > 0)
    
    importMutation.mutate(data)
    setIsPreviewOpen(false)
  }

  // Handle creating delivered response directly
  const handleCreateDelivery = () => {
    const data = form.getValues()
    data.items = selectedItems.filter(item => item.quantity > 0)
    
    const dataWithEntityId = {
      ...data,
      entityId: filters.entityId && filters.entityId !== 'all' ? filters.entityId : ''
    }
    
    createDeliveredMutation.mutate(dataWithEntityId)
    setIsPreviewOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 animate-pulse text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Loading available commitments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load commitments. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  const commitments = commitmentsData?.data || []
  const entities = entitiesData?.data || []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Import from Donor Commitment
          </CardTitle>
          <CardDescription>
            Select a donor commitment to auto-populate response details with available items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Entity</label>
              <Select value={filters.entityId} onValueChange={(value) => setFilters(prev => ({ ...prev, entityId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entities.filter((entity: any) => entity.id && entity.id !== '').map((entity: any) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name} ({entity.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search commitments..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Available Commitments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Available Commitments</h3>
              <Badge variant="secondary">
                {commitments.length} commitments
              </Badge>
            </div>

            {commitments.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No available commitments found for the selected filters.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                {commitments.map((commitment: any) => (
                  <Card 
                    key={commitment.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedCommitment?.id === commitment.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleCommitmentSelect(commitment)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{commitment.donor.name}</span>
                            <Badge variant={commitment.donor.type === 'ORGANIZATION' ? 'default' : 'secondary'}>
                              {commitment.donor.type}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {commitment.entity.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(commitment.commitmentDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {commitment.availableQuantity} units available
                            </div>
                          </div>

                          {commitment.isPartiallyDelivered && (
                            <Badge variant="secondary" className="mb-2">
                              Partially Delivered ({commitment.utilizationRate.toFixed(1)}% used)
                            </Badge>
                          )}

                          <div className="text-sm text-gray-700">
                            {commitment.items?.slice(0, 3).map((item: any, index: number) => (
                              <span key={index} className="inline-block mr-2">
                                {item.name} ({item.quantity} {item.unit})
                              </span>
                            ))}
                            {commitment.items?.length > 3 && (
                              <span className="text-gray-500">
                                +{commitment.items.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {selectedCommitment?.id === commitment.id ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Selected Items Section */}
          {selectedCommitment && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-4">Response Details</h3>
                
                {/* Assessment Selection */}
                <div className="space-y-4 mb-6">
                  <FormField
                    control={form.control}
                    name="assessmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessment *</FormLabel>
                        <FormControl>
                          <AssessmentSelector
                            entityId={filters.entityId}
                            value={field.value}
                            onValueChange={(assessmentId, assessment) => {
                              field.onChange(assessmentId)
                              // Auto-match response type to assessment type
                              if (assessment && assessment.rapidAssessmentType) {
                                form.setValue('type', assessment.rapidAssessmentType)
                              }
                              // Set response priority to match assessment priority
                              if (assessment && assessment.priority) {
                                form.setValue('priority', assessment.priority)
                              }
                            }}
                            disabled={!filters.entityId || filters.entityId === 'all'}
                            showConflictWarning={true}
                            selectedAssessment={assessmentsData.find((a: any) => a.id === field.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Select the assessment this response plan is for
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Response Type and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Response Type *</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange} disabled={true}>
                              <SelectTrigger className="bg-gray-50">
                                <SelectValue placeholder="Auto-populated from assessment..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="HEALTH">Health</SelectItem>
                                <SelectItem value="WASH">WASH</SelectItem>
                                <SelectItem value="SHELTER">Shelter</SelectItem>
                                <SelectItem value="FOOD">Food</SelectItem>
                                <SelectItem value="SECURITY">Security</SelectItem>
                                <SelectItem value="POPULATION">Population</SelectItem>
                                <SelectItem value="LOGISTICS">Logistics</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Auto-populated from selected assessment type
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
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange} disabled={true}>
                              <SelectTrigger className="bg-gray-50">
                                <SelectValue placeholder="Auto-populated from assessment..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CRITICAL">
                                  <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    Critical
                                  </span>
                                </SelectItem>
                                <SelectItem value="HIGH">
                                  <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                    High
                                  </span>
                                </SelectItem>
                                <SelectItem value="MEDIUM">
                                  <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    Medium
                                  </span>
                                </SelectItem>
                                <SelectItem value="LOW">
                                  <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    Low
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Auto-populated from selected assessment priority
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <h3 className="text-lg font-medium mb-4">Select Items to Import</h3>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="items"
                      render={() => (
                        <FormItem>
                          <FormLabel>Items</FormLabel>
                          <FormDescription>
                            Adjust quantities as needed. Total: {selectedItems.reduce((sum, item) => sum + item.quantity, 0)} units
                          </FormDescription>
                          <FormControl>
                            <div className="space-y-3">
                              {selectedItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                                  <div className="flex-1">
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-gray-500">{item.unit}</div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleItemQuantityChange(index, Math.max(1, item.quantity - 1))}
                                      disabled={item.quantity <= 1}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 1)}
                                      className="w-20 text-center"
                                      min="1"
                                      max={selectedCommitment?.availableQuantity || 0}
                                    />
                                    
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleItemQuantityChange(index, item.quantity + 1)}
                                      disabled={item.quantity >= (selectedCommitment?.availableQuantity || 0)}
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

                    <FormMessage>{form.formState.errors.items?.message}</FormMessage>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        disabled={importMutation.isPending || selectedItems.length === 0}
                        className="flex-1"
                      >
                        {importMutation.isPending ? 'Importing...' : 'Preview Import'}
                      </Button>
                      
                      {onCancel && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onCancel}
                          disabled={importMutation.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview Commitment Import
            </DialogTitle>
            <DialogDescription className="text-base">
              Review the details below before importing the commitment.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCommitment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Donor</label>
                  <p className="text-sm">{selectedCommitment.donor.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Entity</label>
                  <p className="text-sm">{selectedCommitment.entity.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Incident</label>
                  <p className="text-sm">{selectedCommitment.incident.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Quantity</label>
                  <p className="text-sm">{selectedItems.reduce((sum, item) => sum + item.quantity, 0)} units</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Items to Import</label>
                <div className="mt-2 space-y-2">
                  {selectedItems.filter(item => item.quantity > 0).map((item, index) => (
                    <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>{item.name}</span>
                      <span>{item.quantity} {item.unit}</span>
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

          <DialogFooter className="bg-gray-50 dark:bg-gray-800 -mx-6 -mb-6 px-6 py-4 mt-6 flex justify-between">
            <Button
              onClick={handleConfirmImport}
              disabled={importMutation.isPending}
              className="min-w-32 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              {importMutation.isPending ? 'Creating...' : 'Create Plan'}
            </Button>
            <Button
              onClick={handleCreateDelivery}
              disabled={createDeliveredMutation.isPending}
              className="min-w-40 bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {createDeliveredMutation.isPending ? 'Creating...' : 'Create Delivery Directly'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              disabled={importMutation.isPending || createDeliveredMutation.isPending}
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