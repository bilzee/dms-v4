'use client'

import { useState, useEffect } from 'react'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataCardList, type ExpandedCardProps } from '@/components/shared/DataCardList'
import { type SeverityLevel } from '@/lib/utils/status-colors'
import { PlusCircle, Activity, FileText, Clock, CheckCircle, AlertTriangle, Filter, X, MessageSquare, XCircle } from '@/lib/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiGet, extractArray } from '@/lib/api'
import { RapidAssessment, Entity, Incident } from '@prisma/client'

// Type for assessment with entity and incident relations
type RapidAssessmentWithEntity = RapidAssessment & {
  entity?: Entity | null
  incident?: Incident | null
}

const assessmentTypes = [
  { value: 'HEALTH', label: 'Health Assessment' },
  { value: 'POPULATION', label: 'Population Assessment' },
  { value: 'FOOD', label: 'Food Security Assessment' },
  { value: 'WASH', label: 'WASH Assessment' },
  { value: 'SHELTER', label: 'Shelter Assessment' },
  { value: 'SECURITY', label: 'Security Assessment' }
]

const statusOptions = [
  { value: 'ALL', label: 'All Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
]

const priorityOptions = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

const dateFilterOptions = [
  { value: 'ALL', label: 'All Dates' },
  { value: 'BEFORE', label: 'Created Before' },
  { value: 'ON', label: 'Created On' },
  { value: 'AFTER', label: 'Created After' },
]

export default function AssessorRapidAssessmentsPage() {
  const [selectedType, setSelectedType] = useState<string>('')
  const [assessments, setAssessments] = useState<RapidAssessmentWithEntity[]>([])
  const [filteredAssessments, setFilteredAssessments] = useState<RapidAssessmentWithEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { token } = useAuth()

  // Filter states
  const [filters, setFilters] = useState({
    type: 'ALL',
    status: 'ALL',
    priority: 'ALL',
    dateFilter: 'ALL',
    filterDate: '',
    entityName: ''
  })

  const [showFilters, setShowFilters] = useState(false)
  const [selectedAssessmentForReason, setSelectedAssessmentForReason] = useState<RapidAssessmentWithEntity | null>(null)
  const [showReasonDialog, setShowReasonDialog] = useState(false)

  // Build query params from filters
  const buildQueryParams = () => {
    const params = new URLSearchParams()
    params.append('userId', 'me')
    
    if (filters.type !== 'ALL') params.append('type', filters.type)
    if (filters.status !== 'ALL') {
      params.append('verificationStatus', filters.status)
    }
    if (filters.priority !== 'ALL') params.append('priority', filters.priority)
    
    return params.toString()
  }

  // Fetch assessments from API
  const fetchAssessments = async () => {
    try {
      if (token) {
        const queryParams = buildQueryParams()
        const result = await apiGet(`/api/v1/rapid-assessments?${queryParams}`)
        
        if (result.success) {
          const allAssessments: RapidAssessmentWithEntity[] = extractArray(result.data)
          setAssessments(allAssessments)
          
          // Apply client-side filtering for entity name and date filtering
          const filtered = allAssessments.filter(assessment => {
            const matchesEntity = !filters.entityName || 
              assessment.entity?.name?.toLowerCase().includes(filters.entityName.toLowerCase())
            
            let matchesDate = true
            if (filters.dateFilter !== 'ALL' && filters.filterDate) {
              const assessmentDate = new Date(assessment.createdAt).toDateString()
              const filterDateObj = new Date(filters.filterDate).toDateString()
              
              switch (filters.dateFilter) {
                case 'BEFORE':
                  matchesDate = assessmentDate < filterDateObj
                  break
                case 'ON':
                  matchesDate = assessmentDate === filterDateObj
                  break
                case 'AFTER':
                  matchesDate = assessmentDate > filterDateObj
                  break
              }
            }
            
            return matchesEntity && matchesDate
          })
          
          setFilteredAssessments(filtered)
        }
      }
    } catch (error) {
      console.error('Error fetching assessments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Refetch when filters change
  useEffect(() => {
    fetchAssessments()
  }, [token, filters])

  // Listen for new assessment creation events
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'assessment-created' && event.newValue) {
        // Refresh assessments when a new one is created
        const fetchAssessments = async () => {
          try {
            if (token) {
              const result = await apiGet(`/api/v1/rapid-assessments?userId=me`)
              
              if (result.success) {
                setAssessments(extractArray(result.data))
              }
            }
          } catch (error) {
            console.error('Error refreshing assessments:', error)
          }
        }

        fetchAssessments()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [token])

  const handleNewAssessment = () => {
    if (selectedType) {
      router.push(`/assessor/rapid-assessments/new?type=${selectedType}`)
    }
  }

  const handleShowReason = async (assessment: any) => {
    try {
      // Fetch the detailed assessment to get the rejection reason
      const result = await apiGet(`/api/v1/rapid-assessments/${assessment.id}`)
      
      if (result.success) {
        setSelectedAssessmentForReason(result.data)
        setShowReasonDialog(true)
      } else {
        console.error('Failed to fetch assessment details:', result.error)
      }
    } catch (error) {
      console.error('Error fetching assessment details:', error)
    }
  }

  const getStatusBadge = (assessment: any) => {
    switch (assessment.verificationStatus) {
      case 'VERIFIED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
      case 'AUTO_VERIFIED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Auto-Verified</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Rejected</Badge>
      case 'SUBMITTED':
        return <Badge className="bg-yellow-100 text-yellow-800"><FileText className="w-3 h-3 mr-1" />Pending Review</Badge>
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" />Draft</Badge>
      default:
        return <Badge variant="outline">{assessment.verificationStatus}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge className="bg-red-100 text-red-800 text-xs font-medium">CRITICAL</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-100 text-orange-800 text-xs font-medium">HIGH</Badge>
      case 'MEDIUM':
        return <Badge className="bg-blue-100 text-blue-800 text-xs font-medium">MEDIUM</Badge>
      case 'LOW':
        return <Badge className="bg-green-100 text-green-800 text-xs font-medium">LOW</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 text-xs font-medium">{priority || 'MEDIUM'}</Badge>
    }
  }

  const formatIncidentDisplay = (incident: any) => {
    if (!incident) return 'Unknown Incident'
    
    const type = incident.type || 'Unknown'
    const subType = incident.subType ? `-${incident.subType}` : ''
    const date = incident.createdAt ? new Date(incident.createdAt).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).replace(/\s+/g, '') : ''
    
    return `${type}${subType}${date ? `-${date}` : ''}`
  }

  const getAssessmentSeverity = (priority: string): SeverityLevel => {
    switch (priority) {
      case 'CRITICAL':
        return 'critical'
      case 'HIGH':
        return 'high'
      case 'MEDIUM':
        return 'medium'
      case 'LOW':
        return 'low'
      default:
        return 'neutral'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'HEALTH':
        return <Activity className="w-4 h-4 text-red-500" />
      case 'FOOD':
        return <div className="w-4 h-4 text-orange-500">🍎</div>
      case 'SHELTER':
        return <div className="w-4 h-4 text-blue-500">🏠</div>
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />
    }
  }

  return (
    <RoleBasedRoute requiredRole="ASSESSOR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rapid Assessments</h1>
            <p className="text-muted-foreground mt-2">
              Manage and create rapid assessments for affected communities
            </p>
          </div>
          
          {/* New Assessment Button */}
          <div className="flex items-center gap-4">
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-64 h-10 px-3 py-2 border rounded-md"
              data-testid="assessment-type-select"
            >
              <option value="">Select assessment type</option>
              {assessmentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <Button 
              onClick={handleNewAssessment}
              disabled={!selectedType}
              data-testid="new-assessment-button"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
          </div>
        </div>

        <StatCardGrid columns={5} gap="lg">
          <StatCard label="Total Assessments" value={filteredAssessments.length} severity="info" icon={FileText} />
          <StatCard label="Submitted" value={filteredAssessments.filter(a => a.verificationStatus === 'SUBMITTED').length} severity="success" icon={CheckCircle} />
          <StatCard label="Drafts" value={filteredAssessments.filter(a => a.verificationStatus === 'DRAFT').length} severity="warning" icon={Clock} />
          <StatCard label="Rejected" value={filteredAssessments.filter(a => a.verificationStatus === 'REJECTED').length} severity="critical" icon={XCircle} />
          <StatCard label="Critical Gaps" value={filteredAssessments.reduce((sum, a) => {
            const gapCount = a.gapAnalysis ? Object.keys(a.gapAnalysis).length : 0
            return sum + gapCount
          }, 0)} severity="high" icon={AlertTriangle} />
        </StatCardGrid>

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {/* Entity Name Filter */}
                <div>
                  <Label htmlFor="entityName">Entity Name</Label>
                  <Input
                    id="entityName"
                    placeholder="Search entity..."
                    value={filters.entityName}
                    onChange={(e) => setFilters(prev => ({ ...prev, entityName: e.target.value }))}
                  />
                </div>

                {/* Assessment Type Filter */}
                <div>
                  <Label htmlFor="typeFilter">Assessment Type</Label>
                  <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      {assessmentTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div>
                  <Label htmlFor="statusFilter">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div>
                  <Label htmlFor="priorityFilter">Priority</Label>
                  <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter Type */}
                <div>
                  <Label htmlFor="dateFilter">Date Filter</Label>
                  <Select value={filters.dateFilter} onValueChange={(value) => setFilters(prev => ({ ...prev, dateFilter: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All dates" />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFilterOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Date */}
                <div>
                  <Label htmlFor="filterDate">Filter Date</Label>
                  <Input
                    id="filterDate"
                    type="date"
                    value={filters.filterDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, filterDate: e.target.value }))}
                    disabled={filters.dateFilter === 'ALL'}
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({
                    type: 'ALL',
                    status: 'ALL',
                    priority: 'ALL',
                    dateFilter: 'ALL',
                    filterDate: '',
                    entityName: ''
                  })}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        <DataCardList
          title="Recent Assessments"
          description="Your latest rapid assessment activities"
          data={filteredAssessments}
          loading={isLoading}
          emptyMessage={assessments.length === 0 ? "No assessments found. Create your first assessment!" : "No assessments match the current filters."}
          getSeverity={(a: any) => getAssessmentSeverity(a.priority)}
          renderCard={(assessment: any, { isExpanded, toggleExpand }: ExpandedCardProps) => (
            <div
              className="flex items-center justify-between"
              data-testid={`assessment-row-${assessment.rapidAssessmentType?.toLowerCase()}-${assessment.id}`}
            >
              <div className="flex items-center gap-4">
                {getTypeIcon(assessment.rapidAssessmentType)}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{assessment.rapidAssessmentType} Assessment</h3>
                    {getPriorityBadge(assessment.priority)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Entity:</span> {assessment.entity?.name || 'Unknown Entity'}
                    {assessment.incident && (
                      <span className="ml-3">
                        <span className="font-medium">Incident:</span> {formatIncidentDisplay(assessment.incident)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(assessment.createdAt).toLocaleDateString()} at{' '}
                    {new Date(assessment.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {(() => {
                  const gapCount = assessment.gapAnalysis ? Object.keys(assessment.gapAnalysis).length : 0
                  return gapCount > 0 && (
                    <Badge
                      variant="destructive"
                      data-testid={`gap-indicator-${assessment.id}`}
                    >
                      {gapCount} Gaps
                    </Badge>
                  )
                })()}
                {getStatusBadge(assessment)}
                {assessment.verificationStatus === 'REJECTED' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/assessor/rapid-assessments/${assessment.id}/edit`)}
                      data-testid={`edit-${assessment.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowReason(assessment)}
                      data-testid={`reason-${assessment.id}`}
                    >
                      Reason
                    </Button>
                  </>
                )}
                <Link href={`/assessor/rapid-assessments/${assessment.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          )}
        />

        {/* Rejection Reason Dialog */}
        <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Rejection Reason
              </DialogTitle>
              <DialogDescription>
                The reason provided by the coordinator for rejecting this assessment
              </DialogDescription>
            </DialogHeader>
            {selectedAssessmentForReason && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">
                    Assessment Details
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p><strong>Type:</strong> {selectedAssessmentForReason.rapidAssessmentType}</p>
                    <p><strong>Entity:</strong> {selectedAssessmentForReason.entity?.name}</p>
                    <p><strong>Incident:</strong> {formatIncidentDisplay(selectedAssessmentForReason.incident)}</p>
                    <p><strong>Date:</strong> {new Date(selectedAssessmentForReason.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">
                    Rejection Reason
                  </h4>
                  <p className="text-sm text-red-800">
                    {selectedAssessmentForReason.rejectionReason || selectedAssessmentForReason.rejectionFeedback || 'No reason provided'}
                  </p>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <strong>Rejected by:</strong> {selectedAssessmentForReason.verifiedBy || 'Unknown'}
                  <br />
                  <strong>Date:</strong> {selectedAssessmentForReason.verifiedAt 
                    ? new Date(selectedAssessmentForReason.verifiedAt).toLocaleString() 
                    : 'Unknown'
                  }
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleBasedRoute>
  )
}