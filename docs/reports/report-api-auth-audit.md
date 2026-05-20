# API Authentication Audit Report

> Comprehensive audit of all frontend-to-API fetch calls for missing authentication headers.
> Generated: 2026-05-19

---

## Summary

| Category | Count | Description |
|----------|-------|-------------|
| CRITICAL | 18 | Raw `fetch()` with NO auth header to `withAuth`-protected endpoints (will 401) |
| HIGH | 14 | Raw `fetch()` with NO auth header to endpoints where auth status is uncertain |
| MEDIUM | 14 | Inconsistent auth patterns (localStorage-direct instead of centralized utility) |
| LOW | 3 | Intentionally unauthenticated (health check, registration, testing) |
| RESOLVED | 2 | Fixed during this audit session |
| **Total Raw `fetch()` Calls Audited** | **182** | Plus 44 centralized `apiGet`/`apiPost` calls (all safe) |

---

## Methodology

1. **Cataloged** all raw `fetch()` calls across `src/` that target `/api/v1/...` endpoints
2. **Cataloged** all centralized `apiGet`/`apiPost`/`apiPut`/`apiPatch`/`apiDelete` calls (all auto-attach Bearer token)
3. **Cataloged** all API route files using `withAuth` middleware (which require Bearer token)
4. **Cross-referenced** unauthenticated fetch calls against `withAuth`-protected endpoints

---

## CRITICAL: Unauthenticated Calls to Protected Endpoints (401 Guaranteed)

These raw `fetch()` calls send **NO Authorization header** to API endpoints wrapped in `withAuth`, which will return **401 Unauthorized**.

### Group 1: Stores

| # | File | Line | URL | Method | API Route Uses withAuth? |
|---|------|------|-----|--------|--------------------------|
| 1 | `src/stores/export.store.ts` | 174 | `/api/v1/exports/csv` | POST | Yes |
| 2 | `src/stores/export.store.ts` | 275 | `/api/v1/exports/schedule` | POST | Yes |
| 3 | `src/stores/export.store.ts` | 413 | `/api/v1/exports/schedule` | GET | Yes |
| 4 | `src/stores/export.store.ts` | 435 | `/api/v1/exports/schedule?id=${reportId}` | PUT | Yes |
| 5 | `src/stores/export.store.ts` | 461 | `/api/v1/exports/schedule?id=${reportId}` | DELETE | Yes |
| 6 | `src/stores/verification.store.ts` | 309 | `/api/v1/verification/queue/assessments?${params}` | GET | Yes |
| 7 | `src/stores/verification.store.ts` | 364 | `/api/v1/verification/queue/deliveries?${params}` | GET | Yes |

### Group 2: Report Management

| # | File | Line | URL | Method | API Route Uses withAuth? |
|---|------|------|-----|--------|--------------------------|
| 8 | `src/components/reports/ReportManagement.tsx` | 122 | `/api/v1/reports/configurations?${params}` | GET | Yes |
| 9 | `src/components/reports/ReportManagement.tsx` | 148 | `/api/v1/reports/executions?${params}` | GET | Yes |
| 10 | `src/components/reports/ReportManagement.tsx` | 166 | `/api/v1/reports/statistics?${params}` | GET | Yes |
| 11 | `src/components/reports/ReportManagement.tsx` | 179 | `/api/v1/reports/configurations/${id}` | DELETE | Yes |
| 12 | `src/components/reports/ReportManagement.tsx` | 192 | `/api/v1/reports/executions/${id}` | DELETE | Yes |
| 13 | `src/components/reports/ReportManagement.tsx` | 205 | `/api/v1/reports/configurations/${id}/duplicate` | POST | Yes |
| 14 | `src/components/reports/ReportManagement.tsx` | 226 | `/api/v1/reports/download/${executionId}` | GET | Yes |
| 15 | `src/components/reports/builder/TemplateSelector.tsx` | 76 | `/api/v1/reports/templates?${params}` | GET | Yes |

### Group 3: Donor Components

