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
          <div className="flex items-center gap-1 sm:gap-4 justify-end">
            {isAuthenticated && (
              <>
                <div className="hidden sm:block">
                  <SyncIndicator />
                </div>
                <div className="hidden sm:block">
                  <OfflineIndicator />
                </div>
              </>
            )}
            <ThemeToggle />
            {isAuthenticated && (
              <NotificationBell />
            )}
            {isAuthenticated && user && (
              <div className="flex items-center gap-2 sm:gap-3">
                <RoleSwitcher />
                <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                  <AlertDialogTrigger asChild>
                    <button
                      className="px-3 py-1 text-sm text-destructive hover:text-destructive-foreground hover:bg-destructive/10 rounded transition-colors"
                    >
                      <span className="hidden sm:inline">Logout</span>
                      <svg className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
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
