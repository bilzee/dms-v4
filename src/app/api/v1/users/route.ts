import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, errorResponse, createdResponse, handleApiError } from '@/lib/api/response'
import { paginatedResponse } from '@/lib/api/response'
import { AuthService } from '@/lib/auth/service'
import { prisma } from '@/lib/db/client'
import { CreateUserRequest, CreateUserResponse } from '@/types/auth'

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  organization: z.string().optional(),
  roleIds: z.array(z.string()).min(1, 'At least one role is required')
})

export const POST = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS')) {
    return errorResponse('Insufficient permissions. Manage users permission required.', 403);
  }

  try {
    const body = await request.json() as CreateUserRequest

    const validation = createUserSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse('Validation failed', 400, validation.error.errors)
    }

    const validatedData = validation.data

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return errorResponse('User with this email already exists', 409)
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username }
    })

    if (existingUsername) {
      return errorResponse('User with this username already exists', 409)
    }

    const roles = await prisma.role.findMany({
      where: { id: { in: validatedData.roleIds } }
    })

    if (roles.length !== validatedData.roleIds.length) {
      return errorResponse('One or more role IDs are invalid', 400)
    }

    const user = await AuthService.createUser({
      email: validatedData.email,
      username: validatedData.username,
      password: validatedData.password,
      name: validatedData.name,
      phone: validatedData.phone,
      organization: validatedData.organization,
      roleIds: validatedData.roleIds,
      assignedBy: context.userId
    })

    const { passwordHash, ...userWithoutPassword } = user as any

    return createdResponse({ user: userWithoutPassword })
  } catch (error) {
    console.error('Create user error:', error)
    return handleApiError(error)
  }
})

export const GET = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS')) {
    return errorResponse('Insufficient permissions. Manage users permission required.', 403);
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    const searchCondition = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ]
    } : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: searchCondition as any,
        include: {
          roles: {
            include: {
              role: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({
        where: searchCondition as any
      })
    ])

    const usersWithoutPasswords = users.map(({ passwordHash, ...user }: any) => user)

    return paginatedResponse(usersWithoutPasswords, page, limit, total)
  } catch (error) {
    console.error('List users error:', error)
    return handleApiError(error)
  }
})
