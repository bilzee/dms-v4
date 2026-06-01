'use client'

import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

import { ArrowLeft, Package, DollarSign, AlertTriangle, Info } from '@/lib/icons'
import { apiGet, apiPost } from '@/lib/api'

const CommitmentFromPlanSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1),
      unit: z.string().min(1),
      quantity: z.number().positive('Must be > 0'),
      estimatedValue: z.number().optional(),
    })
  ).min(1, 'At least one item required'),
  notes: z.string().max(500).optional(),
})

type CommitmentFromPlanFormData = z.infer<typeof CommitmentFromPlanSchema>

interface CommitmentFromPlanFormProps {
  donorId: string
  responseId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function CommitmentFromPlanForm({ donorId, responseId, onSuccess, onCancel }: CommitmentFromPlanFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['response-unfulfilled', responseId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/responses/${responseId}/unfulfilled-items`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch response plan')
      return result.data
    },
    enabled: !!responseId,
  })

  const form = useForm<CommitmentFromPlanFormData>({
    resolver: zodResolver(CommitmentFromPlanSchema),
    defaultValues: {
      items: [],
      notes: '',
    },
  })

  const { fields, update } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  useEffect(() => {
    if (data?.unfulfilledItems) {
      form.reset({
        items: data.unfulfilledItems.map((item: any) => ({
          name: item.name,
          unit: item.unit,
          quantity: item.remainingQuantity,
          estimatedValue: item.estimatedValue || undefined,
        })),
        notes: '',
      })
    }
  }, [data])

  const createMutation = useMutation({
    mutationFn: async (formData: CommitmentFromPlanFormData) => {
      const commitmentResult = await apiPost(`/api/v1/donors/${donorId}/commitments`, {
        items: formData.items,
        notes: formData.notes,
        responseId,
      })
      if (!commitmentResult.success) throw new Error(commitmentResult.error || 'Failed to create commitment')
      return commitmentResult.data
    },
    onSuccess: () => {
      toast.success('Commitment created from response plan!')
      queryClient.invalidateQueries({ queryKey: ['donor-commitments', donorId] })
      queryClient.invalidateQueries({ queryKey: ['action-signals'] })
      onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create commitment')
    },
  })

  const onSubmit = (formData: CommitmentFromPlanFormData) => {
    createMutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-3 mt-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        {onCancel && (
          <Button variant="outline" className="mt-4" onClick={onCancel}>Back</Button>
        )}
      </div>
    )
  }

  const entityName = data?.entity?.name || 'Unknown Entity'
  const responseType = data?.type || ''
  const priority = data?.priority || ''

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onCancel} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Commitment from Plan</h1>
          <p className="text-sm text-muted-foreground">
            Commit resources for the unfulfilled items of this response plan
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Response Plan Details
          </CardTitle>
          <CardDescription>
            <span className="font-medium">{entityName}</span>
            {responseType && <Badge variant="outline" className="ml-2">{responseType}</Badge>}
            {priority && <Badge variant="secondary" className="ml-1">{priority}</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.existingCommitments?.length > 0 && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">{data.existingCommitments.length}</span> existing commitment(s) already cover some items.
                Remaining unfulfilled quantities are shown below.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_80px_60px_80px_100px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span>Item</span>
                  <span>Planned</span>
                  <span>Committed</span>
                  <span>Remaining</span>
                  <span>Your Commitment</span>
                  <span>Unit</span>
                </div>
                <Separator />
                {fields.map((field, index) => {
                  const planItem = data?.planItems?.find(
                    (p: any) => p.name === field.name && p.unit === field.unit
                  )
                  const unfulfilled = data?.unfulfilledItems?.find(
                    (u: any) => u.name === field.name && u.unit === field.unit
                  )
                  return (
                    <div key={field.id} className="grid grid-cols-[1fr_80px_60px_80px_100px_40px] gap-2 items-center px-1">
                      <span className="text-sm font-medium truncate">{field.name}</span>
                      <span className="text-sm text-muted-foreground">{planItem?.quantity || 0}</span>
                      <span className="text-sm text-muted-foreground">{(planItem?.quantity || 0) - (unfulfilled?.remainingQuantity || 0)}</span>
                      <span className="text-sm font-medium text-orange-600">{unfulfilled?.remainingQuantity || 0}</span>
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field: qtyField }) => (
                          <FormItem>
                            <input
                              type="number"
                              min={1}
                              max={unfulfilled?.remainingQuantity || 999}
                              className="w-full h-8 px-2 border rounded text-sm"
                              value={qtyField.value}
                              onChange={(e) => qtyField.onChange(Number(e.target.value))}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <span className="text-sm text-muted-foreground">{field.unit}</span>
                    </div>
                  )
                })}
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (optional)</FormLabel>
                    <textarea
                      className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm resize-y"
                      maxLength={500}
                      placeholder="Any additional notes about this commitment..."
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || fields.length === 0}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Commitment'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
