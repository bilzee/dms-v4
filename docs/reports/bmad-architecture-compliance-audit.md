# BMAD Architecture Compliance Audit

**Date:** 2026-05-19
**Scope:** All API routes, client-side fetch calls, hooks, stores, auth middleware, and token management
**Previous Remediation:** 42 unauthenticated API calls + 14 fragile localStorage reads (commit `8412a6f`)

---

## Executive Summary

| Layer | Total Items | Compliant | Partial | Non-Compliant | Compliance Rate |
|-------|------------|-----------|---------|---------------|-----------------|
| API Routes (auth) | 111 | 79 | 27 | 5 | 71% |
| API Routes (envelope) | 111 | 88 | 18 | 5 | 79% |
| Client-Side fetch | 69 raw calls | 6 (infra) | 46 (has auth) | 17 (no auth) | 9% |
| Hooks | 31 files | 7 | 8 | 9 (data) / 7 (N/A) | 23% |
| Stores | 9 files | 6 | 1 | 2 | 67% |
| localStorage direct access | 8 instances | 0 | 0 | 8 | 0% |

---

## 1. BMAD Reference Architecture

### Three-Layer Data Fetching Pattern

```
Component --> TanStack Query Hook (src/hooks/) --> apiGet/apiPost (src/lib/api.ts) --> fetch() + Bearer token
```

### API Route Pattern

```
withAuth(handler) from @/lib/auth/middleware
Response: { success: boolean, data?: T, error?: string, meta?: { timestamp, version, requestId } }
```

### Token Management

- **Canonical accessor:** `getAuthToken()` from `@/lib/auth/token-utils`
- **API functions:** `apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete` from `@/lib/api`
- **Binary downloads:** `createAuthenticatedFetch` from `@/lib/auth/token-utils`
- **NO direct `localStorage.getItem('token')` or `localStorage.getItem('auth_token')`** outside token-utils

---

## 2. API Route Audit

### 2.1 Routes Using Non-Standard Auth (`verifyTokenWithRole` instead of `withAuth`)

| # | File | Methods | Issue |
|---|------|---------|-------|
| 1 | `api/v1/dashboard/resource-management/stats/route.ts` | GET | Uses `verifyTokenWithRole`, no `meta` on success |
| 2 | `api/v1/dashboard/resource-management/gap-analysis/route.ts` | GET | Uses `verifyTokenWithRole`, nested `data.data` |
| 3 | `api/v1/dashboard/resource-management/critical-gaps/route.ts` | GET | Uses `verifyTokenWithRole`, mock data |
| 4 | `api/v1/dashboard/resource-management/commitments/route.ts` | GET | Uses `verifyTokenWithRole`, nested `data.data` |
| 5 | `api/v1/entities/commitments/route.ts` | GET, POST | Uses `verifyTokenWithRole`, non-standard `message` field |

### 2.2 Routes with Incomplete Response Envelope (Missing `success` or `meta`)

| # | File | Methods | Issue |
|---|------|---------|-------|
| 1 | `api/v1/system/health/route.ts` | GET | Missing `success` field on all responses |
| 2 | `api/v1/system/settings/route.ts` | GET, PUT | Inconsistent `success` field |
| 3 | `api/v1/verification/analytics/route.ts` | GET | Missing `success` on success/error |
| 4 | `api/v1/users/route.ts` | POST, GET | Missing `success` on most responses |
| 5 | `api/v1/users/[userId]/route.ts` | GET, PUT | Missing `success` on data responses |
| 6 | `api/v1/users/[userId]/roles/route.ts` | GET, PUT | Missing `success` on most responses |
| 7 | `api/v1/auth/login/route.ts` | POST | Missing `success` on all responses |
| 8 | `api/v1/auth/me/route.ts` | GET | Missing `success` field |
| 9 | `api/v1/auth/refresh/route.ts` | POST | Missing `success` field |
| 10 | `api/v1/entities/public/route.ts` | GET | Non-standard error format `{ error, message }` |
| 11 | `api/v1/users/assignable/route.ts` | GET | Non-standard `count` at top level |
| 12 | `api/v1/donors/[id]/commitments/route.ts` | GET, POST | Non-standard `message` field, missing `meta` |
| 13 | `api/entities/available-for-assessment/route.ts` | GET | Uses `{ success, entities }` not `{ success, data }` |

### 2.3 Compliant Routes (79 routes using `withAuth`)

All routes listed below use `withAuth` HOF and follow the envelope pattern:

