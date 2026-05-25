'use client'

import { useState, useEffect, useCallback } from 'react'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataCardList, type ExpandedCardProps } from '@/components/shared/DataCardList'
import { type SeverityLevel } from '@/lib/utils/status-colors'
import { PlusCircle, FileText, Clock, CheckCircle, AlertTriangle, Filter, X, MapPin, Calendar, User, Eye, Users, Home } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiGet, extractArray } from '@/lib/api'
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
          const allAssessments: PreliminaryAssessmentWithIncident[] = extractArray<PreliminaryAssessmentWithIncident>(result.data)
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

        <StatCardGrid columns={4} gap="lg">
          <StatCard label="Total Assessments" value={filteredAssessments.length} severity="info" icon={FileText} />
          <StatCard label="Lives Affected" value={filteredAssessments.reduce((sum, a) => sum + (a.numberLivesLost || 0), 0)} severity="critical" icon={Users} />
          <StatCard label="People Displaced" value={filteredAssessments.reduce((sum, a) => sum + (a.numberDisplaced || 0), 0)} severity="warning" icon={Home} />
          <StatCard label="Houses Affected" value={filteredAssessments.reduce((sum, a) => sum + (a.numberHousesAffected || 0), 0)} severity="high" icon={Home} />
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

        <DataCardList
          title="Preliminary Assessments"
          description="Your preliminary disaster impact assessments"
          data={filteredAssessments}
          loading={isLoading}
          emptyMessage={assessments.length === 0 ? "No preliminary assessments found. Create your first assessment!" : "No assessments match the current filters."}
          getSeverity={() => 'success' as SeverityLevel}
          renderCard={(assessment: any, { isExpanded, toggleExpand }: ExpandedCardProps) => (
            <div className="flex items-center justify-between">
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
          )}
        />
      </div>
    </RoleBasedRoute>
  )
}