# Bug Fix Log

## BUG-001: `getAuthHeaders()` throws when no token exists (CRITICAL)

**Date:** 2026-05-20
**Status:** Fixed
**File:** `src/lib/auth/token-utils.ts:29-33`

### Problem

`getAuthHeaders()` threw `new Error('No authentication token available')` when no token was in localStorage. Since `apiGet()`, `apiPost()`, and all other API helpers in `src/lib/api.ts` call `getAuthHeaders()` to build request headers, **every unauthenticated API request failed silently** — including the login request itself.

The `try/catch` in `apiPost` caught the thrown error and returned `{ success: false, error: 'No authentication token available' }`, which caused `auth.store.ts:login()` to throw before the login API call was ever made.

### Root Cause

The function was designed assuming a token always exists when making API calls. It did not account for the login flow where no token exists yet.

### Fix

Changed `getAuthHeaders()` to return `{ 'Content-Type': 'application/json' }` without `Authorization` header when no token exists, instead of throwing. The API routes that require auth are protected by the `withAuth` middleware on the server side, so omitting the header on unauthenticated requests is safe.

### Verification

Login via UI form succeeds and returns 200 OK with token + user data.

---

## BUG-002: Token stored in localStorage but middleware checks cookies (CRITICAL)

**Date:** 2026-05-20
**Status:** Fixed
**Files:** `src/lib/auth/token-utils.ts`, `src/middleware.ts`

### Problem

After login, `setAuthToken()` stored the JWT only in `localStorage`. However, `src/middleware.ts:73` reads the token from `request.cookies.get('auth_token')?.value`. Since no cookie was ever set, the middleware always found no token and redirected every authenticated page navigation (e.g., `/dashboard`) back to `/login`.

### Root Cause

The auth system had two disconnected token storage mechanisms:
- **Client-side** (`token-utils.ts`): Used `localStorage` for API call headers
- **Server-side** (`middleware.ts`): Used `cookies` for route protection

Neither was synchronized with the other.

### Fix

Updated `setAuthToken()` to also write an `auth_token` cookie with `path=/`, `SameSite=Lax`, and a 7-day `max-age`. Updated `removeAuthToken()` to delete the cookie by setting `max-age=0`.

### Verification

After login, navigating to `/dashboard` succeeds (middleware finds the cookie and passes through). Page refresh also works (cookie persists across navigations).

---

## BUG-003: `AuthInitializer` races with Zustand persist hydration (MEDIUM)

**Date:** 2026-05-20
**Status:** Fixed
**File:** `src/components/providers/AuthInitializer.tsx`

### Problem

`AuthInitializer` runs in a `useEffect` and reads `isAuthenticated` from the Zustand store. However, Zustand's `persist` middleware hydrates state from localStorage asynchronously. The `useEffect` fires before hydration completes, so `isAuthenticated` is always `false` (the initial state), even when a valid session exists in localStorage.

This caused the initializer to make an unnecessary `/api/v1/auth/me` call on every page load (even when the persist store already had valid auth state), and could trigger premature redirects.

### Root Cause

No hydration gate. The `useEffect` in `AuthInitializer` did not check or wait for `useAuthStore.persist.hasHydrated()` before reading auth state.

### Fix

Rewrote `AuthInitializer` to:
1. Check `useAuthStore.persist.hasHydrated()` before reading state
2. If not hydrated, use `onFinishHydration()` callback to wait for completion
3. Only then validate token and restore auth state

### Verification

Page refresh maintains authenticated session without unnecessary API calls or redirects.

---

## BUG-004: `RoleBasedRoute` redirects to login before hydration completes (MEDIUM)

**Date:** 2026-05-20
**Status:** Fixed
**File:** `src/components/shared/RoleBasedRoute.tsx:35-37`

### Problem

`RoleBasedRoute` checks `isAuthenticated` in a `useEffect` and immediately calls `router.push('/login')` if false. Since Zustand persist hydration is asynchronous, `isAuthenticated` is `false` on the first render even when a valid session exists in localStorage. This caused a race condition where the component could redirect to `/login` before the persisted auth state was restored.

### Root Cause

No hydration awareness. The `useEffect` dependency on `isAuthenticated` fired with the initial (unhydrated) value.

### Fix

Added a guard at the top of the `useEffect`: `if (!useAuthStore.persist?.hasHydrated()) return`. This prevents the access check from running until Zustand persist has finished hydrating from localStorage.

### Verification

Protected routes no longer flash-redirect to login on page refresh when a valid session exists.

---

## BUG-005: Dead code `initializeAuthFromStorage` (LOW)

**Date:** 2026-05-20
**Status:** Fixed
**File:** `src/stores/auth.store.ts:63-87, 297`

### Problem

The function `initializeAuthFromStorage` was defined and exported from `auth.store.ts` but never imported or called anywhere in the codebase. It was a duplicate of the logic in `AuthInitializer.tsx`, creating confusion about which initialization path was active.

### Fix

Removed the function (24 lines) and cleaned up unused imports (`apiGet`, `getAuthToken`).

---

## BUG-006: Verification queue counts are mocked/frozen (MEDIUM)

**Date:** 2026-05-20
**Status:** Fixed
**Files:** `src/components/verification/VerificationAnalytics.tsx`

### Problem

The Verification Analytics dashboard displayed hardcoded static values (12 pending, 8 verified, etc.) instead of real data from the API. This made the verification queue appear active even when empty, misleading coordinators.

### Root Cause

Component used hardcoded mock data instead of fetching from the verification queue API endpoints.

### Fix

