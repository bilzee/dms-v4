import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/middleware'

// Default severity thresholds
const defaultThresholds = {
  POPULATION: [
    {
      id: 'pop_medium',
      impactType: 'POPULATION',
      severityLevel: 'MEDIUM',
      livesLostMin: 1,
      injuredMin: 1,
      description: 'Any casualties reported',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'pop_high',
      impactType: 'POPULATION',
      severityLevel: 'HIGH',
      livesLostMin: 11,
      injuredMin: 101,
      description: 'Significant casualties (>10 deaths OR >100 injured)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'pop_critical',
      impactType: 'POPULATION',
      severityLevel: 'CRITICAL',
      livesLostMin: 101,
      injuredMin: 501,
      description: 'Mass casualties (>100 deaths OR >500 injured)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  PRELIMINARY: [
    {
      id: 'prelim_medium',
      impactType: 'PRELIMINARY',
      severityLevel: 'MEDIUM',
      livesLostMin: 1,
      injuredMin: 1,
      displacedMin: 1,
      description: 'Any casualties or displacement reported',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prelim_high',
      impactType: 'PRELIMINARY',
      severityLevel: 'HIGH',
      livesLostMin: 11,
      injuredMin: 51,
      displacedMin: 501,
      description: 'Significant impact (>10 deaths OR >50 injured OR >500 displaced)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prelim_critical',
      impactType: 'PRELIMINARY',
      severityLevel: 'CRITICAL',
      livesLostMin: 51,
      displacedMin: 1001,
      description: 'Mass casualties/displacement (>50 deaths OR >1000 displaced)',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const impactType = searchParams.get('impactType')

    let thresholds = []
    
    if (impactType && defaultThresholds[impactType as keyof typeof defaultThresholds]) {
      thresholds = defaultThresholds[impactType as keyof typeof defaultThresholds]
    } else {
      // Return all thresholds if no specific type requested
      thresholds = [
        ...defaultThresholds.POPULATION,
        ...defaultThresholds.PRELIMINARY
      ]
    }

    return NextResponse.json({
      success: true,
      data: thresholds,
      pagination: {
        total: thresholds.length,
        page: 1,
        limit: thresholds.length,
        totalPages: 1
      }
    })

  } catch (error) {
    console.error('Severity thresholds GET error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
})

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // RBAC: Only ADMIN and COORDINATOR can create severity thresholds
    if (!context.roles.some(r => ['ADMIN', 'COORDINATOR'].includes(r))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create severity thresholds' },
        { status: 403 }
      );
    }

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['impactType', 'severityLevel', 'livesLostMin', 'description']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Create new threshold (in a real implementation, this would save to database)
    const newThreshold = {
      id: `${body.impactType.toLowerCase()}_${body.severityLevel.toLowerCase()}_${Date.now()}`,
      impactType: body.impactType,
      severityLevel: body.severityLevel,
      livesLostMin: body.livesLostMin,
      injuredMin: body.injuredMin,
      displacedMin: body.displacedMin,
      description: body.description,
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: newThreshold,
      message: 'Severity threshold created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Severity thresholds POST error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
})
