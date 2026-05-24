'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

// New error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader'
import { EmptyState, EmptyEntities } from '@/components/shared/EmptyState'
import { StatCard as SharedStatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { 
  Search, 
  MapPin, 
  Building, 
  Eye, 
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Activity,
  Package
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// API utilities
import { apiGet } from '@/lib/api'

interface Entity {
  id: string
  name: string
  type: string
  location?: string
  coordinates?: any
  isActive: boolean
  autoApproveEnabled: boolean
  createdAt: string
  stats: {
    verifiedAssessments: number
    responses: number
    commitments: number
  }
}

interface EntitySelectorProps {
  onEntitySelect?: (entity: Entity) => void
  showStats?: boolean
}

export function EntitySelector({ onEntitySelect, showStats = true }: EntitySelectorProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)

  // Fetch assigned entities
  const fetchEntities = async () => {
    if (!user) throw new Error('User not authenticated')
    
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter)
    
    const result = await apiGet(`/api/v1/donors/entities?${params}`)
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch entities')
    }
    return result.data
  }

  const handleEntityClick = (entity: Entity) => {
    setSelectedEntity(entity)
    if (onEntitySelect) {
      onEntitySelect(entity)
    }
  }

  const handleMakeCommitment = (entity: Entity) => {
    // Navigate to donor dashboard with commitments tab and entity pre-selected
    router.push(`/donor/dashboard?tab=commitments&entityId=${entity.id}`)
  }

  const handleViewAssessments = (entity: Entity) => {
    // Navigate to rapid assessments page filtered by entity
    router.push(`/donor/rapid-assessments?entityId=${entity.id}`)
  }

  const getEntityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'HEALTH_FACILITY': 'bg-red-100 text-red-800',
      'SCHOOL': 'bg-blue-100 text-blue-800',
      'SHELTER': 'bg-green-100 text-green-800',
      'GOVERNMENT_OFFICE': 'bg-purple-100 text-purple-800',
      'COMMUNITY_CENTER': 'bg-orange-100 text-orange-800',
      'RELIEF_CAMP': 'bg-yellow-100 text-yellow-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getActivityLevel = (entity: Entity) => {
    const totalActivities = entity.stats.verifiedAssessments + entity.stats.responses + entity.stats.commitments
    
    if (totalActivities === 0) return { level: 'inactive', color: 'text-gray-500', label: 'No Activity' }
    if (totalActivities < 5) return { level: 'low', color: 'text-blue-500', label: 'Low Activity' }
    if (totalActivities < 15) return { level: 'medium', color: 'text-yellow-500', label: 'Medium Activity' }
    return { level: 'high', color: 'text-green-500', label: 'High Activity' }
  }

  return (
    <div className="space-y-6" data-testid="entity-selector-container">
      <SafeDataLoader
        queryFn={fetchEntities}
        enabled={!!user}
        fallbackData={{ entities: [], summary: { totalAssigned: 0, totalWithResponses: 0, totalWithCommitments: 0 } }}
        loadingMessage="Loading assigned entities..."
        errorTitle="Failed to load entities"
      >
        {(entitiesData, isLoading, error, retry) => {
          const entities = entitiesData?.entities || []
          const summary = entitiesData?.summary || {}

          return (
            <>
              {/* Header and Controls */}
              <div className="flex items-center justify-between" data-testid="entity-selector-header">
                <div>
                  <h2 className="text-2xl font-bold" data-testid="entity-selector-title">Assigned Entities</h2>
                  <p className="text-gray-600" data-testid="entity-selector-description">
                    Entities where you can provide support and make commitments
                  </p>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={retry}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                  Refresh
                </Button>
              </div>

              {/* Summary Stats */}
              <StatCardGrid columns={4} data-testid="entity-summary-stats">
                <SharedStatCard
                  label="Total Assigned"
                  value={summary.totalAssigned || 0}
                  icon={MapPin}
                  severity="info"
                  data-testid="total-assigned-stat"
                />
                <SharedStatCard
                  label="With Responses"
                  value={summary.totalWithResponses || 0}
                  icon={Package}
                  severity="success"
                  data-testid="with-responses-stat"
                />
                <SharedStatCard
                  label="With Commitments"
                  value={summary.totalWithCommitments || 0}
                  icon={CheckCircle}
                  severity="success"
                  data-testid="with-commitments-stat"
                />
                <SharedStatCard
                  label="Available Now"
                  value={entities.filter((e: any) => e.isActive).length}
                  icon={Activity}
                  severity="warning"
                  data-testid="available-now-stat"
                />
              </StatCardGrid>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search entities by name, type, or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="HEALTH_FACILITY">Health Facility</SelectItem>
                  <SelectItem value="SCHOOL">School</SelectItem>
                  <SelectItem value="SHELTER">Shelter</SelectItem>
                  <SelectItem value="GOVERNMENT_OFFICE">Government Office</SelectItem>
                  <SelectItem value="COMMUNITY_CENTER">Community Center</SelectItem>
                  <SelectItem value="RELIEF_CAMP">Relief Camp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(search || typeFilter) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearch('')
                  setTypeFilter('')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

  
      {/* Entities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : entities.length === 0 ? (
          <div className="col-span-full">
            {search || typeFilter ? (
              <EmptyState
                type="search"
                title="No entities found"
                description="No entities match your search criteria. Try adjusting your filters."
                action={{
                  label: "Clear Filters",
                  onClick: () => {
                    setSearch('')
                    setTypeFilter('')
                  },
                  variant: "outline"
                }}
                icon={MapPin}
              />
            ) : (
              <EmptyEntities onRefresh={retry} />
            )}
          </div>
        ) : (
          entities.map((entity: Entity) => {
            const activity = getActivityLevel(entity)
            
            return (
              <Card 
                key={entity.id} 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedEntity?.id === entity.id && "ring-2 ring-blue-500"
                )}
                onClick={() => handleEntityClick(entity)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center">
                        <Building className="h-5 w-5 mr-2 text-gray-400" />
                        {entity.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getEntityTypeColor(entity.type)}>
                          {entity.type.replace('_', ' ')}
                        </Badge>
                        <StatusBadge status={entity.isActive ? 'ONLINE' : 'OFFLINE'} domain="system" label={entity.isActive ? 'Active' : 'Inactive'} />
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className={cn("text-sm font-medium", activity.color)}>
                        {activity.label}
                      </div>
                      {entity.autoApproveEnabled && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Auto-approve
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {entity.location && (
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <MapPin className="h-4 w-4 mr-1" />
                      {entity.location}
                    </div>
                  )}

                  {showStats && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <StatItem
                        label="Assessments"
                        value={entity.stats.verifiedAssessments}
                        icon={Eye}
                        color="text-blue-600"
                      />
                      <StatItem
                        label="Responses"
                        value={entity.stats.responses}
                        icon={Package}
                        color="text-green-600"
                      />
                      <StatItem
                        label="Commitments"
                        value={entity.stats.commitments}
                        icon={CheckCircle}
                        color="text-purple-600"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-xs text-gray-500">
                      Assigned {new Date(entity.createdAt).toLocaleDateString()}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEntityClick(entity)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Selected Entity Detail Modal/Sheet */}
      {selectedEntity && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2 text-blue-600" />
                  {selectedEntity.name}
                </CardTitle>
                <CardDescription>
                  Detailed entity information and activity
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedEntity(null)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Entity Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <Badge className={getEntityTypeColor(selectedEntity.type)}>
                      {selectedEntity.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <StatusBadge status={selectedEntity.isActive ? 'ONLINE' : 'OFFLINE'} domain="system" label={selectedEntity.isActive ? 'Active' : 'Inactive'} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Auto-approve:</span>
                    <Badge variant={selectedEntity.autoApproveEnabled ? "default" : "secondary"}>
                      {selectedEntity.autoApproveEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  {selectedEntity.location && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Location:</span>
                      <span className="text-sm">{selectedEntity.location}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Assigned:</span>
                    <span className="text-sm">{new Date(selectedEntity.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Activity Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Verified Assessments:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {selectedEntity.stats.verifiedAssessments}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Responses Delivered:</span>
                    <span className="text-sm font-medium text-green-600">
                      {selectedEntity.stats.responses}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Commitments Made:</span>
                    <span className="text-sm font-medium text-purple-600">
                      {selectedEntity.stats.commitments}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Activity:</span>
                    <span className="text-sm font-bold">
                      {selectedEntity.stats.verifiedAssessments + selectedEntity.stats.responses + selectedEntity.stats.commitments}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => handleViewAssessments(selectedEntity)}
                >
                  View Assessments
                </Button>
                <Button
                  onClick={() => handleMakeCommitment(selectedEntity)}
                >
                  Make Commitment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
            </>
          )
        }}
      </SafeDataLoader>
    </div>
  )
}


interface StatItemProps {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color?: string
}

function StatItem({ label, value, icon: Icon, color = "text-gray-600" }: StatItemProps) {
  return (
    <div className="text-center">
      <div className={cn("text-lg font-semibold", color)}>
        {value}
      </div>
      <div className="text-xs text-gray-600 flex items-center justify-center">
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </div>
    </div>
  )
}