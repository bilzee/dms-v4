# Plan: Fix Mocked Values & Wire Up Real Backend Integration

> Detailed implementation plan for replacing all mocked/hardcoded values with real backend integration.
> Created: 2026-05-19

---

## Prerequisites & Shared Patterns

### Existing patterns to follow:
- **API routes**: Use `withAuth` HOF from `src/lib/auth/middleware.ts` for auth + RBAC
- **Prisma client**: Import from `src/lib/db/client.ts` (shared singleton)
- **Response format**: `{ data: {...}, meta: { timestamp, version, requestId } }`
- **Error format**: `{ success: false, error: "message" }` with appropriate HTTP status
- **Frontend auth**: Use `useAuth()` hook for `token`, `hasPermission()`, `hasRole()`
- **Chart.js**: Already installed (`chart.js@4.5.1`, `react-chartjs-2@5.3.1`), registration pattern in `DonorPerformanceDashboard.tsx:14-60`

### Schema note:
- The `Role` model uses an `@unique` constraint on `name` (type `RoleName` enum), so custom roles need a new enum value or the model needs to change to allow free-text names. The `RolePermission` model supports CRUD.

---

## Task 1: System/Settings Page — Backend + Frontend

**Priority:** CRITICAL
**Files to modify:**
- `src/app/(auth)/system/settings/page.tsx` (frontend)
- NEW: `src/app/api/v1/admin/settings/route.ts` (API)

### Step 1.1: Create Prisma model for settings

Add a `SystemSetting` model to `prisma/schema.prisma`:

```prisma
model SystemSetting {
  id        String   @id @default(uuid())
  section   String   // "general", "security", "notifications", "backup"
  key       String   // e.g. "siteName", "passwordMinLength"
  value     String   // JSON-serialized value
  updatedAt DateTime @updatedAt
  updatedBy String?

  @@unique([section, key])
  @@map("system_settings")
}
```

Run `npx prisma db push` to apply.

### Step 1.2: Create seed data

Create seed entries for all default settings currently hardcoded in the page:
- general: siteName, siteDescription, adminEmail, timezone, dateFormat, language
- security: passwordMinLength, passwordRequireSpecialChars, sessionTimeout, maxLoginAttempts, twoFactorEnabled
- notifications: emailNotifications, smsNotifications, criticalAlerts, weeklyReports, maintenanceAlerts
- backup: autoBackupEnabled, backupFrequency, retentionPeriod, backupLocation

### Step 1.3: Create API route `src/app/api/v1/admin/settings/route.ts`

```
GET  /api/v1/admin/settings         → Returns all settings grouped by section
GET  /api/v1/admin/settings?section=general → Returns one section
PUT  /api/v1/admin/settings         → Accepts { section, settings: { key: value, ... } }
```

**Implementation:**
- `GET` handler: `withAuth` + `MANAGE_USERS` permission check. Query `SystemSetting` table, group by `section`, parse JSON values, return structured response matching the `SystemSettings` interface on the frontend.
- `PUT` handler: `withAuth` + `MANAGE_USERS` permission check. Accept `{ section: string, settings: Record<string, any> }`. Upsert each key-value pair in the `SystemSetting` table. Return updated settings.

### Step 1.4: Update frontend `src/app/(auth)/system/settings/page.tsx`

1. Add `useEffect` to fetch settings on mount:
   ```ts
   useEffect(() => {
     const fetchSettings = async () => {
       if (!token) return
       const res = await fetch('/api/v1/admin/settings', {
         headers: { 'Authorization': `Bearer ${token}` }
       })
       if (res.ok) {
         const data = await res.json()
         setSettings(data.data) // merge with defaults for any missing keys
       }
     }
     fetchSettings()
   }, [token])
   ```

2. Replace `handleSave` (lines 96-131):
   - Remove `setTimeout` simulation
   - Uncomment the fetch call (lines 105-121)
   - Add proper error handling with toast/alert

3. Replace hardcoded backup status (lines 496-511):
   - Add a `backupStatus` state variable
   - Fetch from `/api/v1/admin/settings?section=backup` or a dedicated backup status endpoint
   - Show real last backup time, size, and status

### Estimated effort: 2-3 hours

---

## Task 2: Roles Page — Wire Up CRUD

