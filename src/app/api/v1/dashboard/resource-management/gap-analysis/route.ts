import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { auditLog } from '@/lib/services/audit.service';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

interface ResourceAgg {
  resourceName: string;
  requiredQuantity: number | null;
  committedQuantity: number;
  deliveredQuantity: number;
  sourcePriority: string;
}

interface EntityAgg {
  entityId: string;
  entity: { id: string; name: string; type: string; location: string | null };
  resources: Map<string, ResourceAgg>;
}

const SEVERITY_ORDER: Record<string, number> = {
  UNCLASSIFIED: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function highestSeverity(a: string, b: string): string {
  return (SEVERITY_ORDER[a] ?? 0) >= (SEVERITY_ORDER[b] ?? 0) ? a : b;
}

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR')) {
      await auditLog({
        userId: context.userId,
        action: 'UNAUTHORIZED_ACCESS',
        resource: 'GAP_ANALYSIS',
        oldValues: null,
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });

      return errorResponse('Forbidden - COORDINATOR access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const entityId = searchParams.get('entityId');
    const incidentId = searchParams.get('incidentId');

    const entityWhere: any = {};
    if (entityId && entityId !== 'all') entityWhere.entityId = entityId;

    const incidentWhere: any = {};
    if (incidentId && incidentId !== 'all') incidentWhere.incidentId = incidentId;

    const responsePlans = await prisma.rapidResponse.findMany({
      where: { ...entityWhere },
      include: {
        entity: { select: { id: true, name: true, type: true, location: true } },
        assessment: { select: { incidentId: true, priority: true } },
        planCommitments: {
          include: {
            commitment: { select: { id: true, deliveredQuantity: true, totalCommittedQuantity: true, items: true, status: true } }
          }
        }
      }
    });

    const commitments = await prisma.donorCommitment.findMany({
      where: { ...entityWhere, ...incidentWhere },
      include: {
        entity: { select: { id: true, name: true, type: true, location: true } },
      }
    });

    const entityMap = new Map<string, EntityAgg>();

    function ensureEntity(eid: string, entity: any) {
      if (!entityMap.has(eid)) {
        entityMap.set(eid, { entityId: eid, entity, resources: new Map() });
      }
      return entityMap.get(eid)!;
    }

    function ensureResource(entry: EntityAgg, name: string, priority: string): ResourceAgg {
      if (!entry.resources.has(name)) {
        entry.resources.set(name, {
          resourceName: name,
          requiredQuantity: null,
          committedQuantity: 0,
          deliveredQuantity: 0,
          sourcePriority: priority,
        });
      } else {
        const existing = entry.resources.get(name)!;
        existing.sourcePriority = highestSeverity(existing.sourcePriority, priority);
      }
      return entry.resources.get(name)!;
    }

    for (const plan of responsePlans) {
      if (incidentId && incidentId !== 'all' && plan.assessment?.incidentId !== incidentId) continue;

      const entry = ensureEntity(plan.entityId, plan.entity);
      const items = (Array.isArray(plan.items) ? plan.items : []) as any[];
      const planPriority = (plan.assessment?.priority || plan.priority || 'UNCLASSIFIED') as string;

      for (const item of items) {
        const name = item?.name || 'Unknown';
        const resource = ensureResource(entry, name, planPriority);
        resource.requiredQuantity = (resource.requiredQuantity || 0) + (item?.quantity || 0);

        if (plan.deliveryStatus === 'DELIVERED') {
          resource.deliveredQuantity += item?.quantity || 0;
        }
      }
    }

    for (const commitment of commitments) {
      const entry = ensureEntity(commitment.entityId, commitment.entity);
      const items = (Array.isArray(commitment.items) ? commitment.items : []) as any[];

      const commitmentPriority = commitment.sourcePlanId
        ? (responsePlans.find(p => p.id === commitment.sourcePlanId)?.assessment?.priority ||
           responsePlans.find(p => p.id === commitment.sourcePlanId)?.priority ||
           'UNCLASSIFIED') as string
        : 'UNCLASSIFIED';

      for (const item of items) {
        const name = item?.name || 'Unknown';
        const resource = ensureResource(entry, name, commitmentPriority);
        resource.committedQuantity += item?.quantity || 0;
        resource.deliveredQuantity += Math.round(
          commitment.totalCommittedQuantity > 0
            ? (commitment.deliveredQuantity / commitment.totalCommittedQuantity) * (item?.quantity || 0)
            : 0
        );
      }
    }

    for (const plan of responsePlans) {
      const planPriority = (plan.assessment?.priority || plan.priority || 'UNCLASSIFIED') as string;
      for (const pc of plan.planCommitments) {
        const c = pc.commitment;
        const items = (Array.isArray(c.items) ? c.items : []) as any[];
        const entry = ensureEntity(plan.entityId, plan.entity);
        for (const item of items) {
          const name = item?.name || 'Unknown';
          const resource = ensureResource(entry, name, planPriority);
          resource.committedQuantity += item?.quantity || 0;
          resource.deliveredQuantity += Math.round(
            c.totalCommittedQuantity > 0
              ? (c.deliveredQuantity / c.totalCommittedQuantity) * (item?.quantity || 0)
              : 0
          );
        }
      }
    }

    const assessments = await prisma.rapidAssessment.findMany({
      where: { ...entityWhere, ...incidentWhere },
      select: {
        entityId: true,
        priority: true,
        rapidAssessmentType: true,
        rapidAssessmentDate: true,
      },
      orderBy: { rapidAssessmentDate: 'desc' },
    });

    const entitySeverityMap = new Map<string, { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number; UNCLASSIFIED: number }>();
    const entityHighestSeverity = new Map<string, string>();
    const seenTypePerEntity = new Set<string>();

    for (const a of assessments) {
      const key = `${a.entityId}`;
      if (!entitySeverityMap.has(key)) {
        entitySeverityMap.set(key, { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNCLASSIFIED: 0 });
      }
      const sevMap = entitySeverityMap.get(key)!;
      const sevKey = a.priority as keyof typeof sevMap;
      sevMap[sevKey]++;

      const typeKey = `${a.entityId}:${a.rapidAssessmentType}`;
      if (!seenTypePerEntity.has(typeKey)) {
        seenTypePerEntity.add(typeKey);
        const current = entityHighestSeverity.get(key) || 'UNCLASSIFIED';
        entityHighestSeverity.set(key, highestSeverity(current, a.priority));
      }
    }

    const gapAnalysisData = Array.from(entityMap.values()).map(entry => {
      const gaps = Array.from(entry.resources.values()).map(resource => {
        const required = resource.requiredQuantity;
        const committed = resource.committedQuantity;
        const delivered = resource.deliveredQuantity;

        const gap = Math.max(0, (required ?? committed) - delivered);
        const baseline = required ?? committed;
        const percentageMet = baseline > 0 ? Math.round((delivered / baseline) * 100) : 0;

        return {
          resourceName: resource.resourceName,
          requiredQuantity: required,
          committedQuantity: committed,
          deliveredQuantity: delivered,
          gap,
          percentageMet,
          sourcePriority: resource.sourcePriority,
        };
      }).filter(g => g.gap > 0);

      const sevCounts = entitySeverityMap.get(entry.entityId) || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNCLASSIFIED: 0 };
      const entitySev = gaps.reduce((max, g) => highestSeverity(max, g.sourcePriority), 'UNCLASSIFIED');

      return {
        entityId: entry.entityId,
        entity: entry.entity,
        gaps,
        criticalGaps: gaps.filter(g => g.percentageMet < 50).length,
        severityCounts: sevCounts,
        entitySeverity: entitySev,
      };
    }).filter(entry => entry.gaps.length > 0);

    let filteredData = gapAnalysisData;

    if (entityId && entityId !== 'all') {
      filteredData = filteredData.filter(entity => entity.entityId === entityId);
    }

    if (severity && severity !== 'all') {
      const sevKey = severity as keyof { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number; UNCLASSIFIED: number };
      filteredData = filteredData.filter(entity => (entity.severityCounts[sevKey] || 0) > 0);
    }

    const totalGaps = filteredData.reduce((acc, entity) => acc + entity.gaps.length, 0);
    const avgDelivery = totalGaps > 0
      ? Math.round(filteredData.reduce((acc, entity) => acc + entity.gaps.reduce((s, g) => s + g.percentageMet, 0), 0) / totalGaps)
      : 0;

    const summary = {
      totalEntities: filteredData.length,
      totalGaps,
      criticalGaps: filteredData.reduce((acc, entity) => acc + entity.criticalGaps, 0),
      avgDelivery,
      bySeverity: {
        CRITICAL: filteredData.reduce((acc, e) => acc + (e.severityCounts.CRITICAL || 0), 0),
        HIGH: filteredData.reduce((acc, e) => acc + (e.severityCounts.HIGH || 0), 0),
        MEDIUM: filteredData.reduce((acc, e) => acc + (e.severityCounts.MEDIUM || 0), 0),
        LOW: filteredData.reduce((acc, e) => acc + (e.severityCounts.LOW || 0), 0),
        UNCLASSIFIED: filteredData.reduce((acc, e) => acc + (e.severityCounts.UNCLASSIFIED || 0), 0),
      }
    };

    await auditLog({
      userId: context.userId,
      action: 'ACCESS_GAP_ANALYSIS',
      resource: 'GAP_ANALYSIS',
      oldValues: null,
      newValues: { filters: { severity, entityId, incidentId }, summary },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return successResponse({ data: filteredData, summary });

  } catch (error) {
    console.error('Error generating gap analysis:', error);

    try {
      await auditLog({
        userId: context.userId,
        action: 'ERROR_ACCESS_GAP_ANALYSIS',
        resource: 'GAP_ANALYSIS',
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
