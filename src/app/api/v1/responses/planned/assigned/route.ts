import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { ResponseService } from '@/lib/services/response.service'
import { GetResponsesResponse } from '@/types/response'
import { ResponseQuerySchema } from '@/lib/validation/response'
import { handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { user, roles } = context;
  
  if (!roles.includes('RESPONDER')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Responder role required.' },
      { status: 403 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const query = {
      assessmentId: searchParams.get('assessmentId') || undefined,
      entityId: searchParams.get('entityId') || undefined,
      status: searchParams.get('status') as any || undefined,
      type: searchParams.get('type') as any || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    // Validate query parameters
    const validationResult = ResponseQuerySchema.safeParse(query)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
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

    // Get planned responses for this responder
    const { responses, total } = await ResponseService.getPlannedResponsesForResponder(
      context.userId,
      validationResult.data
    )

    const apiResponse: GetResponsesResponse = {
      data: responses as any,
      meta: {
        total,
        page: validationResult.data.page,
        limit: validationResult.data.limit,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    }

    return NextResponse.json(apiResponse, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
})