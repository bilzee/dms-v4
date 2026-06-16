'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { RoleName } from '@/types/auth';
import { ROLE_DASHBOARD_PATHS, ROLE_DISPLAY_NAMES, ROLE_DESCRIPTIONS } from '@/lib/auth/route-config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeftRight, 
  Check, 
  TriangleAlert,
  User 
} from '@/lib/icons';

interface RoleSwitcherProps {
  className?: string;
}


const ROLE_COLORS: Record<RoleName, string> = {
  ASSESSOR: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 hover:bg-blue-500/20 dark:hover:bg-blue-500/30',
  COORDINATOR: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-500/20 dark:hover:bg-green-500/30',
  RESPONDER: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 hover:bg-orange-500/20 dark:hover:bg-orange-500/30',
  DONOR: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 hover:bg-purple-500/20 dark:hover:bg-purple-500/30',
  ADMIN: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/30',
};

export const RoleSwitcher = ({ className }: RoleSwitcherProps) => {
  const router = useRouter();
  const { 
    currentRole, 
    availableRoles, 
    switchRole, 
    canSwitchToRole,
    isAuthenticated,
    user,
    saveRoleSession,
    getRoleSession
  } = useAuth();
  
  const [isSwitching, setIsSwitching] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  if (!isAuthenticated || !user || !currentRole || availableRoles.length <= 1) {
    return null;
  }

  const handleRoleSwitch = async (role: RoleName) => {
    if (role === currentRole) return;

    // Check for unsaved changes (simplified check)
    const hasUnsavedChanges = checkForUnsavedChanges();
    
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      return;
    }

    performRoleSwitch(role);
  };

  const performRoleSwitch = async (role: RoleName) => {
    setIsSwitching(true);
    
    try {
      // Save current page state before switching
      const currentPageKey = window.location.pathname;
      const scrollPosition = window.scrollY;
      
      // Save current form data before switching
      const forms = document.querySelectorAll('form');
      forms.forEach((form, index) => {
        const formData = new FormData(form as HTMLFormElement);
        const formObj: Record<string, any> = {};
        formData.forEach((value, key) => {
          formObj[key] = value;
        });
        
        // Use form ID or index as identifier
        const formId = (form as HTMLFormElement).id || `form_${index}`;
        saveRoleSession(currentRole, {
          ...getRoleSession(currentRole),
          [`${currentPageKey}_${formId}`]: {
            formData: formObj,
            scrollPosition,
            lastUpdated: Date.now()
          }
        });
      });
      
      // Perform role switch
      switchRole(role);
      
      // Redirect to role-appropriate page using Next.js router
      router.push(ROLE_DASHBOARD_PATHS[role]);
      
    } catch (error) {
      console.error('Role switch failed:', error);
      // You could show a toast notification here
    } finally {
      setIsSwitching(false);
    }
  };

  const checkForUnsavedChanges = (): boolean => {
    // Check for forms with data-dirty attribute
    const dirtyForms = document.querySelectorAll('form[data-dirty="true"]');
    if (dirtyForms.length > 0) return true;
    
    // Check for any form inputs with values that might be unsaved
    const formInputs = document.querySelectorAll('input, textarea, select');
    for (let i = 0; i < formInputs.length; i++) {
      const input = formInputs[i] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (input.value && input.value !== input.getAttribute('data-initial-value')) {
        return true;
      }
    }
    
    return false;
  };

  const confirmRoleSwitch = (role: RoleName) => {
    performRoleSwitch(role);
    setShowUnsavedWarning(false);
  };

  const currentRoleDisplay = ROLE_DISPLAY_NAMES[currentRole];
  const currentRoleColor = ROLE_COLORS[currentRole];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1 sm:gap-2 px-2 sm:px-3 ${className}`}
            disabled={isSwitching}
          >
            <User className="h-4 w-4 flex-shrink-0" />
            <Badge className={`${currentRoleColor} hidden sm:inline-flex`} variant="secondary">
              {currentRoleDisplay}
            </Badge>
            <ArrowLeftRight className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Switch Role
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <div className="px-2 py-1.5">
            <p className="text-sm text-muted-foreground">
              Current: <span className="font-medium">{currentRoleDisplay}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {ROLE_DESCRIPTIONS[currentRole]}
            </p>
          </div>
          
          <DropdownMenuSeparator />
          
          {availableRoles.map((role) => {
            const isActive = role === currentRole;
            const displayName = ROLE_DISPLAY_NAMES[role];
            const description = ROLE_DESCRIPTIONS[role];
            const color = ROLE_COLORS[role];

            return (
              <DropdownMenuItem
                key={role}
                onClick={() => handleRoleSwitch(role)}
                disabled={isActive || isSwitching}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Badge 
                    className={`${color} ${isActive ? 'ring-2 ring-offset-2 ring-primary' : ''}`} 
                    variant="secondary"
                  >
                    {displayName}
                  </Badge>
                  
                  {isActive && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className="font-medium">{displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {description}
                  </span>
                </div>
              </DropdownMenuItem>
            );
          })}
          
          <DropdownMenuSeparator />
          
          <div className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground">
              Switching roles will save your current work and load your previous session for the selected role.
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Unsaved Changes Warning Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-6 max-w-md mx-4 shadow-lg border border-border">
            <div className="flex items-center gap-3 mb-4">
              <TriangleAlert className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold">Unsaved Changes</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              You have unsaved changes. Switching roles will save your current work and may cause you to lose any unsubmitted form data.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowUnsavedWarning(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => confirmRoleSwitch(currentRole)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Save & Switch
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};