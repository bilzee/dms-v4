import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { createApiResponse } from '@/types/api';
import { handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const userId = context.userId;

    const [totalConfigurations, totalExecutions, completedExecutions, totalDownloads] = await Promise.all([
      prisma.reportConfiguration.count({
        where: { createdBy: userId }
      }),
      prisma.reportExecution.count({
        where: {
          configuration: { createdBy: userId }
        }
      }),
      prisma.reportExecution.count({
        where: {
          configuration: { createdBy: userId },
          status: 'COMPLETED'
        }
      }),
      prisma.reportExecution.count({
        where: {
          configuration: { createdBy: userId },
          status: 'COMPLETED',
          filePath: { not: null }
        }
      })
    ]);

    const successRate = totalExecutions > 0
      ? Math.round((completedExecutions / totalExecutions) * 100)
      : 0;

    return NextResponse.json(
      createApiResponse(true, {
        totalConfigurations,
        totalExecutions,
        completedExecutions,
        successRate,
        totalDownloads
      }, 'Report statistics retrieved successfully'),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
});
