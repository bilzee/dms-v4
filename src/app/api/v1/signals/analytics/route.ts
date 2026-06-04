import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response';
import { SignalAnalyticsQuerySchema } from '@/lib/validation/signal-analytics';
import { SignalAnalyticsService } from '@/lib/services/signal-analytics.service';

export const GET = withAuth(async (request: NextRequest, context: any) => {
  try {
    const { roles } = context;

    if (!roles.includes('ADMIN') && !roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const parsed = SignalAnalyticsQuerySchema.parse(queryParams);

    const data = await SignalAnalyticsService.getFullAnalytics(parsed);

    return NextResponse.json({
      success: true,
      data,
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
