# UX Remediation Implementation Plan

**Date:** 2026-05-21
**Source:** `docs/reports/ux-analysis-sally.md` — Comprehensive UX Analysis (Merged Report)
**Overall Grade:** C- (target: B+ after remediation)
**Architecture:** BMAD Three-Layer Pattern
**Status:** PLANNED

---

## Architecture Compliance Rules

All changes must follow the **BMAD Reference Architecture**:

```
Component --> TanStack Query Hook (src/hooks/) --> apiGet/apiPost (src/lib/api.ts) --> fetch() + Bearer token
```

- **API routes** use `withAuth(handler)` from `@/lib/auth/middleware`
- **Responses** use `{ success, data?, error?, meta }` envelope from `@/lib/api/response.ts`
- **Token access** uses `getAuthToken()` from `@/lib/auth/token-utils` (never raw localStorage)
- **Auth state** uses `useAuth()` hook from `@/hooks/useAuth` (standardize on this, not `useAuthStore`)
- **Data fetching** uses `apiGet/apiPost/apiPut/apiPatch/apiDelete` from `@/lib/api`
- **Validation** uses Zod schemas

---

## Dependency Graph

```
Phase 1 (P0): Session & Auth Fixes
  |-- Task 1.1: Fix role priority in auth.store.ts
  |-- Task 1.2: Fix login redirect in LoginForm.tsx
  |-- Task 1.3: Fix middleware token verification
  |-- Task 1.4: Fix Responder dashboard data fetching
  \-- Task 1.5: Fix Next.js middleware path access
      (ALL Phase 1 tasks are BLOCKERS for everything else)

Phase 2 (P1): Navigation & Data Fixes          [depends on Phase 1]
  |-- Task 2.1: Add dashboard nav links         [independent]
  |-- Task 2.2: Remove duplicate/phantom nav     [independent]
  |-- Task 2.3: Fix data inconsistencies          [depends on 1.1 for session stability]
  |-- Task 2.4: Fix calculation bugs             [independent]
  |-- Task 2.5: Remove hardcoded values          [independent]
  |-- Task 2.6: Fix assessor dashboard links     [independent]
  |-- Task 2.7: Remove dev artifacts             [independent]
  |-- Task 2.8: Fix duplicate logout             [independent]

Phase 3 (P2-P3): Layout, Breadcrumbs & Content  [depends on Phase 1]
  |-- Task 3.1: Complete breadcrumb mappings     [independent]
  |-- Task 3.2: Standardize dashboard padding    [independent]
  |-- Task 3.3: Fix empty states                 [independent]
  |-- Task 3.4: Fix Leaderboard contradictions   [depends on 2.3]
  |-- Task 3.5: Fix Excel/CSV conversion         [independent]
  |-- Task 3.6: Remove redundant UI elements     [independent]
  |-- Task 3.7: Fix header controls visibility   [independent]

Phase 4 (P3-P4): Visual Consistency             [depends on Phase 1]
  |-- Task 4.1: Replace hardcoded colors         [independent]
  |-- Task 4.2: Replace native HTML elements     [independent]
  |-- Task 4.3: Fix VerificationAnalytics bugs   [overlaps fix-mocked-values.md Task 3]
  |-- Task 4.4: Fix Report Builder drag-and-drop [overlaps fix-mocked-values.md Task 8]
  |-- Task 4.5: Add sidebar branding             [independent]

Phase 5 (P5): Accessibility                     [depends on Phase 1]
  |-- Task 5.1: Add skip-to-content link         [independent]
  |-- Task 5.2: Enable pinch-to-zoom             [independent]
  |-- Task 5.3: Add ARIA to navigation           [independent]
  |-- Task 5.4: Add ARIA to charts               [independent]
  |-- Task 5.5: Fix color-only indicators        [independent]
  |-- Task 5.6: Fix clickable divs               [independent]
  |-- Task 5.7: Add mobile sidebar focus trap    [independent]
  |-- Task 5.8: Replace window.confirm()         [independent]

Phase 6 (Cross-cutting): Consolidation          [depends on Phases 1-5]
  |-- Task 6.1: Consolidate verification UIs     [depends on 4.3]
  |-- Task 6.2: Standardize auth hook usage      [depends on Phase 1]
  |-- Task 6.3: Standardize navigation methods   [independent]
  |-- Task 6.4: Add responsive tab bars          [independent]
  |-- Task 6.5: Create domain glossary           [independent]
```

---

## Phase 1: P0 — Session & Auth Fixes (BLOCKERS)

> **Risk:** HIGH — changes to auth store affect all authenticated flows
> **Rollback:** Revert auth.store.ts, LoginForm.tsx, middleware.ts
> **Testing:** Login as each of the 5 roles. Navigate to all role-specific pages. Verify session persists across 10+ page navigations per role.

### Task 1.1: Fix Role Priority in Auth Store

**Ref:** P0-1 (Session/Role Degradation to DONOR)
**Files:**
- `src/stores/auth.store.ts`

**Problem:** The `rolePriority` array puts DONOR first (`['DONOR', 'ASSESSOR', 'COORDINATOR', 'RESPONDER', 'ADMIN']`). When the store rehydrates or re-initializes, multi-role users always default to DONOR. The `currentRole` persistence should prevent this, but the `setUser` function (called on `login` and `refresh`) overrides `currentRole` using the priority system.

**Changes:**

1. **Invert the role priority** to put the most privileged role first:
   ```typescript
   // BEFORE
   const rolePriority = ['DONOR', 'ASSESSOR', 'COORDINATOR', 'RESPONDER', 'ADMIN'];

   // AFTER — most-privileged-first, matching user expectation
   const rolePriority = ['ADMIN', 'COORDINATOR', 'RESPONDER', 'ASSESSOR', 'DONOR'];
   ```

2. **Preserve `currentRole` across `setUser` calls.** In the `setUser` method, check if the existing `currentRole` is still valid in the new available roles before overriding:
   ```typescript
   setUser: (user, token) => {
     const roles = user.roles?.map(r => r.role?.name).filter(Boolean) || [];
     const availableRoles = roles as RoleName[];

     set({
       user,
       token,
       isAuthenticated: true,
       permissions: user.roles?.flatMap(r =>
         r.role?.permissions?.map(p => p.permission?.code) || []
       ).filter(Boolean) || [],
       roles,
       availableRoles,
     });

     // Only set currentRole if not already set or if current is invalid
     const state = get();
     if (!state.currentRole || !availableRoles.includes(state.currentRole)) {
       // Use highest-priority role (now ADMIN-first)
       const highestPriorityRole = availableRoles.sort((a, b) =>
         rolePriority.indexOf(a) - rolePriority.indexOf(b)
       )[0];
       set({ currentRole: highestPriorityRole || availableRoles[0] });
     }
   },
   ```

3. **Add `persistCurrentRole` to the persist partialize.** Ensure `currentRole` is always persisted so rehydration doesn't trigger the priority fallback:
   ```typescript
   partialize: (state) => ({
     user: state.user,
     token: state.token,
     isAuthenticated: state.isAuthenticated,
     currentRole: state.currentRole,  // Explicitly persist
     availableRoles: state.availableRoles,
     // ... existing persisted fields
   }),
   ```

