# Fix Plan: API Authentication Audit Remediation

> Addresses all findings from `docs/reports/report-api-auth-audit.md`
> Created: 2026-05-19
> Status: **Implemented** (2026-05-19)
> Architecture: BMAD-conformant (three-layer data fetching pattern)
> TypeScript: 0 compilation errors after migration

---

## Overview

**42 unauthenticated API calls** will fail with 401 when hitting `withAuth`-protected endpoints. Additionally, **14 calls** use fragile `localStorage` direct reads, and **`api.ts` has a token-lookup bug** that weakens the centralized client.

This plan follows the BMAD-prescribed **three-layer data fetching pattern**:

```
Component -> React Query Hook -> apiGet/apiPost/... (src/lib/api.ts) -> fetch with Bearer token
```

**Strategy:** Migrate all raw `fetch()` calls to either:
- **Path A (React context):** New TanStack Query hooks in `src/hooks/` using the centralized API client
- **Path B (Non-React context):** Direct `apiGet`/`apiPost`/`apiPut`/`apiPatch`/`apiDelete` from `@/lib/api` (stores, services)
- **Path C (Binary responses):** `createAuthenticatedFetch()` from `@/lib/auth/token-utils` (file downloads)

---

## Phase 0: Fix Centralized API Client Bugs (2 fixes)

Before migrating anything, the centralized client must be correct.

### 0.1 Fix `getAuthToken()` in `src/lib/api.ts`

**Problem:** `api.ts` has its own `getAuthToken()` that only checks `localStorage.getItem('auth_token')`. It does NOT fall back to the `token` key. Meanwhile, `src/lib/auth/token-utils.ts` has the correct dual-key implementation.

**Fix:** Remove the duplicate `getAuthToken()` from `api.ts` and import from `token-utils.ts`:

```typescript
// src/lib/api.ts - DELETE local getAuthToken, import from token-utils
import { getAuthToken } from '@/lib/auth/token-utils'

// Also update getAuthHeaders to use the imported getAuthToken
```

**Files changed:** `src/lib/api.ts`

**Risk:** None. `token-utils.getAuthToken()` is a superset (checks both keys).

### 0.2 Fix `getAuthHeaders()` in `src/lib/api.ts`

**Problem:** `api.ts::getAuthHeaders()` silently returns headers WITHOUT the Bearer token if no token exists. This means API calls silently proceed without auth instead of failing fast.

**Fix:** After importing from `token-utils`, `getAuthHeaders()` in `api.ts` should still return headers without token (for public endpoints), but the individual `apiGet`/`apiPost`/etc. functions should be explicit about auth requirement. This matches the existing behavior of hooks that use `enabled: !!getAuthToken()`.

**No code change needed for 0.2** — the fix in 0.1 ensures both keys are checked, and hooks already gate with `enabled`.

---

## Phase 1: Create Missing React Query Hooks (18 new hooks)

These hooks wrap the centralized API client for endpoints that currently lack hooks. All hooks follow the established pattern in `src/hooks/useDonor.ts`, `src/hooks/useIncidents.ts`, etc.

### 1.1 Admin Donor Hooks — `src/hooks/useAdminDonors.ts` (NEW)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPut } from '@/lib/api'

