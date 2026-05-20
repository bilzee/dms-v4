'use client'

import { useState, useEffect } from 'react'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PlusCircle, Activity, FileText, Clock, CheckCircle, AlertTriangle, Filter, X, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'
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
      // REJECTED is a verification status, not a regular status
      if (filters.status === 'REJECTED') {
        params.append('verificationStatus', filters.status)
      } else {
        params.append('status', filters.status)
      }
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
          const allAssessments: RapidAssessmentWithEntity[] = result.data || []
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
                setAssessments(result.data || [])
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
    // Use verificationStatus for submitted assessments, otherwise use status
    const displayStatus = assessment.status === 'SUBMITTED' ? assessment.verificationStatus : assessment.status;
    
    switch (displayStatus) {
      case 'VERIFIED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Rejected</Badge>
      case 'PUBLISHED':
      case 'AUTO_VERIFIED':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
      case 'SUBMITTED':
        return <Badge className="bg-yellow-100 text-yellow-800"><FileText className="w-3 h-3 mr-1" />Pending Review</Badge>
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" />Draft</Badge>
      default:
        return <Badge variant="outline">{displayStatus}</Badge>
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'HEALTH':
        return <Activity className="w-4 h-4 text-red-500" />
      case 'FOOD':
        return <div className="w-4 h-4 text-orange-500">🍎</div>
      case 'SHELTER':
        return <div className="w-4 h-4 text-blue-500">🏠</div>
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <RoleBasedRoute requiredRole="ASSESSOR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rapid Assessments</h1>
            <p className="text-gray-600 mt-2">
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
            <Button 
              onClick={handleNewAssessment}
              disabled={!selectedType}
              data-testid="continue-button"
              className="ml-2"
            >
              Continue
            </Button>
          </div>
        </div>

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

        {/* Statistics */}
        <div className="grid gap-6 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredAssessments.length}</div>
              <p className="text-xs text-muted-foreground">
                Filtered assessments
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Submitted</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredAssessments.filter(a => a.status === 'SUBMITTED').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Submitted assessments
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredAssessments.filter(a => a.status === 'DRAFT').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Draft assessments
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredAssessments.filter(a => a.verificationStatus === 'REJECTED').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Rejected assessments
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Gaps</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredAssessments.reduce((sum, a) => {
                  // Calculate gap count from gapAnalysis JSON or default to 0
                  const gapCount = a.gapAnalysis ? Object.keys(a.gapAnalysis).length : 0
                  return sum + gapCount
                }, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total gaps identified
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Assessments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Assessments</CardTitle>
            <CardDescription>
              Your latest rapid assessment activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading assessments...</p>
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {assessments.length === 0 
                    ? "No assessments found. Create your first assessment!" 
                    : "No assessments match the current filters."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssessments.map((assessment) => (
                  <div 
                    key={assessment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    data-testid={`assessment-row-${assessment.rapidAssessmentType?.toLowerCase()}-${assessment.id}`}
                  >
                    <div className="flex items-center gap-4">
                      {getTypeIcon(assessment.rapidAssessmentType)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{assessment.rapidAssessmentType} Assessment</h3>
                          {getPriorityBadge(assessment.priority)}
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Entity:</span> {assessment.entity?.name || 'Unknown Entity'}
                          {assessment.incident && (
                            <span className="ml-3">
                              <span className="font-medium">Incident:</span> {formatIncidentDisplay(assessment.incident)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
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
                      
                      {/* Show Edit and Reason buttons for rejected assessments */}
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
                  <h4 className="font-medium text-gray-900 mb-2">
                    Assessment Details
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600">
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
                
                <div className="text-xs text-gray-500">
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