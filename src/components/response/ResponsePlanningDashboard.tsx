'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Icons
import { Package, Edit, Search, Filter, Plus, AlertTriangle, Clock, CheckCircle, Truck } from 'lucide-react'

// Components and services
import { ResponseService } from '@/lib/services/response-client.service'
import { useAuth } from '@/hooks/useAuth'

interface ResponsePlanningDashboardProps {
  onCreateResponse: () => void
  onEditResponse: (responseId: string) => void
}

export function ResponsePlanningDashboard({ 
  onCreateResponse, 
  onEditResponse 
}: ResponsePlanningDashboardProps) {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('plannedDate')

  // Get planned responses
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

  // Filter and sort responses
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
          const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
          return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
        case 'updatedAt':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        default:
          return 0
      }
    })

  // Calculate statistics
  const criticalCount = responses.filter((r: any) => r.priority === 'CRITICAL').length
  const highCount = responses.filter((r: any) => r.priority === 'HIGH').length
  const todayCount = responses.filter((r: any) => {
    return new Date(r.createdAt).toDateString() === new Date().toDateString()
  }).length

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
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-700">{total}</div>
                <div className="text-sm text-blue-600">Total Plans</div>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-700">{criticalCount}</div>
                <div className="text-sm text-red-600">Critical Priority</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-700">{highCount}</div>
                <div className="text-sm text-orange-600">High Priority</div>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-700">{todayCount}</div>
                <div className="text-sm text-green-600">Created Today</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Response Plans
                <Badge variant="secondary">{filteredResponses.length}</Badge>
              </CardTitle>
              <CardDescription>
                Manage and organize your response planning activities
              </CardDescription>
            </div>
            <Button onClick={onCreateResponse} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by type, description, or assessment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="HEALTH">Health</SelectItem>
                <SelectItem value="WASH">WASH</SelectItem>
                <SelectItem value="SHELTER">Shelter</SelectItem>
                <SelectItem value="FOOD">Food</SelectItem>
                <SelectItem value="SECURITY">Security</SelectItem>
                <SelectItem value="POPULATION">Population</SelectItem>
                <SelectItem value="LOGISTICS">Logistics</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plannedDate">Planned Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="updatedAt">Last Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || filterType !== 'all' || filterPriority !== 'all' 
                  ? 'No matching response plans found' 
                  : 'No Response Plans Yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType !== 'all' || filterPriority !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : 'Start by creating your first response plan to manage response resources effectively.'}
              </p>
              {!searchTerm && filterType === 'all' && filterPriority === 'all' && (
                <Button onClick={onCreateResponse} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Plan
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredResponses.map((response: any) => (
                <Card key={response.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer group">
                  <CardHeader className="pb-3">
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
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
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
                            {response.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {new Date(response.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {response.status === 'PLANNED' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => window.location.href = `/responder/responses/${response.id}/deliver`}
                              className="flex items-center gap-1"
                            >
                              <Truck className="h-3 w-3" />
                              Document Delivery
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditResponse(response.id)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
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