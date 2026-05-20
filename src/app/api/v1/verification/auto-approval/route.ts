import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response'

interface AuthContext {
  roles: string[];
  user: {
    id: string;
    name?: string;
    email?: string;
  };
  userId: string;
}

interface EntityWithCounts {
  id: string;
  name: string;
  type: string;
  location: string | null;
  autoApproveEnabled: boolean;
  metadata: any;
  updatedAt: Date;
  _count: {
    rapidAssessments: number;
    responses: number;
  };
}

interface AutoApprovalMetadata {
  autoApproval?: {
    scope?: 'assessments' | 'responses' | 'both';
    assessmentTypes?: string[];
    responseTypes?: string[];
    maxPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiresDocumentation?: boolean;
    lastModifiedBy?: string;
    lastModifiedAt?: string;
  };
}

const bulkUpdateSchema = z.object({
  entityIds: z.array(z.string()),
  enabled: z.boolean(),
  scope: z.enum(['assessments', 'responses', 'both']).default('assessments'),
  conditions: z.object({
    assessmentTypes: z.array(z.string()).optional(),
    responseTypes: z.array(z.string()).optional(),
    maxPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    requiresDocumentation: z.boolean().optional(),
  }).optional(),
});

// GET - Get all auto-approval configurations
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { roles } = context;
    
    // Check if user has coordinator role
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const enabledOnly = searchParams.get('enabledOnly') === 'true';

    // Build where clause
    const whereClause: {
      isActive: boolean;
      type?: string;
      autoApproveEnabled?: boolean;
    } = {
      isActive: true
    };

    if (entityType) {
      whereClause.type = entityType as any;
    }

    if (enabledOnly) {
      whereClause.autoApproveEnabled = true;
    }

    // Get entities with auto-approval configurations
    const entities = await prisma.entity.findMany({
      where: whereClause as any,
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        autoApproveEnabled: true,
        metadata: true,
        updatedAt: true,
        _count: {
          select: {
            rapidAssessments: {
              where: {
                verificationStatus: 'AUTO_VERIFIED'
              }
            },
            responses: {
              where: {
                verificationStatus: 'AUTO_VERIFIED'
              }
            }
          }
        }
      },
      orderBy: [
        { autoApproveEnabled: 'desc' },
        { name: 'asc' }
      ]
    });

    // Format response with auto-approval configs
    const configurations = entities.map((entity: EntityWithCounts) => {
      const metadata = entity.metadata as AutoApprovalMetadata;
      const autoApprovalConfig = metadata?.autoApproval || {};
      
      return {
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.type,
        entityLocation: entity.location,
        enabled: entity.autoApproveEnabled,
        scope: autoApprovalConfig.scope || 'assessments',
        conditions: {
          assessmentTypes: autoApprovalConfig.assessmentTypes || [],
          responseTypes: autoApprovalConfig.responseTypes || [],
          maxPriority: autoApprovalConfig.maxPriority || 'MEDIUM',
          requiresDocumentation: autoApprovalConfig.requiresDocumentation || false,
        },
        lastModified: entity.updatedAt,
        stats: {
          autoVerifiedAssessments: entity._count.rapidAssessments,
          autoVerifiedResponses: entity._count.responses,
          totalAutoVerified: entity._count.rapidAssessments + entity._count.responses
        }
      };
    });

    // Calculate summary statistics
    const summary = {
      totalEntities: entities.length,
      enabledCount: entities.filter((e: EntityWithCounts) => e.autoApproveEnabled).length,
      disabledCount: entities.filter((e: EntityWithCounts) => !e.autoApproveEnabled).length,
      totalAutoVerifiedAssessments: entities.reduce((sum: number, e: EntityWithCounts) => sum + e._count.rapidAssessments, 0),
      totalAutoVerifiedResponses: entities.reduce((sum: number, e: EntityWithCounts) => sum + e._count.responses, 0),
      totalAutoVerified: entities.reduce((sum: number, e: EntityWithCounts) => sum + e._count.rapidAssessments + e._count.responses, 0)
    };

    return NextResponse.json({
      success: true,
      data: configurations,
      summary,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Get auto-approval configs error:', error);
    return handleApiError(error);
  }
});

// PUT - Bulk update auto-approval configurations
export const PUT = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { roles, user } = context;
    
    // Check if user has coordinator role
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }
    const body = await request.json();
    const validatedData = bulkUpdateSchema.parse(body);

    if (validatedData.entityIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one entity ID is required' },
        { status: 400 }
      );
    }

    // Start transaction for bulk auto-approval configuration update
    const result = await prisma.$transaction(async (tx) => {
      // Get entities to update
      const entities = await tx.entity.findMany({
        where: {
          id: { in: validatedData.entityIds },
          isActive: true
        }
      });

      if (entities.length === 0) {
        throw new Error('No valid entities found for update');
      }

      const updatedEntities = [];

      // Update each entity
      for (const entity of entities) {
        const currentMetadata = (entity.metadata as AutoApprovalMetadata) || {};
        
        // Update metadata with auto-approval conditions
        const updatedMetadata: AutoApprovalMetadata = {
          ...currentMetadata,
          autoApproval: {
            scope: validatedData.scope || 'assessments',
            assessmentTypes: validatedData.conditions?.assessmentTypes || [],
            responseTypes: validatedData.conditions?.responseTypes || [],
            maxPriority: validatedData.conditions?.maxPriority || 'MEDIUM',
            requiresDocumentation: validatedData.conditions?.requiresDocumentation || false,
            lastModifiedBy: user.id,
            lastModifiedAt: new Date().toISOString(),
          }
        };

        // Update entity
        const updatedEntity = await tx.entity.update({
          where: { id: entity.id },
          data: {
            autoApproveEnabled: validatedData.enabled,
            metadata: updatedMetadata as any
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

        updatedEntities.push(updatedEntity);

        // Create audit log entry for each entity
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'BULK_AUTO_APPROVAL_CONFIG_UPDATED',
            resource: 'Entity',
            resourceId: entity.id,
            newValues: {
              entityName: entity.name,
              previousEnabled: entity.autoApproveEnabled,
              newEnabled: validatedData.enabled,
              scope: validatedData.scope,
              conditions: validatedData.conditions,
              bulkUpdate: true,
              totalEntitiesUpdated: entities.length,
              configuredBy: user.name || user.id
            }
          }
        });
      }

      return updatedEntities;
    });

    // Format response
    const configurations = result.map((entity: any) => {
      const metadata = entity.metadata as AutoApprovalMetadata;
      const autoApprovalConfig = metadata?.autoApproval || {};
      
      return {
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.type,
        enabled: entity.autoApproveEnabled,
        scope: autoApprovalConfig.scope || 'assessments',
        conditions: autoApprovalConfig,
        lastModified: entity.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: configurations,
      message: `Auto-approval configuration updated for ${result.length} entities`,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID(),
        updatedCount: result.length
      }
    });

  } catch (error) {
    console.error('Bulk update auto-approval config error:', error);

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