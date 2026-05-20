import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response'

interface RouteParams {
  params: {
    userId: string;
  }
}

export const GET = withAuth(async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
  try {
    const { userId } = params;
    const { roles, userId: currentUserId } = context;

    // Users can only view their own assignments unless they're a coordinator
    const hasCoordinatorRole = roles.includes('COORDINATOR');

    if (!hasCoordinatorRole && currentUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Can only view your own assignments' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's entity assignments
    const [assignments, total] = await Promise.all([
      prisma.entityAssignment.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true,
              coordinates: true,
              isActive: true
            }
          }
        },
        orderBy: {
          assignedAt: 'desc'
        }
      }),
      prisma.entityAssignment.count({
        where: { userId }
      })
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
    console.error('Error fetching user entity assignments:', error);
    return handleApiError(error);
  }
});