import { NextRequest } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { deliveryMediaService } from '@/lib/services/delivery-media.service';
import { DeliveryMediaMetadata } from '@/types/media';
import { successResponse, createdResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const GET = withAuth(
  async (request: NextRequest, context: AuthContext) => {
    if (!context.roles.includes('RESPONDER') && !context.roles.includes('COORDINATOR')) {
      return errorResponse('Insufficient permissions. Responder or Coordinator role required.', 403);
    }

    try {
      const { searchParams } = new URL(request.url);
      const responseId = searchParams.get('responseId');

      if (!responseId) {
        return errorResponse('Response ID is required', 400);
      }

      const media = await deliveryMediaService.getMediaByResponse(responseId);
      return successResponse(media, 200);

    } catch (error) {
      return handleApiError(error);
    }
  }
);

export const POST = withAuth(
  async (request: NextRequest, context: AuthContext) => {
    if (!context.roles.includes('RESPONDER')) {
      return errorResponse('Insufficient permissions. Responder role required.', 403);
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const responseId = formData.get('responseId') as string;
      const capturedFor = formData.get('capturedFor') as string || 'delivery_proof';
      const deliveryNotes = formData.get('deliveryNotes') as string;
      const gpsData = formData.get('gpsData') as string;

      if (!file) {
        return errorResponse('File is required', 400);
      }
      if (!responseId) {
        return errorResponse('Response ID is required', 400);
      }

      let gpsMetadata;
      if (gpsData) {
        try {
          gpsMetadata = JSON.parse(gpsData);
        } catch {
          // Continue without GPS data
        }
      } else {
        try {
          gpsMetadata = await deliveryMediaService.captureGPSLocation();
        } catch {
          // Continue without GPS data
        }
      }

      const deliveryMetadata: DeliveryMediaMetadata = {
        capturedFor: capturedFor as any,
        deliveryId: responseId,
        gps: gpsMetadata || {
          latitude: 0,
          longitude: 0,
          accuracy: 999999,
          timestamp: new Date()
        },
        deliveryTimestamp: new Date(),
        deliveryNotes: deliveryNotes || undefined,
        verificationStatus: 'pending'
      };

      const media = await deliveryMediaService.uploadDeliveryMedia(
        file,
        deliveryMetadata,
        responseId
      );

      return createdResponse(media);

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('File size exceeds') || error.message.includes('not supported')) {
          return errorResponse(error.message, 400);
        }
      }
      return handleApiError(error);
    }
  }
);
