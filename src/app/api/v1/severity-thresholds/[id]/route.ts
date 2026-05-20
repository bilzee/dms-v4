import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { handleApiError } from '@/lib/api/response'

// For demo purposes, store changes in memory
// In production, this would be stored in a database
const thresholdUpdates: Record<string, any> = {}

export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params

    // In a real implementation, fetch from database
    // For now, return a mock response
    const threshold = {
      id,
      impactType: id.startsWith('pop_') ? 'POPULATION' : 'PRELIMINARY',
      severityLevel: id.includes('critical') ? 'CRITICAL' : id.includes('high') ? 'HIGH' : 'MEDIUM',
      livesLostMin: 1,
      injuredMin: 1,
      displacedMin: 1,
      description: 'Configurable threshold',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...thresholdUpdates[id] // Apply any updates
    }

    return NextResponse.json({
      success: true,
      data: threshold
    })

  } catch (error) {
    return handleApiError(error)
  }
})

export const PUT = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    // RBAC: Only ADMIN and COORDINATOR can update severity thresholds
    if (!context.roles.some(r => ['ADMIN', 'COORDINATOR'].includes(r))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to update severity thresholds' },
        { status: 403 }
      );
    }

    const { id } = params
    const body = await request.json()

    // Validate update fields
    const allowedFields = [
      'livesLostMin', 
      'injuredMin', 
      'displacedMin', 
      'description', 
      'isActive'
    ]
    
    const updateData: any = {}
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value
      }
    }

    // Add updated timestamp
    updateData.updatedAt = new Date().toISOString()

    // Store the update (in production, this would update the database)
    thresholdUpdates[id] = { ...thresholdUpdates[id], ...updateData }

    // Return updated threshold
    const updatedThreshold = {
      id,
      impactType: id.startsWith('pop_') ? 'POPULATION' : 'PRELIMINARY',
      severityLevel: id.includes('critical') ? 'CRITICAL' : id.includes('high') ? 'HIGH' : 'MEDIUM',
      livesLostMin: 1,
      injuredMin: 1,
      displacedMin: 1,
      description: 'Configurable threshold',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...thresholdUpdates[id]
    }

    return NextResponse.json({
      success: true,
      data: updatedThreshold,
      message: 'Severity threshold updated successfully'
    })

  } catch (error) {
    return handleApiError(error)
  }
})

export const DELETE = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    // RBAC: Only ADMIN can delete severity thresholds
    if (!context.roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to delete severity thresholds' },
        { status: 403 }
      );
    }

    const { id } = params

    // In production, this would delete from database
    delete thresholdUpdates[id]

    return NextResponse.json({
      success: true,
      message: 'Severity threshold deleted successfully'
    })

  } catch (error) {
    return handleApiError(error)
  }
})
