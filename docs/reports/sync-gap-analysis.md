# Sync Gap Analysis & Fix Plan

**Date**: 2026-06-07
**Related**: `docs/reports/sync-test-results.md`, `docs/plans/sync-testing-plan.md`

---

## Overview

Five architectural gaps were identified during comprehensive sync testing. Each is analyzed below with root cause, impact, affected files, and a detailed fix plan.

---

## Gap 1: Assessment Offline Submission Not Implemented (CRITICAL)

### Root Cause

The assessment creation page (`src/app/(auth)/assessor/rapid-assessments/new/page.tsx:178`) calls `apiPost('/api/v1/rapid-assessments', data)` directly. There is no offline fallback. When the network call fails, the error propagates and **all form data is lost**.

By contrast, the response planning form uses `ResponseOfflineService` which tries online first, then stores to IndexedDB and sync queue on failure.

### Impact

- **Data loss**: Assessment data entered offline is permanently lost on submission
- **Field workers cannot work offline**: Must have connectivity to submit assessments
- **Assessor role is effectively online-only** despite the AssessmentOfflineGuard existing

### Key Insight: 90% of Infrastructure Already Exists

The offline infrastructure for assessments is already built:

| Component | File | Status |
|-----------|------|--------|
| IndexedDB `assessments` table | `src/lib/db/offline.ts:4-16` | Ready |
| `offlineDB.addAssessment()` method | `src/lib/db/offline.ts:391-401` | Ready |
| `offlineDB.updateAssessment()` method | `src/lib/db/offline.ts:411-422` | Ready |
| `useOffline.queueOperation()` assessment handler | `src/hooks/useOffline.ts:61-73` | Ready |
| `SyncEngine` assessment status handler | `src/lib/sync/engine.ts:396-400` | Ready |
| `AssessmentOfflineGuard` component | `src/components/offline/OfflineGuard.tsx:271-280` | Ready |
| Bootstrap assessment templates | `src/lib/offline/bootstrap.ts:110-117` | Ready |

**Only missing piece**: An `AssessmentOfflineService` that wraps the try-online/fallback-offline pattern.

### Fix

#### Step 1: Create `src/lib/services/assessment-offline.service.ts`

Model after `src/lib/services/response-offline.service.ts`:

```typescript
import { offlineDB } from '@/lib/db/offline';
import { apiPost } from '@/lib/api';

export class AssessmentOfflineService {
  async createAssessment(data: any, assessorId: string): Promise<any> {
    try {
      const result = await apiPost('/api/v1/rapid-assessments', data);
      if (result.success) {
        const assessment = result.data;
        await offlineDB.addAssessment({
          uuid: assessment.id || crypto.randomUUID(),
          assessorId,
          entityId: data.entityId,
          assessmentType: data.type,
          data: { ...data, ...assessment },
          gpsLocation: data.location,
          syncStatus: 'synced',
          lastModified: new Date(),
          timestamp: new Date(),
        });
        return { ...assessment, syncStatus: 'synced' };
      }
      throw new Error(result.error || 'Failed to create assessment');
    } catch (error) {
      // Offline fallback
      const offlineId = crypto.randomUUID();
      const offlineAssessment = {
        uuid: offlineId,
        assessorId,
        entityId: data.entityId,
        assessmentType: data.type,
        data: { ...data, id: offlineId, syncStatus: 'pending' },
        gpsLocation: data.location,
        syncStatus: 'pending' as const,
        lastModified: new Date(),
        timestamp: new Date(),
      };

      await offlineDB.addAssessment(offlineAssessment);
      await offlineDB.addToSyncQueue({
        uuid: crypto.randomUUID(),
        type: 'assessment',
        action: 'create',
        entityUuid: data.entityId,
        data: offlineAssessment.data,
        priority: 5,
        attempts: 0,
        timestamp: new Date(),
      });

      return { ...offlineAssessment.data, syncStatus: 'pending' };
    }
  }
}

export const assessmentOfflineService = new AssessmentOfflineService();
```

#### Step 2: Modify `src/app/(auth)/assessor/rapid-assessments/new/page.tsx`

