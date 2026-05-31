---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-05-29'
inputDocuments:
  - '_bmad-output/planning-artifacts/prds/prd-dms-v4-bmad-v6-2026-05-29/prd.md'
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/architecture/'
workflowType: 'architecture'
project_name: 'dms-v4-bmad-v6'
user_name: 'Bilnigma'
date: '2026-05-29'
scope: 'Action-Driven Dashboards delta architecture'
extends: '_bmad-output/planning-artifacts/architecture.md'
---

# Architecture Decision Document — Action-Driven Dashboards

_This document is a delta architecture extending the existing system architecture at `_bmad-output/planning-artifacts/architecture.md`. It defines only the new components, schema changes, and infrastructure introduced by the Action-Driven Dashboards PRD. All existing patterns, conventions, and components remain unchanged unless explicitly overridden here._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- **20 FRs** across 6 features, scoped to 3 role dashboards (Assessor, Responder, Donor) and shared infrastructure
- Core new capability: Action Signal Engine — deterministic signal generation from assessment/response/commitment state changes, persisted in a new `ActionSignal` model with priority derivation rules
- UI: 3 dashboard action queues replacing passive "recent records" views, with bidirectional map integration using existing Leaflet infrastructure
- New infrastructure: PWA push notifications via `web-push` library + `PushSubscription` model
- Schema fix: `DonorCommitment.planId` FK for many-commitments-to-one-plan, per-item `deliveredQuantity` tracking, commitment import API fixes

**Non-Functional Requirements:**
- Signal API response < 500ms (p95) for up to 100 assigned entities
- Dashboard load time unchanged (existing 2s target)
- Real-time: signal updates within 60s of trigger (polling); in-app notifications within 5s (SSE)
- Offline: signals cached in IndexedDB, valid for 24h offline; population overdue calculated client-side
- Accessibility: keyboard-navigable queue, ARIA-labeled icons, color not sole severity indicator
- Security: role-based signal access, notification delivery verifies active session

**Scale & Complexity:**
- Primary domain: full-stack (schema + services + API + push + UI + offline)
- Complexity level: high
- Estimated new architectural components: 8 (ActionSignal model, PushSubscription model, signal engine service, signal API, signal hooks/store, notification service, push service, 3 dashboard components + shared queue/map)

### Technical Constraints & Dependencies

- **Must extend existing architecture** — not replace. New services follow `lib/services/{name}.service.ts` pattern with static methods and direct Prisma import
- **Must follow existing API conventions** — `withAuth` wrapper, Zod validation, `ApiResponse<T>` envelope, `/api/v1/` prefix
- **Must use existing state patterns** — TanStack Query for server state (signals), Zustand for UI state (filters, selection), NOT Zustand for signal data
- **Must integrate with existing offline infrastructure** — Dexie IndexedDB for signal cache, existing bootstrap flow, sync engine for delta updates
- **Real-time is polling-based** — no WebSocket in production. TanStack Query `refetchInterval` for signal refresh; SSE for in-app notifications (extending existing `/api/v1/verification/live` pattern)
- **PWA push is new infrastructure** — `web-push` npm package, VAPID keys, new `PushSubscription` model. No existing push infrastructure to build on
- **Existing commitment-to-plan API has bugs** — FR-16 fixes the `/api/v1/responses/from-commitment` endpoint (hardcoded type/status, ignored frontend inputs)

### Cross-Cutting Concerns Identified

- **Signal generation triggers** — Must fire from multiple write paths (assessment verification, response verification, commitment creation, population cadence expiry). Requires a consistent hook pattern across `assessment.service`, `response.service`, and `commitment.service`
- **Role-based signal visibility** — Single `ActionSignal` table serves all 3 roles. Query-time filtering by user's role + entity assignments
- **Signal lifecycle management** — Create (upsert on unique constraint), Active (unresolved), Resolved (on condition change), Reconciliation (nightly job). Must be consistent across all signal reasons
- **Multi-incident grouping** — Signals grouped by entity+type, expandable per-incident. Grouping logic in API response structure
- **Notification reliability** — Push delivery must handle expired subscriptions, user opt-in state, and foreground/background detection

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (PWA) — **existing, in production**. This is a delta architecture extending an established codebase. No starter template selection required.

