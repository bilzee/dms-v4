import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { ResponseService } from '@/lib/services/response.service'
import { prisma } from '@/lib/db/client'
import { handleApiError } from '@/lib/api/response'

interface RouteParams {
  params: { assessmentId: string }
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
        const { assessmentId } = params
        
        // Check if there are existing responses for this assessment
        const { responses, total } = await ResponseService.getPlannedResponsesForResponder(
          context.userId,
          { assessmentId, page: 1, limit: 10 }
        )

        const conflictData = {
          hasExistingResponses: total > 0,
          totalExistingResponses: total,
          existingResponses: responses.map(response => ({
            id: response.id,
            type: response.type,
            priority: response.priority,
            status: response.status,
            plannedDate: response.plannedDate,
            responderName: response.responder?.name,
            itemsCount: Array.isArray(response.items) ? response.items.length : 0
          }))
        }

        return NextResponse.json({
          success: true,
          data: conflictData,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        }, { status: 200 })
      } catch (error) {
        return handleApiError(error)
      }
    }
)