`permissions`, `entities`, `entities/assigned`, `entities/[id]/assessments/latest`, `entities/[id]/incidents`, `incidents`, `incidents/[id]`, `incidents/[id]/entities`, `incidents/[id]/assessment-summary`, `incidents/types`, `incidents/from-assessment`, `assessments/[id]/verify`, `assessments/[id]/reject`, `assessments/verified`, `rapid-assessments`, `rapid-assessments/[id]`, `rapid-assessments/latest`, `rapid-assessments/user/[userId]`, `rapid-assessments/[id]/submit`, `rapid-assessments/update-priorities`, `preliminary-assessments`, `preliminary-assessments/[id]`, `preliminary-assessments/user/[userId]`, `responses/[id]`, `responses/[id]/verify`, `responses/[id]/deliver`, `responses/[id]/reject`, `responses/[id]/collaboration`, `responses/planned`, `responses/planned/assigned`, `responses/delivered`, `responses/assigned`, `responses/from-commitment`, `responses/conflicts/[assessmentId]`, `commitments`, `commitments/[id]`, `commitments/[id]/assign`, `commitments/[id]/notify`, `commitments/available`, `leaderboard`, `leaderboard/criteria`, `verification/queue/assessments`, `verification/queue/responses`, `verification/queue/deliveries`, `verification/queue/deliveries/[id]/verify`, `verification/metrics`, `verification/metrics/responses`, `verification/live`, `verification/auto-approval`, `delivery-media`, `delivery-media/[id]`, `delivery-media/sync`, `entity-assignments`, `entity-assignments/[id]`, `entity-assignments/user/[userId]`, `entity-assignments/entity/[entityId]`, `entity-assignments/suggestions`, `entity-assignments/bulk`, `entity-assignments/collaboration`, `relationships`, `relationships/timeline`, `relationships/statistics`, `reports/templates`, `reports/templates/[id]`, `reports/configurations`, `reports/generate`, `reports/download/[id]`, `reports/performance/export`, `reports/executions/[id]`, `sync/status`, `sync/pull`, `sync/resolve`, `sync/batch`, `sync/conflicts`, `sync/conflicts/summary`, `sync/conflicts/export`, `auto-assignment/config`, `auto-assignment/trigger`, `severity-thresholds/[id]`

---

## 3. Client-Side Raw `fetch()` Audit

### 3.1 COMPLIANT Infrastructure (Layer 3 - authorized `fetch()` usage)

| # | File | Purpose |
|---|------|---------|
| 1 | `src/lib/api.ts` | `apiGet`/`apiPost`/`apiPut`/`apiPatch`/`apiDelete` implementations |
| 2 | `src/lib/auth/token-utils.ts` | `createAuthenticatedFetch()` |
| 3 | `src/lib/config/network-detection.ts` | Unauthenticated health pings |
| 4 | `src/lib/exports/download-manager.ts` | Binary download manager |
| 5 | `src/lib/map/offlineTiles.ts` | External map tiles |
| 6 | `src/stores/auth.store.ts` | Login/logout/refresh (no token yet for login) |

### 3.2 CRITICAL: Raw `fetch()` WITHOUT Authorization Headers (17 calls)

| # | File | Line | Endpoint |
|---|------|------|----------|
| NC-1 | `src/components/reports/builder/TemplateSelector.tsx` | 76 | `/api/v1/reports/templates` |
| NC-2 | `src/components/coordinator/AssessmentTimeline.tsx` | 149 | `/api/v1/relationships/timeline` |
| NC-3 | `src/components/coordinator/AssessmentRelationshipMap.tsx` | 183 | `/api/v1/entities/{id}/assessments/latest` |
| NC-4 | `src/components/coordinator/AssessmentRelationshipMap.tsx` | 199 | `/api/v1/relationships/statistics` |
| NC-5 | `src/components/coordinator/AssessmentRelationshipMap.tsx` | 223 | `/api/v1/dashboard/situation` |
| NC-6 | `src/components/coordinator/AssessmentRelationshipMap.tsx` | 283 | `/api/v1/relationships` |
| NC-7 | `src/app/(auth)/coordinator/incidents/[id]/page.tsx` | 70 | `/api/v1/incidents/{id}` |
| NC-8 | `src/app/(auth)/coordinator/incidents/[id]/page.tsx` | 85 | `/api/v1/incidents/{id}/assessment-summary` |
| NC-9 | `src/app/(auth)/admin/donors/[id]/page.tsx` | 72 | `/api/v1/donors/{id}` |
| NC-10 | `src/app/(auth)/admin/donors/[id]/edit/page.tsx` | 96 | `/api/v1/donors/{id}` |
| NC-11 | `src/app/(auth)/admin/donors/[id]/edit/page.tsx` | 146 | `/api/v1/donors/{id}` (PUT) |
| NC-12 | `src/hooks/useConflicts.ts` | 88 | `/api/v1/sync/conflicts/export` (CSV) |
| NC-13 | `src/app/(auth)/responder/planning/page.tsx` | 49 | `/api/v1/responses/planned/assigned` |
| NC-14 | `src/app/(auth)/responder/planning/page.tsx` | 79 | `/api/v1/responses/planned/assigned` (retry) |
| NC-15 | `src/lib/testing/living-documentation-dashboard.tsx` | 109 | `/api/living-tests/status` |
| NC-16 | `src/lib/testing/living-documentation-dashboard.tsx` | 125 | `/api/living-tests/start` (POST) |
| NC-17 | `src/lib/testing/living-documentation-dashboard.tsx` | 137 | `/api/living-tests/stop` (POST) |