### Existing Technology Stack (Already Decided)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Database | PostgreSQL 16 + Prisma | Latest |
| UI Framework | React 18 | 18.x |
| Component Library | Shadcn/ui + Radix | Latest |
| Styling | Tailwind CSS | 3.x |
| State (UI) | Zustand | 4.x |
| State (Server) | TanStack Query | 5.x |
| Forms | React Hook Form + Zod | Latest |
| Maps | React-Leaflet + Leaflet | Latest |
| Offline | next-pwa + Dexie (IndexedDB) | Latest |
| Auth | JWT (cookie + Bearer) | Custom |
| API Pattern | REST (Next.js API Routes) | /api/v1/ |
| Real-time | SSE + Polling | Custom |

### New Dependencies Introduced by This PRD

| Dependency | Purpose | FR |
|-----------|---------|-----|
| `web-push` | PWA push notification delivery (VAPID) | FR-13 |

This is the only new npm dependency. All other requirements use existing infrastructure.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Signal generation architecture — how signals are created on state changes
2. Population cadence timer enforcement — how overdue detection works
3. Commitment ↔ Plan relationship — schema approach for many-to-many
4. In-app notification delivery channel — SSE vs polling vs hybrid
5. Notification persistence — whether notifications are separate from signals

**Important Decisions (Shape Architecture):**
6. Offline signal caching strategy — IndexedDB integration
7. Multi-incident grouping — API response structure

**Deferred Decisions (Post-MVP):**
- Notification preferences UI (FR-14)
- Historical signal analytics
- Email notification channel

### AD-1: Signal Generation — Service-Layer Hooks

**Decision:** Signals are generated synchronously by existing service methods calling `ActionSignalService.evaluateAndGenerate()` as a post-mutation side effect, within the same Prisma transaction.

**Rationale:** Consistent with existing service patterns (static methods calling other static methods). Atomic — if the signal evaluation fails, the parent transaction rolls back. No new infrastructure (no message queue, no background workers). The nightly reconciliation job handles any signals missed due to edge cases.

**Implementation pattern:**
```
AssessmentService.verifyAssessment() {
  tx.rapidAssessment.update({ verificationStatus: 'VERIFIED' })
  // audit log
  ActionSignalService.evaluateAndGenerate({ trigger: 'assessment-verified', entityId, assessmentType, incidentId }, tx)
  // This single call:
  // 1. Resolves 'unassessed' signal for this entity+type+incident (for assessors)
  // 2. Generates 'awaiting-plan' signal for this entity+assessment (for responders)
  // 3. Generates 'assessment-needs-response' signal (for donors)
  // 4. Generates 'reassessment-needed' signals for OTHER entities if conditions match
}
```

**Trigger points:**
- `AssessmentService` — verify, reject, submit
- `ResponseService` — verify, confirmDelivery, createPlannedResponse
- `CommitmentService` — create, update status
- `IncidentService` — update metadata (cadence changes)
- Nightly reconciliation job — catches missed signals

**Affects:** FR-1, FR-2, FR-3, FR-4, FR-5.1

### AD-2: Population Cadence Timer — Lazy Evaluation + Client-Side Offline

**Decision:** Server-side lazy evaluation on API call (no cron). Client-side deadline calculation for offline UX.

**Rationale:** No job scheduler infrastructure exists. The signal API is called every 30s via TanStack Query polling — this is frequent enough for population cadence (which operates in hours, not seconds). For offline, the client calculates overdue locally from cached cadence settings and last assessment dates, showing signals immediately without waiting for server confirmation.

**Server-side evaluation:**
```
ActionSignalService.getActiveSignals(userId) {
  // ... fetch standard signals ...

  // Population overdue: check each assigned entity's incident cadence
  for each (entity, incident) where incident.metadata.populationAssessmentCadenceHours exists:
    lastPopulationAssessment = find latest POPULATION assessment for entity+incident
    deadline = (lastPopulationAssessment?.createdAt ?? incident.createdAt) + cadenceHours
    if (now > deadline && no active 'overdue' signal exists):
      upsert overdue signal
}
```

