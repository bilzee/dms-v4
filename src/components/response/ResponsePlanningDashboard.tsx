'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { DataCardGrid } from '@/components/shared/DataCardGrid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { Package, Edit, Plus, AlertTriangle, Clock, CheckCircle, Truck } from '@/lib/icons'

import { ResponseService } from '@/lib/services/response-client.service'
import { useAuth } from '@/hooks/useAuth'
import { type SeverityLevel } from '@/lib/utils/status-colors'
import type { FilterConfig } from '@/components/shared/SearchToolbar'

interface ResponsePlanningDashboardProps {
  onCreateResponse: () => void
  onEditResponse: (responseId: string) => void
}

const getPlanSeverity = (priority: string): SeverityLevel => {
  switch (priority) {
    case 'CRITICAL': return 'critical'
    case 'HIGH': return 'high'
    case 'MEDIUM': return 'medium'
    case 'LOW': return 'low'
    default: return 'neutral'
  }
}

const typeFilterOptions = [
  { label: 'Health', value: 'HEALTH' },
  { label: 'WASH', value: 'WASH' },
  { label: 'Shelter', value: 'SHELTER' },
  { label: 'Food', value: 'FOOD' },
  { label: 'Security', value: 'SECURITY' },
  { label: 'Population', value: 'POPULATION' },
  { label: 'Logistics', value: 'LOGISTICS' },
]

const priorityFilterOptions = [
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
]

const sortFilterOptions = [
  { label: 'Planned Date', value: 'plannedDate' },
  { label: 'Priority', value: 'priority' },
  { label: 'Last Updated', value: 'updatedAt' },
]

const filterConfigs: FilterConfig[] = [
  { key: 'type', label: 'Filter by type', options: typeFilterOptions },
  { key: 'priority', label: 'Filter by priority', options: priorityFilterOptions },
  { key: 'sort', label: 'Sort by', options: sortFilterOptions },
]

const priorityOrder: Record<string, number> = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }

export function ResponsePlanningDashboard({ 
  onCreateResponse, 
  onEditResponse 
}: ResponsePlanningDashboardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('plannedDate')

  const { data: responsesData = [], isLoading, error, refetch } = useQuery({
    queryKey: ['responses', 'planned', 'dashboard', (user as any)?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      return await ResponseService.getPlannedResponsesForResponder({
        page: 1,
        limit: 100
      })
    },
    enabled: !!user
  })

  const responses = (responsesData as any)?.responses || []
  const total = (responsesData as any)?.total || 0

  const filteredResponses = responses
    .filter((response: any) => {
      const matchesSearch = searchTerm === '' || 
        response.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.assessment?.rapidAssessmentType.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = filterType === 'all' || response.type === filterType
      const matchesPriority = filterPriority === 'all' || response.priority === filterPriority
      
      return matchesSearch && matchesType && matchesPriority
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case 'plannedDate':
          return new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime()
        case 'priority':
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'updatedAt':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        default:
          return 0
      }
    })

  const criticalCount = responses.filter((r: any) => r.priority === 'CRITICAL').length
  const highCount = responses.filter((r: any) => r.priority === 'HIGH').length
  const todayCount = responses.filter((r: any) => {
    return new Date(r.createdAt).toDateString() === new Date().toDateString()
  }).length

  const handleFilterChange = (key: string, value: string) => {
    switch (key) {
      case 'type':
        setFilterType(value || 'all')
        break
      case 'priority':
        setFilterPriority(value || 'all')
        break
      case 'sort':
        setSortBy(value || 'plannedDate')
        break
    }
  }

  const filterValues = {
    type: filterType !== 'all' ? filterType : '',
    priority: filterPriority !== 'all' ? filterPriority : '',
    sort: sortBy !== 'plannedDate' ? sortBy : '',
  }

  const hasActiveFilters = searchTerm || filterType !== 'all' || filterPriority !== 'all'

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load response plans. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <StatCardGrid columns={4}>
        <StatCard
          label="Total Plans"
          value={total}
          severity="info"
          icon={Package}
        />
        <StatCard
          label="Critical Priority"
          value={criticalCount}
          severity="critical"
          icon={AlertTriangle}
        />
        <StatCard
          label="High Priority"
          value={highCount}
          severity="high"
          icon={Clock}
        />
        <StatCard
          label="Created Today"
          value={todayCount}
          severity="success"
          icon={CheckCircle}
        />
      </StatCardGrid>

      <DataCardGrid
        columns={3}
        data={filteredResponses}
        loading={isLoading}
        emptyMessage={hasActiveFilters ? 'No matching response plans found' : 'No Response Plans Yet'}
        emptyType={hasActiveFilters ? 'search' : 'data'}
        title="Response Plans"
        description="Manage and organize your response planning activities"
        headerActions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{filteredResponses.length}</Badge>
            <Button onClick={onCreateResponse} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Plan
            </Button>
          </div>
        }
        searchable
        searchPlaceholder="Search by type, description, or assessment..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filterConfigs}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onCardClick={(response) => onEditResponse(response.id)}
        renderCard={(response: any) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant={
                      response.priority === 'CRITICAL' ? 'destructive' :
                      response.priority === 'HIGH' ? 'default' :
                      'secondary'
                    }
                    className="shrink-0"
                  >
                    {response.priority}
                  </Badge>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(response.plannedDate).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {response.type}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {response.assessment?.rapidAssessmentType} Assessment
                  </p>
                </div>
              </div>
            </div>

            {response.description && (
              <div>
                <p className="text-sm line-clamp-2">{response.description}</p>
              </div>
            )}
            
            <div>
              <h4 className="font-medium text-sm mb-2">Items</h4>
              <div className="space-y-1">
                {(() => {
                  const items = Array.isArray(response.items) ? response.items : []
                  return (
                    <>
                      {items.slice(0, 2).map((item: any, index: number) => (
                        <div key={index} className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{item.quantity} {item.unit}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{item.name}</span>
                          </span>
                          {item.category && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                      ))}
                      {items.length > 2 && (
                        <div className="text-sm text-muted-foreground">
                          +{items.length - 2} more items...
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {response.deliveryStatus}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Updated {new Date(response.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {response.deliveryStatus === 'PLANNED' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/responder/responses/${response.id}/deliver`)
                    }}
                    className="flex items-center gap-1"
                  >
                    <Truck className="h-3 w-3" />
                    Document Delivery
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditResponse(response.id)
                  }}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  )
}
