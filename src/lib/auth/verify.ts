import { NextRequest } from 'next/server';
import { AuthService, AuthTokenPayload, UserWithRoles } from './service';
import { extractAuthToken } from './middleware';

export interface AuthResult {
  success: boolean;
  user?: UserWithRoles;
  payload?: AuthTokenPayload;
  error?: string;
}

export async function verifyToken(request: NextRequest): Promise<AuthResult> {
  try {
    const token = extractAuthToken(request);

    if (!token) {
      return { success: false, error: 'Missing authorization token' };
    }

    const payload = AuthService.verifyToken(token);
    const user = await AuthService.getUserWithRoles(payload.userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.isActive) {
      return { success: false, error: 'User account is deactivated' };
    }

    if (user.isLocked) {
      return { success: false, error: 'User account is locked' };
    }

    return { success: true, user, payload };

  } catch (error) {
    return { success: false, error: 'Invalid or expired token' };
  }
}

export async function verifyTokenWithRole(request: NextRequest, requiredRole: string): Promise<AuthResult> {
  const authResult = await verifyToken(request);

  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const hasRole = authResult.user.roles.some(
    userRole => userRole.role.name === requiredRole
  );

  if (!hasRole) {
    return { success: false, error: `Missing required role: ${requiredRole}` };
  }

  return authResult;
}
