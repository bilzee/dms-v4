import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, createdResponse, paginatedResponse, errorResponse, handleApiError } from '@/lib/api/response'
import { RapidAssessmentService } from '@/lib/services/rapid-assessment.service'
import {
  CreateRapidAssessmentSchema,
  QueryRapidAssessmentSchema
} from '@/lib/validation/rapid-assessment'

export const GET = withAuth(async (request, context) => {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)

    const query = QueryRapidAssessmentSchema.parse(searchParams)

    // Handle userId "me" substitution
    const effectiveUserId = query.userId === 'me' ? context.userId : query.userId

    // For ASSESSOR role users requesting their own assessments (userId=me), always use user-specific path
    const shouldUseUserPath = (effectiveUserId && effectiveUserId === context.userId) ||
                             (context.roles.includes('ASSESSOR') && query.userId === 'me');

    if (shouldUseUserPath) {
      const result = await RapidAssessmentService.findByUserId(
        context.userId,
        { ...query, userId: effectiveUserId }
      );

      const { assessments, total, totalPages } = result;

      return paginatedResponse(assessments, query.page, query.limit, total)
    } else {
      // Otherwise, get all assessments (admin/coordinator access)
      const { assessments, total, totalPages } = await RapidAssessmentService.findAll(query)

      return paginatedResponse(assessments, query.page, query.limit, total)
    }
  } catch (error) {
    return handleApiError(error)
  }
})

export const POST = withAuth(async (request, context) => {
  const { user, roles } = context;

  if (!roles.includes('ASSESSOR')) {
    return errorResponse('Insufficient permissions. Assessor role required.', 403);
  }

  try {
    const body = await request.json()
    const input = CreateRapidAssessmentSchema.parse(body)

    const assessment = await RapidAssessmentService.create(input, context.userId)

    return createdResponse(assessment)
  } catch (error) {
    return handleApiError(error)
  }
})
