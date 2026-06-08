'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBranding';
import { RoleSwitcher } from '@/components/layouts/RoleSwitcher';
import { SyncIndicator } from './SyncIndicator';
import { OfflineIndicator } from './OfflineIndicator';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from '@/components/dashboards/shared/action-queue/NotificationBell';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface HeaderProps {
  fullWidth?: boolean;
}

export const Header = ({ fullWidth = false }: HeaderProps) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { appName, headerIconUrl } = useBranding();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogoutConfirm = async () => {
    setLogoutOpen(false);
    await logout();
  };

  return (
    <header className="bg-card shadow-sm border-b border-border">
      <div className={fullWidth ? "px-4 sm:px-6 lg:px-8" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2">
              {headerIconUrl && (
                <img src={headerIconUrl} alt="" className="h-8 w-8 object-contain" />
              )}
              {appName}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <>
                <SyncIndicator />
                <OfflineIndicator />
              </>
            )}
            <ThemeToggle />
            {isAuthenticated && (
              <NotificationBell />
            )}
            {isAuthenticated && user && (
              <div className="flex items-center gap-3">
                <RoleSwitcher />
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.name || user.email}
                </span>
                <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                  <AlertDialogTrigger asChild>
                    <button
                      className="px-3 py-1 text-sm text-destructive hover:text-destructive-foreground hover:bg-destructive/10 rounded transition-colors"
                    >
                      Logout
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sign Out</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to sign out of your account?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLogoutConfirm}>
                        Sign Out
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
