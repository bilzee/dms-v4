import { NextRequest, NextResponse } from 'next/server';
import { conflictResolver } from '@/lib/sync/conflict';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { errorResponse, handleApiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType') as 'assessment' | 'response' | 'entity' | null;
    const resolved = searchParams.get('resolved');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let conflicts = await conflictResolver.getConflictHistory();

    if (entityType) {
      conflicts = conflicts.filter(conflict => conflict.entityType === entityType);
    }
    if (resolved !== null) {
      const isResolved = resolved === 'true';
      conflicts = conflicts.filter(conflict => conflict.isResolved === isResolved);
    }
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      conflicts = conflicts.filter(conflict => new Date(conflict.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      conflicts = conflicts.filter(conflict => new Date(conflict.createdAt) <= toDate);
    }

    const csvHeaders = [
      'Conflict ID', 'Entity Type', 'Entity ID', 'Conflict Date',
      'Resolution Method', 'Local Version', 'Server Version',
      'Resolved', 'Resolved At', 'Resolved By', 'Auto Resolved', 'Conflict Reason'
    ];

    const csvRows = conflicts.map(conflict => [
      conflict.conflictId,
      conflict.entityType.toUpperCase(),
      conflict.entityUuid,
      conflict.createdAt.toISOString(),
      conflict.resolutionStrategy.toUpperCase(),
      conflict.localVersion.toString(),
      conflict.serverVersion.toString(),
      conflict.isResolved ? 'Yes' : 'No',
      conflict.resolvedAt ? conflict.resolvedAt.toISOString() : '',
      conflict.resolvedBy || '',
      conflict.metadata?.autoResolved ? 'Yes' : 'No',
      conflict.metadata?.conflictReason || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row =>
        row.map(field =>
          field.includes(',') || field.includes('"')
            ? `"${field.replace(/"/g, '""')}"`
            : field
        ).join(',')
      )
    ].join('\n');

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `conflict-report-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
});