**Client-side offline calculation:**
```
IndexedDB cache stores: entityAssignments, incident metadata (cadence), last population assessment dates
Dashboard reads cache, calculates: deadline = lastAssessment + cadence
If offline and deadline passed: show overdue signal with [OFFLINE] badge
On reconnect: server confirms or resolves
```

**Affects:** FR-1, FR-4, FR-18

### AD-3: Commitment ↔ Plan Relationship — Junction Table (Normalized)

**Decision:** New `PlanCommitment` junction table for the many-to-many relationship. Deprecate and remove `RapidResponse.commitmentId` (single FK). Clean normalized schema — no backward compatibility burden since first deployment hasn't happened.

**Rationale:** User preference for clean, normalized architecture. No legacy data to migrate. Junction table supports: one plan with multiple commitments, one commitment linked to zero or one plan, coverage calculations via aggregation across junction rows.

**New Prisma model:**
```prisma
model PlanCommitment {
  id            String   @id @default(uuid()) @map("id")
  planId        String   @map("plan_id")       // FK to RapidResponse
  commitmentId  String   @map("commitment_id") // FK to DonorCommitment
  createdAt     DateTime @default(now()) @map("created_at")

  plan          RapidResponse   @relation(fields: [planId], references: [id], onDelete: Cascade)
  commitment    DonorCommitment @relation(fields: [commitmentId], references: [id], onDelete: Cascade)

  @@unique([planId, commitmentId])
  @@map("plan_commitments")
}
```

**Migration steps:**
1. Create `PlanCommitment` model
2. Populate junction table from existing `RapidResponse.commitmentId` (where non-null)
3. Remove `commitmentId` and `donorId` fields from `RapidResponse`
4. All commitment↔plan queries now go through `PlanCommitment`

**Coverage calculation:**
```
For a plan: get all linked commitments via PlanCommitment
Per plan item: sum matching commitment item quantities across all linked commitments
Coverage = committed / planned per item
```

**Affects:** FR-2, FR-3, FR-15, FR-16

### AD-4: In-App Notification Delivery — Hybrid SSE + TanStack Query

**Decision:** New SSE channel `/api/v1/signals/live` for lightweight notification events (signal ID + summary). TanStack Query polling (`refetchInterval: 30000`) for full signal data refresh. SSE pushes trigger TanStack Query cache invalidation on the client.

**Rationale:** Extends the established SSE pattern (already used for verification queue). Gives <5s notification latency while keeping data loading on the proven TanStack Query pattern. No WebSocket infrastructure needed.

**SSE event format:**
```json
{ "type": "SIGNAL_CREATED", "data": { "signalId": "...", "signalReason": "awaiting-plan", "entityName": "...", "priority": "CRITICAL" } }
{ "type": "SIGNAL_RESOLVED", "data": { "signalId": "..." } }
```

**Client flow:**
1. SSE connection receives `SIGNAL_CREATED` event
2. Client shows toast notification with summary
3. Client calls `queryClient.invalidateQueries({ queryKey: ['action-signals'] })`
4. TanStack Query refetches full signal list on next render

**Affects:** FR-12, FR-13

### AD-5: Notification Persistence — Separate Notification Model

**Decision:** New `Notification` Prisma model, separate from `ActionSignal`. Every signal creation generates a notification. Notifications track read/dismiss state independently from signal lifecycle. A resolved signal does NOT auto-dismiss its notification.

**Rationale:** Signal lifecycle (active/resolved) is orthogonal to notification lifecycle (unread/read/dismissed). A signal can resolve (entity assessed) while the user hasn't seen the notification yet. Unread count badge requires server-side tracking. 24h auto-expiry is a notification concern, not a signal concern.

