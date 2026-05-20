import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response'

const rejectAssessmentSchema = z.object({
  reason: z.enum([
    'INCOMPLETE_DATA',
    'INACCURATE_INFORMATION', 
    'MISSING_DOCUMENTATION',
    'LOCATION_MISMATCH',
    'DUPLICATE_ASSESSMENT',
    'QUALITY_ISSUES',
    'OTHER'
  ]),
  feedback: z.string().min(1, 'Feedback is required when rejecting an assessment'),
  metadata: z.record(z.any()).optional()
});

interface RouteParams {
  params: Promise<{ id: string }>
}

export const POST = withAuth(async (
  request: NextRequest,
  context: any
) => {
  try {
    const { user, roles } = context;
    
    // Check if user has coordinator role
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = rejectAssessmentSchema.parse(body);
    // Extract ID from URL since we're not using async params
    const url = new URL(request.url);
    const pathname = url.pathname;
    const assessmentId = pathname.split('/').slice(-2, -1)[0]; // Get ID before /reject

    // Start transaction for rejection
    const result = await prisma.$transaction(async (tx: any) => {
      // Get assessment with current status
      const assessment = await tx.rapidAssessment.findUnique({
        where: { id: assessmentId },
        include: {
          entity: true,
          assessor: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Check if assessment is in rejectable state
      if (assessment.verificationStatus !== 'SUBMITTED') {
        throw new Error(
          `Cannot reject assessment with status: ${assessment.verificationStatus}`
        );
      }

      // Update assessment to rejected status
      const updatedAssessment = await tx.rapidAssessment.update({
        where: { id: assessmentId },
        data: {
          verificationStatus: 'REJECTED',
          rejectionReason: validatedData.reason,
          rejectionFeedback: validatedData.feedback,
          verifiedAt: new Date(),
          verifiedBy: user.userId
        },
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true
            }
          },
          assessor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: 'ASSESSMENT_REJECTED',
          resource: 'RapidAssessment',
          resourceId: assessmentId,
          newValues: {
            assessmentType: assessment.rapidAssessmentType,
            entityName: assessment.entity.name,
            rejectionReason: validatedData.reason,
            rejectionFeedback: validatedData.feedback,
            ...validatedData.metadata
          }
        }
      });

      return updatedAssessment;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Assessment rejected successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Assessment rejection error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return handleApiError(error);
  }
});