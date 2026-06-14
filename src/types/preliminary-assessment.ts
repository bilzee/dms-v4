import { PreliminaryAssessment, Incident } from '@prisma/client'

export interface PreliminaryAssessmentData {
  reportingDate: Date | string
  reportingLatitude: number
  reportingLongitude: number
  reportingLGA: string
  reportingWard: string
  numberLivesLost: number
  numberInjured: number
  numberDisplaced: number
  numberHousesAffected: number
  schoolsAffected?: string
  medicalFacilitiesAffected?: string
  estimatedAgriculturalLandsAffected?: number
  reportingAgent: string
  additionalDetails?: any
  incidentId?: string
  affectedEntityIds?: string[]
}

export interface CreatePreliminaryAssessmentRequest {
  data: PreliminaryAssessmentData
  createIncident?: boolean
  incidentData?: {
    type: string
    subType?: string
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    description: string
    location: string
  }
}

export interface PreliminaryAssessmentResponse {
  success?: true
  data: PreliminaryAssessment & {
    incident?: Incident
  }
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface PreliminaryAssessmentListResponse {
  success?: true
  data: (PreliminaryAssessment & {
    incident?: Incident
  })[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface UpdatePreliminaryAssessmentRequest {
  data: Partial<PreliminaryAssessmentData>
}

// Nigerian LGA and Ward data structure
export interface LGAData {
  name: string
  wards: string[]
}

export interface StateData {
  [stateName: string]: LGAData[]
}