Replace line 178:
```typescript
// OLD: const result = await apiPost('/api/v1/rapid-assessments', assessmentData);
// NEW:
const result = await assessmentOfflineService.createAssessment(assessmentData, userId);

if (result.syncStatus === 'pending') {
  // Show "saved locally" message
}
handleAssessmentComplete();
```

Add imports for `assessmentOfflineService`, `useOffline`, and `useSync` hooks.

#### Step 3: Update assessment list page to show offline assessments

In `src/app/(auth)/assessor/rapid-assessments/page.tsx`, merge IndexedDB pending assessments with server-fetched list.

### Potential Issues

1. **`assessorId` mismatch**: IndexedDB requires a UUID; the form uses `assessorName` string. Pass user ID from auth context.
2. **Client-side validation**: Server validates with `CreateRapidAssessmentSchema`. Offline validation is skipped. Consider running Zod validation before storing.
3. **Date serialization**: `Date` objects become strings in IndexedDB. Server schema uses `z.coerce.date()` which handles this.

---

## Gap 2: Batch Sync API Incomplete (CRITICAL)

### Root Cause

The batch sync endpoint (`src/app/api/v1/sync/batch/route.ts:50-57`) validates and authorizes requests correctly, but then returns `501 Not Implemented` instead of processing the sync changes.

### Current Behavior

```
POST /api/v1/sync/batch
  => Validates Zod schema (SyncChange[])     -- works
  => Checks entity assignment authorization   -- works
  => Returns 501 "Not yet implemented"        -- stops here
```

### Required Behavior

```
POST /api/v1/sync/batch
  => Validates Zod schema                     -- works
  => Checks entity assignment authorization    -- works
  => Process each SyncChange in a transaction  -- MISSING
  => Return SyncResult[] per change            -- MISSING
```

### Fix

#### Step 1: Create `src/lib/services/sync-processing.service.ts`

A dedicated service that processes sync changes within a Prisma transaction:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SyncChange {
  type: 'assessment' | 'response' | 'entity';
  action: 'create' | 'update' | 'delete';
  data: any;
  offlineId?: string;
  versionNumber: number;
  entityUuid: string;
}

export interface SyncResult {
  offlineId?: string;
  serverId: string;
  status: 'success' | 'conflict' | 'failed';
  message?: string;
  conflictData?: any;
}

export class SyncProcessingService {
  async processBatch(changes: SyncChange[], userId: string): Promise<SyncResult[]> {
    return prisma.$transaction(async (tx) => {
      const results: SyncResult[] = [];
      for (const change of changes) {
        let result: SyncResult;
        switch (change.type) {
          case 'assessment':
            result = await this.processAssessmentChange(tx, change, userId);
            break;
          case 'response':
            result = await this.processResponseChange(tx, change, userId);
            break;
          case 'entity':
            result = { offlineId: change.offlineId, serverId: '', status: 'failed',
                       message: 'Entity sync not supported' };
            break;
          default:
            result = { offlineId: change.offlineId, serverId: '', status: 'failed',
                       message: `Unknown type: ${change.type}` };
        }
        results.push(result);
      }
      return results;
    });
  }

