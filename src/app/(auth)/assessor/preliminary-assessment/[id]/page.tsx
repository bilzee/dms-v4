'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle, AlertTriangle, FileText, MapPin, Calendar, User, Home, Users, School, Activity } from '@/lib/icons'
import { apiGet } from '@/lib/api'

interface PreliminaryAssessment {
  id: string
  reportingDate: string
  reportingLatitude: number
  reportingLongitude: number
  reportingLGA: string
  reportingWard: string
  numberLivesLost: number
  numberInjured: number
  numberDisplaced: number
  numberHousesAffected: number
  numberSchoolsAffected: number
  schoolsAffected?: string
  numberMedicalFacilitiesAffected: number
  medicalFacilitiesAffected?: string
  estimatedAgriculturalLandsAffected?: string
  reportingAgent: string
  additionalDetails?: any
  incidentId?: string
  createdAt: string
  updatedAt: string
  incident?: {
    id: string
    type: string
    subType?: string
    severity: string
    description: string
    createdAt: string
  }
  affectedEntities?: Array<{
    id: string
    entity: {
      id: string
      name: string
      type: string
    }
  }>
}

export default function PreliminaryAssessmentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [assessment, setAssessment] = useState<PreliminaryAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const result = await apiGet(`/api/v1/preliminary-assessments/${params.id}`)
        if (!result.success) {
          throw new Error(result.error || 'Assessment not found')
        }
        setAssessment(result.data || null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assessment')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchAssessment()
    }
  }, [params.id])

  const formatIncidentDisplay = (incident: any) => {
    if (!incident) return 'No Incident'
    
    const type = incident.type || 'Unknown'
    const subType = incident.subType ? `-${incident.subType}` : ''
    const date = incident.createdAt ? new Date(incident.createdAt).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).replace(/\s+/g, '') : ''
    
    return `${type}${subType}${date ? `-${date}` : ''}`
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">CRITICAL</Badge>
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">HIGH</Badge>
      case 'medium':
        return <Badge className="bg-blue-100 text-blue-800">MEDIUM</Badge>
      case 'low':
        return <Badge className="bg-green-100 text-green-800">LOW</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading assessment details...</div>
        </div>
      </div>
    )
  }

  if (error || !assessment) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Assessment Not Found</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assessments
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Preliminary Assessment Details</h1>
          <p className="text-muted-foreground hidden sm:block">
            Initial impact assessment for {assessment.reportingLGA}, {assessment.reportingWard}
          </p>
        </div>
      </div>

      {/* Assessment Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assessment Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Location</label>
              <p className="font-semibold">{assessment.reportingLGA}, {assessment.reportingWard}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reporting Date</label>
              <p className="font-semibold">
                {new Date(assessment.reportingDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="font-semibold">
                {new Date(assessment.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {assessment.reportingLatitude.toFixed(6)}, {assessment.reportingLongitude.toFixed(6)}
            </span>
          </div>

          {assessment.incident && (
            <div className="border-t pt-4">
              <label className="text-sm font-medium text-muted-foreground">Related Incident</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-semibold">{formatIncidentDisplay(assessment.incident)}</span>
                {getSeverityBadge(assessment.incident.severity)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{assessment.incident.description}</p>
            </div>
          )}

          {assessment.affectedEntities && assessment.affectedEntities.length > 0 && (
            <div className="border-t pt-4">
              <label className="text-sm font-medium text-muted-foreground">Affected Entities</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {assessment.affectedEntities.map((entityRel) => (
                  <Badge key={entityRel.id} variant="outline">
                    {entityRel.entity.name} ({entityRel.entity.type})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Impact Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Impact Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold text-red-600">{assessment.numberLivesLost}</div>
              <p className="text-sm text-muted-foreground">Lives Lost</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Activity className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-orange-600">{assessment.numberInjured}</div>
              <p className="text-sm text-muted-foreground">Injured</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{assessment.numberDisplaced}</div>
              <p className="text-sm text-muted-foreground">Displaced</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Home className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <div className="text-2xl font-bold text-gray-600">{assessment.numberHousesAffected}</div>
              <p className="text-sm text-muted-foreground">Houses Affected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infrastructure Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Infrastructure Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <School className="h-4 w-4" />
                Educational Facilities
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Schools Affected</span>
                  <span className="font-semibold">{assessment.numberSchoolsAffected}</span>
                </div>
                {assessment.schoolsAffected && (
                  <div>
                    <span className="text-sm text-muted-foreground">Details:</span>
                    <p className="text-sm">{assessment.schoolsAffected}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Medical Facilities
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Facilities Affected</span>
                  <span className="font-semibold">{assessment.numberMedicalFacilitiesAffected}</span>
                </div>
                {assessment.medicalFacilitiesAffected && (
                  <div>
                    <span className="text-sm text-muted-foreground">Details:</span>
                    <p className="text-sm">{assessment.medicalFacilitiesAffected}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {assessment.estimatedAgriculturalLandsAffected && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Agricultural Impact</h4>
              <p className="text-sm">{assessment.estimatedAgriculturalLandsAffected}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      {assessment.additionalDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap">
              {typeof assessment.additionalDetails === 'string' 
                ? assessment.additionalDetails 
                : JSON.stringify(assessment.additionalDetails, null, 2)
              }
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Assessment Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Reporting Agent
              </label>
              <p className="font-semibold">{assessment.reportingAgent}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Assessment ID
              </label>
              <p className="font-mono text-sm">{assessment.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created Date</label>
              <p className="font-semibold">{new Date(assessment.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="font-semibold">{new Date(assessment.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}