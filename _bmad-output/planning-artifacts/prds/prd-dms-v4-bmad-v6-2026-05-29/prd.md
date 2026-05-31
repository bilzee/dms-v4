---
title: Action-Driven Dashboards
created: 2026-05-29
updated: 2026-05-29
status: final
---

# PRD: Action-Driven Dashboards

## 0. Document Purpose

This PRD is for the development team building the next iteration of DRMS dashboards. It targets PM, engineering, and downstream workflow owners (architecture, UX, story creation). It builds on the existing PRD at `_bmad-output/planning-artifacts/prd.md` and the existing architecture at `_bmad-output/planning-artifacts/architecture.md` — it does not duplicate them.

The document covers three role-scoped dashboards (Assessor, Responder, Donor) and their shared infrastructure: an action-signal engine, a notification system, and an interactive map component. FRs are numbered globally with stable IDs. Assumptions are tagged inline `[ASSUMPTION: ...]` and indexed in §9.

## 1. Vision

DRMS dashboards today are passive: they show recent records and their status, but they do not tell assessors what to assess, responders what to respond to, or donors where their commitments are needed. The coordinator dashboard works better because everything on the verification queue is, by definition, a call to action. This PRD extends that principle to all three operational roles.

Each dashboard becomes a mission-control surface: an action queue driven by real events in the system (assessments completed, responses verified, commitments made, deadlines expired), paired with an interactive map that shows only the user's assigned entities and responds to selection in both directions. The result is that every assessor knows what needs assessing right now, every responder knows what needs planning or delivering, and every donor sees exactly where their resources close gaps.

## 2. Target User

### 2.1 Primary Personas

**Assessor (field worker)** — Deployed to affected areas. Conducts rapid assessments of type Health, WASH, Shelter, Food, Security, or Population. Needs to know which entities need which assessment types, and when situation changes (verified response delivered) require reassessment. Works under time pressure, often on mobile, sometimes offline.

**Responder (logistics/operations)** — Plans and delivers responses based on verified assessments. Needs visibility into: assessments awaiting plans, donor commitments awaiting matching plans, and plans awaiting delivery confirmation. Works across multiple entities simultaneously.

**Donor (resource provider)** — Individual, organization, government, NGO, or corporate entity providing resources. Needs to see: assessments requiring response, existing plans needing commitment coverage, and partially fulfilled commitments. May not be a frequent user — signals must be clear and actionable on arrival.

**Coordinator (supervisor)** — Existing role. Sets population assessment cadence per incident, manages entity assignments, verifies submissions. Not the primary audience for this PRD, but the population assessment cadence setting is a coordinator-controlled input.

### 2.2 Jobs To Be Done

- Assessor: "I need to know exactly which assessment types are due for which assigned entities, right now, so I don't miss or duplicate work."
- Assessor: "I need to be prompted when a situation has changed (verified response delivered) so I can reassess accurately."
- Responder: "I need to see assessments that are verified but have no plan yet, and commitments that have no matching plan, so nothing falls through the cracks."
- Responder: "I need to convert a commitment into a plan (or delivery) with minimal friction."
- Donor: "I need to see what resources are needed for my assigned entities, informed by assessments and plans, so I can commit effectively."
- Donor: "I need to track whether my commitments have been delivered and verified."

### 2.3 Non-Users (v1)

- General public or affected populations viewing dashboards.
- External agencies without DRMS accounts.
- Automated / AI-driven assessment or response generation.

### 2.4 Key User Journeys

**UJ-1. Assessor opens dashboard and immediately sees what to do next.**
- **Persona + context:** Assessor in the field, mobile device, may be offline. Returning to the app after a break.
- **Entry state:** Authenticated, lands on `/assessor/dashboard`.
- **Path:** (1) Dashboard loads with action queue sorted by priority. Each item shows entity name, assessment type badge, signal reason ("Not yet assessed" / "Reassessment needed — verified response delivered" / "Population assessment overdue"). (2) Map highlights entities with pending actions. (3) Assessor taps an action item → entity highlights on map, detail expands showing which assessment type is due and why. (4) Assessor taps "Start Assessment" → navigates to assessment form pre-filled with entity and type.
- **Climax:** Every pending action for the assessor's assigned entities is visible on one screen without scrolling through status lists or cross-referencing manually.
- **Resolution:** Assessor starts and submits the assessment. The action item disappears from the queue. If offline, the item queues locally and clears on sync.
- **Edge case:** Population assessment timer expires while assessor is offline — signal appears on next sync.

