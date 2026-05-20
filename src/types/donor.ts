// Donor-related types for the Disaster Management PWA

export interface Donor {
  id: string
  name: string
  type: DonorType
  contactEmail?: string
  contactPhone?: string
  organization?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export enum DonorType {
  ORGANIZATION = 'ORGANIZATION',
  INDIVIDUAL = 'INDIVIDUAL',
  GOVERNMENT = 'GOVERNMENT',
  NGO = 'NGO',
  CORPORATE = 'CORPORATE'
}

export interface DonorMetrics {
  donorId: string
  donorName: string
  donorEmail?: string
  donorSince: Date
  metrics: {
    commitments: {
      total: number
      available: number
      fulfilled: number
      totalItems: number
      fulfillmentRate: number
      totalCommitted: number
      delivered: number
      deliveryRate: number
    }
    responses: {
      total: number
      verified: number
      rejected: number
      pending: number
      autoVerified: number
      verificationRate: number
    }
    combined: {
      totalActivities: number
      verifiedActivities: number
      overallSuccessRate: number
    }
  }
}

export interface DonorProfile extends Donor {
  metrics: DonorMetrics['metrics']
}

export interface DonorRegistrationRequest {
  name: string
  type: DonorType
  contactEmail?: string
  contactPhone?: string
  organization?: string
  userCredentials: {
    username: string
    password: string
    email: string
    name: string
  }
}

export interface DonorRegistrationResponse {
  donor: Donor
  user: {
    id: string
    username: string
    email: string
    name: string
    organization: string
    isActive: boolean
    roles: string[]
  }
  token: string
  roles: string[]
}

export interface DonorProfileUpdateRequest {
  name?: string
  contactEmail?: string
  contactPhone?: string
  organization?: string
}

export interface DonorEntity {
  id: string
  name: string
  type: string
  location?: string
  coordinates?: any
  isActive: boolean
  autoApproveEnabled: boolean
  createdAt: string
  updatedAt: string
  stats: {
    verifiedAssessments: number
    responses: number
    commitments: number
  }
  assignedAt: string
  assignedBy: string
}

export interface DonorEntitiesResponse {
  entities: DonorEntity[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  summary: {
    totalAssigned: number
    totalWithResponses: number
    totalWithCommitments: number
  }
}

export interface DonorSearchFilters {
  search?: string
  type?: DonorType
  isActive?: boolean
  page?: number
  limit?: number
}

export interface DonorApiResponse<T = any> {
  success?: true
  data: T
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface DonorListResponse {
  donors: Donor[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}