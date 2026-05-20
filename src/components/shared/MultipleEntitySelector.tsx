'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Users, AlertCircle, RefreshCw, X, Plus } from 'lucide-react'

// UI components
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'

// Internal services and hooks
import type { Entity } from '@/lib/services/entity-assignment.service'
import { useAuthStore } from '@/stores/auth.store'
import { apiGet, extractArray } from '@/lib/api'

interface MultipleEntitySelectorProps {
  value?: string[]
  onValueChange: (entityIds: string[]) => void
  disabled?: boolean
  showAssignmentInfo?: boolean
  className?: string
  placeholder?: string
}

interface EntityWithAssignment extends Entity {
  assignedUsersCount?: number
  canCreateAssessment?: boolean
}

export function MultipleEntitySelector({ 
  value = [], 
  onValueChange, 
  disabled = false,
  showAssignmentInfo = true,
  className,
  placeholder = "Select affected entities"
}: MultipleEntitySelectorProps) {
  const { user, token } = useAuthStore()
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

  // Calculate selected entities using useMemo to prevent infinite loops
  const selectedEntities = useMemo(() => {
    if (!entities || entities.length === 0 || value.length === 0) {
      return []
    }
    return entities.filter((entity: EntityWithAssignment) => 
      value.includes(entity.id)
    )
  }, [entities, value])

  const handleAddEntity = (entityId: string) => {
    if (!entityId || value.includes(entityId)) return
    
    const newValue = [...value, entityId]
    onValueChange(newValue)
    // Don't immediately clear the selection - let the Select component handle it
  }

  const handleRemoveEntity = (entityId: string) => {
    const newValue = value.filter(id => id !== entityId)
    onValueChange(newValue)
  }

  const availableEntities = (entities || []).filter((entity: EntityWithAssignment) => 
    !value.includes(entity.id)
  )

  if (!isClient) {
    return <div>Loading entities...</div>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load entities. 
          <Button 
            variant="link" 
            className="p-0 h-auto font-normal underline ml-1"
            onClick={() => refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Selected Entities Display */}
        {selectedEntities.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {selectedEntities.map((entity: any) => (
                  <Badge
                    key={entity.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <MapPin className="h-3 w-3" />
                    <span>{entity.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveEntity(entity.id)}
                      disabled={disabled}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              {showAssignmentInfo && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {selectedEntities.length} entit{selectedEntities.length === 1 ? 'y' : 'ies'} selected
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Entity Selection Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              disabled={disabled || isLoading || availableEntities.length === 0}
            >
              <span>
                {isLoading 
                  ? "Loading entities..." 
                  : availableEntities.length === 0
                  ? "All entities selected"
                  : placeholder
                }
              </span>
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full min-w-[300px]">
            {availableEntities?.map((entity: EntityWithAssignment) => (
              <DropdownMenuItem 
                key={entity.id}
                onClick={() => handleAddEntity(entity.id)}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{entity.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {entity.type}
                      </Badge>
                    </div>
                    {entity.location && (
                      <span className="text-xs text-muted-foreground ml-5">
                        {entity.location}
                      </span>
                    )}
                    {showAssignmentInfo && entity.assignedUsersCount !== undefined && (
                      <div className="flex items-center gap-1 ml-5 mt-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {entity.assignedUsersCount} assigned user{entity.assignedUsersCount === 1 ? '' : 's'}
                        </span>
                        {entity.canCreateAssessment && (
                          <Badge variant="outline" className="text-xs ml-1">
                            Can assess
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {availableEntities.length === 0 && selectedEntities.length === 0 && !isLoading && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No entities are available for selection. Please contact your administrator.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}