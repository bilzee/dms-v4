import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { z } from 'zod'

// Validation schema for query parameters
const AssignedEntitiesQuerySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export const GET = withAuth(async (request, context) => {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)
    
    // Validate query parameters
    const query = AssignedEntitiesQuerySchema.parse(searchParams)
    
    // Import the service function
    const { entityAssignmentService } = await import('@/lib/services/entity-assignment.service')
    
    // Get assigned entities for the user
    const entities = await entityAssignmentService.getAssignedEntities(query.userId)
    
    return NextResponse.json({
      success: true,
      data: entities,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        count: entities.length
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error fetching assigned entities:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        },
        { status: 400 }
      )
    }
    
    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    
    return NextResponse.json(
      {
        error: errorMessage,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    )
  }
})