**UJ-2. Responder sees a donor commitment with no matching plan and creates one.**
- **Persona + context:** Responder at operations center, desktop. Multiple entities assigned.
- **Entry state:** Authenticated, `/responder/dashboard`.
- **Path:** (1) Action queue shows item: "Commitment from [Donor] for [Entity] — no response plan" with commitment items summary. (2) Responder selects item → entity highlights on map, detail panel shows commitment items and quantities alongside the linked assessment's findings. (3) Responder taps "Create Plan from Commitment" → form pre-populated with commitment items, assessment data. (4) Responder adjusts items, selects quantities from commitment to cover, submits plan.
- **Climax:** A plan is created that references the commitment, and the commitment's coverage status updates.
- **Resolution:** Action item moves to "Plan created — awaiting delivery" state. Donor sees their commitment now linked to a plan.
- **Edge case:** Multiple commitments exist for the same entity+assessment — responder sees all of them and can create one plan that references multiple commitments.

**UJ-3. Donor sees assessments needing resources and commits.**
- **Persona + context:** Donor (NGO program officer), desktop, checking the system periodically.
- **Entry state:** Authenticated, `/donor/dashboard`.
- **Path:** (1) Dashboard shows action items grouped by entity. Items include: "Verified assessment with no response plan" (shows assessment type and gap summary), "Response plan needing commitment" (shows plan items and current commitment coverage), "Partially fulfilled commitment" (shows remaining items). (2) Donor selects an entity on map → action items filter to that entity. (3) Donor taps "Make Commitment" → form pre-populated with entity and plan items. (4) Donor specifies items, quantities, and submits.
- **Climax:** Commitment is recorded and the plan's coverage percentage updates in real-time.
- **Resolution:** Donor sees confirmation. Responder's dashboard updates with the new commitment.
- **Edge case:** Donor commits without a plan existing yet — commitment appears as an unlinked signal on responder's dashboard (UJ-2).

**UJ-4. Assessor is prompted to reassess after verified response delivery.**
- **Persona + context:** Assessor in field, receives push notification.
- **Entry state:** Push notification: "Reassessment needed: [Entity] — verified [Response Type] response delivered."
- **Path:** (1) Assessor taps notification → opens dashboard filtered to that entity. (2) Action item shows "Reassessment needed" with the response type that triggered it. (3) Assessor starts reassessment for the matching assessment type.
- **Climax:** Assessor knows exactly why reassessment is needed and for which type.
- **Resolution:** New assessment submitted. Previous assessment retains its verified status for audit trail.

**UJ-5. Coordinator sets population assessment cadence for an incident.**
- **Persona + context:** Coordinator configuring incident parameters.
- **Entry state:** Authenticated, incident management or settings page.
- **Path:** (1) Coordinator selects active incident. (2) Sets population assessment cadence (e.g., 24 hours). (3) Saves.
- **Climax:** All assessors with entities assigned to this incident now see population assessment deadlines driven by this cadence.
- **Resolution:** Timer starts. When deadline passes without submission, assessors see overdue signal.

## 3. Glossary

- **Action Signal** — A system-generated event indicating an operational task is due for a specific role, entity, and type. Each signal has a reason category (unassessed, reassessment-needed, overdue, awaiting-plan, awaiting-commitment, awaiting-delivery, partially-fulfilled). Drives dashboard action queues and push notifications.
- **Action Queue** — The ordered list of Action Signals displayed on a role's dashboard. Ordering is configurable by priority and type.
- **Affected Entity** — A geographic or organizational unit (Community, Ward, LGA, State, Facility, Camp) impacted by an incident. Users are assigned to entities via EntityAssignment.
- **Assessment Type** — One of six categories: Health, WASH, Shelter, Food, Security, Population. Each assessment is for one entity and one type.
- **Response Type** — One of seven categories: Health, WASH, Shelter, Food, Security, Population, Logistics. Population assessment has no matching response type; Logistics is response-only.
- **Response Plan** — A RapidResponse record with `deliveryStatus: PLANNED`. Describes intended response items, resources, and timeline. Linked to one assessment. Can be covered by multiple Donor Commitments.
- **Response Delivery** — A RapidResponse record with `deliveryStatus: DELIVERED`. Represents actual delivery of response items. Created by confirming delivery of a plan or by importing from a commitment.
- **Donor Commitment** — A pledge of specific items and quantities by a Donor for an entity+incident. Can exist with or without a linked Response Plan. Status: Planned, Partial, Complete, Cancelled.
- **Commitment Coverage** — The degree to which a Response Plan's required items are matched by Donor Commitments. Can be 0% (no commitments), partial, or 100% (fully covered).
- **Population Assessment Cadence** — A coordinator-configured time interval (per incident) after which a population assessment is considered overdue. Timer resets when a population assessment is submitted.
- **Reassessment Trigger** — A verified response delivery for an entity+type that signals the need for a new assessment of the matching type on that entity.
- **Signal Reason** — The categorized cause of an Action Signal. Determines the icon, color, and description shown to the user.
- **Verified Assessment** — A RapidAssessment whose `verificationStatus` is `VERIFIED` or `AUTO_VERIFIED`. This is the threshold at which downstream actions (response planning, reassessment triggers) activate.
- **Submitted Assessment** — A RapidAssessment whose `verificationStatus` is `SUBMITTED`. Visible to the submitter but not yet actionable by downstream roles.
- **Signal Priority** — The urgency classification of an Action Signal, derived from the underlying data (assessment priority, incident severity, or deadline proximity). Values: CRITICAL, HIGH, MEDIUM, LOW. Rules for derivation are defined in §4.1 under FR-1.1.

