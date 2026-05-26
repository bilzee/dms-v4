/**
 * Report Template API Routes
 * GET - List available report templates
 * POST - Create new report template
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { ReportTemplateEngine, DEFAULT_TEMPLATES } from '@/lib/reports/template-engine';
import { createApiResponse } from '@/types/api';
import { handleApiError } from '@/lib/api/response'

// Validation schemas
const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  type: z.enum(['ASSESSMENT', 'RESPONSE', 'ENTITY', 'DONOR', 'CUSTOM']),
  layout: z.array(z.any()).min(1, 'Template must have at least one layout element'),
  isPublic: z.boolean().default(false)
});

const ListTemplatesSchema = z.object({
  type: z.enum(['ASSESSMENT', 'RESPONSE', 'ENTITY', 'DONOR', 'CUSTOM']).optional(),
  public: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

/**
 * GET /api/v1/reports/templates
 * List available report templates with filtering and pagination
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const params = ListTemplatesSchema.parse({
      type: searchParams.get('type') || undefined,
      public: searchParams.get('public') === 'true' ? true : searchParams.get('public') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    });

    const skip = (params.page - 1) * params.limit;

    // Build where clause
    const where: any = {};
    
    if (params.type) {
      where.type = params.type;
    }
    
    if (params.public !== undefined) {
      if (params.public) {
        where.isPublic = true;
      } else {
        where.OR = [
          { createdById: context.userId },
          { isPublic: true }
        ];
      }
    } else {
      where.OR = [
        { createdById: context.userId },
        { isPublic: true }
      ];
    }
    
    if (params.search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const total = await prisma.reportTemplate.count({ where });

    const templates = await prisma.reportTemplate.findMany({
      where,
      skip,
      take: params.limit,
      orderBy: [
        { isPublic: 'desc' },
        { updatedAt: 'desc' }
      ],
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

    let defaultTemplates: any[] = [];
    if (params.page === 1 && !params.search) {
      const applicableDefaults = DEFAULT_TEMPLATES.filter(template => 
        !params.type || template.type === params.type
      );
      
      defaultTemplates = applicableDefaults.map(template => ({
        ...template,
        id: `default_${template.name?.toLowerCase().replace(/\s+/g, '_')}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'system',
          name: 'System',
          email: 'system@disaster-management.com'
        },
        _count: {
          configurations: 0
        }
      }));
    }

    const allTemplates = [...defaultTemplates, ...templates];

    return NextResponse.json(
      createApiResponse(true, {
        templates: allTemplates,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          pages: Math.ceil(total / params.limit)
        }
      }, 'Report templates retrieved successfully'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error listing report templates:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiResponse(false, null, 'Invalid request parameters', error.errors.map(e => e.message)),
        { status: 400 }
      );
    }
    return handleApiError(error)
  }
});

/**
 * POST /api/v1/reports/templates
 * Create a new report template
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const allowedRoles = ['ADMIN', 'COORDINATOR'];
    if (!context.roles.some(role => allowedRoles.includes(role))) {
      return NextResponse.json(
        createApiResponse(false, null, 'Insufficient permissions to create report templates'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = CreateTemplateSchema.parse(body);

    const templateValidation = ReportTemplateEngine.validateTemplate(validatedData);
    if (!templateValidation.valid) {
      return NextResponse.json(
        createApiResponse(false, null, 'Template validation failed', templateValidation.errors),
        { status: 400 }
      );
    }

    const template = await prisma.reportTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        layout: validatedData.layout,
        isPublic: validatedData.isPublic,
        createdById: context.userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(
      createApiResponse(true, template, 'Report template created successfully'),
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating report template:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiResponse(false, null, 'Invalid request data', error.errors.map(e => e.message)),
        { status: 400 }
      );
    }
    return handleApiError(error)
  }
});
