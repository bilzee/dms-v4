import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { paginatedResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;

  if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
    return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
  }
    try {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      // Get all entities with pagination
      const [entities, total] = await Promise.all([
        prisma.entity.findMany({
          skip,
          take: limit,
          where: {
            isActive: true
          },
          orderBy: {
            name: 'asc'
          }
        }),
        prisma.entity.count({
          where: {
            isActive: true
          }
        })
      ]);

      return paginatedResponse(entities, page, limit, total);

    } catch (error) {
      return handleApiError(error);
    }
  }
);
