import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { v4 as uuidv4 } from 'uuid'
import { ResponseService } from '@/lib/services/response.service'
import { CreateDeliveredResponseInput } from '@/lib/validation/response'
import { handleApiError } from '@/lib/api/response'

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Check if user has RESPONDER role
    if (!context.roles.includes('RESPONDER')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Responder role required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json()
    
    // Create delivered response
    const result = await ResponseService.createDeliveredResponse(
      body as CreateDeliveredResponseInput,
      context.userId
    )

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Create delivered response error:', error)

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not assigned')) {
        return NextResponse.json(
          { success: false, error: 'You are not assigned to this entity.' },
          { status: 403 }
        )
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'The specified assessment or entity was not found.' },
          { status: 404 }
        )
      }
      if (error.message.includes('not verified')) {
        return NextResponse.json(
          { success: false, error: 'The assessment must be verified before creating a delivered response.' },
          { status: 400 }
        )
      }
    }
    return handleApiError(error)
  }
})