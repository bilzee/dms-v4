import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response';
import { PushNotificationService } from '@/lib/services/push-notification.service';

export const POST = withAuth(async (request: NextRequest, context: any) => {
  try {
    const { user } = context;
    const body = await request.json();
    const title = body.title || 'DMS Test Notification';
    const bodyText = body.body || 'This is a test push notification.';

    const result = await PushNotificationService.sendToUser(user.id, {
      title,
      body: bodyText,
      data: {
        url: '/assessor/dashboard',
        priority: 'INFO',
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Push sent: ${result.sent} delivered, ${result.failed} failed`,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
