import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, createdResponse, paginatedResponse, errorResponse, handleApiError } from '@/lib/api/response'
import { IncidentService } from '@/lib/services/incident.service'
import {
  CreateIncidentSchema,
  QueryIncidentSchema
} from '@/lib/validation/incidents'

export const GET = withAuth(async (request, context) => {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)

    const query = QueryIncidentSchema.parse(searchParams)

    const { incidents, total, totalPages } = await IncidentService.findAll(query)

    return paginatedResponse(incidents, query.page, query.limit, total)
  } catch (error) {
    return handleApiError(error)
  }
})

export const POST = withAuth(async (request: NextRequest, context) => {
  const { roles } = context;
  if (!roles.includes('ASSESSOR') && !roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
    return errorResponse('Insufficient permissions. Assessor, Coordinator, or Admin role required.', 403);
  }

  try {
    const body = await request.json()
    const input = CreateIncidentSchema.parse(body)

    const incident = await IncidentService.create(input, context.userId)

    return createdResponse(incident)
  } catch (error) {
    return handleApiError(error)
  }
})
