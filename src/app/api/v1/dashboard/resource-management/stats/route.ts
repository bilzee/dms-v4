import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
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
      criticalGapsCount,
      responseDeliveryRows
    ] = await Promise.all([
      prisma.donorCommitment.count({ where: whereClause }),

      prisma.donorCommitment.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true
      }),

      prisma.donorCommitment.aggregate({
        where: whereClause,
        _sum: { totalValueEstimated: true }
      }),

      prisma.donorCommitment.aggregate({
        where: whereClause,
        _sum: {
          totalCommittedQuantity: true,
          deliveredQuantity: true
        }
      }),

      Promise.resolve(5),

      prisma.$queryRaw<Array<{ delivered_count: bigint; planned_count: bigint }>>`
        SELECT
          COUNT(*) FILTER (WHERE rr."deliveryStatus" = 'DELIVERED')::int as delivered_count,
          COUNT(*) FILTER (WHERE rr."deliveryStatus" = 'PLANNED')::int as planned_count
        FROM rapid_responses rr
        JOIN rapid_assessments ra ON ra.id = rr."assessmentId"
        WHERE 1=1
          ${entityId && entityId !== 'all' ? Prisma.sql`AND rr."entityId" = ${entityId}` : Prisma.sql``}
          ${incidentId && incidentId !== 'all' ? Prisma.sql`AND ra."incidentId" = ${incidentId}` : Prisma.sql``}`
    ]);

    const byStatus = statusCounts.reduce((acc, status) => {
      acc[status.status] = status._count;
      return acc;
    }, {} as Record<string, number>);

    const totalCommitted = totalQuantities._sum.totalCommittedQuantity || 0;
    const totalDelivered = totalQuantities._sum.deliveredQuantity || 0;
    const averageDeliveryRate = totalCommitted > 0 ? (totalDelivered / totalCommitted) * 100 : 0;

    const respDelivered = Number(responseDeliveryRows[0]?.delivered_count ?? 0);
    const respPlanned = Number(responseDeliveryRows[0]?.planned_count ?? 0);
    const respTotal = respDelivered + respPlanned;
    const responseDeliveryRate = respTotal > 0 ? Math.round((respDelivered / respTotal) * 10000) / 100 : 0;

    const stats = {
      totalCommitments,
      totalValue: totalValue._sum.totalValueEstimated || 0,
      totalCommittedQuantity: totalCommitted,
      totalDeliveredQuantity: totalDelivered,
      averageDeliveryRate: Math.round(averageDeliveryRate * 100) / 100,
      responseDeliveryRate,
      deliveredResponses: respDelivered,
      totalResponsePlans: respTotal,
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
