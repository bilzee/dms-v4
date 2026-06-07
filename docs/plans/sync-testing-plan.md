# Comprehensive Sync Testing Plan - Disaster Response Management System (DRMS)

## Overview

This document outlines a comprehensive Chrome DevTools-based testing strategy for verifying the offline-to-online sync functionality of the DRMS PWA. Tests cover the full sync lifecycle: offline data creation, queue management, connectivity restoration, automatic/manual sync, conflict resolution, and post-sync data integrity. The plan is organized by user role based on their offline capability level.

## Application Sync Architecture Summary

### Sync Infrastructure Components

| Component | File | Purpose |
|-----------|------|---------|
| SyncEngine | `src/lib/sync/engine.ts` | Singleton orchestrating sync lifecycle, batch processing, retry logic |
| SyncQueueManager | `src/lib/sync/queue.ts` | Queue CRUD, metrics, priority management, status tracking |
| ConflictResolver | `src/lib/sync/conflict.ts` | Conflict detection (version mismatch) and resolution (last-write-wins, merge, manual) |
| OfflineDatabase | `src/lib/db/offline.ts` | Dexie-backed IndexedDB with AES-GCM-256 encryption |
| DeliveryOfflineService | `src/lib/services/delivery-offline.service.ts` | Delivery-specific offline ops with priority system |
| ResponseOfflineService | `src/lib/services/response-offline.service.ts` | Response planning offline ops |
| OfflineBootstrapService | `src/lib/offline/bootstrap.ts` | Pre-populates critical data for offline use |
| BackgroundSyncProvider | `src/providers/BackgroundSyncProvider.tsx` | App-wide sync context, toast notifications |
| SyncIndicator | `src/components/shared/SyncIndicator.tsx` | Compact sync status (Synced/N pending/Syncing X%) |
| SyncQueue UI | `src/components/shared/SyncQueue.tsx` | Full queue management with metrics and controls |
| OfflineIndicator | `src/components/shared/OfflineIndicator.tsx` | Online/offline status with tooltip |
| OfflineSyncDashboard | `src/components/delivery/OfflineSyncDashboard.tsx` | Delivery-specific sync dashboard |

### Sync Configuration Constants

| Constant | Value | Description |
|----------|-------|-------------|
| MAX_RETRIES | 3 | Maximum sync retry attempts |
| MAX_BATCH_SIZE | 100 | Maximum items per batch sync |
| RETRY_DELAYS | [2000, 5000, 10000]ms | Exponential backoff delays |
| SYNC_CHECK_INTERVAL | 30000ms | Periodic sync check interval |
| Background sync interval | 60000ms | BackgroundSyncProvider interval |
| Key rotation period | 90 days | Encryption key rotation schedule |
| Delivery retry max | 5 | Delivery-specific max retries |
| Delivery backoff base | 30s (cap 30min) | Delivery exponential backoff |

### Sync Triggers

1. **Connectivity restore** (`window.online` event) - immediate sync
2. **Periodic check** - every 30 seconds (SyncEngine) / 60 seconds (BackgroundSyncProvider)
3. **Queue addition** - triggers background sync when online
4. **Manual trigger** - "Sync Now" button in UI
5. **Retry timeout** - scheduled retries via `setTimeout`

### Sync Data Flow

```
Offline Data Creation (Form Submit)
    |
    v
Entity stored in IndexedDB (encrypted, syncStatus='pending')
    + Queue item added to syncQueue table (encrypted)
    |
    v
[TRIGGER: online event / periodic / manual]
    |
    v
SyncEngine.triggerSync()
    --> getNextSyncBatch() (priority-sorted, retry-ready)
    --> POST /api/v1/sync/batch { changes: SyncChange[] }
    |
    v
Process Results per item:
    - success  --> remove from queue, entity.syncStatus = 'synced'
    - conflict --> ConflictResolver (auto last-write-wins)
    - failed   --> increment attempts, schedule retry (2s/5s/10s)
```

### Offline Capability by Role

| Role | Creates Offline Data? | OfflineGuard? | Dedicated Offline Service? | Sync Priority |
|------|----------------------|----------------|---------------------------|---------------|
| **RESPONDER** | Full support | `ResponseOfflineGuard` | `response-offline.service.ts`, `delivery-offline.service.ts` | Delivery=1, Media=3-5 |
| **ASSESSOR** | Infrastructure exists | `AssessmentOfflineGuard` | Generic `useOffline` | Standard (5) |
| **COORDINATOR** | No | No | No | N/A |
| **DONOR** | No | No | No | N/A |
| **ADMIN** | No | No | No | N/A |

---

## Test Environment Setup

### Chrome DevTools Configuration

1. **Open Chrome DevTools** (F12)
2. **Required tabs**: Network, Application, Console, Sources, Performance, Elements
3. **Network throttling profiles**: Configure Offline, Slow 3G, Fast 3G in Network tab
4. **Application tab inspection points**:
   - IndexedDB > `DisasterManagementDB` (tables: assessments, responses, entities, syncQueue, encryptionKeys, cachedSignals)
   - Local Storage (keys: `offline-store`, `sync-store`, `drms_offline_*`, `dms_conflict_logs`)
   - Cache Storage (service worker caches)

### Pre-Test Prerequisites

1. Development server running (`npm run dev`)
2. Test user accounts for each role (ADMIN, COORDINATOR, ASSESSOR, RESPONDER, DONOR)
3. Existing test data: entities, incidents, assessments, response plans
4. **Critical**: Initial online session to bootstrap offline data before disconnecting

### Console Debug Commands

```javascript
// Check sync engine status
await syncEngine.getConnectivityStatus()

// Inspect sync queue
await offlineDB.getSyncQueue()

// Check entity sync status
await offlineDB.getAssessment('uuid-here')
await offlineDB.getResponse('uuid-here')
await offlineDB.getEntity('uuid-here')

// Force sync trigger
await syncEngine.triggerSync()

// Get queue metrics
await syncQueueManager.getMetrics()

// Check encryption key status
await offlineDB.getKeyRotationStatus()

// Delivery-specific stats
await DeliveryOfflineService.getOfflineStats()

// View conflict logs
JSON.parse(localStorage.getItem('dms_conflict_logs') || '[]')
```

---

## Phase 1: Sync Indicator & UI Verification

### ST-UI-01: SyncIndicator States

**Objective**: Verify the SyncIndicator component displays correct states throughout the sync lifecycle.

**Chrome DevTools Setup**:
1. Login as any role, navigate to dashboard
2. Elements tab: Inspect `[data-testid="sync-indicator"]` element
3. Console tab: Monitor for sync state changes

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Observe SyncIndicator while online with empty queue | Elements: check class names and text content | Shows "Synced" in green with cloud-check icon |
| 2 | Network tab: enable Offline | Console: watch for offline detection | Indicator state preserved (no new queue items yet) |
| 3 | Create offline data (any form) | Application > IndexedDB > syncQueue: verify new entry | Shows "N pending" in orange with cloud-download icon |
| 4 | Network tab: disable Offline (restore connection) | Console: watch sync trigger messages | Shows "Syncing... X%" in blue with spinner icon |
| 5 | Wait for sync completion | Console: sync completion log | Returns to "Synced" in green |
| 6 | Elements tab: verify progress bar | Check `width` style on progress bar element | Progress bar width transitions from 0% to 100% |

