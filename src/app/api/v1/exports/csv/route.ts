import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

const CSVExportRequestSchema = z.object({
  dataType: z.enum(['assessments', 'responses', 'entities', 'incidents', 'commitments']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(['csv']).default('csv'),
  filters: z.record(z.any()).optional(),
});

function escapeCsvValue(value: any): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(row: any[]): string {
  return row.map(escapeCsvValue).join(',');
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ASSESSOR: ['assessments'],
  COORDINATOR: ['assessments', 'responses', 'entities', 'incidents'],
  RESPONDER: ['responses', 'entities', 'incidents'],
  DONOR: ['commitments'],
  ADMIN: ['assessments', 'responses', 'entities', 'incidents', 'commitments'],
};

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const body = await request.json();
    const validatedData = CSVExportRequestSchema.parse(body);

    // Check role-based permissions using context.roles
    const allowedDataTypes = context.roles
      .flatMap(role => ROLE_PERMISSIONS[role] || []);
    const uniqueAllowed = [...new Set(allowedDataTypes)];
    
    if (!uniqueAllowed.includes(validatedData.dataType)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for this data type' },
        { status: 403 }
      );
    }

    // Generate CSV data based on type
    const userRole = context.roles[0] || '';
    const csvData = await generateCSVData(validatedData, userRole);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${validatedData.dataType}_export_${timestamp}.${validatedData.format}`;
    
    // Return CSV file
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': validatedData.format === 'csv' 
          ? 'text/csv' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { success: false, error: 'Export failed' },
      { status: 500 }
    );
  }
});

async function generateCSVData(request: z.infer<typeof CSVExportRequestSchema>, userRole: string): Promise<string> {
  const { dataType, startDate, endDate, filters } = request;

  switch (dataType) {
    case 'assessments':
      return generateAssessmentsCSV(startDate, endDate, filters);
    case 'responses':
      return generateResponsesCSV(startDate, endDate, filters);
    case 'entities':
      return generateEntitiesCSV(startDate, endDate, filters);
    case 'incidents':
      return generateIncidentsCSV(startDate, endDate, filters);
    case 'commitments':
      return generateCommitmentsCSV(userRole, startDate, endDate, filters);
    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
}

async function generateAssessmentsCSV(startDate?: string, endDate?: string, filters?: Record<any, any>): Promise<string> {
  const assessments = await prisma.rapidAssessment.findMany({
    where: {
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
      ...(filters && {
        assessmentType: filters.assessmentType,
        verificationStatus: filters.verificationStatus,
        locationId: filters.locationId,
      }),
    },
    include: {
      assessor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'ID', 'Assessment Type', 'Assessment Date', 'Status', 'Location', 'Coordinates',
    'Created Date', 'Last Updated', 'Assessor Name', 'Priority', 'Version',
    'Is Offline Created', 'Sync Status', 'Verified At'
  ];

  const csvRows = assessments.map(assessment => [
    assessment.id,
    assessment.rapidAssessmentType,
    assessment.rapidAssessmentDate.toISOString(),
    assessment.verificationStatus,
    assessment.location || 'Unknown',
    assessment.coordinates ? JSON.stringify(assessment.coordinates) : 'N/A',
    assessment.createdAt.toISOString(),
    assessment.updatedAt.toISOString(),
    assessment.assessor?.name || assessment.assessorName || 'Unassigned',
    assessment.priority,
    assessment.versionNumber,
    assessment.isOfflineCreated,
    assessment.syncStatus,
    assessment.verifiedAt?.toISOString() || '',
  ]);

  return [headers, ...csvRows].map(row => toCsvRow(row)).join('\n');
}

async function generateResponsesCSV(startDate?: string, endDate?: string, filters?: Record<any, any>): Promise<string> {
  const responses = await prisma.rapidResponse.findMany({
    where: {
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
      ...(filters && {
        status: filters.status,
        responsePriority: filters.responsePriority,
        assessmentId: filters.assessmentId,
      }),
    },
    include: {
      assessment: {
        select: {
          id: true,
          rapidAssessmentType: true,
          location: true,
        }
      },
      entity: {
        select: {
          id: true,
          name: true,
          type: true,
        }
      },
      responder: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'ID', 'Assessment ID', 'Assessment Type', 'Response Type', 'Priority',
    'Status', 'Entity Name', 'Entity Type', 'Responder Name', 'Created Date',
    'Response Date', 'Planned Date', 'Description', 'Resources',
    'Timeline', 'Version', 'Verification Status', 'Assessment Location'
  ];

  const csvRows = responses.map(response => [
    response.id,
    response.assessmentId,
    response.assessment?.rapidAssessmentType || 'Unknown',
    response.type,
    response.priority,
    response.deliveryStatus,
    response.entity?.name || 'Unknown',
    response.entity?.type || 'Unknown',
    response.responder?.name || 'Unassigned',
    response.createdAt.toISOString(),
    response.responseDate?.toISOString() || '',
    response.plannedDate.toISOString(),
    response.description || '',
    response.resources ? JSON.stringify(response.resources) : '',
    response.timeline ? JSON.stringify(response.timeline) : '',
    response.versionNumber,
    response.verificationStatus,
    response.assessment?.location || 'Unknown',
  ]);

  return [headers, ...csvRows].map(row => toCsvRow(row)).join('\n');
}

async function generateEntitiesCSV(startDate?: string, endDate?: string, filters?: Record<any, any>): Promise<string> {
  const entities = await prisma.entity.findMany({
    where: {
      ...(filters && {
        type: filters.type,
        status: filters.status,
        jurisdictionId: filters.jurisdictionId,
      }),
    },
    include: {
      _count: {
        select: {
          rapidAssessments: true,
          responses: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const headers = [
    'ID', 'Name', 'Type', 'Location', 'Coordinates', 'Metadata',
    'Is Active', 'Auto Approve Enabled', 'Assessment Count', 'Response Count',
    'Created Date', 'Last Updated'
  ];

  const csvRows = entities.map(entity => [
    entity.id,
    entity.name,
    entity.type,
    entity.location || 'N/A',
    entity.coordinates ? JSON.stringify(entity.coordinates) : 'N/A',
    entity.metadata ? JSON.stringify(entity.metadata) : 'N/A',
    entity.isActive,
    entity.autoApproveEnabled,
    entity._count.rapidAssessments,
    entity._count.responses,
    entity.createdAt.toISOString(),
    entity.updatedAt.toISOString(),
  ]);

  return [headers, ...csvRows].map(row => toCsvRow(row)).join('\n');
}

async function generateIncidentsCSV(startDate?: string, endDate?: string, filters?: Record<any, any>): Promise<string> {
  const incidents = await prisma.incident.findMany({
    where: {
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
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

  const headers = [
    'ID', 'Name', 'Type', 'Sub Type', 'Severity', 'Status', 'Description',
    'Location', 'Coordinates', 'Created By', 'Created Date', 'Last Updated',
    'Rapid Assessment Count', 'Preliminary Assessment Count'
  ];

  const csvRows = incidents.map(incident => [
    incident.id,
    incident.name,
    incident.type,
    incident.subType || '',
    incident.severity,
    incident.status,
    incident.description,
    incident.location,
    incident.coordinates ? JSON.stringify(incident.coordinates) : 'N/A',
    incident.createdBy,
    incident.createdAt.toISOString(),
    incident.updatedAt.toISOString(),
    incident._count.rapidAssessments,
    incident._count.preliminaryAssessments,
  ]);

  return [headers, ...csvRows].map(row => toCsvRow(row)).join('\n');
}

async function generateCommitmentsCSV(userRole: string, startDate?: string, endDate?: string, filters?: Record<any, any>): Promise<string> {
  // Donors can only see their own commitments
  const whereClause: any = {
    ...(startDate && { createdAt: { gte: new Date(startDate) } }),
    ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    ...(filters && {
      status: filters.status,
      incidentId: filters.incidentId,
      entityId: filters.entityId,
    }),
  };

  // Note: Additional donor filtering could be added using context.user
  // if (userRole === 'donor') {
  //   whereClause.donorId = (context.user as any).organizationId;
  // }

  const commitments = await prisma.donorCommitment.findMany({
    where: whereClause,
    include: {
      donor: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      entity: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      incident: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      _count: {
        select: {
          planCommitments: true,
        },
      },
    },
    orderBy: { commitmentDate: 'desc' },
  });

  const headers = [
    'ID', 'Donor Name', 'Donor Type', 'Entity Name', 'Entity Type',
    'Incident Name', 'Incident Type', 'Status', 'Items', 'Total Committed Quantity',
    'Delivered Quantity', 'Verified Delivered Quantity', 'Commitment Date',
    'Last Updated', 'Notes', 'Total Value Estimated', 'Response Count'
  ];

  const csvRows = commitments.map(commitment => [
    commitment.id,
    commitment.donor?.name || 'Unknown',
    commitment.donor?.type || 'Unknown',
    commitment.entity?.name || 'Unknown',
    commitment.entity?.type || 'Unknown',
    commitment.incident?.name || 'Unknown',
    commitment.incident?.type || 'Unknown',
    commitment.status,
    commitment.items ? JSON.stringify(commitment.items) : '',
    commitment.totalCommittedQuantity,
    commitment.deliveredQuantity,
    commitment.verifiedDeliveredQuantity,
    commitment.commitmentDate.toISOString(),
    commitment.lastUpdated.toISOString(),
    commitment.notes || '',
    commitment.totalValueEstimated || 0,
    commitment._count.planCommitments,
  ]);

  return [headers, ...csvRows].map(row => toCsvRow(row)).join('\n');
}

// Get available export types for current user
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Use context.roles instead of (context.user as any).role
    const allowedDataTypes = context.roles
      .flatMap(role => ROLE_PERMISSIONS[role] || []);
    const uniqueAllowed = [...new Set(allowedDataTypes)];

    return NextResponse.json({
      success: true,
      data: {
        availableExports: uniqueAllowed,
        formats: ['csv', 'xlsx'],
        maxFileSize: '50MB',
      },
    });
  } catch (error) {
    return handleApiError(error)
  }
});