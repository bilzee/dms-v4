import { getAuthToken } from '@/lib/auth/token-utils'
import { apiGet } from '@/lib/api'

export interface AuthUser {
  id: string
  email: string
  name: string
  roles: string[]
}

export async function getCurrentUser(): Promise<AuthUser | null> {
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

    const data = result.data as any;
    if (!data?.data?.user) {
      return null;
    }

    const user = data.data.user;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles?.map((ur: { role: { name: string } }) => ur.role.name) || [],
    };
  } catch {
    return null;
  }
}
