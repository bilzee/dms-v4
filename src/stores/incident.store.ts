import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Incident } from '@prisma/client'
import { CreateIncidentRequest, IncidentData } from '@/types/incidents'
import { apiGet, apiPost, apiPut } from '@/lib/api'

interface IncidentState {
  // Current incidents
  incidents: Incident[]
  activeIncidents: Incident[]
  criticalIncidents: Incident[]
  
  // Loading and error states
  isLoading: boolean
  error: string | null
  
  // Incident types
  incidentTypes: string[]
  
  // Actions
  createIncident: (data: CreateIncidentRequest) => Promise<Incident>
  createIncidentFromAssessment: (assessmentId: string, incidentData: IncidentData) => Promise<{ incident: Incident; assessment: any }>
  loadIncidents: () => Promise<void>
  loadIncidentTypes: () => Promise<void>
  updateIncidentStatus: (id: string, status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED') => Promise<Incident>
  
  // Utility
  clearError: () => void
  setError: (error: string) => void
  getIncidentById: (id: string) => Incident | undefined
}

export const useIncidentStore = create<IncidentState>()(
  persist(
    (set, get) => ({
      // Initial state
      incidents: [],
      activeIncidents: [],
      criticalIncidents: [],
      isLoading: false,
      error: null,
      incidentTypes: [
        'Flood',
        'Fire',
        'Earthquake',
        'Landslide',
        'Drought',
        'Storm',
        'Epidemic',
        'Conflict',
        'Industrial Accident',
        'Other'
      ],

      createIncident: async (data: CreateIncidentRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          const result = await apiPost('/api/v1/incidents', data)

          if (!result.success) {
            throw new Error(result.error || 'Failed to create incident')
          }

          const incident = result.data

          // Update incidents list
          const state = get()
          const updatedIncidents = [incident, ...state.incidents]
          
          set({ 
            incidents: updatedIncidents,
            activeIncidents: updatedIncidents.filter(i => i.status === 'ACTIVE'),
            criticalIncidents: updatedIncidents.filter(i => i.severity === 'CRITICAL' && i.status === 'ACTIVE'),
            isLoading: false 
          })

          return incident
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create incident'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      createIncidentFromAssessment: async (assessmentId: string, incidentData: IncidentData) => {
        set({ isLoading: true, error: null })
        
        try {
          const result = await apiPost('/api/v1/incidents/from-assessment', { assessmentId, incidentData })

          if (!result.success) {
            throw new Error(result.error || 'Failed to create incident from assessment')
          }

          const { incident, assessment } = result.data

          // Update incidents list
          const state = get()
          const updatedIncidents = [incident, ...state.incidents]
          
          set({ 
            incidents: updatedIncidents,
            activeIncidents: updatedIncidents.filter(i => i.status === 'ACTIVE'),
            criticalIncidents: updatedIncidents.filter(i => i.severity === 'CRITICAL' && i.status === 'ACTIVE'),
            isLoading: false 
          })

          return { incident, assessment }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create incident from assessment'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      loadIncidents: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const result = await apiGet('/api/v1/incidents?limit=50')

          if (!result.success) {
            throw new Error(result.error || 'Failed to load incidents')
          }

          const incidents = result.data
          
          set({ 
            incidents,
            activeIncidents: incidents.filter((i: Incident) => i.status === 'ACTIVE'),
            criticalIncidents: incidents.filter((i: Incident) => i.severity === 'CRITICAL' && i.status === 'ACTIVE'),
            isLoading: false 
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load incidents'
          set({ error: errorMessage, isLoading: false })
        }
      },

      loadIncidentTypes: async () => {
        try {
          const result = await apiGet('/api/v1/incidents/types')

          if (result.success) {
            set({ incidentTypes: result.data })
          }
          // If it fails, keep the default types
        } catch (error) {
          // Silently fail and keep default types
        }
      },

      updateIncidentStatus: async (id: string, status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED') => {
        set({ isLoading: true, error: null })
        
        try {
          const result = await apiPut(`/api/v1/incidents/${id}`, { status })

          if (!result.success) {
            throw new Error(result.error || 'Failed to update incident status')
          }

          const incident = result.data

          // Update incidents list
          const state = get()
          const updatedIncidents = state.incidents.map(i => 
            i.id === id ? incident : i
          )
          
          set({ 
            incidents: updatedIncidents,
            activeIncidents: updatedIncidents.filter(i => i.status === 'ACTIVE'),
            criticalIncidents: updatedIncidents.filter(i => i.severity === 'CRITICAL' && i.status === 'ACTIVE'),
            isLoading: false 
          })

          return incident
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update incident status'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      clearError: () => {
        set({ error: null })
      },

      setError: (error: string) => {
        set({ error })
      },

      getIncidentById: (id: string) => {
        return get().incidents.find(i => i.id === id)
      }
    }),
    {
      name: 'incident-storage',
      partialize: (state) => ({
        incidents: state.incidents.slice(0, 10), // Only persist recent ones
        incidentTypes: state.incidentTypes
      })
    }
  )
)