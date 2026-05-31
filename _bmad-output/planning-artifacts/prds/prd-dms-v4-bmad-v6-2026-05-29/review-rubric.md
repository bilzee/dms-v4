# PRD Quality Review -- Action-Driven Dashboards

## Overall verdict

This is a strong, workmanlike PRD. It has a clear thesis (dashboards are passive; make them event-driven), honest scoping, and enough schema-level detail that an architect can start designing without guesswork. Its main weakness is done-ness clarity: several FRs describe what the user sees but stop short of stating the testable condition that proves "done." The signal priority assignment rules are the single largest gap -- priorities drive ordering, push eligibility, and visual treatment, yet the PRD never defines how they are assigned. Fixing that and a handful of other specificity gaps would make this story-ready.

## Decision-readiness -- strong

The PRD is honest about trade-offs and confident about what it excludes. The Non-Goals section (section 5) is explicit and defensible: no coordinator redesign, no AI, no cross-role visibility, no email. The Open Questions (section 8) are all resolved with rationale retained, which is good audit hygiene. The MVP scoping (section 6) calls out FR-14 (Notification Preferences UI) as deferred with a clear reason.

The one missing decision: the PRD proposes both persisted signals (a new `ActionSignal` table) and deterministic recomputation (queries triggered by state changes). It never resolves whether signals are the source of truth or a cached projection. FR-5 says "persisted" and "nightly reconciliation," but FR-1 through FR-3 read like query-time computation. This matters because it determines whether the reconciliation job is the safety net or the primary mechanism.

### Findings

- **medium** Signal persistence model unclear (FR-1 through FR-5) -- FR-1, FR-2, FR-3 describe signals as deterministic query results ("evaluated against the Assessor's assigned entities"), but FR-5 says signals are persisted in an `ActionSignal` table with a nightly reconciliation job. These are two different architectures with different failure modes and different write patterns. *Fix:* Add a single paragraph to section 4.1 stating explicitly: signals are computed on write triggers (assessment submitted, response verified, commitment created, timer expired), persisted to the `ActionSignal` table, and reconciled nightly. Name the trigger events explicitly. Remove the ambiguity.

## Substance over theater -- strong

Very little theater. The personas (section 2.1) are grounded and tied to specific operational contexts (field worker on mobile, logistics at ops center, NGO program officer checking periodically). The JTBD statements (section 2.2) are specific and role-differentiated. The glossary (section 3) defines operational terms that actually disambiguate -- "Action Signal" vs. "Signal Reason" vs. "Reassessment Trigger" are distinct and necessary.

The user journeys (UJ-1 through UJ-5) are the strongest section. They include entry state, path, climax, resolution, and edge cases. UJ-1's edge case about offline timer expiry is the kind of detail that prevents story-level surprises.

### Findings

- **low** Counter-metric definitions are slightly theatrical (SM-C1, SM-C2, section 7) -- The counter-metrics include rationale ("Why not to optimize") which is good, but SM-C2 ("Assessment redo frequency") is measuring something the system deliberately causes (reassessment triggers). It is not really a counter-metric; it is a throughput metric in disguise. *Fix:* Rename SM-C2 to a throughput metric or remove the "counter-metric" framing and put it under secondary metrics as a health indicator.

## Strategic coherence -- strong

The thesis is clear and repeated: dashboards are passive, make them active via event-driven action signals. Every feature serves this arc. The commitment-plan data model fix (section 4.5) is not feature creep -- it is a prerequisite for the "commitment awaiting plan" signal (FR-2, item 2). The PRD makes this dependency explicit by including FR-15, FR-16, FR-17 in the signal engine section rather than hiding it as a "tech debt" item.

The map integration (section 4.3) serves the thesis by making the spatial dimension of signals visible. It is not a map-for-map's-sake feature.

### Findings

- **low** Offline Signal Awareness (section 4.6) is the weakest strategic link -- It reads as a compliance checkbox ("consistent with the existing PWA offline strategy") rather than a first-class part of the action-signal thesis. The consequences section admits that signals taken by other users while offline are not available and calls it "acceptable." For a disaster response system where field workers are the primary assessors, this is a meaningful gap that deserves more than one sentence. *Fix:* Add a brief analysis of what an assessor misses when offline for 8+ hours (new reassessment triggers from verified deliveries, new entity assignments) and state whether the 24-hour cache staleness window is the intended cap.

## Done-ness clarity -- adequate (borderline thin)

This is the PRD's biggest weakness. Several FRs describe the UI experience well but do not state the testable condition that proves the feature is complete. Story authors will need to infer acceptance criteria, which introduces risk.

### Findings

