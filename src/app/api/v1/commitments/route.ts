import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { CommitmentQuerySchema } from '@/lib/validation/commitment';
import { EntityAssignmentServiceImpl } from '@/lib/services/entity-assignment.service';
import { successResponse, createdResponse, errorResponse, handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;
  
  try {
    // Get query parameters for filtering
    const url = new URL(request.url);
    const queryParams = {
      entityId: url.searchParams.get('entityId'),
      incidentId: url.searchParams.get('incidentId'),
      status: url.searchParams.get('status'),
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '50')
    };

    const validatedParams = CommitmentQuerySchema.parse(queryParams);
    const { page, limit } = validatedParams;
    const skip = (page - 1) * limit;

    // Build where clause
    let whereClause: any = {};

    // Apply filters
    if (validatedParams.entityId) whereClause.entityId = validatedParams.entityId;
    if (validatedParams.incidentId) whereClause.incidentId = validatedParams.incidentId;
    if (validatedParams.status) whereClause.status = validatedParams.status;

    // Apply role-based access controls
    if (roles.includes('RESPONDER') && !roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      // Responders can only see commitments for their assigned entities
      const entityAssignmentService = new EntityAssignmentServiceImpl();
      
      if (validatedParams.entityId) {
        // Check if assigned to specific entity
        const isAssigned = await entityAssignmentService.isUserAssigned(user.id, validatedParams.entityId);
        if (!isAssigned) {
          return NextResponse.json(
            { success: false, error: 'Access denied. Entity not assigned to responder.' },
            { status: 403 }
          );
        }
      } else {
        // Get all assigned entities for the responder
        const assignedEntities = await entityAssignmentService.getUserAssignedEntities(user.id);
        const assignedEntityIds = assignedEntities.map(e => e.id);
        whereClause.entityId = { in: assignedEntityIds };
      }
    } else if (roles.includes('DONOR') && !roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      // Donors can see all commitments (filtering can be done on the frontend)
      // TODO: Implement proper donor-specific filtering when user-donor relationship is established
    }

    // Get commitments with related data
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
          }
        },
        orderBy: {
          commitmentDate: 'desc'
        }
      }),
      prisma.donorCommitment.count({ where: whereClause })
    ]);

    // Calculate summary statistics
    const statusCounts = await prisma.donorCommitment.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        status: true
      }
    });

    const totalCommitted = await prisma.donorCommitment.aggregate({
      where: whereClause,
      _sum: {
        totalCommittedQuantity: true
      }
    });

    const totalDelivered = await prisma.donorCommitment.aggregate({
      where: whereClause,
      _sum: {
        deliveredQuantity: true
      }
    });

    const statistics = {
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>),
      totalCommitted: totalCommitted._sum.totalCommittedQuantity || 0,
      totalDelivered: totalDelivered._sum.deliveredQuantity || 0
    };

    return NextResponse.json({
      success: true,
      data: commitments,
      statistics,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching commitments:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: error.message 
        },
        { status: 400 }
      );
    }

    return handleApiError(error);
  }
});

export const POST = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;

  if (!roles || roles.length === 0) {
    return errorResponse('Authentication required.', 401);
  }

  const hasPermission = roles.includes('DONOR') || roles.includes('COORDINATOR') || roles.includes('ADMIN');
  if (!hasPermission) {
    return errorResponse('Insufficient permissions. Donor, Coordinator, or Admin role required.', 403);
  }

  try {
    const body = await request.json();
    const { donorId, entityId, incidentId, type, items, notes, totalValueEstimated } = body;

    if (!donorId || !entityId || !incidentId) {
      return errorResponse('Donor ID, Entity ID, and Incident ID are required.', 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('At least one commitment item is required.', 400);
    }

    const [donor, entity, incident] = await Promise.all([
      prisma.donor.findUnique({ where: { id: donorId } }),
      prisma.entity.findUnique({ where: { id: entityId } }),
      prisma.incident.findUnique({ where: { id: incidentId } }),
    ]);

    if (!donor) return errorResponse('Donor not found.', 404);
    if (!entity) return errorResponse('Entity not found.', 404);
    if (!incident) return errorResponse('Incident not found.', 404);

    const totalCommittedQuantity = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
    const calculatedValue = totalValueEstimated || items.reduce((sum: number, item: any) => sum + (Number(item.estimatedValue) || 0), 0);

    const commitment = await prisma.donorCommitment.create({
      data: {
        donorId,
        entityId,
        incidentId,
        type: type || 'LOGISTICS',
        status: 'PLANNED',
        items: items,
        totalCommittedQuantity,
        deliveredQuantity: 0,
        verifiedDeliveredQuantity: 0,
        notes: notes || null,
        totalValueEstimated: calculatedValue,
      },
      include: {
        donor: { select: { id: true, name: true, type: true, organization: true } },
        entity: { select: { id: true, name: true, type: true, location: true } },
        incident: { select: { id: true, type: true, subType: true, severity: true, status: true } },
      },
    });

    return createdResponse(commitment);
  } catch (error) {
    return handleApiError(error);
  }
});