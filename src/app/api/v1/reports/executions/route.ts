import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { createApiResponse } from '@/types/api';
import { handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const skip = (page - 1) * limit;

    const where: any = {
      configuration: {
        createdBy: context.userId
      }
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    const [executions, total] = await Promise.all([
      prisma.reportExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          configuration: {
            select: {
              id: true,
              name: true,
              templateId: true,
              template: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          }
        }
      }),
      prisma.reportExecution.count({ where })
    ]);

    return NextResponse.json(
      createApiResponse(true, {
        executions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }, 'Report executions retrieved successfully'),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
});
