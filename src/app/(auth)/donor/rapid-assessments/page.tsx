'use client'

import { useAuth } from '@/hooks/useAuth'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
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
  RefreshCw
} from '@/lib/icons'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { apiGet, extractArray } from '@/lib/api'
import { getVerificationStatusColor, getPriorityBadgeColor } from '@/lib/utils/priority-colors'
import { DataCardList, type ExpandedCardProps } from '@/components/shared/DataCardList'
import { type SeverityLevel } from '@/lib/utils/status-colors'

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

  const getVerificationSeverity = (status: string): SeverityLevel => {
    switch (status) {
      case 'VERIFIED':
      case 'AUTO_VERIFIED':
        return 'success'
      case 'SUBMITTED':
        return 'warning'
      case 'REJECTED':
        return 'critical'
      case 'DRAFT':
        return 'neutral'
      default:
        return 'neutral'
    }
  }


  if (loading) {
    return (
      <div className="py-8">
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
      <div className="py-8">
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
      <div className="py-8 space-y-6">
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

        <StatCardGrid columns={4}>
          <StatCard label="Total Assessments" value={assessments.length} severity="info" icon={FileText} />
          <StatCard label="Verified" value={assessments.filter(a => a.verificationStatus === 'VERIFIED').length} severity="success" icon={CheckCircle} />
          <StatCard label="High Priority" value={assessments.filter(a => a.priority === 'HIGH' || a.priority === 'CRITICAL').length} severity="high" icon={AlertTriangle} />
          <StatCard label="Recent" value={assessments.filter(a => {
            const assessmentDate = new Date(a.rapidAssessmentDate)
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            return assessmentDate >= weekAgo
          }).length} severity="info" icon={Calendar} />
        </StatCardGrid>

        <DataCardList
          title="Recent Assessments"
          description="View detailed disaster assessments across different regions"
          data={assessments}
          loading={false}
          emptyMessage="No assessments available"
          getSeverity={(a: any) => getVerificationSeverity(a.verificationStatus)}
          renderCard={(assessment: any, { isExpanded, toggleExpand }: ExpandedCardProps) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{assessment.rapidAssessmentType} Assessment</h3>
                    <Badge className={getVerificationStatusColor(assessment.verificationStatus)}>
                      {assessment.verificationStatus}
                    </Badge>
                    <Badge className={getPriorityBadgeColor(assessment.priority)}>
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
                  Assessment ID: {assessment.id.slice(0, 8)}...
                </p>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            </div>
          )}
        />

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