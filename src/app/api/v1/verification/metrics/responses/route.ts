import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest, context) => {
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
    const dateRange = searchParams.get('dateRange') || '7d';
    const entityType = searchParams.get('entityType');
    const donorId = searchParams.get('donorId');

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Build base where clause
    const baseWhereClause: any = {
      createdAt: {
        gte: startDate,
        lte: now
      }
    };

    if (entityType) {
      baseWhereClause.entity = {
        type: entityType
      };
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

    // Get status counts
    const [
      totalPending,
      totalVerified,
      totalRejected,
      totalAutoVerified,
      avgProcessingTimeData
    ] = await Promise.all([
      // Pending responses
      prisma.rapidResponse.count({
        where: {
          ...baseWhereClause,
          verificationStatus: 'SUBMITTED'
        }
      }),
      
      // Manually verified responses
      prisma.rapidResponse.count({
        where: {
          ...baseWhereClause,
          verificationStatus: 'VERIFIED'
        }
      }),
      
      // Rejected responses
      prisma.rapidResponse.count({
        where: {
          ...baseWhereClause,
          verificationStatus: 'REJECTED'
        }
      }),
      
      // Auto-verified responses
      prisma.rapidResponse.count({
        where: {
          ...baseWhereClause,
          verificationStatus: 'AUTO_VERIFIED'
        }
      }),
      
      // Average processing time
      prisma.rapidResponse.findMany({
        where: {
          ...baseWhereClause,
          verificationStatus: {
            in: ['VERIFIED', 'AUTO_VERIFIED', 'REJECTED']
          },
          verifiedAt: {
            not: null
          }
        },
        select: {
          createdAt: true,
          verifiedAt: true
        },
        take: 1000 // Limit to avoid large data sets
      })
    ]);

    // Calculate metrics
    const totalSubmitted = totalPending + totalVerified + totalRejected + totalAutoVerified;
    const verificationRate = totalSubmitted > 0 ? (totalVerified + totalAutoVerified) / totalSubmitted : 0;
    const rejectionRate = totalSubmitted > 0 ? totalRejected / totalSubmitted : 0;
    
    // Calculate average processing time in minutes
    let averageProcessingTime = 0;
    if (avgProcessingTimeData.length > 0) {
      const totalTime = avgProcessingTimeData.reduce((sum, item) => {
        const created = new Date(item.createdAt).getTime();
        const verified = new Date(item.verifiedAt!).getTime();
        return sum + (verified - created);
      }, 0);
      averageProcessingTime = totalTime / (avgProcessingTimeData.length * 1000 * 60); // Convert to minutes
    }

    // Get breakdowns by type and donor
    const [
      pendingByType,
      verifiedByType,
      autoVerifiedByType,
      pendingByDonor,
      verifiedByDonor
    ] = await Promise.all([
      // Pending by type
      prisma.rapidResponse.groupBy({
        by: ['type'],
        where: {
          ...baseWhereClause,
          verificationStatus: 'SUBMITTED'
        },
        _count: true
      }),

      // Verified by type
      prisma.rapidResponse.groupBy({
        by: ['type'],
        where: {
          ...baseWhereClause,
          verificationStatus: 'VERIFIED'
        },
        _count: true
      }),

      // Auto-verified by type
      prisma.rapidResponse.groupBy({
        by: ['type'],
        where: {
          ...baseWhereClause,
          verificationStatus: 'AUTO_VERIFIED'
        },
        _count: true
      }),

      // Pending by donor - query through PlanCommitment
      prisma.planCommitment.groupBy({
        by: ['commitmentId'],
        where: {
          plan: {
            ...baseWhereClause,
            verificationStatus: 'SUBMITTED'
          },
          commitment: {
            donorId: { not: undefined }
          }
        },
        _count: {
          id: true
        }
      }).then(async (results) => {
        // Map commitmentId to donorId
        const commitmentIds = results.map(r => r.commitmentId);
        const commitments = await prisma.donorCommitment.findMany({
          where: { id: { in: commitmentIds } },
          select: { id: true, donorId: true }
        });
        const commitmentToDonor = new Map(commitments.map(c => [c.id, c.donorId]));
        return results.map(r => ({
          donorId: commitmentToDonor.get(r.commitmentId) || null,
          _count: r._count.id
        }));
      }),

      // Verified by donor - query through PlanCommitment
      prisma.planCommitment.groupBy({
        by: ['commitmentId'],
        where: {
          plan: {
            ...baseWhereClause,
            verificationStatus: {
              in: ['VERIFIED', 'AUTO_VERIFIED']
            }
          },
          commitment: {
            donorId: { not: undefined }
          }
        },
        _count: {
          id: true
        }
      }).then(async (results) => {
        // Map commitmentId to donorId
        const commitmentIds = results.map(r => r.commitmentId);
        const commitments = await prisma.donorCommitment.findMany({
          where: { id: { in: commitmentIds } },
          select: { id: true, donorId: true }
        });
        const commitmentToDonor = new Map(commitments.map(c => [c.id, c.donorId]));
        return results.map(r => ({
          donorId: commitmentToDonor.get(r.commitmentId) || null,
          _count: r._count.id
        }));
      })
    ]);

    // Get donor information for donor breakdowns
    const donorIds = [
      ...pendingByDonor.map(d => d.donorId).filter((id): id is string => id !== null),
      ...verifiedByDonor.map(d => d.donorId).filter((id): id is string => id !== null)
    ];

    const donors = await prisma.donor.findMany({
      where: {
        id: {
          in: donorIds
        }
      },
      select: {
        id: true,
        name: true,
        contactEmail: true
      }
    });

    const donorMap = new Map(donors.map(d => [d.id, d.name]));

    // Get daily trends for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const dailyTrends = await prisma.$queryRaw`
      SELECT 
        DATE(r.createdAt) as date,
        SUM(CASE WHEN r.verificationStatus = 'SUBMITTED' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN r.verificationStatus = 'VERIFIED' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN r.verificationStatus = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN r.verificationStatus = 'AUTO_VERIFIED' THEN 1 ELSE 0 END) as autoVerified
      FROM RapidResponse r
      WHERE r.createdAt >= ${thirtyDaysAgo}
      GROUP BY DATE(r.createdAt)
      ORDER BY date DESC
    ` as Array<{
      date: string;
      pending: number;
      verified: number;
      rejected: number;
      autoVerified: number;
    }>;

    const metrics = {
      totalPending,
      totalVerified,
      totalRejected,
      totalAutoVerified,
      verificationRate,
      rejectionRate,
      averageProcessingTime,
      pendingByType: pendingByType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
      verifiedByType: verifiedByType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
      autoVerifiedByType: autoVerifiedByType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
      pendingByDonor: pendingByDonor.reduce((acc, item) => {
        if (item.donorId && donorMap.has(item.donorId)) {
          acc[donorMap.get(item.donorId)!] = item._count as number;
        }
        return acc;
      }, {} as Record<string, number>),
      verifiedByDonor: verifiedByDonor.reduce((acc, item) => {
        if (item.donorId && donorMap.has(item.donorId)) {
          acc[donorMap.get(item.donorId)!] = item._count as number;
        }
        return acc;
      }, {} as Record<string, number>),
      dailyTrends
    };

    return NextResponse.json({
      success: true,
      data: metrics,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID(),
        dateRange,
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Response verification metrics error:', error);
    return handleApiError(error);
  }
});