  private async processAssessmentChange(tx: any, change: SyncChange, userId: string): Promise<SyncResult> {
    if (change.action === 'create') {
      try {
        const assessment = await tx.rapidAssessment.create({
          data: {
            rapidAssessmentType: change.data.type,
            rapidAssessmentDate: new Date(change.data.rapidAssessmentDate || Date.now()),
            assessorId: userId,
            assessorName: change.data.assessorName || 'Offline Assessor',
            entityId: change.entityUuid,
            incidentId: change.data.incidentId,
            location: change.data.location,
            coordinates: change.data.coordinates,
            priority: change.data.priority || 'MEDIUM',
            mediaAttachments: change.data.mediaAttachments || [],
            versionNumber: 1,
            isOfflineCreated: true,
            syncStatus: 'SYNCED',
            verificationStatus: 'SUBMITTED',
          }
        });
        return { offlineId: change.offlineId, serverId: assessment.id, status: 'success',
                 message: 'Assessment created' };
      } catch (error: any) {
        return { offlineId: change.offlineId, serverId: '', status: 'failed',
                 message: error.message };
      }
    }

    if (change.action === 'update') {
      const existing = await tx.rapidAssessment.findFirst({
        where: { id: change.data.id }
      });
      if (!existing) {
        return { offlineId: change.offlineId, serverId: '', status: 'failed',
                 message: 'Assessment not found' };
      }
      if (existing.versionNumber !== change.versionNumber) {
        return { offlineId: change.offlineId, serverId: existing.id, status: 'conflict',
                 message: 'Version conflict', conflictData: existing };
      }
      const updated = await tx.rapidAssessment.update({
        where: { id: existing.id },
        data: {
          ...change.data,
          versionNumber: { increment: 1 },
          syncStatus: 'SYNCED',
        }
      });
      return { offlineId: change.offlineId, serverId: updated.id, status: 'success' };
    }

    if (change.action === 'delete') {
      try {
        await tx.rapidAssessment.delete({ where: { id: change.data.id } });
        return { offlineId: change.offlineId, serverId: change.data.id, status: 'success' };
      } catch (error: any) {
        return { offlineId: change.offlineId, serverId: '', status: 'failed',
                 message: error.message };
      }
    }

    return { offlineId: change.offlineId, serverId: '', status: 'failed',
             message: `Unknown action: ${change.action}` };
  }

  private async processResponseChange(tx: any, change: SyncChange, userId: string): Promise<SyncResult> {
    if (change.action === 'create') {
      try {
        const response = await tx.rapidResponse.create({
          data: {
            responderId: userId,
            entityId: change.entityUuid,
            assessmentId: change.data.assessmentId,
            type: change.data.type || 'STANDARD',
            priority: change.data.priority || 'MEDIUM',
            description: change.data.description,
            items: change.data.items || [],
            deliveryStatus: change.data.deliveryStatus || 'PLANNED',
            verificationStatus: 'SUBMITTED',
            versionNumber: 1,
            isOfflineCreated: true,
            syncStatus: 'SYNCED',
            offlineId: change.offlineId,
          }
        });
        return { offlineId: change.offlineId, serverId: response.id, status: 'success',
                 message: 'Response created' };
      } catch (error: any) {
        return { offlineId: change.offlineId, serverId: '', status: 'failed',
                 message: error.message };
      }
    }

    // Similar pattern for update and delete...
    if (change.action === 'update') {
      const existing = await tx.rapidResponse.findFirst({
        where: { offlineId: change.offlineId }
      });
      if (!existing && change.data.id) {
        // try by server id
      }
      if (!existing) {
        return { offlineId: change.offlineId, serverId: '', status: 'failed',
                 message: 'Response not found' };
      }
      if (existing.versionNumber !== change.versionNumber) {
        return { offlineId: change.offlineId, serverId: existing.id, status: 'conflict',
                 message: 'Version conflict', conflictData: existing };
      }
      await tx.rapidResponse.update({
        where: { id: existing.id },
        data: { ...change.data, versionNumber: { increment: 1 }, syncStatus: 'SYNCED' }
      });
      return { offlineId: change.offlineId, serverId: existing.id, status: 'success' };
    }

    if (change.action === 'delete') {
      try {
        await tx.rapidResponse.delete({ where: { id: change.data.id } });
        return { offlineId: change.offlineId, serverId: change.data.id, status: 'success' };
      } catch (error: any) {
        return { offlineId: change.offlineId, serverId: '', status: 'failed',
                 message: error.message };
      }
    }

    return { offlineId: change.offlineId, serverId: '', status: 'failed',
             message: `Unknown action: ${change.action}` };
  }
}

export const syncProcessingService = new SyncProcessingService();
```

#### Step 2: Modify `src/app/api/v1/sync/batch/route.ts`

Replace lines 50-57 (the 501 response) with:

```typescript
import { syncProcessingService } from '@/lib/services/sync-processing.service';

