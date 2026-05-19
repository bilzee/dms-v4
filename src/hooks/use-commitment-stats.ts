'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'

interface CommitmentStats {
  totalCommitments: number
  availableCommitments: number
  totalValue: number
  recentCommitments: number
}

interface DonorCommitment {
  id: string
  donorId: string
  donor: {
    name: string
    type: string
  }
  totalCommittedQuantity: number
  deliveredQuantity: number
  availableQuantity: number
  status: string
  items: Array<{
    name: string
    unit: string
    quantity: number
  }>
  commitmentDate?: string
  createdAt?: string
  lastUpdated?: string
}

export function useCommitmentStats() {
  const [stats, setStats] = useState<CommitmentStats | null>(null)
  const [recentCommitments, setRecentCommitments] = useState<DonorCommitment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, hasPermission } = useAuth()

  useEffect(() => {
    const fetchCommitmentStats = async () => {
      if (!hasPermission('RESPONDER')) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Fetch available commitments for the responder
        const result = await apiGet<DonorCommitment[]>('/api/v1/commitments/available')

        if (result.success && result.data) {
          const commitments = result.data
          
          // Calculate statistics
          const totalCommitments = commitments.length
          const availableCommitments = commitments.filter((c: DonorCommitment) => 
            c.status === 'PLANNED' && c.availableQuantity > 0
          ).length
          const totalValue = commitments.reduce((sum: number, c: DonorCommitment) => 
            sum + c.totalCommittedQuantity, 0
          )
          const recentCommitments = commitments.filter((c: DonorCommitment) => {
            const commitmentDate = new Date(c.commitmentDate || c.createdAt || Date.now())
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            return commitmentDate > sevenDaysAgo
          }).length

          setStats({
            totalCommitments,
            availableCommitments,
            totalValue,
            recentCommitments,
          })

          // Get recent commitments for display (limit to 5)
          setRecentCommitments(commitments.slice(0, 5))
        } else {
          throw new Error(result.error || 'Failed to fetch commitment statistics')
        }
      } catch (err) {
        console.error('Error fetching commitment stats:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchCommitmentStats()
  }, [user, hasPermission])

  return { stats, recentCommitments, loading, error }
}
