import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { DonorRegistrationSchema } from '@/lib/validation/donor';
import { v4 as uuidv4 } from 'uuid';
import { handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles } = context;
    
    // Check if user has coordinator or admin role
    if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator or Admin role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const search = searchParams.get('search');
    const type = searchParams.get('type') as any;
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Get total count for pagination
    const total = await prisma.donor.count({ where });

    // Get donors with pagination and related data
    const donors = await prisma.donor.findMany({
      where,
      include: {
        _count: {
          select: {
            commitments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get detailed metrics for each donor
    const donorsWithMetrics = await Promise.all(
      donors.map(async (donor) => {
        const [commitmentStats, responseStats] = await Promise.all([
          prisma.donorCommitment.aggregate({
            where: { donorId: donor.id },
            _sum: { totalCommittedQuantity: true, deliveredQuantity: true },
            _count: { id: true }
          }),
          prisma.rapidResponse.aggregate({
            where: { planCommitments: { some: { commitment: { donorId: donor.id } } } },
            _count: { id: true }
          })
        ]);

        const totalCommitments = commitmentStats._count.id;
        const totalCommitted = commitmentStats._sum.totalCommittedQuantity || 0;
        const totalDelivered = commitmentStats._sum.deliveredQuantity || 0;
        const totalResponses = responseStats._count?.id ?? 0;

        const deliveryRate = totalCommitted > 0 ? (totalDelivered / totalCommitted) * 100 : 0;

        return {
          ...donor,
          metrics: {
            commitments: {
              total: totalCommitments,
              totalCommitted,
              delivered: totalDelivered,
              deliveryRate: Math.round(deliveryRate * 100) / 100
            },
            responses: {
              total: totalResponses
            },
            combined: {
              totalActivities: totalCommitments + totalResponses
            }
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        donors: donorsWithMetrics,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    });

  } catch (error) {
    return handleApiError(error)
  }
});

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles } = context;
    
    // Check if user has admin role
    if (!roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Admin role required for donor creation.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input using existing schema
    const validation = DonorRegistrationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      );
    }

    // This would be handled by the registration endpoint
    return NextResponse.json(
      {
        success: false,
        error: 'Donor creation should be done through the registration endpoint',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 400 }
    );

  } catch (error) {
    return handleApiError(error)
  }
});