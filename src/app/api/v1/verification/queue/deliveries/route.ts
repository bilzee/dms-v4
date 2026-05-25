import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { handleApiError } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{}>
}

export const GET = withAuth(
  async (request: NextRequest, context: AuthContext) => {
    const { user, roles } = context;
    
    // Only coordinators can access delivery verification queue
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions. Coordinator role required.' 
        },
        { status: 403 }
      );
    }
    
    try {
      const { searchParams } = new URL(request.url)
      
      // Parse query parameters with enhanced filtering
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const status = searchParams.get('status')?.split(',') || ['SUBMITTED']
      const entityId = searchParams.get('entityId')
      const responderId = searchParams.get('responderId')
      const assessmentType = searchParams.get('assessmentType')?.split(',')
      const priority = searchParams.get('priority')?.split(',')
      const dateFrom = searchParams.get('dateFrom')
      const dateTo = searchParams.get('dateTo')
      const sortBy = searchParams.get('sortBy') || 'responseDate'
      const sortOrder = searchParams.get('sortOrder') || 'desc'
      const search = searchParams.get('search')
      
      // Build where clause for delivered responses submitted for verification with enhanced filtering
      const where: any = {
        deliveryStatus: 'DELIVERED',
        verificationStatus: { in: status }
      }
      
      // Add optional filters
      if (entityId) where.entityId = entityId
      if (responderId) where.responderId = responderId
      if (assessmentType) {
        where.assessment = {
          rapidAssessmentType: { in: assessmentType }
        }
      }
      if (priority) where.priority = { in: priority }
      
      // Date range filter on responseDate
      if (dateFrom || dateTo) {
        where.responseDate = {}
        if (dateFrom) where.responseDate.gte = new Date(dateFrom)
        if (dateTo) where.responseDate.lte = new Date(dateTo)
      }

      // Search filter
      if (search) {
        where.OR = [
          { responder: { name: { contains: search, mode: 'insensitive' } } },
          { entity: { name: { contains: search, mode: 'insensitive' } } },
          { assessment: { location: { contains: search, mode: 'insensitive' } } }
        ]
      }

      // Build order by clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;
      
      // Add secondary sort by priority for stable ordering
      if (sortBy !== 'priority') {
        orderBy.priority = 'desc';
      }
      
      // Get total count
      const total = await prisma.rapidResponse.count({ where })
      
      // Get paginated delivered responses for verification
      const deliveries = await prisma.rapidResponse.findMany({
        where,
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true
            }
          },
          responder: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assessment: {
            select: {
              id: true,
              rapidAssessmentType: true,
              rapidAssessmentDate: true
            }
          },
          mediaAttachments: {
            select: {
              id: true,
              filename: true,
              filePath: true,
              thumbnailPath: true,
              uploadedAt: true
            },
            orderBy: {
              uploadedAt: 'desc'
            }
          }
        },
        orderBy: [orderBy],
        skip: (page - 1) * limit,
        take: Math.min(limit, 100) // Max 100 per page
      })
      
      // Calculate queue depth indicators for deliveries
      const queueDepth = {
        total: total,
        critical: await prisma.rapidResponse.count({
          where: { 
            deliveryStatus: 'DELIVERED',
            verificationStatus: { in: status as any },
            priority: 'CRITICAL',
            ...(entityId && { entityId }),
            ...(responderId && { responderId })
          }
        }),
        high: await prisma.rapidResponse.count({
          where: { 
            deliveryStatus: 'DELIVERED',
            verificationStatus: { in: status as any },
            priority: 'HIGH',
            ...(entityId && { entityId }),
            ...(responderId && { responderId })
          }
        }),
        medium: await prisma.rapidResponse.count({
          where: { 
            deliveryStatus: 'DELIVERED',
            verificationStatus: { in: status as any },
            priority: 'MEDIUM',
            ...(entityId && { entityId }),
            ...(responderId && { responderId })
          }
        }),
        low: await prisma.rapidResponse.count({
          where: { 
            deliveryStatus: 'DELIVERED',
            verificationStatus: { in: status as any },
            priority: 'LOW',
            ...(entityId && { entityId }),
            ...(responderId && { responderId })
          }
        })
      };

      // Get delivery queue metrics
      const metrics = {
        averageWaitTime: await calculateDeliveryAverageWaitTime(where),
        verificationRate: await calculateDeliveryVerificationRate(),
        oldestPending: await getOldestPendingDelivery(where)
      };

      // Format delivery data for response
      const formattedDeliveries = deliveries.map((delivery: any) => {
        const timeline = delivery.timeline as any || {}
        const deliveryInfo = timeline.delivery || {}
        
        return {
          id: delivery.id,
          type: delivery.type,
          priority: delivery.priority,
          status: delivery.status,
          verificationStatus: delivery.verificationStatus,
          responseDate: delivery.responseDate,
          plannedDate: delivery.plannedDate,
          
          // Delivery information
          deliveryInfo: {
            confirmedAt: deliveryInfo.confirmedAt,
            deliveredBy: deliveryInfo.deliveredBy,
            deliveryLocation: deliveryInfo.deliveryLocation,
            deliveryNotes: deliveryInfo.deliveryNotes,
            deliveredItems: deliveryInfo.deliveredItems || delivery.items,
            mediaAttachmentIds: deliveryInfo.mediaAttachmentIds || []
          },
          
          // Related data
          entity: delivery.entity,
          responder: delivery.responder,
          assessment: delivery.assessment,
          
          // Delivery proof media
          deliveryProof: delivery.mediaAttachments.map((media: any) => ({
            id: media.id,
            filename: media.filename,
            filePath: media.filePath,
            thumbnailPath: media.thumbnailPath,
            uploadedAt: media.uploadedAt,
            metadata: media.metadata
          })),
          
          // Metadata
          createdAt: delivery.createdAt,
          updatedAt: delivery.updatedAt
        }
      })
      
      const responseData = {
        success: true,
        data: formattedDeliveries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        queueDepth,
        metrics,
        meta: {
          timestamp: new Date().toISOString(),
          version: '2.0',
          requestId: uuidv4(),
          realTimeUpdate: true,
          nextUpdateIn: 30000, // 30 seconds
          filters: {
            status,
            entityId,
            responderId,
            assessmentType,
            priority,
            dateFrom,
            dateTo,
            sortBy,
            sortOrder,
            search
          }
        }
      }

      return NextResponse.json(responseData, { status: 200 })
    } catch (error) {
      console.error('❌ Get delivery verification queue error:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        userId: context.userId
      })
      return handleApiError(error)
    }
  }
)

