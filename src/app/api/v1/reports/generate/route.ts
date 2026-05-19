/**
 * Report Generation API Routes
 * POST - Generate report from configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { DataAggregator, ReportFilters, ReportFiltersSchema } from '@/lib/reports/data-aggregator';
import { ReportTemplateEngine } from '@/lib/reports/template-engine';
import { createApiResponse } from '@/types/api';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// Validation schemas
const GenerateReportSchema = z.object({
  configurationId: z.string().optional(),
  templateId: z.string().optional(),
  template: z.any().optional(),
  filters: ReportFiltersSchema.optional(),
  format: z.enum(['PDF', 'CSV', 'HTML', 'EXCEL']),
  options: z.object({
    includeHeaders: z.boolean().default(true),
    includeFooter: z.boolean().default(true),
    pageSize: z.enum(['A4', 'A3', 'LETTER']).default('A4'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    margins: z.object({
      top: z.number().default(20),
      right: z.number().default(20),
      bottom: z.number().default(20),
      left: z.number().default(20)
    }).optional(),
    password: z.string().optional(),
    watermark: z.string().optional(),
    filename: z.string().optional(),
    background: z.string().optional(),
    dpi: z.number().min(72).max(300).default(150),
    quality: z.number().min(1).max(100).default(85),
    includeRawData: z.boolean().default(false),
    includeMetadata: z.boolean().default(true),
    compression: z.enum(['none', 'gzip', 'deflate']).default('none'),
    locale: z.string().default('en-US'),
    timezone: z.string().default('UTC')
  }).optional()
});

const ScheduleReportSchema = z.object({
  configurationId: z.string(),
  schedule: z.object({
    frequency: z.enum(['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
    startDate: z.string(),
    endDate: z.string().optional(),
    times: z.array(z.string()).optional(),
    daysOfWeek: z.array(z.number().min(1).max(7)).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    timezone: z.string().default('UTC'),
    enabled: z.boolean().default(true)
  }),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string(),
    format: z.enum(['PDF', 'CSV', 'HTML', 'EXCEL'])
  })).optional(),
  options: GenerateReportSchema.shape.options.optional()
});

/**
 * POST /api/v1/reports/generate
 * Generate report immediately
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const startTime = Date.now();

  try {
    const hasPermission = context.permissions.includes('REPORT_GENERATE') ||
                          context.permissions.includes('ADMIN');

    if (!hasPermission) {
      return NextResponse.json(
        createApiResponse(false, null, 'Insufficient permissions to generate reports'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = GenerateReportSchema.parse(body);

    let template;
    let filters;
    let configurationId = validatedData.configurationId;

    if (validatedData.configurationId) {
      const configuration = await db.reportConfiguration.findFirst({
        where: {
          id: validatedData.configurationId,
          OR: [
            { createdBy: context.userId },
            { template: { isPublic: true } }
          ]
        },
        include: {
          template: true
        }
      });

      if (!configuration) {
        return NextResponse.json(
          createApiResponse(false, null, 'Report configuration not found or access denied'),
          { status: 404 }
        );
      }

      template = configuration.template;
      filters = configuration.filters as ReportFilters;
    } else if (validatedData.templateId) {
      const templateResult = await fetch(
        `${process.env.NEXTAUTH_URL}/api/v1/reports/templates/${validatedData.templateId}`,
        {
          headers: {
            Cookie: request.headers.get('cookie') || ''
          }
        }
      );

      if (!templateResult.ok) {
        return NextResponse.json(
          createApiResponse(false, null, 'Report template not found or access denied'),
          { status: 404 }
        );
      }

      const templateResponse = await templateResult.json();
      template = templateResponse.data;
      filters = validatedData.filters || { filters: [], aggregations: [], limit: 100 };
      
      const tempConfig = await db.reportConfiguration.create({
        data: {
          templateId: validatedData.templateId,
          name: `Temp config ${Date.now()}`,
          filters: filters,
          aggregations: [],
          visualizations: [],
          createdBy: context.userId
        }
      });
      configurationId = tempConfig.id;
    } else if (validatedData.template) {
      const tempTemplate = await db.reportTemplate.create({
        data: {
          name: `Temp template ${Date.now()}`,
          type: 'CUSTOM',
          layout: validatedData.template,
          createdById: context.userId,
          isPublic: false
        }
      });
      
      template = tempTemplate;
      filters = validatedData.filters || { filters: [], aggregations: [], limit: 100 };
      
      const tempConfig = await db.reportConfiguration.create({
        data: {
          templateId: tempTemplate.id,
          name: `Temp config ${Date.now()}`,
          filters: filters,
          aggregations: [],
          visualizations: [],
          createdBy: context.userId
        }
      });
      configurationId = tempConfig.id;
    } else {
      return NextResponse.json(
        createApiResponse(false, null, 'Either configurationId, templateId, or template is required'),
        { status: 400 }
      );
    }

    const execution = await db.reportExecution.create({
      data: {
        configurationId: configurationId!,
        status: 'RUNNING',
        format: validatedData.format,
        createdAt: new Date()
      }
    });

    const jobId = `report_${execution.id}_${Date.now()}`;
    
    generateReportBackground({
      executionId: execution.id,
      template,
      filters,
      format: validatedData.format,
      options: validatedData.options || {},
      userId: context.userId,
      jobId
    }).catch(error => {
      console.error(`Background report generation failed for job ${jobId}:`, error);
      
      db.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          generatedAt: new Date()
        }
      });
    });

    return NextResponse.json(
      createApiResponse(true, {
        executionId: execution.id,
        jobId,
        status: 'PENDING',
        format: validatedData.format,
        estimatedTime: getEstimatedGenerationTime(template, filters, validatedData.format),
        message: 'Report generation started'
      }, 'Report generation initiated'),
      { status: 202 }
    );

  } catch (error) {
    console.error('Error generating report:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiResponse(false, null, 'Invalid request data', error.errors.map(e => e.message)),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createApiResponse(false, null, 'Failed to generate report'),
      { status: 500 }
    );
  }
});

/**
 * POST /api/v1/reports/schedule
 * Schedule automated report generation
 */