// After validation and authorization (existing lines 25-48):
const results = await syncProcessingService.processBatch(changes, context.userId);

const successful = results.filter(r => r.status === 'success');
const conflicts = results.filter(r => r.status === 'conflict');
const failed = results.filter(r => r.status === 'failed');

return successResponse(results, {
  totalProcessed: results.length,
  successful: successful.length,
  conflicts: conflicts.length,
  failed: failed.length,
});
```

### Post-Sync Side Effects

After processing, consider triggering:
- Gap analysis for new assessments (`RapidAssessmentService.triggerGapAnalysis`)
- Action signal evaluation (`ActionSignalService.evaluateAndGenerate`)
- Incident severity recalculation

These should be queued (not blocking the sync response) to keep sync fast.

### Entity Sync

EntityService has no create/update/delete methods. Recommendation: **Reject entity sync changes** with a clear message. Entities are admin-managed and should not be created by field workers.

---

## Gap 3: Dual Sync Systems Overlap (HIGH)

### Root Cause

Three independent sync systems exist simultaneously, all reading/writing the same IndexedDB `syncQueue` table without coordination:

| System | Core Files | Sync Queue Entry | Sync Execution |
|--------|-----------|-----------------|----------------|
| **A: Offline Store** | `useOffline.ts`, `offline.store.ts` | `useOfflineStore.addToSyncQueue()` | `useOffline.syncData()` (STUB - silently drops items) |
| **B: Sync Engine** | `engine.ts`, `queue.ts`, `sync.store.ts` | `syncEngine.addToQueue()` / `queueManager.addItem()` | `syncEngine.triggerSync()` via `/api/v1/sync/batch` |
| **C: Delivery Offline** | `delivery-offline.service.ts`, `useBackgroundSync.ts` | Direct `offlineDB.syncQueue.add()` | `DeliveryOfflineService.syncPendingOperations()` direct API calls |

### Specific Problems

1. **4 independent `navigator.onLine` listeners** that don't coordinate (offline.store, sync.store, SyncEngine, BackgroundSyncProvider)

2. **5 different queue entry points** all writing to the same IndexedDB table but maintaining separate in-memory state

3. **4 separate sync execution paths** that can race against each other:
   - `useOffline.syncData()` -- **DANGEROUS STUB** that silently removes items without syncing
   - `SyncEngine.triggerSync()` -- real implementation, calls batch API
   - `DeliveryOfflineService.syncPendingOperations()` -- processes delivery items directly
   - `ResponseOfflineService.syncPendingResponses()` -- processes response items directly

4. **The stub in `useOffline.syncData()` destroys data**: Lines 105-157 read queue items and remove them without processing. This is the most dangerous issue.

### Fix (Phased Approach)

#### Phase 1: Stop the Bleeding (Low Risk)

**1a. Disable the dangerous stub sync in `useOffline.ts`**

```typescript
// src/hooks/useOffline.ts - Lines 105-157 and lines 215-219
// REMOVE or DISABLE the syncData() auto-sync useEffect
// This stub silently drops queued items
```

**1b. Remove duplicate online listeners**

Remove `window.addEventListener('online'/'offline')` from:
- `src/providers/BackgroundSyncProvider.tsx` (lines 26-51)
- `src/components/layouts/OfflineLayout.tsx` (lines 34-57)

Both should read `isOnline` from `useSyncStore` instead.

**1c. Migrate `OfflineIndicator.tsx` and `SyncIndicator.tsx` to use `syncStore`**

Currently using `useOfflineStore`. Migrate to `useSyncStore` for consistency.

#### Phase 2: Unify Queue Entry Point (Medium Risk)

Route all queue additions through `SyncEngine`:

| Current Code | Change To |
|-------------|-----------|
| `ResponseOfflineService` calls `offlineDB.addToSyncQueue()` | `syncEngine.addToQueue()` |
| `DeliveryOfflineService` calls `offlineDB.syncQueue.add()` | `syncEngine.addToQueue()` |
| `preliminary-assessment.store.ts` calls `useOfflineStore.addToSyncQueue()` | `syncEngine.addToQueue()` |
| `useOffline.queueOperation()` calls `addToSyncQueue()` | `syncEngine.addToQueue()` |

#### Phase 3: Unify Sync Execution (Medium Risk)

Register domain-specific handlers in `SyncEngine`:

```typescript
// src/lib/sync/engine.ts - Add handler registration
class SyncEngine {
  private handlers: Map<string, SyncHandler> = new Map();

