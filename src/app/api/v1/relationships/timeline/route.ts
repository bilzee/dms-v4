/**
 * API Route: GET /api/v1/relationships/timeline
 * 
 * Provides assessment timeline data for relationship visualization.
 * Returns chronological assessment history for entity-incident relationships
 * with comprehensive filtering and sorting capabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getAssessmentTimeline } from '@/lib/services/assessment-relationships.service';
import type { RelationshipQueryParams } from '@/types/assessment-relationships';
import { z } from 'zod';

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
    // Authorization check - only coordinators and admins can access timeline
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
      console.error('Timeline query validation failed:', queryResult.error.issues);
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

    // Get assessment timeline data
    const timelineItems = await getAssessmentTimeline(queryParams);

    // Transform data for timeline response format
    const timelineData = timelineItems.map(item => ({
      entityId: item.entity.id,
      incidentId: item.incident.id,
      assessment: {
        id: item.assessment.id,
        type: item.assessment.rapidAssessmentType,
        priority: item.assessment.priority,
        date: item.assessment.rapidAssessmentDate.toISOString(),
        verificationStatus: item.assessment.verificationStatus,
        assessorName: item.assessment.assessorName,
        location: item.assessment.location,
      },
      entity: {
        id: item.entity.id,
        name: item.entity.name,
        type: item.entity.type,
        location: item.entity.location,
      },
      incident: {
        id: item.incident.id,
        type: item.incident.type,
        description: item.incident.description,
        location: item.incident.location,
        severity: item.incident.severity,
        status: item.incident.status,
      },
    }));

    return NextResponse.json({
      success: true,
      data: timelineData,
      pagination: {
        limit: queryParams.limit,
        offset: queryParams.offset,
        total: timelineData.length,
        hasMore: timelineData.length === queryParams.limit,
      },
      filters: queryParams,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching assessment timeline:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch assessment timeline',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});