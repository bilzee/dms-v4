import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth } from '@/lib/auth/middleware';
import { EntityAssignmentServiceImpl } from '@/lib/services/entity-assignment.service';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

// Validation schema for commitment import request
const CommitmentImportSchema = z.object({
  commitmentId: z.string().min(1, 'Commitment ID is required'),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().positive(),
    unit: z.string()
  })).min(1),
  notes: z.string().optional()
});

export const POST = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;
  
  // Only responders can create responses from commitments
  if (!roles.includes('RESPONDER')) {
    return NextResponse.json(
      { success: false, error: 'Access denied. Responder role required.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    
    // Validate request body
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

    const { commitmentId, items, notes } = validationResult.data;

    // Get commitment with full details
    const commitment = await prisma.donorCommitment.findUnique({
      where: { id: commitmentId },
      include: {
        donor: true,
        entity: true,
        incident: true
      }
    });

    if (!commitment) {
      return NextResponse.json(
        { success: false, error: 'Commitment not found' },
        { status: 404 }
      );
    }

    // Check if commitment is still available
    if (commitment.status !== 'PLANNED' && commitment.status !== 'PARTIAL') {
      return NextResponse.json(
        { success: false, error: 'Commitment is not available for import' },
        { status: 400 }
      );
    }

    // Validate entity assignment
    const entityAssignmentService = new EntityAssignmentServiceImpl();
    const isAssigned = await entityAssignmentService.isUserAssigned(user.id, commitment.entityId);
    if (!isAssigned) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Entity not assigned to responder.' },
        { status: 403 }
      );
    }

    // Calculate total requested quantity
    const totalRequestedQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const availableQuantity = commitment.totalCommittedQuantity - commitment.deliveredQuantity;

    if (totalRequestedQuantity > availableQuantity) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Requested quantity exceeds available commitment',
          available: availableQuantity,
          requested: totalRequestedQuantity
        },
        { status: 400 }
      );
    }

    // Create response from commitment within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find an existing assessment for the entity or create a default one
      let assessment = await tx.rapidAssessment.findFirst({
        where: {
          entityId: commitment.entityId,
          verificationStatus: 'VERIFIED'
        },
        orderBy: { rapidAssessmentDate: 'desc' }
      });

      // If no verified assessment found, find any assessment
      if (!assessment) {
        assessment = await tx.rapidAssessment.findFirst({
          where: { entityId: commitment.entityId },
          orderBy: { rapidAssessmentDate: 'desc' }
        });
      }

      // If still no assessment, create a default one for commitment import
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

      // Create the response
      const response = await tx.rapidResponse.create({
        data: {
          responderId: user.id,
          entityId: commitment.entityId,
          assessmentId: assessment.id,
          type: 'LOGISTICS', // Default for commitment-based responses
          deliveryStatus: 'DELIVERED', // Imported commitments are considered delivered
          priority: commitment.incident.severity,
          description: notes || `Response from ${commitment.donor.name} commitment`,
          items: items,
          donorId: commitment.donorId,
          commitmentId: commitment.id,
          responseDate: new Date(),
          plannedDate: new Date(),
          verificationStatus: 'SUBMITTED', // Awaits coordinator verification
          verifiedAt: null,
          verifiedBy: null
        },
        include: {
          donor: true,
          entity: true,
          commitment: true
        }
      });

      // Update commitment quantities (delivered but not yet verified)
      const newDeliveredQuantity = commitment.deliveredQuantity + totalRequestedQuantity;
      const newVerifiedDeliveredQuantity = commitment.verifiedDeliveredQuantity; // No change until verified
      
      // Update commitment status based on delivery
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
          verifiedDeliveredQuantity: newVerifiedDeliveredQuantity,
          status: newStatus,
          lastUpdated: new Date()
        }
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE_RESPONSE_FROM_COMMITMENT',
          resource: 'RapidResponse',
          resourceId: response.id,
          oldValues: undefined,
          newValues: {
            commitmentId,
            donorId: commitment.donorId,
            entityId: commitment.entityId,
            items,
            totalQuantity: totalRequestedQuantity
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });

      return response;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully created response from commitment. ${totalRequestedQuantity} units delivered. Awaiting coordinator verification.`
    });

  } catch (error) {
    console.error('Error creating response from commitment:', error);
    
    // Handle specific database errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Response already exists for this commitment' },
        { status: 409 }
      );
    }

    return handleApiError(error);
  }
});