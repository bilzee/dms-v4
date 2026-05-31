import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

const ReportRequestSchema = z.object({
  reportType: z.enum([
    'incident-overview',
    'assessment-summary', 
    'response-activity',
    'resource-allocation',
    'entity-status',
    'custom-dashboard'
  ]),
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
  filters: z.record(z.any()).optional(),
  sections: z.array(z.string()).optional(),
  format: z.enum(['pdf', 'html']).default('pdf'),
  options: z.object({
    includeCharts: z.boolean().default(true),
    includeMaps: z.boolean().default(true),
    includeImages: z.boolean().default(false),
    pageSize: z.enum(['A4', 'Letter']).default('A4'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    watermark: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
  }).optional(),
  recipients: z.array(z.object({
    email: z.string().email(),
    role: z.string().optional(),
  })).optional(),
});

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ASSESSOR: ['incident-overview', 'assessment-summary'],
  COORDINATOR: ['incident-overview', 'assessment-summary', 'response-activity', 'resource-allocation', 'entity-status'],
  RESPONDER: ['response-activity', 'resource-allocation', 'entity-status'],
  DONOR: ['response-activity'],
  ADMIN: ['incident-overview', 'assessment-summary', 'response-activity', 'resource-allocation', 'entity-status', 'custom-dashboard'],
};

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Use context.roles instead of (context.user as any).role
    const allowedReports = context.roles
      .flatMap(role => ROLE_PERMISSIONS[role] || []);
    const uniqueAllowed = [...new Set(allowedReports)];

    const body = await request.json();
    const validatedData = ReportRequestSchema.parse(body);

    // Check role-based permissions
    if (!uniqueAllowed.includes(validatedData.reportType)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for this report type' },
        { status: 403 }
      );
    }

    // Generate report job
    const jobId = `report_${Date.now()}_${crypto.randomUUID().split('-')[0]}`;
    
    // Start report generation asynchronously
    generatePDFReport(jobId, validatedData, context.user)
      .then(async (result) => {
        if (result.success) {
          // Store completed job
          await storeReportJob(jobId, {
            ...result,
            userId: context.userId,
            createdAt: new Date(),
          });
        }
      })
      .catch(error => {
        console.error('Report generation error:', error);
        // Store failed job
        storeReportJob(jobId, {
          success: false,
          error: error.message,
          userId: context.userId,
          createdAt: new Date(),
        });
      });

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        estimatedTime: getEstimatedProcessingTime(validatedData.reportType),
        status: 'processing',
      },
    });
  } catch (error) {
    console.error('Report generation request error:', error);
    return NextResponse.json(
      { success: false, error: 'Report generation failed' },
      { status: 500 }
    );
  }
});

