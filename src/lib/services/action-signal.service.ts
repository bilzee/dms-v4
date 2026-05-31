import { prisma } from '@/lib/db/client';
import { Prisma, AssessmentType } from '@prisma/client';
import type {
  SignalReason,
  SignalPriority,
  SignalTriggerPayload,
  ActionSignalItem,
  SignalGroup,
  SignalContext,
  SignalTargetRole,
} from '@/types/action-signal';
import { SIGNAL_REASON_ROLES, NOTIFICATION_TEMPLATES } from '@/types/action-signal';
import type { SignalQueryInput } from '@/lib/validation/action-signal';

type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class ActionSignalService {

  static async evaluateAndGenerate(
    payload: SignalTriggerPayload,
    tx?: PrismaTransaction
  ): Promise<void> {
    const dbClient = tx || prisma;

    try {
      switch (payload.trigger) {
        case 'assessment-created':
        case 'assessment-submitted':
        case 'assessment-verified':
          await this.handleAssessmentTrigger(payload, dbClient);
          break;
        case 'assessment-rejected':
          break;
        case 'response-created':
        case 'response-delivered':
        case 'response-verified':
        case 'response-rejected':
          await this.handleResponseTrigger(payload, dbClient);
          break;
        case 'commitment-created':
        case 'commitment-updated':
          await this.handleCommitmentTrigger(payload, dbClient);
          break;
      }
    } catch (error) {
      console.error('[ActionSignalService] evaluateAndGenerate error:', error);
    }
  }

  private static async handleAssessmentTrigger(
    payload: SignalTriggerPayload,
    tx: PrismaTransaction | typeof prisma
  ): Promise<void> {
    if (!payload.entityId || !payload.incidentId) return;

    const assignments = await this.getAssignmentsForEntity(payload.entityId, tx);
    const entity = await tx.entity.findUnique({
      where: { id: payload.entityId },
      select: { id: true, name: true },
    });
    if (!entity) return;

    if (payload.trigger === 'assessment-verified' || payload.trigger === 'assessment-created') {
      const verifiedStatuses = ['SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED'];

      const assessors = assignments.filter(a => a.role === 'ASSESSOR');
      for (const assessor of assessors) {
        await this.resolveSignals(
          assessor.userId,
          payload.entityId,
          payload.incidentId,
          payload.assessmentType || '',
          ['unassessed'],
          tx
        );
      }

      if (payload.trigger === 'assessment-verified') {
        await this.resolveSignalsForReason('awaiting-plan', payload, tx);

        const responders = assignments.filter(a => a.role === 'RESPONDER');
        for (const responder of responders) {
          await this.upsertSignal(
            {
              userId: responder.userId,
              entityId: payload.entityId,
              incidentId: payload.incidentId,
              type: payload.assessmentType || 'HEALTH',
              signalReason: 'awaiting-plan',
              priority: (payload.assessmentPriority as SignalPriority) || 'MEDIUM',
              context: {
                entityName: entity.name,
                assessmentType: payload.assessmentType,
                assessmentId: payload.assessmentId,
              },
            },
            tx
          );
        }

        const donors = assignments.filter(a => a.role === 'DONOR');
        for (const donor of donors) {
          await this.upsertSignal(
            {
              userId: donor.userId,
              entityId: payload.entityId,
              incidentId: payload.incidentId,
              type: payload.assessmentType || 'HEALTH',
              signalReason: 'assessment-needs-response',
              priority: (payload.assessmentPriority as SignalPriority) || 'MEDIUM',
              context: {
                entityName: entity.name,
                assessmentType: payload.assessmentType,
                assessmentId: payload.assessmentId,
              },
            },
            tx
          );
        }
      }

      if (payload.assessmentType && payload.assessmentType !== 'POPULATION') {
        const types = ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'] as AssessmentType[];
        const otherTypes = types.filter(t => t !== payload.assessmentType);
        for (const type of otherTypes) {
          const hasAssessment = await tx.rapidAssessment.findFirst({
            where: {
              entityId: payload.entityId,
              incidentId: payload.incidentId,
              rapidAssessmentType: type,
              verificationStatus: { in: verifiedStatuses as any[] },
            },
          });
          if (!hasAssessment) {
            for (const assessor of assessors) {
              await this.upsertSignal(
                {
                  userId: assessor.userId,
                  entityId: payload.entityId,
                  incidentId: payload.incidentId,
                  type,
                  signalReason: 'unassessed',
                  priority: await this.derivePriorityFromIncident(payload.incidentId, type, tx),
                  context: {
                    entityName: entity.name,
                    assessmentType: type,
                  },
                },
                tx
              );
            }
          }
        }
      }
    }
  }

  private static async handleResponseTrigger(
    payload: SignalTriggerPayload,
    tx: PrismaTransaction | typeof prisma
  ): Promise<void> {
    if (!payload.entityId) return;

    const entity = await tx.entity.findUnique({
      where: { id: payload.entityId },
      select: { id: true, name: true },
    });
    if (!entity) return;

    if (payload.trigger === 'response-created') {
      await this.resolveSignalsForReason('awaiting-plan', payload, tx);

      if (payload.incidentId) {
        const assignments = await this.getAssignmentsForEntity(payload.entityId, tx);
        const assessors = assignments.filter(a => a.role === 'ASSESSOR');
        for (const assessor of assessors) {
          await this.resolveSignals(
            assessor.userId,
            payload.entityId,
            payload.incidentId!,
            payload.responseType || '',
            ['awaiting-plan'],
            tx
          );
        }

        const donors = assignments.filter(a => a.role === 'DONOR');
        const priority = (payload.responsePriority as SignalPriority) || 'MEDIUM';
        for (const donor of donors) {
          await this.upsertSignal(
            {
              userId: donor.userId,
              entityId: payload.entityId,
              incidentId: payload.incidentId!,
              type: payload.responseType || 'HEALTH',
              signalReason: 'plan-needs-commitment',
              priority,
              context: {
                entityName: entity.name,
                responseType: payload.responseType,
                responseId: payload.responseId,
              },
            },
            tx
          );
        }
      }
    }

    if (payload.trigger === 'response-delivered' || payload.trigger === 'response-verified') {
      if (payload.incidentId) {
        const assignments = await this.getAssignmentsForEntity(payload.entityId, tx);
        const responders = assignments.filter(a => a.role === 'RESPONDER');

        for (const responder of responders) {
          await this.resolveSignals(
            responder.userId,
            payload.entityId,
            payload.incidentId!,
            payload.responseType || '',
            ['awaiting-delivery', 'partially-covered'],
            tx
          );
        }
      }

      if (payload.trigger === 'response-verified' && payload.responseType && payload.responseId) {
        const verifiedResponse = await tx.rapidResponse.findUnique({
          where: { id: payload.responseId },
          select: { updatedAt: true, verificationStatus: true },
        });

        const verifiedAt = verifiedResponse?.updatedAt || new Date();

        const hasReassessment = await tx.rapidAssessment.findFirst({
          where: {
            entityId: payload.entityId,
            incidentId: payload.incidentId || undefined,
            rapidAssessmentType: payload.responseType as AssessmentType,
            verificationStatus: { in: ['SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED'] },
            createdAt: { gte: verifiedAt },
          },
        });

        if (!hasReassessment && payload.incidentId) {
          const assignments = await this.getAssignmentsForEntity(payload.entityId, tx);
          const assessors = assignments.filter(a => a.role === 'ASSESSOR');
          const priority = (payload.responsePriority as SignalPriority) || 'MEDIUM';

          for (const assessor of assessors) {
            await this.upsertSignal(
              {
                userId: assessor.userId,
                entityId: payload.entityId,
                incidentId: payload.incidentId,
                type: payload.responseType,
                signalReason: 'reassessment-needed',
                priority,
                context: {
                  entityName: entity.name,
                  assessmentType: payload.responseType,
                  responseId: payload.responseId,
                },
              },
              tx
            );
          }
        }
      }
    }
  }

  private static async handleCommitmentTrigger(
    payload: SignalTriggerPayload,
    tx: PrismaTransaction | typeof prisma
  ): Promise<void> {
    if (!payload.entityId || !payload.commitmentId) return;

    const entity = await tx.entity.findUnique({
      where: { id: payload.entityId },
      select: { id: true, name: true },
    });
    if (!entity) return;

    const commitment = await tx.donorCommitment.findUnique({
      where: { id: payload.commitmentId },
      select: {
        id: true,
        incidentId: true,
        donorId: true,
        donor: { select: { id: true, name: true } },
        planCommitments: { select: { planId: true } },
      },
    });
    if (!commitment) return;

    if (commitment.planCommitments.length > 0 && commitment.incidentId && payload.donorId) {
      const planIds = commitment.planCommitments.map(pc => pc.planId);
      const linkedResponses = await tx.rapidResponse.findMany({
        where: { id: { in: planIds } },
        select: { id: true, type: true },
      });

      const responseTypes = linkedResponses.map(r => r.type);
      if (responseTypes.length === 0 && payload.responseType) {
        responseTypes.push(payload.responseType);
      }

      for (const responseType of responseTypes) {
        await this.resolveSignals(
          payload.donorId,
          payload.entityId,
          commitment.incidentId,
          responseType,
          ['plan-needs-commitment'],
          tx
        );
      }

      if (responseTypes.length === 0) {
        await tx.actionSignal.updateMany({
          where: {
            entityId: payload.entityId,
            incidentId: commitment.incidentId,
            signalReason: 'plan-needs-commitment',
            resolvedAt: null,
          },
          data: { resolvedAt: new Date() },
        });
      }
    }

    if (commitment.planCommitments.length === 0 && commitment.incidentId) {
      const assignments = await this.getAssignmentsForEntity(payload.entityId, tx);
      const incident = await tx.incident.findUnique({
        where: { id: commitment.incidentId },
        select: { severity: true },
      });
      const priority = this.mapSeverityToPriority(incident?.severity) || 'MEDIUM';

      const responders = assignments.filter(a => a.role === 'RESPONDER');
      for (const responder of responders) {
        await this.upsertSignal(
          {
            userId: responder.userId,
            entityId: payload.entityId,
            incidentId: commitment.incidentId,
            type: 'COMMITMENT',
            signalReason: 'awaiting-plan-for-commitment',
            priority,
            context: {
              entityName: entity.name,
              commitmentId: commitment.id,
              donorName: commitment.donor.name,
            },
          },
          tx
        );
      }

      const donor = commitment.donor;
      const donorAssignments = assignments.filter(
        a => a.role === 'DONOR' && a.userId === payload.donorId
      );
      if (donorAssignments.length > 0 || payload.donorId) {
        const donorUserId = payload.donorId || donorAssignments[0]?.userId;
        if (donorUserId) {
          await this.upsertSignal(
            {
              userId: donorUserId,
              entityId: payload.entityId,
              incidentId: commitment.incidentId,
              type: 'COMMITMENT',
              signalReason: 'commitment-awaiting-plan',
              priority,
              context: {
                entityName: entity.name,
                commitmentId: commitment.id,
              },
            },
            tx
          );
        }
      }
    }
  }

  static async getActiveSignals(
    userId: string,
    roles: string[],
    query: SignalQueryInput
  ): Promise<{
    signals: ActionSignalItem[];
    groups: SignalGroup[];
    totalCount: number;
    unresolvedCount: number;
    criticalCount: number;
  }> {
    const entityFilter = query.entityId ? { entityId: query.entityId } : {};
    const activeRole = query.activeRole || roles[0] || 'COORDINATOR';
    const isGlobalRole = activeRole === 'COORDINATOR' || activeRole === 'ADMIN';

    let assignedEntityIds: string[] | null = null;
    if (!isGlobalRole) {
      const assignments = await prisma.entityAssignment.findMany({
        where: { userId },
        select: { entityId: true },
      });
      assignedEntityIds = assignments.map(a => a.entityId);
    }

    const allowedReasons = isGlobalRole
      ? undefined
      : Object.entries(SIGNAL_REASON_ROLES)
          .filter(([, reasonRoles]) => reasonRoles.includes(activeRole as SignalTargetRole))
          .map(([reason]) => reason as SignalReason);

    const where: Prisma.ActionSignalWhereInput = {
      resolvedAt: query.unresolvedOnly ? null : undefined,
      ...entityFilter,
      incidentId: query.incidentId || undefined,
      priority: query.priority || undefined,
      signalReason: query.signalReason || (allowedReasons ? { in: allowedReasons } : undefined),
      type: query.type || undefined,
      userId: isGlobalRole ? undefined : userId,
      ...(assignedEntityIds ? { entityId: { in: assignedEntityIds } } : {}),
    };

    const [signals, totalCount, unresolvedCount, criticalCount] = await Promise.all([
      prisma.actionSignal.findMany({
        where,
        include: {
          entity: {
            select: { id: true, name: true, type: true, location: true, coordinates: true },
          },
          incident: {
            select: { id: true, name: true, severity: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.actionSignal.count({ where }),
      prisma.actionSignal.count({
        where: { ...where, resolvedAt: null },
      }),
      prisma.actionSignal.count({
        where: { ...where, resolvedAt: null, priority: 'CRITICAL' },
      }),
    ]);

    const mappedSignals: ActionSignalItem[] = signals.map(s => ({
      id: s.id,
      userId: s.userId,
      entityId: s.entityId,
      incidentId: s.incidentId,
      type: s.type,
      signalReason: s.signalReason as SignalReason,
      priority: s.priority as SignalPriority,
      context: s.context as SignalContext,
      createdAt: s.createdAt,
      resolvedAt: s.resolvedAt,
      entity: s.entity,
      incident: s.incident,
    }));

    let finalSignals = mappedSignals;
    let finalTotal = totalCount;
    let finalUnresolved = unresolvedCount;
    let finalCritical = criticalCount;

    if (activeRole === 'COORDINATOR') {
      const coordinatorReasons: SignalReason[] = [
        'assessment-needs-response',
        'plan-needs-commitment',
        'partially-fulfilled',
      ];
      const toRemove = new Set<string>();

      for (const s of mappedSignals) {
        if (!coordinatorReasons.includes(s.signalReason)) {
          toRemove.add(s.id);
        }
      }

      const unassessedSignals = mappedSignals.filter(s => s.signalReason === 'unassessed');
      if (unassessedSignals.length > 0) {
        const entityIds = [...new Set(unassessedSignals.map(s => s.entityId))];
        const covered = await prisma.entityAssignment.findMany({
          where: {
            entityId: { in: entityIds },
            user: { roles: { some: { role: { name: 'ASSESSOR' } } } },
          },
          select: { entityId: true },
          distinct: ['entityId'],
        });
        const coveredIds = new Set(covered.map(e => e.entityId));
        for (const s of unassessedSignals) {
          if (!coveredIds.has(s.entityId)) toRemove.delete(s.id);
        }
      }

      const awaitingPlanSignals = mappedSignals.filter(s =>
        s.signalReason === 'awaiting-plan' || s.signalReason === 'awaiting-plan-for-commitment'
      );
      if (awaitingPlanSignals.length > 0) {
        const entityIds = [...new Set(awaitingPlanSignals.map(s => s.entityId))];
        const covered = await prisma.entityAssignment.findMany({
          where: {
            entityId: { in: entityIds },
            user: { roles: { some: { role: { name: 'RESPONDER' } } } },
          },
          select: { entityId: true },
          distinct: ['entityId'],
        });
        const coveredIds = new Set(covered.map(e => e.entityId));
        for (const s of awaitingPlanSignals) {
          if (!coveredIds.has(s.entityId)) toRemove.delete(s.id);
        }
      }

      const planCommitmentSignals = mappedSignals.filter(s =>
        s.signalReason === 'plan-needs-commitment'
      );
      if (planCommitmentSignals.length > 0) {
        const entityIds = [...new Set(planCommitmentSignals.map(s => s.entityId))];
        const covered = await prisma.entityAssignment.findMany({
          where: {
            entityId: { in: entityIds },
            user: { roles: { some: { role: { name: 'DONOR' } } } },
          },
          select: { entityId: true },
          distinct: ['entityId'],
        });
        const coveredIds = new Set(covered.map(e => e.entityId));
        for (const s of planCommitmentSignals) {
          if (coveredIds.has(s.entityId)) toRemove.delete(s.id);
        }
      }

      finalSignals = mappedSignals.filter(s => !toRemove.has(s.id));

      const deduped = new Map<string, ActionSignalItem>();
      for (const s of finalSignals) {
        const key = `${s.entityId}:${s.type}:${s.signalReason}`;
        if (!deduped.has(key)) {
          deduped.set(key, s);
        }
      }

      finalSignals = Array.from(deduped.values());
      finalSignals.sort((a, b) => {
        const pDiff = this.priorityRank(b.priority) - this.priorityRank(a.priority);
        if (pDiff !== 0) return pDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      finalTotal = finalSignals.length;
      finalUnresolved = finalSignals.filter(s => !s.resolvedAt).length;
      finalCritical = finalSignals.filter(s => !s.resolvedAt && s.priority === 'CRITICAL').length;
    }

    let groups: SignalGroup[] = [];
    if (query.grouped) {
      groups = this.groupSignals(finalSignals);
    }

    return {
      signals: finalSignals,
      groups,
      totalCount: finalTotal,
      unresolvedCount: finalUnresolved,
      criticalCount: finalCritical,
    };
  }

  static groupSignals(signals: ActionSignalItem[]): SignalGroup[] {
    const groupMap = new Map<string, SignalGroup>();

    for (const signal of signals) {
      const key = `${signal.entityId}:${signal.type}`;
      const existing = groupMap.get(key);
      if (existing) {
        existing.signals.push(signal);
        existing.count++;
        if (this.priorityRank(signal.priority) > this.priorityRank(existing.highestPriority)) {
          existing.highestPriority = signal.priority;
        }
      } else {
        groupMap.set(key, {
          entityId: signal.entityId,
          entityName: signal.entity.name,
          entityType: signal.entity.type,
          entityLocation: signal.entity.location,
          entityCoordinates: signal.entity.coordinates,
          type: signal.type,
          signals: [signal],
          count: 1,
          highestPriority: signal.priority,
        });
      }
    }

    return Array.from(groupMap.values()).sort(
      (a, b) => this.priorityRank(b.highestPriority) - this.priorityRank(a.highestPriority)
    );
  }

  private static priorityRank(p: SignalPriority): number {
    switch (p) {
      case 'CRITICAL': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 0;
    }
  }

  private static async upsertSignal(
    data: {
      userId: string;
      entityId: string;
      incidentId: string;
      type: string;
      signalReason: SignalReason;
      priority: SignalPriority;
      context: SignalContext;
    },
    tx: PrismaTransaction | typeof prisma
  ): Promise<void> {
    const existing = await tx.actionSignal.findFirst({
      where: {
        userId: data.userId,
        entityId: data.entityId,
        incidentId: data.incidentId,
        type: data.type,
        signalReason: data.signalReason,
        resolvedAt: null,
      },
    });

    if (existing) {
      await tx.actionSignal.update({
        where: { id: existing.id },
        data: {
          priority: data.priority,
          context: data.context as any,
          resolvedAt: null,
        },
      });
      return;
    }

    const signal = await tx.actionSignal.create({
      data: {
        userId: data.userId,
        entityId: data.entityId,
        incidentId: data.incidentId,
        type: data.type,
        signalReason: data.signalReason,
        priority: data.priority,
        context: data.context as any,
      },
    });

    await this.createNotification(signal.id, data.userId, data.signalReason, data.context, tx);
  }

  private static async createNotification(
    signalId: string,
    userId: string,
    reason: SignalReason,
    context: SignalContext,
    tx: PrismaTransaction | typeof prisma
  ): Promise<void> {
    const template = NOTIFICATION_TEMPLATES[reason];
    if (!template) return;

    const body = template.body
      .replace('{entityName}', context.entityName || '')
      .replace('{assessmentType}', context.assessmentType || '')
      .replace('{responseType}', context.responseType || '')
      .replace('{donorName}', context.donorName || '')
      .replace('{coveragePercent}', String(context.coveragePercent || 0));

    await tx.notification.create({
      data: {
        userId,
        signalId,
        title: template.title,
        body,
        priority: 'MEDIUM',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  private static async resolveSignals(
    userId: string,
    entityId: string,
    incidentId: string,
    type: string,
    reasons: SignalReason[],
    tx: PrismaTransaction | typeof prisma
  ): Promise<void> {
    await tx.actionSignal.updateMany({
      where: {
        userId,
        entityId,
        incidentId,
        type,
        signalReason: { in: reasons },
        resolvedAt: null,
      },
      data: { resolvedAt: new Date() },
    });
  }

  private static async resolveSignalsForReason(
    reason: SignalReason,
    payload: SignalTriggerPayload,
    tx: PrismaTransaction | typeof prisma
  ): Promise<void> {
    if (!payload.entityId) return;

    await tx.actionSignal.updateMany({
      where: {
        entityId: payload.entityId,
        incidentId: payload.incidentId || undefined,
        type: payload.assessmentType || payload.responseType || '',
        signalReason: reason,
        resolvedAt: null,
      },
      data: { resolvedAt: new Date() },
    });
  }

  private static async getAssignmentsForEntity(
    entityId: string,
    tx: PrismaTransaction | typeof prisma
  ): Promise<{ userId: string; role: string }[]> {
    const assignments = await tx.entityAssignment.findMany({
      where: { entityId },
      select: {
        userId: true,
        user: {
          select: {
            roles: {
              select: {
                role: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    const result: { userId: string; role: string }[] = [];
    for (const assignment of assignments) {
      for (const userRole of assignment.user.roles) {
        result.push({ userId: assignment.userId, role: userRole.role.name });
      }
    }
    return result;
  }

  private static async derivePriorityFromIncident(
    incidentId: string,
    assessmentType: string,
    tx: PrismaTransaction | typeof prisma
  ): Promise<SignalPriority> {
    if (assessmentType === 'POPULATION') return 'CRITICAL';

    const incident = await tx.incident.findUnique({
      where: { id: incidentId },
      select: { severity: true },
    });

    return this.mapSeverityToPriority(incident?.severity);
  }

  private static mapSeverityToPriority(severity?: string | null): SignalPriority {
    switch (severity) {
      case 'CRITICAL': return 'CRITICAL';
      case 'HIGH': return 'HIGH';
      case 'MEDIUM': return 'MEDIUM';
      case 'LOW': return 'LOW';
      default: return 'MEDIUM';
    }
  }
}
