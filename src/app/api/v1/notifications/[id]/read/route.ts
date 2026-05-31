import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response';
import { notificationService } from '@/lib/services/notification.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const PATCH = withAuth(async (request: NextRequest, context: any, { params }: RouteParams) => {
  try {
    const { user } = context;
    const { id } = await params;

    const success = await notificationService.markNotificationRead(id, user.userId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id, readAt: new Date().toISOString() },
      message: 'Notification marked as read',
    });
  } catch (error) {
    return handleApiError(error);
  }
});