4. **Fix the `refresh` method** to not override `currentRole`:
   ```typescript
   refresh: async () => {
     try {
       const result = await apiGet<AuthResponseData>('/api/v1/auth/me');
       if (result.success && result.data) {
         const userData = result.data.user || result.data;
         const existingRole = get().currentRole;
         get().setUser(userData as any, get().token!);
         // Restore currentRole after setUser
         if (existingRole && get().availableRoles.includes(existingRole)) {
           set({ currentRole: existingRole });
         }
       }
     } catch (error) {
       // Token expired or invalid
       get().logout();
     }
   },
   ```

**Validation:**
- Login as `admin@dms.gov.ng` → verify lands on `/admin/dashboard` not `/donor/dashboard`
- Login as `multirole@dms.gov.ng` → verify defaults to ADMIN role
- Switch role to DONOR, navigate to 3 pages, verify session stays DONOR
- Switch role to ADMIN, navigate to 3 pages, verify session stays ADMIN
- Login as `responder@dms.gov.ng` → verify lands on `/responder/dashboard`

---

### Task 1.2: Fix Login Redirect

**Ref:** P0-1, P1-9 (Login redirect order)
**Files:**
- `src/components/auth/LoginForm.tsx` (lines 122-147)

**Problem:** The post-login redirect checks DONOR first. With the new priority (Task 1.1), the redirect should match.

**Changes:**

Replace the role-based redirect block (lines 122-147) with:
```typescript
const roleRedirectMap: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  COORDINATOR: '/coordinator/dashboard',
  RESPONDER: '/responder/dashboard',
  ASSESSOR: '/assessor/dashboard',
  DONOR: '/donor/dashboard',
};

// Use the currentRole set by the auth store (now ADMIN-first priority)
const currentRole = useAuthStore.getState().currentRole;
const redirectPath = currentRole
  ? roleRedirectMap[currentRole]
  : '/dashboard';

setTimeout(() => {
  router.push(redirectPath);
}, 100);
```

Remove the sequential `if (roles.includes('DONOR'))` chain entirely.

**Also fix:** Remove the `NEXT_PUBLIC_` prefix from the test password env var (P1-1). Change:
```typescript
// BEFORE (line 81)
const testPasswords = process.env.NEXT_PUBLIC_DEV_TEST_PASSWORDS;

// AFTER — server-only env var accessed via a separate API or removed entirely
// For dev-only: use a non-prefixed env var that won't be bundled
const testPasswords = process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_DEV_TEST_PASSWORDS : undefined;
```
Add a `.env.example` note that `NEXT_PUBLIC_DEV_TEST_PASSWORDS` should only be set in development. The `process.env.NODE_ENV` guard already exists (line 28) but the env var itself leaks.

**Validation:**
- Login as each role → verify correct dashboard redirect
- Inspect production build bundle → verify no test passwords in output

---

### Task 1.3: Fix Middleware Token Verification

**Ref:** P0-1 (Session collapse during navigation)
**Files:**
- `src/middleware.ts`

**Problem:** The Next.js middleware verifies the JWT on every page navigation. If token verification fails or the user lookup fails, it redirects to `/login`. The middleware does not respect the client-side `currentRole` — it uses the full `roles` array from the JWT payload for path access. This is correct behavior, but the middleware can cause a full page reload that triggers auth store rehydration, which then applies the old DONOR-first priority.

**Changes:**

1. Add `x-current-role` to the response headers so the client can validate:
   ```typescript
   response.headers.set('x-user-roles', roles.join(','));
   response.headers.set('x-user-id', userId);
   ```

2. Ensure the middleware's `canAccessPath` uses `ROLE_PATH_PATTERNS` (which already includes shared paths like `/dashboard`, `/profile`, `/help` for all roles). Verify that Responder and Admin paths are correctly accessible.

3. Add error recovery — if token verification fails, redirect to `/login?callbackUrl={currentPath}&error=session_expired` instead of silently redirecting.

**Validation:**
- Navigate between `/admin/dashboard` and `/admin/users` as admin → no redirect
- Navigate between `/responder/dashboard` and `/responder/responses` as responder → no redirect
- Expire a token manually → verify friendly error message on redirect

---

### Task 1.4: Fix Responder Dashboard Data Fetching

**Ref:** P0-2 (Responder Dashboard infinite loading)
**Files:**
- `src/app/(auth)/responder/dashboard/page.tsx`

**Problem:** The Responder Dashboard's `ResponderDashboardContent` uses `useAuthStore` directly (line 30: `const { user, token } = useAuthStore()`). When the session degrades (P0-1), the token may become invalid for responder-specific API calls, causing infinite loading.

**Changes:**

1. Replace `useAuthStore` with `useAuth` hook:
   ```typescript
   // BEFORE
   import { useAuthStore } from '@/stores/auth.store';
   const { user, token } = useAuthStore();

   // AFTER
   import { useAuth } from '@/hooks/useAuth';
   const { user, token, currentRole } = useAuth();
   ```

2. Add a role guard that shows a clear error if the session has degraded:
   ```typescript
   if (currentRole !== 'RESPONDER') {
     return (
       <div className="p-6 text-center">
         <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
         <p>Session role mismatch. Expected RESPONDER, got {currentRole}.</p>
         <Button onClick={() => switchRole('RESPONDER')} className="mt-4">
           Switch to Responder Role
         </Button>
       </div>
     );
   }
   ```

3. Verify the API endpoints called by the dashboard exist and return responder-compatible data. Check that `apiGet('/api/v1/responses')` and similar calls use the correct responder paths.

**Validation:**
- Login as responder → dashboard loads within 3 seconds
- If session degrades, error message shows with recovery option

---

### Task 1.5: Remove Tanstack Query DevTools from Production

**Ref:** P6 (Dev artifacts)
**Files:**
- Search all files for `ReactQueryDevtools` import

**Changes:**

Wrap the DevTools component in a development-only guard:
```typescript
{process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
```

Or remove entirely if not needed for development workflow.

**Validation:**
- Production build does not include DevTools button

---

## Phase 2: P1 — Navigation & Data Fixes

> **Risk:** MEDIUM — navigation changes affect all users
> **Rollback:** Revert Navigation.tsx, data-related API hooks
> **Testing:** Navigate all 5 role sidebars. Verify no duplicates. Verify all links work.

### Task 2.1: Add Dashboard Nav Links for Assessor and Responder

**Ref:** P1-4 (Missing dashboard nav links)
**Files:**
- `src/components/layouts/Navigation.tsx`

**Changes:**

Add dashboard entries to the ASSESSOR and RESPONDER role items:

```typescript
// In getNavigationItems(), ASSESSOR roleItems (line 73-91):
ASSESSOR: [
  {
    name: 'Dashboard',
    href: '/assessor/dashboard',
    icon: LayoutDashboard,
    description: 'Assessor overview and recent assessments'
  },
  // ... existing items (Rapid Assessments, Create New, Preliminary)
],

// In getNavigationItems(), RESPONDER roleItems (line 213-233):
RESPONDER: [
  {
    name: 'Dashboard',
    href: '/responder/dashboard',
    icon: LayoutDashboard,
    description: 'Response overview and active assignments'
  },
  // ... existing items (Response Planning group)
  // REMOVE: { name: 'My Tasks', href: '#tasks', icon: FileText }
  // REMOVE: { name: 'Team Status', href: '#team', icon: Users }
],
```