// Helper functions for delivery metrics calculation
async function calculateDeliveryAverageWaitTime(whereClause: any): Promise<number> {
  try {
    const pendingDeliveries = await prisma.rapidResponse.findMany({
      where: {
        ...whereClause,
        verificationStatus: { in: ['SUBMITTED', 'DRAFT'] }
      },
      select: {
        responseDate: true,
        createdAt: true
      }
    });

    if (pendingDeliveries.length === 0) return 0;

    const totalWaitTime = pendingDeliveries.reduce((total, delivery) => {
      const waitMinutes = delivery.responseDate 
        ? (Date.now() - delivery.responseDate.getTime()) / (1000 * 60)
        : (Date.now() - delivery.createdAt.getTime()) / (1000 * 60);
      return total + waitMinutes;
    }, 0);

    return Math.round(totalWaitTime / pendingDeliveries.length);
  } catch (error) {
    console.error('Error calculating delivery average wait time:', error);
    return 0;
  }
}

async function calculateDeliveryVerificationRate(): Promise<number> {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [submitted, verified] = await Promise.all([
      prisma.rapidResponse.count({
        where: {
          deliveryStatus: 'DELIVERED',
          responseDate: { gte: last24Hours }
        }
      }),
      prisma.rapidResponse.count({
        where: {
          deliveryStatus: 'DELIVERED',
          responseDate: { gte: last24Hours },
          verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] }
        }
      })
    ]);

    if (submitted === 0) return 0;
    return verified / submitted;
  } catch (error) {
    console.error('Error calculating delivery verification rate:', error);
    return 0;
  }
}

async function getOldestPendingDelivery(whereClause: any): Promise<string | null> {
  try {
    const oldest = await prisma.rapidResponse.findFirst({
      where: {
        ...whereClause,
        verificationStatus: { in: ['SUBMITTED', 'DRAFT'] }
      },
      orderBy: {
        responseDate: 'asc'
      },
      select: {
        responseDate: true,
        createdAt: true
      }
    });

    return oldest ? (oldest.responseDate || oldest.createdAt).toISOString() : null;
  } catch (error) {
    console.error('Error getting oldest pending delivery:', error);
    return null;
  }
}