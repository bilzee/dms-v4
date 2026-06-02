import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response';
import { incidentSeverityService } from '@/lib/services/incident-severity.service';

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('ADMIN') && !context.roles.includes('COORDINATOR')) {
      return NextResponse.json({ success: false, error: 'Admin or Coordinator access required' }, { status: 403 });
    }

    const result = await incidentSeverityService.recalculateAll();

    return NextResponse.json({
      success: true,
      data: result,
      message: `Recalculated ${result.total} incidents. ${result.results.length} severities changed.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