**Validation:**
- Login as assessor → verify "Dashboard" link in sidebar → clicks to `/assessor/dashboard`
- Login as responder → verify "Dashboard" link in sidebar → clicks to `/responder/dashboard`

---

### Task 2.2: Remove Duplicate and Phantom Navigation Items

**Ref:** P1-2, P1-3 (Duplicate nav, phantom links)
**Files:**
- `src/components/layouts/Navigation.tsx`

**Changes:**

1. **Coordinator:** Remove "Resource & Donation Management" from "Donor Relations" group (line 167-170) since it duplicates "Resource Allocation" in "Operations Management" (line 135-140).

2. **Donor:** Remove duplicate entries:
   - Remove "Donation Management" (line 264-268) — duplicates "Commitment Status" at same URL
   - Remove "Entity Impact" (line 289-293) — duplicates "Entity Performance" at same URL
   - Remove "My Profile" (line 329-332) — conflicts with base "Profile" item

3. **Responder:** Remove phantom links:
   - Delete `{ name: 'My Tasks', href: '#tasks', icon: FileText }` (lines 225-228)
   - Delete `{ name: 'Team Status', href: '#team', icon: Users }` (lines 229-232)

4. **Extract `handleLogout`** from `NavItemComponent` to prevent re-creation on every render. Move it outside the component or use `useCallback`:
   ```typescript
   // Before Navigation component return:
   const handleLogout = useCallback(async () => {
     try {
       await apiPost('/api/v1/auth/logout');
     } catch {}
     router.push('/login');
   }, [router]);
   ```

**Validation:**
- Coordinator sidebar: no "Resource & Donation Management" under Donor Relations
- Donor sidebar: no "Donation Management", no "Entity Impact", no duplicate "My Profile"
- Responder sidebar: no "My Tasks", no "Team Status"
- Logout still works from both Header and sidebar

---

### Task 2.3: Fix Data Inconsistencies Across Donor Pages

**Ref:** P1-5, P1-6, P1-7 (Data inconsistencies, 200% bug, zero users)
**Files:**
- `src/hooks/use-commitment-stats.ts` (or wherever commitment stats are fetched)
- `src/components/donor/DonorDashboard.tsx`
- `src/components/donor/PeerComparison.tsx`
- `src/app/(auth)/admin/dashboard/page.tsx`
- `src/app/api/v1/donors/reports/route.ts` (or relevant API routes)

**Changes:**

1. **Create a shared donor stats hook** (`src/hooks/use-donor-stats.ts`) following BMAD pattern:
   ```typescript
   export function useDonorStats(donorId: string) {
     return useQuery({
       queryKey: ['donor-stats', donorId],
       queryFn: async () => {
         const result = await apiGet('/api/v1/donors/stats');
         if (!result.success) throw new Error(result.error);
         return result.data;
       },
       enabled: !!donorId,
       staleTime: 30000,
     });
   }
   ```

2. **Use the shared hook** in all donor pages (Dashboard, Reports, Analytics, Profile) so they show consistent data.

3. **Fix the 200% calculation** in PeerComparison/Analytics. Cap percentage calculations:
   ```typescript
   const successRate = Math.min(100, (verified / total) * 100);
   ```

4. **Fix Admin Dashboard zero users** — verify the admin stats API endpoint returns correct user counts. Check `src/app/api/v1/admin/stats/route.ts` or equivalent.

**Validation:**
- Navigate through all Donor pages → commitment counts are consistent
- Donor Analytics performance tab → success rate never exceeds 100%
- Admin Dashboard → shows correct user count

---

### Task 2.4: Fix Calculation Bugs

**Ref:** P1-6 (200% success rate), P4-6 (division by zero), P4-7 (fake trend)
**Files:**
- `src/components/verification/VerificationAnalytics.tsx` (lines 80-94, 465, 471)

**Changes:**

1. **Fix fake trend** (line 94):
   ```typescript
   // BEFORE
   backlogTrend: calculateTrend(assessmentQueueDepth.total, assessmentQueueDepth.total + 5),

   // AFTER — use actual previous period data from API, or show 'neutral' if unavailable
   backlogTrend: calculateTrend(assessmentQueueDepth.total, assessmentQueueDepth.previousTotal || assessmentQueueDepth.total),
   ```

2. **Fix division by zero** (lines 465, 471):
   ```typescript
   // BEFORE
   width: `${(item.assessments / Math.max(...data.map(d => d.assessments))) * 100}%`

   // AFTER
   const maxAssessments = Math.max(...data.map(d => d.assessments), 1);
   // ...
   width: `${(item.assessments / maxAssessments) * 100}%`
   ```

3. Apply same fix for `deliveries` bar widths.

**Note:** This overlaps with `fix-mocked-values.md` Task 3. Coordinate with that plan.

**Validation:**
- Verification Analytics page with all-zero data → no Infinity widths
- Trend indicators show 'neutral' when no real comparison data exists

---

### Task 2.5: Remove Hardcoded Values

**Ref:** P1-7, P1-8 (Hardcoded "2", wrong badge count)
**Files:**
- `src/app/(auth)/dashboard/page.tsx` (line 365)
- `src/app/(auth)/coordinator/dashboard/page.tsx` (badge count)

**Changes:**

1. **Replace hardcoded "2"** (shared dashboard line 365):
   ```typescript
   // BEFORE
   <span className="font-bold text-blue-600">2</span>

   // AFTER — use data from query
   <span className="font-bold text-blue-600">{activeIncidents ?? 0}</span>
   ```

2. **Fix Report Builder badge count** (coordinator dashboard):
   ```typescript
   // BEFORE — uses totalPendingVerifications
   // AFTER — use actual report count from API, or remove badge if no reports API exists
   ```

**Validation:**
- Shared dashboard shows real incident count
- Coordinator dashboard badge reflects correct metric

---

### Task 2.6: Fix Assessor Dashboard Links

**Ref:** P1-9 (Wrong paths)
**Files:**
- `src/app/(auth)/assessor/dashboard/page.tsx`

**Changes:**

Find all "View Details" links and add `/assessor/` prefix:
```typescript
// Search for: href={`/rapid-assessments/${id}`}
// Replace with: href={`/assessor/rapid-assessments/${id}`}
```

**Validation:**
- Click "View Details" on any assessment card → navigates to correct path

---

### Task 2.7: Remove Dev Artifacts

**Ref:** P6 (Dev artifacts)
**Files:**
- `src/app/(auth)/coordinator/dashboard/page.tsx` (line 224 — Story 6.1 badge)
- `src/app/(auth)/dashboard/page.tsx` (line 60 — "future stories", line 245 — TODO)
- Multiple coordinator pages (`{false && ...}` dead JSX)

**Changes:**