**New Prisma model:**
```prisma
model Notification {
  id          String    @id @default(uuid()) @map("id")
  userId      String    @map("user_id")
  signalId    String    @map("signal_id")
  title       String    @map("title")
  body        String    @map("body")
  priority    String    @map("priority")
  readAt      DateTime? @map("read_at")
  dismissedAt DateTime? @map("dismissed_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  expiresAt   DateTime  @map("expires_at")

  user        User        @relation(fields: [userId], references: [id])
  signal      ActionSignal @relation(fields: [signalId], references: [id])

  @@index([userId, readAt])
  @@index([userId, expiresAt])
  @@map("notifications")
}
```

**Lifecycle:**
- Created alongside each new `ActionSignal` row
- `expiresAt` = `createdAt + 24h` (auto-cleaned by nightly job)
- `readAt` set when user views notification
- `dismissedAt` set when user explicitly dismisses
- Unread count = notifications where `readAt IS NULL AND dismissedAt IS NULL AND expiresAt > now()`

**Affects:** FR-12, FR-14

### Decision Impact Analysis

**Implementation Sequence:**
1. Schema changes: `ActionSignal`, `Notification`, `PlanCommitment`, `PushSubscription` models + `DonorCommitment.items` migration + remove `RapidResponse.commitmentId`/`donorId`
2. `ActionSignalService` — core signal evaluation and lifecycle management
3. Service-layer hooks — integrate `evaluateAndGenerate()` calls into existing services
4. Signal API — `GET /api/v1/action-signals` + `GET /api/v1/signals/live` (SSE)
5. Notification API — `GET /api/v1/notifications`, `PATCH /api/v1/notifications/[id]/read`, `/dismiss`
6. Push infrastructure — VAPID setup, `POST/DELETE /api/v1/push/subscribe`, push delivery
7. Client hooks + store — `useActionSignals` TanStack Query hook, `action-signal.store.ts` Zustand store
8. Dashboard components — shared `ActionQueue`, role-specific dashboards, map integration
9. Offline signal cache — IndexedDB tables, bootstrap integration
10. Commitment import API fix — FR-16
11. Nightly reconciliation job

**Cross-Component Dependencies:**
- Schema (1) → Everything else
- `ActionSignalService` (2) → Service hooks (3) → API (4) → Client hooks (7) → Dashboard (8)
- `PlanCommitment` (1) → Commitment import fix (10) → Signal engine (2) [commitment signals depend on plan linkage]
- Push (6) depends on Notification (5) depends on Signal engine (2)
- Offline (9) depends on API (4) and client hooks (7)

## Implementation Patterns & Consistency Rules (Delta)

*All existing patterns from the base architecture (`architecture/coding-standards/`) remain unchanged. This section defines only new patterns introduced by Action-Driven Dashboards.*

### Signal Engine Patterns

**Signal evaluation must be idempotent.** `ActionSignalService.evaluateAndGenerate()` may be called multiple times for the same trigger. The `@@unique([userId, entityId, incidentId, type, signalReason])` constraint ensures upsert behavior — no duplicate signals.

**Signal evaluation must be transactional.** Always receives a `PrismaTransaction` (`tx`) parameter. Signal upserts and resolutions happen within the caller's transaction. Never commit independently.

**Signal resolution is implicit, not explicit.** When `evaluateAndGenerate()` runs, it first resolves any active signals that the current state change makes obsolete (e.g., assessment submitted → resolve `unassessed` signal). Then it generates new signals. This happens in the same transaction.

**Priority derivation is deterministic.** Use the priority table from FR-5 in the PRD. Never infer priority from context or heuristics. If an incident severity changes, run `evaluateAndGenerate()` for all signals in that incident's scope.

### Notification Patterns

**Notifications are created synchronously with signals.** Inside the same `evaluateAndGenerate()` call, after upserting a signal, create a `Notification` row for the signal's `userId`. This ensures atomicity.

