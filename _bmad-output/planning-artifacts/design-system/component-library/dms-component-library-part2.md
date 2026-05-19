# DMS Core Component Library - Part 2

## 10. VerificationQueue Component

### Implementation
```tsx
// components/ui/verification-queue.tsx
import { ChevronDown, ChevronRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button-extended";
import { StatusBadge } from "@/components/ui/status-badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface QueueItem {
  id: string;
  type: 'assessment' | 'response';
  entityName: string;
  submittedBy: string;
  submittedAt: Date;
  status: 'pending' | 'auto-approved';
  assessmentType?: string;
  priority?: 'low' | 'medium' | 'high';
  details: Record<string, any>;
}

interface VerificationQueueProps {
  items: QueueItem[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  title?: string;
  showAutoApproved?: boolean;
}

export function VerificationQueue({ 
  items, 
  onApprove, 
  onReject,
  title = "Verification Queue",
  showAutoApproved = false
}: VerificationQueueProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [rejectingItem, setRejectingItem] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleReject = (id: string) => {
    if (rejectingItem === id && rejectReason) {
      onReject(id, rejectReason);
      setRejectingItem(null);
      setRejectReason("");
    } else {
      setRejectingItem(id);
    }
  };

  const filteredItems = showAutoApproved 
    ? items 
    : items.filter(item => item.status !== 'auto-approved');

  const priorityColors = {
    low: "border-l-gray-400",
    medium: "border-l-yellow-400",
    high: "border-l-red-400"
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-2">
          <StatusBadge status="pending" count={filteredItems.filter(i => i.status === 'pending').length} />
          {showAutoApproved && (
            <StatusBadge status="auto-approved" count={items.filter(i => i.status === 'auto-approved').length} />
          )}
        </div>
      </div>
      
      <div className="space-y-1">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No items pending verification
          </div>
        ) : (
          filteredItems.map(item => {
            const isExpanded = expandedItems.has(item.id);
            const isRejecting = rejectingItem === item.id;
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  "border rounded-lg border-l-4",
                  item.priority && priorityColors[item.priority]
                )}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="flex items-center gap-2 text-left flex-1"
                    >
                      {isExpanded ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {item.type === 'assessment' ? 'Assessment' : 'Response'} - {item.entityName}
                          </p>
                          {item.assessmentType && (
                            <Badge variant="outline" className="text-xs">
                              {item.assessmentType}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          By {item.submittedBy} • {item.submittedAt.toLocaleString()}
                        </p>
                      </div>
                    </button>
                    
                    {item.status === 'auto-approved' ? (
                      <StatusBadge status="auto-approved" />
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => onApprove(item.id)}
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            "text-red-600 hover:bg-red-50",
                            isRejecting && "bg-red-50"
                          )}
                          onClick={() => handleReject(item.id)}
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {isRejecting && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-900 mb-2">Rejection Reason</p>
                      <textarea
                        className="w-full p-2 border rounded text-sm"
                        rows={2}
                        placeholder="Enter reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(item.id)}
                          disabled={!rejectReason}
                        >
                          Confirm Rejection
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRejectingItem(null);
                            setRejectReason("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {Object.entries(item.details).slice(0, 6).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-gray-500 text-xs">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="font-medium">
                              {typeof value === 'boolean' 
                                ? (value ? 'Yes' : 'No')
                                : String(value)
                              }
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

---

## 11. NavigationSidebar Component (Enhanced)

### Implementation
```tsx
// components/layout/navigation-sidebar.tsx
import { 
  ChevronDown, Home, FileText, MapPin, Cloud, AlertTriangle, 
  CheckCircle, Users, BarChart3, Settings, HelpCircle, Menu, X,
  Bell, LogOut
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConnectionIndicator } from "@/components/ui/connection-indicator";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  badgeColor?: 'default' | 'orange' | 'red';
  children?: Array<{
    label: string;
    href: string;
    badge?: number;
  }>;
}

interface NavigationSidebarProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
    roles: Array<{ id: string; name: string }>;
    currentRole: { id: string; name: string; icon?: string };
  };
  navigation: NavItem[];
  isOnline: boolean;
  syncQueueCount?: number;
  notificationCount?: number;
  onRoleSwitch: (roleId: string) => void;
  onLogout?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
}

