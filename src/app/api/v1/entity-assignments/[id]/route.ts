import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const DELETE = withAuth(
  async (request: NextRequest, context: any) => {
    const { user, roles } = context;
    
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }
      try {
        // Extract ID from URL since we're not using async params
        const url = new URL(request.url);
        const pathname = url.pathname;
        const id = pathname.split('/').pop();

    // Check if assignment exists
    const assignment = await prisma.entityAssignment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Delete the assignment
    await prisma.entityAssignment.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully',
      data: assignment
    });

  } catch (error) {
    console.error('Error deleting entity assignment:', error);
    return handleApiError(error);
  }
    }
)

export const GET = withAuth(async (request: NextRequest, context: any) => {
  try {
    // Extract ID from URL since we're not using async params
    const url = new URL(request.url);
    const pathname = url.pathname;
    const id = pathname.split('/').pop();

    // Get specific assignment
    const assignment = await prisma.entityAssignment.findUnique({
      where: { id },
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
            location: true,
            coordinates: true,
            metadata: true
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: assignment
    });

  } catch (error) {
    console.error('Error fetching entity assignment:', error);
    return handleApiError(error);
  }
});