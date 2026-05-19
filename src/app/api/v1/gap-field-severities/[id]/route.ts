/**
 * Individual Gap Field Severity API
 * 
 * Operations for specific gap field severities
 * - GET: Get specific gap field details
 * - PUT: Update field severity (Coordinator access)
 * - DELETE: Deactivate gap field (Admin access)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { PrismaClient, Priority } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const updateGapFieldSchema = z.object({
  severity: z.nativeEnum(Priority)
})

/**
 * GET /api/v1/gap-field-severities/[id]
 * Get specific gap field details
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    // Check user has coordinator or admin role
    const hasPermission = context.roles.some(role => 
      role === 'COORDINATOR' || role === 'ADMIN'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' }, 
        { status: 403 }
      )
    }

    const gapField = await prisma.gapFieldSeverity.findUnique({
      where: { id: params.id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        updatedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!gapField) {
      return NextResponse.json(
        { error: 'Gap field not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: gapField
    })

  } catch (error) {
    console.error('Error fetching gap field:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch gap field',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
})

/**
 * PUT /api/v1/gap-field-severities/[id]
 * Update field severity (Coordinator access)
 */
export const PUT = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    // Check user has coordinator or admin role
    const hasPermission = context.roles.some(role => 
      role === 'COORDINATOR' || role === 'ADMIN'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { 
          error: 'Coordinator permissions required',
          details: 'User lacks coordinator or admin role'
        }, 
        { status: 403 }
      )
    }

    const body = await request.json()
    const { severity } = updateGapFieldSchema.parse(body)

    // Check if gap field exists
    const existingField = await prisma.gapFieldSeverity.findUnique({
      where: { id: params.id }
    })

    if (!existingField) {
      return NextResponse.json(
        { error: 'Gap field not found' },
        { status: 404 }
      )
    }

    // Update the gap field severity
    const updatedField = await prisma.gapFieldSeverity.update({
      where: { id: params.id },
      data: {
        severity,
        updatedBy: context.userId
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        updatedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Log the severity change for audit trail
    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        action: 'UPDATE_GAP_FIELD_SEVERITY',
        resource: 'gap_field_severities',
        resourceId: params.id,
        oldValues: { severity: existingField.severity },
        newValues: { severity },
        timestamp: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedField,
      message: `Severity updated to ${severity}`
    })

  } catch (error) {
    console.error('Error updating gap field:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: error.errors
        }, 
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to update gap field',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/v1/gap-field-severities/[id]
 * Deactivate gap field (Admin access)
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    // Check user has admin role
    const hasPermission = context.roles.includes('ADMIN')

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Admin permissions required' }, 
        { status: 403 }
      )
    }

    // Check if gap field exists
    const existingField = await prisma.gapFieldSeverity.findUnique({
      where: { id: params.id }
    })

    if (!existingField) {
      return NextResponse.json(
        { error: 'Gap field not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    const deactivatedField = await prisma.gapFieldSeverity.update({
      where: { id: params.id },
      data: {
        isActive: false,
        updatedBy: context.userId
      }
    })

    // Log the deactivation for audit trail
    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        action: 'DEACTIVATE_GAP_FIELD',
        resource: 'gap_field_severities',
        resourceId: params.id,
        oldValues: { isActive: true },
        newValues: { isActive: false },
        timestamp: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: deactivatedField,
      message: 'Gap field deactivated successfully'
    })

  } catch (error) {
    console.error('Error deactivating gap field:', error)
    return NextResponse.json(
      { 
        error: 'Failed to deactivate gap field',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
})
