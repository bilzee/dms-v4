import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response';
import { PushNotificationService } from '@/lib/services/push-notification.service';
import { PushSubscriptionSchema } from '@/lib/validation/notification';

export const POST = withAuth(async (request: NextRequest, context: any) => {
  try {
    const { user } = context;
    const body = await request.json();
    const subscription = PushSubscriptionSchema.parse(body);

    const result = await PushNotificationService.subscribe(user.userId, {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      browserInfo: subscription.browserInfo,
    });

    return NextResponse.json({
      success: true,
      data: { id: result.id },
      message: 'Push subscription registered',
    });
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withAuth(async (request: NextRequest, context: any) => {
  try {
    const { user } = context;
    const body = await request.json();
    const { endpoint } = body as { endpoint?: string };

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    await PushNotificationService.unsubscribe(user.userId, endpoint);

    return NextResponse.json({
      success: true,
      message: 'Push subscription removed',
    });
  } catch (error) {
    return handleApiError(error);
  }
});

export const GET = withAuth(async (request: NextRequest, context: any) => {
  try {
    const publicKey = await PushNotificationService.getVapidPublicKey();

    return NextResponse.json({
      success: true,
      data: {
        vapidPublicKey: publicKey,
        enabled: !!publicKey,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
