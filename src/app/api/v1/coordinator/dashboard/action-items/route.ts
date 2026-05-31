import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context: any) => {
  try {
    const { roles } = context;

    if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Coordinator or Admin role required' },
        { status: 403 }
      );
    }

    const items: CoordinatorActionItem[] = [];

    const [submittedAssessments, submittedResponses, deliveredResponses, entities] =
      await Promise.all([
        prisma.rapidAssessment.findMany({
          where: { verificationStatus: 'SUBMITTED' },
          include: {
            entity: { select: { id: true, name: true, type: true, location: true, coordinates: true } },
            assessor: { select: { id: true, name: true } },
            incident: { select: { id: true, name: true, severity: true } },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        }),
        prisma.rapidResponse.findMany({
          where: { verificationStatus: 'SUBMITTED', deliveryStatus: { not: 'DELIVERED' } },
          include: {
            entity: { select: { id: true, name: true, type: true, location: true, coordinates: true } },
            responder: { select: { id: true, name: true } },
            assessment: { select: { id: true, rapidAssessmentType: true } },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        }),
        prisma.rapidResponse.findMany({
          where: { verificationStatus: 'SUBMITTED', deliveryStatus: 'DELIVERED' },
          include: {
            entity: { select: { id: true, name: true, type: true, location: true, coordinates: true } },
            responder: { select: { id: true, name: true } },
            assessment: { select: { id: true, rapidAssessmentType: true } },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        }),
        prisma.entity.findMany({
          include: {
            assignments: {
              include: {
                user: {
                  include: {
                    roles: {
                      include: { role: { select: { name: true } } },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

    for (const a of submittedAssessments) {
      items.push({
        id: `verify-assessment-${a.id}`,
        actionType: 'verify-assessment' as const,
        entityId: a.entityId,
        entityType: a.entity.type,
        entityName: a.entity.name,
        entity: a.entity,
        type: a.rapidAssessmentType,
        priority: a.priority as string,
        signalReason: 'verify-assessment' as any,
        description: `${a.rapidAssessmentType} assessment by ${a.assessor?.name || 'Unknown'}`,
        context: { assessmentId: a.id, assessorName: a.assessor?.name },
        createdAt: a.createdAt,
      });
    }

    for (const r of submittedResponses) {
      items.push({
        id: `verify-response-${r.id}`,
        actionType: 'verify-response' as const,
        entityId: r.entityId,
        entityType: r.entity.type,
        entityName: r.entity.name,
        entity: r.entity,
        type: r.type,
        priority: r.priority as string,
        signalReason: 'verify-response' as any,
        description: `${r.type} response plan by ${r.responder?.name || 'Unknown'}`,
        context: { responseId: r.id, responderName: r.responder?.name },
        createdAt: r.createdAt,
      });
    }

    for (const r of deliveredResponses) {
      items.push({
        id: `verify-delivery-${r.id}`,
        actionType: 'verify-delivery' as const,
        entityId: r.entityId,
        entityType: r.entity.type,
        entityName: r.entity.name,
        entity: r.entity,
        type: r.type,
        priority: r.priority as string,
        signalReason: 'verify-delivery' as any,
        description: `${r.type} delivery by ${r.responder?.name || 'Unknown'}`,
        context: { responseId: r.id, responderName: r.responder?.name },
        createdAt: r.createdAt,
      });
    }

    for (const entity of entities) {
      const assignedRoles = new Set<string>();
      for (const assignment of entity.assignments) {
        for (const userRole of assignment.user.roles) {
          assignedRoles.add(userRole.role.name);
        }
      }

      if (!assignedRoles.has('ASSESSOR')) {
        items.push({
          id: `need-assessor-${entity.id}`,
          actionType: 'need-assessor' as const,
          entityId: entity.id,
          entityType: entity.type,
          entityName: entity.name,
          entity: {
            id: entity.id,
            name: entity.name,
            type: entity.type,
            location: entity.location,
            coordinates: entity.coordinates,
          },
          type: 'ASSIGNMENT',
          priority: 'HIGH',
          signalReason: 'need-assessor' as any,
          description: 'No assessor assigned',
          context: {},
          createdAt: new Date(),
        });
      }

      if (!assignedRoles.has('RESPONDER')) {
        items.push({
          id: `need-responder-${entity.id}`,
          actionType: 'need-responder' as const,
          entityId: entity.id,
          entityType: entity.type,
          entityName: entity.name,
          entity: {
            id: entity.id,
            name: entity.name,
            type: entity.type,
            location: entity.location,
            coordinates: entity.coordinates,
          },
          type: 'ASSIGNMENT',
          priority: 'HIGH',
          signalReason: 'need-responder' as any,
          description: 'No responder assigned',
          context: {},
          createdAt: new Date(),
        });
      }
    }

    const priorityOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    items.sort((a, b) => {
      const pDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const grouped = groupCoordinatorItems(items);

    return NextResponse.json({
      success: true,
      data: {
        items,
        groups: grouped,
        totalCount: items.length,
        unresolvedCount: items.length,
        criticalCount: items.filter(i => i.priority === 'CRITICAL').length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});

interface CoordinatorActionItem {
  id: string;
  actionType: 'verify-assessment' | 'verify-response' | 'verify-delivery' | 'need-assessor' | 'need-responder';
  entityId: string;
  entityType: string;
  entityName: string;
  entity: { id: string; name: string; type: string; location: string | null; coordinates: unknown };
  type: string;
  priority: string;
  signalReason: string;
  description: string;
  context: Record<string, any>;
  createdAt: Date;
}

function groupCoordinatorItems(items: CoordinatorActionItem[]) {
  const groupMap = new Map<string, any>();
  for (const item of items) {
    const key = `${item.actionType}:${item.entityId}:${item.type}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        entityId: item.entityId,
        entityName: item.entityName,
        entityType: item.entityType,
        entityLocation: item.entity.location,
        entityCoordinates: item.entity.coordinates,
        type: item.type,
        signals: [item],
        count: 1,
        highestPriority: item.priority,
      });
    } else {
      const group = groupMap.get(key);
      group.signals.push(item);
      group.count += 1;
      const priorityOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      if ((priorityOrder[item.priority] || 0) > (priorityOrder[group.highestPriority] || 0)) {
        group.highestPriority = item.priority;
      }
    }
  }
  return Array.from(groupMap.values());
}
