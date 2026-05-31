'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'

// UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

// Icons
import { Plus, Package, MapPin, AlertTriangle, CheckCircle2, Clock, Truck, XCircle, Filter, Search, Edit, Eye, BarChart3 } from '@/lib/icons'

// Components
import { CommitmentForm } from './CommitmentForm'
import { CommitmentFromPlanForm } from './CommitmentFromPlanForm'
import { ProgressBar } from '@/components/shared/ProgressBar'

// Types
import { DonorCommitment } from '@/types/commitment'

interface CommitmentDashboardProps {
  donorId: string
  preSelectedEntityId?: string
  preSelectedIncidentId?: string
  preSelectedResponseId?: string
}


export function CommitmentDashboard({ donorId, preSelectedEntityId, preSelectedIncidentId, preSelectedResponseId }: CommitmentDashboardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  console.log('CommitmentDashboard received donorId:', donorId, 'preSelectedResponseId:', preSelectedResponseId, 'preSelectedEntityId:', preSelectedEntityId)

  // Helper function to handle different data structures for items
  const getItemsArray = (items: any): any[] => {
    if (!items) return []
    
    // Handle direct array format: [{ name, unit, quantity }]
    if (Array.isArray(items)) {
      return items
    }
    
    // Handle nested object format: { items: [{ name, unit, quantity }] }
    if (items.items && Array.isArray(items.items)) {
      return items.items
    }
    
    return []
  }
  const [showForm, setShowForm] = useState(!!(preSelectedResponseId || preSelectedEntityId))
  const [filters, setFilters] = useState({
    status: 'all',
    incidentId: 'all',
    entityId: preSelectedEntityId || 'all',
    search: ''
  })

  // Fetch commitments
  const { data: commitmentsData, isLoading, error } = useQuery({
    queryKey: ['donor-commitments', donorId, filters],
    enabled: !!donorId,
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value)
      })

      const result = await apiGet(`/api/v1/donors/${donorId}/commitments?${params}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch commitments')
      return result.data
    }
  })

  // Fetch available entities for filter
  const { data: entities } = useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/entities')
      if (!result.success) return []
      const data = result.data
      return Array.isArray(data) ? data : data?.items || []
    }
  })

  // Fetch available incidents for filter
  const { data: incidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/incidents')
      if (!result.success) return []
      const data = result.data
      return Array.isArray(data) ? data : data?.items || []
    }
  })

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      status: 'all',
      incidentId: 'all',
      entityId: 'all',
      search: ''
    })
  }

  const handleCommitmentSuccess = () => {
    setShowForm(false)
    queryClient.invalidateQueries({ queryKey: ['donor-commitments', donorId] })
    toast.success('Commitment created successfully!')
  }

  const COMMITMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    PLANNED: Clock,
    PARTIAL: Truck,
    COMPLETE: CheckCircle2,
    CANCELLED: XCircle
  }

  const getStatusBadge = (status: string) => {
    const Icon = COMMITMENT_ICONS[status] || Clock
    return <StatusBadge domain="commitment" status={status} icon={Icon} />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateTotalValue = (items: any[]) => {
    return items.reduce((total, item) => {
      const estimatedValue = item.estimatedValue || 0
      return total + (estimatedValue * item.quantity)
    }, 0)
  }

  if (showForm && preSelectedResponseId) {
    return (
      <CommitmentFromPlanForm
        donorId={donorId}
        responseId={preSelectedResponseId}
        onSuccess={handleCommitmentSuccess}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowForm(false)}
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Create New Commitment</h1>
        </div>
        <CommitmentForm
          donorId={donorId}
          onSuccess={handleCommitmentSuccess}
          onCancel={() => setShowForm(false)}
          preSelectedEntityId={preSelectedEntityId}
          preSelectedIncidentId={preSelectedIncidentId}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Commitments</h1>
          <p className="text-muted-foreground">
            Manage and track your aid commitments
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Commitment
        </Button>
      </div>

      {commitmentsData?.statistics && (
        <StatCardGrid columns={4}>
          <StatCard
            label="Total Commitments"
            value={Object.values(commitmentsData.statistics.byStatus).reduce((a: number, b) => a + (b as number), 0)}
            severity="info"
            icon={BarChart3}
          />

          <StatCard
            label="Planned"
            value={commitmentsData.statistics.byStatus.PLANNED || 0}
            severity="info"
            icon={Clock}
          />

          <StatCard
            label="In Progress"
            value={commitmentsData.statistics.byStatus.PARTIAL || 0}
            severity="warning"
            icon={Truck}
          />

          <StatCard
            label="Completed"
            value={commitmentsData.statistics.byStatus.COMPLETE || 0}
            severity="success"
            icon={CheckCircle2}
          />
        </StatCardGrid>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search commitments..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PLANNED">Planned</SelectItem>
                <SelectItem value="PARTIAL">In Progress</SelectItem>
                <SelectItem value="COMPLETE">Complete</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.incidentId} onValueChange={(value) => handleFilterChange('incidentId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Incidents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Incidents</SelectItem>
                {incidents?.map((incident: any) => (
                  <SelectItem key={incident.id} value={incident.id}>
                    {incident.type} - {incident.severity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.entityId} onValueChange={(value) => handleFilterChange('entityId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities?.map((entity: any) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Commitments List */}
      <Card>
        <CardHeader>
          <CardTitle>Commitments</CardTitle>
          <CardDescription>
            {commitmentsData?.pagination ? 
              `Showing ${commitmentsData.items?.length || 0} of ${commitmentsData.pagination.total} commitments` :
              'Your aid commitments'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-96 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load commitments. Please try again later.
              </AlertDescription>
            </Alert>
          ) : commitmentsData?.items?.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No commitments found
              </h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first aid commitment.
              </p>
              <Button onClick={() => setShowForm(true)}>
                Create Your First Commitment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {commitmentsData?.items?.map((commitment: DonorCommitment) => (
                <Card key={commitment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {commitment.items.length === 1 
                              ? `${commitment.items[0].quantity} ${commitment.items[0].unit} of ${commitment.items[0].name}`
                              : `${commitment.items.length} items`
                            }
                          </h3>
                          {getStatusBadge(commitment.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{commitment.entity.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>{commitment.incident.type}</span>
                          </div>
                          <div>
                            Created: {formatDate(commitment.commitmentDate)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/donor/dashboard?tab=commitments&detail=${commitment.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        
                        {['PLANNED', 'PARTIAL'].includes(commitment.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/donor/dashboard?tab=commitments&edit=${commitment.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2">Items:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {getItemsArray(commitment.items).map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.quantity} {item.unit} of {item.name}</span>
                            <span className="text-muted-foreground">
                              ${(item.estimatedValue || 0) * item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between text-sm font-medium">
                        <span>Total Est. Value:</span>
                        <span className="text-green-600">
                          ${calculateTotalValue(commitment.items)}
                        </span>
                      </div>
                    </div>

                    {/* Delivery Progress */}
                    {commitment.deliveredQuantity > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Delivery Progress</span>
                          <span>{commitment.deliveredQuantity} / {commitment.totalCommittedQuantity}</span>
                        </div>
                        <ProgressBar value={(commitment.deliveredQuantity / commitment.totalCommittedQuantity) * 100} variant="default" size="sm" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}