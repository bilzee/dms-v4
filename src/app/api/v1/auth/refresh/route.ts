import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, handleApiError } from '@/lib/api/response'
import { AuthService } from '@/lib/auth/service'

export const POST = withAuth(async (request, context) => {
  try {
    const token = await AuthService.refreshToken(context.userId)

    return successResponse({ token })
  } catch (error) {
    console.error('Refresh token error:', error)
    return handleApiError(error)
  }
})
