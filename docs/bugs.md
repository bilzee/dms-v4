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
