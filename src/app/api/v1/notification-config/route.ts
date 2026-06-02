import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';
import {
  getNotificationConfig,
  saveNotificationConfig,
  validateNotificationConfig,
  getDefaultNotificationConfig,
} from '@/lib/services/notification-config.service';

export const GET = withAuth(async (request: NextRequest, context) => {
  const { roles } = context;
  if (!roles.includes('ADMIN')) {
    return errorResponse('Insufficient permissions.', 403);
  }

  try {
    const config = await getNotificationConfig();
    return successResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
});

export const PUT = withAuth(async (request: NextRequest, context) => {
  const { roles, userId } = context;
  if (!roles.includes('ADMIN')) {
    return errorResponse('Insufficient permissions.', 403);
  }

  try {
    const body = await request.json();
    const errors = validateNotificationConfig(body);
    if (errors.length > 0) {
      return errorResponse(errors.join('; '), 400);
    }

    await saveNotificationConfig(body, userId);
    const updated = await getNotificationConfig();
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withAuth(async (request: NextRequest, context) => {
  const { roles, userId } = context;
  if (!roles.includes('ADMIN')) {
    return errorResponse('Only admins can reset notification config.', 403);
  }

  try {
    const defaults = getDefaultNotificationConfig();
    await saveNotificationConfig(defaults, userId);
    return successResponse(defaults);
  } catch (error) {
    return handleApiError(error);
  }
});
