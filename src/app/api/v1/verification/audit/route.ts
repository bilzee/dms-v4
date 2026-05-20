import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response'

const auditFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

const ITEMS_PER_PAGE = 50;

// GET - Get audit log entries with filtering
export const GET = withAuth(async (request: NextRequest, context) => {
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
    const params = Object.fromEntries(searchParams.entries());
    const validatedParams = auditFiltersSchema.parse(params);

    const page = parseInt(validatedParams.page || '1');
    const pageSize = Math.min(parseInt(validatedParams.pageSize || ITEMS_PER_PAGE.toString()), 100);
    const skip = (page - 1) * pageSize;

    // Build where clause
    const whereClause: any = {};

    // Date filtering
    if (validatedParams.startDate) {
      whereClause.timestamp = {
        gte: new Date(validatedParams.startDate)
      };
    }

    if (validatedParams.endDate) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        lte: new Date(validatedParams.endDate)
      };
    }

    // Action filtering
    if (validatedParams.action && validatedParams.action !== 'all') {
      whereClause.action = validatedParams.action;
    }

    // User filtering
    if (validatedParams.userId && validatedParams.userId !== 'all') {
      whereClause.userId = validatedParams.userId;
    }

    // Resource filtering
    if (validatedParams.resource && validatedParams.resource !== 'all') {
      whereClause.resource = validatedParams.resource;
    }

    // Resource ID filtering (for entity-specific audit trails)
    if (validatedParams.resourceId) {
      whereClause.resourceId = validatedParams.resourceId;
    }

    // Search filtering
    if (validatedParams.search) {
      whereClause.OR = [
        { action: { contains: validatedParams.search, mode: 'insensitive' } },
        { resource: { contains: validatedParams.search, mode: 'insensitive' } },
        { resourceId: { contains: validatedParams.search, mode: 'insensitive' } },
        { user: { name: { contains: validatedParams.search, mode: 'insensitive' } } }
      ];
    }

    // Filter for auto-approval related actions only
    const autoApprovalActions = [
      'ENTITY_AUTO_APPROVAL_ENABLED',
      'ENTITY_AUTO_APPROVAL_DISABLED', 
      'AUTO_APPROVAL_CONFIG_UPDATED',
      'BULK_AUTO_APPROVAL_CONFIG_UPDATED',
      'GLOBAL_AUTO_APPROVAL_SETTINGS_UPDATED'
    ];

    whereClause.action = {
      in: autoApprovalActions
    };

    // Get total count
    const totalCount = await prisma.auditLog.count({ where: whereClause });

    // Get audit entries with user information
    const auditEntries = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: pageSize
    });

    // Format response data
    const formattedEntries = auditEntries.map(entry => ({
      id: entry.id,
      userId: entry.userId || 'system',
      userName: entry.user?.name || 'System User',
      userRole: 'UNKNOWN', // Role would require additional query to roles relation
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId || '',
      resourceName: extractResourceName(entry.newValues, entry.oldValues, entry.resource),
      oldValues: entry.oldValues || {},
      newValues: entry.newValues || {},
      timestamp: entry.timestamp.toISOString(),
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: extractMetadata(entry.newValues)
    }));

    // Calculate summary statistics
    const uniqueUsers = await prisma.auditLog.findMany({
      where: whereClause,
      select: { userId: true },
      distinct: ['userId']
    });

    const bulkOperations = await prisma.auditLog.count({
      where: {
        ...whereClause,
        action: { contains: 'BULK' }
      }
    });

    const summary = {
      totalEntries: totalCount,
      uniqueUsers: uniqueUsers.length,
      configurationChanges: totalCount - bulkOperations,
      bulkOperations
    };

    return NextResponse.json({
      success: true,
      data: formattedEntries,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      },
      summary,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Get audit history error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid filter parameters',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    return handleApiError(error);
  }
});

// Helper function to extract resource name from audit data
function extractResourceName(newValues: any, oldValues: any, resource: string): string {
  const values = newValues || oldValues || {};
  
  if (resource === 'Entity') {
    return values.entityName || values.name || 'Unknown Entity';
  }
  
  if (resource === 'GlobalSettings') {
    return 'Global Auto-Approval Settings';
  }
  
  if (resource === 'AutoApproval') {
    return values.entityName || 'Auto-Approval Configuration';
  }
  
  return resource;
}

// Helper function to extract metadata from audit values
function extractMetadata(values: any): any {
  if (!values) return undefined;
  
  return {
    bulkUpdate: values.bulkUpdate || false,
    entitiesAffected: values.totalEntitiesUpdated || values.entitiesAffected,
    configurationScope: values.scope,
    reason: values.reason
  };
}