## 4. Features

### 4.1 Action Signal Engine

**Description:** The backend service that generates and persists Action Signals for each role by evaluating the current state of assessments, responses, and commitments. Signals are written to the `ActionSignal` database table on state-change triggers (assessment verified, response verified, commitment created, deadline expired). A nightly reconciliation job resolves signals whose underlying conditions no longer apply.

**Functional Requirements:**

#### FR-1: Generate Assessor Action Signals

The system shall generate Action Signals for Assessors based on the following conditions, evaluated against the Assessor's assigned entities:

1. **Missing assessment**: An affected entity has no assessment with `verificationStatus` in (`SUBMITTED`, `VERIFIED`, `AUTO_VERIFIED`) for a given Assessment Type. Signal reason: "unassessed".
2. **Reassessment needed**: A RapidResponse with `deliveryStatus: DELIVERED` and `verificationStatus` in (`VERIFIED`, `AUTO_VERIFIED`) exists for an entity+type combination, and no assessment of the matching type with `verificationStatus` in (`SUBMITTED`, `VERIFIED`, `AUTO_VERIFIED`) has been created since the response's `verifiedAt` date. Signal reason: "reassessment-needed". `[ASSUMPTION: The matching is by Assessment Type ↔ Response Type, excluding Population which has no response type.]`
3. **Population assessment overdue**: The population assessment cadence timer for an incident has expired for an entity, and no population assessment with `verificationStatus` in (`SUBMITTED`, `VERIFIED`, `AUTO_VERIFIED`) has been created since the deadline. Signal reason: "overdue".

Realizes UJ-1, UJ-4, UJ-5.

**Consequences:**
- For each assessor with assigned entities, the system returns a list of Action Signals with: entity ID, entity name, assessment type, signal reason, priority, and relevant timestamps (last assessment date, response verification date, deadline).
- An entity that is fully assessed and has no reassessment triggers produces no signals.
- A single entity can produce up to 6 signals (one per assessment type) if none have been conducted.

**Out of Scope:**
- Signals for preliminary assessments (those are a separate workflow).
- Triggering reassessment for types other than the matching response type.

#### FR-2: Generate Responder Action Signals

The system shall generate Action Signals for Responders based on the following conditions, evaluated against the Responder's assigned entities:

1. **Assessment awaiting plan**: A Verified Assessment exists for an entity with no Response Plan (PLANNED RapidResponse) linked to it. Signal reason: "awaiting-plan".
2. **Commitment awaiting plan**: A Donor Commitment exists for an entity+incident with `planId: null` and no responses linked via `DonorCommitment.responses`. Signal reason: "awaiting-plan-for-commitment".
3. **Plan awaiting delivery**: A Response Plan exists with `deliveryStatus: PLANNED`. Signal reason: "awaiting-delivery".
4. **Plan with partial commitment coverage**: A Response Plan has linked commitments (via `DonorCommitment.planId`) but one or more plan items have committed quantity less than planned quantity. Coverage is evaluated per-item, not aggregate. Signal reason: "partially-covered". The signal context includes a per-item breakdown: item name, planned quantity, committed quantity, coverage percentage.

Realizes UJ-2.

**Consequences:**
- Each responder signal includes: entity ID, entity name, assessment ID, response type, signal reason, priority, linked commitment summary (if applicable), and relevant timestamps.
- An assessment that already has a DELIVERED response does not generate "awaiting-plan" signals.
- A commitment linked to a plan does not generate "awaiting-plan-for-commitment" signals.

**Out of Scope:**
- Signals about verification status (that is coordinator scope).

#### FR-3: Generate Donor Action Signals

The system shall generate Action Signals for Donors based on the following conditions, evaluated against the Donor's assigned entities:

