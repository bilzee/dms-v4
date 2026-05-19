import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DonorProfileUpdateInput } from '@/lib/validation/donor'
import { apiGet, apiPatch, apiPost } from '@/lib/api'

export interface DonorProfile {
  id: string
  name: string
  type: string
  contactEmail?: string
  contactPhone?: string
  organization?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  metrics: {
    commitments: {
      total: number
      totalCommitted: number
      delivered: number
      deliveryRate: number
    }
    responses: {
      total: number
    }
    combined: {
      totalActivities: number
    }
  }
}

export interface DonorProfileResponse {
  donor: DonorProfile
}

export interface DonorEntity {
  id: string
  name: string
  type: string
  location?: string
  coordinates?: { lat: number; lng: number } | null
  isActive: boolean
  autoApproveEnabled: boolean
  createdAt: string
  stats: {
    verifiedAssessments: number
    responses: number
    commitments: number
  }
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

// Hook for donor profile operations
export function useDonorProfile() {
  const queryClient = useQueryClient()

  const {
    data: profileData,
    isLoading,
    error,
    refetch
  } = useQuery<DonorProfileResponse>({
    queryKey: ['donor-profile'],
    queryFn: async () => {
      const result = await apiGet<DonorProfileResponse>('/api/v1/donors/profile')
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch donor profile')
      }
      return result.data!
    },
    enabled: (() => { try { return !!localStorage.getItem('auth_token') } catch { return false } })()
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: DonorProfileUpdateInput) => {
      const result = await apiPatch('/api/v1/donors/profile', data)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-profile'] })
    }
  })

  return {
    profile: profileData?.donor,
    isLoading,
    error,
    refetch,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending
  }
}

// Hook for donor entities
export function useDonorEntities(filters?: {
  search?: string
  type?: string
  page?: number
  limit?: number
}) {
  const {
    data: entitiesData,
    isLoading,
    error,
    refetch
  } = useQuery<DonorEntitiesResponse>({
    queryKey: ['donor-entities', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())

      const result = await apiGet<DonorEntitiesResponse>(`/api/v1/donors/entities?${params}`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch donor entities')
      }
      return result.data!
    },
    enabled: (() => { try { return !!localStorage.getItem('auth_token') } catch { return false } })()
  })

  return {
    entities: entitiesData?.entities || [],
    pagination: entitiesData?.pagination,
    summary: entitiesData?.summary,
    isLoading,
    error,
    refetch
  }
}

// Hook for donor registration
export function useDonorRegistration() {
  const mutation = useMutation({
    mutationFn: async (data: {
      name: string
      type: string
      contactEmail?: string
      contactPhone?: string
      organization?: string
      userCredentials: {
        username: string
        password: string
        email: string
        name: string
      }
    }) => {
      const result = await apiPost('/api/v1/donors', data)
      if (!result.success) {
        throw new Error(result.error || 'Registration failed')
      }
      return result
    },
    onSuccess: (data) => {
      // Store auth token
      try {
        localStorage.setItem('auth_token', data.data.token)
        localStorage.setItem('user_data', JSON.stringify(data.data.user))
      } catch (error) {
        console.error('Failed to store auth data in localStorage:', error)
      }
    }
  })

  return {
    register: mutation.mutateAsync,
    isRegistering: mutation.isPending,
    error: mutation.error,
    data: mutation.data
  }
}

// Hook for donor authentication context
export function useDonorAuth() {
  const profileResult = useDonorProfile()

  const isDonor = !!profileResult.profile
  const isProfileComplete = !!(
    profileResult.profile?.name && 
    (profileResult.profile?.contactEmail || profileResult.profile?.contactPhone)
  )

  return {
    isDonor,
    isProfileComplete,
    profile: profileResult.profile,
    isLoading: profileResult.isLoading,
    error: profileResult.error
  }
}
