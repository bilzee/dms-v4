import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { RapidAssessmentService } from '@/lib/services/rapid-assessment.service'
import { QueryRapidAssessmentSchema } from '@/lib/validation/rapid-assessment'
import { RapidAssessmentListResponse, RapidAssessmentWithData } from '@/types/rapid-assessment'
import { handleApiError } from '@/lib/api/response'

interface RouteParams {
  params: { userId: string }
}

export const GET = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    try {
      const { userId } = params
      
      // RBAC: User can access their own assessments, COORDINATOR/ADMIN can access any
      const isPrivileged = context.roles.some(r => ['COORDINATOR', 'ADMIN'].includes(r))
      if (!isPrivileged && userId !== context.userId) {
        return NextResponse.json(
          {
            error: 'Not authorized to access these assessments',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 403 }
        )
      }

      const url = new URL(request.url)
      const searchParams = Object.fromEntries(url.searchParams)
      
      const query = QueryRapidAssessmentSchema.parse(searchParams)
      
      const { assessments, total, totalPages } = await RapidAssessmentService.findByUserId(
        userId,
        query
      )

      const response: RapidAssessmentListResponse = {
        success: true as const,
        data: assessments as unknown as RapidAssessmentWithData[],
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      }

      return NextResponse.json(response, { status: 200 })
    } catch (error) {
      return handleApiError(error)
    }
  }
)