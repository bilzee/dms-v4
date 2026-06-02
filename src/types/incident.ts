// Incident form data
export interface IncidentData {
  id?: string
  type: string
  subType?: string
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED'
  description: string
  location: string
  coordinates?: { lat: number; lng: number }
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

// Population impact calculation
export interface PopulationImpact {
  totalPopulation: number
  livesLost: number
  injured: number
  displaced: number
  affectedEntities: number
  housesAffected: number
  schoolsAffected: number
  medicalFacilitiesAffected: number
  agriculturalLandAffected: number
  epicenter?: { lat: number; lng: number }
  lastUpdated: string
  assessmentCount: number
}

// Incident with population impact
export interface Incident extends IncidentData {
  id: string
  createdBy: string
  createdAt: string
  updatedAt: string
  preliminaryAssessments?: any[]
  rapidAssessments?: any[]
  commitments?: any[]
  populationImpact?: PopulationImpact
}

// Query filters
export interface IncidentFilters {
  status?: ('ACTIVE' | 'CONTAINED' | 'RESOLVED')[]
  severity?: ('CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')[]
  type?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  location?: string
  hasAssessments?: boolean
  entityId?: string
  page?: number
  limit?: number
}

// API Response types
export interface IncidentResponse {
  success?: true
  data: Incident[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  error?: string
}

export interface CreateIncidentData {
  data: IncidentData
  preliminaryAssessmentId?: string
}

export interface UpdateIncidentData {
  type?: string
  subType?: string
  status?: 'ACTIVE' | 'CONTAINED' | 'RESOLVED'
  description?: string
  location?: string
  coordinates?: { lat: number; lng: number }
}