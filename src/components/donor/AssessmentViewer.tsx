'use client'

import React from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  Calendar, 
  User, 
  Filter, 
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  AlertTriangle
} from 'lucide-react'

interface AssessmentViewerProps {
  entityId: string
}

interface Assessment {
  id: string
  type: string
  date: string
  status: string
  data: any
  assessor: {
    id: string
    name: string
    organization?: string
  }
  entity: {
    id: string
    name: string
    type: string
  }
}

interface AssessmentsResponse {
  entity: {
    id: string
    name: string
    type: string
    demographics?: any
  }
  assessments: Assessment[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  summary: {
    totalAssessments: number
    verifiedAssessments: number
    categories: Array<{
      type: string
      count: number
      latestDate?: string
    }>
  }
}

const ASSESSMENT_CATEGORIES = [
  { value: 'HEALTH', label: 'Health' },
  { value: 'WASH', label: 'Water & Sanitation' },
  { value: 'SHELTER', label: 'Shelter' },
  { value: 'FOOD', label: 'Food Security' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'POPULATION', label: 'Population' }
]

const STATUS_COLORS = {
  'VERIFIED': 'bg-green-100 text-green-800',
  'AUTO_VERIFIED': 'bg-blue-100 text-blue-800',
  'SUBMITTED': 'bg-yellow-100 text-yellow-800',
  'DRAFT': 'bg-gray-100 text-gray-800',
  'REJECTED': 'bg-red-100 text-red-800'
}

export function AssessmentViewer({ entityId }: AssessmentViewerProps) {
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: '',
    limit: 20,
    offset: 0
  })
  
  const [expandedAssessments, setExpandedAssessments] = useState<Set<string>>(new Set())

  // Fetch assessments
  const { data: assessmentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['entity-assessments', entityId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: filters.limit.toString(),
        offset: filters.offset.toString(),
        ...(filters.category && filters.category !== 'all-categories' && { category: filters.category }),
        ...(filters.status && filters.status !== 'all-statuses' && { status: filters.status })
      })
      
      const result = await apiGet<{ success: boolean; data: AssessmentsResponse }>(`/api/v1/donors/entities/${entityId}/assessments?${params}`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch assessments')
      }
      return result.data as { success: boolean; data: AssessmentsResponse }
    },
    enabled: !!entityId
  })

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }))
  }

  const handleLoadMore = () => {
    setFilters(prev => ({ 
      ...prev, 
      offset: prev.offset + prev.limit 
    }))
  }

  const toggleAssessmentExpansion = (assessmentId: string) => {
    const newExpanded = new Set(expandedAssessments)
    if (newExpanded.has(assessmentId)) {
      newExpanded.delete(assessmentId)
    } else {
      newExpanded.add(assessmentId)
    }
    setExpandedAssessments(newExpanded)
  }

  const filteredAssessments = assessmentsData?.data?.assessments?.filter(assessment => {
    const matchesSearch = !filters.search || 
      assessment.assessor.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      assessment.type.toLowerCase().includes(filters.search.toLowerCase())
    
    return matchesSearch
  }) || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assessment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !assessmentsData?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Error Loading Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Unable to load assessment data. Please try again later.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { entity, pagination, summary } = assessmentsData.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assessment History
          </CardTitle>
          <CardDescription>
            View detailed assessments and verification status for {entity.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.totalAssessments}</p>
              <p className="text-sm text-gray-600">Total Assessments</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{summary.verifiedAssessments}</p>
              <p className="text-sm text-gray-600">Verified</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.categories.length}</p>
              <p className="text-sm text-gray-600">Categories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{pagination.total}</p>
              <p className="text-sm text-gray-600">Total Records</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by assessor or category..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-categories">All Categories</SelectItem>
                {ASSESSMENT_CATEGORIES.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-statuses">All Statuses</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="AUTO_VERIFIED">Auto Verified</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assessment List */}
      <Card>
        <CardHeader>
          <CardTitle>Assessments ({filteredAssessments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAssessments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
              <p className="text-gray-600">
                Try adjusting your filters or check back later for new assessments.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  assessment={assessment}
                  isExpanded={expandedAssessments.has(assessment.id)}
                  onToggleExpansion={() => toggleAssessmentExpansion(assessment.id)}
                />
              ))}
              
              {/* Load More Button */}
              {pagination.hasMore && (
                <div className="text-center pt-4">
                  <Button 
                    onClick={handleLoadMore}
                    variant="outline"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface AssessmentCardProps {
  assessment: Assessment
  isExpanded: boolean
  onToggleExpansion: () => void
}

function AssessmentCard({ assessment, isExpanded, onToggleExpansion }: AssessmentCardProps) {
  const formatAssessmentData = (data: any) => {
    const items = []
    
    // Common fields
    if (data.location) {
      items.push(`Location: ${data.location}`)
    }
    
    if (data.priority) {
      items.push(`Priority: ${data.priority}`)
    }
    
    // Category-specific fields
    switch (assessment.type) {
      case 'HEALTH':
        if (data.hasFunctionalClinic !== undefined) {
          items.push(`Clinic: ${data.hasFunctionalClinic ? 'Available' : 'Not Available'}`)
        }
        if (data.qualifiedHealthWorkers !== undefined) {
          items.push(`Health Workers: ${data.qualifiedHealthWorkers}`)
        }
        break
        
      case 'FOOD':
        if (data.isFoodSufficient !== undefined) {
          items.push(`Food: ${data.isFoodSufficient ? 'Sufficient' : 'Insufficient'}`)
        }
        if (data.availableFoodDurationDays !== undefined) {
          items.push(`Food Reserves: ${data.availableFoodDurationDays} days`)
        }
        break
        
      case 'WASH':
        if (data.isWaterSufficient !== undefined) {
          items.push(`Water: ${data.isWaterSufficient ? 'Sufficient' : 'Insufficient'}`)
        }
        if (data.functionalLatrinesAvailable !== undefined) {
          items.push(`Latrines: ${data.functionalLatrinesAvailable}`)
        }
        break
        
      case 'SHELTER':
        if (data.areSheltersSufficient !== undefined) {
          items.push(`Shelter: ${data.areSheltersSufficient ? 'Sufficient' : 'Insufficient'}`)
        }
        if (data.numberSheltersRequired !== undefined) {
          items.push(`Shelters Needed: ${data.numberSheltersRequired}`)
        }
        break
        
      case 'SECURITY':
        if (data.isSafeFromViolence !== undefined) {
          items.push(`Safety: ${data.isSafeFromViolence ? 'Safe' : 'Unsafe'}`)
        }
        if (data.hasSecurityPresence !== undefined) {
          items.push(`Security: ${data.hasSecurityPresence ? 'Present' : 'Absent'}`)
        }
        break
        
      case 'POPULATION':
        if (data.totalPopulation !== undefined) {
          items.push(`Population: ${data.totalPopulation.toLocaleString()}`)
        }
        if (data.totalHouseholds !== undefined) {
          items.push(`Households: ${data.totalHouseholds.toLocaleString()}`)
        }
        break
    }
    
    return items
  }

  const assessmentData = formatAssessmentData(assessment.data)
  const statusColor = STATUS_COLORS[assessment.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline">{assessment.type}</Badge>
          <Badge className={statusColor}>{assessment.status}</Badge>
          <div className="text-sm text-gray-600">
            <Calendar className="inline h-3 w-3 mr-1" />
            {new Date(assessment.date).toLocaleDateString()}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <User className="h-3 w-3" />
            {assessment.assessor.name}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpansion}
          >
            <Eye className="h-4 w-4 mr-1" />
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="flex flex-wrap gap-2">
        {assessmentData.slice(0, 3).map((item, index) => (
          <span key={index} className="text-sm bg-gray-100 px-2 py-1 rounded">
            {item}
          </span>
        ))}
        {assessmentData.length > 3 && !isExpanded && (
          <span className="text-sm text-gray-500">
            +{assessmentData.length - 3} more
          </span>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t pt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessmentData.map((item, index) => (
              <div key={index} className="text-sm">
                <span className="text-gray-600">{item}</span>
              </div>
            ))}
          </div>
          
          {assessment.assessor.organization && (
            <div className="text-sm text-gray-600">
              Organization: {assessment.assessor.organization}
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm">
              View Full Details
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}