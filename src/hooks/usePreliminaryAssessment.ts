import { usePreliminaryAssessmentStore } from '@/stores/preliminary-assessment.store'
import { useAuth } from '@/hooks/useAuth'
import { setAuthToken } from '@/lib/auth/token-utils'

export const usePreliminaryAssessment = () => {
  const store = usePreliminaryAssessmentStore()
  const { token } = useAuth()

  // Update localStorage token for store methods - use consistent key
  if (token && typeof window !== 'undefined') {
    setAuthToken(token)
  }

  return {
    // State
    currentDraft: store.currentDraft,
    isLoading: store.isLoading,
    error: store.error,
    recentAssessments: store.recentAssessments,
    drafts: store.drafts,
    gpsLocation: store.gpsLocation,
    gpsError: store.gpsError,
    isCapturingGPS: store.isCapturingGPS,

    // Assessment operations
    createAssessment: store.createAssessment,
    updateAssessment: store.updateAssessment,
    loadAssessments: store.loadAssessments,
    loadOfflineAssessments: store.loadOfflineAssessments,
    syncOfflineAssessments: store.syncOfflineAssessments,

    // Draft management
    saveDraft: store.saveDraft,
    loadDraft: store.loadDraft,
    deleteDraft: store.deleteDraft,
    clearCurrentDraft: store.clearCurrentDraft,

    // GPS operations
    captureGPS: store.captureGPS,
    setManualLocation: store.setManualLocation,
    clearGPSError: store.clearGPSError,

    // Utility
    clearError: store.clearError,
    setError: store.setError
  }
}