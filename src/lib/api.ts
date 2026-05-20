import { getAuthToken, getAuthHeaders } from '@/lib/auth/token-utils'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    timestamp: string
    version: string
    requestId: string
  }
}

export { getAuthToken, getAuthHeaders }

/**
 * Make an authenticated GET request
 */
export const apiGet = async <T = any>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers
      },
      ...options
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return data
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Make an authenticated POST request
 */
export const apiPost = async <T = any>(
  url: string, 
  body?: any, 
  options?: RequestInit
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return data
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Make an authenticated PUT request
 */
export const apiPut = async <T = any>(
  url: string, 
  body?: any, 
  options?: RequestInit
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return data
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Make an authenticated PATCH request
 */
export const apiPatch = async <T = any>(
  url: string,
  body?: any,
  options?: RequestInit
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return data
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Make an authenticated DELETE request
 */
export const apiDelete = async <T = any>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers
      },
      ...options
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return data
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}