### 3.3 Architecture Bypass: Raw `fetch()` WITH Manual Auth (46 calls)

These include `Authorization: Bearer ${token}` but bypass the BMAD hook/apiGet layers:

#### Page Components (27 files, ~35 calls)

| # | File | Calls | Area |
|---|------|-------|------|
| B-1 | `dashboard/page.tsx` | 3 | Dashboard |
| B-2 | `roles/page.tsx` | 4 | Roles CRUD |
| B-3 | `system/settings/page.tsx` | 2 | System settings |
| B-4 | `system/health/page.tsx` | 1 | System health |
| B-5 | `assessor/rapid-assessments/[id]/page.tsx` | 1 | Assessment detail |
| B-6 | `assessor/rapid-assessments/[id]/edit/page.tsx` | 2 | Assessment edit |
| B-7 | `assessor/rapid-assessments/page.tsx` | 3 | Assessment list |
| B-8 | `assessor/rapid-assessments/new/page.tsx` | 2 | New assessment |
| B-9 | `assessor/dashboard/page.tsx` | 2 | Assessor dashboard |
| B-10 | `assessor/preliminary-assessment/[id]/page.tsx` | 1 | PA detail |
| B-11 | `assessor/preliminary-assessment/page.tsx` | 1 | PA list |
| B-12 | `donor/responses/page.tsx` | 2 | Donor responses |
| B-13 | `donor/reports/page.tsx` | 1 | Donor reports |
| B-14 | `donor/performance/page.tsx` | 1 | Donor performance |
| B-15 | `donor/leaderboard/page.tsx` | 1 | Leaderboard |
| B-16 | `donor/entities/[id]/page.tsx` | 2 | Entity detail |
| B-17 | `donor/entities/performance/page.tsx` | 2 | Entity performance |
| B-18 | `responder/responses/[id]/page.tsx` | 1 | Response detail |
| B-19 | `responder/responses/[id]/edit/page.tsx` | 1 | Response edit |
| B-20 | `responder/responses/page.tsx` | 1 | Response list |
| B-21 | `responder/dashboard/page.tsx` | 2 | Responder dashboard |
| B-22 | `responder/planning/page.tsx` | 2 | Response planning |
| B-23 | `coordinator/dashboard/page.tsx` | 1 | Coordinator dashboard |
| B-24 | `coordinator/entity-management/page.tsx` | 1 | Entity management |
| B-25 | `coordinator/entities/page.tsx` | 5 | Entities CRUD |
| B-26 | `admin/dashboard/page.tsx` | 4 | Admin dashboard |
| B-27 | `admin/users/page.tsx` | 1 | User management |

#### Reusable Components (16 files, ~30 calls)

| # | File | Calls | Component |
|---|------|-------|-----------|
| B-28 | `donor/DonorDashboard.tsx` | 5 | Donor dashboard widget |
| B-29 | `donor/AssessmentTrends.tsx` | 1 | Assessment trends chart |
| B-30 | `donor/AssessmentExport.tsx` | 1 | Assessment export |
| B-31 | `donor/AssessmentViewer.tsx` | 1 | Assessment viewer |
| B-32 | `donor/CommitmentDashboard.tsx` | 3 | Commitment dashboard |
| B-33 | `donor/EntityInsightsCards.tsx` | 2 | Entity insights |
| B-34 | `donor/LeaderboardDisplay.tsx` | 1 | Leaderboard display |
| B-35 | `donor/EntitySelector.tsx` | 1 | Entity selector |
| B-36 | `coordinator/IncidentManagement.tsx` | 6 | Incident CRUD |
| B-37 | `coordinator/EntityAssignmentForm.tsx` | 7 | Entity assignments |
| B-38 | `verification/VerificationAnalytics.tsx` | 1 | Verification analytics |
| B-39 | `verification/AutoApprovalConfig.tsx` | 3 | Auto-approval config |
| B-40 | `verification/EnhancedAutoApprovalConfig.tsx` | 4 | Enhanced auto-approval |
| B-41 | `verification/ConfigurationAuditHistory.tsx` | 3 | Audit history |
| B-42 | `verification/ConfigurationAnalytics.tsx` | 1 | Config analytics |
| B-43 | `forms/response/ResponsePlanningForm.tsx` | 3 | Response planning form |