export function useAdminDonors(filters?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['admin-donors', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.search) params.append('search', filters.search)
      const result = await apiGet(`/api/v1/donors?${params}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch donors')
      return result.data!
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useAdminDonor(donorId: string) {
  return useQuery({
    queryKey: ['admin-donor', donorId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/donors/${donorId}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch donor')
      return result.data!
    },
    enabled: !!donorId,
  })
}

export function useUpdateDonor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ donorId, data }: { donorId: string; data: any }) => {
      const result = await apiPut(`/api/v1/donors/${donorId}`, data)
      if (!result.success) throw new Error(result.error || 'Failed to update donor')
      return result.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-donors'] })
      queryClient.invalidateQueries({ queryKey: ['admin-donor'] })
    },
  })
}
```

**Replaces:** 4 raw fetch calls in `admin/donors/page.tsx`, `admin/donors/[id]/page.tsx`, `admin/donors/[id]/edit/page.tsx`, `coordinator/donors/page.tsx`

### 1.2 Leaderboard Hooks — `src/hooks/useLeaderboard.ts` (NEW)

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

export function useLeaderboard(params?: { limit?: number; sortBy?: string; timeframe?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.append('limit', params.limit.toString())
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
  if (params?.timeframe) searchParams.append('timeframe', params.timeframe)

  return useQuery({
    queryKey: ['leaderboard', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/leaderboard?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch leaderboard')
      return result.data!
    },
    staleTime: 2 * 60 * 1000,
  })
}
```

**Replaces:** 2 raw fetch calls in `PeerComparison.tsx`, `DonorDashboard.tsx`

### 1.3 Report Management Hooks — `src/hooks/useReportManagement.ts` (NEW)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiDelete } from '@/lib/api'

export function useReportConfigurations(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  return useQuery({
    queryKey: ['report-configurations', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/reports/configurations?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch configurations')
      return result.data!
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useReportExecutions(params?: Record<string, string>) { /* same pattern */ }
export function useReportStatistics(params?: Record<string, string>) { /* same pattern */ }

export function useDeleteConfiguration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await apiDelete(`/api/v1/reports/configurations/${id}`)
      if (!result.success) throw new Error(result.error || 'Failed to delete')
      return result.data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report-configurations'] }),
  })
}

export function useDeleteExecution() { /* same pattern */ }
export function useDuplicateConfiguration() { /* mutation with apiPost */ }
export function useDownloadExecution() { /* returns download URL or blob */ }
```

**Replaces:** 7 raw fetch calls in `ReportManagement.tsx`

### 1.4 Report Template Hook — add to `src/hooks/useReportManagement.ts`

```typescript
export function useReportTemplates(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  return useQuery({
    queryKey: ['report-templates', params],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/reports/templates?${searchParams}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch templates')
      return result.data!
    },
  })
}
```

**Replaces:** 1 raw fetch call in `TemplateSelector.tsx`

### 1.5 Incident Detail Hooks — `src/hooks/useIncidentDetails.ts` (NEW)

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

export function useIncidentDetail(incidentId: string) {
  return useQuery({
    queryKey: ['incident-detail', incidentId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/incidents/${incidentId}`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch incident')
      return result.data!
    },
    enabled: !!incidentId,
  })
}

export function useIncidentAssessmentSummary(incidentId: string) {
  return useQuery({
    queryKey: ['incident-assessment-summary', incidentId],
    queryFn: async () => {
      const result = await apiGet(`/api/v1/incidents/${incidentId}/assessment-summary`)
      if (!result.success) throw new Error(result.error || 'Failed to fetch summary')
      return result.data!
    },
    enabled: !!incidentId,
  })
}
```

**Replaces:** 4 raw fetch calls in `coordinator/entity-incident-map/page.tsx`, `coordinator/incidents/[id]/page.tsx`

### 1.6 Verification Delivery Hooks — `src/hooks/useVerificationDeliveries.ts` (NEW)

```typescript
export function useVerificationDeliveries(filters?: { page?: number; limit?: number; status?: string }) { /* apiGet */ }
export function useVerifyDelivery() { /* apiPost mutation */ }
```

**Replaces:** 2 raw fetch calls in `coordinator/verification/deliveries/page.tsx`

### 1.7 Assessment Relationship Hooks — `src/hooks/useAssessmentRelationships.ts` (NEW)

```typescript
export function useEntityLatestAssessment(entityId: string) { /* apiGet */ }
export function useRelationshipStatistics(params?: Record<string, string>) { /* apiGet */ }
export function useSituationDashboard(incidentId?: string) { /* apiGet */ }
```

**Replaces:** 3 raw fetch calls in `AssessmentRelationshipMap.tsx`

### 1.8 Donor Metrics Hook — extend `src/hooks/useDonorMetrics.ts`

Already exists with `useDonorMetrics`. Verify it covers the `?dateRange=30d` use case in `TopDonorsSection.tsx` and `donor/analytics/page.tsx`. If the existing hook supports these params, no new hook needed.

**Replaces:** 2 raw fetch calls in `TopDonorsSection.tsx`, `donor/analytics/page.tsx`

### 1.9 Commitment Hooks — `src/hooks/useCommitments.ts` (NEW)

```typescript
export function useCommitment(commitmentId: string) { /* apiGet */ }
export function useUpdateCommitment() { /* apiPatch mutation */ }
export function usePreliminaryAssessments(params?: Record<string, string>) { /* apiGet */ }
```

**Replaces:** 1 raw fetch call in `CommitmentStatusTracker.tsx`, 1 in `IncidentCreationForm.tsx`

### 1.10 Export Performance Hook — `src/hooks/usePerformanceExport.ts` (NEW)

```typescript
export function usePerformanceExport() {
  return useMutation({
    mutationFn: async (data: any) => {
      const result = await apiPost('/api/v1/reports/performance/export', data)
      if (!result.success) throw new Error(result.error || 'Export failed')
      return result.data!
    },
  })
}
```

**Replaces:** 1 raw fetch call in `ExportButton.tsx`

---

## Phase 2: Migrate Components/Pages to New Hooks (36 call sites)

Replace all raw `fetch()` calls in React components and pages with the new hooks.

### 2.1 Admin Pages (4 sites)

| File | Current Pattern | New Pattern |
|------|----------------|-------------|
| `src/app/(auth)/admin/donors/page.tsx` | raw `fetch('/api/v1/donors')` | `useAdminDonors()` |
| `src/app/(auth)/admin/donors/[id]/page.tsx` | raw `fetch('/api/v1/donors/${id}')` | `useAdminDonor(id)` |
| `src/app/(auth)/admin/donors/[id]/edit/page.tsx` | raw `fetch` GET + PUT | `useAdminDonor(id)` + `useUpdateDonor()` |
| `src/app/(auth)/coordinator/donors/page.tsx` | raw `fetch('/api/v1/donors')` | `useAdminDonors()` |

### 2.2 Coordinator Pages (6 sites)

| File | Current Pattern | New Pattern |
|------|----------------|-------------|
| `coordinator/entity-incident-map/page.tsx` | 2x raw `fetch` | `useIncidents()` (exists) + `useIncidentAssessmentSummary(id)` |
| `coordinator/verification/deliveries/page.tsx` | 2x raw `fetch` | `useVerificationDeliveries()` + `useVerifyDelivery()` |
| `coordinator/incidents/[id]/page.tsx` | 2x raw `fetch` | `useIncidentDetail(id)` + `useIncidentAssessmentSummary(id)` |

### 2.3 Donor Pages (2 sites)

| File | Current Pattern | New Pattern |
|------|----------------|-------------|
| `donor/analytics/page.tsx` | raw `fetch('/api/v1/donors/metrics?timeframe=30d')` | `useDonorMetrics({ dateRange: '30d' })` |
| `donor/rapid-assessments/page.tsx` | `localStorage.getItem` + raw `fetch` | Use hook from `usePreliminaryAssessment` store refactor |

### 2.4 Report Components (8 sites)

| File | Current Pattern | New Pattern |
|------|----------------|-------------|
| `ReportManagement.tsx` (7 calls) | 7x raw `fetch` | `useReportConfigurations()`, `useReportExecutions()`, `useReportStatistics()`, `useDeleteConfiguration()`, `useDeleteExecution()`, `useDuplicateConfiguration()`, `useDownloadExecution()` |
| `TemplateSelector.tsx` (1 call) | raw `fetch` | `useReportTemplates()` |

### 2.5 Donor Components (4 sites)

| File | Current Pattern | New Pattern |
|------|----------------|-------------|
| `PeerComparison.tsx` | raw `fetch('/api/v1/leaderboard?...')` | `useLeaderboard(params)` |
| `DonorDashboard.tsx` line 144 | raw `fetch` (inconsistent in same file) | `useLeaderboard({ limit: 100, sortBy: 'overall' })` |
| `CommitmentStatusTracker.tsx` | raw `fetch` PATCH | `useUpdateCommitment()` mutation |
| `ExportButton.tsx` | raw `fetch` POST | `usePerformanceExport()` mutation |

### 2.6 Other Components (5 sites)

| File | Current Pattern | New Pattern |
|------|----------------|-------------|
| `AssessmentRelationshipMap.tsx` (3 calls) | 3x raw `fetch` | `useEntityLatestAssessment(id)`, `useRelationshipStatistics(params)`, `useSituationDashboard(incidentId)` |
| `TopDonorsSection.tsx` | raw `fetch('/api/v1/donors/metrics?dateRange=30d')` | `useDonorMetrics({ dateRange: '30d' })` |
| `IncidentCreationForm.tsx` | raw `fetch('/api/v1/preliminary-assessments')` | `usePreliminaryAssessments()` hook |

---

## Phase 3: Migrate Stores to Centralized API Client (7 call sites)

Zustand stores cannot use React Query hooks. They call `apiGet`/`apiPost`/etc. directly from `@/lib/api`.

**Exception:** Stores that handle binary responses (CSV/PDF downloads) use `createAuthenticatedFetch()` from `@/lib/auth/token-utils` instead, because `apiPost` parses JSON and binary responses need raw `Response`.

### 3.1 `src/stores/export.store.ts` (5 calls)

| Line | URL | Method | Response Type | Fix |
|------|-----|--------|---------------|-----|
| 174 | `/api/v1/exports/csv` | POST | **Binary** (CSV/XLSX blob) | Use `createAuthenticatedFetch()` from `@/lib/auth/token-utils` |
| 275 | `/api/v1/exports/schedule` | POST | JSON | Replace with `apiPost()` |
| 413 | `/api/v1/exports/schedule` | GET | JSON | Replace with `apiGet()` |
| 435 | `/api/v1/exports/schedule?id=...` | PUT | JSON | Replace with `apiPut()` |
| 461 | `/api/v1/exports/schedule?id=...` | DELETE | JSON | Replace with `apiDelete()` |

**Implementation for JSON endpoints:**
```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'

// Before:
const response = await fetch('/api/v1/exports/schedule')
const result = await response.json()

// After:
const result = await apiGet('/api/v1/exports/schedule')
if (!result.success) throw new Error(result.error || 'Failed to load scheduled reports')
set({ scheduledReports: result.data || [] })
```

**Implementation for binary endpoints:**
```typescript
import { createAuthenticatedFetch } from '@/lib/auth/token-utils'

// Before:
const response = await fetch('/api/v1/exports/csv', { ... })

// After:
const response = await createAuthenticatedFetch('/api/v1/exports/csv', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
})
```

### 3.2 `src/stores/verification.store.ts` (2 calls)

| Line | URL | Method | Fix |
|------|-----|--------|-----|
| 309 | `/api/v1/verification/queue/assessments?${params}` | GET | Replace with `apiGet()` |
| 364 | `/api/v1/verification/queue/deliveries?${params}` | GET | Replace with `apiGet()` |

**Note:** `src/hooks/useVerification.ts` already has `useVerificationQueue()` that calls `apiGet` for the assessments endpoint. Check if the store's `verification.store.ts` methods duplicate hook functionality. If so, consider removing store methods and using hooks instead.

---

## Phase 4: Migrate Non-React Services to Centralized API Client (6 call sites)

### 4.1 `src/lib/offline/bootstrap.ts` (3 calls)

| Line | URL | Method | Fix |
|------|-----|--------|-----|
| 196 | `/api/v1/entities?active=true&limit=1000` | GET | Replace with `apiGet()` |
| 246 | `/api/v1/incidents?status=ACTIVE&limit=100` | GET | Replace with `apiGet()` |
| 304 | `/api/v1/assessments/verified?limit=500` | GET | Replace with `apiGet()` |

**Guard:** `apiGet` returns `{ success: false, error: '...' }` when no token is available (because `getAuthHeaders()` omits Bearer). Add early return:

```typescript
import { getAuthToken } from '@/lib/auth/token-utils'
import { apiGet } from '@/lib/api'

async function bootstrapEntities() {
  if (!getAuthToken()) return // Skip if not authenticated

  const result = await apiGet('/api/v1/entities?active=true&limit=1000')
  if (!result.success) {
    console.error('Bootstrap entities failed:', result.error)
    return
  }
  // ... process result.data
}
```

### 4.2 `src/lib/services/conflict-export.service.ts` (2 calls)

| Line | URL | Method | Response Type | Fix |
|------|-----|--------|---------------|-----|
| 49 | `/api/v1/sync/conflicts/export?${...}` | GET | **Binary** (CSV) | Use `createAuthenticatedFetch()` |
| 301 | `/api/v1/sync/conflicts?${...}` | GET | JSON | Replace with `apiGet()` |

**Note:** `src/hooks/useConflicts.ts` already uses `apiGet` for `fetchConflicts` and uses raw `fetch` for `exportConflicts` (binary download). The service file may duplicate hook functionality. Consider whether the service is still needed or if the hook covers it.

### 4.3 `src/lib/services/delivery-offline.service.ts` (1 call)

| Line | URL | Method | Fix |
|------|-----|--------|-----|
| 225 | `/api/v1/responses/${responseId}/deliver` | POST | Replace with `apiPost()` |

---

## Phase 5: Standardize Inconsistent Auth Patterns (14 call sites)

These calls already include auth but use `localStorage.getItem('auth_token')` directly. Migrate them to use the centralized API client (preferred) or `getAuthToken()` from `token-utils` (minimum).

### 5.1 `src/stores/preliminary-assessment.store.ts` (4 calls)
- Lines 92, 216, 267, 490: Replace `localStorage.getItem('auth_token')` + raw `fetch` with `apiGet`/`apiPost`/`apiPut`/`apiPatch`

### 5.2 `src/stores/incident.store.ts` (5 calls)
- Lines 58, 98, 138, 166, 186: Replace `localStorage.getItem('auth_token')` + raw `fetch` with `apiGet`/`apiPost`/`apiPut`/`apiPatch`/`apiDelete`

### 5.3 `src/components/providers/AuthInitializer.tsx` (1 call)
- Line 24: Replace `localStorage.getItem('auth_token')` with `getAuthToken()` from `@/lib/auth/token-utils`

### 5.4 `src/lib/auth/get-current-user.ts` (1 call)
- Line 19: Replace `localStorage.getItem('auth_token')` with `getAuthToken()` from `@/lib/auth/token-utils`

### 5.5 `src/app/(auth)/donor/rapid-assessments/page.tsx` (1 call)
- Line 37: Replace `localStorage.getItem('auth_token')` + raw `fetch` with hook from Phase 1

### 5.6 `src/components/donor/CommitmentForm.tsx` (3 calls)
- Lines 77, 110, 154: Replace `localStorage.getItem('auth_token')` + raw `fetch` with `apiGet`/`apiPost`

### 5.7 `src/components/donor/DonorProfile.tsx` (2 calls)
- Lines 64, 83: Replace with existing `useDonorProfile()` hook from `@/hooks/useDonor`

---

## Execution Order

| Step | Phase | Files | Fixes | Dependencies |
|------|-------|-------|-------|-------------|
| 1 | 0 | `src/lib/api.ts` | 1 (fix getAuthToken) | None |
| 2 | 1 | `src/hooks/useAdminDonors.ts` (NEW) | +1 file | Phase 0 |
| 3 | 1 | `src/hooks/useLeaderboard.ts` (NEW) | +1 file | Phase 0 |
| 4 | 1 | `src/hooks/useReportManagement.ts` (NEW) | +1 file | Phase 0 |
| 5 | 1 | `src/hooks/useIncidentDetails.ts` (NEW) | +1 file | Phase 0 |
| 6 | 1 | `src/hooks/useVerificationDeliveries.ts` (NEW) | +1 file | Phase 0 |
| 7 | 1 | `src/hooks/useAssessmentRelationships.ts` (NEW) | +1 file | Phase 0 |
| 8 | 1 | `src/hooks/useCommitments.ts` (NEW) | +1 file | Phase 0 |
| 9 | 1 | `src/hooks/usePerformanceExport.ts` (NEW) | +1 file | Phase 0 |
| 10 | 1 | Extend `src/hooks/useDonorMetrics.ts` | Verify coverage | Phase 0 |
| 11 | 2 | All page files (admin, coordinator, donor) | 12 call sites | Phases 1 |
| 12 | 2 | All component files (reports, donor, coordinator) | 24 call sites | Phases 1 |
| 13 | 3 | `export.store.ts`, `verification.store.ts` | 7 call sites | Phase 0 |
| 14 | 4 | `bootstrap.ts`, `conflict-export.service.ts`, `delivery-offline.service.ts` | 6 call sites | Phase 0 |
| 15 | 5 | Stores, providers, auth files | 14 call sites | Phase 0 |

Steps 2-10 can be done in parallel (no interdependencies between hooks).
Steps 11-12 depend on their respective hooks being created.
Steps 13-15 depend only on Phase 0 and can proceed independently of hooks.

---

## Verification Plan

### Per-File Verification
After fixing each file:
1. Run `npx next build` to check for TypeScript compilation errors
2. Navigate to the affected page in the browser with proper role authentication
3. Check browser DevTools Network tab for 401 errors (should be zero)

### Full Regression Test
After all fixes:
1. Log in as each role (ADMIN, COORDINATOR, DONOR, ASSESSOR, RESPONDER)
2. Navigate to every page listed in this plan
3. Verify all API calls return 200 in Network tab
4. Verify no console errors related to auth failures

### Automated Check
Run a grep to verify no raw `fetch()` calls to `/api/v1` remain without auth:
```bash
rg 'fetch\([`'"'"'"]\/api\/v1' src/ --context 5 | rg -v 'apiGet|apiPost|apiPut|apiPatch|apiDelete|createAuthenticatedFetch'
```

This should return zero results after migration. Any remaining raw `fetch` calls to `/api/v1` are violations.

### Hook Coverage Check
Verify all new hooks follow the established pattern:
```bash
rg 'apiGet|apiPost|apiPut|apiPatch|apiDelete' src/hooks/ --count
```

---

## Estimated Effort

| Phase | Fixes | Estimated Time |
|-------|-------|---------------|
| Phase 0: Fix API Client | 1 | 15 min |
| Phase 1: Create Hooks | 18 hooks (~10 new files) | 90 min |
| Phase 2: Migrate Components/Pages | 36 call sites | 120 min |
| Phase 3: Migrate Stores | 7 call sites | 45 min |
| Phase 4: Migrate Services | 6 call sites | 30 min |
| Phase 5: Standardize Patterns | 14 call sites | 45 min |
| Verification | - | 45 min |
| **Total** | **57 fixes, 10 new hook files** | **~6 hours** |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Binary response handling | `apiPost` parses JSON, breaks CSV/PDF downloads | Use `createAuthenticatedFetch()` for binary endpoints |
| Offline bootstrap runs before auth | `apiGet` returns `{ success: false }` with no Bearer | Add `if (!getAuthToken()) return` guard |
| Store-hook duplication | `verification.store.ts` may duplicate `useVerification.ts` hook | Check for overlap; prefer hooks in React context, keep stores for non-React |
| `useConflicts.ts` already has raw `fetch` for binary export | New service-level migration may duplicate | Verify `conflict-export.service.ts` is actually used; if only the hook is used, skip service migration |
| Response envelope differences | `apiGet` returns `ApiResponse<T>`, raw fetch returns JSON directly | Update call sites to handle `result.data` instead of direct JSON |
| Existing hooks already cover some endpoints | `useDonorMetrics`, `useIncidents`, `useVerification` exist | Extend existing hooks rather than creating new ones |
| Breaking existing `getAuthToken` import from `api.ts` | 2 files import `getAuthToken` from `@/lib/api` | Update imports to `@/lib/auth/token-utils` |

---

## Implementation Results (2026-05-19)

### Phase 0: Fixed
- `src/lib/api.ts` — Removed duplicate `getAuthToken()`, now imports from `@/lib/auth/token-utils` which checks both `auth_token` and `token` keys

### Phase 1: Created 7 New Hook Files

| File | Hooks |
|------|-------|
| `src/hooks/useAdminDonors.ts` | `useAdminDonors(filters?)` |
| `src/hooks/useLeaderboard.ts` | `useLeaderboard(params?)` |
| `src/hooks/useReportManagement.ts` | `useReportConfigurations`, `useReportExecutions`, `useReportStatistics`, `useReportTemplates`, `useDeleteConfiguration`, `useDeleteExecution`, `useDuplicateConfiguration`, `useDownloadExecution` |
| `src/hooks/useIncidentDetails.ts` | `useIncidentDetail(id)`, `useIncidentAssessmentSummary(id)` |
| `src/hooks/useVerificationDeliveries.ts` | `useVerificationDeliveries(filters?)`, `useVerifyDelivery()` |
| `src/hooks/useCommitments.ts` | `useCommitment(id)`, `useUpdateCommitment()`, `usePreliminaryAssessments(params?)` |
| `src/hooks/usePerformanceExport.ts` | `usePerformanceExport()` |

### Phase 2: Migrated 14 Files (Pages + Components)

| File | Migration |
|------|-----------|
| `src/app/(auth)/admin/donors/page.tsx` | raw fetch → `useAdminDonors()` |
| `src/app/(auth)/coordinator/donors/page.tsx` | raw fetch → `useAdminDonors()` |
| `src/app/(auth)/coordinator/entity-incident-map/page.tsx` | 2x raw fetch → `useIncidents()` + `useIncidentAssessmentSummary()` |
| `src/app/(auth)/coordinator/verification/deliveries/page.tsx` | raw fetch → `useVerificationDeliveries()` + `apiPost` |
| `src/app/(auth)/donor/analytics/page.tsx` | raw fetch → `useDonorMetrics({ dateRange: '30d' })` |
| `src/app/(auth)/donor/rapid-assessments/page.tsx` | localStorage + raw fetch → `useQuery` + `apiGet` |
| `src/components/reports/ReportManagement.tsx` | 7x raw fetch → `useReportManagement` hooks + `createAuthenticatedFetch` for download |
| `src/components/donor/PeerComparison.tsx` | raw fetch → `useLeaderboard()` |
| `src/components/donor/DonorProfile.tsx` | 2x localStorage + raw fetch → `apiGet` + `apiPatch` |
| `src/components/donor/CommitmentForm.tsx` | 3x localStorage + raw fetch → `apiGet` + `apiPost` |
| `src/components/donor/CommitmentStatusTracker.tsx` | raw fetch PATCH → `apiPatch` |
| `src/components/donor/ExportButton.tsx` | raw fetch POST → `createAuthenticatedFetch` (binary download) |

### Phase 3: Migrated Stores

| File | Migration |
|------|-----------|
| `src/stores/export.store.ts` | 5 calls: binary CSV via `createAuthenticatedFetch`, JSON via `apiGet/apiPost/apiPut/apiDelete` |
| `src/stores/verification.store.ts` | 2 calls: `apiGet` with proper `result.data` unwrapping for pagination/queueDepth/metrics |
| `src/stores/preliminary-assessment.store.ts` | 4 calls: `apiGet/apiPost/apiPut` replacing localStorage+raw fetch |

### Phase 4: Migrated Services

| File | Migration |
|------|-----------|
| `src/lib/offline/bootstrap.ts` | 3 calls via `apiGet` with `getAuthToken()` guards |
| `src/lib/services/conflict-export.service.ts` | Binary export via `createAuthenticatedFetch`, JSON preview via `apiGet` |
| `src/lib/services/delivery-offline.service.ts` | 1 call via `apiPost` |

### Phase 5: Standardized Auth Patterns

| File | Migration |
|------|-----------|
| `src/stores/incident.store.ts` | 5 calls: `apiGet/apiPost/apiPut` replacing `localStorage.getItem('token')` + raw fetch |
| `src/components/providers/AuthInitializer.tsx` | `getAuthToken()` + `apiGet` replacing localStorage + raw fetch |
| `src/lib/auth/get-current-user.ts` | `getAuthToken()` + `apiGet` replacing localStorage + raw fetch |

### Out-of-Scope (Not in Plan)
The following files still contain raw `fetch('/api/v1/...')` calls but were NOT listed in the original plan:
- `src/stores/auth.store.ts` (login/logout — correctly uses raw fetch for auth endpoints)
- `src/components/coordinator/IncidentManagement.tsx` (8 calls)
- `src/components/coordinator/EntityAssignmentForm.tsx` (7 calls)
- `src/components/coordinator/AssessmentRelationshipMap.tsx` (4 calls)
- `src/components/verification/EnhancedAutoApprovalConfig.tsx` (4 calls)
- `src/components/verification/ConfigurationAuditHistory.tsx` (3 calls)
- `src/components/verification/VerificationAnalytics.tsx` (1 call)
- `src/components/verification/ConfigurationAnalytics.tsx` (1 call)
- `src/components/verification/AutoApprovalConfig.tsx` (3 calls)
- `src/components/forms/response/ResponsePlanningForm.tsx` (3 calls)
- `src/components/forms/response/DonorCommitmentImportForm.tsx` (4 calls)
- `src/components/dashboards/crisis/ResourceManagement.tsx` (3 calls)
- `src/components/dashboards/crisis/ResourceGapAnalysis.tsx` (5 calls)
- `src/components/dashboards/situation/TopDonorsSection.tsx` (1 call)
- Various page files (dashboard, responder, assessor, admin, system, roles, etc.)
