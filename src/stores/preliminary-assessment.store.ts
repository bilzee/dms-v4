import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PreliminaryAssessment, Incident } from '@prisma/client'
import { 
  PreliminaryAssessmentData,
  CreatePreliminaryAssessmentRequest 
} from '@/types/preliminary-assessment'
import { offlineDB } from '@/lib/db/offline'
import { apiGet, apiPost, apiPut, extractArray } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { useOfflineStore } from '@/stores/offline.store'

interface PreliminaryAssessmentDraft {
  id: string
  data: Partial<PreliminaryAssessmentData>
  timestamp: number
  autoSaved: boolean
}

interface PreliminaryAssessmentState {
  // Current form state
  currentDraft: PreliminaryAssessmentDraft | null
  isLoading: boolean
  error: string | null
  
  // Recent assessments
  recentAssessments: (PreliminaryAssessment & { incident?: Incident })[]
  
  // Draft management
  drafts: PreliminaryAssessmentDraft[]
  
  // GPS state
  gpsLocation: { lat: number; lng: number } | null
  gpsError: string | null
  isCapturingGPS: boolean
  
  // Actions
  createAssessment: (data: CreatePreliminaryAssessmentRequest) => Promise<PreliminaryAssessment>
  updateAssessment: (id: string, data: Partial<PreliminaryAssessmentData>) => Promise<PreliminaryAssessment>
  loadAssessments: () => Promise<void>
  loadOfflineAssessments: () => Promise<void>
  syncOfflineAssessments: () => Promise<void>
  
  // Draft management
  saveDraft: (data: Partial<PreliminaryAssessmentData>, autoSave?: boolean) => void
  loadDraft: (id: string) => void
  deleteDraft: (id: string) => void
  clearCurrentDraft: () => void
  
  // GPS functions
  captureGPS: () => Promise<{ lat: number; lng: number }>
  setManualLocation: (lat: number, lng: number) => void
  clearGPSError: () => void
  
  // Utility
  clearError: () => void
  setError: (error: string) => void
}

