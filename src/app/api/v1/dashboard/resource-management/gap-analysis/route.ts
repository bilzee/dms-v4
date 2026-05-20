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
        resource: 'GAP_ANALYSIS',
        oldValues: null,
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });

      return errorResponse('Forbidden - COORDINATOR access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const entityId = searchParams.get('entityId');
    const incidentId = searchParams.get('incidentId');

    const mockGapAnalysisData = [
      {
        entityId: '1',
        entity: {
          id: '1',
          name: 'Affected Community A',
          type: 'COMMUNITY',
          location: 'Lagos State'
        },
        gaps: [
          {
            resourceName: 'WATER',
            requiredQuantity: 10000,
            committedQuantity: 3000,
            deliveredQuantity: 2000,
            gap: 5000,
            percentageMet: 50,
            severity: 'HIGH',
            priority: 1
          },
          {
            resourceName: 'FOOD',
            requiredQuantity: 8000,
            committedQuantity: 4000,
            deliveredQuantity: 2000,
            gap: 2000,
            percentageMet: 75,
            severity: 'MEDIUM',
            priority: 2
          }
        ],
        totalGapValue: 135000,
        criticalGaps: 1
      },
      {
        entityId: '2',
        entity: {
          id: '2',
          name: 'Affected Community B',
          type: 'COMMUNITY',
          location: 'Kano State'
        },
        gaps: [
          {
            resourceName: 'MEDICAL',
            requiredQuantity: 500,
            committedQuantity: 200,
            deliveredQuantity: 100,
            gap: 200,
            percentageMet: 60,
            severity: 'HIGH',
            priority: 1
          }
        ],
        totalGapValue: 5000,
        criticalGaps: 1
      }
    ];

    let filteredData = mockGapAnalysisData;

    if (entityId && entityId !== 'all') {
      filteredData = filteredData.filter(entity => entity.entityId === entityId);
    }

    if (severity && severity !== 'all') {
      filteredData = filteredData.map(entity => ({
        ...entity,
        gaps: entity.gaps.filter(gap => gap.severity === severity),
        criticalGaps: entity.gaps.filter(gap => gap.severity === 'HIGH').length
      })).filter(entity => entity.gaps.length > 0);
    }

    const summary = {
      totalEntities: filteredData.length,
      totalGaps: filteredData.reduce((acc, entity) => acc + entity.gaps.length, 0),
      criticalGaps: filteredData.reduce((acc, entity) => acc + entity.criticalGaps, 0),
      totalGapValue: filteredData.reduce((acc, entity) => acc + entity.totalGapValue, 0),
      bySeverity: {
        HIGH: filteredData.reduce((acc, entity) => acc + entity.gaps.filter(g => g.severity === 'HIGH').length, 0),
        MEDIUM: filteredData.reduce((acc, entity) => acc + entity.gaps.filter(g => g.severity === 'MEDIUM').length, 0),
        LOW: filteredData.reduce((acc, entity) => acc + entity.gaps.filter(g => g.severity === 'LOW').length, 0)
      }
    };

    await auditLog({
      userId: context.userId,
      action: 'ACCESS_GAP_ANALYSIS',
      resource: 'GAP_ANALYSIS',
      oldValues: null,
      newValues: {
        filters: { severity, entityId, incidentId },
        summary
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return successResponse({
      data: filteredData,
      summary
    });

  } catch (error) {
    console.error('Error generating gap analysis:', error);

    try {
      await auditLog({
        userId: context.userId,
        action: 'ERROR_ACCESS_GAP_ANALYSIS',
        resource: 'GAP_ANALYSIS',
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

function getEstimatedValuePerUnit(resourceType: string): number {
  const valueMap: Record<string, number> = {
    'WATER': 0.50,
    'FOOD': 3.00,
    'MEDICAL': 25.00,
    'SHELTER': 100.00,
    'CLOTHING': 15.00,
    'BLANKETS': 20.00,
    'HYGIENE': 10.00,
    'TOOLS': 35.00,
    'FUEL': 1.50,
    'COMMUNICATION': 200.00,
    'TRANSPORT': 500.00,
    'GENERATORS': 1000.00,
    'MEDICINE': 50.00,
    'FIRST_AID': 25.00,
  };

  return valueMap[resourceType.toUpperCase()] || 10.00;
}
