/**
 * API Route: GET /api/v1/relationships/statistics
 * 
 * Provides assessment-based relationship metrics for dashboard displays.
 * Returns comprehensive statistics including priority distributions,
 * assessment type breakdowns, and verification status summaries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { calculateRelationshipStatistics } from '@/lib/services/assessment-relationships.service';
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
    };

    // Validate query parameters
    const queryResult = QueryParamsSchema.safeParse(rawParams);

    if (!queryResult.success) {
      console.error('Query validation failed:', queryResult.error.issues);
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
    };

    // Calculate comprehensive relationship statistics
    const statistics = await calculateRelationshipStatistics(queryParams);

    return NextResponse.json({
      success: true,
      data: statistics,
      timestamp: new Date().toISOString(),
      filters: queryParams,
    });

  } catch (error) {
    console.error('Error calculating relationship statistics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to calculate relationship statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});