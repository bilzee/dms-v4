import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { ResponseService } from '@/lib/services/response.service'
import { ConfirmDeliverySchema } from '@/lib/validation/response'

interface RouteParams {
  params: { id: string }
}

export const POST = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    const { user, roles } = context;
    
    // Only responders can confirm deliveries
    if (!roles.includes('RESPONDER')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions. Responder role required.' 
        },
        { status: 403 }
      );
    }
    
    let responseId = 'unknown'
    try {
      const { id } = params
      responseId = id
      const body = await request.json()
      
      // Validate input
      const validationResult = ConfirmDeliverySchema.safeParse(body)
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
      
      // Confirm the delivery
      const response = await ResponseService.confirmDelivery(
        id,
        validationResult.data,
        context.userId
      )

      if (!response) {
        return NextResponse.json(
          {
            success: false,
            error: 'Response not found or cannot be confirmed as delivered',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 404 }
        )
      }

      const responseData = {
        success: true,
        data: response,
        message: 'Delivery confirmed successfully and submitted for verification',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      }

      return NextResponse.json(responseData, { status: 200 })
    } catch (error) {
      console.error('❌ Confirm delivery error:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        userId: context.userId,
        id: responseId
      })
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('not assigned to this entity')) {
          return NextResponse.json(
            {
              success: false,
              error: 'You are not assigned to this entity',
              meta: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                requestId: uuidv4()
              }
            },
            { status: 403 }
          )
        }
        
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
        
        if (error.message.includes('Only planned responses can be confirmed as delivered')) {
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
        
        if (error.message.includes('Valid delivery location coordinates are required')) {
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
      
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 500 }
      )
    }
  }
)