export const PUT = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const hasPermission = context.permissions.includes('REPORT_SCHEDULE') ||
                          context.permissions.includes('ADMIN');

    if (!hasPermission) {
      return NextResponse.json(
        createApiResponse(false, null, 'Insufficient permissions to schedule reports'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = ScheduleReportSchema.parse(body);

    const configuration = await db.reportConfiguration.findFirst({
      where: {
        id: validatedData.configurationId,
        OR: [
          { createdBy: context.userId },
          { template: { isPublic: true } }
        ]
      }
    });

    if (!configuration) {
      return NextResponse.json(
        createApiResponse(false, null, 'Report configuration not found or access denied'),
        { status: 404 }
      );
    }

    const scheduledExecution = await db.reportExecution.create({
      data: {
        configurationId: validatedData.configurationId,
        status: 'PENDING',
        format: 'PDF',
        createdAt: new Date()
      }
    });

    const scheduleData = {
      ...validatedData.schedule,
      executionId: scheduledExecution.id,
      userId: context.userId,
      recipients: validatedData.recipients || [],
      options: validatedData.options || {}
    };

    const scheduleFile = path.join(process.cwd(), 'schedules', `${scheduledExecution.id}.json`);
    await fs.mkdir(path.dirname(scheduleFile), { recursive: true });
    await fs.writeFile(scheduleFile, JSON.stringify(scheduleData, null, 2));

    return NextResponse.json(
      createApiResponse(true, {
        executionId: scheduledExecution.id,
        schedule: validatedData.schedule,
        nextRun: getNextScheduledRun(validatedData.schedule),
        message: 'Report scheduled successfully'
      }, 'Report scheduling initiated'),
      { status: 201 }
    );

  } catch (error) {
    console.error('Error scheduling report:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiResponse(false, null, 'Invalid schedule data', error.errors.map(e => e.message)),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createApiResponse(false, null, 'Failed to schedule report'),
      { status: 500 }
    );
  }
});

/**
 * Background report generation function
 */
async function generateReportBackground({
  executionId,
  template,
  filters,
  format,
  options,
  userId,
  jobId
}: {
  executionId: string;
  template: any;
  filters: ReportFilters;
  format: 'PDF' | 'CSV' | 'HTML' | 'EXCEL';
  options: any;
  userId: string;
  jobId: string;
}) {
  try {
    await db.reportExecution.update({
      where: { id: executionId },
      data: {
        status: 'RUNNING',
        generatedAt: new Date()
      }
    });

    const dataSource = inferDataSourceFromTemplate(template);

    const dataResult = await DataAggregator.executeQuery(dataSource as any, {
      ...filters,
      limit: options.includeRawData ? 10000 : 1000
    }, {
      includeCount: true,
      includeAggregations: true
    });

    let filePath: string;
    let fileSize: number;

    switch (format) {
      case 'PDF':
        const pdfResult = await generatePDFReport({
          template,
          data: dataResult.data,
          options,
          executionId
        });
        filePath = pdfResult.filePath;
        fileSize = pdfResult.fileSize;
        break;

      case 'CSV':
        const csvResult = await generateCSVReport({
          template,
          data: dataResult.data,
          options,
          executionId
        });
        filePath = csvResult.filePath;
        fileSize = csvResult.fileSize;
        break;

      case 'HTML':
        const htmlResult = await generateHTMLReport({
          template,
          data: dataResult.data,
          options,
          executionId
        });
        filePath = htmlResult.filePath;
        fileSize = htmlResult.fileSize;
        break;

      case 'EXCEL':
        const excelResult = await generateExcelReport({
          template,
          data: dataResult.data,
          options,
          executionId
        });
        filePath = excelResult.filePath;
        fileSize = excelResult.fileSize;
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const filename = options.filename || generateFilename(template, format);

    const finalPath = path.join(
      process.cwd(), 
      'reports', 
      `${executionId}.${format.toLowerCase()}`
    );
    
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.rename(filePath, finalPath);

    const fileStats = await fs.stat(finalPath);

    await db.reportExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        filePath: finalPath,
        generatedAt: new Date()
      }
    });

    await sendReportNotifications(executionId, finalPath, filename, fileSize);

    return {
      success: true,
      filePath: finalPath,
      fileSize: fileStats.size,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error(`Report generation failed for job ${jobId}:`, error);
    
    await db.reportExecution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        generatedAt: new Date()
      }
    });

    throw error;
  }
}