// Role-specific navigation configurations
export const navigationConfig = {
  assessor: [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/assessor/dashboard',
    },
    {
      label: 'Assessments',
      icon: FileText,
      href: '/assessor/assessments',
      children: [
        { label: 'New Assessment', href: '/assessor/assessments/new' },
        { label: 'Preliminary', href: '/assessor/assessments/preliminary' },
        { label: 'Health', href: '/assessor/assessments/rapid/health' },
        { label: 'WASH', href: '/assessor/assessments/rapid/wash' },
        { label: 'Shelter', href: '/assessor/assessments/rapid/shelter' },
        { label: 'Food', href: '/assessor/assessments/rapid/food' },
        { label: 'Security', href: '/assessor/assessments/rapid/security' },
        { label: 'Population', href: '/assessor/assessments/rapid/population' },
      ]
    },
    {
      label: 'My Entities',
      icon: MapPin,
      href: '/assessor/entities',
    },
    {
      label: 'Sync Queue',
      icon: Cloud,
      href: '/assessor/sync',
      badgeColor: 'orange' as const
    }
  ],
  
  coordinator: [
    {
      label: 'Crisis Dashboard',
      icon: AlertTriangle,
      href: '/coordinator/dashboard',
      badgeColor: 'red' as const
    },
    {
      label: 'Verification',
      icon: CheckCircle,
      href: '/coordinator/verification',
      children: [
        { label: 'Assessments', href: '/coordinator/verification/assessments' },
        { label: 'Responses', href: '/coordinator/verification/responses' }
      ]
    },
    {
      label: 'Incidents',
      icon: AlertTriangle,
      href: '/coordinator/incidents',
    },
    {
      label: 'Entities',
      icon: MapPin,
      href: '/coordinator/entities',
    },
    {
      label: 'Monitoring',
      icon: BarChart3,
      href: '/coordinator/monitoring',
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/coordinator/settings',
    }
  ],
  
  responder: [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/responder/dashboard',
    },
    {
      label: 'Responses',
      icon: FileText,
      href: '/responder/responses',
      children: [
        { label: 'Planned', href: '/responder/responses/planned' },
        { label: 'Delivered', href: '/responder/responses/delivered' }
      ]
    },
    {
      label: 'My Entities',
      icon: MapPin,
      href: '/responder/entities',
    },
    {
      label: 'Imports',
      icon: Cloud,
      href: '/responder/imports',
    }
  ],
  
  donor: [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/donor/dashboard',
    },
    {
      label: 'Commitments',
      icon: FileText,
      href: '/donor/commitments',
    },
    {
      label: 'Entities',
      icon: MapPin,
      href: '/donor/entities',
    },
    {
      label: 'Leaderboard',
      icon: BarChart3,
      href: '/donor/leaderboard',
    }
  ],
  
  admin: [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/admin/dashboard',
    },
    {
      label: 'Users',
      icon: Users,
      href: '/admin/users',
    },
    {
      label: 'Audit Log',
      icon: FileText,
      href: '/admin/audit',
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/admin/settings',
    }
  ]
};

