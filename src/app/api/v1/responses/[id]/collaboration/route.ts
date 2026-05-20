import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { ResponseService } from '@/lib/services/response.service'
import { handleApiError } from '@/lib/api/response'

interface RouteParams {
  params: { id: string }
}

// Simple in-memory collaboration tracking (in production, use Redis or WebSocket)
const activeCollaborations = new Map<string, {
  responseId: string
  collaborators: Array<{
    userId: string
    userName: string
    email: string
    joinedAt: Date
    lastSeen: Date
    isEditing: boolean
  }>
  createdAt: Date
}>()

const COLLABORATION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

// Clean up expired collaborations
function cleanupExpiredCollaborations() {
  const now = Date.now()
  for (const [responseId, collaboration] of activeCollaborations.entries()) {
    if (now - collaboration.createdAt.getTime() > COLLABORATION_TIMEOUT) {
      activeCollaborations.delete(responseId)
    }
    
    // Clean up inactive collaborators
    collaboration.collaborators = collaboration.collaborators.filter(
      collaborator => now - collaborator.lastSeen.getTime() < 5 * 60 * 1000 // 5 minutes
    )
    
    if (collaboration.collaborators.length === 0) {
      activeCollaborations.delete(responseId)
    }
  }
}

export const GET = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    const { user, roles } = context;
    
    if (!roles.includes('RESPONDER')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Responder role required.' },
        { status: 403 }
      );
    }
      try {
        cleanupExpiredCollaborations()
        
        const { id: responseId } = params
        
        // Verify user has access to this response
        const response = await ResponseService.getResponseById(responseId, context.userId)
        
        // Get collaboration status
        const collaboration = activeCollaborations.get(responseId)
        const isCurrentUserCollaborating = collaboration?.collaborators.some(
          c => c.userId === context.userId
        ) || false
        
        const collaborationData = {
          isActive: !!collaboration,
          collaborators: collaboration?.collaborators.map(c => ({
            userId: c.userId,
            userName: c.userName,
            email: c.email,
            isEditing: c.isEditing,
            joinedAt: c.joinedAt,
            lastSeen: c.lastSeen
          })) || [],
          totalCollaborators: collaboration?.collaborators.length || 0,
          isCurrentUserCollaborating,
          canEdit: response.status === 'PLANNED' && (!collaboration || isCurrentUserCollaborating)
        }

        return NextResponse.json({
          success: true,
          data: collaborationData,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        }, { status: 200 })
      } catch (error) {
        return handleApiError(error)
      }
    }
)

export const POST = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    const { user, roles } = context;
    
    if (!roles.includes('RESPONDER')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Responder role required.' },
        { status: 403 }
      );
    }
      try {
        cleanupExpiredCollaborations()
        
        const { id: responseId } = params
        const body = await request.json()
        const { action } = body // 'join', 'leave', 'start_editing', 'stop_editing'
        
        // Verify user has access to this response
        const response = await ResponseService.getResponseById(responseId, context.userId)
        
        if (response.status !== 'PLANNED') {
          throw new Error('Only planned responses can be collaborated on')
        }

        let collaboration = activeCollaborations.get(responseId)
        
        if (!collaboration) {
          collaboration = {
            responseId,
            collaborators: [],
            createdAt: new Date()
          }
          activeCollaborations.set(responseId, collaboration)
        }

        const now = Date.now()
        const userCollaborator = {
          userId: context.userId,
          userName: (context.user as any).name,
          email: (context.user as any).email,
          joinedAt: new Date(),
          lastSeen: new Date(),
          isEditing: false
        }

        // Find existing collaborator
        const existingCollaboratorIndex = collaboration.collaborators.findIndex(
          c => c.userId === context.userId
        )

        switch (action) {
          case 'join':
            if (existingCollaboratorIndex === -1) {
              collaboration.collaborators.push(userCollaborator)
            } else {
              collaboration.collaborators[existingCollaboratorIndex].lastSeen = new Date()
            }
            break
            
          case 'leave':
            if (existingCollaboratorIndex !== -1) {
              collaboration.collaborators.splice(existingCollaboratorIndex, 1)
            }
            break
            
          case 'start_editing':
            if (existingCollaboratorIndex !== -1) {
              collaboration.collaborators[existingCollaboratorIndex].isEditing = true
              collaboration.collaborators[existingCollaboratorIndex].lastSeen = new Date()
            }
            break
            
          case 'stop_editing':
            if (existingCollaboratorIndex !== -1) {
              collaboration.collaborators[existingCollaboratorIndex].isEditing = false
              collaboration.collaborators[existingCollaboratorIndex].lastSeen = new Date()
            }
            break
            
          default:
            throw new Error('Invalid collaboration action')
        }

        // Clean up if no collaborators left
        if (collaboration.collaborators.length === 0) {
          activeCollaborations.delete(responseId)
        }

        const responseData = {
          success: true,
          action,
          collaborators: collaboration.collaborators.map(c => ({
            userId: c.userId,
            userName: c.userName,
            email: c.email,
            isEditing: c.isEditing,
            joinedAt: c.joinedAt,
            lastSeen: c.lastSeen
          })),
          totalCollaborators: collaboration.collaborators.length,
          isCurrentUserCollaborating: collaboration.collaborators.some(
            c => c.userId === context.userId
          )
        }

        return NextResponse.json({
          success: true,
          data: responseData,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        }, { status: 200 })
      } catch (error) {
        return handleApiError(error)
      }
    }
)