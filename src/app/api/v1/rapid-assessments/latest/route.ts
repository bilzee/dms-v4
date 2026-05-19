import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { RapidAssessmentService } from '@/lib/services/rapid-assessment.service'

export const GET = withAuth(async (request, context) => {
  try {
    // RBAC: ASSESSOR, COORDINATOR, ADMIN can view latest assessments
    if (!context.roles.some(r => ['ASSESSOR', 'COORDINATOR', 'ADMIN'].includes(r))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to view latest assessments' },
        { status: 403 }
      );
    }

    const url = new URL(request.url)
    const incidentId = url.searchParams.get('incidentId')
    const entityId = url.searchParams.get('entityId')
    const type = url.searchParams.get('type')

    // Validate required parameters
    if (!incidentId || !entityId || !type) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: incidentId, entityId, and type are required' 
        },
        { status: 400 }
      )
    }

    // Validate type is one of the allowed assessment types
    const validTypes = ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid assessment type. Must be one of: ' + validTypes.join(', ') 
        },
        { status: 400 }
      )
    }

    // Find the latest assessment for the given criteria
    const latestAssessment = await RapidAssessmentService.findLatestByIncidentEntityAndType(
      incidentId,
      entityId,
      type as any
    )

    if (!latestAssessment) {
      return NextResponse.json(
        { 
          success: true, 
          data: null,
          message: 'No assessment found for the specified criteria'
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        data: latestAssessment 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching latest assessment:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
})