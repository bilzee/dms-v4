'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useDashboardLayoutStore, usePanelSizes, useResponsiveState } from '@/stores/dashboardLayout.store';

interface ResponsivePanelWrapperProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsivePanelProps {
  position: 'left' | 'center' | 'right';
  children: React.ReactNode;
  className?: string;
  isCollapsible?: boolean;
}

interface MobilePanelNavigationProps {
  activePanel: 'left' | 'center' | 'right';
  onPanelChange: (panel: 'left' | 'center' | 'right') => void;
  counts?: {
    left: number;
    center: number;
    right: number;
  };
}

/**
 * Mobile panel navigation tabs
 */
const MobilePanelNavigation: React.FC<MobilePanelNavigationProps> = ({
  activePanel,
  onPanelChange,
  counts
}) => {
  const panelTabs = [
    { id: 'left', label: 'Incidents', count: counts?.left || 0 },
    { id: 'center', label: 'Entities', count: counts?.center || 0 },
    { id: 'right', label: 'Gaps', count: counts?.right || 0 }
  ] as const;

  return (
    <div className="lg:hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-border bg-card">
        {panelTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onPanelChange(tab.id)}
            className={cn(
              'flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
              activePanel === tab.id
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            )}
            role="tab"
            aria-selected={activePanel === tab.id}
            aria-controls={`panel-${tab.id}`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                  {tab.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Individual responsive panel component
 */
const ResponsivePanel: React.FC<ResponsivePanelProps> = ({
  position,
  children,
  className,
  isCollapsible = true
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isMobile, isTablet } = useResponsiveState();

  // Don't show collapsed state on mobile
  const showCollapseButton = !isMobile && isCollapsible;

  return (
    <div
      id={`panel-${position}`}
      role="tabpanel"
      className={cn(
        // Base styles
        'bg-card border border-border',
        'transition-all duration-300 ease-in-out',
        
        // Responsive behavior
        'w-full',
        'h-full',
        'flex flex-col',
        
        // Desktop specific
        'lg:border-r last:border-r-0',
        
        // Mobile specific
        'lg:block', // Show all on desktop
        
        className
      )}
      style={{
        display: isMobile ? (position === 'left' ? 'block' : 'none') : 'block'
      }}
    >
      {/* Collapse button for desktop */}
      {showCollapseButton && (
        <div className="flex justify-end p-2 border-b border-border bg-muted">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded transition-colors"
            aria-label={isCollapsed ? `Expand ${position} panel` : `Collapse ${position} panel`}
            aria-expanded={!isCollapsed}
          >
            <svg
              className="w-4 h-4 transition-transform"
              style={{
                transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Panel content */}
      <div className={cn(
        'flex-1 overflow-hidden',
        isCollapsed && !isMobile && 'hidden'
      )}>
        {children}
      </div>
    </div>
  );
};

/**
 * Responsive panel wrapper that adapts to different screen sizes
 * 
 * Features:
 * - Mobile-first responsive design
 * - Collapsible panels for mobile with tab navigation
 * - Touch-friendly interactions
 * - Optimized for various device sizes and orientations
 * - Maintains usability across all screen sizes
 */
export const ResponsivePanelWrapper: React.FC<ResponsivePanelWrapperProps> = ({
  children,
  className
}) => {
  const [activeMobilePanel, setActiveMobilePanel] = useState<'left' | 'center' | 'right'>('left');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const panelSizes = usePanelSizes();
  const { setResponsiveState } = useDashboardLayoutStore();

  // Handle responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const newIsMobile = width < 1024; // lg breakpoint
      const newIsTablet = width >= 1024 && width < 1280; // lg to xl
      
      setIsMobile(newIsMobile);
      setIsTablet(newIsTablet);
      setResponsiveState(newIsMobile, newIsTablet);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setResponsiveState]);

  // Calculate grid layout for desktop
  const gridTemplateColumns = isMobile 
    ? '1fr' 
    : `${panelSizes.leftPanelWidth}% ${panelSizes.centerPanelWidth}% ${panelSizes.rightPanelWidth}%`;

  return (
    <div className={cn(
      'w-full h-full',
      className
    )}>
      {/* Mobile navigation */}
      <MobilePanelNavigation
        activePanel={activeMobilePanel}
        onPanelChange={setActiveMobilePanel}
      />

      {/* Panel container */}
      <div 
        className={cn(
          // Full viewport height optimization
          'h-[calc(100vh-12rem)]', // Account for header, padding, and mobile nav
          'min-h-[500px]', // Minimum height for smaller screens
          'w-full',
          
          // CSS Grid layout
          'grid gap-0',
          'transition-all duration-200 ease-in-out',
          
          // Responsive behavior
          'grid-rows-1'
        )}
        style={{
          gridTemplateColumns,
        }}
      >
        {React.Children.map(children, (child, index) => {
          if (!child) return null;
          
          const position = index === 0 ? 'left' : index === 1 ? 'center' : 'right';
          const isVisible = isMobile ? position === activeMobilePanel : true;
          
          return (
            <ResponsivePanel
              key={position}
              position={position}
              isCollapsible={!isMobile}
              className={cn(
                !isVisible && 'hidden lg:block'
              )}
            >
              {child}
            </ResponsivePanel>
          );
        })}
      </div>
    </div>
  );
};

export default ResponsivePanelWrapper;