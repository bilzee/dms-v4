import { NextRequest } from 'next/server';
import { entityService } from '@/lib/services/entity.service';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return errorResponse('COORDINATOR or ADMIN role required', 403);
    }

    if (process.env.NEXT_BUILD === "true") {
      return successResponse([]);
    }

    const result = await entityService.getAllEntities();

    if (!result.success) {
      return errorResponse(result.message || 'Failed to fetch entities', 500, result.errors);
    }

    return successResponse(result.data);
  } catch (error) {
    console.error('Error fetching public entities:', error);
    return handleApiError(error);
  }
});