**Validation**:
- SyncIndicator text cycles: "Synced" -> "N pending" -> "Syncing... X%" -> "Synced"
- Color classes change appropriately: `text-green-600` -> `text-orange-600` -> `text-blue-600` -> `text-green-600`
- Background classes change: `bg-green-50` -> `bg-orange-50` -> `bg-blue-50` -> `bg-green-50`
- Progress bar has smooth CSS transition (`transition-all duration-300 ease-out`)

### ST-UI-02: OfflineIndicator States

**Objective**: Verify the OfflineIndicator component correctly detects and displays connectivity changes.

**Chrome DevTools Setup**:
1. Login as any role, locate OfflineIndicator in the UI
2. Elements tab: Inspect `[data-testid="offline-indicator"]`

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Observe while online | Elements: check text and icon | Shows "Online" in green with WiFi icon |
| 2 | Network tab: enable Offline | Console: "Connection lost" toast | Shows "Offline" in red with WiFi-off icon |
| 3 | Hover over indicator | Elements: check tooltip visibility | Tooltip: "No internet connection. Working offline with local data." |
| 4 | Network tab: disable Offline | Console: "Connecting..." then "Online" | Shows "Connecting..." briefly (1s delay), then "Online" |
| 5 | Hover over indicator (online) | Elements: check tooltip | Tooltip: "Connected to internet. Data will sync automatically." |

**Validation**:
- 1-second connecting verification delay before showing "Online"
- Tooltip contains correct guidance text for each state
- No hydration mismatch (component renders loading state on server, actual state on client)

### ST-UI-03: SyncQueue Component (Full Mode)

**Objective**: Verify the full SyncQueue component shows queue items, metrics, and controls correctly.

**Chrome DevTools Setup**:
1. Navigate to a page containing `<SyncQueue showControls={true} />`
2. Application tab: Prepare to inspect IndexedDB syncQueue table

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Observe with empty queue | Elements: check status text | Shows "All synced" in green with checkmark |
| 2 | Create 3+ offline operations | Application > IndexedDB > syncQueue: verify entries | Metrics grid shows: Total=N, Pending=N, Retrying=0, Failed=0 |
| 3 | Click "Sync Now" button | Network tab: watch for POST /api/v1/sync/batch | Status changes to "Syncing...", progress bar appears |
| 4 | Observe queue item list | Elements: check item rendering | Each item shows type, action, entity UUID (first 8 chars), priority, timestamp |
| 5 | Click "Show All" toggle | Elements: verify list expansion | All items visible (vs default maxItems=10) |
| 6 | Click remove (X) on an item | Application > IndexedDB > syncQueue: verify removal | Item removed from queue and UI updates |
| 7 | Trigger sync failure | Console: simulate error condition | Failed items show red dot, error message, attempt count |

**Validation**:
- Metrics grid: Total, Pending (orange), Retrying (yellow), Failed (red) counts accurate
- Each queue item displays: status dot (color-coded), type, action, truncated UUID, priority, relative timestamp
- Controls: "Sync Now" disabled when offline or already syncing; "Retry Failed" and "Clear Failed" appear when failures exist
- Error messages show dismissible red alert cards

### ST-UI-04: BackgroundSyncProvider Toast Notifications

**Objective**: Verify toast notifications fire correctly for connectivity and sync events.

**Chrome DevTools Setup**:
1. Login as any role
2. Console tab: Monitor for toast-related messages
3. Elements tab: Watch for toast DOM elements (sonner renders toasts)

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Go offline (Network tab) | Elements: toast appears | Toast: "Connection lost - Working in offline mode. Data will be synced when connection is restored." (warning, 5s) |
| 2 | Go online (Network tab) | Elements: toast appears | Toast: "Connection restored - Offline data will be synced automatically" (success, 3s) |
| 3 | With pending data, wait for background sync | Elements: toast appears | Toast: "Data synced - N delivery confirmation(s) synced successfully" (success, 4s) |
| 4 | Force sync failure | Elements: toast appears | Toast: "Sync issues - N item(s) failed to sync. Will retry automatically." (error, 6s) |
| 5 | Manual sync (forceSync) | Elements: toast appears | Toast: "Manual sync completed - All pending data has been synced" (success, 3s) |

**Validation**:
- Toast types match severity: warning (offline), success (connected/synced), error (failed)
- Toast durations appropriate: connection events 3-5s, sync results 3-6s
- No duplicate toasts for same event

---

## Phase 2: RESPONDER Role Sync Tests (Highest Priority)

### ST-RS-01: Response Plan Creation - Offline to Online Sync

**Objective**: Verify a response plan created offline syncs correctly when connectivity is restored.

**Chrome DevTools Setup**:
1. Login as RESPONDER, navigate to dashboard
2. Application > IndexedDB: Verify `responses` and `syncQueue` tables exist
3. Network tab: Monitor API calls
4. Console tab: Watch for `ResponseOfflineService` messages

**Pre-Test**: Ensure bootstrap data is loaded (entities, incidents, verified assessments in localStorage).

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Go online, navigate to `/responder/planning/new` | Network: watch data loading | ResponseOfflineGuard checks: entities, incidents, verified assessments present |
| 2 | Network tab: enable Offline | Console: offline detection | Page remains functional |
| 3 | Fill response planning form completely | Elements: monitor form state | All fields captured (entity, assessment, resources, timeline) |
| 4 | Submit form | Console: `ResponseOfflineService.createPlannedResponse()` logs | Online attempt fails -> falls back to offline storage |
| 5 | Application > IndexedDB > responses | Check new entry | Response stored with `syncStatus: 'pending'`, encrypted data field |
| 6 | Application > IndexedDB > syncQueue | Check new entry | Queue item: `type: 'response'`, `action: 'create'`, `priority: 5`, `attempts: 0` |
| 7 | Observe SyncIndicator | Elements: check text | Shows "1 pending" in orange |
| 8 | Network tab: disable Offline (restore connection) | Console: sync triggered after 1s delay | SyncEngine processes queue item |
| 9 | Network tab: watch outgoing requests | Network: POST /api/v1/sync/batch | Batch request sent with response data |
| 10 | Wait for sync completion | Application > IndexedDB > responses | `syncStatus` updated to `'synced'` |
| 11 | Application > IndexedDB > syncQueue | Verify queue | Queue item removed |
| 12 | Observe SyncIndicator | Elements: check text | Returns to "Synced" in green |
| 13 | Console tab: check conflict logs | `localStorage.getItem('dms_conflict_logs')` | No conflict entries (clean sync) |

**Validation**:
- Response data integrity: encrypted blob decrypts correctly after sync
- Queue item lifecycle: added -> processed -> removed
- SyncIndicator reflects accurate state throughout
- No data loss during offline-to-online transition
- Toast notification confirms sync completion

### ST-RS-02: Response Plan Update - Offline Modification Sync

**Objective**: Verify modifying an existing response plan offline syncs correctly.

