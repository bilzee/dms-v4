import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response';
import { SignalReconciliationJob } from '@/lib/jobs/signal-reconciliation';

export const POST = withAuth(async (request: NextRequest, context: any) => {
  try {
    const { roles } = context;

    if (!roles.includes('ADMIN') && !roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const result = await SignalReconciliationJob.run();

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        triggeredBy: context.user.userId,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
