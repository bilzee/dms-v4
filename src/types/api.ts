export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: unknown
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedData<T> {
  items: T[]
  pagination: PaginationInfo
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function createApiResponse<T = unknown>(
  success: boolean,
  data: T | null,
  message?: string,
  details?: unknown
): ApiResponse<T | null> & { message?: string; details?: unknown } {
  return {
    success,
    data,
    message,
    details,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      requestId: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    },
  }
}