**Notification title/body use templates, not free text.** Each `signalReason` maps to a template:
```
unassessed → title: "Assessment needed", body: "{entityName} — {assessmentType} assessment has not been conducted."
reassessment-needed → title: "Reassessment needed", body: "{entityName} — situation changed after verified {responseMode} response."
overdue → title: "Population assessment overdue", body: "{entityName} — population assessment deadline has passed."
awaiting-plan → title: "Response plan needed", body: "{entityName} — verified {assessmentType} assessment awaits a response plan."
awaiting-plan-for-commitment → title: "Commitment needs a plan", body: "{donorName} committed resources for {entityName} — no response plan linked."
awaiting-delivery → title: "Delivery confirmation needed", body: "{entityName} — response plan for {responseMode} awaits delivery confirmation."
partially-covered → title: "Plan partially covered", body: "{entityName} — response plan has partial commitment coverage ({coveragePercent}%)."
assessment-needs-response → title: "Assessment needs response", body: "{entityName} — verified {assessmentType} assessment needs resources."
plan-needs-commitment → title: "Plan needs commitment", body: "{entityName} — response plan for {responseMode} needs donor commitments."
partially-fulfilled → title: "Commitment partially fulfilled", body: "{entityName} — your commitment is partially delivered."
commitment-awaiting-plan → title: "Your commitment awaits action", body: "{entityName} — your commitment is awaiting a responder's plan."
```

### Commitment-Plan Link Patterns

**Always use `PlanCommitment` junction table.** Never reference `RapidResponse.commitmentId` — that field is being removed. All commitment↔plan relationships go through `PlanCommitment`.

**Coverage is calculated, not stored.** No `coveragePercent` column. Calculate on-the-fly by summing committed item quantities across all linked commitments and comparing against plan items.

**Per-item `deliveredQuantity` in `DonorCommitment.items` JSON.** Each item in the array has structure: `{ name: string, unit: string, quantity: number, deliveredQuantity: number, estimatedValue?: number }`. Aggregate fields (`totalCommittedQuantity`, `deliveredQuantity`) are derived from per-item data.

### Client-Side Signal Patterns

**TanStack Query for signal data.** `useActionSignals` hook with `queryKey: ['action-signals', roleId, entityId?]`, `refetchInterval: 30000`, `staleTime: 15000`. Never store signal data in Zustand.

**Zustand for signal UI state only.** `action-signal.store.ts` manages: `selectedEntityId`, `sortField`, `sortOrder`, `expandedGroups` (Set of entity+type keys). No signal data in the store.

**Offline signal cache in Dexie.** New table `cachedSignals` in `lib/db/offline.ts`. Bootstrap fetches full signal set. On reconnect, cache is refreshed from API response.

## Project Structure & Boundaries (Delta)

*All existing directory structure remains. This shows only new files and modified files.*

### New Files

```
src/
├── app/api/v1/
│   ├── action-signals/
│   │   └── route.ts                          # GET - list signals (FR-5.2)
│   ├── signals/
│   │   └── live/
│   │       └── route.ts                      # SSE - real-time signal events (FR-12)
│   ├── notifications/
│   │   ├── route.ts                          # GET - list notifications
│   │   └── [id]/
│   │       ├── read/
│   │       │   └── route.ts                  # PATCH - mark read
│   │       └── dismiss/
│   │           └── route.ts                  # PATCH - dismiss
│   └── push/
│       └── subscribe/
│           └── route.ts                      # POST/DELETE - push subscription
├── components/features/action-signals/
│   ├── ActionQueue.tsx                       # Shared queue component (FR-6/7/8)
│   ├── ActionQueueItem.tsx                   # Single queue item with expand
│   ├── SignalReasonIcon.tsx                  # Icon mapping per signal reason
│   ├── PerItemCoverage.tsx                   # Per-item coverage breakdown
│   └── SignalDetailPanel.tsx                 # Expanded detail panel
├── components/features/notifications/
│   ├── NotificationToast.tsx                 # In-app toast notification
│   └── NotificationBadge.tsx                 # Unread count badge for nav
├── components/dashboards/
│   ├── assessor/
│   │   └── AssessorActionDashboard.tsx       # Assessor dashboard rewrite (FR-6)
│   ├── responder/
│   │   └── ResponderActionDashboard.tsx      # Responder dashboard rewrite (FR-7)
│   └── donor/
│       └── DonorActionDashboard.tsx          # Donor dashboard rewrite (FR-8)
├── hooks/
│   ├── useActionSignals.ts                   # TanStack Query hook for signals
│   ├── useNotifications.ts                   # TanStack Query hook for notifications
│   └── useSignalSSE.ts                       # SSE connection for signal events
├── lib/services/
│   ├── action-signal.service.ts              # Signal engine (FR-1 through FR-5.1)
│   ├── notification.service.ts               # REWRITE - persistent notifications (FR-12)
│   └── push-notification.service.ts          # NEW - web-push delivery (FR-13)
├── lib/validation/
│   └── action-signal.ts                      # Zod schemas for signal API
├── stores/
│   └── action-signal.store.ts                # UI state only (filters, selection)
├── types/
│   ├── action-signal.ts                      # Signal types and enums
│   └── notification.ts                       # Notification types
├── lib/db/
│   └── offline.ts                            # MODIFY - add cachedSignals table
├── lib/jobs/
│   └── signal-reconciliation.ts              # Nightly reconciliation job
prisma/
└── schema.prisma                             # MODIFY - add ActionSignal, Notification, PlanCommitment, PushSubscription; remove RapidResponse.commitmentId/donorId
```

