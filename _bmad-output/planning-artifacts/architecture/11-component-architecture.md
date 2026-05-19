# 11. Component Architecture

### 11.1 Component Organization Strategy

**Component Hierarchy:**
```
UI Layer (Shadcn/ui)
  └── Feature Components (Business Logic)
      └── Layout Components (Structure)
          └── Shared Components (Utilities)
```

**Naming and Location:**
- **UI Components** (`components/ui/`): Shadcn/ui primitives - DO NOT MODIFY
- **Feature Components** (`components/features/`): Domain-specific, self-contained
- **Layout Components** (`components/layouts/`): Page structure, navigation
- **Shared Components** (`components/shared/`): Reusable across features

### 11.2 Core Layout Components

#### AppShell Component

```typescript
// components/layouts/AppShell.tsx

'use client';

import { FC, ReactNode } from 'react';
import { Navigation } from './Navigation';
import { RoleSwitcher } from './RoleSwitcher';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { SyncIndicator } from '@/components/shared/SyncIndicator';
import { useAuthStore } from '@/stores/auth.store';
import { useOfflineStore } from '@/stores/offline.store';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: FC<AppShellProps> = ({ children }) => {
  const { user, currentRole } = useAuthStore();
  const { isOffline, queueSize } = useOfflineStore();
  
  if (!user || !currentRole) {
    return null;
  }
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Navigation 
        user={user} 
        currentRole={currentRole}
        queueSize={queueSize}
        isOffline={isOffline}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <OfflineIndicator isOffline={isOffline} />
            <SyncIndicator queueSize={queueSize} />
          </div>
          
          <div className="flex items-center space-x-4">
            <RoleSwitcher />
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
```

#### Navigation Component

```typescript
// components/layouts/Navigation.tsx

'use client';

import { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  FileText, 
  MapPin, 
  Cloud, 
  AlertTriangle,
  CheckCircle,
  Package,
  TrendingUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { User, RoleName } from '@/types/entities';

interface NavigationProps {
  user: User;
  currentRole: RoleName;
  queueSize: number;
  isOffline: boolean;
}

interface NavItem {
  label: string;
  path: string;
  icon: any;
  badge?: number;
  badgeColor?: string;
}

const NAVIGATION_CONFIG: Record<RoleName, NavItem[]> = {
  ASSESSOR: [
    { label: 'Dashboard', path: '/assessor/dashboard', icon: Home },
    { label: 'Assessments', path: '/assessor/assessments', icon: FileText },
    { label: 'My Entities', path: '/assessor/entities', icon: MapPin },
    { label: 'Sync Queue', path: '/assessor/sync', icon: Cloud },
  ],
  COORDINATOR: [
    { label: 'Crisis Dashboard', path: '/coordinator/dashboard', icon: AlertTriangle },
    { label: 'Verification', path: '/coordinator/verification', icon: CheckCircle },
    { label: 'Monitoring', path: '/coordinator/monitoring', icon: TrendingUp },
    { label: 'Incidents', path: '/coordinator/incidents', icon: AlertTriangle },
    { label: 'Entities', path: '/coordinator/entities', icon: MapPin },
  ],
  RESPONDER: [
    { label: 'Dashboard', path: '/responder/dashboard', icon: Home },
    { label: 'Responses', path: '/responder/responses', icon: Package },
    { label: 'My Entities', path: '/responder/entities', icon: MapPin },
    { label: 'Sync Queue', path: '/responder/sync', icon: Cloud },
  ],
  DONOR: [
    { label: 'Dashboard', path: '/donor/dashboard', icon: TrendingUp },
    { label: 'Commitments', path: '/donor/commitments', icon: Package },
    { label: 'Entities', path: '/donor/entities', icon: MapPin },
  ],
  ADMIN: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: Home },
    { label: 'Users', path: '/admin/users', icon: Home },
    { label: 'Audit Logs', path: '/admin/audit', icon: FileText },
  ],
};

export const Navigation: FC<NavigationProps> = ({ 
  user, 
  currentRole, 
  queueSize,
  isOffline 
}) => {
  const pathname = usePathname();
  const navItems = NAVIGATION_CONFIG[currentRole] || [];
  
  return (
    <aside className="w-64 bg-white border-r h-screen flex flex-col">
      {/* Role Header */}
      <div className="p-4 border-b bg-blue-50">
        <div>
          <p className="text-xs text-gray-500">Active Role</p>
          <h2 className="font-semibold text-lg">{currentRole}</h2>
        </div>
      </div>
      
      {/* User Info */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            const Icon = item.icon;
            const badge = item.label === 'Sync Queue' ? queueSize : item.badge;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                
                {badge !== undefined && badge > 0 && (
                  <span className={cn(
                    'px-2 py-0.5 text-xs rounded-full',
                    item.badgeColor === 'orange' || isOffline
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                  )}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-gray-500 text-center">
          DMS v1.0 - Borno State
        </p>
      </div>
    </aside>
  );
};
```