**Chrome DevTools Setup**:
1. Login as RESPONDER, ensure at least one existing response plan
2. Application > IndexedDB: Monitor responses table

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Go online, load existing response plan | Network: watch data fetch | Response loaded, `syncStatus: 'synced'` in IndexedDB |
| 2 | Network tab: enable Offline | Console: offline detection | Page remains functional |
| 3 | Modify response plan (change resources, timeline, status) | Elements: monitor form changes | All modifications captured |
| 4 | Save changes | Console: `ResponseOfflineService.updatePlannedResponse()` logs | Offline fallback stores update |
| 5 | Application > IndexedDB > responses | Check updated entry | `syncStatus` changed to `'pending'`, encrypted data updated |
| 6 | Application > IndexedDB > syncQueue | Check new entry | Queue item: `type: 'response'`, `action: 'update'` |
| 7 | Network tab: disable Offline | Console: sync triggered | SyncEngine processes update |
| 8 | Verify sync completion | Application > IndexedDB | `syncStatus: 'synced'`, queue item removed |

**Validation**:
- Original response data preserved until update syncs
- Version number incremented for conflict detection
- Update timestamp reflects offline modification time

### ST-RS-03: Delivery Confirmation - Offline with GPS & Media

**Objective**: Verify delivery confirmation with GPS location and media uploads syncs correctly.

**Chrome DevTools Setup**:
1. Login as RESPONDER, navigate to delivery confirmation page
2. Console tab: Monitor GPS capture and media processing
3. Sensors tab: Configure geolocation simulation (e.g., 12.5, 13.0 for Maiduguri area)
4. Application > IndexedDB: Monitor syncQueue and responses

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Go online, load delivery page `/responder/responses/[id]/deliver` | Network: watch data | Delivery form loads |
| 2 | Network tab: enable Offline | Console: offline detection | Form remains functional |
| 3 | Capture GPS location | Console: GPS coordinate log | Latitude/longitude captured from geolocation API |
| 4 | Attach media (photo) | Console: media file processing | File stored as base64 in memory |
| 5 | Fill delivery confirmation form | Elements: monitor form | Delivery details captured |
| 6 | Submit delivery | Console: `DeliveryOfflineService.storeDeliveryConfirmation()` | Creates `DeliveryOfflineOperation` |
| 7 | Application > IndexedDB > syncQueue | Check entries | Two entries: `delivery_confirmation` (priority 1) + `media_upload` (priority 3-5) |
| 8 | Verify operation metadata | Console: inspect operation object | `metadata.gpsLocation` populated, `metadata.mediaFiles` array with file data, `metadata.networkStatus: 'offline'` |
| 9 | Network tab: disable Offline | Console: sync triggered | Delivery syncs first (priority 1), then media (priority 3-5) |
| 10 | Network: watch requests | Network: observe request ordering | Delivery confirmation request sent before media upload |
| 11 | Verify sync completion | Application > IndexedDB | Queue cleared, `syncStatus: 'synced'` |

**Validation**:
- Priority ordering respected: delivery confirmation (1) syncs before media upload (3-5)
- GPS coordinates preserved through sync cycle
- Media file binary data intact after upload
- `DeliveryOfflineStats` updated: pendingCount decreases, completedCount increases
- Device ID (`delivery-device-id` in localStorage) consistent across operations

### ST-RS-04: Delivery Retry and Exponential Backoff

**Objective**: Verify failed delivery sync operations retry with correct exponential backoff timing.

**Chrome DevTools Setup**:
1. Login as RESPONDER, create offline delivery data
2. Console tab: Monitor retry scheduling messages
3. Network tab: Prepare to block sync requests

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Create offline delivery confirmation | Application > IndexedDB > syncQueue | Queue item added with `attempts: 0` |
| 2 | Go online but block `/api/v1/sync/` requests | Network: "Block request URL" for sync endpoints | Sync attempts will fail |
| 3 | Trigger manual sync | Console: watch retry logic | First attempt fails, `attempts: 1`, `nextRetry` set |
| 4 | Wait for first retry (~30s) | Console: retry attempt log | Second attempt, `attempts: 2` |
| 5 | Wait for second retry (~60s) | Console: retry attempt log | Third attempt, `attempts: 3` |
| 6 | Continue waiting | Console: max retries reached | `attempts: 4`, then 5, then marked as max retries |
| 7 | Unblock sync endpoints | Network: remove block | Operations remain in failed/max_retries state |
| 8 | Click "Retry Failed" in UI | Console: retry triggered | `attempts` reset, sync retries with clean state |

**Validation**:
- Retry delays follow: 30s, 60s, 120s... up to 30-minute cap
- `nextRetry` timestamp correctly computed as `2^attempts * 30s`
- After 5 delivery retries, operation marked as max_retries
- "Retry Failed" resets attempts and allows fresh retry cycle
- Failed count visible in OfflineSyncDashboard statistics

### ST-RS-05: OfflineSyncDashboard - Delivery-Specific Sync UI

**Objective**: Verify the delivery-specific OfflineSyncDashboard component works correctly.

**Chrome DevTools Setup**:
1. Login as RESPONDER, navigate to page containing OfflineSyncDashboard
2. Application > IndexedDB: Monitor delivery operations

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Observe Overview tab | Elements: check stats grid | Shows: Pending, Completed, Failed, Last Sync stats |
| 2 | Create 3 offline deliveries | Application > IndexedDB > syncQueue | 3 operations stored |
| 3 | Switch to Pending tab | Elements: check operation list | 3 operations listed with type, priority, response ID, timestamps |
| 4 | Verify operation details | Elements: check each card | Shows: operation type icon, priority badge, action badge, creation time |
| 5 | Click cancel (trash icon) on one operation | Application > IndexedDB > syncQueue | Operation removed, pending count decreases |
| 6 | Go online, click "Sync All (N)" | Console: DeliveryOfflineService.syncPendingOperations() | Operations process and move to completed |
| 7 | Switch to History tab | Elements: check history content | Completed operations listed (or "coming soon" placeholder) |
| 8 | Click "Clear Completed" | Application > IndexedDB | Completed operations purged from storage |

**Validation**:
- Statistics grid shows accurate real-time counts
- Pending operations list is scrollable (400px ScrollArea)
- Priority badges use correct colors: <=3 red, <=6 orange, >6 blue
- Sync progress bar shows completion ratio
- Last sync timestamp formatted correctly (relative: "Just now", "5m ago", "2h ago")

### ST-RS-06: OfflineSyncStatus Card - Real-Time Updates

**Objective**: Verify the OfflineSyncStatus card updates in real-time during sync operations.

**Chrome DevTools Setup**:
1. Login as RESPONDER, locate OfflineSyncStatus card
2. Console tab: Monitor periodic stats refresh (every 5 seconds)

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Observe card with no pending ops | Elements: check button state | "Sync Now" button disabled (variant="outline") |
| 2 | Create offline delivery | Elements: watch for re-render | Stats update within 5s: pending count increases |
| 3 | Verify "Sync Now" becomes active | Elements: check button | Button enabled (variant="default"), shows "Sync All (N)" |
| 4 | Click "Sync Now" | Elements: button text changes | Shows spinner + "Syncing...", button disabled |
| 5 | Observe progress bar | Elements: progress width | Progress bar fills from 0% to 100% |
| 6 | Sync completes | Elements: check results section | Sync Results shows: Synced N, Failed 0, Skipped 0 |
| 7 | Wait 5 seconds | Elements: stats grid | Last sync updates to "Just now", pending returns to 0 |