#### Services (3 files)

| # | File | Calls | Purpose |
|---|------|-------|---------|
| B-44 | `lib/services/response-client.service.ts` | 8 | Response service layer |
| B-45 | `lib/sync/engine.ts` | 1 | Sync engine batch |
| B-46 | `hooks/useRealTimeVerification.ts` | 1 | HEAD connectivity check |

---

## 4. Hooks Audit

### 4.1 Fully Compliant Hooks (7 files - gold standard)

| # | File | Hooks | Auth Guard | staleTime |
|---|------|-------|------------|-----------|
| 1 | `useAdminDonors.ts` | `useAdminDonors` | `getAuthToken()` | 5min |
| 2 | `useLeaderboard.ts` | `useLeaderboard` | `getAuthToken()` | 2min |
| 3 | `useReportManagement.ts` | 8 hooks | `getAuthToken()` | 5min |
| 4 | `useIncidentDetails.ts` | 2 hooks | `getAuthToken()` | N/A |
| 5 | `useVerificationDeliveries.ts` | 2 hooks | `getAuthToken()` | 30s |
| 6 | `useCommitments.ts` | 3 hooks | `getAuthToken()` | N/A |
| 7 | `usePerformanceExport.ts` | 1 mutation | N/A | N/A |

### 4.2 Hooks Using `apiGet`/`apiPost` but with Issues (8 files)

| # | File | Issue |
|---|------|-------|
| 1 | `useSeverityThresholds.ts` | Missing `getAuthToken()` guard |
| 2 | `useEntities.ts` | Missing auth guard (public endpoint - may be intentional) |
| 3 | `useDonorMetrics.ts` | Missing auth guard |
| 4 | `useResponseVerificationMetrics.ts` | Missing auth guard |
| 5 | `useGapAnalysisRealtime.ts` | No explicit token guard |
| 6 | `useRealTimeMonitoring.ts` | Uses apiGet for polling (OK), WebSocket direct (OK) |
| 7 | `useCollaboration.ts` | Delegates to service layer, no auth guard |
| 8 | `use-commitment-stats.ts` | Uses apiGet but no TanStack Query |

### 4.3 Non-Compliant Hooks (9 data-fetching files)

| # | File | Issue |
|---|------|-------|
| 1 | `useRealTimeVerification.ts` | Raw `fetch()` for HEAD check |
| 2 | `useConflicts.ts` | Raw `fetch()` for CSV export, no TanStack Query |
| 3 | `useResponseVerification.ts` | `localStorage.getItem('auth_token')` directly |
| 4 | `useIncidents.ts` | `localStorage.getItem('auth_token')` directly |
| 5 | `useVerification.ts` | `localStorage.getItem('auth_token')` directly |
| 6 | `useDonor.ts` | `localStorage.getItem('auth_token')` + direct `localStorage.setItem` |
| 7 | `useIncident.ts` | Direct `localStorage.setItem('token', token)` |
| 8 | `usePreliminaryAssessment.ts` | Direct `localStorage.setItem` for both keys |
| 9 | `useResponseVerification.ts` | `localStorage.getItem('auth_token')` |

### 4.4 N/A Hooks (non-data-fetching - 7 files)

`useAuth.ts`, `useBackgroundSync.ts`, `useGPS.ts`, `useMapPerformance.ts`, `useRoleSession.ts`, `useSync.ts`, `useTouchGestures.ts`, `useOffline.ts`

---

## 5. Stores Audit

### 5.1 Fully Compliant Stores (6 files)

