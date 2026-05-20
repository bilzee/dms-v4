import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response'
import { AuthService } from '@/lib/auth/service'

export const GET = withAuth(async (request, context) => {
  try {
    const user = await AuthService.getUserWithRoles(context.userId)

    if (!user) {
      return errorResponse('User not found', 404)
    }

    const { passwordHash, ...userWithoutPassword } = user as any

    const permissions = Array.from(
      new Set(
        user.roles.flatMap(ur =>
          ur.role.permissions.map((rp: any) => rp.permission.code)
        )
      )
    )

    return successResponse({
      user: userWithoutPassword,
      permissions
    })
  } catch (error) {
    console.error('Get user error:', error)
    return handleApiError(error)
  }
})
