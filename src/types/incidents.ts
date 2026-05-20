import { Incident } from '@prisma/client'
import type { IncidentData, IncidentFilters, UpdateIncidentData } from './incident'

export type { IncidentData, IncidentFilters, UpdateIncidentData }

export interface CreateIncidentRequest {
  data: IncidentData
  preliminaryAssessmentId?: string
}

// Additional interfaces referenced in story
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
