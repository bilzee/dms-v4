import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response';

const ScheduleReportRequestSchema = z.object({
  reportType: z.enum([
    'incident-overview',
    'assessment-summary',
    'response-activity',
    'resource-allocation',
    'entity-status',
    'custom-dashboard'
  ]),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string().default('UTC'),
  }),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
    role: z.string().optional(),
    format: z.enum(['pdf', 'csv', 'html']).default('pdf'),
  })).min(1, 'At least one recipient is required'),
  filters: z.record(z.any()).optional(),
  defaultDateRange: z.object({
    type: z.enum(['last_24_hours', 'last_7_days', 'last_30_days', 'current_month', 'custom']),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).default({ type: 'last_7_days' }),
  options: z.object({
    includeCharts: z.boolean().default(true),
    includeMaps: z.boolean().default(true),
    includeImages: z.boolean().default(false),
    pageSize: z.enum(['A4', 'Letter']).default('A4'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    watermark: z.string().optional(),
    compressOutput: z.boolean().default(true),
  }).optional(),
  isActive: z.boolean().default(true),
});

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ASSESSOR: ['assessment-summary'],
  COORDINATOR: ['incident-overview', 'assessment-summary', 'response-activity', 'resource-allocation', 'entity-status'],
  RESPONDER: ['response-activity', 'resource-allocation', 'entity-status'],
  DONOR: ['response-activity'],
  ADMIN: ['incident-overview', 'assessment-summary', 'response-activity', 'resource-allocation', 'entity-status', 'custom-dashboard'],
};

function calculateNextRun(schedule: any): Date {
  const now = new Date();
  const { frequency, dayOfWeek, dayOfMonth, time } = schedule;
  const [hours, minutes] = time.split(':').map(Number);
  const targetTime = new Date(now);
  targetTime.setUTCHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      if (targetTime <= now) targetTime.setDate(targetTime.getDate() + 1);
      return targetTime;
    case 'weekly':
      if (dayOfWeek !== undefined) {
        targetTime.setDate(targetTime.getDate() + ((dayOfWeek + 7 - targetTime.getDay()) % 7));
        if (targetTime <= now) targetTime.setDate(targetTime.getDate() + 7);
      }
      return targetTime;
    case 'monthly':
      if (dayOfMonth !== undefined) {
        targetTime.setDate(Math.min(dayOfMonth, new Date(targetTime.getFullYear(), targetTime.getMonth() + 1, 0).getDate()));
        if (targetTime <= now) {
          targetTime.setMonth(targetTime.getMonth() + 1);
          targetTime.setDate(Math.min(dayOfMonth, new Date(targetTime.getFullYear(), targetTime.getMonth() + 1, 0).getDate()));
        }
      }
      return targetTime;
    case 'quarterly':
      targetTime.setMonth(targetTime.getMonth() + ((3 - (targetTime.getMonth() % 3)) % 3));
      if (dayOfMonth !== undefined) {
        targetTime.setDate(Math.min(dayOfMonth, new Date(targetTime.getFullYear(), targetTime.getMonth() + 1, 0).getDate()));
      }
      if (targetTime <= now) {
        targetTime.setMonth(targetTime.getMonth() + 3);
        if (dayOfMonth !== undefined) {
          targetTime.setDate(Math.min(dayOfMonth, new Date(targetTime.getFullYear(), targetTime.getMonth() + 1, 0).getDate()));
        }
      }
      return targetTime;
    default:
      return targetTime;
  }
}

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const allowedReports = context.roles.flatMap(role => ROLE_PERMISSIONS[role] || []);
    const uniqueAllowed = [...new Set(allowedReports)];

    const body = await request.json();
    const validatedData = ScheduleReportRequestSchema.parse(body);

    if (!uniqueAllowed.includes(validatedData.reportType)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for this report type' },
        { status: 403 }
      );
    }

    const nextRun = calculateNextRun(validatedData.schedule);

    const scheduledReport = await prisma.scheduledReport.create({
      data: {
        userId: context.userId,
        reportType: validatedData.reportType,
        schedule: validatedData.schedule as any,
        recipients: validatedData.recipients as any,
        filters: validatedData.filters as any ?? undefined,
        defaultDateRange: validatedData.defaultDateRange as any,
        options: validatedData.options as any ?? undefined,
        isActive: validatedData.isActive,
        nextRunAt: nextRun,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        scheduledReportId: scheduledReport.id,
        reportType: scheduledReport.reportType,
        schedule: scheduledReport.schedule,
        nextRun: scheduledReport.nextRunAt,
        isActive: scheduledReport.isActive,
        recipients: (scheduledReport.recipients as any[]).length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (reportId) {
      const report = await prisma.scheduledReport.findUnique({
        where: { id: reportId },
      });

      if (!report || report.userId !== context.userId) {
        return NextResponse.json(
          { success: false, error: 'Scheduled report not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: report });
    }

    const userReports = await prisma.scheduledReport.findMany({
      where: { userId: context.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: userReports.map(report => ({
        id: report.id,
        reportType: report.reportType,
        schedule: report.schedule,
        isActive: report.isActive,
        recipients: (report.recipients as any[]).length,
        createdAt: report.createdAt,
        lastRun: report.lastRunAt,
        nextRun: report.nextRunAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PUT = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const existingReport = await prisma.scheduledReport.findUnique({
      where: { id: reportId },
    });

    if (!existingReport || existingReport.userId !== context.userId) {
      return NextResponse.json(
        { success: false, error: 'Scheduled report not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = ScheduleReportRequestSchema.partial().parse(body);

    const nextRun = validatedData.schedule
      ? calculateNextRun(validatedData.schedule)
      : existingReport.nextRunAt;

    const updatedReport = await prisma.scheduledReport.update({
      where: { id: reportId },
      data: {
        ...(validatedData.reportType && { reportType: validatedData.reportType }),
        ...(validatedData.schedule && { schedule: validatedData.schedule as any }),
        ...(validatedData.recipients && { recipients: validatedData.recipients as any }),
        ...(validatedData.filters !== undefined && { filters: validatedData.filters as any ?? undefined }),
        ...(validatedData.defaultDateRange && { defaultDateRange: validatedData.defaultDateRange as any }),
        ...(validatedData.options !== undefined && { options: validatedData.options as any ?? undefined }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        nextRunAt: nextRun,
      },
    });

    return NextResponse.json({ success: true, data: updatedReport });
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const existingReport = await prisma.scheduledReport.findUnique({
      where: { id: reportId },
    });

    if (!existingReport || existingReport.userId !== context.userId) {
      return NextResponse.json(
        { success: false, error: 'Scheduled report not found' },
        { status: 404 }
      );
    }

    await prisma.scheduledReport.delete({ where: { id: reportId } });

    return NextResponse.json({
      success: true,
      data: { message: 'Scheduled report deleted successfully' },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
