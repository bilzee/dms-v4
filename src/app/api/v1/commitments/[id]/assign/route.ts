import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { EntityAssignmentSchema } from '@/lib/validation/commitment';
import { auditLogService } from '@/lib/services/audit-log.service';
import { EntityAssignmentServiceImpl } from '@/lib/services/entity-assignment.service';
import { handleApiError } from '@/lib/api/response'

interface RouteParams {
  params: { id: string }
}

export const POST = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { user, roles } = context;
  const { id: commitmentId } = params;
  
  try {
    // Verify user has coordinator or admin role
    if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Only coordinators and admins can assign commitments to entities' },
        { status: 403 }
      );
    }

    // Get existing commitment
    const existingCommitment = await prisma.donorCommitment.findUnique({
      where: { id: commitmentId },
      include: {
        donor: {
          select: { id: true, name: true }
        },
        entity: {
          select: { id: true, name: true, type: true }
        },
        incident: {
          select: { id: true, type: true, status: true }
        }
      }
    });

    if (!existingCommitment) {
      return NextResponse.json(
        { success: false, error: 'Commitment not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = EntityAssignmentSchema.parse(body);

    // Validate new entity exists
    const newEntity = await prisma.entity.findUnique({
      where: { id: validatedData.entityId },
      select: { 
        id: true, 
        name: true, 
        type: true, 
        location: true
      }
    });

    if (!newEntity) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      );
    }

    // Note: Entity-incident relationship can be validated through RapidAssessment.incidentId
    // For now, we'll allow reassignment to any valid entity

    // Check if user is assigned to the target entity (for coordinators)
    if (roles.includes('COORDINATOR')) {
      const entityAssignmentService = new EntityAssignmentServiceImpl();
      const isAssignedToEntity = await entityAssignmentService.isUserAssigned(user.id, validatedData.entityId);
      
      if (!isAssignedToEntity) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'You must be assigned to the target entity to reassign commitments' 
          },
          { status: 403 }
        );
      }
    }

    // Store old entity for audit
    const oldEntityId = existingCommitment.entityId;

    // Update commitment entity assignment
    const updatedCommitment = await prisma.donorCommitment.update({
      where: { id: commitmentId },
      data: {
        entityId: validatedData.entityId,
        lastUpdated: new Date()
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

    // Log audit trail
    await auditLogService.logAction({
      userId: user.id,
      action: 'REASSIGN_COMMITMENT_ENTITY',
      resource: 'DonorCommitment',
      resourceId: commitmentId,
      oldValues: {
        entityId: oldEntityId,
        entityName: existingCommitment.entity.name
      },
      newValues: {
        entityId: validatedData.entityId,
        entityName: newEntity.name,
        assignedBy: validatedData.assignedBy
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      data: updatedCommitment,
      message: `Commitment reassigned from ${existingCommitment.entity.name} to ${newEntity.name}`
    });

  } catch (error) {
    console.error('Error assigning commitment to entity:', error);
    
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

// Get assignment history for a commitment
export const GET = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { user, roles } = context;
  const { id: commitmentId } = params;
  
  try {
    // Verify commitment exists and user has access
    const commitment = await prisma.donorCommitment.findUnique({
      where: { id: commitmentId },
      select: { 
        id: true, 
        donorId: true,
        donor: {
          select: { id: true, name: true }
        }
      }
    });

    if (!commitment) {
      return NextResponse.json(
        { success: false, error: 'Commitment not found' },
        { status: 404 }
      );
    }

    // Check authorization - only coordinators and admins can reassign commitments
    const isAuthorized = roles.includes('COORDINATOR') || roles.includes('ADMIN');

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Only coordinators and admins can reassign commitments.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        commitment: commitment,
        message: 'Assignment history endpoint - history functionality to be implemented'
      }
    });

  } catch (error) {
    console.error('Error fetching commitment assignment history:', error);
    return handleApiError(error);
  }
});