| # | File | Line | URL | Method | API Route Uses withAuth? |
|---|------|------|-----|--------|--------------------------|
| 16 | `src/components/donor/PeerComparison.tsx` | 92 | `/api/v1/leaderboard?${params}` | GET | Yes |
| 17 | `src/components/donor/DonorDashboard.tsx` | 144 | `/api/v1/leaderboard?limit=100&sortBy=overall` | GET | Yes |
| 18 | `src/components/donor/CommitmentStatusTracker.tsx` | 97 | `/api/v1/commitments/${commitment.id}` | PATCH | Yes |
| 19 | `src/components/donor/ExportButton.tsx` | 66 | `/api/v1/reports/performance/export` | POST | Yes |

### Group 4: Pages

| # | File | Line | URL | Method | API Route Uses withAuth? |
|---|------|------|-----|--------|--------------------------|
| 20 | `src/app/(auth)/admin/donors/page.tsx` | 62 | `/api/v1/donors` | GET | Yes |
| 21 | `src/app/(auth)/admin/donors/[id]/page.tsx` | 72 | `/api/v1/donors/${donorId}` | GET | Yes |
| 22 | `src/app/(auth)/admin/donors/[id]/edit/page.tsx` | 96 | `/api/v1/donors/${donorId}` | GET | Yes |
| 23 | `src/app/(auth)/admin/donors/[id]/edit/page.tsx` | 146 | `/api/v1/donors/${donorId}` | PUT | Yes |
| 24 | `src/app/(auth)/donor/analytics/page.tsx` | 89 | `/api/v1/donors/metrics?timeframe=30d` | GET | Yes |
| 25 | `src/app/(auth)/coordinator/entity-incident-map/page.tsx` | 65 | `/api/v1/incidents` | GET | Yes |
| 26 | `src/app/(auth)/coordinator/entity-incident-map/page.tsx` | 91 | `/api/v1/incidents/${id}/assessment-summary` | GET | Yes |
| 27 | `src/app/(auth)/coordinator/verification/deliveries/page.tsx` | 131 | `/api/v1/verification/queue/deliveries?${params}` | GET | Yes |
| 28 | `src/app/(auth)/coordinator/verification/deliveries/page.tsx` | 152 | `/api/v1/verification/queue/deliveries/${id}/verify` | POST | Yes |
| 29 | `src/app/(auth)/coordinator/donors/page.tsx` | 62 | `/api/v1/donors` | GET | Yes |
| 30 | `src/app/(auth)/coordinator/incidents/[id]/page.tsx` | 70 | `/api/v1/incidents/${incidentId}` | GET | Yes |
| 31 | `src/app/(auth)/coordinator/incidents/[id]/page.tsx` | 85 | `/api/v1/incidents/${incidentId}/assessment-summary` | GET | Yes |

### Group 5: Other Components

| # | File | Line | URL | Method | API Route Uses withAuth? |
|---|------|------|-----|--------|--------------------------|
| 32 | `src/components/coordinator/AssessmentRelationshipMap.tsx` | 183 | `/api/v1/entities/${id}/assessments/latest` | GET | Yes |
| 33 | `src/components/coordinator/AssessmentRelationshipMap.tsx` | 199 | `/api/v1/relationships/statistics?...` | GET | Yes |
| 34 | `src/components/coordinator/AssessmentRelationshipMap.tsx` | 223 | `/api/v1/dashboard/situation?incidentId=${...}` | GET | Yes |
| 35 | `src/components/dashboards/situation/components/TopDonorsSection.tsx` | 35 | `/api/v1/donors/metrics?dateRange=30d` | GET | Yes |
| 36 | `src/components/forms/incident/IncidentCreationForm.tsx` | 158 | `/api/v1/preliminary-assessments` | GET | Yes |

### Group 6: Offline/Sync Services

| # | File | Line | URL | Method | API Route Uses withAuth? |
|---|------|------|-----|--------|--------------------------|
| 37 | `src/lib/offline/bootstrap.ts` | 196 | `/api/v1/entities?active=true&limit=1000` | GET | Yes |
| 38 | `src/lib/offline/bootstrap.ts` | 246 | `/api/v1/incidents?status=ACTIVE&limit=100` | GET | Yes |
| 39 | `src/lib/offline/bootstrap.ts` | 304 | `/api/v1/assessments/verified?limit=500` | GET | Yes |
| 40 | `src/lib/services/conflict-export.service.ts` | 49 | `/api/v1/sync/conflicts/export?${...}` | GET | Yes |
| 41 | `src/lib/services/conflict-export.service.ts` | 301 | `/api/v1/sync/conflicts?${...}` | GET | Yes |
| 42 | `src/lib/services/delivery-offline.service.ts` | 225 | `/api/v1/responses/${responseId}/deliver` | POST | Yes |