#### RoleSwitcher Component

```typescript
// components/layouts/RoleSwitcher.tsx

'use client';

import { FC } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { RoleName } from '@/types/entities';
import { useRouter } from 'next/navigation';

const ROLE_PATHS: Record<RoleName, string> = {
  ASSESSOR: '/assessor/dashboard',
  COORDINATOR: '/coordinator/dashboard',
  RESPONDER: '/responder/dashboard',
  DONOR: '/donor/dashboard',
  ADMIN: '/admin/dashboard',
};

export const RoleSwitcher: FC = () => {
  const router = useRouter();
  const { user, currentRole, availableRoles, switchRole } = useAuthStore();
  
  if (!user || availableRoles.length <= 1) {
    return null;
  }
  
  const handleRoleSwitch = async (role: RoleName) => {
    if (role === currentRole) return;
    
    // Save current session state before switching
    // This is handled by Zustand persistence
    
    await switchRole(role);
    router.push(ROLE_PATHS[role]);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-40">
          <span className="flex-1 text-left">{currentRole}</span>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {availableRoles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => handleRoleSwitch(role)}
            className={role === currentRole ? 'bg-blue-50' : ''}
          >
            {role}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

### 11.3 Shared Components

#### OfflineIndicator Component

```typescript
// components/shared/OfflineIndicator.tsx

'use client';

import { FC } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  isOffline: boolean;
}

export const OfflineIndicator: FC<OfflineIndicatorProps> = ({ isOffline }) => {
  if (!isOffline) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <Wifi className="w-4 h-4" />
        <span className="text-sm font-medium">Online</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-2 text-orange-600">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">Offline Mode</span>
    </div>
  );
};
```

#### SyncIndicator Component

```typescript
// components/shared/SyncIndicator.tsx

'use client';

import { FC } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineStore } from '@/stores/offline.store';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SyncIndicatorProps {
  queueSize: number;
}

