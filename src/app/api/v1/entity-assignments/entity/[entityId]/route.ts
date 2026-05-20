import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response'

interface RouteParams {
  params: {
    entityId: string;
  }
}

export const GET = withAuth(async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
  try {
    const { entityId } = params;
    const { user, userId, roles } = context;

    // Only coordinators can view entity assignments, or users can view if they're assigned
    const hasCoordinatorRole = roles.includes('COORDINATOR');

    if (!hasCoordinatorRole) {
      // Check if current user is assigned to this entity
      const userAssignment = await prisma.entityAssignment.findUnique({
        where: {
          userId_entityId: {
            userId: userId,
            entityId
          }
        }
      });

      if (!userAssignment) {
        return NextResponse.json(
          { error: 'Forbidden: Not assigned to this entity' },
          { status: 403 }
        );
      }
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Check if entity exists
    const entity = await prisma.entity.findUnique({
      where: { id: entityId }
    });

    if (!entity) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      );
    }

    // Get entity's user assignments
    const [assignments, total] = await Promise.all([
      prisma.entityAssignment.findMany({
        where: { entityId },
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
          }
        },
        orderBy: {
          assignedAt: 'desc'
        }
      }),
      prisma.entityAssignment.count({
        where: { entityId }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: assignments,
      entity: {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        location: entity.location
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching entity user assignments:', error);
    return handleApiError(error);
  }
});