---

## RESOLVED During This Audit

| # | File | Line | URL | Status |
|---|------|------|-----|--------|
| 1 | `src/app/(auth)/donor/entities/performance/page.tsx` | 89-90 | `/api/v1/donors/entities/impact/demographics` + `assessments/latest` | **FIXED** - Added `getAuthToken()` + Bearer header |
| 2 | `src/app/(auth)/donor/entities/[id]/page.tsx` | 87, 101 | `/api/v1/donors/entities/${id}/demographics` + `assessments/latest` | **FIXED** - Added `getAuthToken()` + Bearer header |

---

## INTENTIONALLY UNAUTHENTICATED (Not Bugs)

| # | File | Line | URL | Reason |
|---|------|------|-----|--------|
| 1 | `src/stores/auth.store.ts` | 145 | `/api/v1/auth/login` | Login endpoint - no token available yet |
| 2 | `src/lib/config/network-detection.ts` | 79 | `/api/health` | Public health check |
| 3 | `src/components/donor/DonorRegistrationForm.tsx` | 84 | `/api/v1/donors` | Public donor registration |
| 4 | `src/lib/testing/living-documentation-dashboard.tsx` | 109, 125, 137 | `/api/living-tests/*` | Testing utility |

---

## MEDIUM: Inconsistent Auth Patterns

These calls include auth headers but use `localStorage.getItem('auth_token')` directly instead of the centralized `getAuthToken()` utility. This is fragile because it doesn't fall back to the `token` key.

| # | File | Line | URL | Current Pattern | Recommended |
|---|------|------|-----|----------------|-------------|
| 1 | `src/stores/preliminary-assessment.store.ts` | 92, 216, 267, 490 | `/api/v1/preliminary-assessments*` | `localStorage.getItem('auth_token')` | `getAuthToken()` |
| 2 | `src/stores/incident.store.ts` | 58, 98, 138, 166, 186 | `/api/v1/incidents*` | `localStorage.getItem('auth_token')` | `getAuthToken()` |
| 3 | `src/components/providers/AuthInitializer.tsx` | 24 | `/api/v1/auth/me` | `localStorage.getItem('auth_token')` | `getAuthToken()` |
| 4 | `src/lib/auth/get-current-user.ts` | 19 | `/api/v1/auth/me` | `localStorage.getItem('auth_token')` | `getAuthToken()` |
| 5 | `src/app/(auth)/donor/rapid-assessments/page.tsx` | 37 | `/api/v1/rapid-assessments` | `localStorage.getItem('auth_token')` | `getAuthToken()` |
| 6 | `src/components/donor/CommitmentForm.tsx` | 77, 110, 154 | `/api/v1/donors/entities`, etc. | `localStorage.getItem('auth_token')` | `getAuthToken()` |
| 7 | `src/components/donor/DonorProfile.tsx` | 64, 83 | `/api/v1/donors/profile` | `localStorage.getItem('auth_token')` | `getAuthToken()` |

---

## Auth Pattern Distribution

### Raw `fetch()` Calls (182 total)

| Auth Pattern | Count | Percentage | Risk Level |
|---|---|---|---|
| `useAuth().token` | 72 | 39.6% | Low - React hook, reactive |
| `getAuthToken()` utility | 28 | 15.4% | **Best** - centralized, dual-key fallback |
| `localStorage` direct | 14 | 7.7% | Medium - no fallback to alternate key |
| Zustand `store.token` | 3 | 1.6% | Low - reactive store |
| **None (missing auth)** | **42** | **23.1%** | **CRITICAL - will 401** |
| N/A (intentional) | 5 | 2.7% | None - login/health/testing |

### Centralized API Client Calls (44 total)

