import { NextRequest } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { deliveryMediaService } from '@/lib/services/delivery-media.service';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

interface RouteParams {
  params: Promise<{ id: string }>
}

export const DELETE = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    if (!context.roles.includes('RESPONDER') && !context.roles.includes('COORDINATOR')) {
      return errorResponse('Insufficient permissions. Responder or Coordinator role required.', 403);
    }

    try {
      const { id } = await params;
      await deliveryMediaService.deleteMedia(id);
      return successResponse({ message: 'Delivery media deleted successfully' });

    } catch (error) {
      return handleApiError(error);
    }
  }
);

export const PUT = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    if (!context.roles.includes('COORDINATOR')) {
      return errorResponse('Insufficient permissions. Coordinator role required.', 403);
    }

    try {
      const { id } = await params;
      const body = await request.json();
      const { action, feedback, status } = body;

      if (action === 'mark_for_verification') {
        await deliveryMediaService.markMediaForVerification(id);
        return successResponse({ message: 'Media marked for verification' });
      }

      if (action === 'update_verification_status') {
        if (!['verified', 'rejected'].includes(status)) {
          return errorResponse('Invalid verification status. Must be "verified" or "rejected"', 400);
        }

        await deliveryMediaService.updateMediaVerificationStatus(
          id,
          status as 'verified' | 'rejected',
          feedback
        );
        return successResponse({ message: `Media ${status} successfully` });
      }

      return errorResponse('Invalid action. Supported actions: mark_for_verification, update_verification_status', 400);

    } catch (error) {
      return handleApiError(error);
    }
  }
);