### Modified Files

```
src/lib/services/assessment-relationships.service.ts  # ADD - call ActionSignalService on verify
src/lib/services/response.service.ts                  # ADD - call ActionSignalService on verify/delivery/plan
src/lib/services/commitment.service.ts                # ADD - call ActionSignalService on create; UPDATE - PlanCommitment
src/app/api/v1/responses/from-commitment/route.ts     # REWRITE - fix hardcoded type/status, use PlanCommitment
src/components/donor/CommitmentForm.tsx                # MODIFY - link to existing plan via PlanCommitment
src/components/forms/response/DonorCommitmentImportForm.tsx  # MODIFY - per-item validation, plan creation
src/app/(auth)/assessor/dashboard/page.tsx             # REWRITE - use AssessorActionDashboard
src/app/(auth)/responder/dashboard/page.tsx            # REWRITE - use ResponderActionDashboard
src/app/(auth)/donor/dashboard/page.tsx                # REWRITE - use DonorActionDashboard
src/components/layouts/Navigation.tsx                  # MODIFY - add NotificationBadge
src/lib/offline/bootstrap.ts                           # MODIFY - cache signals on bootstrap
```

### Architectural Boundaries

**Signal Engine Boundary:** `ActionSignalService` is the single entry point. No other service directly reads or writes the `ActionSignal` or `Notification` tables. All signal generation goes through `evaluateAndGenerate()`. All signal resolution goes through the same method.

**Service Hook Boundary:** Existing services call `ActionSignalService.evaluateAndGenerate()` only at well-defined trigger points (verify, submit, delivery, commit). They pass a `PrismaTransaction` and a typed trigger object. They never construct signals directly.

**Component Boundary:** `ActionQueue` is a shared component parameterized by role. It receives signal data from `useActionSignals` hook. Role-specific dashboards compose `ActionQueue` + map + detail panel. No role-specific logic inside `ActionQueue`.

**Data Boundary:** `PlanCommitment` is the only way to link commitments and plans. No direct FK between `RapidResponse` and `DonorCommitment`. Coverage calculations go through `PlanCommitment` aggregation.

### Requirements to Structure Mapping

