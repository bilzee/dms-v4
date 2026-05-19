# Disaster Management System - Core Component Library

## Overview
This component library provides 15 essential components built with Shadcn/ui and Tailwind CSS, optimized for LLM implementation. Each component includes TypeScript interfaces, usage examples, and variants.

## Installation Setup

```bash
# Install Shadcn/ui CLI
npx shadcn-ui@latest init

# Install required components from Shadcn/ui
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add skeleton

# Additional dependencies
npm install lucide-react react-hook-form zod @hookform/resolvers
```

---

## 1. Button Component

### Base Implementation
```tsx
// components/ui/button-extended.tsx
import { Button as BaseButton } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ComponentPropsWithoutRef<typeof BaseButton> {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export function Button({ 
  loading, 
  loadingText = "Loading...", 
  icon, 
  badge,
  children, 
  disabled,
  className,
  ...props 
}: ButtonProps) {
  return (
    <BaseButton
      disabled={disabled || loading}
      className={cn("relative", className)}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!loading && icon && <span className="mr-2">{icon}</span>}
      {loading ? loadingText : children}
      {badge !== undefined && (
        <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
          {badge}
        </span>
      )}
    </BaseButton>
  );
}
```

### Usage Examples
```tsx
// Primary action button
<Button variant="default" size="lg">
  Submit Assessment
</Button>

// Loading state
<Button loading loadingText="Submitting...">
  Submit
</Button>

// With icon and badge
<Button icon={<Save className="h-4 w-4" />} badge={3}>
  Save Draft
</Button>

// Offline mode button
<Button 
  variant="outline" 
  className="border-orange-500 text-orange-600"
>
  Save Offline
</Button>
```

---

## 2. StatusBadge Component

### Implementation
```tsx
// components/ui/status-badge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = 
  | 'verified' 
  | 'pending' 
  | 'rejected' 
  | 'auto-approved'
  | 'draft'
  | 'synced'
  | 'syncing'
  | 'conflict'
  | 'offline';

interface StatusBadgeProps {
  status: StatusType;
  count?: number;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  verified: { 
    label: 'Verified', 
    className: 'bg-green-100 text-green-800 border-green-200' 
  },
  pending: { 
    label: 'Pending', 
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200' 
  },
  rejected: { 
    label: 'Rejected', 
    className: 'bg-red-100 text-red-800 border-red-200' 
  },
  'auto-approved': { 
    label: 'Auto-Approved', 
    className: 'bg-blue-100 text-blue-800 border-blue-200' 
  },
  draft: { 
    label: 'Draft', 
    className: 'bg-gray-100 text-gray-800 border-gray-200' 
  },
  synced: { 
    label: 'Synced', 
    className: 'bg-green-100 text-green-800 border-green-200' 
  },
  syncing: { 
    label: 'Syncing', 
    className: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse' 
  },
  conflict: { 
    label: 'Conflict', 
    className: 'bg-red-100 text-red-800 border-red-200' 
  },
  offline: { 
    label: 'Offline', 
    className: 'bg-orange-100 text-orange-800 border-orange-200' 
  },
};

export function StatusBadge({ status, count, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="outline"
      className={cn(config.className, "font-medium", className)}
    >
      {config.label}
      {count !== undefined && (
        <span className="ml-1 font-semibold">({count})</span>
      )}
    </Badge>
  );
}
```

### Usage
```tsx
<StatusBadge status="verified" />
<StatusBadge status="pending" count={5} />
<StatusBadge status="syncing" />
```

---

## 3. ConnectionIndicator Component

### Implementation
```tsx
// components/ui/connection-indicator.tsx
import { WifiOff, Wifi, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionIndicatorProps {
  isOnline: boolean;
  syncPending?: number;
  lastSync?: Date;
  onRetrySync?: () => void;
  variant?: 'banner' | 'compact' | 'detailed';
}

export function ConnectionIndicator({
  isOnline,
  syncPending = 0,
  lastSync,
  onRetrySync,
  variant = 'compact'
}: ConnectionIndicatorProps) {
  if (variant === 'banner') {
    return (
      <div className={cn(
        "w-full px-4 py-2 text-sm font-medium text-white",
        isOnline ? "bg-green-600" : "bg-orange-600"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
            {syncPending > 0 && (
              <span className="ml-2">• {syncPending} items pending sync</span>
            )}
          </div>
          {!isOnline && onRetrySync && (
            <button 
              onClick={onRetrySync}
              className="flex items-center gap-1 text-sm hover:underline"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "rounded-full p-2",
              isOnline ? "bg-green-100" : "bg-orange-100"
            )}>
              {isOnline ? 
                <Wifi className="h-4 w-4 text-green-600" /> : 
                <WifiOff className="h-4 w-4 text-orange-600" />
              }
            </div>
            <div>
              <p className="text-sm font-medium">
                {isOnline ? 'Connected' : 'Offline Mode'}
              </p>
              {lastSync && (
                <p className="text-xs text-gray-500">
                  Last sync: {lastSync.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          {syncPending > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm">{syncPending} pending</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Compact variant (default)
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "h-2 w-2 rounded-full",
        isOnline ? "bg-green-500" : "bg-orange-500",
        !isOnline && "animate-pulse"
      )} />
      <span className="text-sm text-gray-600">
        {isOnline ? 'Online' : 'Offline'}
      </span>
      {syncPending > 0 && (
        <span className="ml-1 text-xs text-orange-600">
          ({syncPending})
        </span>
      )}
    </div>
  );
}
```

