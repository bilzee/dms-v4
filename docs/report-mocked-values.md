# Mocked Values Audit Report

> Comprehensive audit of all UI pages/components using hardcoded or simulated data instead of real backend integration.
> Generated: 2026-05-19

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 3 | Entire page is fake data, no backend calls |
| HIGH | 4 | Major components use hardcoded/random data |
| MEDIUM | 3 | Partial mock (simulated delays, placeholder charts) |
| LOW | 1 | Minor hardcoded label |
| **Total** | **11** | **Files with mocked values** |

---

## CRITICAL Findings

### 1. Database Management Page - Entirely Mocked

**File:** `src/app/(auth)/system/database/page.tsx`
**Component:** `DatabaseManagementPage`

The entire page uses fake data. All operations (backup, restore, optimize, query) simulate success with `setTimeout` and do nothing. Real API calls are commented out.

**Mocked values:**

| Line(s) | What | Mocked Value |
|---------|------|-------------|
| 71-80 | Database stats | `totalSize: '2.4 GB'`, `tablesCount: 15`, `recordsCount: 125432`, `lastBackup: '2 hours ago'`, `backupStatus: 'success'`, `optimizationStatus: 'good'`, `indexesCount: 28`, `activeConnections: 12` |
| 82-115 | Backup history (4 records) | Hardcoded array with fake timestamps (`'2025-01-05 14:00:00'`), sizes (`'245 MB'`), types, statuses |
| 117-124 | Table info (6 tables) | Hardcoded array: `users` (125 records), `assessments` (342), `incidents` (89), `entities` (456), `responses` (1234), `audit_logs` (125432) |
| 126-143 | `handleCreateBackup()` | `setTimeout` simulation, real API call commented out |
| 145-162 | `handleRestoreBackup()` | `setTimeout` simulation, real API call commented out |
| 164-197 | `executeQuery()` | Returns hardcoded `[{id:1, name:'John Doe', email:'john@example.com'}, {id:2, name:'Jane Smith', email:'jane@example.com'}]` |
| 200-214 | `handleOptimizeDatabase()` | `setTimeout` simulation, real API call commented out |
| 317-319 | Database Status badge | Hardcoded `"Healthy"` |
| 323-324 | Last Optimization | Hardcoded `"3 days ago"` |
| 327-328 | Query Performance | Hardcoded `"Good"` |
| 332-335 | Storage Usage | Hardcoded `Progress value={75}` and `"75%"` |
| 617-637 | Automated task schedules | Hardcoded `"Daily"`, `"Hourly"`, `"Weekly"` |

**Backend needed:** `/api/v1/admin/database/stats`, `/api/v1/admin/database/backups`, `/api/v1/admin/database/tables`, `/api/v1/admin/database/backup` (POST), `/api/v1/admin/database/restore` (POST), `/api/v1/admin/database/optimize` (POST), `/api/v1/admin/database/query` (POST)

---

### 2. System Settings Page - All Hardcoded, Save Does Nothing

**File:** `src/app/(auth)/system/settings/page.tsx`
**Component:** `SystemSettingsPage`

All settings values are initialized from hardcoded defaults. The `handleSave()` function uses `setTimeout` to fake a save, with the real API call commented out.

**Mocked values:**

| Line(s) | What | Mocked Value |
|---------|------|-------------|
| 62-91 | All default settings | `siteName: 'Disaster Management System'`, `adminEmail: 'admin@dms.gov.ng'`, `timezone: 'Africa/Lagos'`, `passwordMinLength: 8`, `sessionTimeout: 30`, `maxLoginAttempts: 5`, `twoFactorEnabled: false`, etc. |
| 96-131 | `handleSave()` | `await new Promise(resolve => setTimeout(resolve, 1000))` with real API commented out |
| 499-511 | Backup status section | Hardcoded `"2 hours ago"`, `"Successful"`, `"245 MB"` |

**Backend needed:** `GET/PUT /api/v1/admin/settings`

---

### 3. Report Builder - Entirely Disabled

**File:** `src/components/reports/builder/ReportBuilder.tsx`
**Component:** `ReportBuilder`

The entire component is wrapped in `@ts-nocheck` and uses mock drag-and-drop hooks because the `@dnd-kit` packages are not installed.