export function NavigationSidebar({
  user,
  navigation,
  isOnline,
  syncQueueCount = 0,
  notificationCount = 0,
  onRoleSwitch,
  onLogout,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onMobileToggle
}: NavigationSidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const toggleExpand = (href: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(href)) {
      newExpanded.delete(href);
    } else {
      newExpanded.add(href);
    }
    setExpandedItems(newExpanded);
  };

  const badgeColors = {
    default: "bg-gray-200 text-gray-800",
    orange: "bg-orange-100 text-orange-800",
    red: "bg-red-100 text-red-800"
  };

  const roleColors = {
    assessor: "bg-blue-50 border-blue-200",
    coordinator: "bg-purple-50 border-purple-200",
    responder: "bg-green-50 border-green-200",
    donor: "bg-yellow-50 border-yellow-200",
    admin: "bg-red-50 border-red-200"
  };

  const SidebarContent = () => (
    <>
      {/* Role Header */}
      <div className={cn(
        "p-4 border-b",
        roleColors[user.currentRole.id as keyof typeof roleColors] || "bg-gray-50"
      )}>
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Active Role</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 h-auto">
                    <span className="font-semibold text-lg">{user.currentRole.name}</span>
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-gray-500">Switch Role</p>
                  </div>
                  {user.roles.map(role => (
                    <DropdownMenuItem
                      key={role.id}
                      onClick={() => onRoleSwitch(role.id)}
                      className={cn(
                        "cursor-pointer",
                        role.id === user.currentRole.id && "bg-gray-100"
                      )}
                    >
                      <span className="font-medium">{role.name}</span>
                      {role.id === user.currentRole.id && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <div className="flex gap-1">
            {onMobileToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMobileToggle}
                className="p-1 lg:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="p-1 hidden lg:block"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="px-4 py-3 border-b">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className={cn("px-4 py-2 border-b", collapsed && "px-2")}>
        <ConnectionIndicator
          isOnline={isOnline}
          syncPending={syncQueueCount}
          variant={collapsed ? "compact" : "detailed"}
        />
      </div>

      {/* Notifications */}
      {notificationCount > 0 && !collapsed && (
        <div className="px-4 py-2 border-b bg-blue-50">
          <Link href="/notifications" className="flex items-center justify-between hover:bg-blue-100 rounded p-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <StatusBadge status="pending" count={notificationCount} />
          </Link>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigation.map(item => (
            <li key={item.href}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleExpand(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100",
                      isActive(item.href) && "bg-blue-50 text-blue-600"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {expandedItems.has(item.href) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </>
                    )}
                  </button>
                  {!collapsed && expandedItems.has(item.href) && (
                    <ul className="mt-1 ml-8 space-y-1">
                      {item.children.map(child => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100",
                              isActive(child.href) && "bg-blue-50 text-blue-600"
                            )}
                          >
                            <span>{child.label}</span>
                            {child.badge !== undefined && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-200 rounded">
                                {child.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100",
                    isActive(item.href) && "bg-blue-50 text-blue-600"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={cn(
                          "px-2 py-0.5 text-xs rounded-full",
                          badgeColors[item.badgeColor || 'default']
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer Actions */}
      {!collapsed && (
        <div className="p-4 border-t">
          <div className="space-y-2">
            <Link href="/help">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help & Support
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
            {onLogout && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-red-600 hover:bg-red-50"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );

  // Desktop sidebar
  const DesktopSidebar = (
    <aside className={cn(
      "hidden lg:flex bg-white border-r h-screen flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <SidebarContent />
    </aside>
  );

  // Mobile sidebar
  const MobileSidebar = mobileOpen && (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/50" onClick={onMobileToggle} />
      <aside className="relative flex w-64 flex-col bg-white">
        <SidebarContent />
      </aside>
    </div>
  );

  return (
    <>
      {DesktopSidebar}
      {MobileSidebar}
    </>
  );
}
```

---

## Usage Examples for Component Library

### Example 1: Complete Assessment Form
```tsx
// pages/assessor/assessments/new.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { BooleanField } from '@/components/forms/boolean-field';
import { GPSField } from '@/components/forms/gps-field';
import { MediaField } from '@/components/forms/media-field';
import { Button } from '@/components/ui/button-extended';
import { ConnectionIndicator } from '@/components/ui/connection-indicator';
import { NotificationToast } from '@/components/ui/notification-toast';

export default function NewAssessmentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    hasFunctionalClinic: false,
    hasEmergencyServices: false,
    coordinates: null,
    photos: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Save to IndexedDB for offline queue
    await saveToOfflineQueue(formData);
    
    // Show success notification
    showNotification({
      type: 'success',
      title: 'Assessment Saved',
      description: isOnline ? 'Syncing to server...' : 'Will sync when online'
    });
    
    router.push('/assessor/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <ConnectionIndicator 
        isOnline={isOnline} 
        syncPending={syncQueueCount}
        variant="banner"
      />
      
      <h1 className="text-2xl font-bold mb-6">New Health Assessment</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <BooleanField
          name="hasFunctionalClinic"
          label="Functional Clinic Available"
          value={formData.hasFunctionalClinic}
          onChange={(val) => setFormData({...formData, hasFunctionalClinic: val})}
          isGapIndicator={true}
          description="Gap will be indicated if no functional clinic"
          required
        />
        
        <BooleanField
          name="hasEmergencyServices"
          label="Emergency Services Available"
          value={formData.hasEmergencyServices}
          onChange={(val) => setFormData({...formData, hasEmergencyServices: val})}
          isGapIndicator={true}
          required
        />
        
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
          <Button
            type="submit"
            loading={isSubmitting}
            loadingText="Saving..."
            className="flex-1"
          >
            {isOnline ? 'Submit Assessment' : 'Save Offline'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
```

### Example 2: Coordinator Dashboard
```tsx
// pages/coordinator/dashboard.tsx
import { VerificationQueue } from '@/components/ui/verification-queue';
import { EntityCard } from '@/components/ui/entity-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';

export default function CoordinatorDashboard() {
  const pendingItems = usePendingVerifications();
  const entities = useAssignedEntities();
  const incidents = useActiveIncidents();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Verification Queue */}
      <div className="lg:col-span-2">
        <VerificationQueue
          items={pendingItems}
          onApprove={handleApprove}
          onReject={handleReject}
          showAutoApproved={true}
        />
      </div>
      
      {/* Entity Overview */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Critical Entities</h3>
        <div className="space-y-2">
          {entities.map(entity => (
            <EntityCard
              key={entity.id}
              entity={entity}
              onClick={() => router.push(`/coordinator/entities/${entity.id}`)}
              showActions
            />
          ))}
        </div>
      </div>
      
      {/* Incidents Table */}
      <div className="lg:col-span-3">
        <DataTable
          data={incidents}
          columns={[
            { key: 'name', header: 'Incident', sortable: true },
            { 
              key: 'status', 
              header: 'Status',
              render: (item) => <StatusBadge status={item.status} />
            },
            { key: 'affectedPopulation', header: 'Affected', sortable: true },
            { key: 'duration', header: 'Duration' }
          ]}
          onRowClick={(item) => router.push(`/coordinator/incidents/${item.id}`)}
        />
      </div>
    </div>
  );
}
```

---

## Component Library Summary

This component library provides