import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response'
import { AuthService } from '@/lib/auth/service'
import { prisma } from '@/lib/db/client'
import { AssignRolesRequest } from '@/types/auth'

const assignRolesSchema = z.object({
  roleIds: z.array(z.string()).min(1, 'At least one role is required')
})

interface RouteParams {
  params: {
    userId: string
  }
}

export const PUT = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context;
  if (!permissions.includes('ASSIGN_ROLES')) {
    return errorResponse('Insufficient permissions. Assign roles permission required.', 403);
  }

  const url = new URL(request.url)
  const params = { userId: url.pathname.split('/')[4] }
  try {
    const { userId } = params
    const body = await request.json() as AssignRolesRequest

    const validation = assignRolesSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse('Validation failed', 400, validation.error.errors)
    }

    const { roleIds } = validation.data

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return errorResponse('User not found', 404)
    }

    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } }
    })

    if (roles.length !== roleIds.length) {
      return errorResponse('One or more role IDs are invalid', 400)
    }

    await AuthService.assignRoles(userId, roleIds, context.userId)

    return successResponse({ message: 'Roles assigned successfully' })
  } catch (error) {
    console.error('Assign roles error:', error)
    return handleApiError(error)
  }
})

export const GET = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS')) {
    return errorResponse('Insufficient permissions. Manage users permission required.', 403);
  }

  const url = new URL(request.url)
  const params = { userId: url.pathname.split('/')[4] }
  try {
    const { userId } = params

    const user = await AuthService.getUserWithRoles(userId)

    if (!user) {
      return errorResponse('User not found', 404)
    }

    const roles = user.roles.map(ur => ur.role)

    return successResponse({ roles })
  } catch (error) {
    console.error('Get user roles error:', error)
    return handleApiError(error)
  }
})
