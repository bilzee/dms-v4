import { NextRequest, NextResponse } from 'next/server';
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
        resource: 'CRITICAL_GAPS',
        oldValues: null,
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });

      return errorResponse('Forbidden - COORDINATOR access required', 403);
    }

    // Fetch response plans with their linked commitments
    const responsePlans = await prisma.rapidResponse.findMany({
      include: {
        entity: { select: { id: true, name: true, type: true, location: true } },
        planCommitments: {
          include: {
            commitment: { select: { id: true, deliveredQuantity: true, totalCommittedQuantity: true, items: true, status: true } }
          }
        }
      }
    });

    const commitments = await prisma.donorCommitment.findMany({
      where: { status: { in: ['PLANNED', 'PARTIAL'] } },
      include: {
        entity: { select: { id: true, name: true, type: true, location: true } },
      }
    });

    type ResourceAgg = { resourceName: string; requiredQuantity: number | null; committedQuantity: number; deliveredQuantity: number };
    const entityMap = new Map<string, { entity: any; resources: Map<string, ResourceAgg> }>();

    function ensureEntity(eid: string, entity: any) {
      if (!entityMap.has(eid)) entityMap.set(eid, { entity, resources: new Map() });
      return entityMap.get(eid)!;
    }
    function ensureResource(entry: any, name: string): ResourceAgg {
      if (!entry.resources.has(name)) entry.resources.set(name, { resourceName: name, requiredQuantity: null, committedQuantity: 0, deliveredQuantity: 0 });
      return entry.resources.get(name)!;
    }

    for (const plan of responsePlans) {
      const entry = ensureEntity(plan.entityId, plan.entity);
      const items = (Array.isArray(plan.items) ? plan.items : []) as any[];
      for (const item of items) {
        const name = item?.name || 'Unknown';
        const r = ensureResource(entry, name);
        r.requiredQuantity = (r.requiredQuantity || 0) + (item?.quantity || 0);
        if (plan.deliveryStatus === 'DELIVERED') r.deliveredQuantity += item?.quantity || 0;
      }
      for (const pc of plan.planCommitments) {
        const c = pc.commitment;
        const cItems = (Array.isArray(c.items) ? c.items : []) as any[];
        for (const item of cItems) {
          const name = item?.name || 'Unknown';
          const r = ensureResource(entry, name);
          r.committedQuantity += item?.quantity || 0;
          r.deliveredQuantity += Math.round(c.totalCommittedQuantity > 0 ? (c.deliveredQuantity / c.totalCommittedQuantity) * (item?.quantity || 0) : 0);
        }
      }
    }

    for (const commitment of commitments) {
      const entry = ensureEntity(commitment.entityId, commitment.entity);
      const items = (Array.isArray(commitment.items) ? commitment.items : []) as any[];
      for (const item of items) {
        const name = item?.name || 'Unknown';
        const r = ensureResource(entry, name);
        r.committedQuantity += item?.quantity || 0;
        r.deliveredQuantity += Math.round(commitment.totalCommittedQuantity > 0 ? (commitment.deliveredQuantity / commitment.totalCommittedQuantity) * (item?.quantity || 0) : 0);
      }
    }

    const criticalGaps: Array<{
      entity: { id: string; name: string; type: string; location: string | null };
      resource: string;
      unmetNeed: number;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      requiredQuantity: number | null;
      committedQuantity: number;
      deliveredQuantity: number;
      gap: number;
    }> = [];

    for (const [, entry] of entityMap) {
      for (const [, resource] of entry.resources) {
        const baseline = resource.requiredQuantity ?? resource.committedQuantity;
        const gap = Math.max(0, baseline - resource.deliveredQuantity);
        if (gap === 0) continue;

        const percentageMet = baseline > 0 ? Math.round((resource.deliveredQuantity / baseline) * 100) : 0;
        let gapSeverity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        if (percentageMet < 50) gapSeverity = 'HIGH';
        else if (percentageMet < 80) gapSeverity = 'MEDIUM';

        if (gapSeverity === 'HIGH') {
          criticalGaps.push({
            entity: entry.entity,
            resource: resource.resourceName,
            unmetNeed: gap,
            severity: gapSeverity,
            requiredQuantity: resource.requiredQuantity,
            committedQuantity: resource.committedQuantity,
            deliveredQuantity: resource.deliveredQuantity,
            gap,
          });
        }
      }
    }

    criticalGaps.sort((a, b) => b.unmetNeed - a.unmetNeed);

    await auditLog({
      userId: context.userId,
      action: 'ACCESS_CRITICAL_GAPS',
      resource: 'CRITICAL_GAPS',
      oldValues: null,
      newValues: { criticalGapsFound: criticalGaps.length },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return successResponse({ criticalGaps });

  } catch (error) {
    console.error('Error fetching critical gaps:', error);

    try {
      await auditLog({
        userId: context.userId,
        action: 'ERROR_ACCESS_CRITICAL_GAPS',
        resource: 'CRITICAL_GAPS',
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
