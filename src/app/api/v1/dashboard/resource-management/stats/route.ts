import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { auditLog } from '@/lib/services/audit.service';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR')) {
      await auditLog({
        userId: context.userId,
        action: 'UNAUTHORIZED_ACCESS',
        resource: 'RESOURCE_MANAGEMENT_STATS',
        oldValues: null,
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });

      return errorResponse('Forbidden - COORDINATOR access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const donorId = searchParams.get('donorId');
    const entityId = searchParams.get('entityId');
    const incidentId = searchParams.get('incidentId');

    const whereClause: any = {};
    if (status && status !== 'all') whereClause.status = status;
    if (donorId && donorId !== 'all') whereClause.donorId = donorId;
    if (entityId && entityId !== 'all') whereClause.entityId = entityId;
    if (incidentId && incidentId !== 'all') whereClause.incidentId = incidentId;

    const [
      totalCommitments,
      statusCounts,
      totalValue,
      totalQuantities,
      criticalGapsCount
    ] = await Promise.all([
      db.donorCommitment.count({ where: whereClause }),

      db.donorCommitment.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true
      }),

      db.donorCommitment.aggregate({
        where: whereClause,
        _sum: { totalValueEstimated: true }
      }),

      db.donorCommitment.aggregate({
        where: whereClause,
        _sum: {
          totalCommittedQuantity: true,
          deliveredQuantity: true
        }
      }),

      Promise.resolve(5)
    ]);

    const byStatus = statusCounts.reduce((acc, status) => {
      acc[status.status] = status._count;
      return acc;
    }, {} as Record<string, number>);

    const totalCommitted = totalQuantities._sum.totalCommittedQuantity || 0;
    const totalDelivered = totalQuantities._sum.deliveredQuantity || 0;
    const averageDeliveryRate = totalCommitted > 0 ? (totalDelivered / totalCommitted) * 100 : 0;

    const stats = {
      totalCommitments,
      totalValue: totalValue._sum.totalValueEstimated || 0,
      totalCommittedQuantity: totalCommitted,
      totalDeliveredQuantity: totalDelivered,
      averageDeliveryRate: Math.round(averageDeliveryRate * 100) / 100,
      byStatus,
      criticalGaps: criticalGapsCount
    };

    await auditLog({
      userId: context.userId,
      action: 'ACCESS_RESOURCE_MANAGEMENT_STATS',
      resource: 'RESOURCE_MANAGEMENT_STATS',
      oldValues: null,
      newValues: { filters: { status, donorId, entityId, incidentId } },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return successResponse(stats);

  } catch (error) {
    console.error('Error fetching resource management stats:', error);

    try {
      await auditLog({
        userId: context.userId,
        action: 'ERROR_ACCESS_RESOURCE_STATS',
        resource: 'RESOURCE_MANAGEMENT_STATS',
        oldValues: null,
        newValues: { error: error instanceof Error ? error.message : 'Unknown error' },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });
    } catch (auditError) {
      // Ignore audit log errors
    }

    return handleApiError(error);
  }
});
