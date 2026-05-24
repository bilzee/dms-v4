'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Users, 
  Calendar, 
  Activity,
  FileText,
  Package,
  AlertTriangle
} from 'lucide-react'
import { ProgressBar } from '@/components/shared/ProgressBar'

interface EntityDemographics {
  id: string
  name: string
  type: string
  location?: string
  coordinates?: { lat: number; lng: number }
  demographics?: {
    population?: number
    vulnerableCount?: number
    lga?: string
    ward?: string
    state?: string
    campDetails?: any
    communityDetails?: any
    facilityDetails?: any
    householdCount?: number
    malePopulation?: number
    femalePopulation?: number
    childrenUnder5?: number
    elderlyCount?: number
    disabilityCount?: number
  }
  stats?: {
    verifiedAssessments: number
    totalCommitments: number
    activeResponses: number
    pendingCommitments: number
  }
  latestActivity?: {
    lastAssessment?: string
    lastAssessmentType?: string
    assignmentDate: string
  }
}

interface EntityInsightsHeaderProps {
  demographics: EntityDemographics
}

export function EntityInsightsHeader({ demographics }: EntityInsightsHeaderProps) {
  const {
    name,
    type,
    location,
    coordinates,
    demographics: demo,
    stats,
    latestActivity
  } = demographics

  // Calculate vulnerability percentage
  const vulnerabilityPercentage = demo?.population && demo?.vulnerableCount 
    ? Math.round((demo.vulnerableCount / demo.population) * 100) 
    : 0

  // Format assignment date
  const assignedDate = latestActivity?.assignmentDate 
    ? new Date(latestActivity.assignmentDate).toLocaleDateString()
    : 'Unknown'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Entity Information Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Entity Information</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold">{name}</p>
              <Badge variant="outline" className="mt-1">{type}</Badge>
            </div>
            
            {location && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-3 w-3 mr-1" />
                {location}
              </div>
            )}
            
            {demo?.lga && (
              <div className="text-sm">
                <span className="font-medium">LGA:</span> {demo.lga}
                {demo?.ward && <span className="ml-2">• Ward: {demo.ward}</span>}
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              Assigned on {assignedDate}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Population Information Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Population</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {demo?.population ? (
              <div>
                <p className="text-2xl font-bold">{demo.population.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Population</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Population data not available</p>
            )}
            
            {demo?.vulnerableCount && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Vulnerable:</span>
                  <span className="font-medium">{demo.vulnerableCount.toLocaleString()}</span>
                </div>
                <ProgressBar value={vulnerabilityPercentage} variant="warning" size="sm" />
                <p className="text-xs text-gray-500">{vulnerabilityPercentage}% vulnerable</p>
              </div>
            )}
            
            {demo?.householdCount && (
              <div className="flex justify-between text-sm">
                <span>Households:</span>
                <span className="font-medium">{demo.householdCount.toLocaleString()}</span>
              </div>
            )}
            
            {/* Gender breakdown if available */}
            {(demo?.malePopulation || demo?.femalePopulation) && (
              <div className="space-y-1">
                {demo.malePopulation && (
                  <div className="flex justify-between text-sm">
                    <span>Male:</span>
                    <span className="font-medium">{demo.malePopulation.toLocaleString()}</span>
                  </div>
                )}
                {demo.femalePopulation && (
                  <div className="flex justify-between text-sm">
                    <span>Female:</span>
                    <span className="font-medium">{demo.femalePopulation.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assessment Activity Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Assessment Activity</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.verifiedAssessments !== undefined && (
              <div>
                <p className="text-2xl font-bold">{stats.verifiedAssessments}</p>
                <p className="text-xs text-muted-foreground">Verified Assessments</p>
              </div>
            )}
            
            {latestActivity?.lastAssessment && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Last Assessment:</span>
                  <span className="font-medium">
                    {new Date(latestActivity.lastAssessment).toLocaleDateString()}
                  </span>
                </div>
                {latestActivity.lastAssessmentType && (
                  <div className="flex justify-between text-sm">
                    <span>Type:</span>
                    <Badge variant="outline" className="text-xs">
                      {latestActivity.lastAssessmentType}
                    </Badge>
                  </div>
                )}
              </div>
            )}
            
            {stats?.totalCommitments !== undefined && (
              <div className="flex justify-between text-sm">
                <span>Total Commitments:</span>
                <span className="font-medium">{stats.totalCommitments}</span>
              </div>
            )}
            
            {stats?.activeResponses !== undefined && (
              <div className="flex justify-between text-sm">
                <span>Active Responses:</span>
                <span className="font-medium">{stats.activeResponses}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Special Demographics Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Special Demographics</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Children under 5 */}
            {demo?.childrenUnder5 && (
              <div className="flex justify-between text-sm">
                <span>Children (&lt;5):</span>
                <span className="font-medium">{demo.childrenUnder5.toLocaleString()}</span>
              </div>
            )}
            
            {/* Elderly */}
            {demo?.elderlyCount && (
              <div className="flex justify-between text-sm">
                <span>Elderly:</span>
                <span className="font-medium">{demo.elderlyCount.toLocaleString()}</span>
              </div>
            )}
            
            {/* Persons with disabilities */}
            {demo?.disabilityCount && (
              <div className="flex justify-between text-sm">
                <span>Disabled:</span>
                <span className="font-medium">{demo.disabilityCount.toLocaleString()}</span>
              </div>
            )}
            
            {/* Entity-type specific information */}
            {type === 'CAMP' && demo?.campDetails && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-gray-700">Camp Details:</p>
                {demo.campDetails.capacity && (
                  <div className="flex justify-between text-xs">
                    <span>Capacity:</span>
                    <span>{demo.campDetails.capacity.toLocaleString()}</span>
                  </div>
                )}
                {demo.campDetails.currentOccupancy && (
                  <div className="flex justify-between text-xs">
                    <span>Occupancy:</span>
                    <span>{demo.campDetails.currentOccupancy.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
            
            {type === 'FACILITY' && demo?.facilityDetails && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-gray-700">Facility Details:</p>
                {demo.facilityDetails.facilityType && (
                  <div className="flex justify-between text-xs">
                    <span>Type:</span>
                    <span>{demo.facilityDetails.facilityType}</span>
                  </div>
                )}
                {demo.facilityDetails.capacity && (
                  <div className="flex justify-between text-xs">
                    <span>Capacity:</span>
                    <span>{demo.facilityDetails.capacity.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
            
            {type === 'COMMUNITY' && demo?.communityDetails && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-gray-700">Community Details:</p>
                {demo.communityDetails.dominantOccupation && (
                  <div className="flex justify-between text-xs">
                    <span>Occupation:</span>
                    <span>{demo.communityDetails.dominantOccupation}</span>
                  </div>
                )}
                {demo.communityDetails.schoolCount && (
                  <div className="flex justify-between text-xs">
                    <span>Schools:</span>
                    <span>{demo.communityDetails.schoolCount}</span>
                  </div>
                )}
                {demo.communityDetails.healthCenterCount && (
                  <div className="flex justify-between text-xs">
                    <span>Health Centers:</span>
                    <span>{demo.communityDetails.healthCenterCount}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Coordinates if available */}
            {coordinates && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs font-medium text-gray-700">Coordinates:</p>
                <p className="text-xs text-gray-600">
                  {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}