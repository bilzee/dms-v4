import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { auditLog } from '@/lib/services/audit.service';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR')) {
      await auditLog({
        userId: context.userId,
        action: 'UNAUTHORIZED_ACCESS',
        resource: 'RESOURCE_MANAGEMENT_COMMITMENTS',
        oldValues: null,
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });

      return errorResponse('Forbidden - COORDINATOR access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const donorId = searchParams.get('donorId');
    const entityId = searchParams.get('entityId');
    const incidentId = searchParams.get('incidentId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause: any = {};
    if (status && status !== 'all') whereClause.status = status;
    if (donorId && donorId !== 'all') whereClause.donorId = donorId;
    if (entityId && entityId !== 'all') whereClause.entityId = entityId;
    if (incidentId && incidentId !== 'all') whereClause.incidentId = incidentId;

    if (search) {
      whereClause.OR = [
        { donor: { name: { contains: search, mode: 'insensitive' } } },
        { entity: { name: { contains: search, mode: 'insensitive' } } },
        { incident: { type: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const total = await prisma.donorCommitment.count({ where: whereClause });

    const commitments = await prisma.donorCommitment.findMany({
      where: whereClause,
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            type: true,
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
            severity: true,
            location: true
          }
        }
      },
      orderBy: {
        lastUpdated: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };

    await auditLog({
      userId: context.userId,
      action: 'ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS',
      resource: 'RESOURCE_MANAGEMENT_COMMITMENTS',
      oldValues: null,
      newValues: {
        filters: { status, donorId, entityId, incidentId, search },
        pagination: { page, limit, total }
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return successResponse({
      data: commitments,
      pagination
    });

  } catch (error) {
    console.error('Error fetching resource management commitments:', error);

    try {
      await auditLog({
        userId: context.userId,
        action: 'ERROR_ACCESS_COMMITMENTS',
        resource: 'RESOURCE_MANAGEMENT_COMMITMENTS',
        oldValues: null,
        newValues: { error: error instanceof Error ? error.message : 'Unknown error' },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });
    } catch (auditError) {
      // Ignore audit log errors
    }

    return handleApiError(error);
  }
});
