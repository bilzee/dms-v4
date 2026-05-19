# Navigation and Layout Components - Final Sections

## 8. TabLayout Component

### Tabbed Content Layout
```tsx
// components/layout/tab-layout.tsx
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabLayoutProps {
  tabs: Tab[];
  defaultTab?: string;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
  onTabChange?: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export function TabLayout({
  tabs,
  defaultTab,
  variant = 'default',
  className,
  onTabChange,
  orientation = 'horizontal'
}: TabLayoutProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };
  
  const tabStyles = {
    default: {
      list: orientation === 'horizontal' ? "flex border-b" : "flex flex-col border-r",
      tab: "px-4 py-2 transition-colors",
      active: "border-blue-500 text-blue-600 bg-blue-50",
      inactive: "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50",
      disabled: "opacity-50 cursor-not-allowed"
    },
    pills: {
      list: orientation === 'horizontal' ? "flex gap-2 p-1 bg-gray-100 rounded-lg" : "flex flex-col gap-2 p-1 bg-gray-100 rounded-lg",
      tab: "px-3 py-1.5 rounded-md transition-colors",
      active: "bg-white text-blue-600 shadow-sm",
      inactive: "text-gray-600 hover:text-gray-900",
      disabled: "opacity-50 cursor-not-allowed"
    },
    underline: {
      list: orientation === 'horizontal' ? "flex gap-4 border-b" : "flex flex-col gap-2 border-r pr-4",
      tab: orientation === 'horizontal' ? "pb-2 -mb-px border-b-2 transition-colors" : "pl-2 -mr-px border-r-2 transition-colors",
      active: "border-blue-500 text-blue-600",
      inactive: "border-transparent text-gray-600 hover:text-gray-900",
      disabled: "opacity-50 cursor-not-allowed"
    }
  };
  
  const styles = tabStyles[variant];
  const activeContent = tabs.find(tab => tab.id === activeTab)?.content;
  
  const containerClass = orientation === 'vertical' ? 'flex gap-4' : '';
  
  return (
    <div className={cn(containerClass, className)}>
      {/* Tab Headers */}
      <div className={styles.list}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              styles.tab,
              activeTab === tab.id ? styles.active : styles.inactive,
              tab.disabled && styles.disabled
            )}
          >
            <div className="flex items-center gap-2">
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                  {tab.badge}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className={orientation === 'vertical' ? 'flex-1' : 'mt-4'}>
        {activeContent}
      </div>
    </div>
  );
}
```

## 9. FullscreenLayout Component

### Full Screen Dashboard Layout
```tsx
// components/layout/fullscreen-layout.tsx
import { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FullscreenLayoutProps {
  children: React.ReactNode;
  className?: string;
  showControls?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function FullscreenLayout({
  children,
  className,
  showControls = true,
  onFullscreenChange
}: FullscreenLayoutProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
      onFullscreenChange?.(true);
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  };
  
  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
      onFullscreenChange?.(false);
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  };
  
  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || 
                              (document as any).webkitFullscreenElement ||
                              (document as any).msFullscreenElement;
      const isNowFullscreen = !!fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      onFullscreenChange?.(isNowFullscreen);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [onFullscreenChange]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };
    
    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isFullscreen]);
  
  return (
    <div className={cn(
      "relative h-full",
      isFullscreen && "fixed inset-0 z-50 bg-white",
      className
    )}>
      {showControls && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-10"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      )}
      {children}
    </div>
  );
}
```

## 10. Layout Hooks Collection

