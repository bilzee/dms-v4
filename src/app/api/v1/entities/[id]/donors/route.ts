import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Validation schema for the entity ID
const EntityDonorsParamsSchema = z.object({
  id: z.string().min(1, 'Entity ID is required'),
})

export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    // RBAC: COORDINATOR, ADMIN, DONOR can view entity donors
    if (!context.roles.some(r => ['COORDINATOR', 'ADMIN', 'DONOR'].includes(r))) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view entity donors', meta: { timestamp: new Date().toISOString(), version: '1.0.0' } },
        { status: 403 }
      );
    }

    // Validate the entity ID parameter
    const validationResult = EntityDonorsParamsSchema.safeParse(params)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid entity ID',
          details: validationResult.error.errors,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        },
        { status: 400 }
      )
    }

    const { id: entityId } = validationResult.data

    // Check if the entity exists
    const entity = await prisma.entity.findUnique({
      where: { id: entityId }
    })

    if (!entity) {
      return NextResponse.json(
        {
          error: 'Entity not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        },
        { status: 404 }
      )
    }

    // Get all unique donors that have commitments for this entity
    const entityDonors = await prisma.donor.findMany({
      where: {
        commitments: {
          some: {
            entityId: entityId
          }
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        organization: true,
        isActive: true,
        contactEmail: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(
      {
        data: entityDonors,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          count: entityDonors.length,
          entityId: entityId
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching entity donors:', error)

    const errorMessage = error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json(
      {
        error: errorMessage,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
})