# Navigation and Layout Components - Week 2 Implementation

## 1. AppShell Component

### Main Layout Wrapper
```tsx
// components/layout/app-shell.tsx
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { NavigationSidebar, navigationConfig } from './navigation-sidebar';
import { TopBar } from './top-bar';
import { MobileBottomNav } from './mobile-bottom-nav';
import { Breadcrumbs } from './breadcrumbs';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineStore } from '@/lib/stores/offlineStore';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
  showBreadcrumbs?: boolean;
  fullWidth?: boolean;
}

export function AppShell({ 
  children, 
  className,
  showBreadcrumbs = true,
  fullWidth = false 
}: AppShellProps) {
  const pathname = usePathname();
  const { user, currentRole, switchRole, logout } = useAuth();
  const { isOnline, syncQueueCount } = useOfflineStore();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Get navigation items for current role
  const navigation = navigationConfig[currentRole?.id as keyof typeof navigationConfig] || [];
  
  // Add dynamic badge counts
  const enhancedNavigation = navigation.map(item => ({
    ...item,
    badge: item.href.includes('/sync') ? syncQueueCount : 
           item.href.includes('/verification') ? notificationCount : 
           item.badge
  }));

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <NavigationSidebar
          user={{
            name: user?.name || '',
            email: user?.email || '',
            avatar: user?.avatar,
            roles: user?.roles || [],
            currentRole: currentRole || { id: '', name: '' }
          }}
          navigation={enhancedNavigation}
          isOnline={isOnline}
          syncQueueCount={syncQueueCount}
          notificationCount={notificationCount}
          onRoleSwitch={switchRole}
          onLogout={logout}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="relative flex w-64 flex-col bg-white">
            <NavigationSidebar
              user={{
                name: user?.name || '',
                email: user?.email || '',
                avatar: user?.avatar,
                roles: user?.roles || [],
                currentRole: currentRole || { id: '', name: '' }
              }}
              navigation={enhancedNavigation}
              isOnline={isOnline}
              syncQueueCount={syncQueueCount}
              notificationCount={notificationCount}
              onRoleSwitch={switchRole}
              onLogout={logout}
              mobileOpen={true}
              onMobileToggle={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar
          onMenuClick={() => setMobileMenuOpen(true)}
          isOnline={isOnline}
          syncPending={syncQueueCount}
          currentRole={currentRole}
          onRoleSwitch={switchRole}
        />

        {/* Breadcrumbs */}
        {showBreadcrumbs && (
          <div className="bg-white border-b px-4 lg:px-6 py-2">
            <Breadcrumbs />
          </div>
        )}

        {/* Page Content */}
        <main className={cn(
          "flex-1 overflow-y-auto",
          !fullWidth && "p-4 lg:p-6",
          className
        )}>
          <div className={cn(
            !fullWidth && "mx-auto max-w-7xl"
          )}>
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden">
          <MobileBottomNav 
            navigation={enhancedNavigation}
            currentPath={pathname}
          />
        </div>
      </div>
    </div>
  );
}
```

## 2. TopBar Component

