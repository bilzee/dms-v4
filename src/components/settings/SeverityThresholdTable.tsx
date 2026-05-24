'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getBadgeClasses } from '@/components/shared/StatusBadge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, RotateCcw, AlertCircle, Info } from 'lucide-react'
import { toast } from 'sonner'
import { apiGet, apiPut } from '@/lib/api'

// New error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader'

interface SeverityThreshold {
  id: string
  impactType: 'POPULATION' | 'PRELIMINARY'
  severityLevel: 'MEDIUM' | 'HIGH' | 'CRITICAL'
  livesLostMin: number
  injuredMin?: number
  displacedMin?: number
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface SeverityThresholdTableProps {
  impactType: string
}

const defaultThresholds: Record<string, SeverityThreshold[]> = {
  POPULATION: [
    {
      id: 'pop_medium',
      impactType: 'POPULATION',
      severityLevel: 'MEDIUM',
      livesLostMin: 1,
      injuredMin: 1,
      description: 'Any casualties reported',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'pop_high',
      impactType: 'POPULATION',
      severityLevel: 'HIGH',
      livesLostMin: 11,
      injuredMin: 101,
      description: 'Significant casualties (>10 deaths OR >100 injured)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'pop_critical',
      impactType: 'POPULATION',
      severityLevel: 'CRITICAL',
      livesLostMin: 101,
      injuredMin: 501,
      description: 'Mass casualties (>100 deaths OR >500 injured)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  PRELIMINARY: [
    {
      id: 'prelim_medium',
      impactType: 'PRELIMINARY',
      severityLevel: 'MEDIUM',
      livesLostMin: 1,
      injuredMin: 1,
      displacedMin: 1,
      description: 'Any casualties or displacement reported',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prelim_high',
      impactType: 'PRELIMINARY',
      severityLevel: 'HIGH',
      livesLostMin: 11,
      injuredMin: 51,
      displacedMin: 501,
      description: 'Significant impact (>10 deaths OR >50 injured OR >500 displaced)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prelim_critical',
      impactType: 'PRELIMINARY',
      severityLevel: 'CRITICAL',
      livesLostMin: 51,
      displacedMin: 1001,
      description: 'Mass casualties/displacement (>50 deaths OR >1000 displaced)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

export function SeverityThresholdTable({ impactType }: SeverityThresholdTableProps) {
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<SeverityThreshold>>>({})
  const queryClient = useQueryClient()

  // Fetch severity thresholds for this impact type
  const fetchSeverityThresholds = async () => {
    try {
      const response = await apiGet(`/api/v1/severity-thresholds?impactType=${impactType}`)
      if (!response.success) {
        // Return default thresholds if API fails
        return defaultThresholds[impactType] || []
      }
      return response.data as SeverityThreshold[]
    } catch (error) {
      // Return default thresholds if API fails
      return defaultThresholds[impactType] || []
    }
  }

  // Update severity threshold mutation
  const updateThresholdMutation = useMutation({
    mutationFn: async ({ id, threshold }: { id: string, threshold: Partial<SeverityThreshold> }) => {
      const response = await apiPut(`/api/v1/severity-thresholds/${id}`, threshold)
      if (!response.success) {
        throw new Error(response.error || 'Failed to update threshold')
      }
      return response.data
    },
    onSuccess: (data, variables) => {
      // Update the query cache immediately
      queryClient.setQueryData(['severityThresholds', impactType], (oldData: SeverityThreshold[] | undefined) => {
        if (!oldData) return oldData
        return oldData.map(threshold => 
          threshold.id === variables.id 
            ? { ...threshold, ...variables.threshold, updatedAt: new Date().toISOString() }
            : threshold
        )
      })
      
      // Remove from pending changes
      setPendingChanges(prev => {
        const { [variables.id]: removed, ...rest } = prev
        return rest
      })
      
      toast.success('Threshold updated successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to update threshold: ${error.message}`)
    }
  })

  // Handle threshold field changes
  const handleThresholdChange = (thresholdId: string, field: keyof SeverityThreshold, value: string | number) => {
    setPendingChanges(prev => ({
      ...prev,
      [thresholdId]: {
        ...prev[thresholdId],
        [field]: typeof value === 'string' ? (field.includes('Min') ? parseInt(value) || 0 : value) : value
      }
    }))
  }

  // Save pending changes
  const handleSaveChanges = async (thresholdId: string) => {
    const changes = pendingChanges[thresholdId]
    if (!changes || Object.keys(changes).length === 0) {
      toast.error('No changes to save')
      return
    }

    updateThresholdMutation.mutate({ id: thresholdId, threshold: changes })
  }

  // Reset pending changes
  const handleResetChanges = (thresholdId: string) => {
    setPendingChanges(prev => {
      const { [thresholdId]: removed, ...rest } = prev
      return rest
    })
  }

  // Get display value with pending changes
  const getDisplayValue = (threshold: SeverityThreshold, field: keyof SeverityThreshold) => {
    const pendingValue = pendingChanges[threshold.id]?.[field]
    return pendingValue !== undefined ? pendingValue : threshold[field]
  }

  return (
    <SafeDataLoader
      queryFn={fetchSeverityThresholds}
      fallbackData={defaultThresholds[impactType] || []}
      loadingMessage="Loading severity thresholds..."
      errorTitle="Failed to load severity thresholds"
    >
      {(thresholds, isLoading, error, retry) => (
        <div className="space-y-4">
          {!thresholds || thresholds.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Thresholds Configured</h3>
                <p className="text-gray-600">
                  No severity thresholds are configured for {impactType.toLowerCase()} impact.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Severity Level Cards */}
              <div className="space-y-4">
                {(thresholds || [])
                  .sort((a, b) => {
                    const order = { 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3 }
                    return order[a.severityLevel] - order[b.severityLevel]
                  })
                  .map((threshold) => {
                    const hasPendingChanges = pendingChanges[threshold.id] && Object.keys(pendingChanges[threshold.id]).length > 0
                    
                    return (
                      <Card key={threshold.id} className={`${hasPendingChanges ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className={`${getBadgeClasses('severity', threshold.severityLevel)} border`}>
                                {threshold.severityLevel}
                              </Badge>
                              <div>
                                <CardTitle className="text-lg">{threshold.severityLevel} Severity</CardTitle>
                                <CardDescription>{threshold.description}</CardDescription>
                              </div>
                            </div>
                            {hasPendingChanges && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResetChanges(threshold.id)}
                                  className="text-xs"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Reset
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveChanges(threshold.id)}
                                  disabled={updateThresholdMutation.isPending}
                                  className="text-xs"
                                >
                                  {updateThresholdMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Save className="h-3 w-3 mr-1" />
                                  )}
                                  Save
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Lives Lost Threshold */}
                            <div className="space-y-2">
                              <Label htmlFor={`${threshold.id}-lives`} className="text-sm font-medium">
                                Lives Lost (minimum)
                              </Label>
                              <Input
                                id={`${threshold.id}-lives`}
                                type="number"
                                min="0"
                                value={getDisplayValue(threshold, 'livesLostMin') as number}
                                onChange={(e) => handleThresholdChange(threshold.id, 'livesLostMin', e.target.value)}
                                className="text-sm"
                              />
                            </div>

                            {/* Injured Threshold - only for thresholds that have it */}
                            {threshold.injuredMin !== undefined && (
                              <div className="space-y-2">
                                <Label htmlFor={`${threshold.id}-injured`} className="text-sm font-medium">
                                  Injured (minimum)
                                </Label>
                                <Input
                                  id={`${threshold.id}-injured`}
                                  type="number"
                                  min="0"
                                  value={getDisplayValue(threshold, 'injuredMin') as number}
                                  onChange={(e) => handleThresholdChange(threshold.id, 'injuredMin', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            )}

                            {/* Displaced Threshold - only for preliminary */}
                            {threshold.displacedMin !== undefined && (
                              <div className="space-y-2">
                                <Label htmlFor={`${threshold.id}-displaced`} className="text-sm font-medium">
                                  Displaced (minimum)
                                </Label>
                                <Input
                                  id={`${threshold.id}-displaced`}
                                  type="number"
                                  min="0"
                                  value={getDisplayValue(threshold, 'displacedMin') as number}
                                  onChange={(e) => handleThresholdChange(threshold.id, 'displacedMin', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          <div className="mt-4 space-y-2">
                            <Label htmlFor={`${threshold.id}-description`} className="text-sm font-medium">
                              Description
                            </Label>
                            <Input
                              id={`${threshold.id}-description`}
                              value={getDisplayValue(threshold, 'description') as string}
                              onChange={(e) => handleThresholdChange(threshold.id, 'description', e.target.value)}
                              className="text-sm"
                              placeholder="Describe when this severity level should be applied"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>

              {/* Information */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Threshold Logic</p>
                      <p>
                        Severity is determined by the <strong>highest threshold met</strong>. 
                        For example, if any condition for HIGH is met, the badge shows HIGH even if MEDIUM conditions are also met.
                        Use &quot;OR&quot; logic: if <em>any</em> field exceeds its threshold, that severity applies.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </SafeDataLoader>
  )
}