1. **Verified assessment with no response plan**: A Verified Assessment exists for an entity with no Response Plan. Signal reason: "assessment-needs-response". The donor sees assessment type and gap summary to understand what resources are needed.
2. **Response plan needing commitment**: A Response Plan exists with no linked commitments (no DonorCommitment rows with `planId` matching this plan), or per-item committed quantity is less than planned quantity for one or more items. Signal reason: "plan-needs-commitment". Shows per-item breakdown: item name, planned quantity, committed quantity, coverage percentage.
3. **Partially fulfilled commitment**: A Donor Commitment exists with status PARTIAL (some items have `deliveredQuantity > 0` but not equal to `quantity`). Signal reason: "partially-fulfilled".
4. **Commitment with no linked plan**: A Donor Commitment exists with `planId: null`. This is informational — tells the donor their commitment is awaiting responder action. Signal reason: "commitment-awaiting-plan".

Realizes UJ-3.

**Consequences:**
- Each donor signal includes: entity ID, entity name, assessment or plan summary, signal reason, and actionable context (what the donor can do about it).
- Donors only see signals for their own commitments (items 3, 4) or for entities assigned to them (items 1, 2).

#### FR-4: Population Assessment Cadence Configuration

A Coordinator can set a population assessment cadence (in hours) per active incident. The timer starts from the most recent population assessment submission date per entity, or from the incident creation date if no assessment has been submitted. When the cadence expires for an entity, the system generates an "overdue" Action Signal for all assessors assigned to that entity who are also assigned to the incident's entities.

Realizes UJ-5.

**Consequences:**
- Cadence is stored as an incident-level setting in the `Incident.metadata` JSON field (key: `populationAssessmentCadenceHours`).
- Each entity within the incident tracks its own deadline independently.
- Changing the cadence recalculates deadlines from each entity's last submission date.
- Setting cadence to 0 or null disables periodic population signals for that incident.
- Each entity within the incident tracks its own deadline independently.
- Changing the cadence recalculates deadlines from each entity's last submission date.
- Setting cadence to 0 or null disables periodic population signals for that incident.

#### FR-5: Signal Priority Derivation Rules

Signal priority is derived from the underlying data, not set arbitrarily. The following rules apply:

| Signal Reason | Priority Source | Rule |
|---|---|---|
| unassessed | Incident severity | `CRITICAL` incident → CRITICAL signal; `HIGH` → HIGH; `MEDIUM`/`LOW` → MEDIUM |
| reassessment-needed | Original assessment priority | Inherit the priority of the most recent verified assessment for that entity+type |
| overdue | CRITICAL | All overdue population assessment signals are CRITICAL regardless of incident severity |
| awaiting-plan | Assessment priority | Inherit the priority of the verified assessment awaiting a plan |
| awaiting-plan-for-commitment | Commitment priority | Inherit from the incident severity of the commitment's incident |
| awaiting-delivery | Response plan priority | Inherit the priority of the awaiting plan (`RapidResponse.priority`) |
| partially-covered | Response plan priority | Inherit the priority of the plan with partial coverage |
| assessment-needs-response | Assessment priority | Inherit the priority of the verified assessment |
| plan-needs-commitment | Response plan priority | Inherit the priority of the plan needing commitment |
| partially-fulfilled | Commitment's incident severity | Inherit from the commitment's incident severity |
| commitment-awaiting-plan | Commitment's incident severity | Inherit from the commitment's incident severity |

`[ASSUMPTION: All entities have coordinates stored in the coordinates JSON field. Entities without coordinates are excluded from map rendering but still appear in the queue.]`

**Consequences:**
- Every signal has a deterministic priority — no ambiguity for engineers.
- Changing an incident's severity updates all derived signal priorities.
- Priority drives queue ordering (FR-9), push eligibility (CRITICAL/HIGH only per FR-13), and visual treatment (FR-6/7/8).

#### FR-5.1: Action Signal Persistence Model

Action Signals are persisted in a new `ActionSignal` Prisma model:

```
ActionSignal {
  id             String    @id @default(uuid())
  userId         String    // FK to User
  entityId       String    // FK to Entity
  incidentId     String?   // FK to Incident (nullable — some signals are not incident-specific)
  type           String    // AssessmentType or ResponseType
  signalReason   String    // Enum: unassessed, reassessment-needed, overdue, awaiting-plan, etc.
  priority       String    // Enum: CRITICAL, HIGH, MEDIUM, LOW
  context        Json      // Reason-specific payload
  createdAt      DateTime  @default(now())
  resolvedAt     DateTime? // Set when underlying condition no longer applies

  user           User      @relation(fields: [userId], references: [id])
  entity         Entity    @relation(fields: [entityId], references: [id])
  incident       Incident? @relation(fields: [incidentId], references: [id])

  @@unique([userId, entityId, incidentId, type, signalReason])
  @@index([userId, resolvedAt])
  @@index([userId, entityId])
  @@index([userId, priority])
}
```