| FR | New Files | Modified Files |
|----|-----------|---------------|
| FR-1 (Assessor signals) | `action-signal.service.ts`, `action-signals/route.ts` | `assessment-relationships.service.ts` |
| FR-2 (Responder signals) | (same service) | `response.service.ts` |
| FR-3 (Donor signals) | (same service) | `commitment.service.ts` |
| FR-4 (Population cadence) | `action-signal.service.ts` | (incident metadata) |
| FR-5 (Priority rules) | `action-signal.ts` (types) | — |
| FR-5.1 (Persistence) | `schema.prisma` | — |
| FR-5.2 (API) | `action-signals/route.ts` | — |
| FR-6 (Assessor queue) | `AssessorActionDashboard.tsx`, `ActionQueue.tsx` | `assessor/dashboard/page.tsx` |
| FR-7 (Responder queue) | `ResponderActionDashboard.tsx` | `responder/dashboard/page.tsx` |
| FR-8 (Donor queue) | `DonorActionDashboard.tsx` | `donor/dashboard/page.tsx` |
| FR-9 (Sort control) | `action-signal.store.ts` | — |
| FR-10 (Map) | (reuses existing Leaflet infra) | — |
| FR-11 (Bidirectional) | `action-signal.store.ts` | — |
| FR-12 (In-app notif) | `NotificationToast.tsx`, `NotificationBadge.tsx`, `signals/live/route.ts`, `notifications/` routes | `Navigation.tsx`, `notification.service.ts` |
| FR-13 (Push) | `push-notification.service.ts`, `push/subscribe/route.ts` | — |
| FR-15 (PlanCommitment) | `schema.prisma` | — |
| FR-16 (Import API fix) | — | `from-commitment/route.ts`, `DonorCommitmentImportForm.tsx` |
| FR-17 (Per-item tracking) | — | `schema.prisma`, `commitment.service.ts` |
| FR-18 (Offline cache) | — | `offline.ts`, `bootstrap.ts` |

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All 5 decisions are compatible. Service-layer hooks (AD-1) work with lazy evaluation (AD-2) since both run within Prisma transactions. Junction table (AD-3) does not conflict with SSE (AD-4) — they are orthogonal concerns. Separate notification model (AD-5) composes cleanly with signal generation from AD-1. No contradictory decisions.

**Pattern Consistency:** Signal engine patterns (idempotent, transactional, implicit resolution) are internally consistent. Notification templates cover all 11 signal reasons defined in the PRD. Client-side patterns (TanStack Query for data, Zustand for UI) align with existing architecture conventions.

**Structure Alignment:** New files follow existing naming conventions. API routes follow `/api/v1/{resource}` pattern. Components follow `components/features/{domain}/` organization. No conflicts with existing structure.

### Requirements Coverage Validation

All 20 FRs have architectural support (see mapping table above). FR-14 (notification preferences UI) is explicitly deferred to post-MVP. NFRs addressed: performance (indexing, 30s caching), offline (Dexie + client-side calculation), real-time (SSE + polling), accessibility (component-level), security (role-based entity assignment filtering).

### Implementation Readiness Validation

**Important (not blocking) gaps:**
1. Nightly reconciliation job has no scheduling mechanism. Recommendation: implement as a Next.js API route called by external scheduler (system cron, Dokploy scheduled task).
2. VAPID key generation and storage — environment variables needed in `.env.example`.

**No critical gaps found.** All 16 checklist items pass.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clean separation between signal engine and existing services via transactional hooks
- Junction table approach for commitment-plan is normalized and extensible
- Reuses existing infrastructure (SSE, TanStack Query, Leaflet, Dexie) with minimal new dependencies (`web-push` only)
- Every FR mapped to specific files with clear new/modified classification

**Areas for Future Enhancement:**
- Notification preferences UI (FR-14)
- Historical signal analytics
- Email notifications
- Signal deduplication across incidents

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions (AD-1 through AD-5) exactly as documented
- Use `ActionSignalService.evaluateAndGenerate()` as the single entry point for all signal operations
- Always use `PlanCommitment` junction table — never reference removed `RapidResponse.commitmentId`
- Respect service hook boundary — existing services call signal engine, never the reverse
- Signal data through TanStack Query, UI state through Zustand — never mix

**First Implementation Priority:**
1. Schema migration (ActionSignal, Notification, PlanCommitment, PushSubscription models + DonorCommitment.items migration + remove RapidResponse.commitmentId/donorId)
2. `ActionSignalService` — core evaluation and lifecycle
3. Service hooks into existing services
4. Signal API + SSE endpoint
5. Dashboard UI components