/**
 * Generate PDF report
 */
async function generatePDFReport({
  template,
  data,
  options,
  executionId
}: {
  template: any;
  data: any[];
  options: any;
  executionId: string;
}) {
  const PDFDocument = require('pdfkit').default;
  const fs = require('fs');

  const doc = new PDFDocument({
    size: options.pageSize || 'A4',
    layout: options.orientation || 'portrait',
    margins: options.margins || {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20
    },
    info: {
      Title: template.name || 'Report',
      Author: 'Disaster Management System',
      Subject: template.description || 'Generated Report',
      Creator: 'Disaster Management PWA',
      Producer: 'Custom Report Builder'
    }
  });

  const tempPath = path.join(process.cwd(), 'temp', `${executionId}_temp.pdf`);
  await fs.mkdir(path.dirname(tempPath), { recursive: true });

  doc.pipe(fs.createWriteStream(tempPath));

  if (template.layout) {
    for (const element of template.layout) {
      await addPDFElement(doc, element, data, options);
    }
  }

  doc.end();

  return {
    filePath: tempPath,
    fileSize: (await fs.stat(tempPath)).size
  };
}

/**
 * Generate CSV report
 */
async function generateCSVReport({
  template,
  data,
  options,
  executionId
}: {
  template: any;
  data: any[];
  options: any;
  executionId: string;
}) {
  const tempPath = path.join(process.cwd(), 'temp', `${executionId}_temp.csv`);
  await fs.mkdir(path.dirname(tempPath), { recursive: true });

  let csvContent = '';

  if (options.includeHeaders && data.length > 0) {
    const headers = Object.keys(data[0]);
    csvContent += headers.join(',') + '\n';
  }

  for (const row of data) {
    const values = Object.values(row).map(value => 
      value === null || value === undefined ? '' : `"${String(value).replace(/"/g, '""')}"`
    );
    csvContent += values.join(',') + '\n';
  }

  await fs.writeFile(tempPath, csvContent, 'utf8');

  return {
    filePath: tempPath,
    fileSize: (await fs.stat(tempPath)).size
  };
}

/**
 * Generate HTML report
 */
