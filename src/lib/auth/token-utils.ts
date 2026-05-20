/**
 * Token utility for consistent authentication token management
 * This utility handles the transition between 'token' and 'auth_token' keys
 */

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  
  // Try the new standard key first, then fall back to the old key
  return localStorage.getItem('auth_token') || localStorage.getItem('token')
}

const COOKIE_NAME = 'auth_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return
  
  localStorage.setItem('auth_token', token)
  localStorage.setItem('token', token)
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

export const removeAuthToken = (): void => {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem('auth_token')
  localStorage.removeItem('token')
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

export const createAuthenticatedFetch = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken()
  
  if (!token) {
    throw new Error('No authentication token available')
  }
  
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  }
  
  return fetch(url, {
    ...options,
    headers
  })
}

export const handleAuthError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes('401') || error.message.includes('403')) {
      return 'Authentication failed. Please log in again.'
    }
    if (error.message.includes('token')) {
      return 'Invalid or expired authentication token. Please log in again.'
    }
    return error.message
  }
  
  const errorStr = String(error)
  if (errorStr.includes('401') || errorStr.includes('403')) {
    return 'Authentication failed. Please log in again.'
  }
  if (errorStr.includes('token')) {
    return 'Invalid or expired authentication token. Please log in again.'
  }
  
  return 'An unexpected error occurred'
}

// React hook for getting token consistently
export const useAuthToken = () => {
  return getAuthToken()
}