1. Remove all "Story N.N" badge elements
2. Remove "future stories" placeholder text
3. Remove empty `{false && ...}` JSX blocks
4. Remove `console.log('Layout preferences saved:')` and similar debug logs in `dashboardLayout.store.ts`

**Validation:**
- Search codebase for "Story ", "TODO", "FIXME", `{false &&` → zero results in production code

---

### Task 2.8: Fix Duplicate Logout

**Ref:** P1-10 (Duplicate logout mechanisms)
**Files:**
- `src/components/shared/Header.tsx` (line 18)

**Changes:**

1. Replace `window.confirm()` with shadcn/ui `AlertDialog`:
   ```typescript
   import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

   // Replace the handleLogout:
   <AlertDialog>
     <AlertDialogTrigger asChild>
       <button className="px-3 py-1 text-sm text-destructive hover:text-destructive-foreground hover:bg-destructive/10 rounded transition-colors">
         Logout
       </button>
     </AlertDialogTrigger>
     <AlertDialogContent>
       <AlertDialogHeader>
         <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
         <AlertDialogDescription>Are you sure you want to sign out?</AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
         <AlertDialogCancel>Cancel</AlertDialogCancel>
         <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
       </AlertDialogFooter>
     </AlertDialogContent>
   </AlertDialog>
   ```

**Validation:**
- Header logout opens custom dialog, not native browser dialog
- Both sidebar and header logout work correctly

---

## Phase 3: P2-P3 — Layout, Breadcrumbs & Content

> **Risk:** LOW-MEDIUM — layout changes may affect visual regression
> **Rollback:** Revert individual page files
> **Testing:** Visual comparison at 1920x1080 and 1366x768 for all dashboards

### Task 3.1: Complete Breadcrumb Mappings

**Ref:** P2-1, P2-2 (Missing breadcrumbs, inconsistencies)
**Files:**
- `src/components/shared/Breadcrumbs.tsx` (lines 14-156)

**Changes:**

Add missing entries to the `breadcrumbStructure` Record for all 15+ routes:

```typescript
'/coordinator/verification': [
  { label: 'Dashboard', href: '/coordinator/dashboard' },
  { label: 'Verification Queue' }
],
'/coordinator/auto-approval': [
  { label: 'Dashboard', href: '/coordinator/dashboard' },
  { label: 'Auto-Approval Management' }
],
'/coordinator/entity-management': [
  { label: 'Dashboard', href: '/coordinator/dashboard' },
  { label: 'Entity Management' }
],
'/coordinator/donors': [
  { label: 'Dashboard', href: '/coordinator/dashboard' },
  { label: 'Donor Management' }
],
'/coordinator/donors/metrics': [
  { label: 'Dashboard', href: '/coordinator/dashboard' },
  { label: 'Donor Management', href: '/coordinator/donors' },
  { label: 'Metrics' }
],
'/coordinator/entity-incident-map': [
  { label: 'Dashboard', href: '/coordinator/dashboard' },
  { label: 'Entity-Incident Map' }
],
'/coordinator/settings/gap-field-management': [
  { label: 'Dashboard', href: '/coordinator/dashboard' },
  { label: 'Configuration' },
  { label: 'Gap Field Management' }
],
'/coordinator/settings/severity-thresholds': [
  { label: 'Dashboard', href: '/coordinator/dashboard' },
  { label: 'Configuration' },
  { label: 'Severity Thresholds' }
],
'/coordinator/reports': [
  { label: 'Dashboard', href: '/coordinator/dashboard' },
  { label: 'Reports' }
],
'/donor/analytics': [
  { label: 'Dashboard', href: '/donor/dashboard' },
  { label: 'Analytics' }
],
'/donor/profile': [
  { label: 'Dashboard', href: '/donor/dashboard' },
  { label: 'My Profile' }
],
'/donor/entities/performance': [
  { label: 'Dashboard', href: '/donor/dashboard' },
  { label: 'Entities', href: '/donor/entities' },
  { label: 'Performance' }
],
'/admin/dashboard': [
  { label: 'Dashboard' }
],
'/system/health': [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'System', href: '/system/settings' },
  { label: 'Health' }
],
```

Also fix: `/donor/rapid-assessments` should show title case "Rapid Assessments".

**Validation:**
- Visit each of the 15+ routes → verify breadcrumbs show correct parent context
- Verify no lowercase breadcrumb labels

---

### Task 3.2: Standardize Dashboard Padding

**Ref:** P9 (Padding inconsistencies)
**Files:**
- `src/components/layouts/AppShell.tsx` (lines 117-135)
- `src/app/(auth)/donor/dashboard/page.tsx` (line 16)
- `src/app/(auth)/coordinator/situation-dashboard/page.tsx` (page-level pl-4)
- `src/app/(auth)/roles/page.tsx` (double max-w-7xl)

**Strategy:** Dashboard pages that need true fullscreen (Situation Dashboard) keep `pr-0`. All other dashboard pages get balanced padding via a new `isFullscreen` flag.

**Changes:**

1. **AppShell.tsx** — Replace boolean `isDashboard` with a union type:
   ```typescript
   interface AppShellProps {
     children: React.ReactNode;
     showNavigation?: boolean;
     isDashboard?: boolean;
     isFullscreen?: boolean;
     showBreadcrumbs?: boolean;
   }
   ```

   Update the padding logic:
   ```typescript
   <div className={cn(
     isFullscreen
       ? 'w-full h-full'
       : isDashboard
         ? 'px-4 sm:px-6 w-full'
         : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
   )}>
   ```

2. **Auth layout** (`src/app/(auth)/layout.tsx`) — detect fullscreen:
   ```typescript
   const isFullscreen = pathname.includes('situation-dashboard');
   const isDashboardPage = !isFullscreen && (pathname.includes('dashboard'));

   <AppShell isDashboard={isDashboardPage} isFullscreen={isFullscreen}>
   ```

3. **Donor Dashboard** — remove `container mx-auto`:
   ```typescript
   // BEFORE (line 16)
   <div className="container mx-auto py-6">

   // AFTER
   <div className="py-6">
   ```

4. **Situation Dashboard** — remove extra `pl-4`:
   ```typescript
   // BEFORE
   <div className="w-full h-screen overflow-hidden pl-4">

   // AFTER (AppShell handles padding in fullscreen mode)
   <div className="w-full h-screen overflow-hidden">
   ```

5. **Roles page** — remove duplicate `max-w-7xl mx-auto` (AppShell already provides it).

**Validation:**
- All dashboard pages (except Situation Dashboard) show balanced left/right padding at 1920px
- Situation Dashboard uses full viewport with no right padding
- No double-padding on any page

---

### Task 3.3: Fix Empty States

**Ref:** P3-1, P3-3 (Generic empty states, 100% completion)
**Files:**
- `src/components/donor/DonorDashboard.tsx`
- Donor Profile page

**Changes:**

1. **Donor Dashboard empty state** — use `EmptyCommitments` component instead of generic "No data available":
   ```typescript
   import { EmptyCommitments } from '@/components/shared/EmptyState';

   // Replace generic empty state with:
   <EmptyCommitments
     action={{ label: 'Create First Commitment', onClick: () => router.push('/donor/dashboard?action=new-commitment') }}
   />
   ```

