import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { UpdateCommitmentSchema, CommitmentStatusUpdateSchema, EntityAssignmentSchema } from '@/lib/validation/commitment';
import { auditLogService } from '@/lib/services/audit-log.service';
import { EntityAssignmentServiceImpl } from '@/lib/services/entity-assignment.service';
import { handleApiError } from '@/lib/api/response'

interface RouteParams {
  params: { id: string }
}

export const GET = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { user, roles } = context;
  const { id: commitmentId } = params;
  
  try {
    const commitment = await prisma.donorCommitment.findUnique({
      where: { id: commitmentId },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            type: true,
            organization: true,
            contactEmail: true,
            contactPhone: true,
            isActive: true
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

    if (!commitment) {
      return NextResponse.json(
        { success: false, error: 'Commitment not found' },
        { status: 404 }
      );
    }

    // Check authorization - role-based access only
    const isAuthorized = roles.includes('COORDINATOR') || roles.includes('ADMIN') || roles.includes('RESPONDER');

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // For responders, check if they're assigned to the entity
    if (roles.includes('RESPONDER') && !roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      const entityAssignmentService = new EntityAssignmentServiceImpl();
      const isAssigned = await entityAssignmentService.isUserAssigned(user.id, commitment.entityId);
      if (!isAssigned) {
        return NextResponse.json(
          { success: false, error: 'Access denied. Entity not assigned to responder.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: commitment
    });

  } catch (error) {
    console.error('Error fetching commitment:', error);
    return handleApiError(error);
  }
});

export const PATCH = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { user, roles } = context;
  const { id: commitmentId } = params;
  
  try {
    // Get existing commitment
    const existingCommitment = await prisma.donorCommitment.findUnique({
      where: { id: commitmentId },
      include: {
        donor: {
          select: { id: true, name: true, isActive: true }
        }
      }
    });

    if (!existingCommitment) {
      return NextResponse.json(
        { success: false, error: 'Commitment not found' },
        { status: 404 }
      );
    }

    // Check authorization - only donors, coordinators, or admins can update
    const isAuthorized = roles.includes('DONOR') || roles.includes('COORDINATOR') || roles.includes('ADMIN');

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to update commitment' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Determine if this is a status update or general update
    const isStatusUpdate = body.status !== undefined && Object.keys(body).length <= 3;
    const validatedData = isStatusUpdate 
      ? CommitmentStatusUpdateSchema.parse(body)
      : UpdateCommitmentSchema.parse(body);

    // Prepare update data
    const updateData: any = { ...validatedData };

    // Recalculate total quantity if items are being updated
    if ('items' in validatedData && validatedData.items) {
      updateData.totalCommittedQuantity = validatedData.items.reduce(
        (sum, item) => sum + item.quantity, 
        0
      );
    }

    // Validate status transitions
    if ('status' in validatedData && validatedData.status) {
      const validTransitions: Record<string, string[]> = {
        'PLANNED': ['PARTIAL', 'COMPLETE', 'CANCELLED'],
        'PARTIAL': ['COMPLETE', 'CANCELLED'],
        'COMPLETE': [], // No transitions from complete
        'CANCELLED': [] // No transitions from cancelled
      };

      const allowedTransitions = validTransitions[existingCommitment.status] || [];
      if (validatedData.status !== existingCommitment.status && !allowedTransitions.includes(validatedData.status as string)) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid status transition from ${existingCommitment.status} to ${validatedData.status}` 
          },
          { status: 400 }
        );
      }
    }

    // Validate delivered quantities
    if (validatedData.deliveredQuantity !== undefined) {
      if (validatedData.deliveredQuantity > existingCommitment.totalCommittedQuantity) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Delivered quantity cannot exceed total committed quantity' 
          },
          { status: 400 }
        );
      }
    }

    // Update commitment
    const updatedCommitment = await prisma.donorCommitment.update({
      where: { id: commitmentId },
      data: updateData,
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
      action: 'UPDATE_COMMITMENT',
      resource: 'DonorCommitment',
      resourceId: commitmentId,
      oldValues: {
        status: existingCommitment.status,
        deliveredQuantity: existingCommitment.deliveredQuantity,
        items: existingCommitment.items,
        notes: existingCommitment.notes
      },
      newValues: updateData,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      data: updatedCommitment,
      message: 'Commitment updated successfully'
    });

  } catch (error) {
    console.error('Error updating commitment:', error);
    
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

export const DELETE = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { user, roles } = context;
  const { id: commitmentId } = params;
  
  try {
    const existingCommitment = await prisma.donorCommitment.findUnique({
      where: { id: commitmentId },
      include: {
        donor: {
          select: { id: true, name: true, isActive: true }
        }
      }
    });

    if (!existingCommitment) {
      return NextResponse.json(
        { success: false, error: 'Commitment not found' },
        { status: 404 }
      );
    }

    // Check authorization - only donors, coordinators, or admins can delete
    const isAuthorized = roles.includes('DONOR') || roles.includes('COORDINATOR') || roles.includes('ADMIN');

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to delete commitment' },
        { status: 403 }
      );
    }

    // Only allow deletion of PLANNED commitments
    if (existingCommitment.status !== 'PLANNED') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Can only delete commitments with PLANNED status' 
        },
        { status: 400 }
      );
    }

    // Soft delete by marking as CANCELLED
    const deletedCommitment = await prisma.donorCommitment.update({
      where: { id: commitmentId },
      data: { status: 'CANCELLED' },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            type: true,
            organization: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        incident: {
          select: {
            id: true,
            type: true,
            description: true
          }
        }
      }
    });

    // Log audit trail
    await auditLogService.logAction({
      userId: user.id,
      action: 'DELETE_COMMITMENT',
      resource: 'DonorCommitment',
      resourceId: commitmentId,
      oldValues: {
        status: existingCommitment.status,
        totalCommittedQuantity: existingCommitment.totalCommittedQuantity
      },
      newValues: {
        status: 'CANCELLED'
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      data: deletedCommitment,
      message: 'Commitment cancelled successfully'
    });

  } catch (error) {
    console.error('Error deleting commitment:', error);
    return handleApiError(error);
  }
});