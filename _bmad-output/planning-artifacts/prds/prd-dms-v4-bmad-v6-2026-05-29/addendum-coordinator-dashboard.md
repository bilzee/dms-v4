# PRD Addendum: Coordinator Action-Driven Dashboard

**Date:** 2026-05-29
**Status:** Draft
**Parent PRD:** `prd-dms-v4-bmad-v6-2026-05-29/prd.md`

## Purpose

The parent PRD explicitly scoped out the Coordinator Crisis Dashboard redesign (see Non-Goals: "Replacing the coordinator dashboard"). This addendum extends the Action-Driven Dashboard pattern to the Coordinator role, applying the same signal-driven paradigm to verification workflows.

## Current State

The existing Coordinator dashboard (`/coordinator/dashboard`) is already more action-oriented than the Assessor/Responder/Donor dashboards — it has a `VerificationQueueManagement` component and `StatCard` metrics. However, it is not signal-driven; it relies on direct API queries to fetch pending verifications rather than deterministic ActionSignal generation.

## Scope

Apply the Action Signal Engine (FR-5, FR-5.1, FR-5.2) to the Coordinator role. The Coordinator's action queue surfaces **verification signals** — assessments and response deliveries that need verification or rejection.

## Coordinator Signal Reasons

### CS-1: Assessment Awaiting Verification

**Trigger:** A `RapidAssessment` with `verificationStatus: SUBMITTED` exists, and no coordinator has yet verified or rejected it.

**Signal reason:** `assessment-awaiting-verification`
**Signal type:** `verification`
**Priority source:** Assessment priority (derived from incident severity at assessment creation time)
**Entity scope:** The entity associated with the assessment
**Incident scope:** The incident associated with the assessment
**Context JSON:**
```json
{
  "assessmentId": "uuid",
  "assessmentType": "HEALTH",
  "submittedAt": "2026-05-29T10:00:00Z",
  "submittedBy": "assessor-user-id",
  "entityId": "uuid",
  "incidentId": "uuid"
}
```

**Resolution condition:** Assessment `verificationStatus` changes to `VERIFIED`, `AUTO_VERIFIED`, or `REJECTED`.

### CS-2: Response Delivery Awaiting Verification

**Trigger:** A `RapidResponse` with `deliveryStatus: DELIVERED` and `verificationStatus: SUBMITTED` exists, and no coordinator has yet verified the delivery.

**Signal reason:** `delivery-awaiting-verification`
**Signal type:** `verification`
**Priority source:** Plan priority (from the response plan)
**Entity scope:** The entity associated with the response
**Incident scope:** The incident associated with the response
**Context JSON:**
```json
{
  "responseId": "uuid",
  "responseType": "HEALTH",
  "deliveredAt": "2026-05-29T10:00:00Z",
  "deliveredBy": "responder-user-id",
  "entityId": "uuid",
  "incidentId": "uuid",
  "planId": "uuid"
}
```

**Resolution condition:** Response `verificationStatus` changes to `VERIFIED`, `AUTO_VERIFIED`, or `REJECTED`.

### CS-3: Verification Overdue

**Trigger:** An assessment or response delivery has been in `SUBMITTED` verification status for longer than a configurable threshold (default: 48 hours).

**Signal reason:** `verification-overdue`
**Signal type:** `verification`
**Priority source:** Always CRITICAL
**Resolution condition:** Assessment or response `verificationStatus` changes.

## Action Buttons

| Signal Reason | Action Button | Navigation Target |
|---|---|---|
| `assessment-awaiting-verification` | "Review Assessment" | Assessment detail view with verify/reject actions |
| `delivery-awaiting-verification` | "Review Delivery" | Response delivery detail view with verify/reject actions |
| `verification-overdue` | "Review Now" | Same as parent signal (assessment or delivery detail) |

## StatCards (Coordinator)

| Card | Metric | Severity |
|---|---|---|
| Pending Assessments | Count of assessments with `verificationStatus: SUBMITTED` | `warning` |
| Pending Deliveries | Count of responses with `deliveryStatus: DELIVERED` and `verificationStatus: SUBMITTED` | `high` |
| Verified Today | Count of verifications completed today | `success` |
| Overdue | Count of verifications pending > 48h | `critical` |

## What This Does NOT Change

- The existing `VerificationQueueManagement` component continues to work; the action queue is an additional entry point
- Auto-approval rules (existing `/coordinator/auto-approval`) still apply
- The coordinator's other responsibilities (entity assignment, cadence setting, resource management) remain unchanged
- The architecture's `ActionSignalService.evaluateAndGenerate()` gains coordinator-scoped evaluation logic

## Implementation Impact

- **ActionSignal model:** No schema change. Coordinator signals use the same `ActionSignal` model with `userId` pointing to coordinator users
- **ActionSignalService:** Add coordinator evaluation branch: check for SUBMITTED assessments and SUBMITTED deliveries
- **New queue route:** `/coordinator/dashboard` is enhanced (not replaced) with the action queue + map layout from the UX spec
- **No new Prisma models:** Reuses `ActionSignal`, `Notification`, `PushSubscription`