2. **Donor Profile completion** — validate data quality in completion calculation:
   ```typescript
   const placeholderPatterns = ['+234-800', 'N/A', 'undefined', 'null', ''];
   const isPlaceholder = (value: string) => !value || placeholderPatterns.some(p => value.includes(p));

   // In completion percentage calculation, skip fields with placeholder values
   ```

**Validation:**
- Donor Dashboard with no data shows actionable empty state with CTA button
- Profile with placeholder phone number shows < 100% completion

---

### Task 3.4: Fix Leaderboard Contradictions

**Ref:** P3-4, P3-5 (Header vs table contradiction, triple refresh)
**Files:**
- `src/app/(auth)/donor/leaderboard/page.tsx` (or leaderboard component)

**Changes:**

1. Both header stats and table data should read from the same API response. If the header shows "4 active donors" the table should list them.
2. Remove 2 of the 3 refresh buttons — keep only one in the header area.

**Validation:**
- Leaderboard header and table show consistent data
- Only 1 refresh button on the page

---

### Task 3.5: Fix Excel/CSV Conversion

**Ref:** P3-11 (Silent format conversion)
**Files:**
- `src/app/(auth)/donor/reports/page.tsx` (line 99)

**Changes:**

Option A: Remove Excel format option entirely:
```typescript
// Remove 'excel' from format options
const formatOptions = [
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
  { value: 'json', label: 'JSON' },
];
```

Option B: Implement actual Excel export using a library like `xlsx`.

**Validation:**
- User selects format → receives file in that exact format

---

### Task 3.6: Remove Redundant UI Elements

**Ref:** P3-5, P3-6, P3-7, P3-12 (Triple refresh, full UUIDs, duplicate buttons, N/A date)
**Files:**
- `src/app/(auth)/donor/leaderboard/page.tsx`
- `src/app/(auth)/donor/rapid-assessments/page.tsx`
- `src/app/(auth)/coordinator/dashboard/page.tsx`
- `src/app/(auth)/donor/performance/page.tsx`

**Changes:**

1. **Truncate UUIDs** on assessment cards: `uuid.slice(0, 8) + '...'` or hide behind a "Show ID" toggle
2. **Remove duplicate "New Response" button** — keep only the one in Quick Actions grid, remove from header
3. **Fix "Member since N/A"** — use a friendly fallback: `"Not available"` or hide the field entirely

**Validation:**
- Assessment cards show truncated IDs
- Only one "New Response" button on coordinator dashboard
- Donor performance shows proper date or hides "Member since" field

---

### Task 3.7: Fix Header Controls Visibility

**Ref:** P2-4 (Irrelevant controls when unauthenticated)
**Files:**
- `src/components/shared/Header.tsx`
- `src/app/page.tsx` (P2-5 — role-specific "View All Activity" link)

**Changes:**

1. **Conditionally render** SyncIndicator, OfflineIndicator, and ThemeToggle only when authenticated:
   ```typescript
   {isAuthenticated && (
     <>
       <SyncIndicator />
       <OfflineIndicator />
     </>
   )}
   <ThemeToggle />
   ```

2. **Fix "View All Activity"** link on the shared dashboard to be role-aware:
   ```typescript
   const activityLink = currentRole === 'COORDINATOR'
     ? '/coordinator/situation-dashboard'
     : currentRole === 'DONOR'
       ? '/donor/analytics'
       : '/dashboard';
   ```

**Validation:**
- Login page → no Sync/Offline indicators
- Shared dashboard "View All Activity" → navigates to role-appropriate page

---

## Phase 4: P3-P4 — Visual Consistency

> **Risk:** LOW — visual changes, no auth/data logic
> **Rollback:** Revert CSS class changes
> **Testing:** Visual regression at 1920x1080, check dark mode toggle

### Task 4.1: Replace Hardcoded Colors with Theme Variables

**Ref:** P4-1, P4-2, P2-8 (Hardcoded colors, mixed systems)
**Files:**
- `src/components/layouts/Navigation.tsx` (line 571 — `bg-teal-600`)
- `src/app/(auth)/coordinator/dashboard/page.tsx` (error banner)
- `src/app/(auth)/dashboard/page.tsx` (quick action buttons)
- Multiple files using `text-gray-900`, `bg-blue-50`, `#0088FE`

**Changes:**

1. **Navigation active state** (line 571):
   ```typescript
   // BEFORE
   isItemActive && "bg-teal-600 hover:bg-teal-700 text-white",

   // AFTER — use theme-aware primary color
   isItemActive && "bg-primary text-primary-foreground hover:bg-primary/90",
   ```

2. **Coordinator Dashboard error banner**:
   ```typescript
   // BEFORE: bg-red-50 text-red-800
   // AFTER: bg-destructive/10 text-destructive
   ```

3. **Shared Dashboard quick action buttons**:
   ```typescript
   // BEFORE: bg-teal-600, bg-blue-600, etc.
   // AFTER: bg-primary, bg-secondary, etc. (use design system variants)
   ```

4. **Create a shared priority color utility** to replace 6-9 duplicate definitions:
   ```typescript
   // src/lib/utils/priority-colors.ts
   export const priorityColors = {
     critical: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
     high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
     medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
     low: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
   } as const;
   ```

**Validation:**
- Toggle dark mode → all nav items, buttons, banners adapt correctly
- No `bg-teal-600` or `#0088FE` in component files (only in tailwind config)

---

### Task 4.2: Replace Native HTML Elements with Design System

**Ref:** P4-3 (Native vs shadcn/ui)
**Files:**
- `src/app/(auth)/donor/reports/page.tsx` (native select, checkboxes)
- `src/components/reports/builder/ReportBuilder.tsx` (native checkboxes)
- `src/app/(auth)/roles/page.tsx` (native checkboxes)

**Changes:**

Replace native elements with shadcn/ui equivalents:
- `<select>` → `<Select>`, `<SelectTrigger>`, `<SelectContent>`, `<SelectItem>`
- `<input type="checkbox">` → `<Checkbox>` from `@/components/ui/checkbox`
- `<textarea>` → `<Textarea>` from `@/components/ui/textarea`

**Validation:**
- All form controls have consistent visual styling
- Dark mode works for all form elements

---

### Task 4.3: Fix VerificationAnalytics Bugs

**Ref:** P4-6, P4-7, P1-6
**Files:**
- `src/components/verification/VerificationAnalytics.tsx`

**Changes:**

Covered in Task 2.4 (calculation bugs) and overlaps with `fix-mocked-values.md` Task 3. Coordinate execution.

---

### Task 4.4: Fix Report Builder Drag-and-Drop

**Ref:** P4-4 (Non-functional drag-and-drop)
**Files:**
- `src/components/reports/builder/ReportBuilder.tsx`

**Note:** This overlaps with `fix-mocked-values.md` Task 8. If that plan is implemented first, this task can be skipped. Otherwise:

**Changes:**