**Validation**:
- Stats auto-refresh every 5 seconds via `setInterval(loadStats, 5000)`
- Button state transitions: disabled (no pending) -> enabled (pending) -> disabled (syncing) -> disabled (no pending)
- Sync results grid shows accurate synced/failed/skipped counts
- Error messages appear when sync fails (max 2 shown with "... and N more" overflow)

---

## Phase 3: ASSESSOR Role Sync Tests

### ST-AS-01: Assessment Creation - Offline Storage and Sync

**Objective**: Verify assessment data created offline is stored in IndexedDB and syncs when online.

**Chrome DevTools Setup**:
1. Login as ASSESSOR, navigate to assessment creation
2. Application > IndexedDB: Monitor assessments and syncQueue tables
3. Console tab: Watch for offline save messages

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Go online, navigate to `/assessor/rapid-assessments/new?type=HEALTH` | Network: watch data loading | AssessmentOfflineGuard verifies entities, incidents, assessment types available |
| 2 | Network tab: enable Offline | Console: offline detection | Form remains fully functional |
| 3 | Fill complete health assessment form | Elements: monitor form state | All fields captured (type, gaps, facility counts, risk data, photos) |
| 4 | Note: Current implementation uses direct API call | Console: API call failure logged | Assessment save may fail offline (known gap) |
| 5 | If using `useOffline.queueOperation()`: | Application > IndexedDB | Assessment stored with `syncStatus: 'pending'`, queue item created |
| 6 | Application > IndexedDB > assessments | Check encrypted data field | Data encrypted with AES-GCM, `keyVersion` recorded |
| 7 | Network tab: disable Offline | Console: sync triggered | SyncEngine processes assessment queue item |
| 8 | Verify sync completion | Application > IndexedDB > assessments | `syncStatus: 'synced'`, queue item removed |

**Validation**:
- Assessment data encrypted before storage (encrypted data is unreadable in Application tab)
- `keyVersion` matches current encryption key version
- Assessment types preserved: HEALTH, POPULATION, FOOD, WASH, SHELTER, SECURITY
- Assessment metadata (assessorId, entityId, assessmentType) stored as index fields

### ST-AS-02: Assessment Editing - Version Tracking for Conflict Detection

**Objective**: Verify editing an offline assessment creates proper version metadata for conflict detection.

**Chrome DevTools Setup**:
1. Login as ASSESSOR, load an existing synced assessment
2. Application > IndexedDB: Monitor assessments table

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Load existing assessment for editing | Application > IndexedDB > assessments | Current assessment data with `syncStatus: 'synced'` |
| 2 | Go offline | Network: enable Offline | Form functional |
| 3 | Modify assessment data | Elements: monitor changes | Form state updated |
| 4 | Save modifications | Console: update operation | Assessment updated in IndexedDB, `syncStatus: 'pending'` |
| 5 | Check version tracking | Application > IndexedDB > assessments | `lastModified` timestamp updated, version metadata attached |
| 6 | Go online | Console: sync triggered | Assessment syncs with version number for server reconciliation |
| 7 | Verify no false conflicts | Console: conflict resolution logs | No conflicts if server version matches |

**Validation**:
- `lastModified` timestamp reflects offline edit time
- Version number available for conflict detection (`versionNumber` in SyncChange)
- Original data preserved until successful sync confirms server acceptance

### ST-AS-03: OfflineGuard - Data Readiness Verification

**Objective**: Verify the AssessmentOfflineGuard prevents assessment creation when required data is missing.

**Chrome DevTools Setup**:
1. Login as ASSESSOR
2. Application > Local Storage: Monitor `drms_offline_*` keys
3. Application > IndexedDB: Monitor cached entities

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Fresh login (no cached data) | Application > Local Storage | Bootstrap runs, populates: entities, incidents, assessment types |
| 2 | Clear Local Storage `drms_offline_assessment_types` | Application > Local Storage | Key removed |
| 3 | Navigate to new assessment | Console: guard check fails | Shows "Offline Data Required" preparation interface |
| 4 | Click "Download Data" or wait for bootstrap | Console: bootstrap re-runs | Data re-downloaded, guard passes |
| 5 | Navigate to new assessment | Elements: form visible | Assessment form loads successfully |
| 6 | Go offline | Console: offline detection | Form fully functional with cached data |

**Validation**:
- Guard checks: entities (IndexedDB), incidents (localStorage), assessment types (localStorage)
- Clear messaging when data is missing
- Bootstrap re-trigger resolves missing data condition
- Assessment types stored in `drms_offline_assessment_types` localStorage key

---

## Phase 4: COORDINATOR Role Sync Tests

### ST-CO-01: Action Signal Cache Sync

**Objective**: Verify cached action signals update correctly when coming online.

**Chrome DevTools Setup**:
1. Login as COORDINATOR, navigate to dashboard
2. Application > IndexedDB > cachedSignals: Monitor signal cache
3. Console tab: Watch for signal refresh messages

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Go online, observe dashboard action queue | Network: watch signals API call | Signals loaded and displayed |
| 2 | Application > IndexedDB > cachedSignals | Check cached entries | Signals cached with `cachedAt`, `expiresAt` (24h TTL) |
| 3 | Go offline | Console: offline detection | Cached signals still displayed |
| 4 | Wait for new signals to be created (by another user) | N/A (offline) | New signals not visible offline |
| 5 | Go online | Console: signals refresh | Fresh signals fetched and cache updated |
| 6 | Verify cache refresh | Application > IndexedDB > cachedSignals | New signals added, `cachedAt` timestamps updated |

**Validation**:
- Cached signals display correctly offline (24-hour cache TTL)
- Cache refreshes automatically when connectivity restores
- Signal priority and reason preserved in cache
- `useActionSignals` hook falls back to `offlineDB.getCachedSignals()` when offline

### ST-CO-02: Verification Actions - Online Dependency

**Objective**: Verify verification actions require online connectivity and fail gracefully offline.

**Chrome DevTools Setup**:
1. Login as COORDINATOR, navigate to verification page
2. Network tab: Monitor API calls

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Load verification dashboard | Network: watch API calls | Assessment/response data loaded |
| 2 | Go offline | Network: enable Offline | Dashboard shows cached data |
| 3 | Attempt to approve a verification | Console: API call failure | Error handled gracefully, no queue (verification is online-only) |
| 4 | Attempt to reject a verification | Console: API call failure | Error handled gracefully |
| 5 | Go online | Network: disable Offline | Can successfully approve/reject |

**Validation**:
- Verification actions are purely online operations
- No offline queue for verification decisions (by design)
- Clear error feedback when attempting offline verification
- Dashboard data readable from cache when offline

---

## Phase 5: DONOR Role Sync Tests

### ST-DO-01: Commitment Operations - Online Dependency

