'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';
import { RoleName } from '@/types/auth';
import {
  ROLE_DASHBOARD_PATHS,
  ROLE_PATH_PATTERNS,
  ROLE_ACCESSIBLE_PATHS,
} from '@/lib/auth/route-config';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  requiredRole?: RoleName;
  requiredRoles?: RoleName[];
  fallbackPath?: string;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
}

export const RoleBasedRoute = ({
  children,
  requiredRole,
  requiredRoles = [],
  fallbackPath,
  loadingComponent,
  errorComponent
}: RoleBasedRouteProps) => {
  const { isAuthenticated, currentRole, availableRoles } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!useAuthStore.persist?.hasHydrated()) return

    const checkAccess = async () => {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (!currentRole) {
        if (availableRoles.length > 0) {
          router.push(ROLE_DASHBOARD_PATHS[availableRoles[0]]);
          return;
        }
        return;
      }

      if (requiredRole && currentRole !== requiredRole) {
        if (errorComponent) {
          setIsChecking(false);
          return;
        }
        const fallback = fallbackPath || ROLE_DASHBOARD_PATHS[currentRole] || '/dashboard';
        router.push(fallback);
        return;
      }

      if (requiredRoles.length > 0 && (!currentRole || !requiredRoles.includes(currentRole))) {
        if (errorComponent) {
          setIsChecking(false);
          return;
        }
        const fallback = fallbackPath || ROLE_DASHBOARD_PATHS[currentRole] || '/dashboard';
        router.push(fallback);
        return;
      }

      setIsChecking(false);
    };

    checkAccess();
  }, [isAuthenticated, currentRole, availableRoles, router, requiredRole, requiredRoles, fallbackPath, pathname, errorComponent]);

  if (isChecking) {
    return loadingComponent || <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (requiredRole && currentRole !== requiredRole) {
    return errorComponent || <>{children}</>;
  }

  if (requiredRoles.length > 0 && (!currentRole || !requiredRoles.includes(currentRole))) {
    return errorComponent || <>{children}</>;
  }

  return <>{children}</>;
};

export const useRoleNavigation = () => {
  const { currentRole, availableRoles } = useAuth();
  const router = useRouter();

  const navigateToRoleDashboard = (role?: RoleName) => {
    const targetRole = role || currentRole;
    if (!targetRole) return;

    router.push(ROLE_DASHBOARD_PATHS[targetRole]);
  };

  const canAccessPath = (path: string): boolean => {
    if (!currentRole) return false;

    const allowedPatterns = ROLE_PATH_PATTERNS[currentRole] || [];
    return allowedPatterns.some(pattern => pattern.test(path));
  };

  const getAccessiblePaths = (): string[] => {
    if (!currentRole) return [];

    return ROLE_ACCESSIBLE_PATHS[currentRole] || [];
  };

  return {
    navigateToRoleDashboard,
    canAccessPath,
    getAccessiblePaths,
    currentRole,
    availableRoles
  };
};
