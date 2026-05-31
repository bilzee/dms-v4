import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { successResponse, createdResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/api/response';
import { EntityAssignmentServiceImpl } from '@/lib/services/entity-assignment.service';
import { CreateCommitmentSchema, CommitmentQuerySchema } from '@/lib/validation/commitment';
import { auditLogService } from '@/lib/services/audit-log.service';

interface RouteParams {
  params: { id: string }
}

export const GET = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { user, roles } = context;
  const { id: donorId } = params;

  try {
    const donor = await prisma.donor.findUnique({
      where: { id: donorId, isActive: true }
    });

    if (!donor) {
      return errorResponse('Donor not found', 404);
    }

    const url = new URL(request.url);
    const entityId = url.searchParams.get('entityId');
    const incidentId = url.searchParams.get('incidentId');
    const status = url.searchParams.get('status') as any;
    const includeResponses = url.searchParams.get('includeResponses') === 'true';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const whereClause: any = {
      donorId,
      donor: {
        isActive: true
      }
    };

    if (entityId) whereClause.entityId = entityId;
    if (incidentId) whereClause.incidentId = incidentId;
    if (status) whereClause.status = status;

    if (roles.includes('RESPONDER')) {
      const entityAssignmentService = new EntityAssignmentServiceImpl();

      if (entityId) {
        const isAssigned = await entityAssignmentService.isUserAssigned(user.id, entityId);
        if (!isAssigned) {
          return errorResponse('Access denied. Entity not assigned to responder.', 403);
        }
      } else {
        const assignedEntities = await entityAssignmentService.getUserAssignedEntities(user.id);
        const assignedEntityIds = assignedEntities.map(e => e.id);
        whereClause.entityId = { in: assignedEntityIds };
      }
    } else if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN') && !roles.includes('DONOR')) {
      return errorResponse('Insufficient permissions', 403);
    }

    if (roles.includes('DONOR') && !roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organization: true }
      });

      const userDonor = await prisma.donor.findFirst({
        where: {
          OR: [
            ...(currentUser?.organization ? [{ name: currentUser.organization }] : []),
            ...(currentUser?.organization ? [{ organization: currentUser.organization }] : [])
          ],
          isActive: true
        }
      });

      if (!userDonor || userDonor.id !== donorId) {
        return errorResponse('Access denied. Can only view own commitments.', 403);
      }
    }

    const [commitments, total] = await Promise.all([
      prisma.donorCommitment.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              type: true,
              organization: true,
              contactEmail: true,
              contactPhone: true
            }
          },
          entity: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true
            }
          },
          incident: {
            select: {
              id: true,
              type: true,
              subType: true,
              severity: true,
              status: true,
              description: true,
              location: true
            }
          },
          ...(includeResponses && {
            responses: {
              select: {
                id: true,
                type: true,
                priority: true,
                deliveryStatus: true,
                description: true,
                items: true,
                plannedDate: true,
                responseDate: true,
                verificationStatus: true,
                verifiedAt: true,
                createdAt: true,
                updatedAt: true,
                entity: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    location: true
                  }
                }
              }
            }
          })
        },
        orderBy: {
          commitmentDate: 'desc'
        }
      }),
      prisma.donorCommitment.count({ where: whereClause })
    ]);

    return paginatedResponse(commitments, page, limit, total);

  } catch (error) {
    console.error('Error fetching donor commitments:', error);
    return handleApiError(error);
  }
});

export const POST = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { user, roles } = context;
  const { id: donorId } = params;

  try {
    const donor = await prisma.donor.findUnique({
      where: { id: donorId, isActive: true }
    });

    if (!donor) {
      return errorResponse('Donor not found or inactive', 404);
    }

    if (roles.includes('DONOR') && !roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organization: true }
      });

      if (!currentUser?.organization ||
          (donor.name !== currentUser.organization && donor.organization !== currentUser.organization)) {
        return errorResponse('Access denied. Can only create commitments for your own organization.', 403);
      }
    }

    const body = await request.json();
    const responseIdFromBody: string | undefined = body.responseId;
    const validatedData = CreateCommitmentSchema.parse(body);

    let resolvedIncidentId = validatedData.incidentId || null;
    let resolvedEntityId = validatedData.entityId || null;

    if (responseIdFromBody) {
      const response = await prisma.rapidResponse.findUnique({
        where: { id: responseIdFromBody },
        select: { id: true, entityId: true, assessmentId: true, items: true, sourceCommitmentId: true }
      });
      if (response) {
        if (response.sourceCommitmentId) {
          return errorResponse('Cannot create commitment from this response plan because it was itself created from a commitment (circular reference)', 400);
        }
        resolvedEntityId = response.entityId;
        const assessment = await prisma.rapidAssessment.findUnique({
          where: { id: response.assessmentId },
          select: { incidentId: true }
        });
        if (assessment?.incidentId) {
          resolvedIncidentId = assessment.incidentId;
        }
      }
    }

    if (!resolvedEntityId) {
      return errorResponse('Entity ID is required (provide entityId or responseId)', 400);
    }
    if (!resolvedIncidentId) {
      return errorResponse('Incident ID could not be resolved', 400);
    }

    const [entity, incident] = await Promise.all([
      prisma.entity.findUnique({
        where: { id: resolvedEntityId },
        select: { id: true, name: true, type: true, location: true }
      }),
      prisma.incident.findUnique({
        where: { id: resolvedIncidentId },
        select: { id: true, type: true, status: true }
      })
    ]);

    if (!entity) {
      return errorResponse('Entity not found', 404);
    }

    if (!incident) {
      return errorResponse('Incident not found', 404);
    }

    const totalCommittedQuantity = validatedData.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const commitment = await prisma.donorCommitment.create({
      data: {
        donorId,
        entityId: resolvedEntityId,
        incidentId: resolvedIncidentId,
        status: 'PLANNED',
        items: validatedData.items,
        totalCommittedQuantity,
        deliveredQuantity: 0,
        verifiedDeliveredQuantity: 0,
        notes: validatedData.notes,
        type: validatedData.type || 'LOGISTICS',
        ...(responseIdFromBody && { sourcePlanId: responseIdFromBody }),
      },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            type: true,
            organization: true,
            contactEmail: true,
            contactPhone: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true
          }
        },
        incident: {
          select: {
            id: true,
            type: true,
            subType: true,
            severity: true,
            status: true,
            description: true,
            location: true
          }
        }
      }
    });

    if (responseIdFromBody) {
      await prisma.planCommitment.create({
        data: {
          planId: responseIdFromBody,
          commitmentId: commitment.id,
        }
      });
    }

    await auditLogService.logAction({
      userId: user.id,
      action: 'CREATE_COMMITMENT',
      resource: 'DonorCommitment',
      resourceId: commitment.id,
      oldValues: null,
      newValues: {
        donorId,
        entityId: resolvedEntityId,
        incidentId: resolvedIncidentId,
        items: validatedData.items,
        totalCommittedQuantity,
        notes: validatedData.notes,
        linkedResponseId: responseIdFromBody || null,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    try {
      const { ActionSignalService } = await import('@/lib/services/action-signal.service');
      await ActionSignalService.evaluateAndGenerate({
        trigger: 'commitment-created',
        entityId: resolvedEntityId,
        incidentId: resolvedIncidentId,
        commitmentId: commitment.id,
        donorId: user.id,
      });
    } catch (e) {
      console.error('[CommitmentAPI] signal hook error:', e);
    }

    return createdResponse(commitment);

  } catch (error) {
    console.error('Error creating commitment:', error);
    return handleApiError(error);
  }
});
