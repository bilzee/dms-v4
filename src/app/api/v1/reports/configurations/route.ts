/**
 * Report Configuration Management API Routes
 * POST - Create new report configuration
 * GET - List report configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { DataAggregator, ReportFilters, AggregationConfig, FilterConfig, ReportFiltersSchema, AggregationConfigSchema } from '@/lib/reports/data-aggregator';
import { ReportTemplateEngine, ReportTemplate, DEFAULT_TEMPLATES } from '@/lib/reports/template-engine';
import { createApiResponse } from '@/types/api';
import { handleApiError } from '@/lib/api/response'

// Validation schemas
const CreateConfigurationSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  name: z.string().min(1, 'Configuration name is required'),
  filters: ReportFiltersSchema,
  aggregations: z.array(AggregationConfigSchema).default([]),
  visualizations: z.array(z.object({
    id: z.string(),
    type: z.enum(['chart', 'table', 'map', 'kpi']),
    title: z.string(),
    dataSource: z.string(),
    aggregation: z.string().optional(),
    config: z.record(z.any()),
    position: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    })
  })).default([]),
  schedule: z.object({
    frequency: z.enum(['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    times: z.array(z.string()).optional(),
    daysOfWeek: z.array(z.number().min(1).max(7)).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    timezone: z.string().default('UTC'),
    enabled: z.boolean().default(true)
  }).optional()
});

const UpdateConfigurationSchema = z.object({
  name: z.string().min(1).optional(),
  filters: ReportFiltersSchema.optional(),
  aggregations: z.array(AggregationConfigSchema).optional(),
  visualizations: z.array(z.any()).optional(),
  schedule: z.any().optional(),
  isPublic: z.boolean().optional(),
  options: z.any().optional()
});

const ListConfigurationsSchema = z.object({
  templateId: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

/**
 * POST /api/v1/reports/configurations
 * Create new report configuration
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const startTime = Date.now();

  try {
    // Check user permissions
    const allowedRoles = ['ADMIN', 'COORDINATOR'];
    if (!context.roles.some(role => allowedRoles.includes(role))) {
      return NextResponse.json(
        createApiResponse(false, null, 'Insufficient permissions to create report configurations'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = CreateConfigurationSchema.parse(body);

    let template: any;
    let templateType: string;

    if (validatedData.templateId.startsWith('default_')) {
      const defaultTemplate = DEFAULT_TEMPLATES.find(t =>
        `default_${t.name?.toLowerCase().replace(/\s+/g, '_')}` === validatedData.templateId
      );
      if (!defaultTemplate) {
        return NextResponse.json(
          createApiResponse(false, null, 'Default template not found'),
          { status: 404 }
        );
      }
      template = {
        id: validatedData.templateId,
        type: defaultTemplate.type,
        name: defaultTemplate.name,
        isPublic: true,
        layout: defaultTemplate.layout,
        createdBy: { id: 'system', name: 'System', email: 'system@disaster-management.com' }
      };
      templateType = defaultTemplate.type || 'ASSESSMENT';
    } else {
      template = await prisma.reportTemplate.findFirst({
        where: {
          id: validatedData.templateId,
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
          }
        }
      });

      if (!template) {
        return NextResponse.json(
          createApiResponse(false, null, 'Report template not found or access denied'),
          { status: 404 }
        );
      }
      templateType = template.type;
    }

    if (validatedData.filters) {
      const dataSourceType = templateType === 'ASSESSMENT' ? 'assessments' :
                           templateType === 'RESPONSE' ? 'responses' :
                           templateType === 'ENTITY' ? 'entities' :
                           templateType === 'DONOR' ? 'donors' : 'assessments';
      
      const availableFields = DataAggregator.getAvailableFields(dataSourceType as any);
      
      // Validate filter fields exist
      const invalidFilters = validatedData.filters.filters.filter(filter => 
        !availableFields.some(field => field.field === filter.field)
      );

      if (invalidFilters.length > 0) {
        return NextResponse.json(
          createApiResponse(false, null, 'Invalid filter fields', 
            invalidFilters.map(f => f.field)
          ),
          { status: 400 }
        );
      }
    }

    // Validate visualization data sources
    const invalidVisualizations = validatedData.visualizations.filter(viz => {
      const requiredDataSources = [...new Set(validatedData.visualizations.map(v => v.dataSource))];
      return !requiredDataSources.includes(viz.dataSource);
    });

    if (invalidVisualizations.length > 0) {
      return NextResponse.json(
        createApiResponse(false, null, 'Invalid visualization data sources',
          invalidVisualizations.map(v => v.dataSource)
        ),
        { status: 400 }
      );
    }

    let resolvedTemplateId = validatedData.templateId;

    if (validatedData.templateId.startsWith('default_')) {
      const existingTemplate = await prisma.reportTemplate.findFirst({
        where: { id: validatedData.templateId }
      });
      if (!existingTemplate) {
        const created = await prisma.reportTemplate.create({
          data: {
            id: validatedData.templateId,
            name: template.name || 'Default Template',
            description: (template as any).description || '',
            type: templateType as any,
            layout: template.layout || [],
            isPublic: true,
            createdById: context.userId
          }
        });
        resolvedTemplateId = created.id;
      }
    }

    // Create report configuration
    const configuration = await prisma.reportConfiguration.create({
      data: {
        templateId: resolvedTemplateId,
        name: validatedData.name,
        filters: validatedData.filters,
        aggregations: validatedData.aggregations,
        visualizations: validatedData.visualizations,
        schedule: validatedData.schedule,
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
        },
        _count: {
          select: {
            executions: true
          }
        }
      }
    });

    // Log configuration creation
    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        action: 'CREATE_REPORT_CONFIGURATION',
        resource: 'ReportConfiguration',
        resourceId: configuration.id,
        newValues: {
          templateId: validatedData.templateId,
          name: validatedData.name
        },
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent')
      }
    });

    return NextResponse.json(
      createApiResponse(true, configuration, 'Report configuration created successfully'),
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating report configuration:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiResponse(false, null, 'Invalid request data', error.errors.map(e => e.message)),
        { status: 400 }
      );
    }
    return handleApiError(error)
  }
});

/**
 * GET /api/v1/reports/configurations
 * List user's report configurations
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {

    const { searchParams } = new URL(request.url);
    const params = ListConfigurationsSchema.parse({
      templateId: searchParams.get('templateId') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    });

    const skip = (params.page - 1) * params.limit;

    // Build where clause
    const where: any = {};
    
    if (params.templateId) {
      where.templateId = params.templateId;
    }
    
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }
    
    where.createdBy = context.userId;

    // Get configurations
    const [configurations, total] = await Promise.all([
      prisma.reportConfiguration.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: [
          { createdAt: 'desc' }, // Most recent first
          { name: 'asc' } // Then by name
        ],
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
          },
          executions: {
            select: {
              id: true,
              status: true,
              format: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 5 // Last 5 executions
          },
          _count: {
            select: {
              executions: true
            }
          }
        }
      }),
      prisma.reportConfiguration.count({ where })
    ]);

    // Get most recent execution status for each configuration
    const configurationsWithStatus = configurations.map(config => {
      const latestExecution = config.executions?.[0];
      return {
        ...config,
        latestExecution: latestExecution || null,
        latestExecutionStatus: latestExecution?.status,
        latestExecutionDate: latestExecution?.createdAt,
        executionInProgress: latestExecution?.status === 'PENDING' || latestExecution?.status === 'RUNNING'
      };
    });

    return NextResponse.json(
      createApiResponse(true, {
        configurations: configurationsWithStatus,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          pages: Math.ceil(total / params.limit)
        }
      }, 'Report configurations retrieved successfully'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error listing report configurations:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiResponse(false, null, 'Invalid request parameters', error.errors.map(e => e.message)),
        { status: 400 }
      );
    }
    return handleApiError(error)
  }
});