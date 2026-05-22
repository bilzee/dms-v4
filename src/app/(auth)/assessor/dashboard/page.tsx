'use client'

import { useState, useEffect } from 'react'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Activity, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiGet, extractArray } from '@/lib/api'

const assessmentTypes = [
  { value: 'HEALTH', label: 'Health Assessment' },
  { value: 'POPULATION', label: 'Population Assessment' },
  { value: 'FOOD', label: 'Food Security Assessment' },
  { value: 'WASH', label: 'WASH Assessment' },
  { value: 'SHELTER', label: 'Shelter Assessment' },
  { value: 'SECURITY', label: 'Security Assessment' }
]

export default function AssessorDashboard() {
  const [selectedType, setSelectedType] = useState<string>('')
  const [assessments, setAssessments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { token } = useAuth()

  // Fetch assessments from API
  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        if (token) {
          const result = await apiGet('/api/v1/rapid-assessments?userId=me')
          
          if (result.success) {
            setAssessments(extractArray(result.data))
          }
        }
      } catch (error) {
        console.error('Error fetching assessments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssessments()
  }, [token])

  // Listen for new assessment creation events
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'assessment-created' && event.newValue) {
        // Refresh assessments when a new one is created
        const fetchAssessments = async () => {
          try {
            if (token) {
              const result = await apiGet('/api/v1/rapid-assessments?userId=me')
              
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

  const getStatusBadge = (assessment: any) => {
    // Use verificationStatus for submitted assessments, otherwise use status
    const displayStatus = assessment.status === 'SUBMITTED' ? assessment.verificationStatus : assessment.status;
    
    switch (displayStatus) {
      case 'VERIFIED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
      case 'AUTO_VERIFIED':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Auto-Verified</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Rejected</Badge>
      case 'SUBMITTED':
        return <Badge className="bg-yellow-100 text-yellow-800"><FileText className="w-3 h-3 mr-1" />Pending Review</Badge>
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" />Draft</Badge>
      default:
        return <Badge variant="outline">{displayStatus}</Badge>
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
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <RoleBasedRoute requiredRole="ASSESSOR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assessor Dashboard</h1>
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

        {/* Statistics */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessments.length}</div>
              <p className="text-xs text-muted-foreground">
                All assessments (submitted + drafts)
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
                {assessments.filter(a => a.status === 'SUBMITTED').length}
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
                {assessments.filter(a => a.status === 'DRAFT').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Draft assessments
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
                {assessments.reduce((sum, a) => sum + (a.gapCount || 0), 0)}
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
            ) : assessments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No assessments found. Create your first assessment!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assessments.map((assessment) => (
                  <div 
                    key={assessment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    data-testid={`assessment-row-${assessment.rapidAssessmentType?.toLowerCase()}-${assessment.id}`}
                  >
                    <div className="flex items-center gap-4">
                      {getTypeIcon(assessment.rapidAssessmentType)}
                      <div>
                        <h3 className="font-medium">{assessment.rapidAssessmentType} Assessment</h3>
                        <p className="text-sm text-gray-600">{assessment.entity?.name || 'Unknown Entity'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(assessment.createdAt).toLocaleDateString()} at{' '}
                          {new Date(assessment.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {(assessment.gapCount || 0) > 0 && (
                        <Badge 
                          variant="destructive" 
                          data-testid={`gap-indicator-${assessment.id}`}
                        >
                          {assessment.gapCount} Gaps
                        </Badge>
                      )}
                      {getStatusBadge(assessment)}
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
      </div>
    </RoleBasedRoute>
  )
}