**Mocked values:**

| Line(s) | What | Mocked Value |
|---------|------|-------------|
| 1 | File header | `@ts-nocheck` directive |
| 1-36 | Mock DnD hooks | `const useDrag = (config: any) => { ... return [result, () => {}] }` -- fake drag/drop behavior |

**Fix needed:** Install `@dnd-kit/core` and `@dnd-kit/sortable` packages, remove mock hooks, implement real drag-and-drop.

---

## HIGH Severity Findings

### 4. Roles Page - Form Submit Does Nothing

**File:** `src/app/(auth)/roles/page.tsx`
**Component:** `RoleForm` (nested in `RolesPage`)

**Mocked values:**

| Line(s) | What | Mocked Value |
|---------|------|-------------|
| 345-377 | `handleSubmit()` | Real API call to `/api/v1/roles` entirely commented out, replaced with `await new Promise(resolve => setTimeout(resolve, 1000))` |
| 266-269 | Delete handler | Empty: `if (confirm('Are you sure...')) { // Handle delete }` -- no implementation |

**Backend needed:** `POST/PUT /api/v1/roles`, `DELETE /api/v1/roles/:id`

---

### 5. Verification Analytics - Random Mock Data for Charts and KPIs

**File:** `src/components/verification/VerificationAnalytics.tsx`
**Component:** `VerificationAnalytics`

**Mocked values:**

| Line(s) | What | Mocked Value |
|---------|------|-------------|
| 64-71 | Performance metrics | `totalProcessed: Math.floor(Math.random() * 100) + 50`, `throughput: Math.floor(Math.random() * 10) + 5` |
| 93-102 | Time series chart data | `Array.from({ length: hours }, (_, i) => ({ assessments: Math.floor(Math.random() * 20) + 5, deliveries: Math.floor(Math.random() * 15) + 3, verified: Math.floor(Math.random() * 25) + 10 }))` |
| 607 | System Load badge | Hardcoded `"Moderate"` |

**Backend needed:** `GET /api/v1/verification/analytics` returning real processed counts, throughput metrics, and time-series data.

---

### 6. Main Dashboard - System Health Widget Entirely Hardcoded

**File:** `src/app/(auth)/dashboard/page.tsx`
**Component:** Main shared dashboard page

**Mocked values:**

| Line(s) | What | Mocked Value |
|---------|------|-------------|
| 238 | Database Sync | `<span className="text-sm text-green-600">Healthy</span>` |
| 241 | API Response Time | `<span className="text-sm font-medium">142ms</span>` |
| 244 | Active Users | `<span className="text-sm font-medium">24</span>` |
| 247 | Storage Usage | `<span className="text-sm font-medium">67%</span>` |
| 250 | Last Backup | `<span className="text-sm font-medium">2 hours ago</span>` |

**Backend needed:** `GET /api/v1/system/health` returning real database sync status, API latency, active user count, storage usage, and actual last backup time.

---

### 7. Donor Reports Page - Mock Report Generation

**File:** `src/app/(auth)/donor/reports/page.tsx`
**Component:** `DonorReportsPage`

**Mocked values:**

| Line(s) | What | Mocked Value |
|---------|------|-------------|
| 89-123 | `handleGenerateReport()` | `await new Promise(resolve => setTimeout(resolve, 2000))` then creates a JSON blob download, not a real PDF/CSV/Excel file |

**Backend needed:** `POST /api/v1/reports/generate` should return actual PDF/CSV/Excel file.

---

## MEDIUM Severity Findings

### 8. Admin Dashboard - Hardcoded Status Badges

**File:** `src/app/(auth)/admin/dashboard/page.tsx`
**Component:** `AdminDashboard`

**Mocked values:**

| Line(s) | What | Mocked Value |
|---------|------|-------------|
| 74 | `systemHealth` | Hardcoded `'Good'` string |
| 96-99 | `fetchRecentActivity()` | Returns empty array `[]` with comment "we don't have audit logs API yet" |
| 258-279 | Status badges | Hardcoded `<Badge>Healthy</Badge>`, `<Badge>Connected</Badge>`, `<Badge>Secure</Badge>` |
| 353-357 | User analytics | `"Detailed user analytics coming soon"` |
| 393-397 | System monitoring | `"System monitoring dashboard coming soon"` |
| 413-417 | Security monitoring | `"Security monitoring dashboard coming soon"` |
| 431-435 | Advanced analytics | `"Advanced analytics dashboard coming soon"` |