**Objective**: Verify donor commitment operations work correctly with connectivity transitions.

**Chrome DevTools Setup**:
1. Login as DONOR, navigate to dashboard
2. Network tab: Monitor API calls
3. Application > IndexedDB: Verify no donor-specific data cached

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Load donor dashboard online | Network: watch commitment API calls | Commitments loaded |
| 2 | Go offline | Console: offline detection | Dashboard shows cached statistics |
| 3 | Attempt to create new commitment | Console: API failure | Error handled (no offline commitment creation) |
| 4 | Go online | Network: disable Offline | Commitment creation works |
| 5 | Verify commitment persisted | Network: POST response | Commitment created on server |

**Validation**:
- Donor role has no offline data creation capability
- Cached dashboard statistics (pending actions, active commitments) display offline
- Commitment forms fail gracefully when offline

### ST-DO-02: Donor Dashboard Data Preservation

**Objective**: Verify donor dashboard statistics and navigation persist through connectivity transitions.

**Chrome DevTools Setup**:
1. Login as DONOR
2. Application > IndexedDB: Monitor cachedSignals
3. Application > Local Storage: Monitor persisted state

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Load dashboard online | Network: watch stats API | Statistics loaded (Pending Actions, Active Commitments) |
| 2 | Go offline | Console: offline detection | Statistics preserved from last online fetch |
| 3 | Navigate between dashboard sections | Elements: check navigation | Navigation works (My Commitments, Assigned Entities, Analytics) |
| 4 | Go online | Console: data refresh | Statistics update with fresh data |

**Validation**:
- Dashboard statistics survive offline transition
- Navigation between sections works offline
- Data refreshes when connectivity returns

---

## Phase 6: ADMIN Role Sync Tests

### ST-AD-01: System Health Sync Status

**Objective**: Verify admin dashboard correctly displays sync-related system health data.

**Chrome DevTools Setup**:
1. Login as ADMIN, navigate to dashboard
2. Network tab: Monitor system health API call

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Load admin dashboard | Network: GET /api/v1/system/health | System health data including `databaseSync` status |
| 2 | Observe system health display | Elements: check health indicators | Database sync status visible |
| 3 | Go offline | Console: offline detection | Health data shows last cached values |
| 4 | Go online | Network: health API refresh | Fresh health data loaded |

**Validation**:
- System health includes `databaseSync` and `apiResponseTime` metrics
- Health data caches properly for offline viewing
- No admin-specific offline data creation

### ST-AD-02: User Management - Online Dependency

**Objective**: Verify admin user management operations require connectivity.

**Chrome DevTools Setup**:
1. Login as ADMIN, navigate to user management
2. Network tab: Monitor user API calls

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Load user management online | Network: GET /api/v1/users | User list loaded |
| 2 | Go offline | Console: offline detection | User list may show cached/empty state |
| 3 | Attempt user operations (create, edit, delete) | Console: API failure | Operations fail gracefully |
| 4 | Go online | Network: disable Offline | User operations succeed |

**Validation**:
- User management is purely online
- No offline queue for admin operations
- Graceful error handling when offline

---

## Phase 7: Cross-Role Sync Tests

### ST-CR-01: Multi-Operation Batch Sync

**Objective**: Verify the sync engine correctly processes multiple queued operations in priority order.

**Chrome DevTools Setup**:
1. Login as RESPONDER (best role for creating varied offline data)
2. Application > IndexedDB > syncQueue: Monitor queue additions
3. Console tab: Watch sync batch processing

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Go offline | Network: enable Offline | Ready for offline operations |
| 2 | Create delivery confirmation (priority 1) | syncQueue: check priority | Queue item with `priority: 1` |
| 3 | Create media upload (priority 3) | syncQueue: check priority | Queue item with `priority: 3` |
| 4 | Create response plan (priority 5) | syncQueue: check priority | Queue item with `priority: 5` |
| 5 | Create another delivery (priority 1) | syncQueue: check priority | Queue item with `priority: 1` |
| 6 | Verify queue ordering | Console: `await offlineDB.getSyncQueue()` | Items sorted by priority DESC, then timestamp ASC |
| 7 | Go online | Console: sync triggered | Batch sync processes items |
| 8 | Network: observe request order | Network: POST /api/v1/sync/batch | Delivery confirmations sync first, then media, then response |
| 9 | Verify completion | Application > IndexedDB | All items: `syncStatus: 'synced'`, queue empty |

**Validation**:
- Priority ordering: 1 (delivery) > 3 (media) > 5 (response)
- Within same priority, earlier timestamp syncs first
- Batch size limit (100) respected
- All items process in single batch if under limit

### ST-CR-02: Sync Engine Retry with Exponential Backoff

**Objective**: Verify the SyncEngine retry mechanism with correct timing.

**Chrome DevTools Setup**:
1. Login as any role with offline data
2. Network tab: Block sync endpoint URL patterns
3. Console tab: Monitor retry scheduling and timing

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Create offline operation, go online with blocked sync | Console: first attempt fails | `attempts: 1`, `nextRetry` set to now + 2000ms |
| 2 | Wait ~2 seconds | Console: retry #1 | `attempts: 2`, `nextRetry` set to now + 5000ms |
| 3 | Wait ~5 seconds | Console: retry #2 | `attempts: 3`, `nextRetry` set to now + 10000ms |
| 4 | Wait ~10 seconds | Console: retry #3 (max) | Item marked as max_retries, removed from active queue |
| 5 | Check queue metrics | Console: `await syncQueueManager.getMetrics()` | `maxRetries: 1`, `pending: 0` |
| 6 | Unblock sync, click "Retry Failed" | Console: retry triggered | Attempts reset, item re-enters active queue |
| 7 | Wait for successful sync | Console: sync success | Item removed, entity `syncStatus: 'synced'` |

**Validation**:
- Retry delays: 2s, 5s, 10s (RETRY_DELAYS array)
- Max 3 retries (MAX_RETRIES constant)
- After max retries, item status = 'max_retries'
- `retryFailedItems()` resets attempts for fresh retry
- Queue metrics accurately reflect state

### ST-CR-03: Connectivity Detection and Auto-Sync Trigger

**Objective**: Verify the system correctly detects connectivity changes and auto-triggers sync.

**Chrome DevTools Setup**:
1. Login as RESPONDER with pending offline data
2. Console tab: Monitor connectivity events and sync triggers
3. Network tab: Ready to toggle offline

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Create offline data while disconnected | Application > IndexedDB | Data stored, queue populated |
| 2 | Restore connection (disable Offline) | Console: `window.online` event fires | Toast: "Connection restored" |
| 3 | Observe sync trigger timing | Console: sync triggered after ~1s delay | `syncEngine.triggerSync()` called automatically |
| 4 | Verify sync processing | Network: POST /api/v1/sync/batch | Batch request sent |
| 5 | Create more offline data | Application > IndexedDB | New queue items |
| 6 | Observe periodic sync (30s interval) | Console: periodic sync check | SyncEngine checks every 30s for queue items |
| 7 | Verify BackgroundSyncProvider (60s interval) | Console: background sync check | Provider checks every 60s via `useBackgroundSync` |