**Lifecycle:**
- **Created**: When a state-change event produces a new condition (e.g., assessment verified → awaiting-plan signal for responders). Upsert on the unique constraint — if an active signal already exists for the same userId+entityId+incidentId+type+reason, update its context and priority rather than creating a duplicate.
- **Active**: `resolvedAt` is null. Visible on dashboard and eligible for push.
- **Resolved**: `resolvedAt` set to current timestamp when the underlying condition no longer applies (e.g., assessment submitted → unassessed signal resolved; plan created → awaiting-plan signal resolved). Resolved signals are excluded from dashboard queries.
- **Reconciliation**: A nightly job queries all active signals, re-evaluates each against current state, and resolves any whose conditions are stale. This handles edge cases where the triggering event's side-effect failed to resolve the signal.

**Consequences:**
- No duplicate signals per user+entity+incident+type+reason combination.
- Resolved signals remain in the database for audit trail and analytics (v2).
- The nightly job is a safety net, not the primary resolution mechanism.

#### FR-5.2: Action Signal API Endpoint

The system shall expose a unified API endpoint that returns active Action Signals for the authenticated user, filtered by their role and entity assignments.

**Consequences:**
- `GET /api/v1/action-signals` returns a paginated list of active (unresolved) signals with: `id`, `entityId`, `entityName`, `entityCoordinates`, `type`, `signalReason`, `priority`, `incidentId`, `incidentName`, `createdAt`, `context`.
- Supports query parameters: `role` (auto-detected from auth), `entityId` (filter), `incidentId` (filter), `signalReason` (filter), `sortBy` (priority, type, createdAt), `sortOrder` (asc, desc).
- Response cached for 30 seconds (matching existing polling intervals) and invalidated on write operations that change signal state.
- The API groups results by entityId+type for multi-incident collapsing (see FR-6 Assessor queue). Each group includes a `incidents` array with per-incident signal detail. The grouping is applied server-side to avoid client-side deduplication.

### 4.2 Dashboard UI — Action Queue

**Description:** The front-end component that renders Action Signals as an actionable queue on each role's dashboard. Replaces the current passive "recent records" view with a signal-driven interface. Realizes UJ-1, UJ-2, UJ-3.

**Functional Requirements:**

#### FR-6: Assessor Action Queue

The Assessor Dashboard shall display an Action Queue listing all Action Signals for the authenticated assessor. Each item shows: entity name, assessment type badge, signal reason with icon and description, priority badge, and a primary action button ("Start Assessment" for unassessed/overdue, "Reassess" for reassessment-needed). Selecting an item highlights the corresponding entity on the map and expands a detail panel with the signal's context.

Realizes UJ-1, UJ-4.

**Consequences:**
- Queue is empty only when all assigned entities have up-to-date assessments for all 6 types with no reassessment triggers.
- Action buttons navigate to the assessment form pre-populated with entity ID and assessment type.
- Items with signal reason "overdue" are visually distinct (e.g., pulsing indicator, red accent).
- Queue supports ordering by priority and by assessment type.
- Multi-incident signals are grouped by entity+type into a single collapsible queue item. Expanding the item shows per-incident detail lines (incident name, signal reason, deadline or trigger date). Example: "Maiduguri Camp — Health assessment ▸ 2 incidents (tap to expand)" → expands to show "Flood 2026: not yet assessed" and "Cholera Outbreak 2026: reassessment needed." Tapping an expanded incident line navigates to the assessment form scoped to that incident.
- When a grouped signal is resolved for one incident but not others, only the resolved incident line is removed; the group persists until all incidents are resolved.

#### FR-7: Responder Action Queue

The Responder Dashboard shall display an Action Queue listing all Action Signals for the authenticated responder. Each item shows: entity name, response type badge, signal reason, linked assessment or commitment summary, and a primary action button ("Create Plan", "Create Plan from Commitment", "Confirm Delivery"). Selecting an item highlights the entity on the map and shows a detail panel with the signal's context (assessment findings, commitment items, plan status).

Realizes UJ-2.

**Consequences:**
- "Create Plan from Commitment" navigates to the existing commitment import form, pre-populated with the commitment data.
- "Confirm Delivery" navigates to the existing delivery confirmation form.
- Items are orderable by priority and response type.

#### FR-8: Donor Action Queue

The Donor Dashboard shall display an Action Queue listing all Action Signals for the authenticated donor. Each item shows: entity name, signal reason, summary (assessment gap, plan items needed, commitment status), and a primary action button ("View Assessment", "Make Commitment", "View Commitment"). Selecting an item highlights the entity on the map and shows a detail panel.

