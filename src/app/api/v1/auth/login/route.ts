import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthService } from '@/lib/auth/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response'
import { LoginRequest, LoginResponse } from '@/types/auth'

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as LoginRequest

    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse('Validation failed', 400, validation.error.errors)
    }

    const { email, password } = validation.data

    const authResult = await AuthService.authenticate(email, password)

    if (!authResult) {
      return errorResponse('Invalid email or password', 401)
    }

    const { user, token } = authResult

    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      phone: user.phone,
      organization: user.organization,
      isActive: user.isActive,
      isLocked: user.isLocked,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map(ur => ({
        role: {
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
          createdAt: ur.role.createdAt,
          permissions: ur.role.permissions.map(rp => ({
            permission: {
              id: rp.permission.id,
              code: rp.permission.code,
              name: rp.permission.name,
              description: rp.permission.description,
              category: rp.permission.category,
              createdAt: rp.permission.createdAt
            }
          }))
        }
      }))
    }

    return successResponse({
      user: userWithoutPassword,
      token,
      roles: user.roles.map(ur => ur.role)
    })
  } catch (error) {
    console.error('Login error:', error)
    return handleApiError(error)
  }
}
