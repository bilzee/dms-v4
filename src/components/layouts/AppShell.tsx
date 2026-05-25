'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/shared/Header';
import { Navigation } from '@/components/layouts/Navigation';
import { SyncIndicator } from '@/components/shared/SyncIndicator';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Menu, X, Shield } from '@/lib/icons';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AppShellProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  isDashboard?: boolean;
  isFullscreen?: boolean;
  showBreadcrumbs?: boolean;
}

export const AppShell = ({ 
  children, 
  showNavigation = true, 
  isDashboard = false,
  isFullscreen = false,
  showBreadcrumbs = true 
}: AppShellProps) => {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sidebarOpen) {
      const firstButton = sidebarRef.current?.querySelector('button');
      firstButton?.focus();
    }
  }, [sidebarOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header fullWidth={isDashboard} />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Mobile sidebar */}
      <div
        ref={sidebarRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-background shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Navigation</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Navigation />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:overflow-y-auto lg:bg-background lg:border-r lg:border-border">
        <div className="flex h-full flex-col">
          {/* Role information */}
          <div className="flex h-16 items-center px-4 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold text-foreground">DMS Borno</span>
            </Link>
          </div>
          
          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <Navigation />
          </div>
          
          {/* Status indicators */}
          <div className="p-4 border-t space-y-2">
            <SyncIndicator />
            <OfflineIndicator />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Top bar for mobile */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
            </div>
            
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="hidden sm:block">
                <SyncIndicator />
              </div>
              <OfflineIndicator />
            </div>
          </div>
        </div>

        {/* Main content */}
        <main id="main-content" className={cn(
          isDashboard ? 'py-0' : 'py-6'
        )}>
          {/* Breadcrumbs - shown on all pages except dashboard root */}
          {!isDashboard && showBreadcrumbs && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
              <Breadcrumbs />
            </div>
          )}
          
          <div className={cn(
            isFullscreen
              ? 'w-full h-full'
              : isDashboard
                ? 'px-4 sm:px-6 w-full'
                : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};