Realizes UJ-3.

**Consequences:**
- "Make Commitment" navigates to the existing commitment form pre-populated with entity and plan context.
- "View Assessment" opens a read-only assessment summary showing gap analysis and findings.
- Queue ordering by type (assessment-type / response-type / commitment-type) and priority.

#### FR-9: Configurable Queue Ordering

Each dashboard shall provide a sort control allowing the user to order the action queue by: priority (CRITICAL > HIGH > MEDIUM > LOW), or by type (assessment-type / response-type). Default sort is priority descending. The selected sort persists for the user's session.

**Consequences:**
- Sort control is a dropdown or toggle visible above the queue.
- Selection stored in sessionStorage (not persisted across sessions).

### 4.3 Interactive Map Integration

**Description:** An interactive map on each dashboard showing only the user's assigned entities, with bidirectional selection linking between map and action queue. Built on the existing React-Leaflet map infrastructure.

**Functional Requirements:**

#### FR-10: Assigned-Entities Map View

Each dashboard (Assessor, Responder, Donor) shall display an interactive map showing only entities assigned to the authenticated user. Entities are rendered as markers using the existing Leaflet infrastructure. Marker appearance indicates the number and severity of pending Action Signals for that entity.

**Consequences:**
- Entities with no pending signals are rendered with a neutral (gray) marker.
- Entities with pending signals show a count badge and color based on highest-priority signal.
- Markers are clickable and trigger entity selection.
- Only assigned entities appear — the map does not show unassigned entities.

#### FR-11: Bidirectional Map-Queue Selection

Selecting an entity on the map filters the action queue to show only signals for that entity. Selecting an action queue item highlights the corresponding entity on the map (marker bounces or pulses, map pans to center the entity). Clearing the selection (clicking map background or a "clear filter" control) restores the full queue.

**Consequences:**
- Map selection state is synchronized with queue filter state.
- Selecting a different entity replaces the previous filter.
- Map auto-zooms to fit all assigned entities on initial load; zooms to the selected entity on item selection.

### 4.4 Push Notification System

**Description:** Extends the existing real-time infrastructure (SSE + polling) to deliver Action Signal notifications to users both in-app and as push notifications via the PWA service worker.

**Functional Requirements:**

#### FR-12: In-App Notification Delivery

The system shall deliver in-app notifications when new Action Signals are generated for the authenticated user. Notifications appear as toast-style alerts with: signal summary, entity name, action type, and a click target that navigates to the relevant dashboard with the signal pre-selected.

**Consequences:**
- Notifications use the existing SSE infrastructure (extending `/api/v1/dashboard/live` or a new SSE channel).
- Unread notification count shown in the navigation bar badge.
- Notifications are dismissable and auto-expire after 24 hours.
- Works both when the user is on the dashboard and when navigating elsewhere in the app.

#### FR-13: PWA Push Notification

The system shall deliver push notifications via the PWA service worker for high-priority Action Signals (CRITICAL and HIGH priority). Notifications include: signal reason, entity name, and a deep link to the relevant dashboard. Push delivery uses the `web-push` Node.js library with VAPID keys. Browser push subscriptions are stored in a new `PushSubscription` Prisma model: `id`, `userId`, `endpoint` (unique), `p256dh`, `auth`, `browserInfo`, `createdAt`. A new API endpoint `POST /api/v1/push/subscribe` registers subscriptions; `DELETE /api/v1/push/subscribe` removes them. When a new `ActionSignal` row is inserted with CRITICAL or HIGH priority, the server queries the user's active push subscriptions and sends a notification via `web-push.sendNotification()`.

**Consequences:**
- Requires user opt-in for push notifications (browser permission prompt).
- Push is only sent when the user does not have the app in the foreground.
- Leverages the existing `next-pwa` service worker infrastructure.
- VAPID keys generated once and stored as environment variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
- Supports multiple devices per user (phone + desktop each create a separate subscription).
- Expired subscriptions (browser-reported) are automatically removed on next push attempt.

#### FR-14: Notification Preferences

Users can configure notification preferences per signal reason category: enable/disable in-app notifications, enable/disable push notifications. Default is all enabled for in-app, CRITICAL/HIGH only for push.

**Consequences:**
- Preferences stored per user (in existing `User.metadata` JSON or a new `NotificationPreference` model).
- Preferences accessible from the dashboard settings or user profile.

### 4.5 Commitment-Plan Relationship Fix

**Description:** Fixes the data model and API gaps in the existing commitment-to-plan flow to support the many-commitments-to-one-plan relationship required by the action-driven dashboards.