### Header with Role Context
```tsx
// components/layout/top-bar.tsx
import { Menu, Bell, RefreshCw, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectionIndicator } from '@/components/ui/connection-indicator';
import { RoleSwitcher } from '@/components/ui/role-switcher';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';

interface TopBarProps {
  onMenuClick?: () => void;
  isOnline: boolean;
  syncPending: number;
  currentRole?: { id: string; name: string };
  onRoleSwitch?: (roleId: string) => void;
  showRoleSwitcher?: boolean;
}

export function TopBar({
  onMenuClick,
  isOnline,
  syncPending,
  currentRole,
  onRoleSwitch,
  showRoleSwitcher = true
}: TopBarProps) {
  const { user, logout } = useAuth();
  
  return (
    <header className="bg-white border-b">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* App Title */}
        <h1 className="text-lg font-semibold hidden sm:block">
          Disaster Management System
        </h1>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Connection Status */}
        <ConnectionIndicator
          isOnline={isOnline}
          syncPending={syncPending}
          variant="compact"
        />

        {/* Role Switcher (Desktop) */}
        {showRoleSwitcher && currentRole && onRoleSwitch && (
          <div className="hidden lg:block">
            <RoleSwitcher
              currentRole={currentRole}
              availableRoles={user?.roles || []}
              onSwitch={onRoleSwitch}
              variant="default"
            />
          </div>
        )}

        {/* Sync Button */}
        {syncPending > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.syncEngine?.syncNow()}
            className="relative"
          >
            <RefreshCw className="h-4 w-4" />
            {syncPending > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-orange-500 text-xs text-white flex items-center justify-center">
                {syncPending}
              </span>
            )}
          </Button>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
            3
          </span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

## 3. Breadcrumbs Component

### Dynamic Breadcrumb Navigation
```tsx
// components/layout/breadcrumbs.tsx
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  
  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Always add home
    breadcrumbs.push({
      label: 'Home',
      href: '/',
      icon: <Home className="h-4 w-4" />
    });
    
    // Build breadcrumb items
    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      
      // Format label
      const label = path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      breadcrumbs.push({
        label,
        href: index === paths.length - 1 ? undefined : currentPath
      });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
            )}
            <li>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  {crumb.icon}
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium flex items-center gap-1">
                  {crumb.icon}
                  {crumb.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

// Advanced breadcrumb with custom mappings
export function BreadcrumbsAdvanced() {
  const pathname = usePathname();
  
  // Custom label mappings
  const labelMap: Record<string, string> = {
    'assessor': 'Assessor Portal',
    'coordinator': 'Coordinator Portal',
    'responder': 'Responder Portal',
    'donor': 'Donor Portal',
    'admin': 'Administration',
    'assessments': 'Assessments',
    'rapid': 'Rapid Assessments',
    'verification': 'Verification Queue',
    'entities': 'Affected Entities',
    'sync': 'Sync Queue',
    'new': 'Create New',
    'edit': 'Edit',
  };
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      
      // Use custom label or format from path
      const label = labelMap[path] || path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Don't link the last item
      const href = index === paths.length - 1 ? undefined : currentPath;
      
      breadcrumbs.push({ label, href });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  if (breadcrumbs.length === 0) return null;
  
  return (
    <nav aria-label="Breadcrumb" className="flex">
      <ol className="flex items-center space-x-2 text-sm">
        <li>
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-700"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {breadcrumbs.map((crumb, index) => (
          <Fragment key={index}>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <li>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">
                  {crumb.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
```

## 4. MobileBottomNav Component

### Mobile Bottom Navigation Bar
```tsx
// components/layout/mobile-bottom-nav.tsx
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Home, FileText, MapPin, Cloud, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

interface MobileBottomNavProps {
  navigation: NavItem[];
  currentPath: string;
}

export function MobileBottomNav({ 
  navigation, 
  currentPath 
}: MobileBottomNavProps) {
  // Take first 4 items for main nav, rest go in menu
  const mainItems = navigation.slice(0, 4);
  const moreItems = navigation.slice(4);
  
  const isActive = (href: string) => {
    return currentPath === href || currentPath.startsWith(href + '/');
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40">
      <div className="flex justify-around items-center h-16">
        {mainItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative",
                "text-xs transition-colors",
                active ? "text-blue-600" : "text-gray-600"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5 mb-1" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="truncate px-1">{item.label}</span>
              {active && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </Link>
          );
        })}
        
        {moreItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 text-xs">
              <MoreHorizontal className="h-5 w-5 mb-1" />
              <span>More</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mb-2">
              {moreItems.map(item => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="ml-auto text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
```

## 5. PageHeader Component

### Consistent Page Headers
```tsx
// components/layout/page-header.tsx
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  children,
  className
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Example usage with filters
export function PageHeaderWithFilters() {
  return (
    <PageHeader
      title="Verification Queue"
      description="Review and approve pending assessments and responses"
      badge={<StatusBadge status="pending" count={24} />}
      actions={
        <>
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Button size="sm">
            Auto-Approve All
          </Button>
        </>
      }
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <Select>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="health">Health</SelectItem>
            <SelectItem value="wash">WASH</SelectItem>
          </SelectContent>
        </Select>
        
        <Select>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="camps">Camps Only</SelectItem>
            <SelectItem value="communities">Communities Only</SelectItem>
          </SelectContent>
        </Select>
        
        <Input
          placeholder="Search..."
          className="w-full sm:w-60"
        />
      </div>
    </PageHeader>
  );
}
```

## 6. ResponsiveGrid Component

### Responsive Grid Layout Helper
```tsx
// components/layout/responsive-grid.tsx
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({
  children,
  columns = { default: 1, sm: 2, lg: 3, xl: 4 },
  gap = 'md',
  className
}: ResponsiveGridProps) {
  const gapSizes = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };
  
  const gridCols = cn(
    'grid',
    columns.default && `grid-cols-${columns.default}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
    gapSizes[gap],
    className
  );
  
  return <div className={gridCols}>{children}</div>;
}

// Pre-configured layouts
export const DashboardGrid = ({ children }: { children: React.ReactNode }) => (
  <ResponsiveGrid columns={{ default: 1, md: 2, xl: 4 }} gap="md">
    {children}
  </ResponsiveGrid>
);

export const FormGrid = ({ children }: { children: React.ReactNode }) => (
  <ResponsiveGrid columns={{ default: 1, md: 2 }} gap="lg">
    {children}
  </ResponsiveGrid>
);

export const CardGrid = ({ children }: { children: React.ReactNode }) => (
  <ResponsiveGrid columns={{ default: 1, sm: 2, lg: 3 }} gap="md">
    {children}
  </ResponsiveGrid>
);
```

## 7. SplitLayout Component

### Split View Layout
```tsx
// components/layout/split-layout.tsx
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface SplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultSplit?: number; // Percentage for left panel
  minSize?: number; // Minimum width in pixels
  resizable?: boolean;
  className?: string;
}

export function SplitLayout({
  left,
  right,
  defaultSplit = 50,
  minSize = 200,
  resizable = false,
  className
}: SplitLayoutProps) {
  const [split, setSplit] = useState(defaultSplit);
  const [isResizing, setIsResizing] = useState(false);
  
  const handleMouseDown = () => {
    if (!resizable) return;
    setIsResizing(true);
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const container = document.getElementById('split-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const newSplit = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Enforce minimum sizes
    const minSplitPercent = (minSize / containerRect.width) * 100;
    const maxSplitPercent = 100 - minSplitPercent;
    
    setSplit(Math.min(Math.max(newSplit, minSplitPercent), maxSplitPercent));
  };
  
  const handleMouseUp = () => {
    setIsResizing(false);
  };
  
  // Add global mouse event listeners when resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };
    }
  }, [isResizing]);
  
  return (
    <div
      id="split-container"
      className={cn("flex h-full", className)}
    >
      {/* Left Panel */}
      <div
        style={{ width: `${split}%` }}
        className="overflow-auto"
      >
        {left}
      </div>
      
      {/* Resizer */}
      {resizable && (
        <div
          className={cn(
            "relative w-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize",
            isResizing && "bg-blue-400"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      )}
      
      {/* Right Panel */}
      <div
        style={{ width: resizable ? `${100 - split}%` : '50%' }}
        className="overflow-auto"
      >
        {right}
      </div>
    </div>
  );
}
```