**Validation**:
- `window.online` event triggers sync after 1-second delay (connection stabilization)
- SyncEngine periodic check: 30-second interval
- BackgroundSyncProvider interval: 60 seconds
- Pending count in provider updates every 10 seconds
- No duplicate sync triggers from overlapping intervals

### ST-CR-04: Conflict Detection and Resolution

**Objective**: Verify version-mismatch conflicts are detected and auto-resolved using last-write-wins.

**Chrome DevTools Setup**:
1. Login as RESPONDER
2. Console tab: Monitor ConflictResolver messages
3. Application > Local Storage: Watch `dms_conflict_logs` key

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Load existing response plan (version N) | Console: version number logged | Response loaded with current version |
| 2 | Go offline | Network: enable Offline | Response editable |
| 3 | Modify and save response (still version N) | Application > IndexedDB | Local version = N, data modified |
| 4 | Simulate: Another user updates same response on server | (Manual server-side change) | Server version = N+1 |
| 5 | Go online, trigger sync | Console: conflict detection | `localVersion !== serverVersion` detected |
| 6 | Console: conflict resolution | Console: "Conflict detected" + resolution strategy | Auto-resolved with `last_write_wins` |
| 7 | Check conflict logs | localStorage > `dms_conflict_logs` | Conflict entry with: conflictId, entityType, versions, strategy, autoResolved=true |
| 8 | Verify final data state | Application > IndexedDB | Response data reflects resolution (server or local, whichever is newer by timestamp) |

**Validation**:
- Conflict detection based on version number mismatch (`localVersion !== serverVersion`)
- Auto-resolution: `last_write_wins` compares `localLastModified` vs `serverLastModified`
- Conflict logs stored in localStorage, capped at 100 entries
- Log entry contains: `conflictId`, `entityType`, `entityUuid`, `localVersion`, `serverVersion`, `resolutionStrategy`, `isResolved`, `autoResolved`
- UI shows no error to user (seamless resolution)

### ST-CR-05: Conflict Resolution Strategies

**Objective**: Verify all three conflict resolution strategies work correctly.

**Chrome DevTools Setup**:
1. Console tab: Execute conflict resolution commands directly

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | **Last-write-wins**: Create conflict with newer server data | Console: `ConflictResolver.resolveConflict(conflict, 'last_write_wins')` | Server data used (newer timestamp) |
| 2 | **Last-write-wins**: Create conflict with newer local data | Console: same command | Local data used (newer timestamp) |
| 3 | **Merge**: Create conflict with different fields | Console: `ConflictResolver.resolveConflict(conflict, 'merge')` | Shallow merge: `{...serverData, ...localData}`, version=max+1, `_mergedAt` metadata |
| 4 | **Manual**: Provide manual resolution data | Console: `ConflictResolver.resolveConflict(conflict, 'manual', manualData)` | `manualData` used as resolution |
| 5 | Verify merge fallback | Console: merge with conflicting same fields | Falls back to last-write-wins on error |

**Validation**:
- `last_write_wins`: Timestamp comparison, newer data wins
- `merge`: Shallow spread merge (`{...server, ...local}`), local overwrites server for same keys
- `manual`: Exact provided data used
- Merge fallback: Graceful degradation to last-write-wins
- All strategies log to `dms_conflict_logs`

### ST-CR-06: Encryption Key Management During Sync

**Objective**: Verify encryption keys are managed correctly through sync operations.

**Chrome DevTools Setup**:
1. Application > IndexedDB > encryptionKeys: Monitor key entries
2. Console tab: Check key rotation status

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Initial load | Application > IndexedDB > encryptionKeys | Active key present with `isActive: true` |
| 2 | Create offline data | Application > IndexedDB > assessments | Data encrypted with current key, `keyVersion` recorded |
| 3 | Check key rotation schedule | Console: `await offlineDB.getKeyRotationStatus()` | Shows key age, rotation schedule (90 days) |
| 4 | Create more offline data | Application > IndexedDB | Same `keyVersion` used consistently |
| 5 | Sync data online | Console: sync completes | Key rotation deferred until no pending sync ops |
| 6 | Verify backward compatibility | Application > IndexedDB | Old data decryptable with previous key versions (up to 5 kept) |

**Validation**:
- Key rotation only occurs when no pending sync operations exist
- Up to 5 previous key versions retained for backward compatibility
- Each entity record stores `keyVersion` for decryption routing
- AES-GCM-256 encryption with 12-byte IV
- Key metadata: `keyName`, `version`, `created`, `lastUsed`, `isActive`

### ST-CR-07: Offline Bootstrap - Data Pre-Population

**Objective**: Verify the bootstrap service correctly pre-populates data for offline operations.

**Chrome DevTools Setup**:
1. Login with fresh session (clear localStorage and IndexedDB first)
2. Console tab: Monitor bootstrap messages
3. Application > Local Storage: Watch `drms_offline_*` keys
4. Application > IndexedDB: Watch table population

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Fresh login as RESPONDER | Console: bootstrap messages | "Bootstrapping offline data..." |
| 2 | Check entity loading | Application > IndexedDB > entities | Active entities populated from API |
| 3 | Check incident loading | Local Storage: `drms_offline_incidents` | Active incidents stored as JSON |
| 4 | Check verified assessments (RESPONDER) | Local Storage: `drms_offline_verified_assessments` | Verified assessments from API |
| 5 | Check signal caching | Application > IndexedDB > cachedSignals | Action signals cached with 24h TTL |
| 6 | Check system config | Local Storage: `drms_offline_config` | Assessment types, response types, priorities stored |
| 7 | Note bootstrap timestamp | Local Storage: `drms_offline_bootstrap_time` | Timestamp recorded for 24h re-bootstrap check |
| 8 | Refresh page after 24h | Console: re-bootstrap triggered | Fresh data downloaded |

**Validation**:
- Bootstrap data differs by role: RESPONDER gets verified assessments, ASSESSOR gets assessment templates
- All localStorage keys prefixed with `drms_offline_`
- Bootstrap refreshes if older than 24 hours or role changed
- IndexedDB tables populated: entities, cachedSignals
- Encryption initialized during bootstrap

### ST-CR-08: Sync Queue Metrics and Monitoring

**Objective**: Verify queue metrics accurately reflect the sync state.

**Chrome DevTools Setup**:
1. Login as RESPONDER
2. Console tab: Execute metrics queries

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Create 5 offline operations (mix of types) | Console: `await syncQueueManager.getMetrics()` | `{total: 5, pending: 5, retrying: 0, failed: 0, maxRetries: 0}` |
| 2 | Check breakdown by type | Console: `metrics.byType` | `{assessment: N, response: N, entity: N}` matching created items |
| 3 | Check breakdown by action | Console: `metrics.byAction` | `{create: N, update: N, delete: N}` matching created items |
| 4 | Trigger sync with some failures | Console: metrics after partial sync | `total` decreases, `failed` increases |
| 5 | Check oldest pending | Console: `metrics.oldestPending` | Timestamp of earliest unprocessed item |
| 6 | Check average retry attempts | Console: `metrics.avgRetryAttempts` | Average across all items with attempts > 0 |

