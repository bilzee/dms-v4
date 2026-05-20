import { Incident } from '@prisma/client'

export interface IncidentData {
  type: string
  subType?: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED'
  description: string
  location: string
  coordinates?: { lat: number; lng: number }
}

export interface CreateIncidentRequest {
  data: IncidentData
  preliminaryAssessmentId?: string
}

export interface IncidentResponse {
  success?: true
  data: Incident
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface IncidentListResponse {
  success?: true
  data: Incident[]
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

// Additional interfaces referenced in story
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
}

export interface UpdateIncidentData {
  type?: string
  subType?: string
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status?: 'ACTIVE' | 'CONTAINED' | 'RESOLVED'
  description?: string
  location?: string
  coordinates?: { lat: number; lng: number }
}

export interface IncidentCreationFormProps {
  incident?: Incident // For edit mode
  onSubmit?: (data: IncidentData) => Promise<void>
  onCancel?: () => void
  disabled?: boolean
  assessmentId?: string // For creating from assessment
  showAssessmentLink?: boolean
  autoSave?: boolean // Enable auto-save functionality
  gpsEnabled?: boolean // Enable GPS coordinates capture
}

export interface IncidentManagementProps {
  className?: string
  initialFilters?: IncidentFilters
  showCreateButton?: boolean
  enableRealTimeUpdates?: boolean
  selectedIncidentId?: string
  onIncidentSelect?: (incident: Incident) => void
  onIncidentUpdate?: (incident: Incident) => void
}

export interface IncidentCreationFormState {
  customType: string
  showCustomType: boolean
  isDraft: boolean
  lastSaved: Date | null
  gpsLocation: { lat: number; lng: number } | null
  isGettingLocation: boolean
}

export interface IncidentManagementState {
  incidents: Incident[]
  loading: boolean
  error: string | null
  filters: IncidentFilters
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  selectedIncident: Incident | null
  showCreateModal: boolean
  showEditModal: boolean
  isUpdating: boolean
}