---

### 9. Donor Assessment Export - Simulated Download

**File:** `src/components/donor/AssessmentExport.tsx`
**Component:** `AssessmentExport`

**Mocked values:**

| Line(s) | What | Mocked Value |
|---------|------|-------------|
| 112-121 | Download handler | `setTimeout(() => { setExportStatus({ status: 'ready', ... }) }, 2000)` -- fake 2-second delay instead of using actual API response |

The API call at line 96 (`POST /api/v1/donors/entities/${entityId}/reports/export`) appears wired up, but response handling uses a fake delay.

---

### 10. Peer Comparison Charts - Placeholder

**File:** `src/components/donor/PeerComparison.tsx`
**Component:** `PeerComparison`

**Mocked values:**

| Line(s) | What | Mocked Value |
|---------|------|-------------|
| 333-341 | Radar chart | Placeholder text: `"Radar Chart Placeholder"` + `"TODO: Implement with Chart.js"` |
| 343-351 | Bar chart | Placeholder text: `"Bar Chart Placeholder"` + `"TODO: Implement with Chart.js"` |

The data is already computed -- only the Chart.js rendering is missing. Pattern exists in `DonorPerformanceDashboard.tsx`.

---

## LOW Severity Findings

### 11. Database Management - Hardcoded Task Schedules

**File:** `src/app/(auth)/system/database/page.tsx` (Maintenance tab)

| Line(s) | What | Mocked Value |
|---------|------|-------------|
| 617-637 | Automated task schedules | Hardcoded `"Daily"` (Log Cleanup), `"Hourly"` (Backup), `"Weekly"` (Optimization) |

---

## Pages Confirmed Connected to Real APIs (No Mocked Data)

The following pages were audited and found to be properly connected to backend APIs:

- `/assessor/dashboard` - uses real API
- `/assessor/preliminary-assessment` - uses real API
- `/assessor/rapid-assessments` - uses real API
- `/coordinator/dashboard` - uses real API
- `/coordinator/verification` - uses real API
- `/coordinator/verification/deliveries` - uses real API
- `/coordinator/situation-dashboard` - uses real API
- `/coordinator/incidents` - uses real API
- `/coordinator/entity-management` - uses real API
- `/coordinator/entities` - uses real API
- `/donor/dashboard` - uses real API
- `/donor/analytics` - uses real API
- `/donor/leaderboard` - uses real API
- `/donor/performance` - uses real API
- `/donor/profile` - uses real API
- `/donor/entities` - uses real API
- `/donor/entities/[id]` - uses real API
- `/donor/responses` - uses real API
- `/donor/rapid-assessments` - uses real API
- `/responder/dashboard` - uses real API
- `/responder/responses` - uses real API
- `/responder/planning` - uses real API
- `/admin/users` - uses real API
- `/admin/donors` - uses real API
- `/admin/donors/[id]` - uses real API
- `/admin/donors/[id]/edit` - uses real API
- `/admin/donors/register` - uses real API
- `/admin/donors/metrics` - uses real API
- `/system/audit` - uses real API
- `/verification/metrics` - uses real API
- `/login` - uses real API
- `/register` - uses real API
- `/profile` - uses real API

---

## Prioritized Remediation

1. **System/Database page** -- Create real backend endpoints for database stats, backup management, table listing, and query execution
2. **System/Settings page** -- Create `/api/v1/admin/settings` endpoint, fetch on mount, wire up save
3. **Roles page** -- Uncomment existing role CRUD code in `handleSubmit`, implement delete handler
4. **Verification Analytics** -- Replace `Math.random()` with real analytics endpoint
5. **Main Dashboard System Health** -- Create `/api/v1/system/health` endpoint
6. **Admin Dashboard** -- Remove hardcoded badges, implement or remove "coming soon" tabs
7. **Donor Reports** -- Wire up real report generation endpoint
8. **Peer Comparison** -- Implement Chart.js radar/bar renderings
9. **Report Builder** -- Install `@dnd-kit` packages and remove mock hooks