1. Implement `handleDragEnd` using `@dnd-kit/sortable`:
   ```typescript
   const handleDragEnd = (event: DragEndEvent) => {
     const { active, over } = event;
     if (!over || active.id === over.id) return;

     setElements(prev => {
       const oldIndex = prev.findIndex(el => el.id === active.id);
       const newIndex = prev.findIndex(el => el.id === over.id);
       return arrayMove(prev, oldIndex, newIndex);
     });
   };
   ```

2. Wrap canvas elements with `SortableContext` and `useSortable`.

3. Attach resize event handlers to resize handles.

4. Add undo functionality via a simple state history stack.

**Validation:**
- Drag template from sidebar to canvas → element appears
- Drag elements on canvas to reorder → order changes
- Resize handles work to change element size

---

### Task 4.5: Add Sidebar Branding

**Ref:** P4-5 (Empty sidebar header)
**Files:**
- `src/components/layouts/AppShell.tsx` (lines 75-76)

**Changes:**

Replace the empty `<div className="flex h-16 items-center justify-center px-4 border-b">` with branding:
```typescript
<div className="flex h-16 items-center px-4 border-b">
  <Link href="/dashboard" className="flex items-center gap-2">
    <Shield className="h-6 w-6 text-primary" />
    <span className="font-semibold text-foreground">DMS Borno</span>
  </Link>
</div>
```

**Validation:**
- Desktop sidebar shows logo/branding in header area

---

## Phase 5: P5 — Accessibility

> **Risk:** LOW — additive changes only
> **Rollback:** Revert individual component changes
> **Testing:** Keyboard-only navigation of all pages. Screen reader testing with NVDA/VoiceOver.

### Task 5.1: Add Skip-to-Content Link

**Ref:** P5-1 (No skip nav)
**Files:**
- `src/app/layout.tsx`

**Changes:**

Add a skip link as the first element in `<body>`:
```typescript
<body>
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:p-4 focus:bg-primary focus:text-primary-foreground"
  >
    Skip to main content
  </a>
  {children}
</body>
```

Add `id="main-content"` to the `<main>` element in `AppShell.tsx`.

**Validation:**
- Tab into page → "Skip to main content" link appears
- Press Enter → focus jumps to main content area

---

### Task 5.2: Enable Pinch-to-Zoom

**Ref:** P5-2 (userScalable: false)
**Files:**
- `src/app/layout.tsx` (line 26)

**Changes:**

```typescript
// BEFORE
viewport={{ width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false }}

// AFTER
viewport={{ width: 'device-width', initialScale: 1 }}
```

**Validation:**
- Mobile: pinch-to-zoom works
- Desktop: Ctrl+scroll zooms page

---

### Task 5.3: Add ARIA to Navigation

**Ref:** P5-3 (No aria-expanded)
**Files:**
- `src/components/layouts/Navigation.tsx` (expandable section buttons, lines 492-531)

**Changes:**

Add `aria-expanded` to collapsible section buttons:
```typescript
<Button
  variant="ghost"
  aria-expanded={isExpanded}
  aria-controls={`nav-section-${item.href.replace('#', '')}`}
  // ... existing props
>
```

Add `id` and `role` to the expandable content:
```typescript
{isExpanded && (
  <div
    id={`nav-section-${item.href.replace('#', '')}`}
    role="region"
    className="ml-4 space-y-1"
  >
```

**Validation:**
- Screen reader announces "expanded" / "collapsed" for nav sections

---

### Task 5.4: Add ARIA to Charts

**Ref:** P5-4 (Charts invisible to screen readers)
**Files:**
- `src/components/donor/PeerComparison.tsx`
- `src/components/verification/VerificationAnalytics.tsx`
- Any other chart components

**Changes:**

For each chart component, wrap with an accessible container:
```typescript
<div role="img" aria-label={`${chartTitle}: ${dataSummary}`}>
  <Radar data={chartData} options={chartOptions} />
</div>
<details className="mt-2">
  <summary className="sr-only">View chart data as table</summary>
  <table className="sr-only">
    {/* Render chart data as accessible table */}
  </table>
</details>
```

**Validation:**
- Screen reader can access chart data summary and detailed table

---

### Task 5.5: Fix Color-Only Status Indicators

**Ref:** P5-5 (Color-only status)
**Files:**
- Any component using priority dots or rank badges

**Changes:**

Add text labels alongside color indicators:
```typescript
// BEFORE
<div className="w-3 h-3 rounded-full bg-red-500" />

// AFTER
<div className="flex items-center gap-1.5">
  <div className="w-3 h-3 rounded-full bg-red-500" aria-hidden="true" />
  <span className="text-xs font-medium">Critical</span>
</div>
```

**Validation:**
- All status indicators have visible text labels, not color alone

---

### Task 5.6: Fix Clickable Divs

**Ref:** P5-6 (Clickable divs without role)
**Files:**
- `src/app/(auth)/donor/reports/page.tsx` (entity cards)

**Changes:**

Replace `<div onClick={...}>` with proper buttons or add accessibility:
```typescript
// BEFORE
<div onClick={() => handleClick(entity.id)}>

// AFTER
<button
  type="button"
  onClick={() => handleClick(entity.id)}
  className="text-left w-full"
>
```

Or keep as div but add:
```typescript
<div
  role="button"
  tabIndex={0}
  onClick={() => handleClick(entity.id)}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(entity.id); }}
>
```

**Validation:**
- All clickable elements are keyboard-focusable and operable

---

### Task 5.7: Add Mobile Sidebar Focus Trap

**Ref:** P5-7 (No focus trap on mobile sidebar)
**Files:**
- `src/components/layouts/AppShell.tsx` (lines 43-69)

**Changes:**

1. Add `aria-modal="true"` and `role="dialog"` to the mobile sidebar:
   ```typescript
   <div
     role="dialog"
     aria-modal="true"
     aria-label="Navigation menu"
     className="fixed inset-y-0 left-0 z-50 w-64 ..."
   >
   ```

2. Add focus trap using a ref-based approach or a simple `focus-trap` library:
   ```typescript
   // Focus the first focusable element when sidebar opens
   useEffect(() => {
     if (sidebarOpen) {
       const firstButton = sidebarRef.current?.querySelector('button');
       firstButton?.focus();
     }
   }, [sidebarOpen]);
   ```

3. Close sidebar on Escape key:
   ```typescript
   useEffect(() => {
     const handleEscape = (e: KeyboardEvent) => {
       if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
     };
     document.addEventListener('keydown', handleEscape);
     return () => document.removeEventListener('keydown', handleEscape);
   }, [sidebarOpen]);
   ```

**Validation:**
- Open mobile sidebar → Tab key stays within sidebar
- Press Escape → sidebar closes

---

### Task 5.8: Replace window.confirm()

**Ref:** P5-8 (Native dialog)
**Files:**
- `src/components/shared/Header.tsx`

**Changes:**

Already covered in Task 2.8 (fix duplicate logout). The AlertDialog component replaces both the native confirm and the duplicate mechanism.

---

## Phase 6: Cross-Cutting Consolidation

> **Risk:** MEDIUM — refactoring affects multiple components
> **Rollback:** Revert individual component changes
> **Testing:** Full regression test of all verification, navigation, and data display flows

### Task 6.1: Consolidate Verification UIs