export const usePreliminaryAssessmentStore = create<PreliminaryAssessmentState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentDraft: null,
      isLoading: false,
      error: null,
      recentAssessments: [],
      drafts: [],
      gpsLocation: null,
      gpsError: null,
      isCapturingGPS: false,

      createAssessment: async (data: CreatePreliminaryAssessmentRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          // Check if we're online
          const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false
          
          if (isOnline) {
            // Try to submit online first
            try {
              const apiResult = await apiPost('/api/v1/preliminary-assessments', data)
              if (!apiResult.success) throw new Error(apiResult.error || 'Online submission failed')
              const body = apiResult.data as any
              const assessment = body?.data || body

              // Update recent assessments and remove current draft if submitted successfully
              const state = get()
              const updatedRecent = [assessment, ...state.recentAssessments.slice(0, 9)]
              const updatedDrafts = state.currentDraft 
                ? state.drafts.filter(d => d.id !== state.currentDraft!.id)
                : state.drafts

              set({ 
                recentAssessments: updatedRecent,
                drafts: updatedDrafts,
                currentDraft: null,
                isLoading: false 
              })

              return assessment
            } catch (onlineError) {
              console.warn('Online submission failed, falling back to offline:', onlineError)
              // Fall through to offline handling
            }
          }

          // Handle offline submission
          const assessmentUuid = crypto.randomUUID()
          const timestamp = new Date()
          
          // Create offline assessment record
          await offlineDB.addAssessment({
            uuid: assessmentUuid,
            assessorId: useAuthStore.getState().user?.id || 'unknown',
            entityId: 'preliminary', // Preliminary assessments aren't tied to specific entities
            assessmentType: 'preliminary',
            data: data,
            timestamp,
            syncStatus: 'pending',
            lastModified: timestamp
          })

          // Add to sync queue
          const offlineStore = useOfflineStore.getState()
          await offlineStore.addToSyncQueue({
            type: 'assessment',
            action: 'create',
            entityUuid: assessmentUuid,
            priority: 5, // High priority for new assessments
            attempts: 0
          })

          // Create a mock assessment response for the UI
          const mockAssessment: PreliminaryAssessment & { incident?: Incident } = {
            id: assessmentUuid,
            reportingDate: new Date(data.data.reportingDate),
            reportingLatitude: data.data.reportingLatitude,
            reportingLongitude: data.data.reportingLongitude,
            reportingLGA: data.data.reportingLGA,
            reportingWard: data.data.reportingWard,
            numberLivesLost: data.data.numberLivesLost,
            numberInjured: data.data.numberInjured,
            numberDisplaced: data.data.numberDisplaced,
            numberHousesAffected: data.data.numberHousesAffected,
            numberSchoolsAffected: (data.data as any).numberSchoolsAffected || 0,
            schoolsAffected: data.data.schoolsAffected || null,
            numberMedicalFacilitiesAffected: (data.data as any).numberMedicalFacilitiesAffected || 0,
            medicalFacilitiesAffected: data.data.medicalFacilitiesAffected || null,
            estimatedAgriculturalLandsAffected: data.data.estimatedAgriculturalLandsAffected || null,
            reportingAgent: data.data.reportingAgent,
            additionalDetails: data.data.additionalDetails || null,
            incidentId: data.data.incidentId || null,
            createdAt: timestamp,
            updatedAt: timestamp
          }

          // Update recent assessments with offline indicator and remove current draft
          const state = get()
          const updatedRecent = [mockAssessment, ...state.recentAssessments.slice(0, 9)]
          const updatedDrafts = state.currentDraft 
            ? state.drafts.filter(d => d.id !== state.currentDraft!.id)
            : state.drafts
          
          set({ 
            recentAssessments: updatedRecent,
            drafts: updatedDrafts,
            currentDraft: null,
            isLoading: false 
          })

          return mockAssessment
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create assessment'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      updateAssessment: async (id: string, data: Partial<PreliminaryAssessmentData>) => {
        set({ isLoading: true, error: null })
        
        try {
          const apiResult = await apiPut(`/api/v1/preliminary-assessments/${id}`, { data })
          if (!apiResult.success) throw new Error(apiResult.error || 'Failed to update assessment')
          const body = apiResult.data as any
          const assessment = body?.data || body

          // Update in recent assessments
          const state = get()
          const updatedRecent = state.recentAssessments.map(a => 
            a.id === id ? assessment : a
          )
          
          set({ 
            recentAssessments: updatedRecent,
            isLoading: false 
          })

          return assessment
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update assessment'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      loadAssessments: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const apiResult = await apiGet('/api/v1/preliminary-assessments?limit=10')
          if (!apiResult.success) throw new Error(apiResult.error || 'Failed to load assessments')
          const body = apiResult.data as any
          
          set({ 
            recentAssessments: extractArray(body),
            isLoading: false 
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load assessments'
          set({ error: errorMessage, isLoading: false })
        }
      },

      saveDraft: (data: Partial<PreliminaryAssessmentData>, autoSave = false) => {
        const state = get()
        const draftId = state.currentDraft?.id || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        const draft: PreliminaryAssessmentDraft = {
          id: draftId,
          data,
          timestamp: Date.now(),
          autoSaved: autoSave
        }

        const updatedDrafts = state.drafts.filter(d => d.id !== draftId)
        updatedDrafts.unshift(draft)
        
        // Keep only last 5 drafts
        const recentDrafts = updatedDrafts.slice(0, 5)

        set({
          currentDraft: draft,
          drafts: recentDrafts
        })
      },

      loadDraft: (id: string) => {
        const state = get()
        const draft = state.drafts.find(d => d.id === id)
        
        if (draft) {
          set({ currentDraft: draft })
        }
      },

      deleteDraft: (id: string) => {
        const state = get()
        const updatedDrafts = state.drafts.filter(d => d.id !== id)
        
        set({ 
          drafts: updatedDrafts,
          currentDraft: state.currentDraft?.id === id ? null : state.currentDraft
        })
      },

      clearCurrentDraft: () => {
        set({ currentDraft: null })
      },

      captureGPS: async () => {
        set({ isCapturingGPS: true, gpsError: null })
        
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            const error = 'Geolocation is not supported by this browser'
            set({ gpsError: error, isCapturingGPS: false })
            reject(new Error(error))
            return
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              }
              
              set({ 
                gpsLocation: location,
                isCapturingGPS: false,
                gpsError: null 
              })
              
              resolve(location)
            },
            (error) => {
              let errorMessage = 'Failed to get location'
              
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = 'Location access denied by user'
                  break
                case error.POSITION_UNAVAILABLE:
                  errorMessage = 'Location information unavailable'
                  break
                case error.TIMEOUT:
                  errorMessage = 'Location request timed out'
                  break
              }
              
              set({ 
                gpsError: errorMessage,
                isCapturingGPS: false 
              })
              
              reject(new Error(errorMessage))
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            }
          )
        })
      },

      setManualLocation: (lat: number, lng: number) => {
        set({ 
          gpsLocation: { lat, lng },
          gpsError: null 
        })
      },

      clearGPSError: () => {
        set({ gpsError: null })
      },

      loadOfflineAssessments: async () => {
        set({ isLoading: true, error: null })
        
        try {
          // Get offline assessments
          const offlineAssessments = await offlineDB.assessments
            .where('assessmentType').equals('preliminary')
            .reverse()
            .sortBy('timestamp')

          // Convert to display format
          const displayAssessments = await Promise.all(
            offlineAssessments.map(async (assessment) => {
              const decryptedData = await offlineDB.decryptData(assessment.data, assessment.keyVersion)
              
              return {
                id: assessment.uuid,
                reportingDate: new Date(decryptedData.data.reportingDate),
                reportingLatitude: decryptedData.data.reportingLatitude,
                reportingLongitude: decryptedData.data.reportingLongitude,
                reportingLGA: decryptedData.data.reportingLGA,
                reportingWard: decryptedData.data.reportingWard,
                numberLivesLost: decryptedData.data.numberLivesLost,
                numberInjured: decryptedData.data.numberInjured,
                numberDisplaced: decryptedData.data.numberDisplaced,
                numberHousesAffected: decryptedData.data.numberHousesAffected,
                numberSchoolsAffected: decryptedData.data.numberSchoolsAffected || 0,
                schoolsAffected: decryptedData.data.schoolsAffected || null,
                numberMedicalFacilitiesAffected: decryptedData.data.numberMedicalFacilitiesAffected || 0,
                medicalFacilitiesAffected: decryptedData.data.medicalFacilitiesAffected || null,
                estimatedAgriculturalLandsAffected: decryptedData.data.estimatedAgriculturalLandsAffected || null,
                reportingAgent: decryptedData.data.reportingAgent,
                additionalDetails: decryptedData.data.additionalDetails || null,
                incidentId: decryptedData.data.incidentId || null,
                createdAt: assessment.timestamp,
                updatedAt: assessment.lastModified,
                _offline: true,
                _syncStatus: assessment.syncStatus
              }
            })
          )

          // Merge with existing online assessments
          const state = get()
          const allAssessments = [...displayAssessments, ...state.recentAssessments]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 20) // Keep last 20

          set({ 
            recentAssessments: allAssessments,
            isLoading: false 
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load offline assessments'
          set({ error: errorMessage, isLoading: false })
        }
      },

      syncOfflineAssessments: async () => {
        set({ isLoading: true, error: null })
        
        try {
          // Get pending offline assessments
          const pendingAssessments = await offlineDB.assessments
            .where('assessmentType').equals('preliminary')
            .and(assessment => assessment.syncStatus === 'pending')
            .toArray()

          let successCount = 0
          let failCount = 0

          for (const assessment of pendingAssessments) {
            try {
              const decryptedData = await offlineDB.decryptData(assessment.data, assessment.keyVersion)
              
              const apiResult = await apiPost('/api/v1/preliminary-assessments', decryptedData)

              if (apiResult.success) {
                // Mark as synced
                await offlineDB.updateAssessment(assessment.uuid, { syncStatus: 'synced' })
                successCount++
              } else {
                await offlineDB.updateAssessment(assessment.uuid, { syncStatus: 'failed' })
                failCount++
              }
            } catch (error) {
              await offlineDB.updateAssessment(assessment.uuid, { syncStatus: 'failed' })
              failCount++
            }
          }

          // Refresh assessments
          await get().loadOfflineAssessments()
          await get().loadAssessments()

          set({ isLoading: false })

          if (failCount > 0) {
            set({ error: `Synced ${successCount} assessments, ${failCount} failed` })
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to sync offline assessments'
          set({ error: errorMessage, isLoading: false })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      setError: (error: string) => {
        set({ error })
      }
    }),
    {
      name: 'preliminary-assessment-storage',
      partialize: (state) => ({
        drafts: state.drafts,
        recentAssessments: state.recentAssessments.slice(0, 5) // Only persist recent ones
      })
    }
  )
)