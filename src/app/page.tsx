'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_DASHBOARD_PATHS } from '@/lib/auth/route-config';
import type { RoleName } from '@/types/auth';

export default function HomePage() {
  const { isAuthenticated, currentRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (currentRole && ROLE_DASHBOARD_PATHS[currentRole as RoleName]) {
      router.replace(ROLE_DASHBOARD_PATHS[currentRole as RoleName]);
    } else {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, currentRole, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-muted-foreground">Loading dashboard...</div>
    </div>
  );
}