export const SyncIndicator: FC<SyncIndicatorProps> = ({ queueSize }) => {
  const { syncInProgress, startSync, syncQueue } = useOfflineStore();
  
  if (queueSize === 0) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <Cloud className="w-4 h-4" />
        <span className="text-sm">Synced</span>
      </div>
    );
  }
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {syncInProgress ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CloudOff className="w-4 h-4" />
          )}
          <span className="ml-2">{queueSize} pending</span>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
            {queueSize}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h3 className="font-semibold">Sync Queue</h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {syncQueue.map((item) => (
              <div key={item.id} className="text-sm p-2 bg-gray-50 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.type}</span>
                  <span className="text-xs text-gray-500">
                    {item.retryCount > 0 ? `Retry ${item.retryCount}` : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Button 
            onClick={startSync} 
            disabled={syncInProgress}
            className="w-full"
          >
            {syncInProgress ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
```

### 11.4 Form Field Components

#### BooleanField Component

```typescript
// components/forms/fields/BooleanField.tsx

'use client';

import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AlertCircle } from 'lucide-react';

interface BooleanFieldProps {
  name: string;
  label: string;
  description?: string;
  showGapIndicator?: boolean; // Show red/green indicator
  gapWhenFalse?: boolean; // Gap exists when value is FALSE
}

export const BooleanField: FC<BooleanFieldProps> = ({
  name,
  label,
  description,
  showGapIndicator = false,
  gapWhenFalse = true,
}) => {
  const form = useFormContext();
  
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5 flex-1">
            <FormLabel className="text-base flex items-center gap-2">
              {label}
              {showGapIndicator && (
                <span className={
                  (gapWhenFalse && !field.value) || (!gapWhenFalse && field.value)
                    ? 'text-red-500'
                    : 'text-green-500'
                }>
                  {(gapWhenFalse && !field.value) || (!gapWhenFalse && field.value) ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-green-500" />
                  )}
                </span>
              )}
            </FormLabel>
            {description && (
              <FormDescription>{description}</FormDescription>
            )}
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};
```

#### GPSField Component

```typescript
// components/forms/fields/GPSField.tsx

'use client';

import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import { useGPS } from '@/hooks/useGPS';

interface GPSFieldProps {
  name: string;
  label?: string;
  autoCapture?: boolean;
}

export const GPSField: FC<GPSFieldProps> = ({
  name,
  label = 'GPS Coordinates',
  autoCapture = false,
}) => {
  const form = useFormContext();
  const { captureGPS, isCapturing } = useGPS();
  const [manualEntry, setManualEntry] = useState(false);
  
  const handleCapture = async () => {
    try {
      const coords = await captureGPS();
      form.setValue(name, coords);
    } catch (error) {
      console.error('GPS capture failed:', error);
      setManualEntry(true);
    }
  };
  
  const currentValue = form.watch(name);
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {!currentValue && !manualEntry && (
        <Button
          type="button"
          onClick={handleCapture}
          disabled={isCapturing}
          className="w-full"
        >
          {isCapturing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Capturing GPS...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              Capture GPS Location
            </>
          )}
        </Button>
      )}
      
      {currentValue && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm font-medium text-green-800">
            Location Captured
          </p>
          <p className="text-xs text-green-600 mt-1">
            Lat: {currentValue.latitude.toFixed(6)}, 
            Lng: {currentValue.longitude.toFixed(6)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Accuracy: {currentValue.accuracy?.toFixed(0)}m
          </p>
        </div>
      )}
      
      {(manualEntry || currentValue) && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={currentValue?.latitude || ''}
              onChange={(e) =>
                form.setValue(name, {
                  ...currentValue,
                  latitude: parseFloat(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={currentValue?.longitude || ''}
              onChange={(e) =>
                form.setValue(name, {
                  ...currentValue,
                  longitude: parseFloat(e.target.value),
                })
              }
            />
          </div>
        </div>
      )}
      
      {!manualEntry && !currentValue && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setManualEntry(true)}
          className="w-full text-xs"
        >
          Enter Coordinates Manually
        </Button>
      )}
    </div>
  );
};
```

#### MediaField Component

```typescript
// components/forms/fields/MediaField.tsx

'use client';

import { FC, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface MediaFieldProps {
  name: string;
  label?: string;
  maxFiles?: number;
  accept?: string;
}

export const MediaField: FC<MediaFieldProps> = ({
  name,
  label = 'Photos',
  maxFiles = 5,
  accept = 'image/*',
}) => {
  const form = useFormContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  
  const currentFiles = form.watch(name) || [];
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Limit to maxFiles
    const remainingSlots = maxFiles - currentFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    // Generate previews
    const newPreviews = await Promise.all(
      filesToAdd.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      })
    );
    
    setPreviews([...previews, ...newPreviews]);
    form.setValue(name, [...currentFiles, ...filesToAdd]);
  };
  
  const handleRemove = (index: number) => {
    const newFiles = currentFiles.filter((_: any, i: number) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    setPreviews(newPreviews);
    form.setValue(name, newFiles);
  };
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {currentFiles.length < maxFiles && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <Camera className="w-4 h-4 mr-2" />
          {currentFiles.length === 0 ? 'Add Photos' : `Add More (${maxFiles - currentFiles.length} remaining)`}
        </Button>
      )}
      
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square">
              <Image
                src={preview}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover rounded-md"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 w-6 h-6"
                onClick={() => handleRemove(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {currentFiles.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No photos added</p>
        </div>
      )}
    </div>
  );
};
```

---
