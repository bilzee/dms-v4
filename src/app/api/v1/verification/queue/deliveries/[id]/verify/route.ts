import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { z } from 'zod'
import { handleApiError } from '@/lib/api/response'

const VerifyDeliverySchema = z.object({
  action: z.enum(['approve', 'reject', 'request_info']),
  feedback: z.string().optional(),
  rejectionReason: z.string().optional()
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export const POST = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    const { user, roles } = context;
    
    // Only coordinators can verify deliveries
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
      const { id } = await params
      const body = await request.json()
      
      // Validate input
      const validationResult = VerifyDeliverySchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: validationResult.error.errors,
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 400 }
        )
      }
      
      const { action, feedback, rejectionReason } = validationResult.data
      
      // Get the delivery response
      const delivery = await prisma.rapidResponse.findUnique({
        where: { id },
        include: {
          entity: { select: { id: true, name: true } },
          responder: { select: { id: true, name: true, email: true } }
        }
      })
      
      if (!delivery) {
        return NextResponse.json(
          {
            success: false,
            error: 'Delivery not found',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 404 }
        )
      }
      
      // Verify this is a delivered response submitted for verification
      if (delivery.status !== 'DELIVERED' || delivery.verificationStatus !== 'SUBMITTED') {
        return NextResponse.json(
          {
            success: false,
            error: 'Only delivered responses submitted for verification can be verified',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 409 }
        )
      }
      
      // Process verification action
      const result = await prisma.$transaction(async (tx: any) => {
        const oldValues = {
          verificationStatus: delivery.verificationStatus,
          verifiedAt: delivery.verifiedAt,
          verifiedBy: delivery.verifiedBy,
          rejectionReason: delivery.rejectionReason,
          rejectionFeedback: delivery.rejectionFeedback
        }
        
        let updateData: any = {
          updatedAt: new Date()
        }
        
        switch (action) {
          case 'approve':
            updateData = {
              ...updateData,
              verificationStatus: 'VERIFIED',
              verifiedAt: new Date(),
              verifiedBy: context.userId,
              rejectionReason: null,
              rejectionFeedback: null
            }
            break
            
          case 'reject':
            if (!rejectionReason) {
              throw new Error('Rejection reason is required when rejecting a delivery')
            }
            updateData = {
              ...updateData,
              verificationStatus: 'REJECTED',
              verifiedAt: new Date(),
              verifiedBy: context.userId,
              rejectionReason,
              rejectionFeedback: feedback || null
            }
            break
            
          case 'request_info':
            updateData = {
              ...updateData,
              verificationStatus: 'SUBMITTED', // Keep as submitted for resubmission
              rejectionFeedback: feedback || null
            }
            break
        }
        
        const updatedDelivery = await tx.rapidResponse.update({
          where: { id },
          data: updateData,
          include: {
            entity: {
              select: {
                id: true,
                name: true,
                type: true
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
            }
          }
        })
        
        // Log audit trail
        await tx.auditLog.create({
          data: {
            userId: context.userId,
            action: `DELIVERY_VERIFICATION_${action.toUpperCase()}`,
            resource: 'response',
            resourceId: id,
            oldValues: oldValues as any,
            newValues: {
              verificationStatus: updateData.verificationStatus,
              verifiedAt: updateData.verifiedAt,
              verifiedBy: updateData.verifiedBy,
              rejectionReason: updateData.rejectionReason,
              rejectionFeedback: updateData.rejectionFeedback
            }
          }
        })
        
        return updatedDelivery
      })
      
      const responseData = {
        success: true,
        data: result,
        message: `Delivery ${action}d successfully`,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      }
      
      return NextResponse.json(responseData, { status: 200 })
    } catch (error) {
      console.error('❌ Delivery verification error:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        userId: context.userId,
        id: await params.then(p => p.id)
      })
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return NextResponse.json(
            {
              success: false,
              error: error.message,
              meta: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                requestId: uuidv4()
              }
            },
            { status: 404 }
          )
        }
        
        if (error.message.includes('Only delivered responses submitted for verification can be verified')) {
          return NextResponse.json(
            {
              success: false,
              error: error.message,
              meta: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                requestId: uuidv4()
              }
            },
            { status: 409 }
          )
        }
        
        if (error.message.includes('Rejection reason is required')) {
          return NextResponse.json(
            {
              success: false,
              error: error.message,
              meta: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                requestId: uuidv4()
              }
            },
            { status: 400 }
          )
        }
      }
      return handleApiError(error)
    }
  }
)