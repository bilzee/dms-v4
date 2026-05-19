# Crisis Management Dashboard - Wireframe & Specifications

## Overview
The Crisis Management Dashboard is the primary workspace for Coordinators to manage verification workflows, handle sync conflicts, and oversee resource allocation. Unlike the Situation Awareness Dashboard (which has 3 panels for monitoring), this dashboard focuses on operational queue management.

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Navigation Sidebar │                  Main Content Area                       │
│                    ├─────────────────────────────────────────────────────────┤
│  [Role: Coord.]    │ Header Bar                                              │
│  ┌──────────┐      │ ┌─────────────────────────────────────────────────────┐ │
│  │Dashboard  │      │ │ Crisis Management   [Refresh] [Filter] [Export]   │ │
│  │> Verify   │      │ └─────────────────────────────────────────────────────┘ │
│  │  - Assess │      ├─────────────────────────────────────────────────────────┤
│  │  - Resp   │      │                                                         │
│  │Incidents  │      │  ┌─────────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │Entities   │      │  │ Pending Reviews  │  │ Today's  │  │ Auto-Approval│  │
│  │Monitor    │      │  │      124         │  │   48     │  │     72%      │  │
│  │Settings   │      │  │   ↑ 12% today    │  │ Verified │  │   Enabled    │  │
│  └──────────┘      │  └─────────────────┘  └──────────┘  └──────────────┘  │
│                    │                                                         │
│  [Connection]      │ ┌─────────────────────────────────────────────────────┐ │
│  ● Online          │ │                  VERIFICATION QUEUES                  │ │
│  5 pending         │ ├────────────────────────┬────────────────────────────┤ │
│                    │ │   Assessments (89)     │    Responses (35)          │ │
│  [User Info]       │ ├────────────────────────┼────────────────────────────┤ │
│                    │ │ ┌──────────────────┐   │ ┌──────────────────┐      │ │
│                    │ │ │▼ Camp Alpha       │   │ │▼ Camp Beta        │      │ │
│                    │ │ │  Health Assess.   │   │ │  Food Response    │      │ │
│                    │ │ │  by John D.       │   │ │  by Sarah M.      │      │ │
│                    │ │ │  10 mins ago      │   │ │  25 mins ago      │      │ │
│                    │ │ │  [✓] [✗]         │   │ │  [✓] [✗]         │      │ │
│                    │ │ └──────────────────┘   │ └──────────────────┘      │ │
│                    │ │ ┌──────────────────┐   │ ┌──────────────────┐      │ │
│  [Quick Actions]   │ │ │▶ Village North    │   │ │▶ Camp Charlie     │      │ │
│  [+] New Incident  │ │ │  WASH Assessment  │   │ │  Medical Response │      │ │
│  [⚙] Settings      │ │ │  by Alice K.      │   │ │  by Mike R.       │      │ │
│                    │ │ │  45 mins ago      │   │ │  1 hour ago       │      │ │
│                    │ │ │  [✓] [✗]         │   │ │  [✓] [✗]         │      │ │
│                    │ │ └──────────────────┘   │ └──────────────────┘      │ │
│                    │ └────────────────────────┴────────────────────────────┘ │
│                    │                                                         │
│                    │ ┌─────────────────────────────────────────────────────┐ │
│                    │ │              RESOURCE ALLOCATION                     │ │
│                    │ ├─────────────────────────────────────────────────────┤ │
│                    │ │ Entity          │ Donors  │ Commitments │ Delivered │ │
│                    │ │ Camp Alpha      │   3     │   $45,000   │    62%    │ │
│                    │ │ Camp Beta       │   2     │   $30,000   │    78%    │ │
│                    │ │ Village North   │   1     │   $15,000   │    45%    │ │
│                    │ └─────────────────────────────────────────────────────┘ │
│                    │                                                         │
│                    │ ┌─────────────────────────────────────────────────────┐ │
│                    │ │                SYNC CONFLICTS                       │ │
│                    │ ├─────────────────────────────────────────────────────┤ │
│                    │ │ ⚠ 3 conflicts resolved (last-write-wins)            │ │
│                    │ │ • Camp Alpha - Health Assessment (User: John D.)    │ │
│                    │ │ • Village North - WASH Assessment (User: Alice K.)  │ │
│                    │ │ • Camp Beta - Food Response (User: Sarah M.)        │ │
│                    │ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Header Section
- **Purpose**: Quick overview of system status
- **Components**:
  - Dashboard title with role context
  - Global actions (Refresh, Filter, Export)
  - Last update timestamp

### 2. Metrics Cards Row
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <DashboardCard
    title="Pending Reviews"
    value={124}
    trend={{ value: 12, direction: 'up', label: 'today' }}
    color="yellow"
    icon={<Clock />}
  />
  <DashboardCard
    title="Today's Verifications"
    value={48}
    subtitle="Verified"
    color="green"
    icon={<CheckCircle />}
  />
  <DashboardCard
    title="Auto-Approval Rate"
    value="72%"
    subtitle="Entities with auto-approve"
    color="blue"
    icon={<Zap />}
  />
</div>
```

### 3. Verification Queues (Main Focus)

#### Layout Design
- **Split View**: Two columns for Assessments and Responses
- **Queue Headers**: Show counts with badges
- **Scrollable Lists**: Independent scrolling for each queue
- **Expandable Items**: Click to expand for details

#### Queue Item Structure
```tsx
interface QueueItemDisplay {
  // Collapsed View (Always Visible)
  entityName: string;         // "Camp Alpha"
  documentType: string;        // "Health Assessment"
  submittedBy: string;        // "by John Doe"
  timeAgo: string;            // "10 mins ago"
  priority: 'high' | 'medium' | 'low';
  
