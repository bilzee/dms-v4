import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { EntityAssignmentServiceImpl } from '@/lib/services/entity-assignment.service';
import { handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;
  
  // Only responders can access available commitments
  if (!roles.includes('RESPONDER')) {
    return NextResponse.json(
      { success: false, error: 'Access denied. Responder role required.' },
      { status: 403 }
    );
  }
  
  try {
    const url = new URL(request.url);
    const entityId = url.searchParams.get('entityId');
    const incidentId = url.searchParams.get('incidentId');
    const status = url.searchParams.get('status') || 'PLANNED';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Get entity assignments for the responder
    const entityAssignmentService = new EntityAssignmentServiceImpl();
    const assignedEntities = await entityAssignmentService.getUserAssignedEntities(user.id);
    
    if (assignedEntities.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      });
    }

    const assignedEntityIds = assignedEntities.map(e => e.id);

    // Build where clause for available commitments
    const whereClause: any = {
      status: status as any,
      entityId: { in: assignedEntityIds },
      donor: {
        isActive: true
      },
      entity: {
        isActive: true
      },
      // Only show commitments that have available quantity
      totalCommittedQuantity: {
        gt: prisma.donorCommitment.fields.deliveredQuantity
      }
    };

    if (entityId) {
      // If specific entity requested, ensure user is assigned to it
      if (!assignedEntityIds.includes(entityId)) {
        return NextResponse.json(
          { success: false, error: 'Access denied. Entity not assigned to responder.' },
          { status: 403 }
        );
      }
      whereClause.entityId = entityId;
    }

    if (incidentId) {
      whereClause.incidentId = incidentId;
    }

    // Get available commitments with related data
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

    // Calculate available quantities for each commitment
    const commitmentsWithAvailability = commitments.map(commitment => {
      const availableQuantity = commitment.totalCommittedQuantity - commitment.deliveredQuantity;
      return {
        ...commitment,
        availableQuantity,
        isPartiallyDelivered: commitment.deliveredQuantity > 0,
        utilizationRate: commitment.totalCommittedQuantity > 0 
          ? (commitment.deliveredQuantity / commitment.totalCommittedQuantity) * 100 
          : 0
      };
    });

    return NextResponse.json({
      success: true,
      data: commitmentsWithAvailability,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalAvailable: commitmentsWithAvailability.reduce((sum, c) => sum + c.availableQuantity, 0),
        commitmentCount: commitmentsWithAvailability.length
      }
    });

  } catch (error) {
    console.error('Error fetching available commitments:', error);
    return handleApiError(error);
  }
});