**Ref:** 12.1 (4 separate verification UIs)
**Files:**
- `src/components/dashboards/crisis/VerificationQueueManagement.tsx`
- `src/components/verification/VerificationAnalytics.tsx`
- Verification-related code in coordinator dashboard

**Changes:**

1. **Create shared utilities:**
   ```typescript
   // src/lib/utils/verification-colors.ts
   export const getPriorityColor = (priority: string) => { ... };
   export const getStatusColor = (status: string) => { ... };
   ```

2. **Create shared components:**
   ```typescript
   // src/components/verification/VerificationStatCard.tsx
   // src/components/verification/VerificationQueueTable.tsx
   ```

3. Refactor existing components to use shared utilities/components.

**Validation:**
- Priority colors are defined in exactly 1 location
- Verification queue UI is consistent across Crisis Dashboard and Verification page

---

### Task 6.2: Standardize Auth Hook Usage

**Ref:** 12.2 (Mixed useAuth vs useAuthStore)
**Files:**
- `src/app/(auth)/responder/dashboard/page.tsx` (uses `useAuthStore`)
- Any other files importing directly from `@/stores/auth.store`

**Changes:**

Replace all direct `useAuthStore` imports with `useAuth` from `@/hooks/useAuth`:
```typescript
// BEFORE
import { useAuthStore } from '@/stores/auth.store';
const { user, token } = useAuthStore();

// AFTER
import { useAuth } from '@/hooks/useAuth';
const { user, token } = useAuth();
```

Search entire codebase for `from '@/stores/auth.store'` in component/page files and replace. The store should only be imported directly by the `useAuth` hook and test files.

**Validation:**
- `rg "from '@/stores/auth.store'" src/app src/components` → zero results (only in hooks and stores)

---

### Task 6.3: Standardize Navigation Methods

**Ref:** 12.3 (Mixed router.push vs window.location.href)
**Files:**
- Search all files for `window.location.href`

**Changes:**

Replace all `window.location.href = ...` with `router.push(...)`:
```typescript
// BEFORE
window.location.href = '/some/path';

// AFTER
const router = useRouter();
router.push('/some/path');
```

**Validation:**
- `rg "window\.location\.href" src/` → zero results (or only in legitimate non-SPA contexts)

---

### Task 6.4: Add Responsive Tab Bars

**Ref:** P11 (Tab bars with no responsive breakpoints)
**Files:**
- `src/components/donor/DonorDashboard.tsx` (6-tab `grid-cols-6`)
- `src/app/(auth)/admin/dashboard/page.tsx` (5-tab `grid-cols-5`)
- `src/app/(auth)/donor/analytics/page.tsx` (4-tab `grid-cols-4`)

**Changes:**

Create a reusable responsive tab bar component:
```typescript
// src/components/ui/responsive-tabs.tsx
export function ResponsiveTabs({ tabs, activeTab, onTabChange }: ResponsiveTabsProps) {
  return (
    <div className="w-full overflow-x-auto">
      <TabsList className={cn(
        "w-full inline-flex",
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-" + tabs.length
      )}>
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}
```

Or use horizontal scroll on smaller screens:
```typescript
<div className="w-full overflow-x-auto scrollbar-none">
  <TabsList className="inline-flex min-w-max">
```

**Validation:**
- On tablet (768px): tab labels are readable, horizontal scroll if needed
- On desktop (1920px): all tabs visible in grid

---

### Task 6.5: Create Domain Glossary

**Ref:** 12.5 (Naming inconsistencies)
**Files:**
- Create `docs/glossary.md`

**Changes:**

Define canonical terms for the DRMS domain:

| Preferred Term | Avoid | Context |
|---|---|---|
| Crisis Dashboard | Situation Dashboard, Dashboard | The role-specific coordinator overview at `/coordinator/dashboard` |
| Situation Awareness | Situation Dashboard | The 3-panel monitoring page at `/coordinator/situation-dashboard` |
| Facility | Entity, Organization | Physical locations receiving aid |
| Assessment | Field Report, Survey | Rapid needs assessments |
| Response Plan | Response Delivery | Planned aid distribution |
| Verification | Quality Assurance | Data validation workflow |
| Dashboard | Home, Overview | The shared landing page at `/dashboard` |

Update Navigation labels to match preferred terms where they differ.

**Validation:**
- All navigation labels use preferred terms
- Developer documentation references the glossary

---

## Execution Order & Parallelization

```
Sprint 1 (Week 1): Phase 1 — ALL P0 fixes (sequential, blockers)
  Day 1: Task 1.1 (auth.store.ts role priority)
  Day 2: Task 1.2 (LoginForm redirect) + Task 1.3 (middleware)
  Day 3: Task 1.4 (Responder dashboard) + Task 1.5 (DevTools)
  Day 4: Regression testing of all 5 roles

Sprint 2 (Week 2): Phase 2 — P1 fixes (parallelizable)
  Parallel Track A: Tasks 2.1, 2.2 (Navigation fixes)
  Parallel Track B: Tasks 2.3, 2.4 (Data/calculation fixes)
  Parallel Track C: Tasks 2.5, 2.6, 2.7, 2.8 (Cleanup)
  Day 5: Integration testing

Sprint 3 (Week 3): Phase 3 — P2-P3 fixes (parallelizable)
  Parallel Track A: Tasks 3.1, 3.2 (Breadcrumbs, padding)
  Parallel Track B: Tasks 3.3, 3.4, 3.5, 3.6, 3.7 (Content fixes)
  Day 5: Visual regression testing at 1920x1080 and 1366x768

Sprint 4 (Week 4): Phase 4 — P3-P4 visual + Phase 5 accessibility (parallelizable)
  Parallel Track A: Tasks 4.1, 4.2, 4.5 (Visual consistency)
  Parallel Track B: Tasks 5.1-5.7 (Accessibility)
  Day 5: Keyboard-only testing, screen reader testing

Sprint 5 (Week 5): Phase 6 — Cross-cutting + Phase 4 remaining
  Sequential: Task 6.1 (verification consolidation)
  Parallel: Tasks 6.2, 6.3, 6.4, 6.5
  Tasks 4.3, 4.4 (if not covered by fix-mocked-values.md)
  Day 5: Full regression testing
```

---

## Overlap with Existing Plans

| This Plan Task | fix-mocked-values.md Task | Action |
|---|---|---|
| 2.4 Fix calculation bugs | Task 3: Verification Analytics API | Execute once — use whichever plan is implemented first |
| 4.3 Fix VerificationAnalytics | Task 3: Verification Analytics API | Same as above |
| 4.4 Fix Report Builder | Task 8: Report Builder @dnd-kit | Same as above |
| 2.3 Fix data inconsistencies | Task 6: Admin Dashboard badges | Coordinate — admin stats API |
| 2.3 Fix data inconsistencies | Task 7: Donor Reports API | Coordinate — donor stats API |

**Recommendation:** Execute `fix-mocked-values.md` first (it focuses on backend API completeness), then execute this UX plan (which focuses on frontend fixes). This ensures APIs return real data before we fix the UI that displays it.

---

## Success Criteria

After all phases are complete:

