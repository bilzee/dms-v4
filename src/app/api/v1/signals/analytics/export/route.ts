import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response';
import { z } from 'zod';

const ExportQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('7d'),
  format: z.enum(['csv', 'xlsx']).default('csv'),
  incidentId: z.string().uuid().optional(),
  entityId: z.string().uuid().optional(),
  signalReason: z.string().optional(),
  role: z.enum(['ASSESSOR', 'RESPONDER', 'DONOR', 'COORDINATOR']).optional(),
});

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
    const parsed = ExportQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const { format, ...analyticsInput } = parsed;

    const dateStr = new Date().toISOString().split('T')[0];
    const { SignalAnalyticsExportService } = await import('@/lib/services/signal-analytics-export.service');

    if (format === 'csv') {
      const csv = await SignalAnalyticsExportService.exportAsCsv(analyticsInput as any);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="signal-analytics-${parsed.range}-${dateStr}.csv"`,
        },
      });
    } else {
      const buffer = await SignalAnalyticsExportService.exportAsExcel(analyticsInput as any);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="signal-analytics-${parsed.range}-${dateStr}.xlsx"`,
        },
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
});