async function generatePDFReport(
  jobId: string, 
  request: z.infer<typeof ReportRequestSchema>, 
  user: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { reportType, dateRange, filters, sections, options } = request;

    // Collect report data based on type
    const reportData = await collectReportData(reportType, dateRange, filters, user);

    // Generate PDF content
    const pdfContent = await generatePDFContent(reportData, {
      reportType,
      dateRange,
      options: {
        includeCharts: true,
        includeMaps: true,
        includeImages: false,
        pageSize: 'A4',
        orientation: 'portrait',
        title: options?.title || getDefaultReportTitle(reportType),
        subtitle: options?.subtitle,
        watermark: options?.watermark,
        ...options,
      },
      sections,
    });

    // Save to temporary storage (in production, use cloud storage)
    const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
    const fileUrl = `/api/v1/exports/download/${jobId}`;

    return {
      success: true,
      data: {
        jobId,
        filename,
        fileUrl,
        size: pdfContent.length,
        generatedAt: new Date(),
        reportType,
        dateRange,
      },
    };
  } catch (error) {
    console.error('PDF generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

async function collectReportData(
  reportType: string,
  dateRange: { startDate: string; endDate: string },
  filters?: Record<any, any>,
  user?: any
): Promise<any> {
  const { startDate, endDate } = dateRange;

  switch (reportType) {
    case 'incident-overview':
      return collectIncidentOverviewData(startDate, endDate, filters);
    case 'assessment-summary':
      return collectAssessmentSummaryData(startDate, endDate, filters);
    case 'response-activity':
      return collectResponseActivityData(startDate, endDate, filters, user);
    case 'resource-allocation':
      return collectResourceAllocationData(startDate, endDate, filters);
    case 'entity-status':
      return collectEntityStatusData(startDate, endDate, filters);
    case 'custom-dashboard':
      return collectCustomDashboardData(startDate, endDate, filters);
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}

async function collectIncidentOverviewData(startDate: string, endDate: string, filters?: Record<any, any>) {
  const incidents = await prisma.incident.findMany({
    where: {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      ...(filters && {
        type: filters.type,
        severity: filters.severity,
        status: filters.status,
        locationId: filters.locationId,
      }),
    },
    include: {
      _count: {
        select: {
          rapidAssessments: true,
          preliminaryAssessments: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const incidentStats = await prisma.incident.groupBy({
    by: ['type', 'severity', 'status'],
    where: {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    _count: true,
  });

  const timelineData = await prisma.incident.findMany({
    where: {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    select: {
      id: true,
      type: true,
      severity: true,
      createdAt: true,
      location: true,
      coordinates: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return {
    incidents,
    stats: incidentStats,
    timeline: timelineData,
    summary: {
      totalIncidents: incidents.length,
      averageSeverity: incidents.reduce((sum, i) => sum + getSeverityScore(i.severity), 0) / incidents.length,
      activeIncidents: incidents.filter(i => i.status === 'ACTIVE').length,
      resolvedIncidents: incidents.filter(i => i.status === 'RESOLVED').length,
    },
  };
}

async function collectAssessmentSummaryData(startDate: string, endDate: string, filters?: Record<any, any>) {
  const assessments = await prisma.rapidAssessment.findMany({
    where: {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      ...(filters && {
        assessmentType: filters.assessmentType,
        verificationStatus: filters.verificationStatus,
        locationId: filters.locationId,
      }),
    },
    include: {
      assessor: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const assessmentStats = await prisma.rapidAssessment.groupBy({
    by: ['rapidAssessmentType', 'verificationStatus', 'priority'],
    where: {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    _count: true,
  });

  const needsAnalysis = {
    totalAssessments: assessments.length,
    highPriorityAssessments: assessments.filter(a => a.priority === 'HIGH').length,
    unverifiedAssessments: assessments.filter(a => a.verificationStatus === 'DRAFT').length,
    assessmentsByType: assessmentStats.reduce((acc, stat) => {
      acc[stat.rapidAssessmentType] = (acc[stat.rapidAssessmentType] || 0) + stat._count;
      return acc;
    }, {} as Record<string, number>),
  };

  return {
    assessments,
    stats: assessmentStats,
    needsAnalysis,
    summary: {
      totalAssessments: assessments.length,
      verifiedAssessments: assessments.filter(a => a.verificationStatus === 'VERIFIED').length,
      averagePriority: assessments.filter(a => a.priority === 'HIGH').length / assessments.length * 100,
      completionRate: assessments.filter(a => a.verificationStatus === 'VERIFIED').length / assessments.length * 100,
    },
  };
}

async function collectResponseActivityData(startDate: string, endDate: string, filters?: Record<any, any>, user?: any) {
  const whereClause: any = {
    createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
    ...(filters && {
      status: filters.status,
      responsePriority: filters.responsePriority,
      assessmentId: filters.assessmentId,
      entityId: filters.entityId,
    }),
  };

  // Donors can only see their own response activities
  if (user?.role === 'donor') {
    whereClause.commitment = {
      donorId: user.organizationId,
    };
  }

  const responses = await prisma.rapidResponse.findMany({
    where: whereClause,
    include: {
      assessment: {
        select: { id: true, rapidAssessmentType: true, location: true },
      },
      entity: {
        select: { id: true, name: true, type: true, coordinates: true },
      },
      responder: {
        select: { id: true, name: true, email: true },
      },
      planCommitments: {
        select: { commitment: { select: { id: true, status: true, donor: { select: { name: true, type: true } } } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const responseStats = await prisma.rapidResponse.groupBy({
    by: ['deliveryStatus', 'priority'],
    where: {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    _count: true,
  });

  return {
    responses,
    stats: responseStats,
    summary: {
      totalResponses: responses.length,
      deliveredResponses: responses.filter(r => r.deliveryStatus === 'DELIVERED').length,
      plannedResponses: responses.filter(r => r.deliveryStatus === 'PLANNED').length,
      responsesByPriority: responses.reduce((acc, r) => {
        acc[r.priority] = (acc[r.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  };
}

async function collectResourceAllocationData(startDate: string, endDate: string, filters?: Record<any, any>) {
  const commitments = await prisma.donorCommitment.findMany({
    where: {
      commitmentDate: { gte: new Date(startDate), lte: new Date(endDate) },
      ...(filters && {
        status: filters.status,
        donorId: filters.donorId,
        entityId: filters.entityId,
        incidentId: filters.incidentId,
      }),
    },
    include: {
      donor: {
        select: { id: true, name: true, type: true },
      },
      entity: {
        select: { id: true, name: true, type: true, coordinates: true },
      },
      incident: {
        select: { id: true, name: true, type: true, severity: true },
      },
    },
    orderBy: { commitmentDate: 'desc' },
  });

  const resourceStats = await prisma.donorCommitment.groupBy({
    by: ['status'],
    where: {
      commitmentDate: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    _count: true,
  });

  const totalCommitted = commitments.reduce((sum, c) => sum + c.totalCommittedQuantity, 0);
  
  const totalDelivered = commitments.reduce((sum, c) => sum + c.deliveredQuantity, 0);

  return {
    commitments,
    stats: resourceStats,
    summary: {
      totalCommitments: commitments.length,
      totalCommitted,
      totalDelivered,
      fulfillmentRate: totalCommitted > 0 ? (totalDelivered / totalCommitted) * 100 : 0,
      plannedCommitments: commitments.filter(c => c.status === 'PLANNED').length,
    },
  };
}

async function collectEntityStatusData(startDate: string, endDate: string, filters?: Record<any, any>) {
  const entities = await prisma.entity.findMany({
    where: {
      ...(filters && {
        type: filters.type,
        jurisdictionId: filters.jurisdictionId,
      }),
    },
    include: {
      _count: {
        select: {
          rapidAssessments: true,
          responses: true,
          commitments: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const entityStats = await prisma.entity.groupBy({
    by: ['type'],
    _count: true,
  });

  return {
    entities,
    stats: entityStats,
    summary: {
      totalEntities: entities.length,
      activeEntities: entities.filter(e => e.isActive).length,
      entitiesByType: entityStats.reduce((acc, stat) => {
        acc[stat.type] = (acc[stat.type] || 0) + stat._count;
        return acc;
      }, {} as Record<string, number>),
    },
  };
}

async function collectCustomDashboardData(startDate: string, endDate: string, filters?: Record<any, any>) {
  // Combine data from multiple sources for custom dashboard reports
  const [incidentData, assessmentData, responseData, resourceData] = await Promise.all([
    collectIncidentOverviewData(startDate, endDate, filters),
    collectAssessmentSummaryData(startDate, endDate, filters),
    collectResponseActivityData(startDate, endDate, filters),
    collectResourceAllocationData(startDate, endDate, filters),
  ]);

  return {
    incidents: incidentData,
    assessments: assessmentData,
    responses: responseData,
    resources: resourceData,
    summary: {
      totalIncidents: incidentData.summary.totalIncidents,
      totalAssessments: assessmentData.summary.totalAssessments,
      totalResponses: responseData.summary.totalResponses,
      totalResources: resourceData.summary.totalCommitments,
    },
  };
}

async function generatePDFContent(data: any, options: any): Promise<Buffer> {
  // Generate HTML content first
  const htmlContent = generateHTMLReport(data, options);
  
  // In production, you would use libraries like puppeteer, pdfkit, or weasyprint
  // For now, we'll create a simple HTML representation
  return Buffer.from(htmlContent, 'utf8');
}

function generateHTMLReport(data: any, options: any): string {
  const { reportType, dateRange, options: reportOptions } = options;
  const { startDate, endDate } = dateRange;
  
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportOptions.title}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 20px; 
          line-height: 1.6; 
          color: #333;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #3b82f6; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .title { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
        .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 5px; }
        .date-range { font-size: 12px; color: #9ca3af; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: bold; color: #374151; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 10px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
        .summary-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
        .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
        th { background-color: #f9fafb; font-weight: bold; color: #374151; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; text-align: center; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 72px; color: rgba(59, 130, 246, 0.1); font-weight: bold; z-index: -1; }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>
      ${reportOptions.watermark ? `<div class="watermark">${reportOptions.watermark}</div>` : ''}
      
      <div class="header">
        <div class="title">${reportOptions.title}</div>
        ${reportOptions.subtitle ? `<div class="subtitle">${reportOptions.subtitle}</div>` : ''}
        <div class="date-range">Report Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</div>
        <div class="date-range">Generated: ${new Date().toLocaleDateString()}</div>
      </div>
  `;

  // Add summary section
  if (data.summary) {
    html += generateSummarySection(data.summary);
  }

  // Add specific sections based on report type
  switch (reportType) {
    case 'incident-overview':
      html += generateIncidentOverviewSection(data);
      break;
    case 'assessment-summary':
      html += generateAssessmentSummarySection(data);
      break;
    case 'response-activity':
      html += generateResponseActivitySection(data);
      break;
    case 'resource-allocation':
      html += generateResourceAllocationSection(data);
      break;
    case 'entity-status':
      html += generateEntityStatusSection(data);
      break;
    case 'custom-dashboard':
      html += generateCustomDashboardSection(data);
      break;
  }

  html += `
      <div class="footer">
        <p>This report was generated by the Disaster Management System.</p>
        <p>For questions or additional information, please contact the system administrator.</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

function generateSummarySection(summary: any): string {
  return `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary-grid">
        ${Object.entries(summary).map(([key, value]) => `
          <div class="summary-card">
            <div class="summary-value">${typeof value === 'number' ? value.toLocaleString() : value}</div>
            <div class="summary-label">${formatKeyForDisplay(key)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function generateIncidentOverviewSection(data: any): string {
  if (!data.incidents || data.incidents.length === 0) {
    return '<div class="section"><div class="section-title">Incident Overview</div><p>No incidents found in the selected period.</p></div>';
  }

  let html = `
    <div class="section">
      <div class="section-title">Incident Overview</div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Type</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Location</th>
            <th>Created Date</th>
            <th>Assessments</th>
            <th>Responses</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.incidents.forEach((incident: any) => {
    html += `
      <tr>
        <td>${incident.id}</td>
        <td>${incident.title || 'N/A'}</td>
        <td>${incident.type}</td>
        <td>${incident.severity}</td>
        <td>${incident.status}</td>
        <td>${incident.location?.name || 'N/A'}</td>
        <td>${new Date(incident.createdAt).toLocaleDateString()}</td>
        <td>${incident._count?.assessments || 0}</td>
        <td>${incident._count?.responses || 0}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

function generateAssessmentSummarySection(data: any): string {
  if (!data.assessments || data.assessments.length === 0) {
    return '<div class="section"><div class="section-title">Assessment Summary</div><p>No assessments found in the selected period.</p></div>';
  }

  let html = `
    <div class="section">
      <div class="section-title">Assessment Summary</div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Location</th>
            <th>Population Affected</th>
            <th>Severity Score</th>
            <th>Created Date</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.assessments.forEach((assessment: any) => {
    html += `
      <tr>
        <td>${assessment.id}</td>
        <td>${assessment.assessmentType}</td>
        <td>${assessment.verificationStatus}</td>
        <td>${assessment.priorityLevel || 'N/A'}</td>
        <td>${assessment.location?.name || 'N/A'}</td>
        <td>${assessment.populationAffected || 0}</td>
        <td>${assessment.severityScore || 'N/A'}</td>
        <td>${new Date(assessment.createdAt).toLocaleDateString()}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

function generateResponseActivitySection(data: any): string {
  if (!data.responses || data.responses.length === 0) {
    return '<div class="section"><div class="section-title">Response Activity</div><p>No responses found in the selected period.</p></div>';
  }

  let html = `
    <div class="section">
      <div class="section-title">Response Activity</div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Entity</th>
            <th>Progress</th>
            <th>Assigned To</th>
            <th>Created Date</th>
            <th>Target Completion</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.responses.forEach((response: any) => {
    html += `
      <tr>
        <td>${response.id}</td>
        <td>${response.responsePriority}</td>
        <td>${response.deliveryStatus}</td>
        <td>${response.entity?.name || 'N/A'}</td>
        <td>${response.progressPercentage || 0}%</td>
        <td>${response.assignedTo?.name || 'Unassigned'}</td>
        <td>${new Date(response.createdAt).toLocaleDateString()}</td>
        <td>${response.targetCompletionDate ? new Date(response.targetCompletionDate).toLocaleDateString() : 'N/A'}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

function generateResourceAllocationSection(data: any): string {
  if (!data.commitments || data.commitments.length === 0) {
    return '<div class="section"><div class="section-title">Resource Allocation</div><p>No commitments found in the selected period.</p></div>';
  }

  let html = `
    <div class="section">
      <div class="section-title">Resource Allocation</div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Donor</th>
            <th>Entity</th>
            <th>Incident</th>
            <th>Status</th>
            <th>Total Items</th>
            <th>Priority</th>
            <th>Expected Delivery</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.commitments.forEach((commitment: any) => {
    html += `
      <tr>
        <td>${commitment.id}</td>
        <td>${commitment.donor?.name || 'N/A'}</td>
        <td>${commitment.entity?.name || 'N/A'}</td>
        <td>${commitment.incident?.title || 'N/A'}</td>
        <td>${commitment.status}</td>
        <td>${commitment._count?.items || 0}</td>
        <td>${commitment.priorityLevel || 'N/A'}</td>
        <td>${commitment.expectedDeliveryDate ? new Date(commitment.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

function generateEntityStatusSection(data: any): string {
  if (!data.entities || data.entities.length === 0) {
    return '<div class="section"><div class="section-title">Entity Status</div><p>No entities found.</p></div>';
  }

  let html = `
    <div class="section">
      <div class="section-title">Entity Status</div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Jurisdiction</th>
            <th>Population</th>
            <th>Capacity</th>
            <th>Current Load</th>
            <th>Assessments</th>
            <th>Responses</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.entities.forEach((entity: any) => {
    html += `
      <tr>
        <td>${entity.name}</td>
        <td>${entity.type}</td>
        <td>${entity.status}</td>
        <td>${entity.jurisdiction?.name || 'N/A'}</td>
        <td>${entity.populationSize || 0}</td>
        <td>${entity.capacity || 0}</td>
        <td>${entity.currentLoad || 0}</td>
        <td>${entity._count?.assessments || 0}</td>
        <td>${entity._count?.responses || 0}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

function generateCustomDashboardSection(data: any): string {
  let html = `
    <div class="section">
      <div class="section-title">Custom Dashboard Report</div>
  `;

  // Include all sections for comprehensive view
  html += generateIncidentOverviewSection(data.incidents);
  html += generateAssessmentSummarySection(data.assessments);
  html += generateResponseActivitySection(data.responses);
  html += generateResourceAllocationSection(data.resources);

  html += `</div>`;
  return html;
}

// Helper functions
function getSeverityScore(severity: string): number {
  const scores: Record<string, number> = {
    'LOW': 1,
    'MEDIUM': 2,
    'HIGH': 3,
    'CRITICAL': 4,
    'EXTREME': 5,
  };
  return scores[severity] || 1;
}

function getDefaultReportTitle(reportType: string): string {
  const titles: Record<string, string> = {
    'incident-overview': 'Incident Overview Report',
    'assessment-summary': 'Assessment Summary Report',
    'response-activity': 'Response Activity Report',
    'resource-allocation': 'Resource Allocation Report',
    'entity-status': 'Entity Status Report',
    'custom-dashboard': 'Custom Dashboard Report',
  };
  return titles[reportType] || 'Disaster Management Report';
}

function formatKeyForDisplay(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
}

function getEstimatedProcessingTime(reportType: string): number {
  const times: Record<string, number> = {
    'incident-overview': 30, // seconds
    'assessment-summary': 45,
    'response-activity': 35,
    'resource-allocation': 40,
    'entity-status': 25,
    'custom-dashboard': 60,
  };
  return times[reportType] || 45;
}

// Job storage (in production, use proper database storage)
async function storeReportJob(jobId: string, jobData: any): Promise<void> {
  // In production, store in database with proper cleanup
}

// Get report status
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      // Get specific job status
      // In production, fetch from database
      return NextResponse.json({
        success: true,
        data: {
          jobId,
          status: 'completed', // Mock status
          progress: 100,
          downloadUrl: jobId ? `/api/v1/exports/download/${jobId}` : null,
        },
      });
    } else {
      // Get available report types using context.roles
      const availableReports = context.roles
        .flatMap(role => ROLE_PERMISSIONS[role] || []);
      const uniqueAvailable = [...new Set(availableReports)];

      return NextResponse.json({
        success: true,
        data: {
          availableReports: uniqueAvailable,
          formats: ['pdf', 'html'],
          maxFileSize: '100MB',
        },
      });
    }
  } catch (error) {
    return handleApiError(error)
  }
});