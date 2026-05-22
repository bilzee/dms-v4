import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ResponseService } from '@/lib/services/response-client.service'
import { useAuth } from '@/hooks/useAuth'

interface CollaborationState {
  isActive: boolean
  collaborators: Array<{
    userId: string
    userName: string
    email: string
    isEditing: boolean
    joinedAt: Date
    lastSeen: Date
  }>
  totalCollaborators: number
  isCurrentUserCollaborating: boolean
  canEdit: boolean
}

export function useCollaboration(responseId: string | null) {
  const { user } = useAuth()
  const [localState, setLocalState] = useState<CollaborationState>({
    isActive: false,
    collaborators: [],
    totalCollaborators: 0,
    isCurrentUserCollaborating: false,
    canEdit: true
  })

  // Get collaboration status
  const { data: collaborationData, refetch } = useQuery({
    queryKey: ['collaboration', responseId],
    queryFn: async () => {
      if (!responseId) return null
      return await ResponseService.getCollaborationStatus(responseId)
    },
    enabled: !!responseId,
    refetchInterval: 10000 // Poll every 10 seconds
  })

  // Update local state when data changes
  useEffect(() => {
    if (collaborationData) {
      setLocalState(collaborationData)
    }
  }, [collaborationData])

  // Collaboration actions
  const collaborationMutation = useMutation({
    mutationFn: async ({ action }: { action: 'join' | 'leave' | 'start_editing' | 'stop_editing' }) => {
      if (!responseId) throw new Error('Response ID is required')
      return await ResponseService.updateCollaboration(responseId, action)
    },
    onSuccess: () => {
      // Refetch collaboration status after action
      refetch()
    }
  })

  const joinCollaboration = useCallback(() => {
    collaborationMutation.mutate({ action: 'join' })
  }, [collaborationMutation])

  const leaveCollaboration = useCallback(() => {
    collaborationMutation.mutate({ action: 'leave' })
  }, [collaborationMutation])

  const startEditing = useCallback(() => {
    collaborationMutation.mutate({ action: 'start_editing' })
  }, [collaborationMutation])

  const stopEditing = useCallback(() => {
    collaborationMutation.mutate({ action: 'stop_editing' })
  }, [collaborationMutation])

  // Auto-join collaboration when viewing a response
  useEffect(() => {
    if (responseId && !localState.isCurrentUserCollaborating && localState.isActive) {
      joinCollaboration()
    }
  }, [responseId, localState.isCurrentUserCollaborating, localState.isActive, joinCollaboration])

  return {
    ...localState,
    isLoading: collaborationMutation.isPending,
    refetch,
    actions: {
      joinCollaboration,
      leaveCollaboration,
      startEditing,
      stopEditing
    }
  }
}