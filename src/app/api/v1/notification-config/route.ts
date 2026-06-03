import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';
import {
  getNotificationConfig,
  saveNotificationConfig,
  validateNotificationConfig,
  getDefaultNotificationConfig,
} from '@/lib/services/notification-config.service';
import {
  getActionSignalConfig,
  saveActionSignalConfig,
  getDefaultActionSignalConfig,
} from '@/lib/services/action-signal-config.service';

export const GET = withAuth(async (request: NextRequest, context) => {
  const { roles } = context;
  if (!roles.includes('ADMIN')) {
    return errorResponse('Insufficient permissions.', 403);
  }

  try {
    const [config, actionSignalConfig] = await Promise.all([
      getNotificationConfig(),
      getActionSignalConfig(),
    ]);
    return successResponse({ notification: config, actionSignals: actionSignalConfig });
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

    if (body.notification) {
      const errors = validateNotificationConfig(body.notification);
      if (errors.length > 0) {
        return errorResponse(errors.join('; '), 400);
      }
      await saveNotificationConfig(body.notification, userId);
    }

    if (body.actionSignals) {
      await saveActionSignalConfig(body.actionSignals, userId);
    }

    const [config, actionSignalConfig] = await Promise.all([
      getNotificationConfig(),
      getActionSignalConfig(),
    ]);
    return successResponse({ notification: config, actionSignals: actionSignalConfig });
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
    const [notifDefaults, asDefaults] = await Promise.all([
      getDefaultNotificationConfig(),
      getDefaultActionSignalConfig(),
    ]);
    await Promise.all([
      saveNotificationConfig(notifDefaults, userId),
      saveActionSignalConfig(asDefaults, userId),
    ]);
    return successResponse({ notification: notifDefaults, actionSignals: asDefaults });
  } catch (error) {
    return handleApiError(error);
  }
});
