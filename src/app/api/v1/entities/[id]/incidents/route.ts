/**
 * API Route: GET /api/v1/entities/[id]/incidents
 * 
 * Lists incidents affecting a specific entity through assessments.
 * Provides reverse relationship queries with filtering capabilities
 * and comprehensive statistics for entity-centric views.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { getEntityIncidents, calculateRelationshipStatistics } from '@/lib/services/assessment-relationships.service';
import type { RelationshipQueryParams } from '@/types/assessment-relationships';
import { Priority, AssessmentType, VerificationStatus } from '@prisma/client';
import { z } from 'zod';

// Request validation schema
const QueryParamsSchema = z.object({
  priorityFilter: z.string().optional().transform(val => 
    val?.split(',').filter(Boolean).filter(p => Object.values(Priority).includes(p as Priority)) as Priority[] | undefined
  ),
  assessmentTypeFilter: z.string().optional().transform(val => 
    val?.split(',').filter(Boolean).filter(at => Object.values(AssessmentType).includes(at as AssessmentType)) as AssessmentType[] | undefined
  ),
  verificationStatusFilter: z.string().optional().transform(val => 
    val?.split(',').filter(Boolean).filter(vs => Object.values(VerificationStatus).includes(vs as VerificationStatus)) as VerificationStatus[] | undefined
  ),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  offset: z.string().optional().transform(val => val ? parseInt(val) : undefined),
});

export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    // RBAC: ASSESSOR, COORDINATOR, ADMIN can view entity incidents
    if (!context.roles.some(r => ['ASSESSOR', 'COORDINATOR', 'ADMIN'].includes(r))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to view entity incidents' },
        { status: 403 }
      );
    }

    const entityId = params.id;
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const queryResult = QueryParamsSchema.safeParse({
      priorityFilter: searchParams.get('priorityFilter'),
      assessmentTypeFilter: searchParams.get('assessmentTypeFilter'),
      verificationStatusFilter: searchParams.get('verificationStatusFilter'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters',
          details: queryResult.error.issues
        },
        { status: 400 }
      );
    }

    const queryParams: RelationshipQueryParams = {
      entityId,
      ...queryResult.data,
    };

    // Get incidents affecting this entity via assessments
    const [incidents, statistics] = await Promise.all([
      getEntityIncidents(entityId, queryParams),
      calculateRelationshipStatistics(queryParams),
    ]);

    return NextResponse.json({
      success: true,
      data: incidents,
      statistics,
      pagination: {
        limit: queryParams.limit,
        offset: queryParams.offset,
        total: incidents.length,
      },
    });

  } catch (error) {
    console.error('Error fetching entity incidents:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch incidents for entity',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});