  // Expanded View (On Click)
  gapIndicators: Gap[];       // Boolean fields showing gaps
  criticalFields: Field[];   // Key data points
  photos: string[];          // Attached media
  gpsCoordinates: Coords;    // Location data
  
  // Actions (Always Visible)
  approveButton: Button;      // Inline approve
  rejectButton: Button;       // Inline reject (opens modal)
}
```

#### Interaction Flow
1. **Queue Item Click**: Expands to show details
2. **Approve Action**: One-click approval with confirmation toast
3. **Reject Action**: Opens rejection modal with reason selection
4. **Keyboard Shortcuts**: 
   - `Space` - Expand/collapse item
   - `A` - Approve selected
   - `R` - Reject selected
   - `Arrow keys` - Navigate queue

### 4. Resource Allocation Table

#### Purpose
Quick view of donor-entity relationships and commitment status

#### Columns
- **Entity**: Name with gap severity indicator
- **Assigned Donors**: Count with expandable list
- **Total Commitments**: Aggregated value
- **Delivery Rate**: Progress bar with percentage

#### Actions
- Click row to manage assignments
- Quick assign donor button
- Export allocation report

### 5. Sync Conflicts Panel

#### Display Format
```tsx
<div className="border-l-4 border-orange-400 bg-orange-50 p-4">
  <h3 className="font-semibold text-orange-900">
    Sync Conflicts (3 resolved)
  </h3>
  <ul className="mt-2 space-y-2">
    {conflicts.map(conflict => (
      <li className="flex justify-between items-center">
        <div>
          <span className="font-medium">{conflict.entity}</span>
          <span className="text-sm text-gray-600 ml-2">
            {conflict.document}
          </span>
        </div>
        <span className="text-xs text-orange-600">
          Winner: {conflict.winner}
        </span>
      </li>
    ))}
  </ul>
</div>
```

## Responsive Behavior

### Desktop (>1280px)
- Full layout as shown in wireframe
- Two-column queue display
- All panels visible

### Tablet (768px - 1280px)
- Collapsible sidebar
- Single column queue with tabs
- Stacked resource and conflict panels

### Mobile (<768px)
- Hidden sidebar (hamburger menu)
- Tab navigation for queues
- Stacked cards and panels
- Swipe gestures for queue navigation

## Real-Time Updates

### Update Frequency
- **Queue Items**: Push updates via WebSocket
- **Metrics**: 30-second polling
- **Conflicts**: Immediate notification

### Visual Feedback
```tsx
// New item animation
@keyframes slideIn {
  from { 
    transform: translateY(-20px); 
    opacity: 0; 
  }
  to { 
    transform: translateY(0); 
    opacity: 1; 
  }
}

.queue-item-new {
  animation: slideIn 0.3s ease-out;
}

// Update pulse
.metric-updated {
  animation: pulse 1s ease-in-out;
}
```

## Performance Optimizations

### Virtual Scrolling
```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={assessments.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <QueueItem item={assessments[index]} />
    </div>
  )}
</FixedSizeList>
```

### Lazy Loading
- Load 20 items initially
- Load more on scroll (infinite scroll)
- Prefetch next batch at 80% scroll

### Caching Strategy
```typescript
// React Query configuration
const queuesQuery = useQuery({
  queryKey: ['verification-queues'],
  queryFn: fetchQueues,
  staleTime: 20 * 1000,      // 20 seconds
  cacheTime: 5 * 60 * 1000,   // 5 minutes
  refetchInterval: 30 * 1000, // 30 seconds
});
```

## Keyboard Accessibility

### Navigation Map
```
Tab Order:
1. Skip to main content
2. Header actions
3. Metric cards
4. Assessment queue
5. Response queue
6. Resource table
7. Conflicts panel
```

### Shortcuts
```typescript
const keyboardShortcuts = {
  'Ctrl+R': 'Refresh queues',
  'Ctrl+F': 'Focus filter',
  'Ctrl+1': 'Focus assessments',
  'Ctrl+2': 'Focus responses',
  'Escape': 'Close expanded item',
  'Enter': 'Approve selected',
  'Delete': 'Reject selected'
};
```

## Implementation Code Example

```tsx
// pages/coordinator/dashboard.tsx
export default function CrisisManagementDashboard() {
  const { data: queues, isLoading } = useVerificationQueues();
  const { data: metrics } = useDashboardMetrics();
  const { conflicts, resolveConflict } = useSyncConflicts();
  
  return (
    <div className="p-6 space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard {...metricsConfig.pending} />
        <DashboardCard {...metricsConfig.verified} />
        <DashboardCard {...metricsConfig.autoApproval} />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Verification Queues */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Verification Queues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <VerificationQueue
                  title="Assessments"
                  items={queues?.assessments || []}
                  onApprove={handleApproveAssessment}
                  onReject={handleRejectAssessment}
                />
                <VerificationQueue
                  title="Responses"
                  items={queues?.responses || []}
                  onApprove={handleApproveResponse}
                  onReject={handleRejectResponse}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Resource Allocation */}
        <div className="xl:col-span-1">
          <ResourceAllocationTable />
        </div>
        
        {/* Sync Conflicts */}
        <div className="xl:col-span-1">
          <SyncConflictsPanel conflicts={conflicts} />
        </div>
      </div>
    </div>
  );
}
```

## Success Metrics

- **Queue Processing Time**: <30 seconds average
- **Click-to-Action**: Maximum 2 clicks for any verification
- **Page Load**: <2 seconds
- **Update Latency**: <1 second for real-time updates
- **Error Rate**: <0.1% for verification actions