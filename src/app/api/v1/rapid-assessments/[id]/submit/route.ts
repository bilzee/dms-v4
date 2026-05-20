import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { RapidAssessmentService } from '@/lib/services/rapid-assessment.service'
import { RapidAssessmentResponse, RapidAssessmentWithData } from '@/types/rapid-assessment'
import { handleApiError } from '@/lib/api/response'

interface RouteParams {
  params: { id: string }
}

export const POST = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    try {
      // RBAC: ASSESSOR, COORDINATOR, ADMIN can submit assessments
      if (!context.roles.some(r => ['ASSESSOR', 'COORDINATOR', 'ADMIN'].includes(r))) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions to submit assessments',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 403 }
        )
      }

      const { id } = params
      
      const assessment = await RapidAssessmentService.submit(
        id,
        context.userId
      )

      const response: RapidAssessmentResponse = {
        success: true as const,
        data: assessment as unknown as RapidAssessmentWithData,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      }

      return NextResponse.json(response, { status: 200 })
    } catch (error) {
      console.error('Submit rapid assessment error:', error)
      
      if (error instanceof Error && error.message.includes('not found')) {
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
      
      if (error instanceof Error && error.message.includes('authorized')) {
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
      return handleApiError(error)
    }
  }
)