Replaced hardcoded values with dynamic data fetched from `/api/v1/verification/analytics`.

---

## BUG-007: Navigation sidebar shows all routes regardless of user role (HIGH)

**Date:** 2026-05-20
**Status:** Fixed
**Files:** `src/components/layout/RoleBasedSidebar.tsx`

### Problem

The sidebar navigation displayed links for ALL role-specific routes (Assessor, Responder, Coordinator, Donor) regardless of the logged-in user's role. A Donor user would see Responder planning links, an Assessor would see Coordinator verification links, etc.

### Root Cause

The sidebar component did not filter navigation items by the user's active role. All navigation groups were rendered unconditionally.

### Fix

Added role-based filtering to the sidebar. Navigation items are now filtered by matching the item's `requiredRole` against `user.activeRole` or `user.roles`. Only items matching the user's current role are displayed.

### Verification

- Coordinator user sees only Coordinator links
- Assessor user sees only Assessor links
- Responder user sees only Responder links
- Donor user sees only Donor links

---

## BUG-008: Coordinator entity-management page crashes on load (CRITICAL)

**Date:** 2026-05-20
**Status:** Fixed
**Files:** `src/app/(auth)/coordinator/entity-management/page.tsx`

### Problem

The Coordinator Entity Management page crashed when loading because the code assumed `apiGet` returns `{ data: Entity[] }` but the actual paginated API returns `{ success: true, data: { items: Entity[], pagination: {...} } }`. Accessing `entitiesData.data.map()` on an object without a `.map()` method threw a TypeError.

### Root Cause

Same as BUG-009 (see below). The `useQuery` type was `{ data: Entity[] }` but the actual response had a nested structure.

### Fix

Updated the `useQuery` types to `{ items: Entity[], pagination: any }` and used `extractArray()` to safely extract the entity array from the paginated response.

---

## BUG-009: Systemic paginated response handling breaks all data-fetching pages (CRITICAL)

**Date:** 2026-05-20
**Status:** Fixed
**Files:**
- `src/app/(auth)/coordinator/entity-management/page.tsx`
- `src/app/(auth)/donor/responses/page.tsx`
- `src/app/(auth)/responder/responses/page.tsx`
- `src/app/(auth)/responder/dashboard/page.tsx`
- `src/app/(auth)/responder/planning/page.tsx`
- `src/components/donor/CommitmentForm.tsx`
- `src/stores/incident.store.ts`
- `src/stores/verification.store.ts`
- `src/lib/offline/bootstrap.ts`
- `src/lib/services/response-client.service.ts`

### Problem

The application has **three distinct API response shapes**:

1. **Shape A** (via `paginatedResponse()`): `{ success: true, data: { items: [...], pagination: {...} } }`
2. **Shape B** (via `successResponse()`): `{ success: true, data: [...] }`
3. **Shape C** (raw `NextResponse.json()`): `{ data: [...], meta: {...} }` — **NO `success` field**

Most frontend code assumed `result.data` is always a plain array. This caused two failure modes:

1. **`result.data` is `{ items: [...] }` not an array** — calling `.map()` or `.reduce()` on it throws TypeError
2. **`!result.success` on Shape C APIs** — `result.success` is `undefined` (falsy), so `if (!result.success) throw new Error(...)` always throws, even on successful 200 responses

This broke virtually every page that fetches paginated data: entity management, incidents, responses, verification queue, donor commitments, and offline bootstrap.

### Root Cause

No standardized response unwrapping pattern. The `apiGet()` helper returns raw JSON without any normalization. Each page and store had its own assumption about the response shape, and most assumed wrong.

### Fix

Applied two patterns consistently:

1. **Use `extractArray(result.data)`** from `src/lib/api.ts` to safely extract arrays from any response shape (handles all three shapes)
2. **Use `if (result.error)` instead of `if (!result.success)`** for APIs that return Shape C (no `success` field) — this avoids false-positive error throws

Created the `extractArray()` helper in `src/lib/api.ts` that checks `Array.isArray(data)`, then `data.items`, then `data.data`, falling back to `[]`.

### Verification

All role-specific pages tested via Chrome DevTools:

| User Role | Page | Result |
|-----------|------|--------|
| Coordinator | Dashboard | Loads with stats, verification queue |
| Coordinator | Entity Management | Shows 5 entities with pagination |
| Coordinator | Incidents | Shows 2 active incidents |
| Assessor | Rapid Assessments | Shows 3 assessments (FOOD, WASH, HEALTH) |
| Assessor | Preliminary Assessment | Loads with empty state |
| Assessor | Create New Assessment | Loads with offline data prompt |
| Responder | Planning | Shows 0 plans with empty state |
| Responder | Response Deliveries | Shows "No responses assigned" |
| Responder | Dashboard | Shows 0 plans with empty state |
| Donor | Dashboard | Loads with welcome message |
| Donor | Commitment Status | Shows "No responses assigned" |
| Donor | Entity Locations | Shows 1 assigned entity |

---

## Test Results

All bugs verified fixed via Chrome DevTools against running dev server:

| Test | Result |
|------|--------|
| Navigate to `/login` | Login page renders correctly |
| Fill email + password, submit | 200 OK, redirects to `/dashboard` |
| Dashboard shows user data | "Welcome back, System Administrator" |
| Dashboard shows system health | Database Sync: Healthy, API: 3ms |
| Page refresh (session persistence) | Stays on dashboard, no redirect |
| Logout | Redirects to `/login` |
| Console errors | Zero |
| Build (`npx next build`) | Clean, 0 errors |
| Multi-role testing | All 4 roles tested, all pages load without errors |
