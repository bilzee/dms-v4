/**
 * Report Execution Tracking API Routes
 * GET - Get report execution status
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { db } from '@/lib/db/client';
import { createApiResponse } from '@/types/api';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * GET /api/v1/reports/executions/[id]
 * Get specific report execution status
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const executionId = params.id;

    // Get execution with related configuration and template
    const execution = await db.reportExecution.findFirst({
      where: { id: executionId },
      include: {
        configuration: {
          include: {
            template: true,
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

    // Check if user has access to this execution
    const hasAccess = execution.configuration.createdBy === context.userId || 
                      execution.configuration.template?.isPublic;

    if (!hasAccess) {
      return NextResponse.json(
        createApiResponse(false, null, 'Access denied to this report execution'),
        { status: 403 }
      );
    }

    // Get file information if completed
    let fileInfo = null;
    if (execution.status === 'COMPLETED' && execution.filePath) {
      try {
        const stats = await fs.stat(execution.filePath);
        fileInfo = {
          exists: true,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          extension: path.extname(execution.filePath),
          filename: path.basename(execution.filePath)
        };
      } catch (error) {
        fileInfo = {
          exists: false,
          error: error instanceof Error ? error.message : 'File access error'
        };
      }
    }

    // Calculate estimated completion time
    const estimatedCompletionTime = getEstimatedCompletionTime(execution);

    return NextResponse.json(
      createApiResponse(true, {
        execution: {
          id: execution.id,
          status: execution.status,
          format: execution.format,
          createdAt: execution.createdAt,
          generatedAt: execution.generatedAt,
          error: execution.error,
          fileInfo,
          estimatedCompletionTime
        },
        configuration: {
          id: execution.configuration.id,
          name: execution.configuration.name,
          templateId: execution.configuration.templateId,
          templateName: execution.configuration.template?.name,
          creatorName: execution.configuration.creator.name,
          creatorEmail: execution.configuration.creator.email
        },
        progress: getExecutionProgress(execution)
      }, 'Report execution status retrieved successfully'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error getting report execution:', error);
    return NextResponse.json(
      createApiResponse(false, null, 'Failed to retrieve report execution'),
      { status: 500 }
    );
  }
});

/**
 * POST /api/v1/reports/executions/[id]/cancel
 * Cancel report execution
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const executionId = params.id;

    // Get execution to verify access
    const execution = await db.reportExecution.findFirst({
      where: { id: executionId },
      include: {
        configuration: true
      }
    });

    if (!execution) {
      return NextResponse.json(
        createApiResponse(false, null, 'Report execution not found'),
        { status: 404 }
      );
    }

    // Check if user can cancel this execution
    const canCancel = execution.configuration.createdBy === context.userId && 
                    (execution.status === 'PENDING' || execution.status === 'RUNNING');

    if (!canCancel) {
      return NextResponse.json(
        createApiResponse(false, null, 'Cannot cancel this report execution'),
        { status: 403 }
      );
    }

    // Cancel background process if running
    if (execution.status === 'RUNNING') {
      const { exec } = require('child_process');
      const jobId = `report_${executionId}`;
      
      try {
        // Kill the background process
        if (process.platform === 'win32') {
          exec(`taskkill /F /PID $(get-wmiobject Win32_Process | where "CommandLine like '%${jobId}%'" get ProcessId)`, (error: any, stdout: any, stderr: any) => {
            if (error) {
              console.error('Error killing Windows process:', error);
            }
          });
        } else {
          exec(`pkill -f "${jobId}"`, (error: any, stdout: any, stderr: any) => {
            if (error) {
              console.error('Error killing Unix process:', error);
            }
          });
        }
      } catch (killError) {
        console.error('Error cancelling background process:', killError);
        // Don't throw - still update database
      }
    }

    // Update execution status
    const updatedExecution = await db.reportExecution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        generatedAt: new Date(),
        error: execution.status === 'RUNNING' ? 'Cancelled by user' : 'Cancelled before execution'
      }
    });

    // Clean up temporary files if they exist
    if (execution.filePath) {
      try {
        const stats = await fs.stat(execution.filePath);
        if (stats.isFile()) {
          await fs.unlink(execution.filePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
        // Don't throw - file might not exist
      }
    }

    return NextResponse.json(
      createApiResponse(true, updatedExecution, 'Report execution cancelled successfully'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error cancelling report execution:', error);
    return NextResponse.json(
      createApiResponse(false, null, 'Failed to cancel report execution'),
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/v1/reports/executions/[id]
 * Delete report execution
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const executionId = params.id;

    // Get execution to verify access
    const execution = await db.reportExecution.findFirst({
      where: { id: executionId },
      include: {
        configuration: true
      }
    });

    if (!execution) {
      return NextResponse.json(
        createApiResponse(false, null, 'Report execution not found'),
        { status: 404 }
      );
    }

    // Check if user can delete this execution
    const canDelete = execution.configuration.createdBy === context.userId;

    if (!canDelete) {
      return NextResponse.json(
        createApiResponse(false, null, 'Cannot delete this report execution'),
        { status: 403 }
      );
    }

    // Delete file if it exists
    if (execution.filePath) {
      try {
        const stats = await fs.stat(execution.filePath);
        if (stats.isFile()) {
          await fs.unlink(execution.filePath);
        }
      } catch (cleanupError) {
        console.error('Error deleting report file:', cleanupError);
        // Don't throw - file might not exist
      }
    }

    // Delete execution from database
    await db.reportExecution.delete({
      where: { id: executionId }
    });

    return NextResponse.json(
      createApiResponse(true, null, 'Report execution deleted successfully'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting report execution:', error);
    return NextResponse.json(
      createApiResponse(false, null, 'Failed to delete report execution'),
      { status: 500 }
    );
  }
});

/**
 * Helper functions
 */

