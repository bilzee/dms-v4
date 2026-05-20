import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

const createAssignmentSchema = z.object({
  userId: z.string().min(1),
  entityId: z.string().min(1),
  assignedBy: z.string().min(1)
});

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { user, roles } = context;
  
  if (!roles.includes('COORDINATOR')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Coordinator role required.' },
      { status: 403 }
    );
  }
  try {
    const body = await request.json();
    const validatedData = createAssignmentSchema.parse(body);

    // Check if user exists and has appropriate role (ASSESSOR, RESPONDER, or DONOR)
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const hasAssignableRole = targetUser.roles.some(
      (userRole: any) => ['ASSESSOR', 'RESPONDER', 'DONOR'].includes(userRole.role.name)
    );

    if (!hasAssignableRole) {
      return NextResponse.json(
        { error: 'User must have at least one ASSESSOR, RESPONDER, or DONOR role to be assigned to entities' },
        { status: 400 }
      );
    }

    // Check if entity exists
    const entity = await prisma.entity.findUnique({
      where: { id: validatedData.entityId }
    });

    if (!entity) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      );
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.entityAssignment.findUnique({
      where: {
        userId_entityId: {
          userId: validatedData.userId,
          entityId: validatedData.entityId
        }
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Assignment already exists' },
        { status: 409 }
      );
    }

    // Create the assignment
    const assignment = await prisma.entityAssignment.create({
      data: {
        userId: validatedData.userId,
        entityId: validatedData.entityId,
        assignedBy: validatedData.assignedBy
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            roles: {
              include: {
                role: true
              }
            }
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: assignment
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating entity assignment:', error);
    return handleApiError(error);
  }
  }
);

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get assignments with pagination
    const [assignments, total] = await Promise.all([
      prisma.entityAssignment.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              roles: {
                include: {
                  role: true
                }
              }
            }
          },
          entity: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true
            }
          }
        },
        orderBy: {
          assignedAt: 'desc'
        }
      }),
      prisma.entityAssignment.count()
    ]);

    return NextResponse.json({
      success: true,
      data: assignments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching entity assignments:', error);
    return handleApiError(error);
  }
});