---

## 4. FormField Component (Enhanced)

### Implementation
```tsx
// components/ui/form-field-enhanced.tsx
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle } from "lucide-react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  success?: boolean;
  hint?: string;
  gapIndicator?: boolean;
  gapStatus?: 'gap' | 'no-gap' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  required,
  error,
  success,
  hint,
  gapIndicator,
  gapStatus,
  children,
  className
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        {gapIndicator && gapStatus && (
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded",
            gapStatus === 'gap' && "bg-red-100 text-red-700",
            gapStatus === 'no-gap' && "bg-green-100 text-green-700",
            gapStatus === 'neutral' && "bg-gray-100 text-gray-700"
          )}>
            {gapStatus === 'gap' ? 'Gap Detected' : 
             gapStatus === 'no-gap' ? 'No Gap' : 'N/A'}
          </span>
        )}
      </div>
      
      {children}
      
      {hint && !error && (
        <p className="text-sm text-gray-500">{hint}</p>
      )}
      
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
      
      {success && !error && (
        <div className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span>Field saved</span>
        </div>
      )}
    </div>
  );
}
```

---

## 5. BooleanField Component (Gap-Aware)

### Implementation
```tsx
// components/forms/boolean-field.tsx
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/ui/form-field-enhanced";
import { cn } from "@/lib/utils";

interface BooleanFieldProps {
  name: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  isGapIndicator?: boolean;
  trueLabel?: string;
  falseLabel?: string;
  error?: string;
}

export function BooleanField({
  name,
  label,
  value,
  onChange,
  description,
  required,
  disabled,
  isGapIndicator,
  trueLabel = "Yes",
  falseLabel = "No",
  error
}: BooleanFieldProps) {
  const gapStatus = isGapIndicator ? 
    (value ? 'no-gap' : 'gap') : undefined;

  return (
    <FormField
      label={label}
      required={required}
      error={error}
      hint={description}
      gapIndicator={isGapIndicator}
      gapStatus={gapStatus}
    >
      <div className="flex items-center space-x-4">
        <Switch
          id={name}
          checked={value}
          onCheckedChange={onChange}
          disabled={disabled}
          className={cn(
            isGapIndicator && !value && "data-[state=unchecked]:bg-red-200"
          )}
        />
        <label
          htmlFor={name}
          className={cn(
            "text-sm font-medium cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {value ? trueLabel : falseLabel}
        </label>
      </div>
    </FormField>
  );
}
```

### Usage
```tsx
<BooleanField
  name="hasFunctionalClinic"
  label="Functional Clinic Available"
  value={formData.hasFunctionalClinic}
  onChange={(val) => setFormData({...formData, hasFunctionalClinic: val})}
  isGapIndicator={true}
  description="Gap will be indicated if no functional clinic is available"
  required
/>
```

---

## 6. GPSField Component

### Implementation
```tsx
// components/forms/gps-field.tsx
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button-extended";
import { FormField } from "@/components/ui/form-field-enhanced";
import { useState } from "react";

interface GPSFieldProps {
  name: string;
  label?: string;
  value: { latitude: number; longitude: number } | null;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  required?: boolean;
  error?: string;
}

export function GPSField({
  name,
  label = "GPS Coordinates",
  value,
  onChange,
  required,
  error
}: GPSFieldProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string>("");
  const [manualMode, setManualMode] = useState(false);

  const captureGPS = async () => {
    setIsCapturing(true);
    setCaptureError("");
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      
      onChange({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (err) {
      setCaptureError("Unable to capture GPS. Please enter manually.");
      setManualMode(true);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <FormField
      label={label}
      required={required}
      error={error || captureError}
    >
      <div className="space-y-2">
        {!manualMode ? (
          <div className="flex gap-2">
            <Input
              id={name}
              value={value ? `${value.latitude}, ${value.longitude}` : ""}
              readOnly
              placeholder="No coordinates captured"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={captureGPS}
              loading={isCapturing}
              icon={<MapPin className="h-4 w-4" />}
            >
              {isCapturing ? "Capturing..." : "Capture"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="any"
                placeholder="Latitude"
                value={value?.latitude || ""}
                onChange={(e) => onChange({
                  latitude: parseFloat(e.target.value),
                  longitude: value?.longitude || 0
                })}
              />
              <Input
                type="number"
                step="any"
                placeholder="Longitude"
                value={value?.longitude || ""}
                onChange={(e) => onChange({
                  latitude: value?.latitude || 0,
                  longitude: parseFloat(e.target.value)
                })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setManualMode(false);
                setCaptureError("");
              }}
            >
              Switch to auto-capture
            </Button>
          </div>
        )}
        {value && (
          <p className="text-xs text-gray-500">
            Captured at: {new Date().toLocaleTimeString()}
          </p>
        )}
      </div>
    </FormField>
  );
}
```

