import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { entityAssignmentService } from '@/lib/services/entity-assignment.service';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

const SyncChangeSchema = z.object({
  type: z.enum(['assessment', 'response', 'entity']),
  action: z.enum(['create', 'update', 'delete']),
  data: z.record(z.unknown()),
  offlineId: z.string().optional(),
  versionNumber: z.number().int().positive(),
  entityUuid: z.string().uuid()
});

const BatchSyncRequestSchema = z.object({
  changes: z.array(SyncChangeSchema).min(1).max(100)
});

export const POST = withAuth(async (
  request: NextRequest,
  context: AuthContext
) => {
  try {
    const assignedEntities = await entityAssignmentService.getAssignedEntities(context.userId);
    const entityIds = new Set(assignedEntities.map(entity => entity.id));

    const body = await request.json();
    const validationResult = BatchSyncRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse('Invalid request format', 400, validationResult.error.issues);
    }

    const { changes } = validationResult.data;

    const unauthorizedEntities = changes
      .filter(change => !entityIds.has(change.entityUuid))
      .map(change => change.entityUuid);

    if (unauthorizedEntities.length > 0) {
      const unique = [...new Set(unauthorizedEntities)];
      return errorResponse(
        'Entity permission denied',
        403,
        { unauthorizedEntities: unique }
      );
    }

    return errorResponse(
      'Batch sync processing is not yet implemented',
      501,
      {
        hint: 'This endpoint requires a SyncService with Prisma transaction support. See architecture docs for sync engine design.',
        receivedChanges: changes.length
      }
    );

  } catch (error) {
    return handleApiError(error);
  }
});
