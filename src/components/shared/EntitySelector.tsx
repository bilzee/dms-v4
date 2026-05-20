'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

// External libraries
import { MapPin, Users, AlertCircle, RefreshCw } from 'lucide-react'

// UI components
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Internal services and hooks
import type { Entity } from '@/lib/services/entity-assignment.service'
import { useAuthStore } from '@/stores/auth.store'
import { apiGet, extractArray } from '@/lib/api'
import { useFilteredEntities } from '@/hooks/useEntities'
import { EntitySelectorSkeleton } from './EntitySelectorSkeleton'

interface EntitySelectorProps {
  value?: string
  onValueChange: (entityId: string) => void
  disabled?: boolean
  showAssignmentInfo?: boolean
  className?: string
}

interface EntityWithAssignment extends Entity {
  assignedUsersCount?: number
  canCreateAssessment?: boolean
}

export function EntitySelector({ 
  value, 
  onValueChange, 
  disabled = false,
  showAssignmentInfo = true,
  className 
}: EntitySelectorProps) {
  const { user, token } = useAuthStore()
  const [selectedEntity, setSelectedEntity] = useState<EntityWithAssignment | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // TanStack Query hook for entities with assignment info
  const { data: entities = [], isLoading, error, refetch } = useQuery({
    queryKey: ['entities', 'with-assignment-info', (user as any)?.id],
    queryFn: async () => {
      if (!user || !token) {
        throw new Error('User not authenticated')
      }

      // Get entities available for assessment by this user via API
      const result = await apiGet(`/api/entities/available-for-assessment?userId=${(user as any).id}`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch available entities')
      }
      const d = result.data as any
      return d?.entities || extractArray(d)
    },
    enabled: !!user && !!token && isClient, // Only run query on client side after hydration
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  })


  useEffect(() => {
    if (value) {
      const selected = entities.find((e: any) => e.id === value)
      setSelectedEntity(selected || null)
    } else {
      setSelectedEntity(null)
    }
  }, [value, entities])

  const handleEntityChange = (entityId: string) => {
    const selected = entities.find((e: any) => e.id === entityId)
    setSelectedEntity(selected || null)
    onValueChange(entityId)
  }

  const loadEntities = () => {
    refetch()
  }

  const getEntityTypeColor = (type: string): "default" | "destructive" | "outline" | "secondary" => {
    const typeColors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      'COMMUNITY': 'default',
      'WARD': 'secondary',
      'LGA': 'outline',
      'STATE': 'destructive',
      'FACILITY': 'default',
      'CAMP': 'secondary'
    }
    return typeColors[type] || 'outline'
  }

  const getAssignmentStatus = (entity: EntityWithAssignment) => {
    if (!entity.canCreateAssessment) {
      return { status: 'unauthorized', color: 'destructive', text: 'Not Authorized' }
    }
    
    if (entity.assignedUsersCount === 0) {
      return { status: 'unassigned', color: 'secondary', text: 'No Assignees' }
    }
    
    if (entity.assignedUsersCount === 1) {
      return { status: 'assigned', color: 'default', text: 'Assigned' }
    }
    
    return { status: 'shared', color: 'default', text: 'Shared Assignment' }
  }

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please log in to select an entity for assessment.
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return <EntitySelectorSkeleton className={className} />
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load entities'}
        </AlertDescription>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      </Alert>
    )
  }

  if (entities.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No entities are currently assigned to you for assessment. 
          Please contact your coordinator to get entity assignments.
        </AlertDescription>
        <Button variant="outline" size="sm" onClick={loadEntities} className="ml-2">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={handleEntityChange} disabled={disabled}>
        <SelectTrigger className={className} data-testid="entity-select">
          <SelectValue placeholder="Select an entity to assess">
            {selectedEntity ? (
              <div className="flex items-center justify-between w-full">
                <span className="truncate">{selectedEntity.name}</span>
                <Badge variant={getEntityTypeColor(selectedEntity.type)} className="ml-2">
                  {selectedEntity.type}
                </Badge>
              </div>
            ) : (
              'Select an entity to assess'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {entities.map((entity: any) => {
            const assignmentStatus = getAssignmentStatus(entity)
            return (
              <SelectItem 
                key={entity.id} 
                value={entity.id}
                disabled={!entity.canCreateAssessment}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <span className="truncate max-w-[200px]">{entity.name}</span>
                    <Badge variant={getEntityTypeColor(entity.type)}>
                      {entity.type}
                    </Badge>
                  </div>
                  {showAssignmentInfo && (
                    <div className="flex items-center space-x-1">
                      {entity.assignedUsersCount > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Users className="h-3 w-3 mr-1" />
                          {entity.assignedUsersCount}
                        </div>
                      )}
                      <Badge variant={assignmentStatus.color as any} className="text-xs">
                        {assignmentStatus.text}
                      </Badge>
                    </div>
                  )}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {selectedEntity && showAssignmentInfo && (
        <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {selectedEntity.location && (
                <div className="flex items-center text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {selectedEntity.location}
                </div>
              )}
              <Badge variant={getAssignmentStatus(selectedEntity).color as any} className="text-xs">
                {getAssignmentStatus(selectedEntity).text}
              </Badge>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Users className="h-3 w-3 mr-1" />
              {selectedEntity.assignedUsersCount} assignee(s)
            </div>
          </div>
        </div>
      )}

      {selectedEntity && !selectedEntity.canCreateAssessment && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have permission to create assessments for this entity. 
            Please contact your coordinator for proper assignment.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}