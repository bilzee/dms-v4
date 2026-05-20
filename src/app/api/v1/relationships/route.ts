/**
 * API Route: GET /api/v1/relationships
 * 
 * Provides comprehensive entity-incident relationship data through assessments.
 * Returns detailed relationship mappings for visualization components including
 * geographic coordinates, assessment history, and priority distributions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getEntityIncidentRelationships } from '@/lib/services/assessment-relationships.service';
import type { RelationshipQueryParams } from '@/types/assessment-relationships';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

// Request validation schema - handles null from searchParams.get()
const QueryParamsSchema = z.object({
  incidentId: z.string().nullable(),
  entityId: z.string().nullable(),
  priorityFilter: z.string().nullable(),
  assessmentTypeFilter: z.string().nullable(),
  verificationStatusFilter: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  limit: z.string().nullable(),
  offset: z.string().nullable(),
});

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    // Authorization check - only coordinators and admins can access relationships
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator or Admin role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Get query parameters  
    const rawParams = {
      incidentId: searchParams.get('incidentId'),
      entityId: searchParams.get('entityId'),
      priorityFilter: searchParams.get('priorityFilter'),
      assessmentTypeFilter: searchParams.get('assessmentTypeFilter'),
      verificationStatusFilter: searchParams.get('verificationStatusFilter'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    // Validate query parameters
    const queryResult = QueryParamsSchema.safeParse(rawParams);

    if (!queryResult.success) {
      console.error('Relationships query validation failed:', queryResult.error.issues);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters',
          details: queryResult.error.issues
        },
        { status: 400 }
      );
    }

    const validatedData = queryResult.data;

    // Transform validated data to RelationshipQueryParams
    const queryParams: RelationshipQueryParams = {
      ...(validatedData.incidentId && validatedData.incidentId !== null && { incidentId: validatedData.incidentId }),
      ...(validatedData.entityId && validatedData.entityId !== null && { entityId: validatedData.entityId }),
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

    // Set defaults for pagination
    queryParams.limit = queryParams.limit || 100;
    queryParams.offset = queryParams.offset || 0;

    // Get comprehensive relationship data
    const relationships = await getEntityIncidentRelationships(queryParams);

    return NextResponse.json({
      success: true,
      data: relationships,
      pagination: {
        limit: queryParams.limit,
        offset: queryParams.offset,
        total: relationships.length,
        hasMore: relationships.length === queryParams.limit,
      },
      filters: queryParams,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return handleApiError(error)
  }
});