  registerHandler(type: string, handler: SyncHandler) {
    this.handlers.set(type, handler);
  }

  async triggerSync() {
    // Instead of calling POST /api/v1/sync/batch for everything,
    // delegate to registered handlers
    for (const item of batch) {
      const handler = this.handlers.get(item.type);
      if (handler) {
        await handler.process(item);
      }
    }
  }
}
```

This allows `DeliveryOfflineService` and `ResponseOfflineService` to register as handlers while `SyncEngine` orchestrates.

#### Phase 4: Remove Dead Code (Low Risk)

After migration:
- Remove `src/hooks/useOffline.ts`
- Remove `src/stores/offline.store.ts`
- Remove `src/hooks/useBackgroundSync.ts`
- Simplify `BackgroundSyncProvider` to use `useSyncStore`
- Consolidate `SyncIndicator` + `OfflineIndicator` to use single store

---

## Gap 4: Conflict API Reads localStorage Server-Side (MEDIUM)

### Root Cause

`ConflictResolver` (`src/lib/sync/conflict.ts`) stores conflict logs in `localStorage` under key `dms_conflict_logs`. The conflict API routes (`/api/v1/sync/conflicts/*`) import `conflictResolver` and call methods that read from localStorage.

On the server, `localStorage` is unavailable. The code guards with `typeof window === 'undefined'` and returns empty arrays. Result: **API always returns empty data** even when conflicts exist client-side.

### Current Behavior

```
Client: conflictResolver.resolveConflict() → writes to localStorage ✓
Server: GET /api/v1/sync/conflicts → reads from localStorage → [] (empty) ✗
Server: GET /api/v1/sync/conflicts/summary → reads from localStorage → all zeros ✗
Server: GET /api/v1/sync/conflicts/export → reads from localStorage → CSV headers only ✗
```

### Fix Options

#### Option A: Database Storage (Recommended)

Use the existing `SyncConflict` Prisma model (already in schema at line 494):

```typescript
// src/lib/sync/conflict.ts - Modify logConflictResolution()
private async logConflictResolution(log: ConflictResolutionLog): Promise<void> {
  // Store in database instead of localStorage
  await prisma.syncConflict.create({
    data: {
      entityType: log.entityType,
      entityId: log.entityUuid,
      resolutionMethod: log.resolutionStrategy,
      winningVersion: log.localVersion,  // or serverVersion depending on resolution
      losingVersion: log.serverVersion,
      resolvedAt: log.resolvedAt || new Date(),
      resolvedBy: log.resolvedBy || 'system',
      metadata: {
        autoResolved: log.autoResolved,
        conflictReason: log.conflictReason,
        localVersion: log.localVersion,
        serverVersion: log.serverVersion,
      }
    }
  });
}
```

Then update API routes to query the database:

```typescript
// src/app/api/v1/sync/conflicts/route.ts
const conflicts = await prisma.syncConflict.findMany({
  where: { ...filters },
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: (page - 1) * limit,
});
```

#### Option B: Hybrid (Quick Fix)

Keep localStorage for client-side display, but also write to a server-readable location. The `processBatch` handler in Gap 2's fix would write conflict records to the database as part of sync processing.

### Recommended Approach

**Option A** is the right long-term fix. The `SyncConflict` model already exists in the Prisma schema. The conflict API routes should query it directly.

During the transition (Phase), the sync processing service from Gap 2 should also write conflict records when it detects version mismatches.

---

## Gap 5: PWA Disabled in Development (LOW)

### Root Cause

PWA is intentionally disabled in development via `pwa.config.js:6-14`:

```javascript
const isDevelopment = process.env.NODE_ENV === 'development';
const isPWATesting = process.env.PWA_TESTING === 'true';

environments: {
  development: {
    enablePWA: isPWATesting,  // false unless PWA_TESTING=true
  }
}
```

This is **by design** to prevent service worker caching from interfering with HMR during development.

### Existing PWA Infrastructure (Already Built)

| Component | File | Status |
|-----------|------|--------|
| Service Worker | `public/sw.js` | Exists (stale from previous build) |
| Offline Page | `public/offline.html` | Ready |
| Install Prompt | `src/components/pwa/InstallPrompt.tsx` | Ready |
| Offline Layout | `src/components/layouts/OfflineLayout.tsx` | Ready |
| Manifest | `public/manifest.json` | Ready |
| Dev Manifest | `public/manifest-dev.json` | Ready (red theme) |
| Test Manifest | `public/manifest-test.json` | Ready (blue theme) |

### Fix

**For development testing:**
```bash
PWA_TESTING=true npm run dev
```

**For production:** No changes needed. PWA is enabled automatically when `NODE_ENV=production`.

### Cleanup Tasks

1. **Add stale build artifacts to `.gitignore`**:
   - `public/sw.js` (generated by next-pwa during build)
   - `public/workbox-*.js`
   - `public/fallback-*.js`

2. **Update `.gitignore`** to exclude:
   ```
   public/sw.js
   public/workbox-*.js
   public/fallback-*.js
   ```

3. No code changes needed for PWA itself -- it works in production already.

---

## Priority & Effort Matrix

| Gap | Priority | Effort | Impact | Dependencies |
|-----|----------|--------|--------|-------------|
| Gap 1: Assessment offline | CRITICAL | 2 days | Field workers can submit offline | None |
| Gap 2: Batch sync API | CRITICAL | 3-5 days | Enables full sync lifecycle | None |
| Gap 3: Dual sync systems | HIGH | 3 days | Prevents data loss, simplifies codebase | Gaps 1 & 2 |
| Gap 4: Conflict storage | MEDIUM | 1 day | Accurate conflict reporting | Gap 2 |
| Gap 5: PWA in dev | LOW | 0.5 days | Better testing experience | None |

### Recommended Implementation Order

```
Phase A (Parallel):  Gap 1 + Gap 2 + Gap 5
Phase B (Sequential): Gap 3 (after Gaps 1 & 2 validated)
Phase C (Sequential): Gap 4 (after Gap 2 validated)
```

**Total estimated effort**: 8-10 days for all 5 gaps.

---

## File Change Summary

### New Files to Create

| File | Gap | Purpose |
|------|-----|---------|
| `src/lib/services/assessment-offline.service.ts` | 1 | Assessment offline submission service |
| `src/lib/services/sync-processing.service.ts` | 2 | Server-side sync batch processing |

### Files to Modify

| File | Gap | Change |
|------|-----|--------|
| `src/app/(auth)/assessor/rapid-assessments/new/page.tsx` | 1 | Use AssessmentOfflineService |
| `src/app/api/v1/sync/batch/route.ts` | 2 | Replace 501 with sync processing |
| `src/lib/sync/conflict.ts` | 4 | Store to database instead of localStorage |
| `src/app/api/v1/sync/conflicts/route.ts` | 4 | Query database |
| `src/app/api/v1/sync/conflicts/summary/route.ts` | 4 | Query database |
| `src/app/api/v1/sync/conflicts/export/route.ts` | 4 | Query database |
| `src/hooks/useOffline.ts` | 3 | Disable dangerous stub sync |
| `src/providers/BackgroundSyncProvider.tsx` | 3 | Remove duplicate online listener |
| `.gitignore` | 5 | Exclude stale PWA build artifacts |

### Files to Eventually Remove (Phase 3 consolidation)

| File | Gap | Replacement |
|------|-----|------------|
| `src/hooks/useOffline.ts` | 3 | `useSync.ts` |
| `src/stores/offline.store.ts` | 3 | `sync.store.ts` |
| `src/hooks/useBackgroundSync.ts` | 3 | SyncEngine periodic sync |
