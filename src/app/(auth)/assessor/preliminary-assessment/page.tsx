'use client'

import { useState, useEffect, useCallback } from 'react'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PlusCircle, FileText, Clock, CheckCircle, AlertTriangle, Filter, X, MapPin, Calendar, User, Eye, Users, Home } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'
import { PreliminaryAssessment, Incident } from '@prisma/client'

// Type for assessment with incident relation
type PreliminaryAssessmentWithIncident = PreliminaryAssessment & {
  incident?: Incident | null
}

// Status filtering removed for Preliminary Assessments since they don't have status field

const dateFilterOptions = [
  { value: 'ALL', label: 'All Dates' },
  { value: 'BEFORE', label: 'Created Before' },
  { value: 'ON', label: 'Created On' },
  { value: 'AFTER', label: 'Created After' },
]

export default function PreliminaryAssessmentPage() {
  const [assessments, setAssessments] = useState<PreliminaryAssessmentWithIncident[]>([])
  const [filteredAssessments, setFilteredAssessments] = useState<PreliminaryAssessmentWithIncident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { token, user } = useAuth()

  // Filter states
  const [filters, setFilters] = useState({
    dateFilter: 'ALL',
    filterDate: '',
    lga: '',
    ward: ''
  })

  const [showFilters, setShowFilters] = useState(false)

  // Fetch preliminary assessments from API
  const fetchAssessments = useCallback(async () => {
    try {
      if (token && user) {
        const result = await apiGet(`/api/v1/preliminary-assessments/user/${user.id}?page=1&limit=100`)
        
        if (result.success) {
          const allAssessments: PreliminaryAssessmentWithIncident[] = result.data || []
          setAssessments(allAssessments)
          
          // Apply client-side filtering
          const filtered = allAssessments.filter(assessment => {
            const matchesLGA = !filters.lga || 
              assessment.reportingLGA?.toLowerCase().includes(filters.lga.toLowerCase())
            
            const matchesWard = !filters.ward || 
              assessment.reportingWard?.toLowerCase().includes(filters.ward.toLowerCase())
            
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
            
            return matchesLGA && matchesWard && matchesDate
          })
          
          setFilteredAssessments(filtered)
        }
      }
    } catch (error) {
      console.error('Error fetching preliminary assessments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [token, user, filters])

  // Initial load and refetch when dependencies change
  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  const getStatusBadge = (assessment: any) => {
    // Preliminary Assessments are submitted without verification status
    // They are always "SUBMITTED" once created
    return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Submitted</Badge>
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

  return (
    <RoleBasedRoute requiredRole="ASSESSOR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Preliminary Assessments</h1>
            <p className="text-gray-600 mt-2">
              Manage and view preliminary disaster impact assessments
            </p>
          </div>
          
          {/* New Assessment Button */}
          <Button 
            onClick={() => router.push('/assessor/preliminary-assessment/new')}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Assessment
          </Button>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* LGA Filter */}
                <div>
                  <Label htmlFor="lgaFilter">LGA</Label>
                  <Input
                    id="lgaFilter"
                    placeholder="Search LGA..."
                    value={filters.lga}
                    onChange={(e) => setFilters(prev => ({ ...prev, lga: e.target.value }))}
                  />
                </div>

                {/* Ward Filter */}
                <div>
                  <Label htmlFor="wardFilter">Ward</Label>
                  <Input
                    id="wardFilter"
                    placeholder="Search ward..."
                    value={filters.ward}
                    onChange={(e) => setFilters(prev => ({ ...prev, ward: e.target.value }))}
                  />
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
                    dateFilter: 'ALL',
                    filterDate: '',
                    lga: '',
                    ward: ''
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
        <div className="grid gap-6 md:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">Lives Affected</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredAssessments.reduce((sum, a) => sum + (a.numberLivesLost || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total lives lost
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">People Displaced</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredAssessments.reduce((sum, a) => sum + (a.numberDisplaced || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total displaced
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Houses Affected</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {filteredAssessments.reduce((sum, a) => sum + (a.numberHousesAffected || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total houses affected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Assessments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Preliminary Assessments</CardTitle>
            <CardDescription>
              Your preliminary disaster impact assessments
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
                    ? "No preliminary assessments found. Create your first assessment!" 
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
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">Preliminary Assessment</h3>
                          {getStatusBadge(assessment)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{assessment.reportingLGA || 'Unknown LGA'}, {assessment.reportingWard || 'Unknown Ward'}</span>
                          </div>
                          {assessment.incident && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Incident:</span> 
                              <span>{formatIncidentDisplay(assessment.incident)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(assessment.createdAt).toLocaleDateString()} at {new Date(assessment.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{assessment.reportingAgent || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link href={`/assessor/preliminary-assessment/${assessment.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
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
      </div>
    </RoleBasedRoute>
  )
}