/**
 * Individual Report Template API Routes
 * GET - Get specific report template
 * PATCH - Update report template
 * DELETE - Delete report template
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { ReportTemplateEngine } from '@/lib/reports/template-engine';
import { createApiResponse } from '@/types/api';

// Validation schemas
const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['ASSESSMENT', 'RESPONSE', 'ENTITY', 'DONOR', 'CUSTOM']).optional(),
  layout: z.array(z.any()).min(1).optional(),
  isPublic: z.boolean().optional()
});

/**
 * GET /api/v1/reports/templates/[id]
 * Get specific report template with preview data
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const templateId = params.id;

    if (templateId.startsWith('default_')) {
      const defaultTemplateName = templateId.replace('default_', '').replace(/_/g, ' ');
      const defaultTemplate = await import('@/lib/reports/template-engine')
        .then(module => module.DEFAULT_TEMPLATES)
        .then(templates => 
          templates.find(t => 
            t.name?.toLowerCase() === defaultTemplateName.toLowerCase()
          )
        );

      if (!defaultTemplate) {
        return NextResponse.json(
          createApiResponse(false, null, 'Default template not found'),
          { status: 404 }
        );
      }

      const preview = ReportTemplateEngine.renderTemplatePreview(defaultTemplate);
      const mockData = {};

      return NextResponse.json(
        createApiResponse(true, {
          ...defaultTemplate,
          id: templateId,
          preview,
          mockData,
          isDefault: true
        }, 'Default template retrieved successfully'),
        { status: 200 }
      );
    }

    const template = await db.reportTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { createdById: context.userId },
          { isPublic: true }
        ]
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            configurations: true
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json(
        createApiResponse(false, null, 'Template not found or access denied'),
        { status: 404 }
      );
    }

    const preview = ReportTemplateEngine.renderTemplatePreview(template as any);

    return NextResponse.json(
      createApiResponse(true, {
        ...template,
        preview
      }, 'Template retrieved successfully'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error getting report template:', error);
    return NextResponse.json(
      createApiResponse(false, null, 'Failed to retrieve report template'),
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/v1/reports/templates/[id]
 * Update specific report template
 */
export const PATCH = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const templateId = params.id;

    if (templateId.startsWith('default_')) {
      return NextResponse.json(
        createApiResponse(false, null, 'Default templates cannot be modified'),
        { status: 403 }
      );
    }

    const existingTemplate = await db.reportTemplate.findFirst({
      where: {
        id: templateId,
        createdById: context.userId
      }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        createApiResponse(false, null, 'Template not found or access denied'),
        { status: 404 }
      );
    }

    const hasPermission = context.permissions.includes('REPORT_UPDATE') ||
                          context.permissions.includes('ADMIN');

    if (!hasPermission) {
      return NextResponse.json(
        createApiResponse(false, null, 'Insufficient permissions to update report templates'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateTemplateSchema.parse(body);

    if (validatedData.layout) {
      const updatedTemplate = {
        ...existingTemplate,
        ...validatedData
      };

      const templateValidation = ReportTemplateEngine.validateTemplate(updatedTemplate as any);
      if (!templateValidation.valid) {
        return NextResponse.json(
          createApiResponse(false, null, 'Template validation failed', templateValidation.errors),
          { status: 400 }
        );
      }
    }

    const updatedTemplate = await db.reportTemplate.update({
      where: { id: templateId },
      data: validatedData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            configurations: true
          }
        }
      }
    });

    return NextResponse.json(
      createApiResponse(true, updatedTemplate, 'Report template updated successfully'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating report template:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiResponse(false, null, 'Invalid request data', error.errors.map(e => e.message)),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createApiResponse(false, null, 'Failed to update report template'),
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/v1/reports/templates/[id]
 * Delete specific report template
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const templateId = params.id;

    if (templateId.startsWith('default_')) {
      return NextResponse.json(
        createApiResponse(false, null, 'Default templates cannot be deleted'),
        { status: 403 }
      );
    }

    const existingTemplate = await db.reportTemplate.findFirst({
      where: {
        id: templateId,
        createdById: context.userId
      }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        createApiResponse(false, null, 'Template not found or access denied'),
        { status: 404 }
      );
    }

    const hasPermission = context.permissions.includes('REPORT_DELETE') ||
                          context.permissions.includes('ADMIN');

    if (!hasPermission) {
      return NextResponse.json(
        createApiResponse(false, null, 'Insufficient permissions to delete report templates'),
        { status: 403 }
      );
    }

    const configurationsCount = await db.reportConfiguration.count({
      where: { templateId }
    });

    if (configurationsCount > 0) {
      return NextResponse.json(
        createApiResponse(false, null, `Cannot delete template with existing configurations. Count: ${configurationsCount}`),
        { status: 409 }
      );
    }

    await db.reportTemplate.delete({
      where: { id: templateId }
    });

    return NextResponse.json(
      createApiResponse(true, null, 'Report template deleted successfully'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting report template:', error);
    return NextResponse.json(
      createApiResponse(false, null, 'Failed to delete report template'),
      { status: 500 }
    );
  }
});
