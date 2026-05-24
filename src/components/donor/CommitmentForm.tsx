'use client'

import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// UI components
import { Button } from '@/components/ui/button'
import { FormCard } from '@/components/shared/FormCard'
import { FormActionBar } from '@/components/shared/FormActionBar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

// Icons
import { Plus, Trash2, Package, MapPin, AlertTriangle, DollarSign, CheckCircle2, ArrowLeft } from 'lucide-react'

// Types and validation
import { CreateCommitmentInput, CommitmentItemInput } from '@/lib/validation/commitment'
import { apiGet, apiPost, extractArray } from '@/lib/api'

// Form validation schema
const CommitmentFormSchema = z.object({
  entityId: z.string().min(1, 'Please select a valid entity'),
  incidentId: z.string().min(1, 'Please select a valid incident'),
  items: z.array(
    z.object({
      name: z.string().min(1, 'Item name is required'),
      unit: z.string().min(1, 'Unit is required'),
      quantity: z.number().positive('Quantity must be greater than 0'),
      estimatedValue: z.number().positive('Value must be greater than 0').optional().or(z.literal(0))
    })
  ).min(1, 'At least one item is required'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
})

type CommitmentFormData = z.infer<typeof CommitmentFormSchema>

// Predefined item values for estimation
const ITEM_VALUES: Record<string, number> = {
  'Rice': 0.50,
  'Wheat': 0.45,
  'Blankets': 15.00,
  'Tents': 100.00,
  'Medical Supplies': 25.00,
  'Water Bottles': 0.10,
  'Canned Food': 2.00,
  'Clothing': 10.00,
  'Hygiene Kits': 5.00,
  'Sleeping Mats': 8.00
}

const COMMON_UNITS = ['kg', 'pieces', 'boxes', 'bottles', 'kits', 'bags', 'liters']

interface CommitmentFormProps {
  donorId: string
  onSuccess?: () => void
  onCancel?: () => void
  initialData?: Partial<CommitmentFormData>
  preSelectedEntityId?: string
}

export function CommitmentForm({ donorId, onSuccess, onCancel, initialData, preSelectedEntityId }: CommitmentFormProps) {
  const router = useRouter()
  
  // Fetch available entities (assigned to donor)
  const { data: entitiesData, isLoading: entitiesLoading } = useQuery({
    queryKey: ['donor-entities'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/donors/entities')
      if (!result.success) throw new Error(result.error || 'Failed to fetch entities')
      return result.data || {}
    }
  })

  const entities = entitiesData?.entities || []

  const form = useForm<CommitmentFormData>({
    resolver: zodResolver(CommitmentFormSchema),
    defaultValues: {
      entityId: preSelectedEntityId || initialData?.entityId || '',
      incidentId: initialData?.incidentId || '',
      items: initialData?.items || [{ name: '', unit: '', quantity: 1, estimatedValue: undefined }],
      notes: initialData?.notes || ''
    }
  })

  // Watch the selected entity ID
  const selectedEntityId = form.watch('entityId')

  // Fetch available incidents filtered by selected entity
  const { data: incidentsData, isLoading: incidentsLoading } = useQuery({
    queryKey: ['incidents', selectedEntityId],
    queryFn: async () => {
      if (!selectedEntityId) return []
      const result = await apiGet(`/api/v1/incidents?entityId=${selectedEntityId}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch incidents')
      return extractArray(result.data)
    },
    enabled: !!selectedEntityId
  })
  
  const incidents = incidentsData || []

  // Update form when preSelectedEntityId changes
  React.useEffect(() => {
    if (preSelectedEntityId && preSelectedEntityId !== form.getValues('entityId')) {
      form.setValue('entityId', preSelectedEntityId)
      // Clear incident selection when entity changes
      form.setValue('incidentId', '')
    }
  }, [preSelectedEntityId, form])

  // Clear incident selection when entity changes
  React.useEffect(() => {
    if (selectedEntityId) {
      form.setValue('incidentId', '')
    }
  }, [selectedEntityId, form])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  // Calculate total estimated value
  const totalEstimatedValue = form.watch('items').reduce((total, item) => {
    if (!item.name || !item.quantity) return total
    const unitValue = item.estimatedValue || ITEM_VALUES[item.name] || 0
    return total + (unitValue * item.quantity)
  }, 0)

  const createCommitmentMutation = useMutation({
    mutationFn: async (data: CommitmentFormData) => {
      const result = await apiPost(`/api/v1/donors/${donorId}/commitments`, data)
      if (!result.success) throw new Error(result.error || 'Failed to create commitment')
      return result.data
    },
    onSuccess: (data) => {
      toast.success('Commitment created successfully!')
      onSuccess?.()
      router.push(`/donor/dashboard?tab=commitments&detail=${data.id}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const onSubmit = (data: CommitmentFormData) => {
    // Ensure estimatedValue is properly handled
    const cleanedData = {
      ...data,
      items: data.items.map(item => ({
        ...item,
        estimatedValue: item.estimatedValue || undefined
      }))
    }
    
    createCommitmentMutation.mutate(cleanedData)
  }

  const addItem = () => {
    append({ name: '', unit: '', quantity: 1, estimatedValue: undefined })
  }

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const handleItemNameChange = (index: number, value: string) => {
    const itemValue = ITEM_VALUES[value]
    if (itemValue) {
      form.setValue(`items.${index}.estimatedValue`, itemValue)
    }
  }

  if (entitiesLoading || incidentsLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  
  return (
    <FormCard
      title="Create New Commitment"
      description="Specify the items you're committing to donate for this incident"
      variant="default"
      className="w-full max-w-4xl mx-auto"
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
            {/* Entity and Incident Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Entity *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an entity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entities?.map((entity: any) => (
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
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!selectedEntityId || incidentsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedEntityId 
                              ? "Select an entity first" 
                              : incidentsLoading 
                                ? "Loading incidents..." 
                                : "Select an incident"
                          } />
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
                        {incidents?.length === 0 && selectedEntityId && !incidentsLoading && (
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

            {/* Commitment Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <FormLabel className="text-base font-medium">Commitment Items *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Rice, Blankets" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  handleItemNameChange(index, e.target.value)
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {COMMON_UNITS.map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <FormLabel>Est. Value (optional)</FormLabel>
                          <Input
                            type="number"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            {...form.register(`items.${index}.estimatedValue`, {
                              valueAsNumber: true,
                              setValueAs: (value) => value === '' ? undefined : parseFloat(value)
                            })}
                          />
                          {form.formState.errors.items?.[index]?.estimatedValue && (
                            <FormMessage>{form.formState.errors.items[index]?.estimatedValue?.message}</FormMessage>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={fields.length === 1}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about your commitment..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum 500 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Value Summary */}
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                Total Estimated Value: <span className="font-bold text-green-600">${totalEstimatedValue.toFixed(2)}</span>
              </AlertDescription>
            </Alert>

          {/* Form Actions */}
          <FormActionBar
            onCancel={onCancel}
            submitLabel={createCommitmentMutation.isPending ? 'Creating...' : 'Create Commitment'}
            loading={createCommitmentMutation.isPending}
            variant="bordered"
          />
        </form>
      </Form>
    </FormCard>
  )
}