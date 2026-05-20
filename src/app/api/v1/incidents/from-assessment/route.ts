import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
import { IncidentService } from '@/lib/services/incident.service'
import { IncidentSchema } from '@/lib/validation/incidents'
import { z } from 'zod'
import { handleApiError } from '@/lib/api/response'

const CreateIncidentFromAssessmentSchema = z.object({
  assessmentId: z.string().min(1, 'Assessment ID is required'),
  incidentData: IncidentSchema
})

export const POST = withAuth(async (request: NextRequest, context) => {
  const { roles } = context;
  if (!roles.includes('ASSESSOR') && !roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Assessor, Coordinator, or Admin role required.' },
      { status: 403 }
    );
  }

  try {
      const body = await request.json()
      const { assessmentId, incidentData } = CreateIncidentFromAssessmentSchema.parse(body)
      
      const result = await IncidentService.createFromAssessment(
        assessmentId,
        incidentData,
        context.userId
      )

      return NextResponse.json(
        {
          success: true,
          data: {
            incident: result.incident,
            assessment: result.updatedAssessment
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 201 }
      )
    } catch (error) {
      console.error('Create incident from assessment error:', error)
      
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
        
        if (error.message.includes('validation')) {
          return NextResponse.json(
            {
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