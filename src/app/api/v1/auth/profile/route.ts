import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
import { AuthService } from '@/lib/auth/service'
import { prisma } from '@/lib/db/client'
import { handleApiError } from '@/lib/api/response'

const updateProfileSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().optional(),
  organization: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional()
}).refine((data) => {
  if (data.newPassword && data.newPassword.length > 0) {
    return data.currentPassword && data.currentPassword.length > 0
  }
  return true
}, {
  message: 'Current password is required when changing password',
  path: ['currentPassword']
})

// Update own profile
export const PUT = withAuth(async (request, context) => {
  try {
    const body = await request.json()
    
    // Validate input
    const validation = updateProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      )
    }

    const validatedData = validation.data
    const userId = context.userId

    // Get current user
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
      return NextResponse.json(
        {
          error: 'User not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 404 }
      )
    }

    // Check for email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email }
      })
      
      if (emailExists) {
        return NextResponse.json(
          {
            error: 'Email already exists',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 409 }
        )
      }
    }

    // Verify current password if changing password
    if (validatedData.newPassword && validatedData.currentPassword) {
      const isValidPassword = await AuthService.comparePassword(
        validatedData.currentPassword,
        existingUser.passwordHash
      )
      
      if (!isValidPassword) {
        return NextResponse.json(
          {
            error: 'Current password is incorrect',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.email !== undefined) updateData.email = validatedData.email
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone
    if (validatedData.organization !== undefined) updateData.organization = validatedData.organization

    // Handle password change
    if (validatedData.newPassword) {
      const hashedPassword = await AuthService.hashPassword(validatedData.newPassword)
      updateData.passwordHash = hashedPassword
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = updatedUser

    return NextResponse.json(
      {
        success: true,
        data: {
          user: userWithoutPassword
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 200 }
    )
  } catch (error) {
    return handleApiError(error)
  }
})

// Get own profile
export const GET = withAuth(async (request, context) => {
  try {
    const userId = context.userId

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
      return NextResponse.json(
        {
          error: 'User not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 404 }
      )
    }

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        success: true,
        data: {
          user: userWithoutPassword
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 200 }
    )
  } catch (error) {
    return handleApiError(error)
  }
})