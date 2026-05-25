'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiPatch } from '@/lib/api'

// UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormCard } from '@/components/shared/FormCard'
import { FormActionBar } from '@/components/shared/FormActionBar'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

// Icons
import { Truck, CheckCircle2, Clock, XCircle, AlertTriangle, Package, Edit, Save, X } from '@/lib/icons'

// Types and validation
import { DonorCommitment, CommitmentStatus } from '@/types/commitment'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const StatusUpdateSchema = z.object({
  status: z.enum(['PLANNED', 'PARTIAL', 'COMPLETE', 'CANCELLED']),
  deliveredQuantity: z.number().nonnegative('Delivered quantity must be non-negative').optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
})

type StatusUpdateFormData = z.infer<typeof StatusUpdateSchema>

interface CommitmentStatusTrackerProps {
  commitment: DonorCommitment
  onUpdate?: (updatedCommitment: DonorCommitment) => void
  readOnly?: boolean
  userRole?: 'DONOR' | 'COORDINATOR' | 'ADMIN'
}

const STATUS_CONFIG = {
  PLANNED: {
    icon: Clock,
    label: 'Planned',
    description: 'Commitment is planned but delivery has not started'
  },
  PARTIAL: {
    icon: Truck,
    label: 'In Progress',
    description: 'Partial delivery has been made'
  },
  COMPLETE: {
    icon: CheckCircle2,
    label: 'Complete',
    description: 'Full commitment has been delivered'
  },
  CANCELLED: {
    icon: XCircle,
    label: 'Cancelled',
    description: 'Commitment has been cancelled'
  }
}

const VALID_TRANSITIONS = {
  'PLANNED': ['PARTIAL', 'COMPLETE', 'CANCELLED'],
  'PARTIAL': ['COMPLETE', 'CANCELLED'],
  'COMPLETE': [],
  'CANCELLED': []
}

