import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { v4 as uuidv4 } from 'uuid'
import { handleApiError } from '@/lib/api/response'

// Validation schema for updating donor
const UpdateDonorSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').optional(),
  organization: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  userCredentials: z.object({
    name: z.string().min(2, 'Contact name must be at least 2 characters').optional(),
    email: z.string().email().optional(),
    username: z.string().min(3, 'Username must be at least 3 characters').optional()
  }).optional()
})

export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    // Role check: ADMIN, COORDINATOR, or DONOR (own profile only)
    const isAdmin = context.roles.includes('ADMIN')
    const isCoordinator = context.roles.includes('COORDINATOR')
    const isDonor = context.roles.includes('DONOR')

    if (!isAdmin && !isCoordinator && !isDonor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 403 }
      )
    }

    const donorId = params.id

    if (!donorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Donor ID is required',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      )
    }

    // Get donor first
    const donor = await prisma.donor.findUnique({
      where: { id: donorId },
      include: {
        _count: {
          select: {
            commitments: true,
          }
        }
      }
    })

    if (!donor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Donor not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 404 }
      )
    }

    // DONOR users can only access their own profile
    if (isDonor && !isAdmin && !isCoordinator) {
      const userOrg = (context.user as any).organization
      if (donor.name !== userOrg) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient permissions',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 403 }
        )
      }
    }

    // Find the linked user through organization matching
    const linkedUser = await prisma.user.findFirst({
      where: {
        organization: donor.name,
        roles: {
          some: {
            role: {
              name: 'DONOR'
            }
          }
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        organization: true,
        isActive: true,
        isLocked: true,
        createdAt: true
      }
    })

    // Count entity assignments for this user
    let entityAssignmentCount = 0
    if (linkedUser) {
      entityAssignmentCount = await prisma.entityAssignment.count({
        where: {
          userId: linkedUser.id
        }
      })
    }

    // Count responses through PlanCommitment
    const responseCount = await prisma.rapidResponse.count({
      where: {
        planCommitments: {
          some: {
            commitment: {
              donorId: donor.id
            }
          }
        }
      }
    })

    // Combine data
    const donorWithUser = {
      ...donor,
      user: linkedUser,
      _count: {
        ...donor._count,
        responses: responseCount,
        entityAssignments: entityAssignmentCount
      }
    }

    return NextResponse.json({
      success: true,
      data: donorWithUser,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
})

export const PUT = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    // Role check: ADMIN or COORDINATOR only
    if (!context.roles.some(r => ['ADMIN', 'COORDINATOR'].includes(r))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 403 }
      )
    }

    const donorId = params.id
    const body = await request.json()

    if (!donorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Donor ID is required',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      )
    }

    // Validate input
    const validation = UpdateDonorSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
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

    const { userCredentials, ...donorData } = validation.data

    // Check if donor exists and get linked user
    const existingDonor = await prisma.donor.findUnique({
      where: { id: donorId }
    })

    if (!existingDonor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Donor not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 404 }
      )
    }

    // Find linked user
    const existingUser = await prisma.user.findFirst({
      where: {
        organization: existingDonor.name,
        roles: {
          some: {
            role: {
              name: 'DONOR'
            }
          }
        }
      }
    })

    // Check for conflicts if updating name or email
    if (donorData.name && donorData.name !== existingDonor.name) {
      const nameConflict = await prisma.donor.findFirst({
        where: {
          name: { equals: donorData.name, mode: 'insensitive' },
          id: { not: donorId }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          {
            success: false,
            error: 'Organization with this name already exists',
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

    if (donorData.contactEmail && donorData.contactEmail !== existingDonor.contactEmail) {
      const emailConflict = await prisma.donor.findFirst({
        where: {
          contactEmail: { equals: donorData.contactEmail, mode: 'insensitive' },
          id: { not: donorId }
        }
      })

      if (emailConflict) {
        return NextResponse.json(
          {
            success: false,
            error: 'Organization with this contact email already exists',
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

    // Check for user conflicts if updating user credentials
    if (userCredentials) {
      if (userCredentials.email && userCredentials.email !== existingUser?.email) {
        const userEmailConflict = await prisma.user.findFirst({
          where: {
            email: { equals: userCredentials.email, mode: 'insensitive' },
            id: { not: existingUser?.id }
          }
        })

        if (userEmailConflict) {
          return NextResponse.json(
            {
              success: false,
              error: 'User with this email already exists',
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

      if (userCredentials.username && userCredentials.username !== existingUser?.username) {
        const usernameConflict = await prisma.user.findFirst({
          where: {
            username: { equals: userCredentials.username, mode: 'insensitive' },
            id: { not: existingUser?.id }
          }
        })

        if (usernameConflict) {
          return NextResponse.json(
            {
              success: false,
              error: 'User with this username already exists',
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
    }

    // Update donor and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update donor
      const updatedDonor = await tx.donor.update({
        where: { id: donorId },
        data: {
          ...(donorData.name && { name: donorData.name }),
          ...(donorData.organization !== undefined && { organization: donorData.organization }),
          ...(donorData.contactEmail !== undefined && { contactEmail: donorData.contactEmail }),
          ...(donorData.contactPhone !== undefined && { contactPhone: donorData.contactPhone }),
          ...(donorData.isActive !== undefined && { isActive: donorData.isActive })
        },
        include: {
          _count: {
            select: {
              commitments: true,
            }
          }
        }
      })

      // Update linked user if userCredentials provided
      if (userCredentials && existingUser) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            ...(userCredentials.name && { name: userCredentials.name }),
            ...(userCredentials.email && { email: userCredentials.email }),
            ...(userCredentials.username && { username: userCredentials.username }),
            // Update user organization field to match donor name if donor name changed
            ...(donorData.name && { organization: donorData.name })
          }
        })

        // Refetch to get updated donor and user data
        const finalDonor = await tx.donor.findUnique({
          where: { id: donorId },
          include: {
            _count: {
              select: {
                commitments: true,
              }
            }
          }
        })

        const finalUser = await tx.user.findFirst({
          where: {
            organization: finalDonor?.name,
            roles: {
              some: {
                role: {
                  name: 'DONOR'
                }
              }
            }
          },
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            organization: true,
            isActive: true,
            isLocked: true,
            createdAt: true
          }
        })

        const entityAssignments = await tx.entityAssignment.count({
          where: {
            userId: finalUser?.id
          }
        })

        return {
          ...finalDonor,
          user: finalUser,
          _count: {
            ...finalDonor?._count,
            entityAssignments
          }
        } as any
      }

      // If no user credentials update, still need to return proper structure with user data
      const finalUser = await tx.user.findFirst({
        where: {
          organization: updatedDonor.name,
          roles: {
            some: {
              role: {
                name: 'DONOR'
              }
            }
          }
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          organization: true,
          isActive: true,
          isLocked: true,
          createdAt: true
        }
      })

      const entityAssignmentCount = finalUser ? await tx.entityAssignment.count({
        where: {
          userId: finalUser.id
        }
      }) : 0

      return {
        ...updatedDonor,
        user: finalUser,
        _count: {
          ...updatedDonor._count,
          entityAssignments: entityAssignmentCount
        }
      } as any
    })

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
})