**Functional Requirements:**

#### FR-15: Schema — DonorCommitment Links to Response Plan

The `DonorCommitment` model shall gain an optional `planId` field (FK to `RapidResponse`) allowing a commitment to reference the response plan it is intended to cover. Multiple commitments can reference the same plan. A commitment with `planId: null` has no linked plan (orphan commitment — triggers "awaiting-plan-for-commitment" signal on responder dashboard).

**Consequences:**
- `RapidResponse.commitmentId` (existing) remains for backward compatibility but is superseded by the reverse link `DonorCommitment.planId` for the many-to-one case.
- Migration must set `planId` on existing commitments where a linked response exists (via the existing `RapidResponse.commitmentId` FK).
- A commitment's `planId` can be set by: the donor when creating a commitment (selecting an existing plan), the responder when creating a plan from a commitment, or the responder when linking an orphan commitment to an existing plan.

#### FR-16: Fix Commitment Import API

The `/api/v1/responses/from-commitment` endpoint shall be fixed to: (1) accept `assessmentId`, `type`, and `priority` from the request body instead of hardcoding them, (2) create a Response Plan (`deliveryStatus: PLANNED`) when the "Create Plan" action is used (currently it incorrectly creates DELIVERED status), (3) set `commitment.planId` on the commitment when a plan is created from it, (4) validate per-item quantities against commitment item availability, not just aggregate totals.

**Consequences:**
- Frontend form fields that currently collect assessmentId, type, and priority are now honored by the API.
- The "Create Plan" button creates a PLANNED response; the "Create Delivery Directly" button creates a DELIVERED response — no more mismatch.
- Per-item quantity tracking prevents a responder from requesting more of a specific item than was committed.

#### FR-17: Per-Item Commitment Tracking

The `DonorCommitment` model shall track delivered quantities per item, not just as an aggregate. This enables accurate coverage calculations and prevents the current issue where consuming blankets marks tents as partially delivered.

**Consequences:**
- `DonorCommitment.items` JSON array extended to include `deliveredQuantity` per item.
- When a response is created from a commitment, only the specific items selected have their `deliveredQuantity` incremented.
- `totalCommittedQuantity` and `deliveredQuantity` aggregate fields remain for summary display but are derived from per-item data.

### 4.6 Offline Signal Awareness

**Description:** Ensures Action Signals are available to assessors and responders operating offline, consistent with the existing PWA offline strategy.

**Functional Requirements:**

#### FR-18: Offline Action Signal Cache

The system shall cache Action Signals for the authenticated user's assigned entities in IndexedDB (via the existing offline bootstrap infrastructure) so that the action queue is available when offline. Signals are updated on sync.

**Consequences:**
- On bootstrap (auth + online), the full signal set for the user's role is fetched and cached.
- When offline, the dashboard reads from cache. Signals that would have been generated by actions taken by other users while offline are not available (acceptable — the field worker acts on their last-known signal set).
- On reconnection, the signal cache is refreshed.
- Population assessment overdue signals are calculated client-side based on cached cadence settings and last assessment dates.

## 5. Non-Goals (Explicit)

- **Replacing the coordinator dashboard.** The coordinator's verification-driven dashboard already works well. This PRD does not redesign it.
- **Automated response planning or AI-driven suggestions.** The system surfaces what needs doing; the human decides what to do.
- **Cross-role visibility.** Assessors don't see responder signals and vice versa. Each dashboard is role-scoped.
- **Real-time collaboration / live cursor sharing.** Signals update via polling/SSE, not multi-user presence.
- **Changing the assessment or response data models.** Only the commitment model and its relationships are modified.
- **Email notifications.** Push (PWA) and in-app only for v1. Email is a v2 candidate.
- **Desktop-native application.** Web/PWA only.
- **Preliminary assessment signals.** Preliminary assessments follow a separate workflow not covered here.

## 6. MVP Scope

### 6.1 In Scope

- Action Signal Engine: Assessor signals (FR-1), Responder signals (FR-2), Donor signals (FR-3), Population cadence (FR-4), Priority rules (FR-5), Persistence model (FR-5.1), API endpoint (FR-5.2).
- Dashboard Action Queues: Assessor (FR-6), Responder (FR-7), Donor (FR-8), Sort control (FR-9).
- Map Integration: Assigned-entities map (FR-10), Bidirectional selection (FR-11).
- Notifications: In-app (FR-12), PWA push (FR-13).
- Schema Fix: Commitment-plan link (FR-15), API fix (FR-16), Per-item tracking (FR-17).
- Offline: Signal cache (FR-18).

### 6.2 Out of Scope for MVP

