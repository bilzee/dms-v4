/**
 * Report Generation API Routes
 * POST - Generate report from configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { DataAggregator, ReportFilters, ReportFiltersSchema } from '@/lib/reports/data-aggregator';
import { ReportTemplateEngine } from '@/lib/reports/template-engine';
import { createApiResponse } from '@/types/api';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { handleApiError } from '@/lib/api/response'

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
    const allowedRoles = ['ADMIN', 'COORDINATOR'];
    if (!context.roles.some(role => allowedRoles.includes(role))) {
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
      const configuration = await prisma.reportConfiguration.findFirst({
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
      
      const tempConfig = await prisma.reportConfiguration.create({
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
      const tempTemplate = await prisma.reportTemplate.create({
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
      
      const tempConfig = await prisma.reportConfiguration.create({
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

    const execution = await prisma.reportExecution.create({
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
      
      prisma.reportExecution.update({
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
    return handleApiError(error)
  }
});

/**
 * POST /api/v1/reports/schedule
 * Schedule automated report generation
 */
export const PUT = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const allowedRoles = ['ADMIN', 'COORDINATOR'];
    if (!context.roles.some(role => allowedRoles.includes(role))) {
      return NextResponse.json(
        createApiResponse(false, null, 'Insufficient permissions to schedule reports'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = ScheduleReportSchema.parse(body);

    const configuration = await prisma.reportConfiguration.findFirst({
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

    const scheduledExecution = await prisma.reportExecution.create({
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
    return handleApiError(error)
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
    await prisma.reportExecution.update({
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
      `${executionId}.${formatToExtension(format)}`
    );
    
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.rename(filePath, finalPath);

    const fileStats = await fs.stat(finalPath);

    await prisma.reportExecution.update({
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
    
    await prisma.reportExecution.update({
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
  const { PDFDocument: PdfDoc, StandardFonts, rgb } = require('pdf-lib');

  const pdfDoc = await PdfDoc.create();
  pdfDoc.setTitle(template.name || 'Report');
  pdfDoc.setAuthor('Disaster Management System');
  pdfDoc.setSubject(template.description || 'Generated Report');
  pdfDoc.setCreator('Disaster Management PWA');
  pdfDoc.setProducer('Custom Report Builder');

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY - neededHeight < margin) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
    }
  };

  if (template.layout) {
    for (const element of template.layout) {
      const pos = element.position || { x: 0, y: 0, width: 12, height: 4 };
      const x = margin + (pos.x * 42);
      const width = (pos.width || 12) * 42;

      switch (element.type) {
        case 'header': {
          const title = element.config?.title || template.name || 'Report';
          const fontSize = options?.fontSize === 'large' ? 24 : 18;
          checkPageBreak(fontSize + 30);
          currentPage.drawText(title, {
            x, y: currentY, size: fontSize, font: boldFont, color: rgb(0.1, 0.1, 0.1)
          });
          currentY -= fontSize + 4;

          if (element.config?.showDate) {
            currentPage.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
              x, y: currentY, size: 10, font, color: rgb(0.4, 0.4, 0.4)
            });
            currentY -= 20;
          }
          if (element.config?.showFilters && template.description) {
            currentPage.drawText(template.description, {
              x, y: currentY, size: 9, font, color: rgb(0.5, 0.5, 0.5)
            });
            currentY -= 20;
          }
          currentY -= 10;
          break;
        }
        case 'text':
        case 'section': {
          const text = element.config?.content || element.config?.subtitle || '';
          if (text) {
            checkPageBreak(20);
            currentPage.drawText(text, {
              x, y: currentY, size: 11, font, color: rgb(0.2, 0.2, 0.2)
            });
            currentY -= 20;
          }
          break;
        }
        case 'kpi': {
          const title = element.config?.title || 'KPI';
          checkPageBreak(50);
          currentPage.drawRectangle({
            x, y: currentY - 45, width: Math.min(width, pageWidth - margin - x), height: 55,
            color: rgb(0.91, 0.95, 0.98), borderColor: rgb(0.78, 0.86, 0.93), borderWidth: 0.5
          });
          currentPage.drawText(title, {
            x: x + 10, y: currentY, size: 11, font: boldFont, color: rgb(0.15, 0.25, 0.4)
          });
          currentY -= 18;

          const vizMetrics = element.visualization?.config?.metrics || [];
          if (vizMetrics.length > 0) {
            let metricX = x + 10;
            for (const metric of vizMetrics) {
              let value = 0;
              if (metric.field === 'totalAssessments') {
                value = data.length;
              } else if (metric.field === 'completedAssessments') {
                value = data.filter((d: any) => d.verificationStatus === 'VERIFIED' || d.verificationStatus === 'AUTO_VERIFIED').length;
              } else if (metric.field === 'pendingVerification') {
                value = data.filter((d: any) => d.verificationStatus === 'PENDING' || d.verificationStatus === 'SUBMITTED').length;
              } else if (metric.aggregation === 'count') {
                value = data.length;
              }
              if (metricX + 140 > pageWidth - margin) break;
              currentPage.drawText(String(value), {
                x: metricX, y: currentY, size: 20, font: boldFont, color: rgb(0.1, 0.35, 0.6)
              });
              currentPage.drawText(String(metric.label || ''), {
                x: metricX, y: currentY - 14, size: 8, font, color: rgb(0.45, 0.45, 0.45)
              });
              metricX += 140;
            }
            currentY -= 30;
          } else {
            const total = data.length;
            const verified = data.filter((d: any) => d.verificationStatus === 'VERIFIED' || d.verificationStatus === 'AUTO_VERIFIED').length;
            currentPage.drawText(String(total), {
              x: x + 10, y: currentY, size: 20, font: boldFont, color: rgb(0.1, 0.35, 0.6)
            });
            currentPage.drawText('Total', {
              x: x + 10, y: currentY - 14, size: 8, font, color: rgb(0.45, 0.45, 0.45)
            });
            currentPage.drawText(String(verified), {
              x: x + 150, y: currentY, size: 20, font: boldFont, color: rgb(0.1, 0.5, 0.3)
            });
            currentPage.drawText('Verified', {
              x: x + 150, y: currentY - 14, size: 8, font, color: rgb(0.45, 0.45, 0.45)
            });
            currentY -= 30;
          }
          currentY -= 10;
          break;
        }
        case 'chart': {
          const chartTitle = element.config?.title || 'Chart';
          checkPageBreak(60);
          currentPage.drawRectangle({
            x, y: currentY - 40, width: Math.min(width, pageWidth - margin - x), height: 50,
            color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 0.5
          });
          currentPage.drawText(chartTitle, {
            x: x + 8, y: currentY - 10, size: 10, font: boldFont, color: rgb(0.3, 0.3, 0.3)
          });
          currentPage.drawText('[Chart visualization - see interactive version]', {
            x: x + 8, y: currentY - 30, size: 8, font, color: rgb(0.6, 0.6, 0.6)
          });
          currentY -= 60;
          break;
        }
        case 'table': {
          const tableTitle = element.config?.title || 'Data';
          checkPageBreak(40);
          currentPage.drawText(tableTitle, {
            x, y: currentY, size: 11, font: boldFont, color: rgb(0.2, 0.2, 0.2)
          });
          currentY -= 16;

          const columns = element.config?.columns || (data.length > 0 ? Object.keys(data[0]) : []);
          const colHeaders = columns.map((c: any) => c.header || c.field || c);
          const colFields = columns.map((c: any) => c.field || c);
          const colWidth = Math.min(Math.floor((pageWidth - 2 * margin) / colHeaders.length), 120);

          if (colHeaders.length > 0) {
            checkPageBreak(16);
            currentPage.drawRectangle({
              x, y: currentY - 4, width: colHeaders.length * colWidth, height: 16,
              color: rgb(0.94, 0.94, 0.94)
            });
            colHeaders.forEach((h: string, i: number) => {
              if (x + i * colWidth < pageWidth - margin) {
                const truncated = h.length > 15 ? h.substring(0, 14) + '..' : h;
                currentPage.drawText(truncated, {
                  x: x + i * colWidth + 4, y: currentY, size: 8, font: boldFont, color: rgb(0.2, 0.2, 0.2)
                });
              }
            });
            currentY -= 18;
          }

          const rows = data.slice(0, element.config?.pagination?.pageSize || 20);
          for (const row of rows) {
            checkPageBreak(14);
            colFields.forEach((field: string, i: number) => {
              if (x + i * colWidth < pageWidth - margin) {
                const val = String(row[field] ?? '');
                const truncated = val.length > 18 ? val.substring(0, 17) + '..' : val;
                currentPage.drawText(truncated, {
                  x: x + i * colWidth + 4, y: currentY, size: 8, font, color: rgb(0.3, 0.3, 0.3)
                });
              }
            });
            currentY -= 14;
          }
          currentY -= 10;
          break;
        }
        case 'map': {
          const mapTitle = element.config?.title || 'Map';
          checkPageBreak(60);
          currentPage.drawRectangle({
            x, y: currentY - 50, width: Math.min(width, pageWidth - margin - x), height: 60,
            color: rgb(0.93, 0.95, 0.97), borderColor: rgb(0.8, 0.85, 0.9), borderWidth: 0.5
          });
          currentPage.drawText(mapTitle, {
            x: x + 8, y: currentY - 10, size: 10, font: boldFont, color: rgb(0.2, 0.3, 0.4)
          });
          currentPage.drawText('[Map visualization - see interactive version]', {
            x: x + 8, y: currentY - 30, size: 8, font, color: rgb(0.5, 0.6, 0.65)
          });
          currentY -= 70;
          break;
        }
        default: {
          checkPageBreak(20);
          currentPage.drawText(`[${(element.type || 'unknown').toUpperCase()}]`, {
            x, y: currentY, size: 10, font, color: rgb(0.6, 0.6, 0.6)
          });
          currentY -= 20;
          break;
        }
      }
    }
  }

  if (data.length === 0) {
    checkPageBreak(20);
    currentPage.drawText('No data available for the selected filters.', {
      x: margin, y: currentY, size: 11, font, color: rgb(0.5, 0.5, 0.5)
    });
  }

  currentPage.drawText(`Page 1 of ${pdfDoc.getPageCount()}`, {
    x: pageWidth / 2 - 30, y: 20, size: 8, font, color: rgb(0.6, 0.6, 0.6)
  });

  const pdfBytes = await pdfDoc.save();
  const tempPath = path.join(process.cwd(), 'temp', `${executionId}_temp.pdf`);
  await fs.mkdir(path.dirname(tempPath), { recursive: true });
  await fs.writeFile(tempPath, Buffer.from(pdfBytes));

  return {
    filePath: tempPath,
    fileSize: pdfBytes.length
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

  const tableElement = (template.layout || []).find((el: any) => el.type === 'table');
  const columnDefs: Array<{ field: string; header: string }> = tableElement?.visualization?.config?.columns || [];

  const fieldAliases: Record<string, string[]> = {
    status: ['verificationStatus', 'deliveryStatus', 'status'],
    date: ['rapidAssessmentDate', 'responseDate', 'date', 'createdAt'],
    type: ['rapidAssessmentType', 'type', 'responseType'],
  };

  const resolveField = (obj: any, fieldPath: string): string => {
    if (!obj) return '';
    const parts = fieldPath.split('.');
    let current: any = obj;
    for (const part of parts) {
      if (current == null) return '';
      current = current[part];
    }
    if (current == null || current === '') return '';
    if (current instanceof Date) return current.toISOString().split('T')[0];
    if (typeof current === 'object') return JSON.stringify(current);
    return String(current);
  };

  const flattenValue = (obj: any, fieldPath: string): string => {
    const direct = resolveField(obj, fieldPath);
    if (direct) return direct;
    const aliases = fieldAliases[fieldPath];
    if (aliases) {
      for (const alias of aliases) {
        if (alias === fieldPath) continue;
        const val = resolveField(obj, alias);
        if (val) return val;
      }
    }
    return '';
  };

  let columns: Array<{ field: string; header: string }>;
  if (columnDefs.length > 0) {
    columns = columnDefs.map((c: any) => ({
      field: c.field || c,
      header: c.header || c.field || c
    }));
  } else if (data.length > 0) {
    const flatKeys = new Set<string>();
    for (const row of data.slice(0, 10)) {
      for (const key of Object.keys(row)) {
        if (row[key] == null || typeof row[key] !== 'object') {
          flatKeys.add(key);
        }
      }
    }
    columns = Array.from(flatKeys).map(k => ({ field: k, header: k }));
  } else {
    columns = [];
  }

  let csvContent = '';

  if (options.includeHeaders !== false && columns.length > 0) {
    csvContent += columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',') + '\n';
  }

  for (const row of data) {
    const values = columns.map(col => {
      const val = flattenValue(row, col.field);
      return val === '' ? '' : `"${val.replace(/"/g, '""')}"`;
    });
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

  const previewJson = ReportTemplateEngine.renderTemplatePreview({
    ...template,
    layout: template.layout || [],
  }, { assessments: data });

  let previewHtml = '';
  try {
    const parsed = JSON.parse(previewJson);
    previewHtml = parsed.preview || '';
  } catch {
    previewHtml = previewJson;
  }

  const fullHtml = `<!DOCTYPE html>
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
      background: #ffffff;
      color: #1a1a1a;
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
    ${previewHtml}
    ${options.includeFooter !== false ? `
    <footer style="margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 12px;">
      Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} by Disaster Management System
    </footer>` : ''}
  </div>
</body>
</html>`;

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

  const tableElement = (template.layout || []).find((el: any) => el.type === 'table');
  const columnDefs: Array<{ field: string; header: string }> = tableElement?.visualization?.config?.columns || [];

  const fieldAliases: Record<string, string[]> = {
    status: ['verificationStatus', 'deliveryStatus', 'status'],
    date: ['rapidAssessmentDate', 'responseDate', 'date', 'createdAt'],
    type: ['rapidAssessmentType', 'type', 'responseType'],
  };

  const resolveField = (obj: any, fieldPath: string): string => {
    if (!obj) return '';
    const parts = fieldPath.split('.');
    let current: any = obj;
    for (const part of parts) {
      if (current == null) return '';
      current = current[part];
    }
    if (current == null || current === '') return '';
    if (current instanceof Date) return current.toISOString().split('T')[0];
    if (typeof current === 'object') return JSON.stringify(current);
    return String(current);
  };

  const flattenValue = (obj: any, fieldPath: string): string => {
    const direct = resolveField(obj, fieldPath);
    if (direct) return direct;
    const aliases = fieldAliases[fieldPath];
    if (aliases) {
      for (const alias of aliases) {
        if (alias === fieldPath) continue;
        const val = resolveField(obj, alias);
        if (val) return val;
      }
    }
    return '';
  };

  let columns: Array<{ field: string; header: string }>;
  if (columnDefs.length > 0) {
    columns = columnDefs.map((c: any) => ({
      field: c.field || c,
      header: c.header || c.field || c
    }));
  } else if (data.length > 0) {
    const flatKeys = new Set<string>();
    for (const row of data.slice(0, 10)) {
      for (const key of Object.keys(row)) {
        if (row[key] == null || typeof row[key] !== 'object') {
          flatKeys.add(key);
        }
      }
    }
    columns = Array.from(flatKeys).map(k => ({ field: k, header: k }));
  } else {
    columns = [];
  }

  if (options.includeHeaders !== false && columns.length > 0) {
    worksheet.addRow(columns.map(c => c.header));
    worksheet.getRow(1).eachCell((cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    });
  }

  for (const row of data) {
    worksheet.addRow(columns.map(col => flattenValue(row, col.field)));
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

function formatToExtension(format: string): string {
  const map: Record<string, string> = { PDF: 'pdf', CSV: 'csv', HTML: 'html', EXCEL: 'xlsx' };
  return map[format] || format.toLowerCase();
}

function generateFilename(template: any, format: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const name = template.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'report';
  return `${name}_${timestamp}.${formatToExtension(format)}`;
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
    const execution = await prisma.reportExecution.findFirst({
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

    await prisma.auditLog.create({
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
