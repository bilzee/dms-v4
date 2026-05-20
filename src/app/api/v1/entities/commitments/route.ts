import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { z } from 'zod';
import { auditLog } from '@/lib/services/audit.service';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

const CreateCommitmentSchema = z.object({
  donorId: z.string().uuid(),
  entityId: z.string().uuid(),
  incidentId: z.string().uuid(),
  items: z.array(z.object({
    name: z.string().min(1),
    unit: z.string().min(1),
    quantity: z.number().min(1),
    estimatedValue: z.number().min(0).optional()
  })).min(1),
  notes: z.string().optional()
});

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      await auditLog({
        userId: context.userId,
        action: 'UNAUTHORIZED_ACCESS',
        resource: 'ENTITY_COMMITMENTS',
        oldValues: null,
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });

      return errorResponse('Forbidden - COORDINATOR or ADMIN access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const donorId = searchParams.get('donorId');
    const entityId = searchParams.get('entityId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause: any = {};
    if (status && status !== 'all') whereClause.status = status;
    if (donorId && donorId !== 'all') whereClause.donorId = donorId;
    if (entityId && entityId !== 'all') whereClause.entityId = entityId;

    if (search) {
      whereClause.OR = [
        { donor: { name: { contains: search, mode: 'insensitive' } } },
        { entity: { name: { contains: search, mode: 'insensitive' } } },
        { incident: { type: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const total = await db.donorCommitment.count({ where: whereClause });

    const commitments = await db.donorCommitment.findMany({
      where: whereClause,
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            type: true,
            contactEmail: true,
            contactPhone: true,
            organization: true
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
            severity: true,
            location: true
          }
        }
      },
      orderBy: {
        commitmentDate: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };

    await auditLog({
      userId: context.userId,
      action: 'ACCESS_ENTITY_COMMITMENTS',
      resource: 'ENTITY_COMMITMENTS',
      oldValues: null,
      newValues: {
        filters: { status, donorId, entityId, search },
        pagination: { page, limit, total }
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return successResponse({
      data: commitments,
      pagination
    });

  } catch (error) {
    console.error('Error fetching entity commitments:', error);

    try {
      await auditLog({
        userId: context.userId,
        action: 'ERROR_ACCESS_ENTITY_COMMITMENTS',
        resource: 'ENTITY_COMMITMENTS',
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

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return errorResponse('Forbidden - COORDINATOR or ADMIN access required', 403);
    }

    const body = await request.json();
    const validatedData = CreateCommitmentSchema.parse(body);

    const [donor, entity, incident] = await Promise.all([
      db.donor.findUnique({ where: { id: validatedData.donorId } }),
      db.entity.findUnique({ where: { id: validatedData.entityId } }),
      db.incident.findUnique({ where: { id: validatedData.incidentId } })
    ]);

    if (!donor) {
      return errorResponse('Donor not found', 404);
    }

    if (!entity) {
      return errorResponse('Entity not found', 404);
    }

    if (!incident) {
      return errorResponse('Incident not found', 404);
    }

    const totalCommittedQuantity = validatedData.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValueEstimated = validatedData.items.reduce((sum, item) =>
      sum + (item.estimatedValue || 0) * item.quantity, 0
    );

    const commitment = await db.donorCommitment.create({
      data: {
        donorId: validatedData.donorId,
        entityId: validatedData.entityId,
        incidentId: validatedData.incidentId,
        status: 'PLANNED',
        items: validatedData.items,
        totalCommittedQuantity,
        deliveredQuantity: 0,
        verifiedDeliveredQuantity: 0,
        totalValueEstimated,
        notes: validatedData.notes,
        commitmentDate: new Date()
      },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            type: true,
            contactEmail: true,
            contactPhone: true,
            organization: true
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
            severity: true,
            location: true
          }
        }
      }
    });

    await auditLog({
      userId: context.userId,
      action: 'CREATE_COMMITMENT',
      resource: 'ENTITY_COMMITMENTS',
      resourceId: commitment.id,
      oldValues: null,
      newValues: {
        donorId: validatedData.donorId,
        entityId: validatedData.entityId,
        incidentId: validatedData.incidentId,
        items: validatedData.items,
        totalCommittedQuantity,
        totalValueEstimated
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return successResponse(commitment);

  } catch (error) {
    console.error('Error creating commitment:', error);

    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }

    try {
      await auditLog({
        userId: context.userId,
        action: 'ERROR_CREATE_COMMITMENT',
        resource: 'ENTITY_COMMITMENTS',
        oldValues: null,
        newValues: {
          error: error instanceof Error ? error.message : 'Unknown error',
          body: await request.clone().json().catch(() => ({}))
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });
    } catch (auditError) {
      // Ignore audit log errors
    }

    return handleApiError(error);
  }
});