- **Notification preferences UI (FR-14)** — Default settings applied; user customization deferred to v2.
- **Historical signal analytics** — "How many signals were generated last week" type reporting. Not needed for operations. The persisted `ActionSignal` model enables this in v2.
- **Response-type-scoped responder assignments** — All responders assigned to an entity see all orphan commitments for that entity. Type-scoped assignments are a significant schema and UX change for a separate effort.

## 7. Success Metrics

**Primary**
- **SM-1**: Time from signal generation to action taken (assessment submitted, plan created, commitment made) — median < 4 hours for CRITICAL priority signals. Validates FR-1 through FR-8.
- **SM-2**: Signal coverage — percentage of assigned entities with at least one pending signal that are surfaced on the dashboard. Target: 100%. Validates FR-5, FR-10.

**Secondary**
- **SM-3**: Action queue engagement rate — percentage of signals that result in a user action (click-through to form) within 24 hours. Target: > 70%. Validates FR-6, FR-7, FR-8.
- **SM-4**: Commitment-to-plan conversion rate — percentage of orphan commitments (no linked plan) that get linked to a plan within 48 hours. Target: > 80%. Validates FR-2, FR-15, FR-16.

**Counter-metrics (do not optimize)**
- **SM-C1**: Signal noise ratio — percentage of signals that a user dismisses without action. Why not to optimize: high dismissal may indicate the user legitimately assessed the situation and chose not to act, not that the signal was wrong. Counterbalances SM-3.
- **SM-C2**: Assessment redo frequency — number of reassessments triggered by verified response delivery. Why not to optimize: forcing assessors to reassess too eagerly wastes field time. Counterbalances SM-1.

## 8. Open Questions

*All questions resolved — retained for audit trail.*

1. ~~**Per-item coverage UI timing.**~~ **Resolved: Per-item breakdown included in MVP.** Donor decisions depend on seeing specific item gaps; aggregate percentage can mislead.
2. ~~**Signal persistence.**~~ **Resolved: Persisted in database.** New `ActionSignal` Prisma model enables audit trail, push notification triggers, and offline delta sync. Nightly reconciliation job resolves stale signals.
3. ~~**Push notification subscription storage.**~~ **Resolved: New `PushSubscription` Prisma model + `web-push` library with VAPID keys.** Self-contained, no external dependency, consistent with self-hosted architecture.
4. ~~**Multi-incident signal deduplication.**~~ **Resolved: Group by entity+type, expand by incident.** One collapsible queue item per entity+type; expanding shows per-incident detail lines. Clean queue with full detail on demand.
5. ~~**Responder visibility scope for orphan commitments.**~~ **Resolved: All responders assigned to the entity.** Current `EntityAssignment` model is entity-level only; type-scoped assignments are a separate effort.

## 9. Assumptions Index

- `[ASSUMPTION: The matching is by Assessment Type ↔ Response Type, excluding Population which has no response type.]` — FR-1, reassessment trigger mapping.
- `[ASSUMPTION: All entities have coordinates stored in the coordinates JSON field. Entities without coordinates are excluded from map rendering but still appear in the queue.]` — FR-5, FR-10.
- `[ASSUMPTION: DonorCommitment.items and RapidResponse.items JSON arrays follow a consistent structure with `name`, `quantity`, `unit` fields. FR-17 adds `deliveredQuantity` to commitment items.]` — FR-2, FR-3, FR-17.
- `[ASSUMPTION: web-push library is compatible with the existing next-pwa service worker. Browser PushSubscription objects are serializable to the PushSubscription Prisma model fields (endpoint, p256dh, auth).]` — FR-13.
- `[ASSUMPTION: The Incident.metadata JSON field can be extended with populationAssessmentCadenceHours without migration. Existing incidents with no metadata or no cadence key are treated as "no cadence set" (disabled).]` — FR-4.

## 10. Cross-Cutting NFRs

- **Performance:** Action Signal API response time < 500ms (p95) for a user with up to 100 assigned entities. Signal computation must not degrade dashboard load time below the existing 2s target.
- **Offline Consistency:** Cached signals remain valid for up to 24 hours offline. Population assessment overdue calculation works client-side using cached cadence and last-submission timestamps.
- **Real-time:** Signal updates propagate to the dashboard within 60 seconds of the triggering event (matching existing polling interval). SSE channel for in-app notifications delivers within 5 seconds when the user is online.
- **Accessibility:** Action queue items are navigable by keyboard. Signal reason icons have ARIA labels. Color is not the sole indicator of signal severity.
- **Security:** Signal API enforces role-based access — users only receive signals for their assigned entities. Notification delivery verifies the target user's active session.
