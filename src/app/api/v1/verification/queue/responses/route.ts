import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request, context) => {
  try {
    const { roles } = context;
    
    // Check if user has coordinator role
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'SUBMITTED';
    const entityId = searchParams.get('entityId');
    const responseType = searchParams.get('type');
    const donorId = searchParams.get('donorId');

    // Build base filter for statistics (without status filter for complete counts)
    const baseWhereClause: any = {};
    
    if (entityId) {
      baseWhereClause.entityId = entityId;
    }

    if (responseType) {
      baseWhereClause.type = responseType;
    }

    if (donorId) {
      baseWhereClause.planCommitments = {
        some: {
          commitment: {
            donorId: donorId
          }
        }
      };
    }

    // Build filtered where clause for pagination
    const whereClause: any = {
      ...baseWhereClause,
      verificationStatus: status,
    };

    // Get total count for pagination
    const total = await prisma.rapidResponse.count({
      where: whereClause
    });

    // Get statistics for all verification statuses (for card counts)
    const [submittedCount, verifiedCount, autoVerifiedCount, rejectedCount] = await Promise.all([
      prisma.rapidResponse.count({
        where: { ...baseWhereClause, verificationStatus: 'SUBMITTED' }
      }),
      prisma.rapidResponse.count({
        where: { ...baseWhereClause, verificationStatus: 'VERIFIED' }
      }),
      prisma.rapidResponse.count({
        where: { ...baseWhereClause, verificationStatus: 'AUTO_VERIFIED' }
      }),
      prisma.rapidResponse.count({
        where: { ...baseWhereClause, verificationStatus: 'REJECTED' }
      })
    ]);

    // Get paginated response verification queue
    const responses = await prisma.rapidResponse.findMany({
      where: whereClause,
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            autoApproveEnabled: true
          }
        },
        responder: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        planCommitments: {
          include: {
            commitment: {
              select: {
                id: true,
                totalCommittedQuantity: true,
                items: true,
                notes: true,
                donor: {
                  select: {
                    id: true,
                    name: true,
                    contactEmail: true
                  }
                }
              }
            }
          }
        },
        assessment: {
          select: {
            id: true,
            rapidAssessmentType: true,
            rapidAssessmentDate: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: responses,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      statistics: {
        submitted: submittedCount,
        verified: verifiedCount + autoVerifiedCount, // Combine VERIFIED and AUTO_VERIFIED
        rejected: rejectedCount,
        total: submittedCount + verifiedCount + autoVerifiedCount + rejectedCount
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Response verification queue API error:', error);
    return handleApiError(error);
  }
});