**Priority:** HIGH
**Files to modify:**
- `src/app/(auth)/roles/page.tsx` (frontend)
- `src/app/api/v1/roles/route.ts` (API - already has GET)

### Step 2.1: Add POST/PUT to existing roles API route

File: `src/app/api/v1/roles/route.ts`

Currently only has `GET`. Add:

```ts
export const POST = withAuth(async (request: NextRequest, context) => {
  // Validate MANAGE_USERS permission
  // Parse body: { name, description, permissions: string[] }
  // Create Role + RolePermission entries
  // Return created role with permissions
})

export const PUT = withAuth(async (request: NextRequest, context) => {
  // Validate MANAGE_USERS permission
  // Parse body: { id, name, description, permissions: string[] }
  // Update Role, delete old RolePermissions, create new ones
  // Return updated role
})
```

**Important schema constraint:** `Role.name` is `RoleName` enum type. Two options:
- **Option A (recommended):** Allow custom role names by changing `name` from `RoleName` enum to `String` in the schema
- **Option B:** Restrict creation to existing enum values only

### Step 2.2: Add DELETE handler

Create: `src/app/api/v1/roles/[id]/route.ts`

```ts
export const DELETE = withAuth(async (request: NextRequest, context) => {
  // Validate MANAGE_USERS permission
  // Check role has no users assigned (or warn)
  // Delete RolePermission entries, then delete Role
  // Return success
})
```

### Step 2.3: Update frontend RoleForm handleSubmit

File: `src/app/(auth)/roles/page.tsx`, lines 345-377

Replace the mocked `handleSubmit`:
```ts
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  try {
    const response = await fetch('/api/v1/roles' + (role ? `/${role.id}` : ''), {
      method: role ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, description, permissions: selectedPermissions })
    })
    if (response.ok) {
      onSuccess()
    } else {
      const data = await response.json()
      throw new Error(data.error || 'Failed to save role')
    }
  } catch (error) {
    console.error('Error saving role:', error)
    // Show error to user (add error state)
  } finally {
    setIsLoading(false)
  }
}
```

### Step 2.4: Implement delete handler

File: `src/app/(auth)/roles/page.tsx`, lines 266-269

Replace empty delete handler:
```ts
onClick={async () => {
  if (confirm('Are you sure you want to delete this role?')) {
    try {
      const res = await fetch(`/api/v1/roles/${role.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) fetchRoles()
      else alert('Failed to delete role')
    } catch { alert('Failed to delete role') }
  }
}}
```

### Estimated effort: 1.5-2 hours

---

## Task 3: Verification Analytics — Replace Math.random()

**Priority:** HIGH
**Files to modify:**
- `src/components/verification/VerificationAnalytics.tsx` (frontend)
- NEW: `src/app/api/v1/verification/analytics/route.ts` (API)

### Step 3.1: Create analytics API route

File: `src/app/api/v1/verification/analytics/route.ts`

```ts
export const GET = withAuth(async (request: NextRequest, context) => {
  // Parse query params: timeRange (1h, 24h, 7d, 30d)
  // Query RapidAssessment + RapidResponse counts:
  //   - totalProcessed: COUNT where verificationStatus IN ('VERIFIED','AUTO_VERIFIED','REJECTED') within time range
  //   - throughput: totalProcessed / hours in range
  //   - timeSeries: GROUP BY hour/day, count assessments/deliveries/verified
  // Return structured analytics data
})
```

**Data sources:**
- `RapidAssessment` model: `verificationStatus`, `createdAt`, `status`
- `RapidResponse` model: `status`, `createdAt`
- Use Prisma `groupBy` or raw SQL for time-series aggregation

### Step 3.2: Update frontend VerificationAnalytics.tsx

Replace lines 64-71 (performanceMetrics):
```ts
const [analyticsData, setAnalyticsData] = useState(null)