async function generateHTMLReport({
  template,
  data,
  options,
  executionId
}: {
  template: any;
  data: any[];
  options: any;
  executionId: string;
}) {
  const tempPath = path.join(process.cwd(), 'temp', `${executionId}_temp.html`);
  await fs.mkdir(path.dirname(tempPath), { recursive: true });

  const htmlContent = await ReportTemplateEngine.renderTemplatePreview({
    ...template,
    layout: template.layout || [],
    data
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.name || 'Report'}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: ${options.margins?.top || 20}px ${options.margins?.right || 20}px;
        }
        .report-container { 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        @media print { 
          body { margin: 0; }
          .report-container { max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        ${htmlContent}
        ${options.includeFooter ? `
          <footer style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
            Generated on ${new Date().toLocaleDateString()} by Disaster Management System
          </footer>
        ` : ''}
      </div>
    </body>
    </html>
  `;

  await fs.writeFile(tempPath, fullHtml, 'utf8');

  return {
    filePath: tempPath,
    fileSize: (await fs.stat(tempPath)).size
  };
}

/**
 * Generate Excel report
 */
async function generateExcelReport({
  template,
  data,
  options,
  executionId
}: {
  template: any;
  data: any[];
  options: any;
  executionId: string;
}) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet(template.name || 'Report');

  if (options.includeHeaders && data.length > 0) {
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    
    worksheet.getRow(1).eachCell((cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    });
  }

  for (const row of data) {
    worksheet.addRow(Object.values(row));
  }

  worksheet.columns.forEach((column: any) => {
    if (column.eachCell) {
      let maxLength = 0;
      column.eachCell((cell: any) => {
        const columnValue = cell.value ? cell.value.toString() : '';
        if (columnValue.length > maxLength) {
          maxLength = columnValue.length;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    }
  });

  const tempPath = path.join(process.cwd(), 'temp', `${executionId}_temp.xlsx`);
  await workbook.xlsx.writeFile(tempPath);

  return {
    filePath: tempPath,
    fileSize: (await fs.stat(tempPath)).size
  };
}

/**
 * Add element to PDF
 */
async function addPDFElement(doc: any, element: any, data: any[], options: any) {
  const position = element.position;
  
  switch (element.type) {
    case 'header':
      doc.fontSize(options.fontSize === 'large' ? 24 : 18);
      doc.font('Helvetica-Bold');
      doc.text(element.config.title || 'Report', position.x * 50, position.y * 20 + 40);
      
      if (element.config.showDate) {
        doc.fontSize(12);
        doc.font('Helvetica');
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, position.x * 50, position.y * 20 + 70);
      }
      break;

    case 'text':
      doc.fontSize(12);
      doc.font('Helvetica');
      const text = element.config.content || '';
      doc.text(text, position.x * 50, position.y * 20 + 20);
      break;

    case 'kpi':
      doc.fontSize(16);
      doc.font('Helvetica-Bold');
      doc.text(element.config.title || 'KPI', position.x * 50, position.y * 20 + 20);
      
      doc.fontSize(24);
      doc.text(element.config.value?.toString() || '0', position.x * 50, position.y * 20 + 50);
      break;

    case 'table':
      if (data.length > 0) {
        const columns = element.config.columns || Object.keys(data[0]);
        const startY = position.y * 20 + 20;
        
        doc.fontSize(10);
        doc.font('Helvetica-Bold');
        let currentY = startY;
        
        columns.forEach((column: string, index: number) => {
          doc.text(column, position.x * 50 + index * 100, currentY);
        });
        
        currentY += 20;
        
        doc.font('Helvetica');
        data.slice(0, 20).forEach((row) => {
          columns.forEach((column: string, index: number) => {
            doc.text(String(row[column] || ''), position.x * 50 + index * 100, currentY);
          });
          currentY += 15;
        });
      }
      break;

    default:
      doc.fontSize(12);
      doc.font('Helvetica');
      doc.text(`[${element.type.toUpperCase()}]`, position.x * 50, position.y * 20 + 20);
      break;
  }
}

function inferDataSourceFromTemplate(template: any): string {
  switch (template.type) {
    case 'ASSESSMENT':
      return 'assessments';
    case 'RESPONSE':
      return 'responses';
    case 'ENTITY':
      return 'entities';
    case 'DONOR':
      return 'donors';
    case 'CUSTOM':
    default:
      return 'assessments';
  }
}

function getEstimatedGenerationTime(template: any, filters: any, format: string): number {
  const baseTime = {
    'PDF': 30,
    'CSV': 5,
    'HTML': 10,
    'EXCEL': 15
  };

  const complexityMultiplier = template.layout?.length || 1;
  const dataMultiplier = Math.min((filters.limit || 1000) / 1000, 2);

  return (baseTime[format as keyof typeof baseTime] || 30) * complexityMultiplier * dataMultiplier;
}

function generateFilename(template: any, format: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const name = template.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'report';
  return `${name}_${timestamp}.${format.toLowerCase()}`;
}

function getNextScheduledRun(schedule: any): Date {
  const now = new Date();
  let nextRun = new Date(schedule.startDate);

  switch (schedule.frequency) {
    case 'once':
      return nextRun;
    case 'daily':
      while (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      return nextRun;
    case 'weekly':
      while (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
      return nextRun;
    case 'monthly':
      while (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      return nextRun;
    default:
      return nextRun;
  }
}

async function sendReportNotifications(
  executionId: string, 
  filePath: string, 
  filename: string, 
  fileSize: number
): Promise<void> {
  try {
    const execution = await db.reportExecution.findFirst({
      where: { id: executionId },
      include: {
        configuration: {
          include: {
            template: true
          }
        }
      }
    });

    if (!execution) return;

    const scheduleFile = path.join(process.cwd(), 'schedules', `${executionId}.json`);
    const hasSchedule = await fs.access(scheduleFile).then(() => true).catch(() => false);

    if (hasSchedule) {
      const scheduleData = JSON.parse(await fs.readFile(scheduleFile, 'utf8'));
      
      for (const recipient of scheduleData.recipients || []) {
      }
    }

    await db.auditLog.create({
      data: {
        userId: execution.configuration?.createdBy || 'system',
        action: 'REPORT_GENERATED',
        resource: 'ReportExecution',
        resourceId: executionId,
        newValues: {
          format: execution.format,
          fileSize,
          filePath,
          generatedAt: new Date(),
          templateName: execution.configuration?.template?.name
        }
      }
    });

  } catch (error) {
    console.error('Error sending report notifications:', error);
  }
}
