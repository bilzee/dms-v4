import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';
import {
  getScoringConfig,
  saveScoringConfig,
  validateScoringConfig,
} from '@/lib/services/scoring-config.service';

export const GET = withAuth(async (request: NextRequest, context) => {
  const { roles } = context;
  if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
    return errorResponse('Insufficient permissions.', 403);
  }

  try {
    const config = await getScoringConfig();
    return successResponse(config);
  } catch (error) {
    console.error('Get scoring config error:', error);
    return handleApiError(error);
  }
});

export const PUT = withAuth(async (request: NextRequest, context) => {
  const { roles, userId } = context;
  if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
    return errorResponse('Insufficient permissions.', 403);
  }

  try {
    const body = await request.json();
    const errors = validateScoringConfig(body);
    if (errors.length > 0) {
      return errorResponse(errors.join('; '), 400);
    }

    await saveScoringConfig(body, userId);
    const updated = await getScoringConfig();
    return successResponse(updated);
  } catch (error) {
    console.error('Update scoring config error:', error);
    return handleApiError(error);
  }
});
