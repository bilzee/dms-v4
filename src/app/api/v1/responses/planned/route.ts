import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { ResponseService } from '@/lib/services/response.service'
import { CreatePlannedResponseResponse } from '@/types/response'
import { CreatePlannedResponseSchema } from '@/lib/validation/response'

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { user, roles } = context;
  
  if (!roles.includes('RESPONDER')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Responder role required.' },
      { status: 403 }
    );
  }
  
  try {
    // Get planned responses for the user
    const responses = await ResponseService.getPlannedResponsesForResponder(context.userId);
    
    return NextResponse.json({
      success: true,
      data: responses,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    });
  } catch (error) {
    console.error('Get planned responses error:', error);
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
    );
  }
});

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { user, roles } = context;
  
  if (!roles.includes('RESPONDER')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Responder role required.' },
      { status: 403 }
    );
  }
  
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = CreatePlannedResponseSchema.safeParse(body)
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

    // Create planned response
    const response = await ResponseService.createPlannedResponse(
      validationResult.data,
      context.userId
    )

    const apiResponse: CreatePlannedResponseResponse = {
      success: true,
      data: response as any,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    }

    return NextResponse.json(apiResponse, { status: 201 })
  } catch (error) {
    console.error('Create planned response error:', error)
    
    if (error instanceof Error) {
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
      
      if (error.message.includes('already exists')) {
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
})