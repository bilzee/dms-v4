import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { user, roles } = context;

  if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
    return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
  }

  try {
    const url = new URL(request.url);
    const roleFilter = url.searchParams.get('role');

    let roleWhere = {};
    if (roleFilter && ['ASSESSOR', 'RESPONDER', 'DONOR'].includes(roleFilter)) {
      roleWhere = {
        roles: {
          some: {
            role: {
              name: roleFilter
            }
          }
        }
      };
    } else {
      roleWhere = {
        roles: {
          some: {
            role: {
              name: {
                in: ['ASSESSOR', 'RESPONDER', 'DONOR']
              }
            }
          }
        }
      };
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...roleWhere
      },
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return successResponse(users);

  } catch (error) {
    console.error('Error fetching assignable users:', error);
    return handleApiError(error);
  }
});
