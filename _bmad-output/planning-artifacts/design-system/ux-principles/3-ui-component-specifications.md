# 3. UI Component Specifications

## 3.1 Layout Components

### AppShell Component
```tsx
// Primary layout wrapper with offline indicator
interface AppShellProps {
  role: UserRole;
  children: React.ReactNode;
}

// Features:
- Responsive sidebar (collapsible on mobile)
- Role switcher dropdown (top-right)
- Offline/Online status indicator
- Sync queue badge with count
- Breadcrumb navigation
- PWA install prompt
```

### OfflineIndicator Component
```tsx
// Visual indicator for connectivity status
// Position: Fixed top banner or corner badge
// States:
- Online (green dot/banner)
- Offline (orange dot/banner with "Offline Mode")
- Syncing (animated pulse)
- Sync Error (red with retry button)
```

## 3.2 Form Components

### AssessmentForm Component Suite
```tsx
// Modular form system for all 6 assessment types
interface AssessmentFormProps {
  type: 'health' | 'wash' | 'shelter' | 'food' | 'security' | 'population';
  entityId: string;
  mode: 'create' | 'edit' | 'view';
}

// Core Features:
- Dynamic field rendering based on type
- Offline validation with Zod schemas
- Auto-save to IndexedDB every 30 seconds
- GPS capture with manual fallback
- Media attachment with compression
- Progress indicator for long forms
- Boolean gap indicators with visual feedback
```

### Field Components
```tsx
// Reusable field components optimized for offline use

<BooleanField />       // Toggle with clear yes/no states
<GPSField />          // Auto-capture with manual entry
<MediaField />        // Photo capture with location stamps
<QuantityField />     // Numeric with unit selection
<TextAreaField />     // Multi-line with character count
<DateTimeField />     // Date/time picker with current default
```

### Navigation Pane
```tsx
// Enhanced Navigation Sidebar Component Structure
interface NavigationSidebarProps {
  currentRole: Role;
  user: User;
  syncQueueCount: number;
  isOnline: boolean;
}

// Layout Structure:
<aside className="w-64 bg-white border-r h-screen flex flex-col">
  {/* Role Header Section */}
  <div className="p-4 border-b bg-blue-50">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">Active Role</p>
        <h2 className="font-semibold text-lg">{role.name}</h2>
      </div>
      <RoleSwitcher /> {/* Dropdown for role change */}
    </div>
  </div>

  {/* User Info */}
  <div className="px-4 py-3 border-b">
    <div className="flex items-center space-x-3">
      <Avatar user={user} />
      <div className="flex-1">
        <p className="text-sm font-medium">{user.name}</p>
        <p className="text-xs text-gray-500">{user.email}</p>
      </div>
    </div>
  </div>

  {/* Connection Status */}
  <div className="px-4 py-2 border-b">
    <ConnectionStatus isOnline={isOnline} syncCount={syncQueueCount} />
  </div>

  {/* Navigation Items */}
  <nav className="flex-1 overflow-y-auto p-4">
    <div className="space-y-1">
      {roleNavItems.map(item => (
        <NavItem key={item.path} {...item} />
      ))}
    </div>
  </nav>

  {/* Quick Actions */}
  <div className="p-4 border-t">
    <QuickActions role={role} />
  </div>
</aside>

// Breadcrumb integrated with top header
<header className="h-14 border-b bg-white">
  <div className="flex items-center h-full px-4">
    <Breadcrumbs />
    <div className="ml-auto flex items-center space-x-4">
      <NotificationBell />
      <SyncIndicator />
      <ProfileMenu />
    </div>
  </div>
</header>
```

### Navigation Structure by Role
```tsx
// Navigation configuration per role
const navigationConfig = {
  assessor: [
    {
      label: 'Dashboard',
      icon: Home,
      path: '/assessor/dashboard',
      badge: null
    },
    {
      label: 'Assessments',
      icon: FileText,
      path: '/assessor/assessments',
      children: [
        { label: 'New Assessment', path: '/assessor/assessments/new' },
        { label: 'Preliminary', path: '/assessor/assessments/preliminary' },
        { label: 'Rapid (Health)', path: '/assessor/assessments/health' },
        { label: 'Rapid (WASH)', path: '/assessor/assessments/wash' },
        // ... other assessment types
      ]
    },
    {
      label: 'My Entities',
      icon: MapPin,
      path: '/assessor/entities',
      badge: assignedEntityCount
    },
    {
      label: 'Sync Queue',
      icon: Cloud,
      path: '/assessor/sync',
      badge: syncQueueCount,
      badgeColor: 'orange'
    }
  ],
  
  coordinator: [
    {
      label: 'Crisis Dashboard',
      icon: AlertTriangle,
      path: '/coordinator/dashboard',
      badge: pendingCount,
      badgeColor: 'red'
    },
    {
      label: 'Verification',
      icon: CheckCircle,
      path: '/coordinator/verification',
      children: [
        { 
          label: 'Assessments', 
          path: '/coordinator/verification/assessments',
          badge: pendingAssessments 
        },
        { 
          label: 'Responses', 
          path: '/coordinator/verification/responses',
          badge: pendingResponses 
        }
      ]
    },
    // ... rest of coordinator items
  ]
};
```

## 3.3 Dashboard Components

### Crisis Management Dashboard
```tsx
// Three-column layout for coordinators
interface CrisisDashboardProps {
  queues: {
    assessments: QueueItem[];
    responses: QueueItem[];
  };
  conflicts: ConflictItem[];
  metrics: DashboardMetrics;
}

// Layout:
- Left: Verification queues with inline actions
- Center: Resource management & assignments
- Right: Conflict log & metrics
- Real-time updates via polling/WebSocket
```

### Situation Awareness Dashboard
```tsx
// Three-panel monitoring interface
interface SituationDashboardProps {
  incident: Incident;
  entities: AffectedEntity[];
  assessments: Assessment[];
}

// Panel Structure:
- Left Panel (300px):
  - Incident selector dropdown
  - Duration & impact stats
  - Status indicators
  
- Center Panel (flex):
  - Entity selector (filtered)
  - Assessment summary grid
  - Gap analysis matrix
  - Interactive map
  
- Right Panel (350px):
  - Gap summary across entities
  - Priority scoring
  - Export actions
```

### Queue Management Component
```tsx
// Reusable queue for assessments/responses
interface QueueProps {
  items: QueueItem[];
  type: 'assessment' | 'response';
  onVerify: (id: string, action: 'approve' | 'reject') => void;
}

// Features:
- Expandable row details
- Inline approve/reject buttons
- Rejection reason modal
- Sort by: date, priority, entity
- Filter by: status, type, assignee
- Batch actions support
```

## 3.4 Map Components

### InteractiveMap Component
```tsx
// Offline-capable map with entity visualization
interface MapProps {
  entities: EntityLocation[];
  selectedEntity?: string;
  showDonors?: boolean;
  gapSeverity?: GapLevel;
}

// Implementation:
- Use Mapbox GL JS with offline tiles
- Cluster markers for performance
- Color coding by gap severity
- Click handlers for entity selection
- Zoom to selected entity
- Fallback to static image if offline tiles unavailable
```

## 3.5 Sync Components

### SyncQueue Component
```tsx
// Visual queue management interface
interface SyncQueueProps {
  queue: SyncItem[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

// Display:
- List of pending items with status
- Progress bar for active sync
- Retry/cancel actions per item
- Clear completed button
- Conflict resolution links
```
