import { NextRequest, NextResponse } from 'next/server'
import { AuthService, AuthTokenPayload, UserWithRoles } from './service'

export interface AuthContext {
  user: UserWithRoles
  userId: string
  roles: string[]
  permissions: string[]
  request: NextRequest
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext,
  params?: any
) => Promise<NextResponse> | NextResponse

/**
 * Higher-order function to add authentication to API routes
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, nextContext?: any): Promise<NextResponse> => {
    try {
      const authorization = request.headers.get('Authorization')

      if (!authorization || !authorization.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        )
      }

      const token = authorization.substring(7)

      const payload = AuthService.verifyToken(token)

      const user = await AuthService.getUserWithRoles(payload.userId)

      if (!user || !user.isActive) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      if (user.isLocked) {
        return NextResponse.json(
          { error: 'Account is locked' },
          { status: 403 }
        )
      }

      const userRoles = user.roles.map(ur => ur.role.name)

      const context: AuthContext = {
        user,
        userId: user.id,
        roles: userRoles,
        permissions: user.roles.flatMap((ur: any) => ur.role.permissions.map((p: any) => p.permission.code)),
        request
      }

      return await handler(request, context, nextContext)
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
  }
}

// NOTE: Deprecated decorator functions removed as they are incompatible with Next.js 14.2.5 async params
// Use manual role checks inside the handler instead
// Example: if (!context.roles.includes('COORDINATOR')) { return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }); }

/**
 * Extract auth token from request headers
 */
export function extractAuthToken(request: NextRequest): string | null {
  const authorization = request.headers.get('Authorization')
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null
  }

  return authorization.substring(7)
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthTokenPayload | null> {
  try {
    const token = extractAuthToken(request)
    
    if (!token) {
      return null
    }

    return AuthService.verifyToken(token)
  } catch {
    return null
  }
}