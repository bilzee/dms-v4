import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
    }

    const totalConflicts = await prisma.syncConflict.count();

    const conflictsByType = await prisma.syncConflict.groupBy({
      by: ['entityType'],
      _count: true
    });

    const recentConflicts = await prisma.syncConflict.findMany({
      orderBy: { conflictDate: 'desc' },
      take: 5,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        conflictDate: true,
        resolutionMethod: true,
        resolvedAt: true,
        coordinatorNotified: true
      }
    });

    const notifiedCount = await prisma.syncConflict.count({
      where: { coordinatorNotified: true }
    });

    const byTypeMap: Record<string, number> = { assessment: 0, response: 0, entity: 0 };
    for (const group of conflictsByType) {
      byTypeMap[group.entityType] = group._count;
    }

    const summary = {
      totalConflicts,
      autoResolvedConflicts: notifiedCount,
      manuallyResolvedConflicts: totalConflicts - notifiedCount,
      resolutionRate: totalConflicts > 0
        ? Math.round((notifiedCount / totalConflicts) * 100) : 0,
      conflictsByType: byTypeMap,
      recentConflicts: recentConflicts.map(c => ({
        id: c.id,
        entityType: c.entityType,
        entityId: c.entityId,
        conflictDate: c.conflictDate,
        resolutionMethod: c.resolutionMethod,
        resolved: !!c.resolvedAt
      }))
    };

    return successResponse(summary);

  } catch (error) {
    return handleApiError(error);
  }
});
