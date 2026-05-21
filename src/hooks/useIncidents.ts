'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet, extractArray } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export interface Incident {
  id: string
  name: string
  type: string
  subType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'DRAFT' | 'ACTIVE' | 'RESOLVED' | 'CLOSED'
  description: string
  location: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  createdAt: string
  updatedAt: string
}

interface UseIncidentsOptions {
  status?: 'ACTIVE' | 'ALL'
  limit?: number
}

export function useIncidents(options: UseIncidentsOptions = {}) {
  const { status = 'ACTIVE', limit = 50 } = options
  
  const params = new URLSearchParams()
  if (status !== 'ALL') {
    params.append('status', status)
  }
  if (limit) {
    params.append('limit', limit.toString())
  }

  return useQuery({
    queryKey: ['incidents', options],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/incidents?${params.toString()}`)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch incidents')
      }
      return extractArray<Incident>(result.data)
    },
    enabled: !!getAuthToken(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

export function useActiveIncidents() {
  return useIncidents({ status: 'ACTIVE' })
}
