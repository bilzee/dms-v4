import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response'

const updateAutoApprovalSchema = z.object({
  enabled: z.boolean(),
  conditions: z.object({
    assessmentTypes: z.array(z.string()).optional(),
    maxPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    requiresDocumentation: z.boolean().optional(),
  }).optional(),
});

interface RouteParams {
  params: { id: string }
}

// GET - Get auto-approval configuration for entity
export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) => {
  try {
    const { roles } = context;
    
    // Check if user has coordinator role
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }

    const entityId = params.id;

    // Get entity with auto-approval configuration
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        name: true,
        type: true,
        autoApproveEnabled: true,
        metadata: true,
        updatedAt: true
      }
    });

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      );
    }

    // Get auto-approval conditions from metadata
    const conditions = entity.metadata as any;
    
    const config = {
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      enabled: entity.autoApproveEnabled,
      conditions: {
        assessmentTypes: conditions?.autoApproval?.assessmentTypes || [],
        maxPriority: conditions?.autoApproval?.maxPriority || 'MEDIUM',
        requiresDocumentation: conditions?.autoApproval?.requiresDocumentation || false,
      },
      lastModified: entity.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: config,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Get auto-approval config error:', error);
    return handleApiError(error);
  }
});

// PUT - Update auto-approval configuration for entity
export const PUT = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) => {
  try {
    const { roles, userId } = context;
    
    // Check if user has coordinator role
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateAutoApprovalSchema.parse(body);
    const entityId = params.id;

    // Start transaction for auto-approval configuration update
    const result = await prisma.$transaction(async (tx: any) => {
      // Check if entity exists
      const entity = await tx.entity.findUnique({
        where: { id: entityId }
      });

      if (!entity) {
        throw new Error('Entity not found');
      }

      // Get current metadata or initialize empty object
      const currentMetadata = (entity.metadata as any) || {};
      
      // Update metadata with auto-approval conditions
      const updatedMetadata = {
        ...currentMetadata,
        autoApproval: {
          assessmentTypes: validatedData.conditions?.assessmentTypes || [],
          maxPriority: validatedData.conditions?.maxPriority || 'MEDIUM',
          requiresDocumentation: validatedData.conditions?.requiresDocumentation || false,
          lastModifiedBy: userId,
          lastModifiedAt: new Date().toISOString(),
        }
      };

      // Update entity with new auto-approval settings
      const updatedEntity = await tx.entity.update({
        where: { id: entityId },
        data: {
          autoApproveEnabled: validatedData.enabled,
          metadata: updatedMetadata
        },
        select: {
          id: true,
          name: true,
          type: true,
          autoApproveEnabled: true,
          metadata: true,
          updatedAt: true
        }
      });

      // TODO: Add audit log entry when AuditLog schema is properly defined

      return updatedEntity;
    });

    const config = {
      entityId: result.id,
      entityName: result.name,
      entityType: result.type,
      enabled: result.autoApproveEnabled,
      conditions: (result.metadata as any)?.autoApproval || {},
      lastModified: result.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: config,
      message: 'Auto-approval configuration updated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Update auto-approval config error:', error);

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