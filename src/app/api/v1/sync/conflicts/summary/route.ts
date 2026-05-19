import { NextRequest } from 'next/server';
import { conflictResolver } from '@/lib/sync/conflict';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
    }

    const stats = await conflictResolver.getConflictStats();

    const summary = {
      totalConflicts: stats.total,
      unresolvedConflicts: stats.unresolved,
      autoResolvedConflicts: stats.autoResolved,
      manuallyResolvedConflicts: stats.manuallyResolved,
      resolutionRate: stats.total > 0
        ? Math.round(((stats.autoResolved + stats.manuallyResolved) / stats.total) * 100) : 0,
      conflictsByType: {
        assessment: stats.byType.assessment,
        response: stats.byType.response,
        entity: stats.byType.entity
      },
      recentConflicts: stats.recentConflicts.slice(0, 5).map(conflict => ({
        id: conflict.conflictId,
        entityType: conflict.entityType,
        entityId: conflict.entityUuid,
        conflictDate: conflict.createdAt,
        isResolved: conflict.isResolved,
        resolutionMethod: conflict.resolutionStrategy.toUpperCase(),
        autoResolved: conflict.metadata?.autoResolved || false
      }))
    };

    return successResponse(summary);

  } catch (error) {
    return handleApiError(error);
  }
});
