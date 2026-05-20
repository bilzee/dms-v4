/**
 * API Route: GET /api/v1/incidents/[id]/assessment-summary
 * 
 * Gets assessment summary for a specific incident including entity counts,
 * priority distribution, and assessment timeline data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { calculateRelationshipStatistics } from '@/lib/services/assessment-relationships.service';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

interface RouteParams {
  params: { id: string }
}

export const GET = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  try {
    // RBAC: ASSESSOR, COORDINATOR, ADMIN can view assessment summary
    if (!context.roles.some(r => ['ASSESSOR', 'COORDINATOR', 'ADMIN'].includes(r))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to view assessment summary' },
        { status: 403 }
      );
    }

    // Get incident with assessments for summary calculation
    const { id: incidentId } = params;

    // Calculate relationship statistics using existing service
    const assessmentSummary = await calculateRelationshipStatistics({ incidentId });

    return NextResponse.json({
      success: true,
      data: assessmentSummary,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error)
  }
});