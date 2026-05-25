'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

// UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

// Icons
import { FileText, Calendar, MapPin, User, AlertTriangle, CheckCircle, Clock } from '@/lib/icons'

// Services and types
import { responseOfflineService } from '@/lib/services/response-offline.service'
import { ResponseService } from '@/lib/services/response.service'
import { useAuth } from '@/hooks/useAuth'
import { apiGet, extractArray } from '@/lib/api'

interface AssessmentSelectorProps {
  entityId: string
  value?: string
  onValueChange: (assessmentId: string, assessment: any) => void
  disabled?: boolean
  showConflictWarning?: boolean
  selectedAssessment?: any
}

interface AssessmentWithDetails {
  id: string
  rapidAssessmentType: string
  rapidAssessmentDate: string
  status: string
  verificationStatus: string
  entity: {
    id: string
    name: string
    type: string
  }
  assessor?: {
    name: string
    email: string
  }
  hasExistingResponse?: boolean
}

export function AssessmentSelector({ 
  entityId, 
  value, 
  onValueChange, 
  disabled = false,
  showConflictWarning = true,
  selectedAssessment
}: AssessmentSelectorProps) {
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false)
  const { token } = useAuth()

  // Get verified assessments for the entity
  const { data: assessments = [], isLoading, error } = useQuery({
    queryKey: ['assessments', 'verified', entityId, 'response-planning'],
    queryFn: async () => {
      if (!entityId || !token) {
        return []
      }
      
      const result = await apiGet(`/api/v1/assessments/verified?entityId=${entityId}`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch verified assessments')
      }
      const assessments = extractArray(result.data as any)
      
      // Check each assessment for existing responses
      const assessmentsWithConflicts = await Promise.all(
        assessments.map(async (assessment: any) => {
          try {
            // We need a user ID to check for existing responses
            // For now, just assume no existing responses
            // TODO: Properly check for existing responses when user is available
            const existingResponses = { total: 0 }
            
            return {
              ...assessment,
              hasExistingResponse: existingResponses?.total > 0
            }
          } catch {
            return {
              ...assessment,
              hasExistingResponse: false
            }
          }
        })
      )
      
      return assessmentsWithConflicts
    },
    enabled: !!entityId && !disabled && !!token
  })

  const handleAssessmentSelect = async (assessmentId: string) => {
    if (!assessmentId) {
      onValueChange('', null)
      return
    }

    const assessment = assessments.find(a => a.id === assessmentId)
    if (assessment) {
      onValueChange(assessmentId, assessment)
    }
  }

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
      case 'AUTO_VERIFIED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getAssessmentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'HEALTH': 'bg-blue-100 text-blue-800 border-blue-200',
      'WASH': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'SHELTER': 'bg-purple-100 text-purple-800 border-purple-200',
      'FOOD': 'bg-orange-100 text-orange-800 border-orange-200',
      'SECURITY': 'bg-red-100 text-red-800 border-red-200',
      'POPULATION': 'bg-green-100 text-green-800 border-green-200'
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (!entityId) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please select an entity first to view available assessments.
        </AlertDescription>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load assessments. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Assessment Selection */}
      <Select
        value={value}
        onValueChange={handleAssessmentSelect}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a verified assessment...">
            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Loading assessments...
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {assessments.map((assessment) => (
            <SelectItem 
              key={assessment.id} 
              value={assessment.id}
              disabled={assessment.hasExistingResponse && showConflictWarning}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={getAssessmentTypeColor(assessment.rapidAssessmentType)}
                  >
                    {assessment.rapidAssessmentType}
                  </Badge>
                  <span className="font-medium">
                    {new Date(assessment.rapidAssessmentDate).toLocaleDateString()}
                  </span>
                  {getVerificationStatusIcon(assessment.verificationStatus)}
                </div>
                {assessment.hasExistingResponse && (
                  <Badge variant="destructive" className="text-xs">
                    Has Response
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assessment Details Preview */}
      {selectedAssessment && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Assessment Details
              <Badge 
                variant="outline" 
                className={getAssessmentTypeColor(selectedAssessment.rapidAssessmentType)}
              >
                {selectedAssessment.rapidAssessmentType}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    <strong>Date:</strong> {new Date(selectedAssessment.rapidAssessmentDate).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    <strong>Entity:</strong> {selectedAssessment.entity?.name}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {selectedAssessment.entity?.type}
                    </Badge>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {getVerificationStatusIcon(selectedAssessment.verificationStatus)}
                  <span className="text-sm">
                    <strong>Status:</strong> {selectedAssessment.verificationStatus}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    <strong>Assessor:</strong> {selectedAssessment.assessor?.name || 'Not specified'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    <strong>Verified:</strong> Yes
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    <strong>ID:</strong> {selectedAssessment.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="text-sm">
              <p className="text-blue-700">
                <strong>Response Planning Context:</strong> This assessment has been verified and published. 
                You can now plan response resources based on the findings from this assessment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflict Warning */}
      {selectedAssessment && selectedAssessment.hasExistingResponse && showConflictWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Existing Response Found:</strong> There is already a planned response for this assessment. 
            Creating a new response may lead to duplicate planning. Please review the existing response first.
          </AlertDescription>
        </Alert>
      )}

      {/* No Assessments Available */}
      {!isLoading && assessments.length === 0 && entityId && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No verified assessments are available for this entity. Only assessments that have been 
            verified and published can be used for response planning.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}