'use client'

import React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SafeDataLoader } from '@/components/shared/SafeDataLoader'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { Checkbox } from '@/components/ui/checkbox'
import { IncidentCreationForm } from '@/components/forms/incident/IncidentCreationForm'

// Token utilities
import { getAuthToken } from '@/lib/auth/token-utils'
import { apiGet, apiPut, extractArray } from '@/lib/api'
import { 
  MapPin, 
  Users, 
  Activity,
  Trash2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Link,
  ChevronDown
} from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const incidentColumns: ColumnDef<any>[] = [
  {
    key: 'type',
    header: 'Type',
    render: (incident) => (
      <div>
        <div className="font-medium">{incident.type}</div>
        {incident.subType && (
          <div className="text-sm text-muted-foreground">{incident.subType}</div>
        )}
      </div>
    )
  },
  {
    key: 'name',
    header: 'Incident Name',
    render: (incident) => (
      <div className="font-medium">
        {incident.name || `${incident.type} Event ${incident.id?.slice(-3)}`}
      </div>
    )
  },
  {
    key: 'severity',
    header: 'Severity',
    render: (incident) => <StatusBadge status={incident.severity} domain="severity" />
  },
  {
    key: 'status',
    header: 'Status',
    render: (incident) => <StatusBadge status={incident.status} domain="incident" />
  },
  {
    key: 'populationImpact',
    header: 'Population Impact',
    hideOnMobile: true,
    render: (incident) => {
      const impact = incident.populationImpact || {}
      const totalPopulation = impact.totalPopulation || 0
      const livesLost = impact.livesLost || 0
      const injured = impact.injured || 0
      const affectedEntities = impact.affectedEntities || 0
      return (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span>Population: {totalPopulation}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Lives Lost: {livesLost}</span>
            <span>Injured: {injured}</span>
            <span>Entities: {affectedEntities}</span>
          </div>
        </div>
      )
    }
  },
  {
    key: 'assessments',
    header: 'Linked Assessments',
    hideOnMobile: true,
    render: (incident) => (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3 text-blue-600" />
          <span className="text-xs font-medium">
            Prelim: {incident.preliminaryAssessments?.length || 0}
          </span>
          {(incident.preliminaryAssessments?.length || 0) > 0 && (
            <Badge variant="secondary" className="text-xs">
              Linked
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-green-600" />
          <span className="text-xs">
            Rapid: {incident.rapidAssessments?.length || 0}
          </span>
        </div>
      </div>
    )
  }
]

interface IncidentManagementProps {
  className?: string
  initialFilters?: IncidentFilters
  showCreateButton?: boolean
  enableRealTimeUpdates?: boolean
  selectedIncidentId?: string
  onIncidentSelect?: (incident: any) => void
  onIncidentUpdate?: (incident: any) => void
}

interface IncidentFilters {
  status?: string[]
  severity?: string[]
  type?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  location?: string
  hasAssessments?: boolean
  page?: number
  limit?: number
}

interface IncidentManagementState {
  incidents: any[]
  loading: boolean
  error: string | null
  filters: IncidentFilters
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  selectedIncident: any | null
  showCreateModal: boolean
  showEditModal: boolean
  isUpdating: boolean
  showLinkAssessmentDialog: boolean
  incidentToLink: any | null
  availablePreliminaryAssessments: any[]
  linkedPreliminaryAssessments: any[]
  selectedAssessmentIds: string[]
  filtersExpanded?: boolean
}


export function IncidentManagement({
  className,
  initialFilters = {},
  showCreateButton = true,
  enableRealTimeUpdates = true,
  selectedIncidentId,
  onIncidentSelect,
  onIncidentUpdate
}: IncidentManagementProps) {
  const { user } = useAuth()
  const router = useRouter()

  // Fetch incidents
  const fetchIncidents = async () => {
    if (!user) throw new Error('User not authenticated')
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token available')
    const params = new URLSearchParams()
    if (initialFilters.page) params.set('page', initialFilters.page.toString())
    if (initialFilters.limit) params.set('limit', initialFilters.limit.toString())
    if (initialFilters.status?.length) params.set('status', initialFilters.status[0])
    if (initialFilters.severity?.length) params.set('severity', initialFilters.severity[0])
    if (initialFilters.type?.length) params.set('type', initialFilters.type[0])
    if (initialFilters.location) params.set('location', initialFilters.location)
    const result = await apiGet(`/api/v1/incidents?${params.toString()}`)
    if (!result.success) throw new Error('Failed to fetch incidents')
    const raw = result.data as any
    return {
      incidents: extractArray(raw),
      pagination: raw?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    }
  }

  // Fetch incident types
  const fetchIncidentTypes = async () => {
    try {
      const token = getAuthToken()
      if (!token) throw new Error('No authentication token available')
      const result = await apiGet('/api/v1/incidents/types')
      if (!result.success) throw new Error('Failed to fetch incident types')
      const types = extractArray<string>(result.data as any)
      return types.length > 0 ? types : ['Flood', 'Fire', 'Earthquake', 'Landslide', 'Drought', 'Storm', 'Epidemic', 'Conflict', 'Industrial Accident', 'Other']
    } catch (error) {
      return ['Flood', 'Fire', 'Earthquake', 'Landslide', 'Drought', 'Storm', 'Epidemic', 'Conflict', 'Industrial Accident', 'Other']
    }
  }

  // Use mutation for status updates
  const statusMutation = useMutation({
    mutationFn: async ({ incidentId, newStatus }: { incidentId: string; newStatus: string }) => {
      const token = getAuthToken()
      if (!token) throw new Error('No authentication token available')
      const result = await apiPut(`/api/v1/incidents/${incidentId}`, { status: newStatus })
      if (!result.success) {
        console.error('Status update failed:', result.error)
        throw new Error(`Failed to update incident status`)
      }
      return result.data
    },
    onSuccess: (updatedIncident) => {
      // The refetch will be handled by the parent component
      onIncidentUpdate?.(updatedIncident)
    }
  })

  const [state, setState] = useState<IncidentManagementState>({
    incidents: [],
    loading: false,
    error: null,
    filters: initialFilters,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    },
    selectedIncident: null,
    showCreateModal: false,
    showEditModal: false,
    isUpdating: false,
    showLinkAssessmentDialog: false,
    incidentToLink: null,
    availablePreliminaryAssessments: [],
    linkedPreliminaryAssessments: [],
    selectedAssessmentIds: [],
    filtersExpanded: true
  })

  // Real-time updates interval is handled by TanStack Query refetchInterval

  // Filter handlers
  const updateFilters = (newFilters: Partial<IncidentFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      pagination: { ...prev.pagination, page: 1 }
    }))
  }

  const handleIncidentSelect = (incident: any) => {
    setState(prev => ({ ...prev, selectedIncident: incident }))
    onIncidentSelect?.(incident)
    // Navigate to incident detail page where Story 8.2 components are integrated
    router.push(`/coordinator/incidents/${incident.id}`)
  }

  const handleStatusChange = async (incidentId: string, newStatus: string, retry: () => void) => {
    statusMutation.mutate({ incidentId, newStatus }, {
      onSuccess: () => {
        retry() // Refresh the incidents list
      }
    })
  }

  const handleIncidentCreated = async (incidentData?: any, retry?: () => void) => {
    setState(prev => ({ ...prev, showCreateModal: false }))
    retry?.() // Refresh incidents list
  }

  // Handler for opening link assessment dialog
  const handleLinkAssessmentClick = async (incident: any) => {
    try {
      setState(prev => ({ 
        ...prev, 
        showLinkAssessmentDialog: true, 
        incidentToLink: incident,
        selectedAssessmentIds: []
      }))
      
      // Fetch all preliminary assessments
      const token = getAuthToken()
      if (token) {
        const assessResult = await apiGet('/api/v1/preliminary-assessments?limit=100')
        if (assessResult.success) {
          const allAssessments = extractArray(assessResult.data as any)
          const linkedAssessments = allAssessments.filter((assessment: any) =>
            assessment.incidentId === incident.id
          )
          const availableAssessments = allAssessments.filter((assessment: any) =>
            !assessment.incidentId || assessment.incidentId !== incident.id
          )
          setState(prev => ({
            ...prev,
            linkedPreliminaryAssessments: linkedAssessments,
            availablePreliminaryAssessments: availableAssessments
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching preliminary assessments:', error)
    }
  }

  // Handler for closing link assessment dialog
  const handleCloseLinkDialog = () => {
    setState(prev => ({ 
      ...prev, 
      showLinkAssessmentDialog: false, 
      incidentToLink: null, 
      availablePreliminaryAssessments: [],
      linkedPreliminaryAssessments: [],
      selectedAssessmentIds: []
    }))
  }

  // Handler for checkbox selection
  const handleAssessmentSelection = (assessmentId: string, checked: boolean) => {
    setState(prev => ({
      ...prev,
      selectedAssessmentIds: checked 
        ? [...prev.selectedAssessmentIds, assessmentId]
        : prev.selectedAssessmentIds.filter(id => id !== assessmentId)
    }))
  }

  // Handler for linking selected assessments
  const handleLinkSelectedAssessments = async () => {
    if (!state.incidentToLink || state.selectedAssessmentIds.length === 0) {
      return
    }

    try {
      const token = getAuthToken()
      if (token) {
        // Link each selected assessment to the incident
        const linkPromises = state.selectedAssessmentIds.map(assessmentId =>
          apiPut(`/api/v1/preliminary-assessments/${assessmentId}`, {
            data: { incidentId: state.incidentToLink.id }
          })
        )

        await Promise.all(linkPromises)
        
        // Close dialog and refresh data
        handleCloseLinkDialog()
        
        // Refresh incidents data
        try {
          await fetchIncidents()
        } catch (refreshError) {
          console.error('Error refreshing incidents:', refreshError)
        }
      }
    } catch (error) {
      console.error('Error linking assessments:', error)
    }
  }

  // Handler for unlinking assessments
  const handleUnlinkAssessment = async (assessmentId: string) => {
    if (!state.incidentToLink) {
      return
    }

    try {
      const token = getAuthToken()
      if (token) {
        // Unlink the assessment by setting incidentId to null
        const unlinkResult = await apiPut(`/api/v1/preliminary-assessments/${assessmentId}`, {
          data: { incidentId: null }
        })

        if (unlinkResult.success) {
          // Update state to move assessment from linked to available
          setState(prev => {
            // Find the unlinked assessment to move to available
            const unlinkedAssessment = prev.linkedPreliminaryAssessments.find(a => a.id === assessmentId)
            
            return {
              ...prev,
              linkedPreliminaryAssessments: prev.linkedPreliminaryAssessments.filter(a => a.id !== assessmentId),
              availablePreliminaryAssessments: unlinkedAssessment 
                ? [...prev.availablePreliminaryAssessments, unlinkedAssessment]
                : prev.availablePreliminaryAssessments
            }
          })
          
          // Refresh incidents data
          try {
            await fetchIncidents()
          } catch (refreshError) {
            console.error('Error refreshing incidents:', refreshError)
          }
        }
      }
    } catch (error) {
      console.error('Error unlinking assessment:', error)
    }
  }

  return (
    <div className={className}>
      <SafeDataLoader
        queryFn={fetchIncidents}
        enabled={!!user}
        fallbackData={{ incidents: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }}
        loadingMessage="Loading incidents..."
        errorTitle="Failed to load incidents"
      >
        {(incidentsResponse, isLoadingIncidents, incidentsError, retryIncidents) => {
          const incidents = incidentsResponse?.incidents || []
          const pagination = incidentsResponse?.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
          }

          return (
            <SafeDataLoader
              queryFn={fetchIncidentTypes}
              enabled={!!user}
              fallbackData={['Flood', 'Fire', 'Earthquake', 'Landslide', 'Drought', 'Storm', 'Epidemic', 'Conflict', 'Industrial Accident', 'Other']}
              loadingMessage="Loading incident types..."
              errorTitle="Failed to load incident types"
            >
              {(incidentTypes, isLoadingTypes, typesError, retryTypes) => {
                // Filter incidents based on state filters
                const filteredIncidents = incidents.filter((incident: any) => {
                  if (!state.filters) return true
                  
                  if (state.filters.status && !state.filters.status.includes(incident.status)) {
                    return false
                  }
                  
                  if (state.filters.severity && !state.filters.severity.includes(incident.severity)) {
                    return false
                  }
                  
                  if (state.filters.type && !state.filters.type.includes(incident.type)) {
                    return false
                  }
                  
                  if (state.filters.location && !incident.location.toLowerCase().includes(state.filters.location.toLowerCase())) {
                    return false
                  }
                  
                  return true
                })

                return (
                  <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Incident Management</h2>
          <p className="text-muted-foreground hidden sm:block">
            Manage and monitor disaster incidents
            {enableRealTimeUpdates && " • Real-time updates enabled"}
          </p>
        </div>
        
        {showCreateButton && (
          <Dialog open={state.showCreateModal} onOpenChange={(open) => 
            setState(prev => ({ ...prev, showCreateModal: open }))
          }>
            <DialogTrigger asChild>
              <Button 
                size="lg"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Incident</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card shadow-2xl border border-border backdrop-blur-sm"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              <DialogHeader>
                <DialogTitle>Create New Incident</DialogTitle>
                <DialogDescription>
                  Create a new incident record for disaster response coordination
                </DialogDescription>
              </DialogHeader>
              <IncidentCreationForm
                onSubmit={(data) => handleIncidentCreated(data, retryIncidents)}
                onCancel={() => setState(prev => ({ ...prev, showCreateModal: false }))}
                autoSave={true}
                gpsEnabled={true}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>


      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <button
            type="button"
            className="flex w-full items-center justify-between"
            onClick={() => setState(prev => ({ ...prev, filtersExpanded: prev.filtersExpanded === false ? true : false }))}
          >
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform md:hidden", state.filtersExpanded === false && "-rotate-90")} />
          </button>
        </CardHeader>
        <CardContent className={cn(state.filtersExpanded === false && 'hidden md:block')}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search Location</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by location..."
                  value={state.filters.location || ''}
                  onChange={(e) => updateFilters({ location: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={state.filters.status?.[0] || 'all'} 
                onValueChange={(value) => updateFilters({ status: value === 'all' ? undefined : [value] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="CONTAINED">Contained</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity Filter */}
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select 
                value={state.filters.severity?.[0] || 'all'} 
                onValueChange={(value) => updateFilters({ severity: value === 'all' ? undefined : [value] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={state.filters.type?.[0] || 'all'} 
                onValueChange={(value) => updateFilters({ type: value === 'all' ? undefined : [value] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {incidentTypes?.map((type: any) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        title={`Incidents (${filteredIncidents.length})`}
        description="Manage disaster incidents"
        columns={incidentColumns}
        data={filteredIncidents}
        loading={false}
        emptyMessage={state.filters.location || state.filters.status || state.filters.severity || state.filters.type ? 'No incidents match your filters' : 'No incidents created yet'}
        emptyType={state.filters.location || state.filters.status || state.filters.severity || state.filters.type ? 'search' : 'data'}
        expandable={true}
        renderExpanded={(incident: any) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Preliminary Assessments ({incident.preliminaryAssessments?.length || 0})
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleLinkAssessmentClick(incident)}
                >
                  <Link className="h-3 w-3 mr-1" />
                  Manage Links
                </Button>
              </div>
              {(incident.preliminaryAssessments?.length || 0) > 0 ? (
                <div className="space-y-1 text-xs">
                  {incident.preliminaryAssessments?.map((assessment: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-card rounded border">
                      <div>
                        <div className="font-medium">{assessment.reportingLGA}, {assessment.reportingWard}</div>
                        <div className="text-xs text-muted-foreground">
                          {assessment.reportingDate ? new Date(assessment.reportingDate).toLocaleDateString() : 'N/A'} •
                          {assessment.numberLivesLost || 0} lives lost •
                          {assessment.numberDisplaced || 0} displaced
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Linked
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center p-4 bg-muted rounded border-2 border-dashed border-border">
                  <span className="text-xs text-muted-foreground">No preliminary assessments linked</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Additional Details</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Description:</span>
                  <span className="text-right max-w-48 truncate">{incident.description}</span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="text-right">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {incident.location}
                    </div>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sub Type:</span>
                  <span>{incident.subType || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="text-right">
                    {new Date(incident.createdAt).toLocaleDateString()} {new Date(incident.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Created By:</span>
                  <span>{incident.createdByUser?.name || incident.createdByUser?.email || incident.createdBy}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rapid Assessments:</span>
                  <span>{incident.rapidAssessments?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Response Deliveries:</span>
                  <span>{incident.responseDeliveries?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  <Select
                    value={incident.status}
                    onValueChange={(value) => handleStatusChange(incident.id, value, retryIncidents)}
                    disabled={state.isUpdating}
                  >
                    <SelectTrigger className="w-24 h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="CONTAINED">Contained</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}
        actions={[
          {
            label: 'View Details',
            onClick: (incidentId: string) => router.push(`/coordinator/incidents/${incidentId}`),
            icon: FileText
          },
          {
            label: 'Link Assessment',
            onClick: (incidentId: string) => {
              const incident = filteredIncidents.find((inc: any) => inc.id === incidentId)
              if (incident) handleLinkAssessmentClick(incident)
            },
            icon: Link
          },
          {
            label: 'Delete',
            onClick: (incidentId: string) => {},
            icon: Trash2,
            variant: 'destructive' as const
          }
        ]}
        headerActions={
          <Button
            variant="outline"
            size="sm"
            onClick={retryIncidents}
            disabled={isLoadingIncidents}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingIncidents ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />
                  </>
                )
              }}
            </SafeDataLoader>
          )
        }}
      </SafeDataLoader>

      {/* Link Assessment Dialog */}
      <Dialog open={state.showLinkAssessmentDialog} onOpenChange={handleCloseLinkDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Preliminary Assessments</DialogTitle>
            <DialogDescription>
              Link or unlink preliminary assessments for incident: {state.incidentToLink?.type} {state.incidentToLink?.subType ? `- ${state.incidentToLink.subType}` : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-6 space-y-6">
            {/* Linked Assessments Section */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Linked Assessments ({state.linkedPreliminaryAssessments.length})
              </h3>
              
              {state.linkedPreliminaryAssessments.length > 0 ? (
                <div className="space-y-2">
                  {state.linkedPreliminaryAssessments.map((assessment) => (
                    <div key={assessment.id} className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {assessment.reportingLGA}, {assessment.reportingWard}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(assessment.createdAt).toLocaleDateString()} • 
                          {assessment.numberLivesLost} lives lost • 
                          {assessment.numberDisplaced} displaced • 
                          {assessment.numberHousesAffected} houses affected
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnlinkAssessment(assessment.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 border-2 border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground text-sm">No preliminary assessments linked to this incident</p>
                </div>
              )}
            </div>
            
            {/* Available Assessments Section */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Link className="h-4 w-4" />
                Available Assessments ({state.availablePreliminaryAssessments.length})
              </h3>
              
              {state.availablePreliminaryAssessments.length > 0 ? (
                <div className="space-y-2">
                  {state.availablePreliminaryAssessments.map((assessment) => (
                    <div key={assessment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`assessment-${assessment.id}`}
                          checked={state.selectedAssessmentIds.includes(assessment.id)}
                          onCheckedChange={(checked) => handleAssessmentSelection(assessment.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <label htmlFor={`assessment-${assessment.id}`} className="font-medium text-sm cursor-pointer">
                            {assessment.reportingLGA}, {assessment.reportingWard}
                          </label>
                          <div className="text-xs text-muted-foreground">
                            {new Date(assessment.createdAt).toLocaleDateString()} • 
                            {assessment.numberLivesLost} lives lost • 
                            {assessment.numberDisplaced} displaced • 
                            {assessment.numberHousesAffected} houses affected
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 border-2 border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground text-sm">No available preliminary assessments</p>
                  <p className="text-xs text-muted-foreground mt-1">All assessments may already be linked to incidents</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {state.selectedAssessmentIds.length > 0 && (
                <span>{state.selectedAssessmentIds.length} assessment(s) selected</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseLinkDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleLinkSelectedAssessments}
                disabled={state.selectedAssessmentIds.length === 0}
              >
                Link Selected ({state.selectedAssessmentIds.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}