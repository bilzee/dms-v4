import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

interface SeverityThreshold {
  id: string
  impactType: 'POPULATION' | 'PRELIMINARY'
  severityLevel: 'MEDIUM' | 'HIGH' | 'CRITICAL'
  livesLostMin: number
  injuredMin?: number
  displacedMin?: number
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface SeverityCalculationResult {
  level: string
  color: string
}

// Default fallback thresholds
const defaultThresholds: Record<string, SeverityThreshold[]> = {
  POPULATION: [
    {
      id: 'pop_medium',
      impactType: 'POPULATION',
      severityLevel: 'MEDIUM',
      livesLostMin: 1,
      injuredMin: 1,
      description: 'Any casualties reported',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'pop_high',
      impactType: 'POPULATION',
      severityLevel: 'HIGH',
      livesLostMin: 11,
      injuredMin: 101,
      description: 'Significant casualties (>10 deaths OR >100 injured)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'pop_critical',
      impactType: 'POPULATION',
      severityLevel: 'CRITICAL',
      livesLostMin: 101,
      injuredMin: 501,
      description: 'Mass casualties (>100 deaths OR >500 injured)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  PRELIMINARY: [
    {
      id: 'prelim_medium',
      impactType: 'PRELIMINARY',
      severityLevel: 'MEDIUM',
      livesLostMin: 1,
      injuredMin: 1,
      displacedMin: 1,
      description: 'Any casualties or displacement reported',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prelim_high',
      impactType: 'PRELIMINARY',
      severityLevel: 'HIGH',
      livesLostMin: 11,
      injuredMin: 51,
      displacedMin: 501,
      description: 'Significant impact (>10 deaths OR >50 injured OR >500 displaced)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prelim_critical',
      impactType: 'PRELIMINARY',
      severityLevel: 'CRITICAL',
      livesLostMin: 51,
      displacedMin: 1001,
      description: 'Mass casualties/displacement (>50 deaths OR >1000 displaced)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

// Fetch severity thresholds
const fetchSeverityThresholds = async (impactType: string): Promise<SeverityThreshold[]> => {
  try {
    const response = await apiGet(`/api/v1/severity-thresholds?impactType=${impactType}`)
    if (!response.success) {
      // Fallback to defaults if API fails
      return defaultThresholds[impactType] || []
    }
    return response.data as SeverityThreshold[]
  } catch (error) {
    // Fallback to defaults if API fails
    return defaultThresholds[impactType] || []
  }
}

// Custom hook for severity thresholds
export function useSeverityThresholds(impactType: 'POPULATION' | 'PRELIMINARY') {
  const query = useQuery({
    queryKey: ['severityThresholds', impactType],
    queryFn: () => fetchSeverityThresholds(impactType),
    enabled: !!getAuthToken(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Calculate severity based on thresholds
  const calculateSeverity = (
    livesLost: number, 
    injured?: number, 
    displaced?: number
  ): SeverityCalculationResult => {
    const thresholds = query.data || defaultThresholds[impactType] || []
    
    // Sort thresholds by priority (CRITICAL > HIGH > MEDIUM)
    const sortedThresholds = thresholds
      .filter(t => t.isActive)
      .sort((a, b) => {
        const order = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1 }
        return order[b.severityLevel] - order[a.severityLevel]
      })

    // Check each threshold level starting from highest
    for (const threshold of sortedThresholds) {
      let meetsThreshold = false

      // Check lives lost
      if (livesLost >= threshold.livesLostMin) {
        meetsThreshold = true
      }

      // Check injured (if applicable)
      if (!meetsThreshold && threshold.injuredMin !== undefined && injured !== undefined) {
        if (injured >= threshold.injuredMin) {
          meetsThreshold = true
        }
      }

      // Check displaced (if applicable)
      if (!meetsThreshold && threshold.displacedMin !== undefined && displaced !== undefined) {
        if (displaced >= threshold.displacedMin) {
          meetsThreshold = true
        }
      }

      // If any condition is met, return this severity level
      if (meetsThreshold) {
        return {
          level: threshold.severityLevel,
          color: getSeverityColor(threshold.severityLevel)
        }
      }
    }

    // Default to LOW if no thresholds are met
    return {
      level: 'Low',
      color: 'text-green-600 bg-green-100'
    }
  }

  return {
    ...query,
    calculateSeverity
  }
}

// Helper function to get severity colors
function getSeverityColor(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return 'text-red-600 bg-red-100'
    case 'HIGH':
      return 'text-orange-600 bg-orange-100'
    case 'MEDIUM':
      return 'text-yellow-600 bg-yellow-100'
    default:
      return 'text-green-600 bg-green-100'
  }
}