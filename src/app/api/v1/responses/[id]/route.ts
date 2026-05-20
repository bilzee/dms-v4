import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { ResponseService } from '@/lib/services/response.service'
import { GetResponseResponse, UpdateResponseResponse } from '@/types/response'
import { UpdatePlannedResponseSchema } from '@/lib/validation/response'

interface RouteParams {
  params: { id: string }
}

export const GET = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    const { user, roles } = context;
    
    if (!roles.includes('RESPONDER')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Responder role required.' },
        { status: 403 }
      );
    }
    
    try {
        const { id } = params
        
        // Get response details
        const response = await ResponseService.getResponseById(
          id,
          context.userId
        )

        if (!response) {
          return NextResponse.json(
            {
              error: 'Response not found',
              meta: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                requestId: uuidv4()
              }
            },
            { status: 404 }
          )
        }

        const responseData: GetResponseResponse = {
          success: true,
          data: response as any,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        }

        return NextResponse.json(responseData, { status: 200 })
      } catch (error) {
        console.error('Get response error:', error)
        
        return NextResponse.json(
          {
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

export const PUT = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    const { user, roles } = context;
    
    if (!roles.includes('RESPONDER')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Responder role required.' },
        { status: 403 }
      );
    }
    
    try {
        const { id } = params
        const body = await request.json()
        
        // Validate input
        const validationResult = UpdatePlannedResponseSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
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
        
        const response = await ResponseService.updatePlannedResponse(
          id,
          validationResult.data,
          context.userId
        )

        if (!response) {
          return NextResponse.json(
            {
              error: 'Response not found',
              meta: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                requestId: uuidv4()
              }
            },
            { status: 404 }
          )
        }

        const responseData: UpdateResponseResponse = {
          success: true,
          data: response as any,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        }

        return NextResponse.json(responseData, { status: 200 })
      } catch (error) {
        console.error('Update response error:', error)
        
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            return NextResponse.json(
              {
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
          
          if (error.message.includes('not assigned')) {
            return NextResponse.json(
              {
                error: error.message,
                meta: {
                  timestamp: new Date().toISOString(),
                  version: '1.0.0',
                  requestId: uuidv4()
                }
              },
              { status: 403 }
            )
          }
          
          if (error.message.includes('Only planned responses can be updated')) {
            return NextResponse.json(
              {
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
        }
        
        return NextResponse.json(
          {
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