- **critical** Signal priority assignment rules are entirely absent (FR-1 through FR-3) -- FR-5 mentions `priority` as a field on the `ActionSignal` model. FR-9 sorts by priority (CRITICAL > HIGH > MEDIUM > LOW). FR-13 sends push notifications only for CRITICAL and HIGH. But nowhere does the PRD define what makes a signal CRITICAL vs. HIGH vs. MEDIUM vs. LOW. This is the single most important gap. Priority drives ordering, visual treatment, push eligibility, and the primary success metric (SM-1 targets CRITICAL priority). Without priority rules, an engineer cannot implement the signal engine and a tester cannot verify it. *Fix:* Add a priority assignment table to section 4.1. Example structure: for each signal reason (unassessed, reassessment-needed, overdue, awaiting-plan, awaiting-plan-for-commitment, awaiting-delivery, partially-covered, assessment-needs-response, plan-needs-commitment, partially-fulfilled, commitment-awaiting-plan), state the default priority and any override conditions (e.g., "overdue signals escalate from HIGH to CRITICAL after 2x cadence interval").

- **high** "Verified assessment" threshold undefined in FR-1, FR-2, FR-3 -- FR-1 item 1 says "An affected entity has no submitted or verified assessment." FR-2 item 1 says "A verified assessment exists." The distinction between SUBMITTED and VERIFIED matters for the assessor signal (FR-1 fires for both) vs. the responder signal (FR-2 requires VERIFIED). But FR-1 item 2 ("reassessment-needed") says "A verified response delivery exists... and no assessment... has been submitted since the response verification date." Does a DRAFT assessment suppress the reassessment signal? The word "submitted" suggests SUBMITTED status or higher, but this is not explicit. *Fix:* For each signal condition, state the exact `verificationStatus` or `AssessmentStatus` threshold. Use the enum values from the schema (DRAFT, SUBMITTED, VERIFIED).

- **high** Signal deduplication and idempotency rules underspecified (FR-5) -- FR-5 states a unique constraint on `[userId, entityId, incidentId, type, signalReason]`. But FR-6 describes multi-incident grouping where a single entity+type pair can have signals across multiple incidents. The unique constraint prevents duplicate signals for the same incident, but the interaction between the constraint and the grouping behavior is not explained. What happens when an assessor submits an assessment for one incident but the entity still needs assessment for another incident? Does the resolved signal get a `resolvedAt` timestamp and a new signal get created, or does the existing row get updated? *Fix:* State explicitly: (a) signals are upserted on trigger events, (b) when the underlying condition is resolved, `resolvedAt` is set and the row is retained for audit, (c) the UI groups by entity+type across incidents but the data model is per-incident.

- **medium** "Coverage is evaluated per-item, not aggregate" lacks a formula (FR-2 item 4) -- The PRD says coverage is per-item and the signal context includes a per-item breakdown. But it does not define the coverage calculation. Is it `committedQuantity / plannedQuantity` per item? What if a plan item has no matching commitment item? What about units -- are all items in the same unit? *Fix:* Add a coverage calculation specification: for each item in the plan's `items` JSON, find matching items in linked commitments (matching by item name or item ID), sum `committedQuantity`, divide by `plannedQuantity`. State the matching rule (exact name match? SKU?).

- **medium** FR-4 cadence timer mechanism unspecified -- FR-4 says "timer starts from the most recent population assessment submission date per entity." But how is the timer implemented? A cron job that checks every minute? A database-level scheduled event? A deferred computation on signal generation? The nightly reconciliation job (FR-5) is too infrequent for hourly cadences. *Fix:* State the timer evaluation mechanism. If it is query-time computation (compare `now()` against `lastSubmissionDate + cadence`), say so explicitly and note that it does not require a background job.

- **low** FR-13 push notification content is underspecified -- The PRD says notifications include "signal reason, entity name, and a deep link." For a disaster response system where field workers act on push notifications, the notification body matters. What does "Reassessment needed" look like in a phone notification? *Fix:* Add 2-3 example notification payloads with title, body, and deep link URL structure.

## Scope honesty -- strong

Section 5 (Non-Goals) is well-defined. Section 6 (MVP Scope) cleanly separates in-scope from out-of-scope, including the FR-14 deferral. The out-of-scope items for MVP are specific: "Notification preferences UI," "Historical signal analytics," "Response-type-scoped responder assignments."

The Assumptions Index (section 9) exists but is thin -- only one assumption is indexed. This is adequate only if the PRD truly has only one assumption, which it does not.

### Findings

- **medium** Assumptions Index is incomplete (section 9) -- Only one assumption is indexed (`[ASSUMPTION: ...]` in FR-1). But the PRD contains implicit assumptions that are not tagged: (a) The `items` JSON in `DonorCommitment` and `RapidResponse` has a consistent structure that allows item-level matching for coverage calculations (FR-17, FR-2). (b) Entity coordinates exist in the `Entity.coordinates` JSON field for map rendering (FR-10). (c) The `web-push` library works with the existing PWA service worker without conflicts (FR-13). (d) The `next-pwa` infrastructure supports dynamic cache updates for the signal data without a full re-bootstrap (FR-18). *Fix:* Tag these assumptions inline and index them in section 9.

- **low** Backward compatibility for `RapidResponse.commitmentId` not fully specified (FR-15) -- FR-15 says the existing FK remains "for backward compatibility" but does not state what happens when both `RapidResponse.commitmentId` and `DonorCommitment.planId` exist and disagree. Does one take precedence? Does the migration ensure consistency? *Fix:* Add a migration note stating that the migration script will backfill `DonorCommitment.planId` from existing `RapidResponse.commitmentId` links and that `DonorCommitment.planId` is the source of truth going forward.

