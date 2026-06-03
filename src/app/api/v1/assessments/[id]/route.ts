import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response';
import { RapidAssessmentService } from '@/lib/services/rapid-assessment.service';

interface RouteParams {
  params: { id: string }
}

export const GET = withAuth(async (request: NextRequest, context: any, { params }: RouteParams) => {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Assessment ID is required' },
        { status: 400 }
      );
    }

    const assessment = await RapidAssessmentService.findById(id);
    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: assessment,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
