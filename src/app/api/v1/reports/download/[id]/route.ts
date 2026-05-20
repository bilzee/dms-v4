/**
 * Report Download API Routes
 * GET /api/v1/reports/download/[id] - Download generated report
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { createApiResponse } from '@/types/api';
import { promises as fs } from 'fs';
import path from 'path';
import { handleApiError } from '@/lib/api/response'

/**
 * GET /api/v1/reports/download/[id]
 * Download generated report file
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const executionId = params.id;

    // Get execution with related configuration and template
    const execution = await prisma.reportExecution.findFirst({
      where: { id: executionId },
      include: {
        configuration: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                type: true,
                createdById: true,
                isPublic: true
              }
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!execution) {
      return NextResponse.json(
        createApiResponse(false, null, 'Report execution not found'),
        { status: 404 }
      );
    }

    // Check if user has access to this report
    const hasAccess = execution.configuration.createdBy === context.userId || 
                       execution.configuration.template?.isPublic;

    if (!hasAccess) {
      return NextResponse.json(
        createApiResponse(false, null, 'Access denied to this report'),
        { status: 403 }
      );
    }

    // Check if report generation is completed
    if (execution.status !== 'COMPLETED') {
      return NextResponse.json(
        createApiResponse(false, null, `Report generation not completed. Status: ${execution.status}`, 
          execution.error ? [execution.error] : []
        ),
        { status: 400 }
      );
    }

    // Check if file exists
    if (!execution.filePath) {
      return NextResponse.json(
        createApiResponse(false, null, 'Report file not found'),
        { status: 404 }
      );
    }

    let filePath = execution.filePath;
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Handle both relative and absolute paths
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(reportsDir, filePath);
    }

    // Validate file path is within reports directory
    const normalizedReportsDir = path.normalize(reportsDir);
    const normalizedFilePath = path.normalize(filePath);
    
    if (!normalizedFilePath.startsWith(normalizedReportsDir)) {
      return NextResponse.json(
        createApiResponse(false, null, 'Invalid file path'),
        { status: 403 }
      );
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return NextResponse.json(
        createApiResponse(false, null, 'Report file not found on disk'),
        { status: 404 }
      );
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Determine content type based on file extension
    const fileExtension = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (fileExtension) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.csv':
        contentType = 'text/csv';
        break;
      case '.html':
      case '.htm':
        contentType = 'text/html';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.xls':
        contentType = 'application/vnd.ms-excel';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    // Generate filename if not available
    const originalName = stats.isFile() ? path.basename(filePath) : `report.${execution.format.toLowerCase()}`;
    const displayName = execution.configuration.template?.name || 'Report';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const downloadName = `${displayName}_${timestamp}.${execution.format.toLowerCase()}`;

    // Log download for audit
    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        action: 'REPORT_DOWNLOADED',
        resource: 'ReportExecution',
        resourceId: executionId,
        newValues: {
          filename: originalName,
          contentType,
          fileSize: stats.size
        },
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent')
      }
    });

    // Increment download counter if it's a public template
    if (execution.configuration.template?.isPublic) {
      await prisma.reportTemplate.update({
        where: { id: execution.configuration.template.id },
        data: {
          updatedAt: new Date() // Touch to track last access
        }
      });
    }

    // Create file stream for download
    const fileBuffer = await fs.readFile(filePath);

    // Set appropriate headers for download
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; script-src 'none'; sandbox;",
    };

    // Content-Disposition for download
    const contentDisposition = execution.format === 'PDF' 
      ? `inline; filename="${downloadName}"`
      : `attachment; filename="${downloadName}"`;
      
    headers['Content-Disposition'] = contentDisposition;

    // For HTML files, add security headers to prevent script execution
    if (fileExtension === '.html' || fileExtension === '.htm') {
      headers['X-XSS-Protection'] = '1; mode=block';
      headers['Referrer-Policy'] = 'no-referrer';
    }

    // Create response - Convert Buffer to ArrayBuffer for NextResponse
    const response = new NextResponse(new Uint8Array(fileBuffer).buffer, {
      status: 200,
      headers
    });

    return response;

  } catch (error) {
    return handleApiError(error)
  }
});

/**
 * GET /api/v1/reports/download/[id]/info
 * Get download information for a report
 */
