import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { paginatedResponse, successResponse, createdResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;

  if (!roles || roles.length === 0) {
    return errorResponse('Authentication required.', 401);
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

export const POST = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;

  if (!roles || roles.length === 0) {
    return errorResponse('Authentication required.', 401);
  }

  const hasCoordinatorOrAdmin = roles.includes('COORDINATOR') || roles.includes('ADMIN');
  if (!hasCoordinatorOrAdmin) {
    return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
  }

  try {
    const body = await request.json();
    const { name, type, location, coordinates, autoApproveEnabled, metadata } = body;

    if (!name || !type) {
      return errorResponse('Name and type are required.', 400);
    }

    const validTypes = ['COMMUNITY', 'WARD', 'LGA', 'STATE', 'FACILITY', 'CAMP'];
    if (!validTypes.includes(type)) {
      return errorResponse(`Invalid entity type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    const existing = await prisma.entity.findFirst({
      where: { name, type },
    });

    if (existing) {
      return errorResponse('An entity with this name and type already exists.', 409);
    }

    const entity = await prisma.entity.create({
      data: {
        name,
        type,
        location: location || null,
        coordinates: coordinates ? { lat: coordinates.latitude ?? coordinates.lat, lng: coordinates.longitude ?? coordinates.lng } : undefined,
        autoApproveEnabled: autoApproveEnabled || false,
        metadata: metadata || null,
        isActive: true,
      },
    });

    return createdResponse(entity);
  } catch (error) {
    return handleApiError(error);
  }
}
);
