import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { RapidAssessmentService } from '@/lib/services/rapid-assessment.service'

/**
 * API endpoint to update all historical assessments with correct priorities
 * This should be called once to migrate existing assessments to the new priority system
 * 
 * Only coordinators and admins can trigger this operation
 */
export const POST = withAuth(async (request, context) => {
  try {
    // Check if user has coordinator or admin role
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'Only coordinators and admins can update historical assessment priorities'
        },
        { status: 403 }
      )
    }

    // Update all historical assessments
    const result = await RapidAssessmentService.updateAllHistoricalAssessmentPriorities()

    return NextResponse.json({
      success: true,
      message: 'Historical assessment priority update completed',
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        updatedBy: context.userId
      }
    })

  } catch (error) {
    console.error('Error updating historical assessment priorities:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to update historical assessment priorities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

export const GET = withAuth(async (request, context) => {
  try {
    // Check if user has coordinator or admin role
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'Only coordinators and admins can access this endpoint'
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      message: 'Historical assessment priority update endpoint',
      usage: {
        method: 'POST',
        description: 'Triggers priority recalculation for all existing assessments',
        access: 'COORDINATOR or ADMIN role required'
      },
      warning: 'This operation may take several minutes depending on the number of assessments'
    })

  } catch (error) {
    console.error('Error accessing historical assessment priority endpoint:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to access historical assessment priority endpoint'
      },
      { status: 500 }
    )
  }
})