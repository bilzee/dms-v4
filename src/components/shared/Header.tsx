'use client';

import { useAuth } from '@/hooks/useAuth';
import { RoleSwitcher } from '@/components/layouts/RoleSwitcher';
import { SyncIndicator } from './SyncIndicator';
import { OfflineIndicator } from './OfflineIndicator';
import { ThemeToggle } from './ThemeToggle';
import Link from 'next/link';

interface HeaderProps {
  fullWidth?: boolean;
}

export const Header = ({ fullWidth = false }: HeaderProps) => {
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  return (
    <header className="bg-card shadow-sm border-b border-border">
      <div className={fullWidth ? "px-4 sm:px-6 lg:px-8" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-semibold text-foreground hover:text-primary transition-colors">
              DMS Borno
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <SyncIndicator />
            <OfflineIndicator />
            <ThemeToggle />
            {isAuthenticated && user && (
              <div className="flex items-center gap-3">
                <RoleSwitcher />
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.name || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm text-destructive hover:text-destructive-foreground hover:bg-destructive/10 rounded transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};