---

## 7. MediaField Component

### Implementation
```tsx
// components/forms/media-field.tsx
import { Camera, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button-extended";
import { FormField } from "@/components/ui/form-field-enhanced";
import { useState, useRef } from "react";

interface MediaFieldProps {
  name: string;
  label?: string;
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeInMB?: number;
  required?: boolean;
  error?: string;
}

export function MediaField({
  name,
  label = "Photos",
  value = [],
  onChange,
  maxFiles = 3,
  maxSizeInMB = 5,
  required,
  error
}: MediaFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => 
      file.size <= maxSizeInMB * 1024 * 1024
    ).slice(0, maxFiles - value.length);

    const newFiles = [...value, ...validFiles];
    onChange(newFiles);

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index);
    onChange(newFiles);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <FormField
      label={label}
      required={required}
      error={error}
      hint={`Max ${maxFiles} files, ${maxSizeInMB}MB each`}
    >
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-24 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          {value.length < maxFiles && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-24 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center hover:border-gray-400 transition-colors"
            >
              <Upload className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500 mt-1">Add Photo</span>
            </button>
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={value.length >= maxFiles}
          icon={<Camera className="h-4 w-4" />}
        >
          Take Photo
        </Button>
      </div>
    </FormField>
  );
}
```

---

## 8. SyncQueueItem Component

### Implementation
```tsx
// components/ui/sync-queue-item.tsx
import { RefreshCw, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SyncQueueItemProps {
  item: {
    id: string;
    type: 'assessment' | 'response';
    entityName: string;
    status: 'pending' | 'syncing' | 'success' | 'error';
    progress?: number;
    error?: string;
    createdAt: Date;
    retryCount: number;
  };
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

export function SyncQueueItem({ item, onRetry, onRemove }: SyncQueueItemProps) {
  const statusIcon = {
    pending: <AlertCircle className="h-4 w-4 text-orange-500" />,
    syncing: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  return (
    <div className={cn(
      "border rounded-lg p-3",
      item.status === 'error' && "border-red-200 bg-red-50"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {statusIcon[item.status]}
          <div>
            <p className="text-sm font-medium">
              {item.type === 'assessment' ? 'Assessment' : 'Response'} - {item.entityName}
            </p>
            <p className="text-xs text-gray-500">
              Created {item.createdAt.toLocaleTimeString()}
              {item.retryCount > 0 && (
                <span className="ml-2">• {item.retryCount} retries</span>
              )}
            </p>
            {item.error && (
              <p className="text-xs text-red-600 mt-1">{item.error}</p>
            )}
          </div>
        </div>
        
        <div className="flex gap-1">
          {item.status === 'error' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRetry(item.id)}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(item.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {item.status === 'syncing' && item.progress !== undefined && (
        <Progress value={item.progress} className="mt-2 h-1" />
      )}
    </div>
  );
}
```

---

## 9. EntityCard Component

### Implementation
```tsx
// components/ui/entity-card.tsx
import { MapPin, Users, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EntityCardProps {
  entity: {
    id: string;
    name: string;
    type: 'Camp' | 'Community';
    population: number;
    vulnerableCount: number;
    location: { latitude: number; longitude: number };
    gapSeverity?: 'none' | 'mild' | 'severe';
    lastAssessment?: Date;
    autoApproveEnabled?: boolean;
  };
  selected?: boolean;
  onClick?: () => void;
  showActions?: boolean;
}

export function EntityCard({ 
  entity, 
  selected, 
  onClick,
  showActions 
}: EntityCardProps) {
  const severityColors = {
    none: "border-green-200 bg-green-50",
    mild: "border-yellow-200 bg-yellow-50",
    severe: "border-red-200 bg-red-50",
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-blue-500",
        entity.gapSeverity && severityColors[entity.gapSeverity]
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{entity.name}</CardTitle>
          <div className="flex gap-1">
            <Badge variant="outline">{entity.type}</Badge>
            {entity.autoApproveEnabled && (
              <Badge variant="secondary">Auto-Approve</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-500" />
            <span>{entity.population.toLocaleString()}</span>
          </div>
          {entity.vulnerableCount > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{entity.vulnerableCount} vulnerable</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="h-4 w-4" />
          <span>{entity.location.latitude.toFixed(4)}, {entity.location.longitude.toFixed(4)}</span>
        </div>
        
        {entity.lastAssessment && (
          <p className="text-xs text-gray-500">
            Last assessed: {entity.lastAssessment.toLocaleDateString()}
          </p>
        )}
        
        {entity.gapSeverity && entity.gapSeverity !== 'none' && (
          <div className="pt-2">
            <p className="text-sm font-medium text-red-600">
              {entity.gapSeverity === 'severe' ? 'Multiple gaps detected' : 'Gap detected'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

