import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response'
import { AuthService } from '@/lib/auth/service'
import { prisma } from '@/lib/db/client'

const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().optional(),
  organization: z.string().optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
  resetPassword: z.boolean().optional()
})

interface RouteParams {
  params: { userId: string }
}

export const PUT = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS')) {
    return errorResponse('Insufficient permissions. Manage users permission required.', 403);
  }

  try {
    const { userId } = params

    if (!userId) {
      return errorResponse('User ID is required', 400)
    }

    const body = await request.json()

    const validation = updateUserSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse('Validation failed', 400, validation.error.errors)
    }

    const validatedData = validation.data

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!existingUser) {
      return errorResponse('User not found', 404)
    }

    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email }
      })

      if (emailExists) {
        return errorResponse('Email already exists', 409)
      }
    }

    if (validatedData.username && validatedData.username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: validatedData.username }
      })

      if (usernameExists) {
        return errorResponse('Username already exists', 409)
      }
    }

    if (validatedData.roleIds) {
      const roles = await prisma.role.findMany({
        where: { id: { in: validatedData.roleIds } }
      })

      if (roles.length !== validatedData.roleIds.length) {
        return errorResponse('One or more role IDs are invalid', 400)
      }
    }

    const updateData: any = {}

    if (validatedData.email !== undefined) updateData.email = validatedData.email
    if (validatedData.username !== undefined) updateData.username = validatedData.username
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone
    if (validatedData.organization !== undefined) updateData.organization = validatedData.organization
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive

    if (validatedData.resetPassword) {
      const hashedPassword = await AuthService.hashPassword('defaultpass123!')
      updateData.passwordHash = hashedPassword
    }

    const updatedUser = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: updateData
      })

      if (validatedData.roleIds) {
        await tx.userRole.deleteMany({
          where: { userId: userId }
        })

        await tx.userRole.createMany({
          data: validatedData.roleIds.map(roleId => ({
            userId: userId,
            roleId: roleId,
            assignedBy: context.userId,
            assignedAt: new Date()
          }))
        })
      }

      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      })
    })

    const { passwordHash, ...userWithoutPassword } = updatedUser!

    return successResponse({ user: userWithoutPassword })
  } catch (error) {
    console.error('Update user error:', error)
    return handleApiError(error)
  }
})

export const GET = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS')) {
    return errorResponse('Insufficient permissions. Manage users permission required.', 403);
  }

  try {
    const { userId } = params

    if (!userId) {
      return errorResponse('User ID is required', 400)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      return errorResponse('User not found', 404)
    }

    const { passwordHash, ...userWithoutPassword } = user

    return successResponse({ user: userWithoutPassword })
  } catch (error) {
    console.error('Get user error:', error)
    return handleApiError(error)
  }
})
