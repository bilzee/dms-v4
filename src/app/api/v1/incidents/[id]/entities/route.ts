import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getIncidentEntities, calculateRelationshipStatistics } from '@/lib/services/assessment-relationships.service';
import type { RelationshipQueryParams } from '@/types/assessment-relationships';
import { z } from 'zod';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

interface RouteParams {
  params: { id: string }
}

const QueryParamsSchema = z.object({
  priorityFilter: z.string().nullable(),
  assessmentTypeFilter: z.string().nullable(),
  verificationStatusFilter: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  limit: z.string().nullable(),
  offset: z.string().nullable(),
});

export const GET = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  try {
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
    }

    const incidentId = params.id;
    const { searchParams } = new URL(request.url);

    const rawParams = {
      priorityFilter: searchParams.get('priorityFilter'),
      assessmentTypeFilter: searchParams.get('assessmentTypeFilter'),
      verificationStatusFilter: searchParams.get('verificationStatusFilter'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const queryResult = QueryParamsSchema.safeParse(rawParams);

    if (!queryResult.success) {
      return errorResponse('Invalid query parameters', 400, queryResult.error.issues);
    }

    const validatedData = queryResult.data;

    const queryParams: RelationshipQueryParams = {
      incidentId,
      ...(validatedData.priorityFilter && validatedData.priorityFilter !== null && {
        priorityFilter: validatedData.priorityFilter.split(',').filter(Boolean) as any[]
      }),
      ...(validatedData.assessmentTypeFilter && validatedData.assessmentTypeFilter !== null && {
        assessmentTypeFilter: validatedData.assessmentTypeFilter.split(',').filter(Boolean) as any[]
      }),
      ...(validatedData.verificationStatusFilter && validatedData.verificationStatusFilter !== null && {
        verificationStatusFilter: validatedData.verificationStatusFilter.split(',').filter(Boolean) as any[]
      }),
      ...(validatedData.startDate && validatedData.startDate !== null && { startDate: new Date(validatedData.startDate) }),
      ...(validatedData.endDate && validatedData.endDate !== null && { endDate: new Date(validatedData.endDate) }),
      ...(validatedData.limit && validatedData.limit !== null && { limit: parseInt(validatedData.limit) }),
      ...(validatedData.offset && validatedData.offset !== null && { offset: parseInt(validatedData.offset) }),
    };

    queryParams.limit = queryParams.limit || 100;
    queryParams.offset = queryParams.offset || 0;

    const [entities, statistics] = await Promise.all([
      getIncidentEntities(incidentId, queryParams),
      calculateRelationshipStatistics(queryParams),
    ]);

    return successResponse({
      entities,
      statistics,
      pagination: {
        limit: queryParams.limit,
        offset: queryParams.offset,
        total: entities.length,
      },
    });

  } catch (error) {
    return handleApiError(error);
  }
});