| # | File | API Calls |
|---|------|-----------|
| 1 | `entity.store.ts` | `apiGet`, `apiPost`, `apiDelete` |
| 2 | `incident.store.ts` | `apiGet`, `apiPost`, `apiPut` |
| 3 | `export.store.ts` | `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `createAuthenticatedFetch` |
| 4 | `verification.store.ts` | `apiGet` |
| 5 | `dashboardLayout.store.ts` | No API calls (UI only) |
| 6 | `offline.store.ts` | No API calls (IndexedDB) |

### 5.2 Non-Compliant Stores (2 files)

| # | File | Issues |
|---|------|--------|
| 1 | `auth.store.ts` | Raw `fetch()` for login/logout/refresh (3 calls). Direct `localStorage` read/write for tokens (8 instances). |
| 2 | `preliminary-assessment.store.ts` | `localStorage.getItem('userId')` directly. API calls are compliant. |

### 5.3 N/A Stores (1 file)

`sync.store.ts` - Delegates to sync engine, no direct API calls.

---

## 6. Direct localStorage Access Audit

All instances of `localStorage.getItem('auth_token')` or `localStorage.getItem('token')` outside `token-utils.ts`:

| # | File | Line(s) | Type | Should Use |
|---|------|---------|------|------------|
| LS-1 | `hooks/useVerification.ts` | 36, 112 | Read | `getAuthToken()` |
| LS-2 | `hooks/useResponseVerification.ts` | 41 | Read | `getAuthToken()` |
| LS-3 | `hooks/useDonor.ts` | 86, 139 | Read | `getAuthToken()` |
| LS-4 | `hooks/useIncidents.ts` | 48 | Read | `getAuthToken()` |
| LS-5 | `stores/auth.store.ts` | 56, 66-67, 72-73, 137, 194-195 | Read+Write | `getAuthToken()` / `setAuthToken()` |
| LS-6 | `stores/preliminary-assessment.store.ts` | 115 | Read userId | Auth store |
| LS-7 | `hooks/useIncident.ts` | 10 | Write | `setAuthToken()` |
| LS-8 | `hooks/usePreliminaryAssessment.ts` | 11-12 | Write | `setAuthToken()` |
| LS-9 | `hooks/useDonor.ts` | 177-178 | Write | `setAuthToken()` + auth store |

---

## 7. Remediation Priority

### P0 - Critical (Security: No auth headers - will get 401s)

17 fetch calls across 8 files. These will fail at runtime against `withAuth`-protected endpoints:

1. `src/components/coordinator/AssessmentRelationshipMap.tsx` (4 calls)
2. `src/components/coordinator/AssessmentTimeline.tsx` (1 call)
3. `src/components/reports/builder/TemplateSelector.tsx` (1 call)
4. `src/app/(auth)/coordinator/incidents/[id]/page.tsx` (2 calls)
5. `src/app/(auth)/admin/donors/[id]/page.tsx` (1 call)
6. `src/app/(auth)/admin/donors/[id]/edit/page.tsx` (2 calls)
7. `src/hooks/useConflicts.ts` (1 call)
8. `src/app/(auth)/responder/planning/page.tsx` (2 calls)

### P1 - High (Architecture: Bypass hooks/apiGet layer)

46 fetch calls with manual auth across 43 files. Not security issues but maintenance burden:

- 27 page components with raw fetch
- 16 reusable components with raw fetch
- 3 services with raw fetch

### P2 - Medium (Pattern: Direct localStorage instead of getAuthToken())

9 instances across 5 hooks and 2 stores.

### P3 - Low (API routes: Non-standard auth or response envelope)

5 routes using `verifyTokenWithRole`, ~13 routes missing `success` field.

---

## 8. Recommended Remediation Plan

### Phase 1: Fix P0 Unauthenticated Calls (17 calls)
Create hooks for: report templates, assessment relationships/timeline, incident details (admin), conflicts export, responder planning. ~7 new hooks.

### Phase 2: Migrate P1 Architecture Bypass (46 calls)
Batch-migrate pages by role:
- Assessor pages (10 files, ~16 calls)
- Responder pages (5 files, ~7 calls)
- Admin pages (3 files, ~8 calls)
- Coordinator pages (3 files, ~7 calls)
- Donor pages (5 files, ~8 calls)
- Reusable components (16 files, ~30 calls)

### Phase 3: Replace Direct localStorage (9 instances)
Simple find-replace: `localStorage.getItem('auth_token')` -> `getAuthToken()` in 5 hook files.

### Phase 4: Normalize API Route Responses
Create `@/lib/api/response` helpers and apply to 5 `verifyTokenWithRole` routes + 13 envelope-incomplete routes.

---

## 9. Gold Standard Files (Reference Implementations)

When creating new hooks or migrating files, use these as templates:

- **Hook:** `src/hooks/useAdminDonors.ts`
- **Store:** `src/stores/entity.store.ts`
- **Binary download:** `src/stores/export.store.ts`
- **API route:** `src/app/api/v1/donors/route.ts` (POST with response helpers)
