import { NextRequest } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, handleApiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    return successResponse({
      userId: context.userId,
      server: {
        version: '1.0.0',
        healthy: true
      },
      sync: {
        isActive: false,
        lastSync: null,
        pendingItems: { total: 0, byType: { assessment: 0, response: 0, entity: 0 }, byAction: { create: 0, update: 0, delete: 0 } },
        conflicts: { total: 0, unresolved: 0, autoResolved: 0 },
        performance: { avgSyncTime: 0, successRate: 1.0, throughput: 0 }
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
});
