import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response';
import { ActionSignalService } from '@/lib/services/action-signal.service';
import { SignalQuerySchema } from '@/lib/validation/action-signal';

export const GET = withAuth(async (request: NextRequest, context: any) => {
  try {
    const { user, roles } = context;

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const query = SignalQuerySchema.parse(queryParams);

    const result = await ActionSignalService.getActiveSignals(
      user.userId,
      roles,
      query
    );

    return NextResponse.json({
      success: true,
      data: result,
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