/**
 * Get execution progress based on status and time elapsed
 */
function getExecutionProgress(execution: any): { percent: number; status: string; message: string } {
  const now = new Date();
  const created = new Date(execution.createdAt);
  const elapsedMs = now.getTime() - created.getTime();

  switch (execution.status) {
    case 'PENDING':
      return {
        percent: 0,
        status: 'Queued',
        message: 'Report is queued for generation...'
      };

    case 'RUNNING':
      // Estimate progress based on elapsed time and format
      const baseTimes = {
        'PDF': 30000,    // 30 seconds
        'CSV': 5000,     // 5 seconds  
        'HTML': 10000,    // 10 seconds
        'EXCEL': 15000    // 15 seconds
      };
      
      const baseTime = baseTimes[execution.format as keyof typeof baseTimes] || 30000;
      const estimatedPercent = Math.min(Math.round((elapsedMs / baseTime) * 100), 95);
      
      return {
        percent: estimatedPercent,
        status: 'Generating',
        message: `Generating ${execution.format.toLowerCase()} report... ${estimatedPercent}%`
      };

    case 'COMPLETED':
      return {
        percent: 100,
        status: 'Completed',
        message: 'Report generation completed successfully'
      };

    case 'FAILED':
      return {
        percent: 0,
        status: 'Failed',
        message: execution.error || 'Report generation failed'
      };

    case 'CANCELLED':
      return {
        percent: 0,
        status: 'Cancelled',
        message: 'Report generation was cancelled'
      };

    default:
      return {
        percent: 0,
        status: execution.status,
        message: 'Unknown status'
      };
  }
}

/**
 * Get estimated completion time based on execution details
 */
function getEstimatedCompletionTime(execution: any): Date | null {
  const now = new Date();
  const created = new Date(execution.createdAt);

  switch (execution.status) {
    case 'PENDING':
      // Estimate when it might start (within next 5 minutes)
      return new Date(created.getTime() + (5 * 60 * 1000));

    case 'RUNNING':
      // Estimate based on elapsed time and format
      const baseTimes = {
        'PDF': 30000,    // 30 seconds
        'CSV': 5000,     // 5 seconds  
        'HTML': 10000,    // 10 seconds
        'EXCEL': 15000    // 15 seconds
      };
      
      const baseTime = baseTimes[execution.format as keyof typeof baseTimes] || 30000;
      const elapsedMs = now.getTime() - created.getTime();
      const remainingMs = Math.max(baseTime - elapsedMs, 1000); // At least 1 second
      
      return new Date(now.getTime() + remainingMs);

    case 'COMPLETED':
    case 'FAILED':
    case 'CANCELLED':
      return null;

    default:
      return new Date(created.getTime() + (5 * 60 * 1000));
  }
}