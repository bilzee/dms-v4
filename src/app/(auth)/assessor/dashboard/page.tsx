'use client'

import { useState, useEffect } from 'react'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataCardList, type ExpandedCardProps } from '@/components/shared/DataCardList'
import { type SeverityLevel } from '@/lib/utils/status-colors'
import { PlusCircle, Activity, FileText, Clock, CheckCircle, AlertTriangle } from '@/lib/icons'
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

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'assessment-created' && event.newValue) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assessor Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage and create rapid assessments for affected communities
            </p>
          </div>
          
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

        <StatCardGrid columns={4}>
          <StatCard
            label="Total Assessments"
            value={assessments.length}
            severity="info"
            icon={FileText}
          />
          <StatCard
            label="Submitted"
            value={assessments.filter(a => a.verificationStatus === 'SUBMITTED').length}
            severity="success"
            icon={CheckCircle}
          />
          <StatCard
            label="Drafts"
            value={assessments.filter(a => a.verificationStatus === 'DRAFT').length}
            severity="warning"
            icon={Clock}
          />
          <StatCard
            label="Critical Gaps"
            value={assessments.reduce((sum, a) => sum + (a.gapCount || 0), 0)}
            severity="critical"
            icon={AlertTriangle}
          />
        </StatCardGrid>

        <DataCardList
          title="Recent Assessments"
          description="Your latest rapid assessment activities"
          data={assessments}
          loading={isLoading}
          emptyMessage="No assessments found. Create your first assessment!"
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
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(assessment.createdAt).toLocaleDateString()} at{' '}
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
          )}
        />
      </div>
    </RoleBasedRoute>
  )
}
