import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { ZodError } from 'zod'
import { ApiError } from '@/types/api'

const API_VERSION = '1.0.0'

function makeMeta() {
  return {
    timestamp: new Date().toISOString(),
    version: API_VERSION,
    requestId: uuidv4(),
  }
}

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, data, meta: makeMeta() },
    { status }
  )
}

export function createdResponse<T>(data: T): NextResponse {
  return successResponse(data, 201)
}

export function paginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): NextResponse {
  return NextResponse.json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    meta: makeMeta(),
  })
}

export function errorResponse(
  error: string,
  status = 500,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    { success: false, error, details, meta: makeMeta() },
    { status }
  )
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.statusCode, error.details)
  }

  if (error instanceof ZodError) {
    return errorResponse('Validation failed', 400, error.errors)
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: unknown }
    if (prismaError.code === 'P2025') {
      return errorResponse('Resource not found', 404)
    }
    if (prismaError.code === 'P2002') {
      return errorResponse('Duplicate entry - resource already exists', 409)
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('not found') || error.message.includes('Not found')) {
      return errorResponse(error.message, 404)
    }
    if (error.message.includes('not assigned') || error.message.includes('not authorized')) {
      return errorResponse(error.message, 403)
    }
    if (error.message.includes('already exists') || error.message.includes('already been')) {
      return errorResponse(error.message, 409)
    }
  }

  return errorResponse(
    error instanceof Error ? error.message : 'Internal server error',
    500
  )
}
