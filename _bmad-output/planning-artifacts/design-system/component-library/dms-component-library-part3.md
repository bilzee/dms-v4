# DMS Core Component Library - Part 3

## 12. DashboardCard Component

### Implementation
```tsx
// components/ui/dashboard-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  color?: 'default' | 'blue' | 'green' | 'yellow' | 'red';
  className?: string;
}

export function DashboardCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  actions,
  color = 'default',
  className
}: DashboardCardProps) {
  const colorStyles = {
    default: "border-gray-200",
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    yellow: "border-yellow-200 bg-yellow-50",
    red: "border-red-200 bg-red-50"
  };

  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-green-600" />,
    down: <TrendingDown className="h-4 w-4 text-red-600" />,
    neutral: <Minus className="h-4 w-4 text-gray-400" />
  };

  return (
    <Card className={cn(colorStyles[color], className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {icon && <div className="text-gray-400">{icon}</div>}
            {actions && actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.map((action, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              {trendIcons[trend.direction]}
              <span className={cn(
                "text-sm font-medium",
                trend.direction === 'up' && "text-green-600",
                trend.direction === 'down' && "text-red-600",
                trend.direction === 'neutral' && "text-gray-500"
              )}>
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-xs text-gray-500 ml-1">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 13. GapAnalysisIndicator Component

### Implementation
```tsx
// components/ui/gap-analysis-indicator.tsx
import { AlertTriangle, CheckCircle, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Gap {
  category: string;
  hasGap: boolean;
  severity?: 'low' | 'medium' | 'high';
  details?: string;
}

interface GapAnalysisIndicatorProps {
  gaps: Gap[];
  variant?: 'compact' | 'detailed' | 'grid';
  showTooltips?: boolean;
  className?: string;
}

export function GapAnalysisIndicator({
  gaps,
  variant = 'compact',
  showTooltips = true,
  className
}: GapAnalysisIndicatorProps) {
  const overallSeverity = calculateOverallSeverity(gaps);
  
  function calculateOverallSeverity(gaps: Gap[]) {
    const gapsWithIssues = gaps.filter(g => g.hasGap);
    if (gapsWithIssues.length === 0) return 'none';
    if (gapsWithIssues.length === 1) return 'mild';
    if (gapsWithIssues.some(g => g.severity === 'high')) return 'severe';
    return 'moderate';
  }

  const severityConfig = {
    none: {
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'text-green-600',
      bg: 'bg-green-100',
      border: 'border-green-300',
      label: 'No Gaps'
    },
    mild: {
      icon: <AlertCircle className="h-5 w-5" />,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      border: 'border-yellow-300',
      label: 'Minor Gaps'
    },
    moderate: {
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      border: 'border-orange-300',
      label: 'Moderate Gaps'
    },
    severe: {
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-600',
      bg: 'bg-red-100',
      border: 'border-red-300',
      label: 'Severe Gaps'
    }
  };

  const config = severityConfig[overallSeverity];

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full",
              config.bg,
              config.border,
              "border",
              className
            )}>
              <span className={config.color}>{config.icon}</span>
              <span className={cn("text-sm font-medium", config.color)}>
                {config.label}
              </span>
            </div>
          </TooltipTrigger>
          {showTooltips && (
            <TooltipContent>
              <div className="space-y-1">
                {gaps.filter(g => g.hasGap).map(gap => (
                  <p key={gap.category} className="text-xs">
                    {gap.category}: {gap.details || 'Gap detected'}
                  </p>
                ))}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={cn("grid grid-cols-3 gap-2", className)}>
        {gaps.map(gap => {
          const gapColor = gap.hasGap ? 'bg-red-100 border-red-300' : 'bg-green-100 border-green-300';
          return (
            <TooltipProvider key={gap.category}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "p-2 rounded border text-center",
                    gapColor
                  )}>
                    <p className="text-xs font-medium">{gap.category}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      gap.hasGap ? "text-red-600" : "text-green-600"
                    )}>
                      {gap.hasGap ? 'Gap' : 'OK'}
                    </p>
                  </div>
                </TooltipTrigger>
                {showTooltips && gap.details && (
                  <TooltipContent>
                    <p className="text-xs">{gap.details}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg border",
        config.bg,
        config.border
      )}>
        <span className={config.color}>{config.icon}</span>
        <div className="flex-1">
          <p className={cn("font-medium", config.color)}>{config.label}</p>
          <p className="text-sm text-gray-600">
            {gaps.filter(g => g.hasGap).length} of {gaps.length} categories have gaps
          </p>
        </div>
      </div>
      <div className="space-y-1">
        {gaps.map(gap => (
          <div
            key={gap.category}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded",
              gap.hasGap ? "bg-red-50" : "bg-green-50"
            )}
          >
            <span className="text-sm font-medium">{gap.category}</span>
            <div className="flex items-center gap-2">
              {gap.hasGap ? (
                <>
                  <span className="text-xs text-red-600">Gap detected</span>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </>
              ) : (
                <>
                  <span className="text-xs text-green-600">No gap</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 14. RoleSwitcher Component

### Implementation
```tsx
// components/ui/role-switcher.tsx
import { ChevronDown, UserCircle, Shield, Heart, HandHeart, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
}

interface RoleSwitcherProps {
  currentRole: Role;
  availableRoles: Role[];
  onSwitch: (roleId: string) => void;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

const roleIcons = {
  assessor: <UserCircle className="h-4 w-4" />,
  coordinator: <Shield className="h-4 w-4" />,
  responder: <Heart className="h-4 w-4" />,
  donor: <HandHeart className="h-4 w-4" />,
  admin: <Settings className="h-4 w-4" />
};

const roleColors = {
  assessor: "text-blue-600 bg-blue-50",
  coordinator: "text-purple-600 bg-purple-50",
  responder: "text-green-600 bg-green-50",
  donor: "text-yellow-600 bg-yellow-50",
  admin: "text-red-600 bg-red-50"
};

export function RoleSwitcher({
  currentRole,
  availableRoles,
  onSwitch,
  variant = 'default',
  className
}: RoleSwitcherProps) {
  const currentRoleIcon = roleIcons[currentRole.id as keyof typeof roleIcons] || <UserCircle className="h-4 w-4" />;
  const currentRoleColor = roleColors[currentRole.id as keyof typeof roleColors] || "";

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("p-2", className)}
          >
            {currentRoleIcon}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableRoles.map(role => (
            <DropdownMenuItem
              key={role.id}
              onClick={() => onSwitch(role.id)}
              className={role.id === currentRole.id ? "bg-gray-100" : ""}
            >
              <span className="flex items-center gap-2">
                {roleIcons[role.id as keyof typeof roleIcons]}
                {role.name}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'detailed') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn("justify-between", className)}
          >
            <div className="flex items-center gap-2">
              <div className={cn("p-1 rounded", currentRoleColor)}>
                {currentRoleIcon}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{currentRole.name}</p>
                {currentRole.description && (
                  <p className="text-xs text-gray-500">{currentRole.description}</p>
                )}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Available Roles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableRoles.map(role => {
            const isActive = role.id === currentRole.id;
            const roleColor = roleColors[role.id as keyof typeof roleColors] || "";
            
            return (
              <DropdownMenuItem
                key={role.id}
                onClick={() => !isActive && onSwitch(role.id)}
                className={cn(
                  "cursor-pointer",
                  isActive && "bg-gray-100"
                )}
                disabled={isActive}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={cn("p-1.5 rounded", roleColor)}>
                    {roleIcons[role.id as keyof typeof roleIcons]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{role.name}</p>
                    {role.description && (
                      <p className="text-xs text-gray-500">{role.description}</p>
                    )}
                  </div>
                  {isActive && (
                    <StatusBadge status="verified" className="text-xs" />
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
        >
          {currentRoleIcon}
          <span>{currentRole.name}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRoles.map(role => {
          const isActive = role.id === currentRole.id;
          
          return (
            <DropdownMenuItem
              key={role.id}
              onClick={() => !isActive && onSwitch(role.id)}
              className={cn(
                "cursor-pointer gap-2",
                isActive && "bg-gray-100"
              )}
              disabled={isActive}
            >
              {roleIcons[role.id as keyof typeof roleIcons]}
              <span className="flex-1">{role.name}</span>
              {isActive && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 15. QuickActions Component

### Implementation
```tsx
// components/ui/quick-actions.tsx
import { Plus, Upload, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function QuickActions({
  actions,
  layout = 'horizontal',
  size = 'default',
  className
}: QuickActionsProps) {
  const layoutStyles = {
    horizontal: "flex flex-row gap-2",
    vertical: "flex flex-col gap-2",
    grid: "grid grid-cols-2 gap-2"
  };

  return (
    <div className={cn(layoutStyles[layout], className)}>
      {actions.map(action => (
        <Button
          key={action.id}
          variant={action.variant || 'outline'}
          size={size}
          onClick={action.onClick}
          disabled={action.disabled}
          className={cn(
            layout === 'grid' && "justify-start",
            layout === 'vertical' && "justify-start w-full"
          )}
        >
          {action.icon && <span className="mr-2">{action.icon}</span>}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

// Preset quick actions for different roles
export const roleQuickActions = {
  assessor: [
    {
      id: 'new-assessment',
      label: 'New Assessment',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => window.location.href = '/assessor/assessments/new'
    },
    {
      id: 'sync-now',
      label: 'Sync Now',
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: () => window.syncEngine.syncNow()
    }
  ],
  coordinator: [
    {
      id: 'view-queue',
      label: 'View Queue',
      onClick: () => window.location.href = '/coordinator/verification'
    },
    {
      id: 'new-incident',
      label: 'New Incident',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => window.location.href = '/coordinator/incidents/new'
    }
  ],
  responder: [
    {
      id: 'plan-response',
      label: 'Plan Response',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => window.location.href = '/responder/responses/new'
    },
    {
      id: 'import-commitments',
      label: 'Import',
      icon: <Download className="h-4 w-4" />,
      onClick: () => window.location.href = '/responder/imports'
    }
  ],
  donor: [
    {
      id: 'new-commitment',
      label: 'New Commitment',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => window.location.href = '/donor/commitments/new'
    },
    {
      id: 'view-leaderboard',
      label: 'Leaderboard',
      onClick: () => window.location.href = '/donor/leaderboard'
    }
  ],
  admin: [
    {
      id: 'add-user',
      label: 'Add User',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => window.location.href = '/admin/users/new'
    },
    {
      id: 'export-data',
      label: 'Export',
      icon: <Upload className="h-4 w-4" />,
      onClick: () => window.location.href = '/admin/export'
    }
  ]
};
```

---

## Component Library Usage Guide

### Setting Up the Component Library

```tsx
// lib/components/index.ts
// Central export file for all components

// UI Components
export { Button } from '@/components/ui/button-extended';
export { StatusBadge } from '@/components/ui/status-badge';
export { ConnectionIndicator } from '@/components/ui/connection-indicator';
export { FormField } from '@/components/ui/form-field-enhanced';
export { SyncQueueItem } from '@/components/ui/sync-queue-item';
export { EntityCard } from '@/components/ui/entity-card';
export { VerificationQueue } from '@/components/ui/verification-queue';
export { NotificationToast } from '@/components/ui/notification-toast';
export { DataTable } from '@/components/ui/data-table';
export { EmptyState } from '@/components/ui/empty-state';
export { DashboardCard } from '@/components/ui/dashboard-card';
export { GapAnalysisIndicator } from '@/components/ui/gap-analysis-indicator';
export { RoleSwitcher } from '@/components/ui/role-switcher';
export { QuickActions, roleQuickActions } from '@/components/ui/quick-actions';

// Form Components
export { BooleanField } from '@/components/forms/boolean-field';
export { GPSField } from '@/components/forms/gps-field';
export { MediaField } from '@/components/forms/media-field';

// Layout Components
export { NavigationSidebar, navigationConfig } from '@/components/layout/navigation-sidebar';

// Progress Components
export { ProgressIndicator } from '@/components/ui/progress-indicator';
```

### Theme Configuration

```tsx
// app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Semantic Colors */
    --color-success: 16 185 129;
    --color-warning: 245 158 11;
    --color-danger: 239 68 68;
    --color-info: 59 130 246;
    --color-offline: 249 115 22;
    
    /* Gap Analysis Colors */
    --gap-none: 34 197 94;
    --gap-mild: 250 204 21;
    --gap-severe: 239 68 68;
    
    /* Role Colors */
    --role-assessor: 59 130 246;
    --role-coordinator: 147 51 234;
    --role-responder: 34 197 94;
    --role-donor: 250 204 21;
    --role-admin: 239 68 68;
  }
  
  .dark {
    /* Dark mode colors */
    --color-success: 34 197 94;
    --color-warning: 251 191 36;
    --color-danger: 248 113 113;
    --color-info: 96 165 250;
    --color-offline: 251 146 60;
  }
}

@layer components {
  /* Custom component styles */
  .dashboard-grid {
    @apply grid gap-4 md:grid-cols-2 lg:grid-cols-4;
  }
  
  .form-section {
    @apply space-y-4 p-4 border rounded-lg;
  }
  
  .offline-indicator {
    @apply bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium;
  }
}
```

### Complete Layout Example

```tsx
// app/(auth)/layout.tsx
import { NavigationSidebar, navigationConfig } from '@/components/layout/navigation-sidebar';
import { ConnectionIndicator } from '@/components/ui/connection-indicator';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineStore } from '@/lib/stores/offlineStore';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, currentRole, switchRole, logout } = useAuth();
  const { isOnline, syncQueueCount } = useOfflineStore();
  
  // Get navigation items for current role
  const navigation = navigationConfig[currentRole.id as keyof typeof navigationConfig] || [];
  
  // Add badge counts to navigation items
  const enhancedNavigation = navigation.map(item => ({
    ...item,
    badge: item.href === '/assessor/sync' ? syncQueueCount : undefined
  }));

  return (
    <div className="flex h-screen bg-gray-50">
      <NavigationSidebar
        user={{
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          roles: user.roles,
          currentRole: currentRole
        }}
        navigation={enhancedNavigation}
        isOnline={isOnline}
        syncQueueCount={syncQueueCount}
        onRoleSwitch={switchRole}
        onLogout={logout}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              Disaster Management System
            </h1>
            <ConnectionIndicator
              isOnline={isOnline}
              syncPending={syncQueueCount}
              variant="compact"
            />
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## Component Library Implementation Notes

### For LLM Implementation:

1. **Component Dependencies**: All components use Shadcn/ui base components. Install them first using the Shadcn CLI.

2. **TypeScript Types**: All components have full TypeScript support with explicit interfaces for props.

3. **Styling Consistency**: All components use Tailwind CSS with the `cn()` utility for conditional classes.

4. **Accessibility**: Components include proper ARIA labels, keyboard navigation, and screen reader support.

5. **State Management**: Components are designed to work with Zustand stores for global state.

6. **Offline Support**: Components like ConnectionIndicator and SyncQueueItem are designed for offline-first operation.

### Testing Components:

```tsx
// Example component test
import { render, screen, fireEvent } from '@testing-library/react';
import { BooleanField } from '@/components/forms/boolean-field';

describe('BooleanField', () => {
  it('indicates gap when value is false and isGapIndicator is true', () => {
    const onChange = jest.fn();
    
    render(
      <BooleanField
        name="test"
        label="Test Field"
        value={false}
        onChange={onChange}
        isGapIndicator={true}
      />
    );
    
    expect(screen.getByText('Gap Detected')).toBeInTheDocument();
  });
});
```

This completes the Core Component Library with 15 essential components plus comprehensive usage examples and implementation guidelines.