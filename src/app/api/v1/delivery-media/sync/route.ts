import { NextRequest } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { deliveryMediaService } from '@/lib/services/delivery-media.service';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const POST = withAuth(
  async (request: NextRequest, context: AuthContext) => {
    if (!context.roles.includes('RESPONDER') && !context.roles.includes('COORDINATOR')) {
      return errorResponse('Insufficient permissions. Responder or Coordinator role required.', 403);
    }

    try {
      const body = await request.json();
      const { action } = body;

      if (action === 'sync_pending') {
        const syncedMedia = await deliveryMediaService.syncPendingMedia();
        return successResponse({
          syncedMedia,
          syncedCount: syncedMedia.length
        });
      }

      if (action === 'get_sync_status') {
        const syncStatus = await deliveryMediaService.getOfflineMediaSyncStatus();
        return successResponse({
          syncStatus,
          pendingCount: syncStatus.length,
          hasOfflineMedia: syncStatus.length > 0
        });
      }

      return errorResponse('Invalid action. Supported actions: sync_pending, get_sync_status', 400);

    } catch (error) {
      return handleApiError(error);
    }
  }
);
