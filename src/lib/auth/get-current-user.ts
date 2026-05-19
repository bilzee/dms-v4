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

    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!token) {
      return null;
    }

    const response = await fetch('/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
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
