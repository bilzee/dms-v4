import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { errorResponse, handleApiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: any = {};
    if (entityType) {
      where.entityType = entityType;
    }
    if (dateFrom || dateTo) {
      where.conflictDate = {};
      if (dateFrom) where.conflictDate.gte = new Date(dateFrom);
      if (dateTo) where.conflictDate.lte = new Date(dateTo);
    }

    const conflicts = await prisma.syncConflict.findMany({
      where,
      orderBy: { conflictDate: 'desc' }
    });

    const csvHeaders = [
      'Conflict ID', 'Entity Type', 'Entity ID', 'Conflict Date',
      'Resolution Method', 'Coordinator Notified', 'Resolved At', 'Response ID'
    ];

    const csvRows = conflicts.map(conflict => [
      conflict.id,
      conflict.entityType.toUpperCase(),
      conflict.entityId,
      conflict.conflictDate.toISOString(),
      conflict.resolutionMethod,
      conflict.coordinatorNotified ? 'Yes' : 'No',
      conflict.resolvedAt ? conflict.resolvedAt.toISOString() : '',
      conflict.responseId || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row =>
        row.map(field =>
          typeof field === 'string' && (field.includes(',') || field.includes('"'))
            ? `"${field.replace(/"/g, '""')}"`
            : String(field)
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