useEffect(() => {
  const fetchAnalytics = async () => {
    if (!token) return
    const res = await fetch(`/api/v1/verification/analytics?timeRange=${timeRange}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      setAnalyticsData(data.data)
    }
  }
  fetchAnalytics()
}, [token, timeRange])
```

Replace lines 93-102 (timeSeriesData) to use `analyticsData.timeSeries` from API instead of `Math.random()`.

Replace line 607 (`"Moderate"` system load) with `analyticsData.systemLoad || 'Unknown'`.

### Estimated effort: 2-3 hours

---

## Task 4: Main Dashboard System Health — Create /api/v1/system/health

**Priority:** HIGH
**Files to modify:**
- `src/app/(auth)/dashboard/page.tsx` (frontend)
- NEW: `src/app/api/v1/system/health/route.ts` (API)

### Step 4.1: Create system health API route

File: `src/app/api/v1/system/health/route.ts`

```ts
export const GET = withAuth(async (request: NextRequest, context) => {
  // Database health:
  //   - Execute raw SELECT 1 to check DB connectivity
  //   - Query prisma.$queryRaw for DB size if PostgreSQL supports it
  // API response time: Measure time for a simple Prisma query
  // Active users: COUNT users where lastLogin > now() - interval '24 hours'
  // Storage usage: Query pg_database_size or similar
  // Last backup: Query SystemSetting where section='backup' key='lastBackupAt'
  
  return NextResponse.json({
    data: {
      databaseSync: 'Healthy' | 'Degraded' | 'Down',
      apiResponseTime: <measured_ms>,
      activeUsers: <count>,
      storageUsage: <percentage>,
      lastBackup: <timestamp_or_relative>
    }
  })
})
```

**Implementation details:**
- Use `prisma.$queryRaw` for PostgreSQL stats
- Wrap in try/catch — if DB query fails, return `databaseSync: 'Down'`
- Measure response time with `performance.now()` around a simple query
- Cache results for 30-60 seconds (use in-memory cache or `revalidate`)

### Step 4.2: Update frontend dashboard page.tsx

1. Add a `useEffect` to fetch system health:
   ```ts
   const [systemHealth, setSystemHealth] = useState(null)
   
   useEffect(() => {
     const fetchHealth = async () => {
       try {
         const res = await fetch('/api/v1/system/health')
         if (res.ok) {
           const data = await res.json()
           setSystemHealth(data.data)
         }
       } catch {}
     }
     fetchHealth()
     const interval = setInterval(fetchHealth, 60000) // refresh every minute
     return () => clearInterval(interval)
   }, [])
   ```

2. Replace hardcoded values in System Health widget (lines 238-261):
   - Line 243: `"Healthy"` → `systemHealth?.databaseSync || "..."`
   - Line 248: `"142ms"` → `${systemHealth?.apiResponseTime || "..."}ms`
   - Line 252: `"24"` → `systemHealth?.activeUsers || "..."`
   - Line 256: `"67%"` → `${systemHealth?.storageUsage || "..."}%`
   - Line 260: `"2 hours ago"` → `systemHealth?.lastBackup || "..."`

3. Also update hardcoded status cards:
   - Line 132: `"Online"` → derive from `systemHealth?.databaseSync !== 'Down'`
   - Line 146: `"3"` → fetch active incidents count from `/api/v1/incidents?status=ACTIVE`
   - Line 178: `"7"` → fetch pending verification count from `/api/v1/rapid-assessments?status=SUBMITTED&verificationStatus=PENDING`

### Estimated effort: 2-3 hours

---

## Task 5: Admin Dashboard — Remove Hardcoded Badges & "Coming Soon"

**Priority:** MEDIUM
**Files to modify:**
- `src/app/(auth)/admin/dashboard/page.tsx`

### Step 5.1: Replace hardcoded system health badges

Lines 258-279: Replace three hardcoded `<Badge>Healthy</Badge>`, `<Badge>Connected</Badge>`, `<Badge>Secure</Badge>` with real data from `/api/v1/system/health` (created in Task 4).

**Implementation:**
```ts
const [healthData, setHealthData] = useState(null)

// In fetchSystemStats, also call /api/v1/system/health
// Map the response:
// - API Health → healthData.apiResponseTime < 500 ? "Healthy" : "Degraded"
// - Database → healthData.databaseSync
// - Security → derive from systemHealth or a separate check
```

### Step 5.2: Replace "coming soon" tabs with real content or remove

Four "coming soon" tabs (lines 353-435):

| Tab | Line | Recommendation |
|-----|------|---------------|
| Users > User Statistics | 353-357 | **Implement**: Show real user role distribution chart (use Chart.js Bar) from `/api/v1/users` data already fetched |
| System > System Monitoring | 393-397 | **Implement**: Embed the System Health widget from main dashboard with auto-refresh |
| Security | 413-417 | **Implement**: Show recent audit logs from `/api/v1/audit` + failed login stats |
| Analytics | 431-435 | **Implement**: Show entity assessment completion rate, response fulfillment rate from existing APIs |

Each "coming soon" tab should:
1. Fetch relevant data using existing APIs where possible
2. Use Chart.js (already installed) for visualizations
3. If data is not available from existing APIs, show a simplified text-based summary instead of "coming soon"

### Step 5.3: Fix hardcoded systemHealth value

Line 74: `systemHealth: 'Good'` — derive from `/api/v1/system/health` response.

### Estimated effort: 3-4 hours

---

## Task 6: Donor Reports — Wire Up Real Report Generation

**Priority:** HIGH
**Files to modify:**
- `src/app/(auth)/donor/reports/page.tsx` (frontend)
- NEW: `src/app/api/v1/reports/generate/route.ts` (API)

### Step 6.1: Create report generation API

File: `src/app/api/v1/reports/generate/route.ts`

```ts
export const POST = withAuth(async (request: NextRequest, context) => {
  // Parse body: { format, includeCharts, includeTrends, includeGapAnalysis, dateRange, entityIds[] }
  // Query relevant data from DB:
  //   - Entities with their assessments, responses, commitments
  //   - Aggregate statistics
  //   - Gap analysis data
  // Generate report based on format:
  //   - CSV: Build CSV string from data
  //   - JSON: Return structured data
  //   - PDF: Use a PDF library (e.g., jspdf or puppeteer) or return JSON with PDF metadata
  // Return as downloadable file with appropriate Content-Type and Content-Disposition
})
```

**Implementation approach:**
- For CSV: Build manually using string concatenation, set `Content-Type: text/csv`
- For JSON: Return structured report data with `Content-Type: application/json`
- For Excel/PDF: Use libraries (`xlsx` for Excel, `jspdf` for PDF). If not installed, initially support CSV + JSON only and return a message for PDF.

### Step 6.2: Update frontend handleGenerateReport

File: `src/app/(auth)/donor/reports/page.tsx`, lines 89-123

Replace the mocked handler:
```ts
const handleGenerateReport = async () => {
  setIsGenerating(true)
  try {
    const response = await fetch('/api/v1/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        format: reportConfig.format,
        includeCharts: reportConfig.includeCharts,
        includeTrends: reportConfig.includeTrends,
        includeGapAnalysis: reportConfig.includeGapAnalysis,
        dateRange: reportConfig.dateRange,
        entityIds: reportConfig.entities.length > 0 
          ? reportConfig.entities 
          : entities.map(e => e.id)
      })
    })
    
    if (!response.ok) throw new Error('Report generation failed')
    
    // Handle file download from response
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `donor-report-${new Date().toISOString().split('T')[0]}.${reportConfig.format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to generate report:', error)
  } finally {
    setIsGenerating(false)
  }
}
```

### Estimated effort: 3-4 hours

---

## Task 7: Peer Comparison — Implement Chart.js Radar/Bar Charts

**Priority:** MEDIUM
**Files to modify:**
- `src/components/donor/PeerComparison.tsx`

### Step 7.1: Add Chart.js imports and registration

The data is already computed (`radarData` at line 196, `barData` at line 204). Chart.js + react-chartjs-2 are already installed.

Add imports at the top:
```ts
import {
  Chart as ChartJS,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);
```

### Step 7.2: Replace radar placeholder (lines 333-341)

```tsx
{currentChartType === 'radar' && radarData && (
  <Radar
    data={{
      labels: radarData.map(d => d.metric),
      datasets: [
        {
          label: 'You',
          data: radarData.map(d => d['You']),
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)',
          pointBackgroundColor: 'rgb(59, 130, 246)',
        },
        {
          label: 'Top 25%',
          data: radarData.map(d => d['Top 25%']),
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgb(16, 185, 129)',
          pointBackgroundColor: 'rgb(16, 185, 129)',
        },
        {
          label: 'Average',
          data: radarData.map(d => d['Average']),
          backgroundColor: 'rgba(156, 163, 175, 0.2)',
          borderColor: 'rgb(156, 163, 175)',
          pointBackgroundColor: 'rgb(156, 163, 175)',
        }
      ]
    }}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: { beginAtZero: true, max: 100 }
      }
    }}
  />
)}
```

### Step 7.3: Replace bar placeholder (lines 343-351)

```tsx
{currentChartType === 'bar' && barData && (
  <Bar
    data={{
      labels: barData.map(d => d.metric),
      datasets: [
        {
          label: 'Your Score',
          data: barData.map(d => d['Your Score']),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
        {
          label: 'Top 25%',
          data: barData.map(d => d['Top 25%']),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
        },
        {
          label: 'Average',
          data: barData.map(d => d['Average']),
          backgroundColor: 'rgba(156, 163, 175, 0.8)',
        }
      ]
    }}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true }
      }
    }}
  />
)}
```

### Step 7.4: Remove commented-out recharts imports (lines 10-25)

### Estimated effort: 1 hour

---

## Task 8: Report Builder — Install @dnd-kit and Remove Mock Hooks

**Priority:** MEDIUM
**Files to modify:**
- `src/components/reports/builder/ReportBuilder.tsx`

### Step 8.1: Install packages

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Step 8.2: Replace mock hooks with real @dnd-kit imports

File: `src/components/reports/builder/ReportBuilder.tsx`

1. Remove `// @ts-nocheck` directive (line 1)
2. Remove mock hook definitions (lines 22-36):
   ```ts
   // DELETE these:
   const useDrag = (config: any) => { ... };
   const useSensors = () => [];
   const useSensor = (sensor: any, config?: any) => sensor;
   const PointerSensor = () => {};
   const KeyboardSensor = () => {};
   const sortableKeyboardCoordinates = {};
   const useDrop = (config: any) => { ... };
   ```
