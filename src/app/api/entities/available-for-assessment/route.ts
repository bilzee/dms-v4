import { NextRequest } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response'
import { entityAssignmentService } from '@/lib/services/entity-assignment.service'

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || context.userId

    if (!userId) {
      return errorResponse('User ID is required', 400)
    }

    const userRoles = context.roles || []

    let availableEntities

    if (userRoles.includes('RESPONDER') || userRoles.includes('ASSESSOR')) {
      availableEntities = await entityAssignmentService.getAssignedEntities(userId)
    }
    else {
      const assignments = await entityAssignmentService.getUserAssignedEntities(userId)
      availableEntities = assignments.map(assignment => ({
        id: assignment.id,
        name: assignment.name,
        type: assignment.type,
        location: assignment.location,
        coordinates: null,
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    }

    const entitiesWithInfo = await Promise.all(
      availableEntities.map(async (entity) => {
        try {
          const assignedUsers = await entityAssignmentService.getEntityAssignedUsers(entity.id)

          let canCreate = false
          if (userRoles.includes('RESPONDER')) {
            canCreate = await entityAssignmentService.canCreateResponse(userId, entity.id)
          } else if (userRoles.includes('ASSESSOR')) {
            canCreate = await entityAssignmentService.canCreateAssessment(userId, entity.id)
          } else {
            canCreate = true
          }

          return {
            ...entity,
            assignedUsersCount: assignedUsers.length,
            canCreateAssessment: canCreate
          }
        } catch (err) {
          console.error(`Error loading assignment info for entity ${entity.id}:`, err)
          return {
            ...entity,
            assignedUsersCount: 0,
            canCreateAssessment: false
          }
        }
      })
    )

    return successResponse(entitiesWithInfo)
  } catch (error) {
    console.error('Error getting available entities for assessment:', error)
    return handleApiError(error)
  }
})