async function GET_INFO(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;

    // Get execution with related configuration and template
    const execution = await prisma.reportExecution.findFirst({
      where: { id: executionId },
      include: {
        configuration: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                type: true,
                createdById: true,
                isPublic: true
              }
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!execution) {
      return NextResponse.json(
        createApiResponse(false, null, 'Report execution not found'),
        { status: 404 }
      );
    }

    // Check if user has access to this report
    const hasAccess = execution.configuration.createdBy === userId || 
                       execution.configuration.template?.isPublic;

    if (!hasAccess) {
      return NextResponse.json(
        createApiResponse(false, null, 'Access denied to this report'),
        { status: 403 }
      );
    }

    // Get file information
    let fileInfo = null;
    if (execution.filePath && execution.status === 'COMPLETED') {
      let filePath = execution.filePath;
      const reportsDir = path.join(process.cwd(), 'reports');
      
      if (!path.isAbsolute(filePath)) {
        filePath = path.join(reportsDir, filePath);
      }

      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          fileInfo = {
            exists: true,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            extension: path.extname(filePath),
            filename: path.basename(filePath),
            contentType: getContentTypeFromExtension(path.extname(filePath))
          };
        }
      } catch (error) {
        fileInfo = {
          exists: false,
          error: error instanceof Error ? error.message : 'File access error'
        };
      }
    } else {
      fileInfo = {
        exists: false,
        reason: execution.status !== 'COMPLETED' ? 'Report generation not completed' : 'No file path available'
      };
    }

    // Generate download URL
    const baseUrl = request.headers.get('host') 
      ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const downloadUrl = fileInfo?.exists 
      ? `${baseUrl}/api/v1/reports/download/${executionId}`
      : null;

    // Get recent downloads for this report
    const recentDownloads = await prisma.auditLog.findMany({
      where: {
        action: 'REPORT_DOWNLOADED',
        resourceId: executionId,
        userId: userId
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    const downloadInfo = {
      execution: {
        id: execution.id,
        status: execution.status,
        format: execution.format,
        createdAt: execution.createdAt,
        generatedAt: execution.generatedAt,
        error: execution.error,
        fileSize: fileInfo?.size || null
      },
      configuration: {
        id: execution.configuration.id,
        name: execution.configuration.name,
        templateName: execution.configuration.template?.name,
        creatorName: execution.configuration.creator?.name,
        createdBy: execution.configuration.createdBy,
        isOwner: execution.configuration.createdBy === userId,
        hasPublicTemplate: execution.configuration.template?.isPublic
      },
      file: fileInfo,
      download: {
        url: downloadUrl,
        available: fileInfo?.exists && execution.status === 'COMPLETED',
        suggestedFilename: `${execution.configuration.template?.name || 'Report'}_${new Date().toISOString().replace(/[:.]/g, '-')}.${execution.format.toLowerCase()}`,
        contentType: fileInfo?.contentType
      },
      statistics: {
        totalDownloads: recentDownloads.length,
        recentDownloads: recentDownloads.map(log => ({
          timestamp: log.timestamp,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent
        })),
        canDownload: fileInfo?.exists && execution.status === 'COMPLETED' && hasAccess,
        downloadCountdown: getDownloadCountdown(execution)
      }
    };

    return NextResponse.json(
      createApiResponse(true, downloadInfo, 'Download information retrieved successfully'),
      { status: 200 }
    );

  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * Helper function to get content type from file extension
 */
function getContentTypeFromExtension(extension: string): string {
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.csv': 'text/csv',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.zip': 'application/zip'
  };

  return contentTypes[extension] || 'application/octet-stream';
}

/**
 * Helper function to get download countdown for expiring files
 */
function getDownloadCountdown(execution: any): { hours: number; minutes: number; seconds: number } | null {
  if (!execution.generatedAt) return null;

  const generated = new Date(execution.generatedAt);
  const expires = new Date(generated.getTime() + (24 * 60 * 60 * 1000)); // 24 hours from generation
  const now = new Date();
  
  if (now >= expires) return null;

  const timeUntilExpiry = expires.getTime() - now.getTime();
  const hours = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
  const minutes = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeUntilExpiry % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
}