**Validation**:
- `QueueMetrics` interface fields all populated correctly
- `byType` and `byAction` breakdowns sum to `total`
- `oldestPending` is a valid Date object
- `avgRetryAttempts` computed correctly
- Metrics update in real-time as queue state changes

---

## Phase 8: Performance & Reliability Tests

### ST-PR-01: Large Queue Sync Performance

**Objective**: Verify sync engine handles large queues efficiently.

**Chrome DevTools Setup**:
1. Login as RESPONDER
2. Performance tab: Record sync operation
3. Console tab: Time sync operations

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Create 50+ offline operations | Console: queue creation timing | All items queued within reasonable time |
| 2 | Go online, trigger sync | Performance: record sync | Sync completes without UI freeze |
| 3 | Monitor memory usage | Performance: Memory tab | Memory stays within reasonable bounds |
| 4 | Verify batch size limit | Console: batch size log | Max 100 items per batch (MAX_BATCH_SIZE) |
| 5 | Check sync duration | Console: sync timing | Entire queue syncs within acceptable time |

**Validation**:
- No UI blocking during sync (async processing)
- Batch size capped at 100 items
- Memory usage stable (no leaks from large encrypted payloads)
- Progress indicator updates smoothly

### ST-PR-02: Rapid Connectivity Toggle

**Objective**: Verify sync system handles rapid online/offline toggling without data corruption.

**Chrome DevTools Setup**:
1. Login as RESPONDER with offline data
2. Network tab: Ready for rapid toggling

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Create offline data | Application > IndexedDB | Data stored |
| 2 | Rapidly toggle online/offline 5 times | Console: watch for errors | No errors, no data corruption |
| 3 | Final state: online | Console: sync eventually triggers | Sync processes queue once stable |
| 4 | Verify data integrity | Application > IndexedDB | All queue items intact, no duplicates |
| 5 | Check for race conditions | Console: no concurrent sync warnings | Only one sync in progress at a time (`syncInProgress` guard) |

**Validation**:
- `syncInProgress` guard prevents concurrent sync operations
- No duplicate queue entries from rapid toggling
- Data remains consistent through connectivity fluctuations
- No JavaScript errors in Console tab

### ST-PR-03: Storage Quota and Data Cleanup

**Objective**: Verify offline storage stays within browser quotas and cleanup works correctly.

**Chrome DevTools Setup**:
1. Application > Storage: Monitor storage usage
2. Console tab: Check storage info

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Check initial storage usage | Application > Storage | Baseline storage usage recorded |
| 2 | Create multiple offline operations with media | Application > Storage | Storage increases |
| 3 | Sync all operations | Console: sync + cleanup | Storage partially freed (queue items removed, synced data retained) |
| 4 | Clear completed operations | Console: `clearCompletedOperations()` | Storage freed for completed items |
| 5 | Execute `clearOfflineData()` | Console: full cleanup | All IndexedDB tables cleared |
| 6 | Verify storage return to baseline | Application > Storage | Storage usage returns near initial level |

**Validation**:
- Synced data retained in entity tables (for offline viewing)
- Queue items removed after successful sync
- `clearOfflineData()` removes all IndexedDB data
- `clearCompletedOperations()` removes only completed delivery ops
- No storage leaks from failed operations

### ST-PR-04: Encryption Performance During Sync

**Objective**: Verify encryption/decryption performance doesn't degrade sync speed.

**Chrome DevTools Setup**:
1. Performance tab: Record during sync
2. Console tab: Time encryption operations

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Create 10 offline operations | Performance: record | Encryption for each item < 100ms |
| 2 | Trigger sync | Performance: record | Decryption + sync for batch < 5 seconds |
| 3 | Monitor Web Crypto API calls | Performance: call tree | AES-GCM operations visible in profile |
| 4 | Check key lookup efficiency | Console: key retrieval timing | Key version lookup < 10ms |

**Validation**:
- Encryption/decryption doesn't cause noticeable UI lag
- Key lookup is fast (indexed by version in IndexedDB)
- Batch encryption operations don't stack memory
- Web Crypto API operations async and non-blocking

---

## Phase 9: API Route Tests

### ST-API-01: Batch Sync Endpoint

**Objective**: Verify the batch sync API endpoint processes sync requests correctly.

**Chrome DevTools Setup**:
1. Login as any role
2. Network tab: Monitor sync API requests
3. Console tab: Check sync results

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Create offline data and go online | Network: POST /api/v1/sync/batch | Request sent with `{ changes: SyncChange[] }` body |
| 2 | Check request payload | Network: click request > Payload | Array of SyncChange objects with type, action, data, versionNumber |
| 3 | Check response | Network: click request > Response | `{ successful: [], conflicts: [], failed: [], totalProcessed: N }` |
| 4 | Verify auth in request | Network: request headers | Authorization header with JWT token |
| 5 | Check error handling for 501 | Console: if endpoint returns 501 | Sync engine handles unimplemented endpoint gracefully |

**Note**: The batch sync endpoint (`/api/v1/sync/batch`) currently returns 501 (Not Implemented). This test documents expected behavior for when it is fully implemented.

**Validation**:
- Request includes proper authentication
- Request body matches `SyncChange[]` interface
- Response matches `SyncBatchResult` interface
- 501 responses handled gracefully by sync engine

### ST-API-02: Sync Status Endpoint

**Objective**: Verify the sync status API endpoint returns meaningful data.

**Chrome DevTools Setup**:
1. Network tab: Monitor GET /api/v1/sync/status

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | Trigger status check | Network: GET /api/v1/sync/status | Response with sync status data |
| 2 | Check response format | Network: response body | JSON with sync state information |

### ST-API-03: Conflict History Endpoints

**Objective**: Verify conflict history API endpoints return conflict log data.

**Chrome DevTools Setup**:
1. Create conflicts via ST-CR-04
2. Network tab: Monitor conflict API requests

**Test Steps**:

| Step | Action | DevTools Monitoring | Expected Result |
|------|--------|-------------------|-----------------|
| 1 | GET /api/v1/sync/conflicts | Network: response | Conflict history with filtering and pagination |
| 2 | GET /api/v1/sync/conflicts/summary | Network: response | Aggregate conflict stats |
| 3 | GET /api/v1/sync/conflicts/export | Network: response | CSV export of conflict data |
| 4 | Verify data source | Console: localStorage > `dms_conflict_logs` | API reads from localStorage-backed conflict logs |

**Validation**:
- Conflict endpoints read from `dms_conflict_logs` localStorage
- Filtering and pagination work correctly
- CSV export generates valid CSV format
- Summary provides accurate aggregate statistics

---

## Test Results Template

### Test Execution Summary

