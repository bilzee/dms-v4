import { NextRequest } from 'next/server';
import { conflictResolver } from '@/lib/sync/conflict';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const entityType = searchParams.get('entityType') as 'assessment' | 'response' | 'entity' | null;
    const resolved = searchParams.get('resolved');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let conflicts = await conflictResolver.getConflictHistory();

    if (entityType) {
      conflicts = conflicts.filter(conflict => conflict.entityType === entityType);
    }
    if (resolved !== null) {
      const isResolved = resolved === 'true';
      conflicts = conflicts.filter(conflict => conflict.isResolved === isResolved);
    }
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      conflicts = conflicts.filter(conflict => new Date(conflict.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      conflicts = conflicts.filter(conflict => new Date(conflict.createdAt) <= toDate);
    }

    const total = conflicts.length;
    const offset = (page - 1) * limit;
    const paginatedConflicts = conflicts.slice(offset, offset + limit);

    const transformedConflicts = paginatedConflicts.map(conflict => ({
      id: conflict.conflictId,
      entityType: conflict.entityType,
      entityId: conflict.entityUuid,
      conflictDate: conflict.createdAt,
      resolutionMethod: conflict.resolutionStrategy.toUpperCase(),
      winningVersion: conflict.isResolved ? conflict.resolvedData : conflict.serverData,
      losingVersion: conflict.isResolved
        ? (conflict.resolutionStrategy === 'last_write_wins'
          ? (conflict.resolvedData === conflict.serverData ? conflict.localData : conflict.serverData)
          : null)
        : conflict.localData,
      resolvedAt: conflict.resolvedAt,
      isResolved: conflict.isResolved,
      resolvedBy: conflict.resolvedBy,
      localVersion: conflict.localVersion,
      serverVersion: conflict.serverVersion,
      metadata: conflict.metadata
    }));

    return paginatedResponse(transformedConflicts, page, limit, total);

  } catch (error) {
    return handleApiError(error);
  }
});
