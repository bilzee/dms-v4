import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

const ResolveSchema = z.object({
  conflictId: z.string().min(1),
  strategy: z.enum(['last_write_wins', 'keep_server', 'keep_offline', 'merge']),
  mergedData: z.record(z.unknown()).optional()
});

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
    }

    const body = await request.json();
    const validation = ResolveSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request format', 400, validation.error.issues);
    }

    const { conflictId, strategy, mergedData } = validation.data;

    const conflict = await prisma.syncConflict.findUnique({
      where: { id: conflictId }
    });

    if (!conflict) {
      return errorResponse('Conflict not found', 404);
    }

    if (conflict.resolvedAt) {
      return errorResponse('Conflict already resolved', 409);
    }

    let winningData: any;
    let resolutionMethod: string;

    switch (strategy) {
      case 'last_write_wins':
        winningData = conflict.losingVersion;
        resolutionMethod = 'LAST_WRITE_WINS';
        break;
      case 'keep_server':
        winningData = conflict.winningVersion;
        resolutionMethod = 'KEEP_SERVER';
        break;
      case 'keep_offline':
        winningData = conflict.losingVersion;
        resolutionMethod = 'KEEP_OFFLINE';
        break;
      case 'merge':
        if (!mergedData) {
          return errorResponse('mergedData is required for merge strategy', 400);
        }
        winningData = mergedData;
        resolutionMethod = 'MERGE';
        break;
    }

    await applyResolvedData(conflict.entityType, conflict.entityId, winningData);

    const updated = await prisma.syncConflict.update({
      where: { id: conflictId },
      data: {
        resolutionMethod,
        resolvedAt: new Date(),
        coordinatorNotified: true
      }
    });

    return successResponse({
      conflictId: updated.id,
      strategy: resolutionMethod,
      resolvedAt: updated.resolvedAt
    });
  } catch (error) {
    return handleApiError(error);
  }
});

async function applyResolvedData(entityType: string, entityId: string, data: any): Promise<void> {
  switch (entityType) {
    case 'assessment':
      await prisma.rapidAssessment.update({
        where: { id: entityId },
        data: {
          location: data.location,
          priority: data.priority,
          versionNumber: { increment: 1 },
          syncStatus: 'SYNCED'
        }
      }).catch(() => {});
      break;

    case 'response':
      await prisma.rapidResponse.update({
        where: { id: entityId },
        data: {
          description: data.description,
          priority: data.priority,
          versionNumber: { increment: 1 },
          syncStatus: 'SYNCED'
        }
      }).catch(() => {});
      break;

    case 'entity':
      await prisma.entity.update({
        where: { id: entityId },
        data: {
          name: data.name,
          type: data.type
        }
      }).catch(() => {});
      break;
  }
}
