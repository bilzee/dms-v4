import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context, params) => {
  const { roles } = context;

  if (!roles || roles.length === 0) {
    return errorResponse('Authentication required.', 401);
  }

  try {
    const { id } = params.params as { id: string };
    const entity = await prisma.entity.findUnique({
      where: { id },
    });

    if (!entity) {
      return errorResponse('Entity not found.', 404);
    }

    return successResponse(entity);
  } catch (error) {
    return handleApiError(error);
  }
}
);

export const PUT = withAuth(async (request: NextRequest, context, params) => {
  const { roles } = context;

  if (!roles || roles.length === 0) {
    return errorResponse('Authentication required.', 401);
  }

  const hasCoordinatorOrAdmin = roles.includes('COORDINATOR') || roles.includes('ADMIN');
  if (!hasCoordinatorOrAdmin) {
    return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
  }

  try {
    const { id } = params.params as { id: string };
    const body = await request.json();
    const { name, type, location, coordinates, autoApproveEnabled, metadata } = body;

    const existing = await prisma.entity.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Entity not found.', 404);
    }

    const validTypes = ['COMMUNITY', 'WARD', 'LGA', 'STATE', 'FACILITY', 'CAMP'];
    if (type && !validTypes.includes(type)) {
      return errorResponse(`Invalid entity type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    const entity = await prisma.entity.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(location !== undefined && { location: location || null }),
        ...(coordinates !== undefined && {
          coordinates: coordinates
            ? { lat: coordinates.latitude ?? coordinates.lat, lng: coordinates.longitude ?? coordinates.lng }
            : undefined,
        }),
        ...(autoApproveEnabled !== undefined && { autoApproveEnabled }),
        ...(metadata !== undefined && { metadata: metadata || null }),
      },
    });

    return successResponse(entity);
  } catch (error) {
    return handleApiError(error);
  }
}
);

export const DELETE = withAuth(async (request: NextRequest, context, params) => {
  const { roles } = context;

  if (!roles || roles.length === 0) {
    return errorResponse('Authentication required.', 401);
  }

  const hasCoordinatorOrAdmin = roles.includes('COORDINATOR') || roles.includes('ADMIN');
  if (!hasCoordinatorOrAdmin) {
    return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
  }

  try {
    const { id } = params.params as { id: string };

    const existing = await prisma.entity.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Entity not found.', 404);
    }

    await prisma.entity.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse({ message: 'Entity deleted successfully.' });
  } catch (error) {
    return handleApiError(error);
  }
}
);
