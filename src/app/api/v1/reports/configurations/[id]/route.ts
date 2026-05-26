/**
 * Report Configuration Single Item API Routes
 * GET /api/v1/reports/configurations/[id] - Get single configuration
 * PATCH /api/v1/reports/configurations/[id] - Update configuration
 * DELETE /api/v1/reports/configurations/[id] - Delete configuration
 * POST /api/v1/reports/configurations/[id]/duplicate - Duplicate configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { createApiResponse } from '@/types/api';
import { handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const configuration = await prisma.reportConfiguration.findFirst({
      where: {
        id: params.id,
        createdBy: context.userId
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            layout: true,
            isPublic: true,
            createdById: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        executions: {
          select: {
            id: true,
            status: true,
            format: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            executions: true
          }
        }
      }
    });

    if (!configuration) {
      return NextResponse.json(
        createApiResponse(false, null, 'Configuration not found or access denied'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createApiResponse(true, configuration, 'Configuration retrieved successfully'),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
});

export const PATCH = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const existing = await prisma.reportConfiguration.findFirst({
      where: {
        id: params.id,
        createdBy: context.userId
      }
    });

    if (!existing) {
      return NextResponse.json(
        createApiResponse(false, null, 'Configuration not found or access denied'),
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, any> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.filters !== undefined) updateData.filters = body.filters;
    if (body.aggregations !== undefined) updateData.aggregations = body.aggregations;
    if (body.visualizations !== undefined) updateData.visualizations = body.visualizations;
    if (body.schedule !== undefined) updateData.schedule = body.schedule;
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
    if (body.options !== undefined) updateData.options = body.options;

    const configuration = await prisma.reportConfiguration.update({
      where: { id: params.id },
      data: updateData,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true,
            isPublic: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        action: 'UPDATE_REPORT_CONFIGURATION',
        resource: 'ReportConfiguration',
        resourceId: params.id,
        newValues: updateData,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent')
      }
    });

    return NextResponse.json(
      createApiResponse(true, configuration, 'Configuration updated successfully'),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const existing = await prisma.reportConfiguration.findFirst({
      where: {
        id: params.id,
        createdBy: context.userId
      }
    });

    if (!existing) {
      return NextResponse.json(
        createApiResponse(false, null, 'Configuration not found or access denied'),
        { status: 404 }
      );
    }

    await prisma.reportExecution.deleteMany({
      where: { configurationId: params.id }
    });

    await prisma.reportConfiguration.delete({
      where: { id: params.id }
    });

    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        action: 'DELETE_REPORT_CONFIGURATION',
        resource: 'ReportConfiguration',
        resourceId: params.id,
        oldValues: { name: existing.name, templateId: existing.templateId },
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent')
      }
    });

    return NextResponse.json(
      createApiResponse(true, null, 'Configuration deleted successfully'),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const existing = await prisma.reportConfiguration.findFirst({
      where: {
        id: params.id,
        OR: [
          { createdBy: context.userId },
          { template: { isPublic: true } }
        ]
      }
    });

    if (!existing) {
      return NextResponse.json(
        createApiResponse(false, null, 'Configuration not found or access denied'),
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'duplicate') {
      const duplicated = await prisma.reportConfiguration.create({
        data: {
          templateId: existing.templateId,
          name: `${existing.name} (Copy)`,
          filters: existing.filters,
          aggregations: existing.aggregations,
          visualizations: existing.visualizations,
          schedule: existing.schedule,
          options: existing.options,
          createdBy: context.userId
        },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              type: true,
              isPublic: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: context.userId,
          action: 'DUPLICATE_REPORT_CONFIGURATION',
          resource: 'ReportConfiguration',
          resourceId: duplicated.id,
          newValues: { sourceId: params.id, name: duplicated.name },
          ipAddress: request.ip,
          userAgent: request.headers.get('user-agent')
        }
      });

      return NextResponse.json(
        createApiResponse(true, duplicated, 'Configuration duplicated successfully'),
        { status: 201 }
      );
    }

    return NextResponse.json(
      createApiResponse(false, null, 'Unknown action. Use ?action=duplicate'),
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
});