### Custom Layout Hooks
```tsx
// hooks/useLayout.tsx
import { useState, useEffect, useCallback } from 'react';
import { useMediaQuery } from './useMediaQuery';

export function useLayout() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar: () => setSidebarOpen(!sidebarOpen),
    toggleCollapse: () => setSidebarCollapsed(!sidebarCollapsed)
  };
}

// hooks/useMediaQuery.tsx
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    const updateMatch = () => setMatches(media.matches);
    
    // Set initial value
    updateMatch();
    
    // Listen for changes
    if (media.addEventListener) {
      media.addEventListener('change', updateMatch);
      return () => media.removeEventListener('change', updateMatch);
    } else {
      // Fallback for older browsers
      media.addListener(updateMatch);
      return () => media.removeListener(updateMatch);
    }
  }, [query]);
  
  return matches;
}

// hooks/useScrollLock.tsx
export function useScrollLock(lock: boolean = false) {
  useEffect(() => {
    if (!lock) return;
    
    // Save original body style
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Get scrollbar width
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Apply scroll lock
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    // Cleanup
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [lock]);
}

// hooks/useBreakpoint.tsx
export function useBreakpoint() {
  const breakpoints = {
    xs: useMediaQuery('(max-width: 639px)'),
    sm: useMediaQuery('(min-width: 640px)'),
    md: useMediaQuery('(min-width: 768px)'),
    lg: useMediaQuery('(min-width: 1024px)'),
    xl: useMediaQuery('(min-width: 1280px)'),
    '2xl': useMediaQuery('(min-width: 1536px)'),
  };
  
  const current = 
    breakpoints['2xl'] ? '2xl' :
    breakpoints.xl ? 'xl' :
    breakpoints.lg ? 'lg' :
    breakpoints.md ? 'md' :
    breakpoints.sm ? 'sm' : 'xs';
  
  return {
    breakpoints,
    current,
    isMobile: current === 'xs' || current === 'sm',
    isTablet: current === 'md',
    isDesktop: current === 'lg' || current === 'xl' || current === '2xl'
  };
}

// hooks/useWindowSize.tsx
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return windowSize;
}

// hooks/useStickyHeader.tsx
export function useStickyHeader(threshold: number = 100) {
  const [isSticky, setIsSticky] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > threshold);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);
  
  return isSticky;
}
```

## 11. Complete Usage Examples

### Dashboard Page with Full Layout
```tsx
// app/(auth)/coordinator/dashboard/page.tsx
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { DashboardGrid } from '@/components/layout/responsive-grid';
import { TabLayout } from '@/components/layout/tab-layout';
import { SplitLayout } from '@/components/layout/split-layout';
import { DashboardCard } from '@/components/ui/dashboard-card';
import { VerificationQueue } from '@/components/ui/verification-queue';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';

export default function CoordinatorDashboard() {
  const tabs = [
    {
      id: 'assessments',
      label: 'Assessments',
      badge: 24,
      content: <VerificationQueue items={assessmentItems} />
    },
    {
      id: 'responses',
      label: 'Responses',
      badge: 12,
      content: <VerificationQueue items={responseItems} />
    },
    {
      id: 'conflicts',
      label: 'Conflicts',
      badge: 3,
      content: <ConflictsList conflicts={conflicts} />
    }
  ];

  return (
    <AppShell>
      <PageHeader
        title="Crisis Management Dashboard"
        description="Monitor and manage disaster response operations"
        badge={<StatusBadge status="active" />}
        actions={
          <>
            <Button variant="outline">Export</Button>
            <Button>Generate Report</Button>
          </>
        }
      />
      
      {/* Metrics Grid */}
      <DashboardGrid>
        <DashboardCard
          title="Pending Reviews"
          value={124}
          trend={{ value: 12, direction: 'up' }}
          color="yellow"
        />
        <DashboardCard
          title="Today's Verifications"
          value={48}
          color="green"
        />
        <DashboardCard
          title="Auto-Approval Rate"
          value="72%"
          color="blue"
        />
        <DashboardCard
          title="Active Incidents"
          value={3}
          color="red"
        />
      </DashboardGrid>
      
      {/* Main Content with Tabs */}
      <div className="mt-6">
        <TabLayout
          tabs={tabs}
          defaultTab="assessments"
          variant="pills"
        />
      </div>
    </AppShell>
  );
}
```