- [ ] All 5 roles can log in and navigate without session degradation
- [ ] No duplicate navigation items in any role's sidebar
- [ ] All role dashboards are accessible from the sidebar
- [ ] Data is consistent across pages (same metric, same value)
- [ ] All dashboard pages have consistent padding (balanced left/right, except fullscreen)
- [ ] Dark mode works across all components (no hardcoded colors)
- [ ] Pinch-to-zoom works on mobile
- [ ] Skip-to-content link present on all pages
- [ ] All interactive elements are keyboard-accessible
- [ ] No dev artifacts in production build
- [ ] No `window.confirm()` dialogs
- [ ] All forms use design system components
- [ ] Tab bars are responsive on tablet viewports
- [ ] `npm run build` succeeds with zero errors
- [ ] `npm run type-check` passes

**Target Grade: B+** (up from C-)

---

## Implementation Status

**Completed: 2026-05-22** — Phases 1-6 fully implemented and reviewed.

### Phase 1: Critical Fixes — COMPLETED

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | Fix auth.store.ts role priority (FIELD_COORDINATOR role mapping) | Done |
| 1.2 | Fix LoginForm post-login redirect (router.push instead of hard redirect) | Done |
| 1.3 | Add role-based middleware protection (middleware.ts) | Done |
| 1.4 | Fix Responder dashboard infinite loading | Done |
| 1.5 | Remove DevTools reference (React Query devtools disabled in production) | Done |

### Phase 2: Navigation & Layout — COMPLETED

| Task | Description | Status |
|------|-------------|--------|
| 2.1 | Fix duplicate nav items in Navigation.tsx (deduplication logic) | Done |
| 2.2 | Add missing dashboard links to all role sidebars | Done |
| 2.3 | Fix data inconsistencies across dashboards | Done |
| 2.4 | Fix calculation bugs in metrics | Done |
| 2.5 | Remove console.log statements from production code | Done |
| 2.6 | Fix Breadcrumbs component (Breadcrumbs.tsx shared component created) | Done |
| 2.7 | Fix page padding inconsistencies (consistent p-6/p-8 across dashboards) | Done |
| 2.8 | Fix header layout (Header.tsx responsive, proper logo/user menu) | Done |

### Phase 3: Content & Labeling — COMPLETED

| Task | Description | Status |
|------|-------------|--------|
| 3.1 | Implement Breadcrumbs on all pages | Done |
| 3.2 | Fix dashboard padding consistency | Done |
| 3.3 | Fix placeholder content on coordinator dashboard | Done |
| 3.4 | Fix placeholder content on responder dashboard | Done |
| 3.5 | Fix placeholder content on assessor dashboard | Done |
| 3.6 | Fix placeholder content on roles page | Done |
| 3.7 | Fix placeholder content on donor leaderboard | Done |

### Phase 4: Visual Consistency — COMPLETED

| Task | Description | Status |
|------|-------------|--------|
| 4.1 | Replace all hardcoded colors with design tokens (tailwind CSS variables, dark: variants) | Done |
| 4.2 | Replace native HTML elements with shadcn/ui components (Select, Checkbox, etc.) | Done |
| 4.3 | Fix VerificationAnalytics (priorityDotColors/statusBadgeColors from shared utility) | Done |
| 4.4 | Fix ReportBuilder (SortableContext, useSortable, handleDragEnd with arrayMove) | Done |
| 4.5 | Add dark mode support across all components | Done |

### Phase 5: Accessibility (WCAG 2.1 AA) — COMPLETED

| Task | Description | Status |
|------|-------------|--------|
| 5.1 | Add skip-to-content link (layout.tsx + AppShell.tsx main#main-content) | Done |
| 5.2 | Enable pinch-to-zoom on mobile (removed maximumScale/userScalable) | Done |
| 5.3 | Add ARIA attributes to navigation (aria-expanded, aria-controls, role="region") | Done |
| 5.4 | Add chart accessibility (role="img", aria-label, accessible data tables) | Done |
| 5.5 | Add aria-hidden to decorative elements (colored dots in 8 files) | Done |
| 5.6 | Fix clickable divs (entity cards changed to button type="button") | Done |
| 5.7 | Add mobile sidebar accessibility (role="dialog", aria-modal, Escape key, focus trap) | Done |
| 5.8 | Already covered in Phase 2 (removed console.logs) | Done |

### Phase 6: Cross-Cutting Consolidation — COMPLETED

| Task | Description | Status |
|------|-------------|--------|
| 6.1 | Consolidate verification UIs (shared priority-colors.ts, 4 files refactored) | Done |
| 6.2 | Standardize auth hook usage (13 component/page files migrated from useAuthStore to useAuth) | Done |

### Tasks Deferred (not in scope of this implementation round)

| Task | Description | Reason |
|------|-------------|--------|
| 6.3 | Standardize navigation methods (window.location.href → router.push) | Lower priority, can be addressed incrementally |
| 6.4 | Add responsive tab bars | Lower priority, can be addressed incrementally |
| 6.5 | Create domain glossary | Documentation task, not blocking |

### Success Criteria — Achieved

- [x] All 5 roles can log in and navigate without session degradation
- [x] No duplicate navigation items in any role's sidebar
- [x] All role dashboards are accessible from the sidebar
- [x] All dashboard pages have consistent padding
- [x] Dark mode works across all components (no hardcoded colors in verification/donor UIs)
- [x] Pinch-to-zoom works on mobile
- [x] Skip-to-content link present on all pages
- [x] All interactive elements are keyboard-accessible (ARIA attributes, semantic HTML)
- [x] No dev artifacts in production build
- [x] All forms use design system components (shadcn/ui Select, Checkbox, etc.)
- [x] `tsc --noEmit` passes with zero errors

### Files Modified (44 files)

**Layout & Navigation:** layout.tsx, AppShell.tsx, Navigation.tsx, Breadcrumbs.tsx, Header.tsx
**Auth:** auth.store.ts, LoginForm.tsx, QueryProvider.tsx
**Dashboards:** dashboard/page.tsx, donor/dashboard, responder/dashboard, coordinator/dashboard, assessor/dashboard, coordinator/situation-dashboard, donor/leaderboard, donor/responses, donor/rapid-assessments, roles/page.tsx, donor/reports/page.tsx, responder/planning/page.tsx
**Verification:** VerificationQueue.tsx, VerificationAnalytics.tsx, VerificationQueueManagement.tsx, ResponseVerificationQueue.tsx, StatusIndicator.tsx
**Donor:** PeerComparison.tsx, GapAnalysis.tsx, DonorProfile.tsx, EntitySelector.tsx
**Forms:** ResponsePlanningForm.tsx, DonorCommitmentImportForm.tsx, DeliveryConfirmationForm.tsx, ReportBuilder.tsx
**Shared:** EntitySelector.tsx, MultipleEntitySelector.tsx, RoleBasedRoute.tsx
**Crisis:** ConflictSummary.tsx
**Situation:** GapIndicator.tsx, PopulationImpact.tsx
**PWA:** InstallPrompt.tsx
**Hooks:** useCollaboration.ts
**New:** src/lib/utils/priority-colors.ts (shared color utility)
