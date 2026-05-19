import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, createdResponse, paginatedResponse, errorResponse, handleApiError } from '@/lib/api/response'
import { IncidentService } from '@/lib/services/incident.service'
import { UpdateIncidentSchema } from '@/lib/validation/incidents'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().min(1, 'Incident ID is required')
})

interface RouteParams {
  params: { id: string }
}

export const GET = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  try {
    const { id } = paramsSchema.parse(params)
    const incident = await IncidentService.findById(id)

    if (!incident) {
      return errorResponse('Incident not found', 404)
    }

    // Include population impact calculation
    const populationImpact = await IncidentService.calculatePopulationImpact(id)

    return successResponse({
      ...incident,
      populationImpact
    })
  } catch (error) {
    return handleApiError(error)
  }
})

export const PUT = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { roles } = context;
  if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
    return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
  }

  try {
    const { id } = paramsSchema.parse(params)
    const body = await request.json()

    // Handle empty body
    if (!body || typeof body !== 'object') {
      return errorResponse('Request body is required and must be a valid JSON object', 400)
    }

    const updateData = UpdateIncidentSchema.parse(body)

    const incident = await IncidentService.update(id, updateData)

    if (!incident) {
      return errorResponse('Incident not found', 404)
    }

    // Include updated population impact calculation
    const populationImpact = await IncidentService.calculatePopulationImpact(id)

    return successResponse({
      ...incident,
      populationImpact
    })
  } catch (error) {
    return handleApiError(error)
  }
})

export const DELETE = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { roles } = context;
  if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
    return errorResponse('Insufficient permissions. Coordinator or Admin role required.', 403);
  }

  try {
    const { id } = paramsSchema.parse(params)

    const incident = await IncidentService.softDelete(id, context.userId)

    if (!incident) {
      return errorResponse('Incident not found', 404)
    }

    return successResponse({
      success: true,
      message: 'Incident deleted successfully',
      deletedIncident: incident
    })
  } catch (error) {
    return handleApiError(error)
  }
})