### Mobile-Responsive Form Page
```tsx
// app/(auth)/assessor/assessments/new/page.tsx
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { FormGrid } from '@/components/layout/responsive-grid';
import { ConnectionIndicator } from '@/components/ui/connection-indicator';
import { Button } from '@/components/ui/button';
import { useLayout } from '@/hooks/useLayout';

export default function NewAssessmentPage() {
  const { isMobile } = useLayout();
  const [formData, setFormData] = useState({
    hasFunctionalClinic: false,
    hasEmergencyServices: false,
    coordinates: null,
    photos: []
  });

  return (
    <AppShell>
      <PageHeader
        title="New Health Assessment"
        description="Complete rapid health assessment for affected entity"
        actions={
          <ConnectionIndicator 
            isOnline={isOnline} 
            variant={isMobile ? 'compact' : 'detailed'}
          />
        }
      />
      
      <form className="space-y-6">
        <FormGrid>
          <BooleanField
            name="hasFunctionalClinic"
            label="Functional Clinic Available"
            isGapIndicator
            value={formData.hasFunctionalClinic}
            onChange={(val) => setFormData({...formData, hasFunctionalClinic: val})}
          />
          <BooleanField
            name="hasEmergencyServices"
            label="Emergency Services Available"
            isGapIndicator
            value={formData.hasEmergencyServices}
            onChange={(val) => setFormData({...formData, hasEmergencyServices: val})}
          />
        </FormGrid>
        
        <GPSField
          name="coordinates"
          value={formData.coordinates}
          onChange={(coords) => setFormData({...formData, coordinates: coords})}
          required
        />
        
        <MediaField
          name="photos"
          value={formData.photos}
          onChange={(files) => setFormData({...formData, photos: files})}
          maxFiles={3}
        />
        
        <div className="flex gap-3">
          <Button type="submit" className="flex-1">
            {isOnline ? 'Submit Assessment' : 'Save Offline'}
          </Button>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
```

### Monitoring Dashboard with Fullscreen
```tsx
// app/(auth)/monitoring/situation-awareness/page.tsx
import { FullscreenLayout } from '@/components/layout/fullscreen-layout';
import { SplitLayout } from '@/components/layout/split-layout';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export default function SituationAwarenessDashboard() {
  const { isDesktop } = useBreakpoint();
  
  if (!isDesktop) {
    // Mobile/Tablet layout with tabs
    return (
      <AppShell fullWidth>
        <TabLayout
          tabs={[
            { id: 'incident', label: 'Incident', content: <IncidentPanel /> },
            { id: 'assessment', label: 'Assessment', content: <AssessmentPanel /> },
            { id: 'gaps', label: 'Gaps', content: <GapAnalysisPanel /> }
          ]}
          variant="underline"
        />
      </AppShell>
    );
  }
  
  // Desktop 3-panel layout
  return (
    <AppShell fullWidth showBreadcrumbs={false}>
      <FullscreenLayout>
        <div className="flex h-full">
          {/* Left Panel - 25% */}
          <div className="w-1/4 border-r p-4 overflow-y-auto">
            <IncidentPanel />
          </div>
          
          {/* Center Panel - 50% */}
          <div className="w-1/2 p-4 overflow-y-auto">
            <AssessmentPanel />
            <InteractiveMap />
          </div>
          
          {/* Right Panel - 25% */}
          <div className="w-1/4 border-l p-4 overflow-y-auto">
            <GapAnalysisPanel />
          </div>
        </div>
      </FullscreenLayout>
    </AppShell>
  );
}
```

## 12. Layout Configuration Export

### Central Export File
```tsx
// components/layout/index.ts
// Central export for all layout components

export { AppShell } from './app-shell';
export { TopBar } from './top-bar';
export { Breadcrumbs, BreadcrumbsAdvanced } from './breadcrumbs';
export { MobileBottomNav } from './mobile-bottom-nav';
export { PageHeader, PageHeaderWithFilters } from './page-header';
export { 
  ResponsiveGrid, 
  DashboardGrid, 
  FormGrid, 
  CardGrid 
} from './responsive-grid';
export { SplitLayout } from './split-layout';
export { TabLayout } from './tab-layout';
export { FullscreenLayout } from './fullscreen-layout';

// Export navigation configuration
export { NavigationSidebar, navigationConfig } from './navigation-sidebar';

// Export all hooks
export { useLayout } from '@/hooks/useLayout';
export { useMediaQuery } from '@/hooks/useMediaQuery';
export { useScrollLock } from '@/hooks/useScrollLock';
export { useBreakpoint } from '@/hooks/useBreakpoint';
export { useWindowSize } from '@/hooks/useWindowSize';
export { useStickyHeader } from '@/hooks/useStickyHeader';
```

This completes the Navigation and Layout Components implementation for Week 2.