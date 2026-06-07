import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { errorResponse, handleApiError, paginatedResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const entityType = searchParams.get('entityType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: any = {};
    if (entityType) {
      where.entityType = entityType;
    }
    if (dateFrom || dateTo) {
      where.conflictDate = {};
      if (dateFrom) where.conflictDate.gte = new Date(dateFrom);
      if (dateTo) where.conflictDate.lte = new Date(dateTo);
    }

    const total = await prisma.syncConflict.count({ where });
    const offset = (page - 1) * limit;

    const conflicts = await prisma.syncConflict.findMany({
      where,
      orderBy: { conflictDate: 'desc' },
      skip: offset,
      take: limit
    });

    const transformedConflicts = conflicts.map(conflict => ({
      id: conflict.id,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      conflictDate: conflict.conflictDate,
      resolutionMethod: conflict.resolutionMethod,
      winningVersion: conflict.winningVersion,
      losingVersion: conflict.losingVersion,
      resolvedAt: conflict.resolvedAt,
      coordinatorNotified: conflict.coordinatorNotified,
      responseId: conflict.responseId
    }));

    return paginatedResponse(transformedConflicts, page, limit, total);

  } catch (error) {
    return handleApiError(error);
  }
});
