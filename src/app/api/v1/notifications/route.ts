import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response';
import { notificationService } from '@/lib/services/notification.service';
import { NotificationQuerySchema } from '@/lib/validation/notification';

export const GET = withAuth(async (request: NextRequest, context: any) => {
  try {
    const { user } = context;

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const query = NotificationQuerySchema.parse(queryParams);

    const [notifications, unreadCount, totalCount] = await Promise.all([
      notificationService.listNotifications(user.id, query),
      notificationService.getUnreadCount(user.id),
      Promise.resolve(0),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        totalCount: notifications.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