3. Replace with real imports:
   ```ts
   import {
     DndContext,
     closestCenter,
     KeyboardSensor,
     PointerSensor,
     useSensor,
     useSensors,
     DragEndEvent
   } from '@dnd-kit/core';
   import {
     SortableContext,
     sortableKeyboardCoordinates,
     verticalListSortingStrategy,
     useSortable,
     arrayMove
   } from '@dnd-kit/sortable';
   import { CSS } from '@dnd-kit/utilities';
   ```
4. Uncomment the previously commented imports (lines 8-10)
5. Fix TypeScript errors revealed by removing `@ts-nocheck`:
   - The component uses these hooks internally, so each usage needs to be updated to match `@dnd-kit`'s API
   - `useDrag` → `useSortable` from `@dnd-kit/sortable`
   - `useDrop` → `DndContext` with `onDragEnd` handler
   - Wrap sortable items with `SortableContext`
   - Add `DragEndEvent` type for the handler

### Step 8.3: Wrap the canvas in DndContext

The report canvas area needs to be wrapped:
```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={elements.map(e => e.id)}
    strategy={verticalListSortingStrategy}
  >
    {/* existing canvas content */}
  </SortableContext>
</DndContext>
```

### Step 8.4: Create SortableElement wrapper component

```tsx
function SortableReportElement({ element, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: element.id
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
```

### Estimated effort: 2-3 hours

---

## Execution Order & Dependencies

```
Phase 1 (Independent, can be done in parallel):
  ├── Task 7: Peer Comparison Charts     (1h, no backend needed)
  ├── Task 2: Roles CRUD                 (2h, schema already exists)
  └── Task 8: Report Builder @dnd-kit    (2-3h, no backend needed)

Phase 2 (API routes needed first):
  ├── Task 4: System Health API          (2-3h)
  │   └── Then Task 5: Admin Dashboard   (3-4h, depends on Task 4)
  ├── Task 3: Verification Analytics API (2-3h)
  └── Task 6: Donor Reports API          (3-4h)

Phase 3 (Most complex, after Phase 2):
  └── Task 1: System Settings            (2-3h, needs schema migration)
```

## Total Estimated Effort: 17-23 hours

## Testing Checklist

After each task:
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)
- [ ] Page loads without console errors
- [ ] API returns real data (not mocked)
- [ ] Save/submit operations persist to database
- [ ] Error states display properly when API fails
