import { prisma } from '@/lib/db/client';
import type { SignalReason } from '@/types/action-signal';

interface ReconciliationResult {
  evaluated: number;
  resolved: number;
  errors: string[];
  durationMs: number;
}

export class SignalReconciliationJob {
  static async run(): Promise<ReconciliationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let evaluated = 0;
    let resolved = 0;

    try {
      const activeSignals = await prisma.actionSignal.findMany({
        where: { resolvedAt: null },
        include: {
          entity: { select: { id: true } },
          incident: { select: { id: true, severity: true } },
        },
      });

      evaluated = activeSignals.length;

      for (const signal of activeSignals) {
        try {
          const shouldResolve = await this.evaluateSignal(signal);
          if (shouldResolve) {
            await prisma.actionSignal.update({
              where: { id: signal.id },
              data: { resolvedAt: new Date() },
            });
            resolved++;
          }
        } catch (err) {
          errors.push(`Signal ${signal.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } catch (err) {
      errors.push(`Fatal: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    return {
      evaluated,
      resolved,
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  private static async evaluateSignal(signal: any): Promise<boolean> {
    const reason = signal.signalReason as SignalReason;

    switch (reason) {
      case 'unassessed':
        return this.checkUnassessed(signal);
      case 'reassessment-needed':
        return this.checkReassessmentNeeded(signal);
      case 'overdue':
        return false;
      case 'awaiting-plan':
        return this.checkAwaitingPlan(signal);
      case 'awaiting-plan-for-commitment':
        return this.checkAwaitingPlanForCommitment(signal);
      case 'awaiting-delivery':
        return this.checkAwaitingDelivery(signal);
      case 'partially-covered':
        return this.checkPartiallyCovered(signal);
      case 'assessment-needs-response':
        return this.checkAssessmentNeedsResponse(signal);
      case 'plan-needs-commitment':
        return this.checkPlanNeedsCommitment(signal);
      case 'partially-fulfilled':
        return this.checkPartiallyFulfilled(signal);
      case 'entity-needs-assessor':
      case 'entity-needs-responder':
      case 'entity-needs-donor':
        return false;
      default:
        return false;
    }
  }

  private static async checkUnassessed(signal: any): Promise<boolean> {
    const hasAssessment = await prisma.rapidAssessment.findFirst({
      where: {
        entityId: signal.entityId,
        incidentId: signal.incidentId,
        rapidAssessmentType: signal.type as any,
        verificationStatus: { in: ['SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED'] },
      },
    });
    return !!hasAssessment;
  }

  private static async checkReassessmentNeeded(signal: any): Promise<boolean> {
    const context = signal.context as any;
    if (!context?.responseId) return false;

    const hasReassessment = await prisma.rapidAssessment.findFirst({
      where: {
        entityId: signal.entityId,
        incidentId: signal.incidentId,
        rapidAssessmentType: signal.type as any,
        verificationStatus: { in: ['SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED'] },
        createdAt: { gte: new Date(signal.createdAt) },
      },
    });
    return !!hasReassessment;
  }

  private static async checkAwaitingPlan(signal: any): Promise<boolean> {
    const context = signal.context as any;
    const hasResponse = await prisma.rapidResponse.findFirst({
      where: {
        entityId: signal.entityId,
        type: signal.type as any,
        ...(context?.assessmentId ? { assessmentId: context.assessmentId } : {}),
      },
    });
    return !!hasResponse;
  }

  private static async checkAwaitingPlanForCommitment(signal: any): Promise<boolean> {
    const context = signal.context as any;
    if (!context?.commitmentId) return false;

    const commitment = await prisma.donorCommitment.findUnique({
      where: { id: context.commitmentId },
      select: { planCommitments: { select: { planId: true } } },
    });
    if (!commitment) return true;
    return commitment.planCommitments.length > 0;
  }

  private static async checkAwaitingDelivery(signal: any): Promise<boolean> {
    const context = signal.context as any;
    if (!context?.responseId) return false;

    const response = await prisma.rapidResponse.findUnique({
      where: { id: context.responseId },
      select: { deliveryStatus: true },
    });
    if (!response) return true;
    return ['DELIVERED', 'VERIFIED'].includes(response.deliveryStatus);
  }

  private static async checkPartiallyCovered(signal: any): Promise<boolean> {
    const context = signal.context as any;
    if (!context?.responseId) return false;

    const response = await prisma.rapidResponse.findUnique({
      where: { id: context.responseId },
      select: { deliveryStatus: true },
    });
    if (!response) return true;
    return ['DELIVERED', 'VERIFIED'].includes(response.deliveryStatus);
  }

  private static async checkAssessmentNeedsResponse(signal: any): Promise<boolean> {
    const context = signal.context as any;
    const hasResponse = await prisma.rapidResponse.findFirst({
      where: {
        entityId: signal.entityId,
        type: signal.type as any,
        ...(context?.assessmentId ? { assessmentId: context.assessmentId } : {}),
      },
    });
    return !!hasResponse;
  }

  private static async checkPlanNeedsCommitment(signal: any): Promise<boolean> {
    const context = signal.context as any;
    if (!context?.responseId) return false;

    const response = await prisma.rapidResponse.findUnique({
      where: { id: context.responseId },
      select: { planCommitments: { select: { id: true } } },
    });
    if (!response) return true;
    return response.planCommitments.length > 0;
  }

  private static async checkPartiallyFulfilled(signal: any): Promise<boolean> {
    const context = signal.context as any;
    if (!context?.commitmentId) return false;

    const commitment = await prisma.donorCommitment.findUnique({
      where: { id: context.commitmentId },
      select: { status: true },
    });
    if (!commitment) return true;
    return commitment.status === 'COMPLETE';
  }

}
