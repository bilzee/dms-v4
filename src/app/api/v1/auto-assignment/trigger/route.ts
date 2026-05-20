import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { triggerAutoAssignment } from '@/lib/assignment/middleware';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

const triggerAutoAssignmentSchema = z.object({
  type: z.enum(['assessment', 'response', 'entity']),
  userId: z.string().cuid(),
  entityId: z.string().cuid(),
  userRole: z.enum(['ASSESSOR', 'RESPONDER']).optional(),
  assignedBy: z.string().cuid().optional()
});

export const POST = withAuth(async (request: NextRequest, context) => {
  const { user, roles } = context;
  
  if (!roles.includes('COORDINATOR')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Coordinator role required.' },
      { status: 403 }
    );
  }
  try {

    const body = await request.json();
    const validatedData = triggerAutoAssignmentSchema.parse(body);

    // Set assignedBy to current user if not provided
    const assignedBy = validatedData.assignedBy || (context.user as any).id;

    // Trigger auto-assignment
    const success = await triggerAutoAssignment(validatedData.type, {
      userId: validatedData.userId,
      entityId: validatedData.entityId,
      userRole: validatedData.userRole,
      assignedBy
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Auto-assignment triggered successfully for ${validatedData.type}`,
        data: {
          type: validatedData.type,
          userId: validatedData.userId,
          entityId: validatedData.entityId,
          assignedBy
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Auto-assignment failed. Check configuration and entity/user validity.' },
        { status: 400 }
      );
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error triggering auto-assignment:', error);
    return handleApiError(error);
  }
});