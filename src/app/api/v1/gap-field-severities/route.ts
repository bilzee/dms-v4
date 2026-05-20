/**
 * Gap Field Severities API
 * 
 * CRUD operations for managing gap field severity configurations
 * - GET: List gap field severities (with filtering by assessment type)
 * - PUT: Update field severity (Coordinator access)
 * - POST: Create new gap field (Admin access)
 * - DELETE: Deactivate gap field (Admin access)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
import { z } from 'zod'
import { AssessmentType, Priority } from '@prisma/client'
import { handleApiError } from '@/lib/api/response'

// Validation schemas
const getGapFieldsSchema = z.object({
  assessmentType: z.nativeEnum(AssessmentType).optional(),
  fieldName: z.string().nullable().optional(),
  isActive: z.string().nullable().optional().transform((val) => val ? val === 'true' : undefined)
})

const createGapFieldSchema = z.object({
  fieldName: z.string().min(1).max(100),
  assessmentType: z.nativeEnum(AssessmentType),
  severity: z.nativeEnum(Priority).default(Priority.MEDIUM),
  displayName: z.string().min(1).max(150),
  description: z.string().optional()
})

/**
 * GET /api/v1/gap-field-severities
 * List gap field severities with optional filtering
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Check user has coordinator or admin role
    const hasPermission = context.roles.some(role => 
      role === 'COORDINATOR' || role === 'ADMIN'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions',
          details: 'User lacks coordinator or admin role'
        }, 
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = getGapFieldsSchema.parse({
      assessmentType: searchParams.get('assessmentType'),
      fieldName: searchParams.get('fieldName'),
      isActive: searchParams.get('isActive')
    })

    // If specific field name is provided, do field-specific lookup
    if (filters.fieldName && filters.assessmentType) {
      try {
        // Import the service for field name mapping and severity calculation
        const { gapFieldSeverityService } = await import('@/lib/services/gap-field-severity.service')
        
        const severity = await gapFieldSeverityService.calculateFieldSeverity(
          filters.assessmentType,
          filters.fieldName
        )
        
        return NextResponse.json({
          success: true,
          data: {
            fieldName: filters.fieldName,
            assessmentType: filters.assessmentType,
            severity
          }
        })
      } catch (error) {
        return handleApiError(error)
      }
    }

    const gapFields = await prisma.gapFieldSeverity.findMany({
      where: {
        ...(filters.assessmentType && { assessmentType: filters.assessmentType }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive })
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        updatedByUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { assessmentType: 'asc' },
        { displayName: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: gapFields,
      count: gapFields.length
    })

  } catch (error) {
    return handleApiError(error)
  }
})

/**
 * POST /api/v1/gap-field-severities
 * Create new gap field (Admin only)
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Check user has admin role
    const hasPermission = context.roles.includes('ADMIN')

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Admin permissions required' }, 
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = createGapFieldSchema.parse(body)

    // Check if field already exists
    const existing = await prisma.gapFieldSeverity.findUnique({
      where: {
        unique_field_assessment: {
          fieldName: data.fieldName,
          assessmentType: data.assessmentType
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Gap field already exists for this assessment type' },
        { status: 409 }
      )
    }

    const gapField = await prisma.gapFieldSeverity.create({
      data: {
        ...data,
        createdBy: context.userId
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: gapField,
      message: 'Gap field created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating gap field:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: error.errors
        }, 
        { status: 400 }
      )
    }
    return handleApiError(error)
  }
})