export function CommitmentStatusTracker({ 
  commitment, 
  onUpdate, 
  readOnly = false,
  userRole = 'DONOR'
}: CommitmentStatusTrackerProps) {
  const queryClient = useQueryClient()
  const [isUpdating, setIsUpdating] = useState(false)
  
  const form = useForm<StatusUpdateFormData>({
    resolver: zodResolver(StatusUpdateSchema),
    defaultValues: {
      status: commitment.status,
      deliveredQuantity: commitment.deliveredQuantity,
      notes: commitment.notes || ''
    }
  })

  const updateStatusMutation = useMutation({
    mutationFn: async (data: StatusUpdateFormData) => {
      const result = await apiPatch(`/api/v1/commitments/${commitment.id}`, data)
      if (!result.success) throw new Error(result.error || 'Failed to update commitment status')
      return result.data!
    },
    onSuccess: (updatedCommitment) => {
      toast.success('Commitment status updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['commitment', commitment.id] })
      setIsUpdating(false)
      onUpdate?.(updatedCommitment)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const canEditStatus = !readOnly && ['DONOR', 'COORDINATOR', 'ADMIN'].includes(userRole)
  const canCancel = canEditStatus && commitment.status === 'PLANNED'

  const getStatusBadge = (status: CommitmentStatus) => {
    const config = STATUS_CONFIG[status]
    const Icon = config.icon
    return (
      <StatusBadge
        domain="commitment"
        status={status}
        label={config.label}
        icon={Icon}
        className="text-sm"
      />
    )
  }

  const getStatusProgress = () => {
    const statusOrder = ['PLANNED', 'PARTIAL', 'COMPLETE']
    const currentIndex = statusOrder.indexOf(commitment.status)
    
    return statusOrder.map((status, index) => {
      const isActive = status === commitment.status
      const isCompleted = index < currentIndex
      const isUpcoming = index > currentIndex
      
      return {
        status,
        isActive,
        isCompleted,
        isUpcoming,
        config: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
      }
    })
  }

  const calculateProgressPercentage = () => {
    if (commitment.totalCommittedQuantity === 0) return 0
    return Math.min((commitment.deliveredQuantity / commitment.totalCommittedQuantity) * 100, 100)
  }

  const calculateTotalValue = () => {
    return commitment.items.reduce((total, item) => {
      const estimatedValue = item.estimatedValue || 0
      return total + (estimatedValue * item.quantity)
    }, 0)
  }

  const onSubmit = (data: StatusUpdateFormData) => {
    updateStatusMutation.mutate(data)
  }

  const handleStatusChange = (status: CommitmentStatus) => {
    if (status === 'COMPLETE') {
      form.setValue('deliveredQuantity', commitment.totalCommittedQuantity)
    }
  }

  const handleCancel = () => {
    updateStatusMutation.mutate({ 
      status: 'CANCELLED',
      notes: commitment.notes 
    })
  }

  const allowedTransitions = VALID_TRANSITIONS[commitment.status as keyof typeof VALID_TRANSITIONS] || []

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Commitment Status
              </CardTitle>
              <CardDescription>
                Track and manage delivery progress
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(commitment.status)}
              {canEditStatus && !isUpdating && commitment.status !== 'COMPLETE' && commitment.status !== 'CANCELLED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUpdating(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Update Status
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Status Progress</h4>
              <span className="text-sm text-muted-foreground">
                Last updated: {new Date(commitment.lastUpdated).toLocaleDateString()}
              </span>
            </div>
            
            <div className="relative">
              <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200" />
              <div className="space-y-6">
                {getStatusProgress().map((step) => {
                  const Icon = step.config.icon
                  return (
                    <div key={step.status} className="flex items-center gap-4">
                      <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                        step.isActive 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : step.isCompleted 
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-background border-gray-300 text-gray-400'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className={`flex-1 ${step.isUpcoming ? 'opacity-50' : ''}`}>
                        <h5 className={`font-medium ${step.isActive ? 'text-primary' : step.isCompleted ? 'text-green-700' : ''}`}>
                          {step.config.label}
                        </h5>
                        <p className="text-sm text-muted-foreground">
                          {step.config.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Delivery Progress */}
          {(commitment.deliveredQuantity > 0 || commitment.status !== 'PLANNED') && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Delivery Progress</span>
                <span>{commitment.deliveredQuantity} / {commitment.totalCommittedQuantity} units</span>
              </div>
              <Progress value={calculateProgressPercentage()} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {calculateProgressPercentage().toFixed(1)}% complete
              </div>
            </div>
          )}

          {/* Items Summary */}
          <div className="mb-6">
            <h4 className="font-medium mb-3">Committed Items</h4>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="space-y-2 mb-3">
                {commitment.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{item.quantity} {item.unit} of {item.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ${(item.estimatedValue || 0) * item.quantity}
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between items-center mt-2 pt-2">
                <span className="font-medium">Total Est. Value:</span>
                <span className="font-bold text-green-600">
                  ${calculateTotalValue().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Verified Delivery */}
          {commitment.verifiedDeliveredQuantity > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Verified Delivery:</strong> {commitment.verifiedDeliveredQuantity} units have been verified by responders.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Status Update Form */}
      {canEditStatus && isUpdating && (
        <FormCard
          title="Update Commitment Status"
          description="Update the delivery status and quantity for this commitment"
          variant="compact"
        >
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Status *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value)
                        handleStatusChange(value as CommitmentStatus)
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select new status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allowedTransitions.map((status) => {
                            const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
                            const Icon = config.icon
                            return (
                              <SelectItem key={status} value={status}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {config.label}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(form.watch('status') === 'PARTIAL' || form.watch('status') === 'COMPLETE') && (
                  <FormField
                    control={form.control}
                    name="deliveredQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivered Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            min="0"
                            max={commitment.totalCommittedQuantity}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum: {commitment.totalCommittedQuantity} units
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Update Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any notes about this status update..."
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

                <FormActionBar
                  onCancel={() => {
                    setIsUpdating(false)
                    form.reset()
                  }}
                  submitLabel="Update Status"
                  loading={updateStatusMutation.isPending}
                  disabled={updateStatusMutation.isPending}
                  variant="default"
                />
              </form>
            </Form>
        </FormCard>
      )}
    </div>
  )
}