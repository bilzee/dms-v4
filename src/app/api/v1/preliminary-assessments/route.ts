import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/auth/middleware';
import { PreliminaryAssessmentService } from '@/lib/services/preliminary-assessment.service';
import { 
  CreatePreliminaryAssessmentSchema,
  QueryPreliminaryAssessmentSchema 
} from '@/lib/validation/preliminary-assessment';
import { PreliminaryAssessmentListResponse } from '@/types/preliminary-assessment';

export const GET = withAuth(async (request, context) => {
  try {
    // RBAC: Only ASSESSOR, COORDINATOR, ADMIN can list preliminary assessments
    if (!context.roles.some(r => ['ASSESSOR', 'COORDINATOR', 'ADMIN'].includes(r))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to view preliminary assessments' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    
    const query = QueryPreliminaryAssessmentSchema.parse(searchParams);
    
    const { assessments, total, totalPages } = await PreliminaryAssessmentService.findAll(query);

    const response: PreliminaryAssessmentListResponse = {
      data: assessments,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Get preliminary assessments error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, context) => {
  try {
    // RBAC: Only ASSESSOR can create preliminary assessments
    if (!context.roles.includes('ASSESSOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create preliminary assessments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const input = CreatePreliminaryAssessmentSchema.parse(body);
    
    const assessment = await PreliminaryAssessmentService.create(input, context.user.id);

    return NextResponse.json(
      {
        data: assessment,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create preliminary assessment error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 500 }
    );
  }
});