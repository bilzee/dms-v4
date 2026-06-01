import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { EntityAssignmentServiceImpl } from '@/lib/services/entity-assignment.service';
import { ActionSignalService } from '@/lib/services/action-signal.service';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

const CommitmentImportSchema = z.object({
  commitmentId: z.string().min(1, 'Commitment ID is required'),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().positive(),
    unit: z.string()
  })).min(1),
  assessmentId: z.string().optional(),
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'LOGISTICS']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  createAsPlan: z.boolean().default(true),
  notes: z.string().optional()
});

export const POST = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;

  if (!roles.includes('RESPONDER')) {
    return NextResponse.json(
      { success: false, error: 'Access denied. Responder role required.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const validationResult = CommitmentImportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { commitmentId, items, assessmentId, type, priority, createAsPlan, notes } = validationResult.data;

    const commitment = await prisma.donorCommitment.findUnique({
      where: { id: commitmentId },
      include: {
        donor: true,
        entity: true,
        incident: true,
      }
    });

    if (!commitment) {
      return NextResponse.json(
        { success: false, error: 'Commitment not found' },
        { status: 404 }
      );
    }

    if (commitment.sourcePlanId) {
      return NextResponse.json(
        { success: false, error: 'Cannot create response plan from this commitment because it was itself created from a response plan (circular reference)' },
        { status: 400 }
      );
    }

    if (commitment.status !== 'PLANNED' && commitment.status !== 'PARTIAL') {
      return NextResponse.json(
        { success: false, error: 'Commitment is not available for import' },
        { status: 400 }
      );
    }

    const entityAssignmentService = new EntityAssignmentServiceImpl();
    const isAssigned = await entityAssignmentService.isUserAssigned(user.id, commitment.entityId);
    if (!isAssigned) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Entity not assigned to responder.' },
        { status: 403 }
      );
    }

    const commitmentItems = (commitment.items as Array<{ name: string; quantity: number; unit: string; deliveredQuantity?: number }>) || [];
    for (const requested of items) {
      const matching = commitmentItems.find(ci => ci.name === requested.name);
      if (!matching) {
        return NextResponse.json(
          {
            success: false,
            error: `Item "${requested.name}" not found in commitment`,
          },
          { status: 400 }
        );
      }
      const alreadyDelivered = matching.deliveredQuantity || 0;
      const availableForItem = matching.quantity - alreadyDelivered;
      if (requested.quantity > availableForItem) {
        return NextResponse.json(
          {
            success: false,
            error: `Requested ${requested.quantity} ${requested.name} but only ${availableForItem} available (committed: ${matching.quantity}, already delivered: ${alreadyDelivered})`,
            item: requested.name,
            requested: requested.quantity,
            available: availableForItem,
          },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let assessment;

      if (assessmentId) {
        assessment = await tx.rapidAssessment.findUnique({
          where: { id: assessmentId },
        });
        if (!assessment) {
          throw new Error('Specified assessment not found');
        }
      } else {
        assessment = await tx.rapidAssessment.findFirst({
          where: {
            entityId: commitment.entityId,
            verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] }
          },
          orderBy: { rapidAssessmentDate: 'desc' }
        });
      }

      if (!assessment) {
        assessment = await tx.rapidAssessment.findFirst({
          where: { entityId: commitment.entityId },
          orderBy: { rapidAssessmentDate: 'desc' }
        });
      }

      if (!assessment) {
        assessment = await tx.rapidAssessment.create({
          data: {
            id: `assessment-commitment-${commitment.id}`,
            rapidAssessmentType: 'SECURITY',
            rapidAssessmentDate: new Date(),
            assessorId: user.id,
            entityId: commitment.entityId,
            incidentId: commitment.incidentId,
            assessorName: user.name || 'System',
            location: commitment.entity.location,
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(),
            verifiedBy: user.id
          }
        });
      }

      const responseType = type || (commitment.type as any) || 'LOGISTICS';
      const responsePriority = priority || commitment.incident.severity || 'MEDIUM';
      const deliveryStatus = createAsPlan ? 'PLANNED' : 'DELIVERED';

      const response = await tx.rapidResponse.create({
        data: {
          responderId: user.id,
          entityId: commitment.entityId,
          assessmentId: assessment.id,
          type: responseType,
          sourceCommitmentId: commitment.id,
          deliveryStatus: deliveryStatus as any,
          priority: responsePriority as any,
          description: notes || `Response from ${commitment.donor.name} commitment`,
          items: items,
          responseDate: createAsPlan ? undefined : new Date(),
          plannedDate: new Date(),
          verificationStatus: createAsPlan ? 'DRAFT' : 'SUBMITTED',
          verifiedAt: null,
          verifiedBy: null
        },
        include: {
          entity: true,
          assessment: true,
          responder: true
        }
      });

      await tx.planCommitment.create({
        data: {
          planId: response.id,
          commitmentId: commitment.id
        }
      });

      const totalRequestedQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      if (!createAsPlan) {
        const updatedCommitmentItems = commitmentItems.map(ci => {
          const requested = items.find(i => i.name === ci.name);
          if (requested) {
            return { ...ci, deliveredQuantity: (ci.deliveredQuantity || 0) + requested.quantity };
          }
          return ci;
        });

        const newDeliveredQuantity = commitment.deliveredQuantity + totalRequestedQuantity;

        let newStatus: any = commitment.status;
        if (newDeliveredQuantity >= commitment.totalCommittedQuantity) {
          newStatus = 'COMPLETE';
        } else if (newDeliveredQuantity > 0) {
          newStatus = 'PARTIAL';
        }

        await tx.donorCommitment.update({
          where: { id: commitmentId },
          data: {
            deliveredQuantity: newDeliveredQuantity,
            status: newStatus,
            items: updatedCommitmentItems,
            lastUpdated: new Date()
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: createAsPlan ? 'CREATE_PLAN_FROM_COMMITMENT' : 'CREATE_DELIVERY_FROM_COMMITMENT',
          resource: 'RapidResponse',
          resourceId: response.id,
          oldValues: undefined,
          newValues: {
            commitmentId: commitment.id,
            donorId: commitment.donorId,
            entityId: commitment.entityId,
            items,
            totalQuantity: totalRequestedQuantity,
            deliveryStatus,
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });

      return response;
    });

    await ActionSignalService.evaluateAndGenerate({
      trigger: 'response-created',
      entityId: result.entityId,
      incidentId: (result as any).incidentId,
      responseId: result.id,
      responseType: result.type,
      responsePriority: result.priority as string,
    }).catch(() => {});

    const message = createAsPlan
      ? `Successfully created response plan from commitment. Awaiting delivery confirmation.`
      : `Successfully created delivery from commitment. Awaiting coordinator verification.`;

    return NextResponse.json({
      success: true,
      data: result,
      message
    });

  } catch (error) {
    console.error('Error creating response from commitment:', error);

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Response already exists for this commitment' },
        { status: 409 }
      );
    }

    return handleApiError(error);
  }
});
