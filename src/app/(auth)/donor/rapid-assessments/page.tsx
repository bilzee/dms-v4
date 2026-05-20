'use client'

import { useAuth } from '@/hooks/useAuth'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Eye, 
  Calendar, 
  MapPin, 
  User, 
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Filter
} from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { apiGet, extractArray } from '@/lib/api'

export default function DonorAssessmentsPage() {
  const { user } = useAuth()
  const { data: assessmentsData, isLoading: loading, error: queryError, refetch: fetchAssessments } = useQuery({
    queryKey: ['rapid-assessments'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/rapid-assessments')
      if (!result.success) throw new Error(result.error || 'Failed to fetch assessments')
      return extractArray(result.data)
    },
  })
  const assessments = Array.isArray(assessmentsData) ? assessmentsData : []
  const error = queryError?.message || null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-100 text-green-800'
      case 'PUBLISHED': return 'bg-blue-100 text-blue-800'
      case 'SUBMITTED': return 'bg-yellow-100 text-yellow-800'
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading assessments...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <RoleBasedRoute requiredRole="DONOR">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
            <p className="text-gray-600 mt-2">
              View disaster assessments and response needs (Read-only access)
            </p>
          </div>
          <Button variant="outline" onClick={() => fetchAssessments()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                  <p className="text-2xl font-bold">{assessments.length}</p>
                </div>
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Verified</p>
                  <p className="text-2xl font-bold text-green-600">
                    {assessments.filter(a => a.verificationStatus === 'VERIFIED').length}
                  </p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {assessments.filter(a => a.priority === 'HIGH' || a.priority === 'CRITICAL').length}
                  </p>
                </div>
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {assessments.filter(a => {
                      const assessmentDate = new Date(a.rapidAssessmentDate)
                      const weekAgo = new Date()
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      return assessmentDate >= weekAgo
                    }).length}
                  </p>
                </div>
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Recent Assessments
            </CardTitle>
            <CardDescription>
              View detailed disaster assessments across different regions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assessments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No assessments available</p>
                <p className="text-sm">Assessments will appear here once they are created by field assessors</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assessments.map((assessment: any) => (
                  <div key={assessment.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{assessment.rapidAssessmentType} Assessment</h3>
                          <Badge className={getStatusColor(assessment.verificationStatus || assessment.status)}>
                            {assessment.verificationStatus || assessment.status}
                          </Badge>
                          <Badge className={getPriorityColor(assessment.priority)}>
                            {assessment.priority}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{assessment.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{assessment.assessorName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(assessment.rapidAssessmentDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <p className="text-sm text-gray-600">
                        Assessment ID: {assessment.id}
                      </p>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <div className="text-center">
          <Link href="/donor/dashboard">
            <Button variant="outline">
              Back to Donor Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </RoleBasedRoute>
  )
}