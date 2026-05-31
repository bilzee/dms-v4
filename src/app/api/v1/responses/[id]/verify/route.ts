import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { createAuditLog } from '@/lib/utils/audit-logger';
import { handleApiError } from '@/lib/api/response'

// Validation schema for response verification
const VerifyResponseSchema = z.object({
  notes: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest, context, { params }) => {
  try {
    const { roles } = context;
    
    // Check coordinator permissions
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const validatedData = VerifyResponseSchema.parse(body);
    
    // Get user ID from auth context (you may need to adjust this based on your auth setup)
    const userId = (request as any).user?.id || 'system';

    // Find the response
    const response = await prisma.rapidResponse.findUnique({
      where: { id },
      include: {
        entity: {
          select: { id: true, name: true, type: true }
        },
        planCommitments: {
          select: { commitment: { select: { id: true, totalCommittedQuantity: true, items: true, donor: { select: { id: true, name: true, contactEmail: true } } } } }
        }
      }
    });

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Response not found' },
        { status: 404 }
      );
    }

    // Check if response is in a verifiable state
    if (response.verificationStatus !== 'SUBMITTED') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Response cannot be verified. Current status: ${response.verificationStatus}` 
        },
        { status: 400 }
      );
    }

    // Update response verification status
    const updatedResponse = await prisma.rapidResponse.update({
      where: { id },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: userId,
        updatedAt: new Date()
      },
      include: {
        entity: {
          select: { id: true, name: true, type: true }
        },
        planCommitments: {
          select: { commitment: { select: { id: true, totalCommittedQuantity: true, items: true, donor: { select: { id: true, name: true, contactEmail: true } } } } }
        }
      }
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: 'VERIFY_RESPONSE',
      resource: 'RapidResponse',
      resourceId: id,
      oldValues: { verificationStatus: response.verificationStatus },
      newValues: { verificationStatus: 'VERIFIED', verifiedAt: new Date() }
    });

    try {
      const { ActionSignalService } = await import('@/lib/services/action-signal.service');
      await ActionSignalService.evaluateAndGenerate({
        trigger: 'response-verified',
        entityId: response.entityId,
        incidentId: (response as any).incidentId,
        responseId: id,
        responseType: response.type,
        responsePriority: response.priority,
      });
    } catch (e) {
      console.error('[ResponseVerify] signal hook error:', e);
    }

    return NextResponse.json({
      success: true,
      data: updatedResponse,
      message: 'Response verified successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Response verification error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return handleApiError(error);
  }
});