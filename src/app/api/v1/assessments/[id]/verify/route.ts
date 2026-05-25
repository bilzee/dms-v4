import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response'

const verifyAssessmentSchema = z.object({
  notes: z.string().optional(),
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
    const validatedData = verifyAssessmentSchema.parse(body);
    // Extract ID from URL since we're not using async params
  const url = new URL(request.url);
  const pathname = url.pathname;
  const assessmentId = pathname.split('/').slice(-2, -1)[0]; // Get ID before /verify

    // Start transaction for verification
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

      // Check if assessment is in verifiable state
      if (assessment.verificationStatus !== 'SUBMITTED') {
        throw new Error(
          `Cannot verify assessment with status: ${assessment.verificationStatus}`
        );
      }

      // Update assessment to verified status and publish it
      const updatedAssessment = await tx.rapidAssessment.update({
        where: { id: assessmentId },
        data: {
          verificationStatus: 'VERIFIED',
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
          action: 'ASSESSMENT_VERIFIED',
          resource: 'RapidAssessment',
          resourceId: assessmentId,
          newValues: {
            assessmentType: assessment.rapidAssessmentType,
            entityName: assessment.entity.name,
            verificationNotes: validatedData.notes,
            ...validatedData.metadata
          }
        }
      });

      return updatedAssessment;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Assessment verified successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Assessment verification error:', error);

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