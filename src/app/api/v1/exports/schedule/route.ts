import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

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
    dayOfWeek: z.number().min(0).max(6).optional(), // 0-6 (Sunday-Saturday)
    dayOfMonth: z.number().min(1).max(31).optional(), // 1-31
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
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

// Scheduled reports storage (in production, use proper database table)
interface ScheduledReport {
  id: string;
  userId: string;
  reportType: string;
  schedule: any;
  recipients: any[];
  filters: any;
  defaultDateRange: any;
  options: any;
  isActive: boolean;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
}

const scheduledReports: Map<string, ScheduledReport> = new Map();

// In-memory cron job manager (in production, use proper job queue like Bull/Agenda)
const cronJobs: Map<string, NodeJS.Timeout> = new Map();

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Use context.roles instead of (context.user as any).role
    const allowedReports = context.roles
      .flatMap(role => ROLE_PERMISSIONS[role] || []);
    const uniqueAllowed = [...new Set(allowedReports)];

    const body = await request.json();
    const validatedData = ScheduleReportRequestSchema.parse(body);

    // Check role-based permissions
    if (!uniqueAllowed.includes(validatedData.reportType)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for this report type' },
        { status: 403 }
      );
    }

    // Create scheduled report
    const scheduledReportId = `schedule_${Date.now()}_${crypto.randomUUID().split('-')[0]}`;
    
    const scheduledReport: ScheduledReport = {
      id: scheduledReportId,
      userId: context.userId,
      reportType: validatedData.reportType,
      schedule: validatedData.schedule,
      recipients: validatedData.recipients,
      filters: validatedData.filters,
      defaultDateRange: validatedData.defaultDateRange,
      options: validatedData.options,
      isActive: validatedData.isActive,
      createdAt: new Date(),
      nextRun: calculateNextRun(validatedData.schedule),
    };

    // Store scheduled report
    scheduledReports.set(scheduledReportId, scheduledReport);

    // Schedule the cron job if active
    if (validatedData.isActive) {
      scheduleReportJob(scheduledReportId, scheduledReport);
    }

    return NextResponse.json({
      success: true,
      data: {
        scheduledReportId,
        reportType: validatedData.reportType,
        schedule: validatedData.schedule,
        nextRun: scheduledReport.nextRun,
        isActive: scheduledReport.isActive,
        recipients: validatedData.recipients.length,
      },
    });
  } catch (error) {
    return handleApiError(error)
  }
});

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (reportId) {
      // Get specific scheduled report
      const report = scheduledReports.get(reportId);
      
      if (!report) {
        return NextResponse.json(
          { success: false, error: 'Scheduled report not found' },
          { status: 404 }
        );
      }

      // Check ownership
      if (report.userId !== context.userId) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: report,
      });
    } else {
      // Get all scheduled reports for user
      const userReports = Array.from(scheduledReports.values())
        .filter(report => report.userId === context.userId);

      return NextResponse.json({
        success: true,
        data: userReports.map(report => ({
          id: report.id,
          reportType: report.reportType,
          schedule: report.schedule,
          isActive: report.isActive,
          recipients: report.recipients.length,
          createdAt: report.createdAt,
          lastRun: report.lastRun,
          nextRun: report.nextRun,
        })),
      });
    }
  } catch (error) {
    return handleApiError(error)
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

    const existingReport = scheduledReports.get(reportId);
    if (!existingReport) {
      return NextResponse.json(
        { success: false, error: 'Scheduled report not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (existingReport.userId !== context.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = ScheduleReportRequestSchema.partial().parse(body);

    // Update report
    const updatedReport: ScheduledReport = {
      ...existingReport,
      ...validatedData,
      id: reportId, // Don't change ID
      userId: existingReport.userId, // Don't change user
      nextRun: validatedData.schedule ? calculateNextRun(validatedData.schedule) : existingReport.nextRun,
    };

    scheduledReports.set(reportId, updatedReport);

    // Update cron job if schedule changed
    if (validatedData.schedule && existingReport.isActive) {
      // Cancel existing job
      const existingJob = cronJobs.get(reportId);
      if (existingJob) {
        clearTimeout(existingJob);
        cronJobs.delete(reportId);
      }

      // Schedule new job if still active
      if (updatedReport.isActive) {
        scheduleReportJob(reportId, updatedReport);
      }
    } else if (validatedData.isActive !== undefined) {
      // Toggle job active state
      const existingJob = cronJobs.get(reportId);
      
      if (validatedData.isActive && !existingJob) {
        scheduleReportJob(reportId, updatedReport);
      } else if (!validatedData.isActive && existingJob) {
        clearTimeout(existingJob);
        cronJobs.delete(reportId);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedReport,
    });
  } catch (error) {
    return handleApiError(error)
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

    const existingReport = scheduledReports.get(reportId);
    if (!existingReport) {
      return NextResponse.json(
        { success: false, error: 'Scheduled report not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (existingReport.userId !== context.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Cancel cron job
    const existingJob = cronJobs.get(reportId);
    if (existingJob) {
      clearTimeout(existingJob);
      cronJobs.delete(reportId);
    }

    // Remove scheduled report
    scheduledReports.delete(reportId);

    return NextResponse.json({
      success: true,
      data: { message: 'Scheduled report deleted successfully' },
    });
  } catch (error) {
    return handleApiError(error)
  }
});

function calculateNextRun(schedule: any): Date {
  const now = new Date();
  const { frequency, dayOfWeek, dayOfMonth, time, timezone } = schedule;
  
  // Parse time
  const [hours, minutes] = time.split(':').map(Number);
  
  let nextRun = new Date(now);
  
  // Convert to target timezone (simplified - in production, use proper timezone library)
  const targetTime = new Date(now);
  targetTime.setUTCHours(hours, minutes, 0, 0);
  
  switch (frequency) {
    case 'daily':
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      nextRun = targetTime;
      break;
      
    case 'weekly':
      if (dayOfWeek !== undefined) {
        targetTime.setDate(targetTime.getDate() + ((dayOfWeek + 7 - targetTime.getDay()) % 7));
        if (targetTime <= now) {
          targetTime.setDate(targetTime.getDate() + 7);
        }
      }
      nextRun = targetTime;
      break;
      
    case 'monthly':
      if (dayOfMonth !== undefined) {
        targetTime.setDate(Math.min(dayOfMonth, new Date(targetTime.getFullYear(), targetTime.getMonth() + 1, 0).getDate()));
        if (targetTime <= now) {
          targetTime.setMonth(targetTime.getMonth() + 1);
          targetTime.setDate(Math.min(dayOfMonth, new Date(targetTime.getFullYear(), targetTime.getMonth() + 1, 0).getDate()));
        }
      }
      nextRun = targetTime;
      break;
      
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
      nextRun = targetTime;
      break;
      
    default:
      nextRun = targetTime;
  }
  
  return nextRun;
}

function scheduleReportJob(reportId: string, scheduledReport: ScheduledReport): void {
  const now = new Date();
  const nextRun = scheduledReport.nextRun;
  
  if (!nextRun || nextRun <= now) {
    return;
  }
  
  const delay = nextRun.getTime() - now.getTime();
  
  const timeout = setTimeout(async () => {
    try {
      // Generate and send report
      await executeScheduledReport(reportId, scheduledReport);
      
      // Update last run time
      scheduledReport.lastRun = new Date();
      
      // Calculate next run
      scheduledReport.nextRun = calculateNextRun(scheduledReport.schedule);
      
      // Reschedule next execution
      if (scheduledReport.isActive) {
        scheduleReportJob(reportId, scheduledReport);
      }
    } catch (error) {
      console.error(`Scheduled report execution failed for ${reportId}:`, error);
    }
  }, delay);
  
  cronJobs.set(reportId, timeout);
}

async function executeScheduledReport(reportId: string, scheduledReport: ScheduledReport): Promise<void> {
  // Calculate date range based on default settings
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  
  switch (scheduledReport.defaultDateRange.type) {
    case 'last_24_hours':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case 'last_7_days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case 'last_30_days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case 'current_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'custom':
      startDate = new Date(scheduledReport.defaultDateRange.startDate!);
      endDate = new Date(scheduledReport.defaultDateRange.endDate!);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
  }
  
  // Generate report for each recipient with their preferred format
  const reportPromises = scheduledReport.recipients.map(async (recipient) => {
    try {
      // Call report generation API
      const reportRequest = {
        reportType: scheduledReport.reportType,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        filters: scheduledReport.filters,
        format: recipient.format,
        options: scheduledReport.options,
        recipients: [recipient], // Single recipient
      };
      
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/v1/exports/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportRequest),
      });
      
      if (!response.ok) {
        throw new Error(`Report generation failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Send email with report attachment (in production, use proper email service)
      await sendReportEmail(recipient, result.data, scheduledReport);
      
    } catch (error) {
      console.error(`Failed to generate report for ${recipient.email}:`, error);
    }
  });
  
  await Promise.all(reportPromises);
}

async function sendReportEmail(recipient: any, reportData: any, scheduledReport: ScheduledReport): Promise<void> {
  // In production, implement actual email sending with services like:
  // - SendGrid, AWS SES, Nodemailer, etc.
  // - Include report attachment or download link
  // - Use email templates
  
  const emailContent = {
    to: recipient.email,
    subject: `Scheduled Disaster Management Report: ${scheduledReport.reportType}`,
    text: `Hello ${recipient.name || 'there'},\n\nYour scheduled report "${scheduledReport.reportType}" is ready.\n\nReport Type: ${scheduledReport.reportType}\nGenerated: ${new Date().toLocaleDateString()}\nFormat: ${recipient.format}\n\nYou can download the report from the link below or check your dashboard for previous reports.\n\nBest regards,\nDisaster Management System`,
    html: `
      <h2>Scheduled Disaster Management Report</h2>
      <p>Hello ${recipient.name || 'there'},</p>
      <p>Your scheduled report "<strong>${scheduledReport.reportType}</strong>" is ready.</p>
      <ul>
        <li><strong>Report Type:</strong> ${scheduledReport.reportType}</li>
        <li><strong>Generated:</strong> ${new Date().toLocaleDateString()}</li>
        <li><strong>Format:</strong> ${recipient.format}</li>
      </ul>
      <p>You can download the report from your dashboard or check the reports section for previous reports.</p>
      <p>Best regards,<br>Disaster Management System</p>
    `,
  };
  
}