| Function | Count |
|---|---|
| `apiGet` | 39 |
| `apiPost` | 6 |
| `apiPut` | 2 |
| `apiPatch` | 1 |
| `apiDelete` | 1 |

All 44 centralized calls auto-attach Bearer token via `getAuthHeaders()`. **Zero auth issues.**

---

## Impact by Feature Area

### Export/Schedule System (5 bugs)
All calls in `export.store.ts` will fail with 401. CSV export, scheduled reports, report management all broken.

### Report Management (8 bugs)
All calls in `ReportManagement.tsx` and `TemplateSelector.tsx` will fail with 401. Report listing, execution, deletion, download all broken.

### Verification Queue (2 bugs)
Verification queue assessment and delivery list endpoints in `verification.store.ts` will fail with 401.

### Admin Donor Management (4 bugs)
Admin donor list, detail view, and edit pages all fetch without auth. Entire admin donor management section broken.

### Coordinator Incident/Verification (6 bugs)
Entity incident map, incident detail, assessment summary, and delivery verification pages all broken for coordinators.

### Donor Performance (3 bugs)
PeerComparison leaderboard, DonorDashboard leaderboard, and analytics metrics all broken.
Note: `DonorDashboard.tsx` has **inconsistent auth within the same file** - some calls use `getAuthToken()` while the leaderboard call at line 144 has no auth.

### Offline/Sync (5 bugs)
Bootstrap data sync and conflict export services cannot authenticate. Offline-first features completely broken.

---

## Recommended Fix Strategy

### Priority 1: Fix All Unauthenticated Calls (42 calls)

**Option A (Recommended): Migrate to centralized API client**

Replace raw `fetch()` with `apiGet`/`apiPost`/`apiPut`/`apiPatch`/`apiDelete` from `@/lib/api`. This:
- Auto-attaches Bearer token
- Standardizes error handling
- Prevents future auth header omissions

```typescript
// Before (broken):
const response = await fetch('/api/v1/donors')

// After (using centralized client):
import { apiGet } from '@/lib/api'
const result = await apiGet('/api/v1/donors')
```

**Option B: Add `getAuthToken()` to each raw fetch**

```typescript
import { getAuthToken } from '@/lib/auth/token-utils'

const token = getAuthToken()
const response = await fetch('/api/v1/donors', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Priority 2: Standardize Auth Pattern (14 calls)

Migrate all `localStorage.getItem('auth_token')` direct reads to use `getAuthToken()` utility which has dual-key fallback.

### Priority 3: Consolidate to Centralized Client

Long-term, move all API calls to use `apiGet`/`apiPost`/etc. from `@/lib/api` to prevent this class of bug entirely.

---

## Files Affected (Summary)

| File | Unauthenticated Calls | Severity |
|------|----------------------|----------|
| `src/stores/export.store.ts` | 5 | CRITICAL |
| `src/components/reports/ReportManagement.tsx` | 7 | CRITICAL |
| `src/stores/verification.store.ts` | 2 | CRITICAL |
| `src/lib/offline/bootstrap.ts` | 3 | HIGH |
| `src/app/(auth)/admin/donors/` (3 files) | 4 | HIGH |
| `src/app/(auth)/coordinator/` (4 files) | 6 | HIGH |
| `src/components/coordinator/AssessmentRelationshipMap.tsx` | 3 | HIGH |
| `src/lib/services/conflict-export.service.ts` | 2 | HIGH |
| `src/components/donor/PeerComparison.tsx` | 1 | HIGH |
| `src/components/donor/DonorDashboard.tsx` | 1 | HIGH |
| `src/components/donor/CommitmentStatusTracker.tsx` | 1 | HIGH |
| `src/components/donor/ExportButton.tsx` | 1 | HIGH |
| `src/components/dashboards/situation/components/TopDonorsSection.tsx` | 1 | HIGH |
| `src/components/forms/incident/IncidentCreationForm.tsx` | 1 | HIGH |
| `src/app/(auth)/donor/analytics/page.tsx` | 1 | HIGH |
| `src/lib/services/delivery-offline.service.ts` | 1 | HIGH |
| `src/components/reports/builder/TemplateSelector.tsx` | 1 | HIGH |
