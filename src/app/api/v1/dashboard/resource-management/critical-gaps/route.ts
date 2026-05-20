import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { auditLog } from '@/lib/services/audit.service';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR')) {
      await auditLog({
        userId: context.userId,
        action: 'UNAUTHORIZED_ACCESS',
        resource: 'CRITICAL_GAPS',
        oldValues: null,
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });

      return errorResponse('Forbidden - COORDINATOR access required', 403);
    }

    const mockCriticalGaps = [
      {
        entity: { id: '1', name: 'Affected Community A', type: 'COMMUNITY', location: 'Lagos State' },
        resource: 'WATER',
        unmetNeed: 5000,
        severity: 'HIGH' as const,
        requiredQuantity: 10000,
        committedQuantity: 3000,
        deliveredQuantity: 2000,
        gap: 5000
      },
      {
        entity: { id: '2', name: 'Affected Community B', type: 'COMMUNITY', location: 'Kano State' },
        resource: 'FOOD',
        unmetNeed: 3000,
        severity: 'HIGH' as const,
        requiredQuantity: 8000,
        committedQuantity: 4000,
        deliveredQuantity: 1000,
        gap: 3000
      }
    ];

    const sortedGaps = mockCriticalGaps;

    await auditLog({
      userId: context.userId,
      action: 'ACCESS_CRITICAL_GAPS',
      resource: 'CRITICAL_GAPS',
      oldValues: null,
      newValues: { criticalGapsFound: sortedGaps.length },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return successResponse({
      criticalGaps: sortedGaps
    });

  } catch (error) {
    console.error('Error fetching critical gaps:', error);

    try {
      await auditLog({
        userId: context.userId,
        action: 'ERROR_ACCESS_CRITICAL_GAPS',
        resource: 'CRITICAL_GAPS',
        oldValues: null,
        newValues: { error: error instanceof Error ? error.message : 'Unknown error' },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });
    } catch (auditError) {
      // Ignore audit log errors
    }

    return handleApiError(error);
  }
});
