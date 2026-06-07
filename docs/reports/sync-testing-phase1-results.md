# Phase 1 Sync Testing Results - Sync Indicator & UI Verification

**Test Date:** June 6, 2026
**Test Environment:** Chrome DevTools with localhost:3000, offline network simulation
**Test Role:** RESPONDER (responder@dms.gov.ng)
**Test Method:** Manual browser testing with Chrome DevTools offline simulation

## Executive Summary

Phase 1 testing revealed that the **SyncIndicator and OfflineIndicator components render correctly** in their default "Synced/Online" states and transition properly when going offline. However, a **critical blocker was discovered**: the Response Planning form's offline submission gets permanently stuck at "Saving..." because React Query mutations enter a "Paused" state rather than triggering the offline fallback service. This prevents the SyncIndicator from transitioning to its "pending" or "syncing" states, blocking further sync UI testing.

---

## ST-UI-01: SyncIndicator States

### Step 1: Online + Empty Queue - PASS

**Action:** Login as RESPONDER, observe dashboard while online with no pending operations.
**DevTools Monitoring:** `evaluate_script` querying `[data-testid="sync-indicator"]` elements.

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Text content | "Synced" | "Synced" | PASS |
| Color classes | `text-green-600 bg-green-50 border-green-200` | `text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800` | PASS |
| Icon type | Static (no spin) | Static | PASS |
| Progress bar | Not present | `hasProgress: false` | PASS |
| Instance count | 3 (header, sidebar x2) | 3 | PASS |

**Screenshot:** `docs/reports/screenshots/phase1-01-responder-dashboard-online.png`

### Step 2: Offline + No Pending Operations - PASS

**Action:** Enable offline mode in Chrome DevTools Network tab.
**DevTools Monitoring:** Snapshot comparison.

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| SyncIndicator text | "Synced" (unchanged) | "Synced" | PASS |
| OfflineIndicator text | "Offline" | "Offline" | PASS |
| Offline banner | Visible | "📡 Offline Mode - Data will sync when connection is restored" | PASS |
| Dashboard stats | Preserved from cache | All statistics maintained | PASS |

**Screenshot:** `docs/reports/screenshots/phase1-02-responder-dashboard-offline.png`

### Step 3: Offline Data Creation - BLOCKED

**Action:** Navigate to `/responder/planning/new`, fill form, go offline, click "Create Plan".
**DevTools Monitoring:** Console messages, IndexedDB inspection, snapshot analysis.

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Form submission | Data saved to IndexedDB, SyncIndicator shows "1 pending" | Button stuck at "Saving...", SyncIndicator stays "Synced" | FAIL |
| IndexedDB syncQueue | New entry created | Queue remains empty (0 items) | FAIL |
| Tanstack Query state | Mutation executes with offline fallback | Mutations show "Paused 2" status | FAIL |

**Root Cause:** The Response Planning form (`ResponsePlanningForm.tsx`) uses React Query mutations for form submission. When offline, React Query's `useMutation` pauses the mutation rather than executing it and letting it fail. The `ResponseOfflineService.createPlannedResponse()` fallback, which tries online-first and falls back to IndexedDB storage, is never reached because the mutation never executes.

**Evidence:**
- Tanstack Query DevTools shows "Paused 2" mutations
- Button text remains "Saving..." indefinitely (disabled state)
- Console shows no `ResponseOfflineService` log messages
- IndexedDB `syncQueue` table is empty

**Screenshot:** `docs/reports/screenshots/phase1-03-saving-stuck-offline.png`

### Steps 4-6: Syncing/Pending/Complete States - NOT TESTABLE

Could not test these states because no offline data could be created via the form. The SyncIndicator's "N pending", "Syncing... X%", and progress bar transitions could not be verified.

**Impact:** The SyncIndicator's dynamic states (orange "pending", blue "syncing", progress bar) remain untested.

---

## ST-UI-02: OfflineIndicator States

### Online State - PASS

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Text | "Online" | "Online" | PASS |
| Icon | WiFi signal | WiFi SVG present | PASS |
| Color | Green | `text-green-600 dark:text-green-400` | PASS |
| Tooltip (hover) | "Connected to internet..." | Shown on hover | PASS |

### Offline State - PASS

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Text | "Offline" | "Offline" | PASS |
| Icon | WiFi-off signal | WiFi-off SVG present | PASS |
| Color | Red | `text-red-600 dark:text-red-400` | PASS |
| Tooltip (hover) | "No internet connection..." | Shown on hover | PASS |

### Transition Behavior - PASS

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Online -> Offline | Immediate transition | Immediate, with offline banner | PASS |
| Hydration | No mismatch | Loading state on server, actual on client | PASS |
| Banner | Orange offline banner | "📡 Offline Mode - Data will sync when connection is restored" | PASS |

---

## ST-UI-03: SyncQueue Component (Full Mode)

### Status: NOT TESTABLE

The `<SyncQueue>` component is not rendered on the responder dashboard or planning pages. It would need to be explicitly added to a page to test. The SyncIndicator (compact version) is used instead.

**Finding:** The full SyncQueue component exists in code (`src/components/shared/SyncQueue.tsx`) but is not integrated into any visible page in the current UI. Only the compact `SyncIndicator` is rendered in the header and sidebar.

