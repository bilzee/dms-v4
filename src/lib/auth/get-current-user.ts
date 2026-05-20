import { getAuthToken } from '@/lib/auth/token-utils'
import { apiGet } from '@/lib/api'

/**
 * Simplified user representation returned by getCurrentUser().
 * Unlike the full AuthUser from @/types/auth (which includes Prisma role/permission objects),
 * this interface contains a flattened roles array for lightweight client-side use.
 */
export interface SimpleAuthUser {
  id: string
  email: string
  name: string
  roles: string[]
}

/** Shape of the /api/v1/auth/me response data (may be nested under 'data' or at top level) */
interface AuthMeResponseData {
  data?: {
    user?: {
      id: string
      email: string
      name: string
      roles?: Array<{ role: { name: string } }>
    }
  }
  user?: {
    id: string
    email: string
    name: string
    roles?: Array<{ role: { name: string } }>
  }
}

export async function getCurrentUser(): Promise<SimpleAuthUser | null> {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    const token = getAuthToken();
    if (!token) {
      return null;
    }

    const result = await apiGet('/api/v1/auth/me');

    if (!result.success) {
      return null;
    }

    const data = result.data as AuthMeResponseData | undefined;
    const rawUser = data?.data?.user ?? data?.user;
    if (!rawUser) {
      return null;
    }

    return {
      id: rawUser.id,
      email: rawUser.email,
      name: rawUser.name,
      roles: rawUser.roles?.map((ur) => ur.role.name) || [],
    };
  } catch {
    return null;
  }
}