| Test ID | Test Name | Role | Priority | Status | Notes |
|---------|-----------|------|----------|--------|-------|
| ST-UI-01 | SyncIndicator States | All | HIGH | | |
| ST-UI-02 | OfflineIndicator States | All | HIGH | | |
| ST-UI-03 | SyncQueue Component | All | HIGH | | |
| ST-UI-04 | BackgroundSyncProvider Toasts | All | HIGH | | |
| ST-RS-01 | Response Plan Creation Sync | RESPONDER | CRITICAL | | |
| ST-RS-02 | Response Plan Update Sync | RESPONDER | CRITICAL | | |
| ST-RS-03 | Delivery Confirmation Sync | RESPONDER | CRITICAL | | |
| ST-RS-04 | Delivery Retry & Backoff | RESPONDER | HIGH | | |
| ST-RS-05 | OfflineSyncDashboard | RESPONDER | HIGH | | |
| ST-RS-06 | OfflineSyncStatus Card | RESPONDER | HIGH | | |
| ST-AS-01 | Assessment Creation Sync | ASSESSOR | HIGH | | |
| ST-AS-02 | Assessment Edit Versioning | ASSESSOR | MEDIUM | | |
| ST-AS-03 | OfflineGuard Verification | ASSESSOR | MEDIUM | | |
| ST-CO-01 | Action Signal Cache Sync | COORDINATOR | MEDIUM | | |
| ST-CO-02 | Verification Online Dependency | COORDINATOR | LOW | | |
| ST-DO-01 | Commitment Online Dependency | DONOR | LOW | | |
| ST-DO-02 | Dashboard Data Preservation | DONOR | LOW | | |
| ST-AD-01 | System Health Sync Status | ADMIN | LOW | | |
| ST-AD-02 | User Management Online | ADMIN | LOW | | |
| ST-CR-01 | Multi-Operation Batch Sync | Cross-Role | CRITICAL | | |
| ST-CR-02 | Retry Exponential Backoff | Cross-Role | HIGH | | |
| ST-CR-03 | Connectivity Auto-Sync | Cross-Role | CRITICAL | | |
| ST-CR-04 | Conflict Detection & Resolution | Cross-Role | HIGH | | |
| ST-CR-05 | Conflict Resolution Strategies | Cross-Role | HIGH | | |
| ST-CR-06 | Encryption Key Management | Cross-Role | HIGH | | |
| ST-CR-07 | Offline Bootstrap | Cross-Role | HIGH | | |
| ST-CR-08 | Sync Queue Metrics | Cross-Role | MEDIUM | | |
| ST-PR-01 | Large Queue Performance | Cross-Role | MEDIUM | | |
| ST-PR-02 | Rapid Connectivity Toggle | Cross-Role | HIGH | | |
| ST-PR-03 | Storage Quota & Cleanup | Cross-Role | MEDIUM | | |
| ST-PR-04 | Encryption Performance | Cross-Role | LOW | | |
| ST-API-01 | Batch Sync Endpoint | Cross-Role | HIGH | | |
| ST-API-02 | Sync Status Endpoint | Cross-Role | LOW | | |
| ST-API-03 | Conflict History Endpoints | Cross-Role | MEDIUM | | |

### DevTools Inspection Checklist

#### Application Tab Checks
- [ ] IndexedDB > `DisasterManagementDB` > `assessments` - encrypted assessment data
- [ ] IndexedDB > `DisasterManagementDB` > `responses` - encrypted response data
- [ ] IndexedDB > `DisasterManagementDB` > `entities` - encrypted entity data
- [ ] IndexedDB > `DisasterManagementDB` > `syncQueue` - encrypted queue items
- [ ] IndexedDB > `DisasterManagementDB` > `encryptionKeys` - key management
- [ ] IndexedDB > `DisasterManagementDB` > `cachedSignals` - signal cache
- [ ] Local Storage > `offline-store` - Zustand persisted offline state
- [ ] Local Storage > `sync-store` - Zustand persisted sync settings
- [ ] Local Storage > `drms_offline_*` - bootstrap data
- [ ] Local Storage > `dms_conflict_logs` - conflict resolution logs
- [ ] Local Storage > `delivery-device-id` - responder device tracking

#### Console Tab Monitoring Points
- [ ] `[PWA]` messages - service worker registration
- [ ] `🔄 Background sync` - background sync lifecycle
- [ ] `✅ Background sync completed` - sync success
- [ ] `❌ Background sync failed` - sync failure
- [ ] `📶 Network connection restored/lost` - connectivity events
- [ ] `ResponseOfflineService` - response offline operations
- [ ] `DeliveryOfflineService` - delivery offline operations
- [ ] `ConflictResolver` - conflict detection and resolution
- [ ] `EncryptionManager` - encryption/decryption operations
- [ ] `OfflineBootstrapService` - bootstrap lifecycle

#### Network Tab Request Patterns
- [ ] `POST /api/v1/sync/batch` - batch sync operations
- [ ] `GET /api/v1/sync/status` - sync status polling
- [ ] `GET /api/v1/sync/conflicts` - conflict history queries
- [ ] `GET /api/v1/sync/conflicts/summary` - conflict summary
- [ ] `GET /api/v1/sync/conflicts/export` - CSV export
- [ ] `POST /api/v1/rapid-assessments` - assessment creation
- [ ] `POST /api/v1/responses` - response creation
- [ ] `POST /api/v1/responses/[id]/deliver` - delivery confirmation
- [ ] Delivery media upload requests

---

## Known Limitations & Implementation Gaps

1. **Batch sync API not implemented**: `POST /api/v1/sync/batch` returns 501. The sync engine will fail on actual sync until this endpoint is implemented. Tests should document expected behavior.

2. **Assessment forms use direct API calls**: The assessment creation form (`/assessor/rapid-assessments/new`) submits directly via `apiPost('/api/v1/rapid-assessments')` rather than through the offline queue. Offline assessment creation may fail. The `useOffline.queueOperation()` infrastructure exists but is not wired to the form.

3. **Dual sync systems overlap**: `useOffline` (generic Zustand + IndexedDB) and `useSync` (SyncEngine + SyncStore) have overlapping responsibilities. The `ResponsePlanningForm` imports both. This can cause confusion about which system processes a given operation.

4. **Delivery sync is most complete**: The delivery workflow has the most complete offline implementation with `DeliveryOfflineService`, priority system, and dedicated UI components (`OfflineSyncDashboard`, `OfflineSyncStatus`).

5. **PWA disabled in development**: Service worker caching is disabled in dev mode (`[PWA] PWA support is disabled`), so offline navigation may not work. Use Chrome DevTools offline simulation for testing.

---

## Conclusion

This sync testing plan provides comprehensive coverage of the DRMS offline-to-online sync lifecycle across all user roles. The tests are designed to be executed entirely with Chrome DevTools, leveraging Network tab for connectivity simulation, Application tab for storage inspection, Console tab for debugging, and Performance tab for analysis.

**Testing Priority Order**:
1. **CRITICAL**: RESPONDER delivery sync (ST-RS-01 through ST-RS-06) - most complete offline implementation
2. **HIGH**: Cross-role sync mechanics (ST-CR-01, ST-CR-03, ST-CR-04) - core sync engine behavior
3. **HIGH**: Sync UI indicators (ST-UI-01 through ST-UI-04) - user-facing sync feedback
4. **MEDIUM**: ASSESSOR assessment sync (ST-AS-01 through ST-AS-03) - partial offline support
5. **LOW**: COORDINATOR/DONOR/ADMIN (online-only roles) - limited sync interaction

**Test Coverage Target**: 95% of sync code paths across all roles and component layers.