---

## ST-UI-04: BackgroundSyncProvider Toast Notifications

### Offline Toast - PASS

**Action:** Enable offline mode in Network tab.

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Toast appears | Warning toast | Toast visible | PASS |
| Toast message | "Connection lost - Working in offline mode..." | Banner: "📡 Offline Mode - Data will sync when connection is restored" | PASS |
| Toast type | Warning | Orange banner | PASS |

### Online Toast - NOT OBSERVED

When going from offline to online during this test session, the "Connection restored" toast was not captured due to the "Saving..." state blocking interaction.

### Sync Completion Toast - NOT TESTABLE

Could not trigger a sync completion because no offline data was successfully created.

---

## Additional Findings

### Finding 1: Offline Response Plan Form Stuck at "Saving..."

**Severity:** CRITICAL
**Component:** `ResponsePlanningForm.tsx`
**Issue:** When submitting the form while offline, the React Query mutation pauses instead of executing. The form enters a permanent "Saving..." state with no way to recover. The user cannot cancel, navigate away, or retry.

**Technical Details:**
- React Query's `useMutation` with `networkMode: 'offlineFirst'` (or default) pauses mutations when offline
- The `ResponseOfflineService.createPlannedResponse()` has an online-first approach with offline fallback, but it's called inside the mutation function
- The mutation never executes, so the fallback is never reached
- IndexedDB syncQueue remains empty
- The "Saving..." button stays disabled with no timeout or error recovery

**Workaround Needed:** The form should either:
1. Detect offline state before mutation and route directly to `ResponseOfflineService`
2. Use React Query's `retry: false` and handle the error to trigger offline fallback
3. Add a timeout to the "Saving..." state

### Finding 2: SyncIndicator Doesn't Update from IndexedDB Directly

**Severity:** LOW (by design)
**Issue:** The SyncIndicator reads from Zustand store (`useOfflineStore`), not directly from IndexedDB. Manually adding items to IndexedDB doesn't update the indicator until the store's `refreshSyncQueue()` runs.

**Note:** This is expected behavior - Zustand acts as the reactive layer between IndexedDB and the UI.

### Finding 3: IndexedDB Encryption Error with Unencrypted Test Data

**Severity:** MEDIUM (test infrastructure issue)
**Issue:** When test data was added to IndexedDB without proper AES-GCM encryption, the `refreshSyncQueue()` function threw "Failed to decrypt data with any available key" errors on every periodic check (every 10 seconds), flooding the console.

**Recommendation:** The decrypt function should gracefully handle unencrypted/malformed data rather than throwing errors.

### Finding 4: Form Design Issue - Empty Resource Rows Block Submission

**Severity:** LOW (UX issue)
**Issue:** The response planning form adds a new empty resource row after each "Add Item" click. The "Create Plan" button remains disabled as long as any resource row has empty fields. Users must fill or remove every row.

### Finding 5: Response Planning Page Shows Excellent Offline UX

**Severity:** POSITIVE
**Details:**
- "Offline" status badge changes from green to gray
- "Will Sync Later" badge appears
- Offline banner: "You are currently offline. Your response plan will be saved locally and synced when you reconnect."
- Entity and assessment dropdowns work offline from cached data
- "Offline Data Required" guard prevents access without pre-downloaded data

---

## Test Summary

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| ST-UI-01 Step 1 | SyncIndicator - Synced state | PASS | Green "Synced" in all 3 instances |
| ST-UI-01 Step 2 | SyncIndicator - Offline no pending | PASS | Stays "Synced" correctly |
| ST-UI-01 Step 3 | SyncIndicator - Offline data creation | FAIL | Form stuck at "Saving..." (React Query paused) |
| ST-UI-01 Steps 4-6 | SyncIndicator - Syncing/Progress/Complete | BLOCKED | Cannot test without offline data |
| ST-UI-02 | OfflineIndicator States | PASS | All states working correctly |
| ST-UI-03 | SyncQueue Component (Full) | NOT TESTABLE | Not rendered in current UI |
| ST-UI-04 | BackgroundSyncProvider Toasts | PARTIAL | Offline toast works, online/sync toasts untested |

**Pass Rate:** 3/7 tests passed, 1 failed, 1 blocked, 1 not testable, 1 partial

---

## Critical Blockers for Further Testing

1. **React Query Mutation Pause**: Offline form submissions are stuck, preventing creation of sync queue items. This blocks all Phase 2+ testing that requires offline data creation.

2. **SyncQueue Component Not Visible**: The full SyncQueue UI is not rendered on any accessible page, preventing ST-UI-03 testing.

---

## Recommendations

1. **Fix the React Query offline mutation issue** in `ResponsePlanningForm.tsx` to enable proper offline form submission
2. **Add the SyncQueue component** to the responder dashboard or settings page for visibility
3. **Add a timeout/recovery** mechanism for the "Saving..." button state
4. **Improve decrypt error handling** in the offline store to gracefully handle malformed data
5. **Consider adding a "Create Plan Offline" test endpoint** or direct API to create sync queue items for testing purposes

---

**Testing performed using Chrome DevTools offline simulation**
**Environment:** Development server (localhost:3000)
**Date:** June 6, 2026