## Downstream usability -- adequate

The glossary (section 3) is well-defined and uses terms consistently throughout. FR IDs are stable and globally unique (FR-1 through FR-18). User Journey IDs (UJ-1 through UJ-5) are referenced from FRs. The API endpoint in FR-5 specifies query parameters and response shape.

However, story extraction will struggle with the priority gap (cited above) and with several FRs that bundle multiple behaviors into one requirement.

### Findings

- **high** FR granularity is uneven -- some FRs are story-sized (FR-4, FR-9, FR-14), others are epic-sized (FR-1, FR-2, FR-3, FR-5, FR-6, FR-7, FR-8). FR-5 alone covers: a new Prisma model, a database migration, a GET endpoint with 6 query parameters, caching logic, write invalidation, a unique constraint, and a nightly reconciliation job. That is 3-5 stories minimum. FR-6 covers: queue rendering, item display, priority badges, action buttons, map highlighting, detail panel expansion, multi-incident grouping, and group collapse behavior. *Fix:* This is not a PRD problem per se, but add a note in section 4 or a decomposition hint: "FR-5, FR-6, FR-7, FR-8 are epics. Story creation should decompose by: (a) data model + migration, (b) API endpoint, (c) queue component, (d) detail panel, (e) grouping behavior, (f) map integration."

- **medium** Context JSON payload shape is underspecified (FR-5) -- FR-5 says the `context` field is "reason-specific JSON payload" and lists examples in parentheses (last assessment date, linked commitment summary, per-item coverage breakdown, deadline). But the shape varies by signal reason, and downstream consumers (UX, frontend, tests) need to know the exact structure per reason. *Fix:* Add a context schema table mapping each signal reason to its context fields with types. Example: `reassessment-needed` -> `{ lastAssessmentDate: ISO8601, responseVerificationDate: ISO8601, responseType: ResponseType }`.

## Shape fit -- strong

The PRD shape matches the product type well. It is a brownfield system and the PRD respects that: it references existing routes (`/assessor/dashboard`), existing models (`DonorCommitment`, `RapidResponse`), existing infrastructure (SSE, `next-pwa`, React-Leaflet), and existing enums (`Priority`, `DeliveryStatus`). I verified against the current `schema.prisma` that these references are accurate -- the `DonorCommitment` model at line 447 matches the PRD's description, the `commitmentId` FK on `RapidResponse` at line 407 is real, and the `EntityAssignment` model exists.

The commitment-plan fix (section 4.5) is correctly identified as a prerequisite rather than a parallel workstream. The one-to-many relationship problem is real: the current schema has `RapidResponse.commitmentId` (one commitment per response), but the operational need is many commitments per plan. The PRD's solution (add `DonorCommitment.planId`) is the correct migration path.

### Findings

- **medium** No mention of existing dashboard content displacement (section 4.2) -- The PRD says the action queue "replaces the current passive 'recent records' view." The existing dashboard pages at `src/app/(auth)/assessor/dashboard/page.tsx`, `src/app/(auth)/responder/dashboard/page.tsx`, and `src/app/(auth)/donor/dashboard/page.tsx` already render content. The PRD does not address whether the existing content is removed, relocated, or collapsed. Users who rely on the current "recent records" view will lose it. *Fix:* State explicitly: (a) what content from the current dashboards is preserved and where, or (b) that the action queue replaces the primary content area and the old view is accessible via a tab/toggle, or (c) that the old content is removed and why that is acceptable.

## Mechanical notes

### Glossary drift
The glossary is internally consistent. "Action Signal" and "Signal Reason" are used consistently throughout. "Response Plan" and "Response Delivery" are distinguished by `deliveryStatus` which matches the schema enum (PLANNED / DELIVERED). "Donor Commitment" statuses (Planned, Partial, Complete, Cancelled) reference a `CommitmentStatus` enum not shown in the glossary but presumably matching the schema -- the PRD should confirm this aligns with the `CommitmentStatus` enum in `schema.prisma`.

### ID continuity
FR IDs (FR-1 through FR-18) are stable, sequential, and referenced correctly from the MVP Scope (section 6.1) and User Journeys. UJ IDs (UJ-1 through UJ-5) are referenced from FRs. SM IDs (SM-1 through SM-4, SM-C1, SM-C2) are well-formed. No broken cross-references detected.

### Broken cross-refs
- The document header (section 0) references `_bmad-output/planning-artifacts/prd.md` and `_bmad-output/planning-artifacts/architecture.md` as upstream documents. These should be verified to exist and contain the referenced context.
- FR-5 references extending `/api/v1/dashboard/live` or creating a new SSE channel. The codebase has a `useRealTimeMonitoring` hook that references this endpoint, confirming it exists. Good.

### Assumptions Index roundtrip
The index in section 9 contains exactly one entry. The inline tag `[ASSUMPTION: ...]` appears exactly once (in FR-1). The roundtrip is correct for the single tagged assumption, but as noted above, at least four additional implicit assumptions are untagged and unindexed. The index is structurally sound but materially incomplete.
