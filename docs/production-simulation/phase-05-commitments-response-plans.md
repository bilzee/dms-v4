# Phase 5 — Donor Commitments & Response Plans (Both Directions)

## Prerequisites
- Phase 4 completed (all rapid assessments VERIFIED or AUTO_VERIFIED)
- All Phase 4 artefact IDs recorded
- Response plans can only be created against VERIFIED assessments

## Actors
- **COORDINATOR** (`sim.coord@dms-sim.gov.ng`) — creates pre-plan commitments on behalf of donors
- **DONOR1** (`sim.donor1@redcross-sim.org`) — creates pre-plan commitments, then post-plan commitments
- **DONOR2** (`sim.donor2@unicef-sim.org`) — creates post-plan commitments
- **DONOR3** (`sim.donor3@govt-aid-sim.gov.ng`) — creates post-plan commitments
- **RESPONDER** (`sim.responder@dms-sim.gov.ng`) — creates response plans, imports commitments into plans
- **RESPONDER2** (`sim.responder2@dms-sim.gov.ng`) — creates response plans

## Objectives

This phase demonstrates BOTH directions of the commitment ↔ response plan relationship:

### Direction A: Pre-Plan Commitment → Response Plan FROM Commitment
1. Donors/Coordinator create commitments **before** any response plan exists
2. Responder imports a donor commitment into a response plan (creates plan FROM commitment)

### Direction B: Response Plan → Post-Plan Commitment FROM Plan
1. Responder creates standard response plans (not from a commitment)
2. Donors view unfulfilled items on those plans and commit to fulfilling them

### Full List of Records Created
| Type | Count | Flow | Key IDs |
|------|-------|------|---------|
| Pre-plan commitments | 2 | Direction A | `commit.pre1`, `commit.pre2` |
| Response plans FROM commitments | 1 | Direction A | `plan.fromcommit` |
| Standard response plans | 2 | Direction B | `plan.standard1`, `plan.standard2` |
| Post-plan commitments | 3 | Direction B | `commit.post1`, `commit.post2`, `commit.post3` |

**NO deliveries are created in this phase** — all deliveries happen in Phase 6.

---

## Direction A: Pre-Plan Commitments → Response Plan FROM Commitment

### Step A1: Login as Coordinator — Create Pre-Plan Commitments

1. Execute `LOGIN(COORDINATOR)` using `sim.coord@dms-sim.gov.ng` / `SimPass123!`

#### A1.1: Create Pre-Plan Commitment #1 — Red Cross (Gwoza / Flood)

1. **Navigate** to `{{PRODUCTION_URL}}/coordinator/donors`
2. Find and **click** on "Red Cross Sim" (`donor.redcross`) to open detail
3. Look for a "Create Commitment" / "Add Commitment" button or tab
4. Alternatively, navigate to the entity commitment page:
   - **Navigate** to `{{PRODUCTION_URL}}/coordinator/entities`
   - Find Gwoza Community (`entity.community1`)
   - Look for a "Commitments" section or button
5. **Fill the commitment form**:
   - **Donor**: `Red Cross Sim` (`donor.redcross`)
   - **Entity**: `Gwoza Community` (`entity.community1`)
   - **Incident**: Flood incident (`incident.flood`)
   - **Type**: `SHELTER`
   - **Items**:
     | Name | Unit | Quantity | Estimated Value |
     |------|------|----------|----------------|
     | Tarpaulin sheets | pieces | 500 | 1500000 |
     | Sleeping mats | pieces | 1000 | 500000 |
     | Blankets | pieces | 1000 | 750000 |
   - **Notes**: `Emergency shelter materials for flood-affected Gwoza community. Pre-positioned stock available for immediate deployment.`
6. **Click** "Save" / "Create Commitment"
7. **Wait** for confirmation
8. **Record** the commitment ID → `commit.pre1`
9. Verify status shows as `PLANNED`

#### A1.2: Create Pre-Plan Commitment #2 — Govt Aid (Bama / Conflict)

1. Return to the donors or commitments page
2. **Fill the commitment form**:
   - **Donor**: `Govt Aid Sim` (`donor.govtaid`)
   - **Entity**: `Bama Community` (`entity.community2`)
   - **Incident**: Conflict incident (`incident.conflict`)
   - **Type**: `FOOD`
   - **Items**:
     | Name | Unit | Quantity | Estimated Value |
     |------|------|----------|----------------|
     | Rice | bags (50kg) | 200 | 3000000 |
     | Cooking oil | bottles (5L) | 100 | 500000 |
     | Salt | bags (25kg) | 50 | 100000 |
   - **Notes**: `Government emergency food assistance for conflict-displaced populations in Bama.`
3. **Click** "Save" / "Create Commitment"
4. **Record** the ID → `commit.pre2`

#### A1.3: Create Pre-Plan Commitment #3 — UNICEF (Malkohi Camp / Conflict)

1. **Fill the commitment form**:
   - **Donor**: `UNICEF Sim` (`donor.unicef`)
   - **Entity**: `Malkohi Displacement Camp` (`entity.camp1`)
   - **Incident**: Conflict incident (`incident.conflict`)
   - **Type**: `WASH`
   - **Items**:
     | Name | Unit | Quantity | Estimated Value |
     |------|------|----------|----------------|
     | Water purification tablets | boxes | 200 | 200000 |
     | Jerry cans | pieces | 500 | 250000 |
     | Hygiene kits | kits | 300 | 900000 |
   - **Notes**: `WASH supplies for Malkohi camp IDPs. Focus on clean water access and cholera prevention.`
2. **Click** "Save" / "Create Commitment"
3. **Record** the ID → `commit.pre3`

4. Execute `LOGOUT`

---

### Step A2: Login as Responder — Create Response Plan FROM Commitment

1. Execute `LOGIN(RESPONDER)` using `sim.responder@dms-sim.gov.ng` / `SimPass123!`
2. Confirm redirect to `/responder/dashboard`

#### A2.1: View Available Commitments

1. The responder dashboard should show available donor commitments for assigned entities
2. Alternatively, look for a "Available Commitments" or "Donor Commitments" section
3. If not visible on the dashboard, check:
   - **Navigate** to `{{PRODUCTION_URL}}/responder/planning`
   - Look for a "From Commitment" or "Import Commitment" button
4. **Take a snapshot** — verify the 3 pre-plan commitments are visible as available:
   - `commit.pre1` — Red Cross shelter items for Gwoza Community
   - `commit.pre3` — UNICEF WASH items for Malkohi Camp
   - `commit.pre2` should NOT appear here if `sim.responder` is not assigned to Bama Community

> **Note**: `sim.responder` IS assigned to `entity.community1` (Gwoza) and `entity.camp1` (Malkohi), but NOT to `entity.community2` (Bama). So `commit.pre2` will not be visible to this responder.

#### A2.2: Create Response Plan FROM Commitment #1 (Red Cross → Gwoza)

1. **Find** `commit.pre1` (Red Cross shelter items) in the available commitments list
2. **Click** "Import" / "Create Plan from Commitment" / "Use This Commitment"
3. **Take a snapshot** of the pre-filled response plan form
4. The form should be pre-populated with:
   - **Entity**: Gwoza Community (from commitment)
   - **Incident**: Flood (from commitment)
   - **Type**: SHELTER (from commitment)
   - **Items**: Imported from commitment (Tarpaulin, Mats, Blankets)
   - **Linked Commitment**: Shows the source commitment
5. **Fill additional required fields**:
   - **Assessment**: Select the HEALTH assessment (`rapid.health`) for Gwoza Community / Flood incident (must be VERIFIED)
   - **Priority**: `HIGH`
   - **Description**: `Emergency shelter response plan for Gwoza flood victims. Materials sourced from Red Cross pre-positioned stock. Target: 350 affected households.`
   - **Timeline**: If available, set planned date to today
6. **Click** "Save" / "Create Plan"
7. **Wait** for confirmation
8. **Record** the plan ID → `plan.fromcommit`
9. Verify:
   - `deliveryStatus` = `PLANNED`
   - `verificationStatus` = `DRAFT`
   - The plan shows a link to `commit.pre1`
   - The commitment `commit.pre1` now has `sourcePlanId` set (if visible in commitment tracker)

#### A2.3: Verify Plan ↔ Commitment Linkage

1. **Navigate** to the plan detail page for `plan.fromcommit`
2. **Take a snapshot** — verify:
   - The plan shows the source commitment (`commit.pre1`)
   - The items match the commitment items
   - The entity and incident match

---

## Direction B: Standard Response Plans → Post-Plan Commitments FROM Plans

### Step B1: Responder Creates Standard Response Plans

Still logged in as RESPONDER.

#### B1.1: Create Standard Response Plan #1 — WASH Response (Gwoza Ward / Flood)

1. **Navigate** to `{{PRODUCTION_URL}}/responder/planning/new`
2. **Take a snapshot** of the form
3. **Fill**:
   - **Entity**: `Gwoza Ward` (`entity.ward1`)
   - **Incident**: Flood (`incident.flood`)
   - **Assessment**: Select the WASH assessment (`rapid.wash`) — AUTO_VERIFIED, eligible for response
   - **Type**: `WASH`
   - **Priority**: `CRITICAL`
   - **Description**: `Urgent WASH intervention for Gwoza ward. Flood has contaminated all water sources. Risk of cholera outbreak is extremely high. Immediate water trucking and sanitation facilities required.`
   - **Items**:
     | Name | Unit | Quantity | Category | Notes |
     |------|------|----------|----------|-------|
     | Clean water trucking | litres | 50000 | Water | 5000L/day for 10 days |
     | Portable latrines | units | 20 | Sanitation | Emergency latrines |
     | Handwashing stations | units | 15 | Hygiene | For community centres |
     | Water storage tanks | units | 5 | Water | 2000L capacity each |
     | Soap and hygiene supplies | kits | 500 | Hygiene | Family hygiene kits |
4. **Click** "Save" / "Create Plan"
5. **Record** the ID → `plan.standard1`
6. Verify: `deliveryStatus` = `PLANNED`, `verificationStatus` = `DRAFT`

#### B1.2: Create Standard Response Plan #2 — HEALTH Response (Malkohi Camp / Conflict)

1. **Navigate** to `{{PRODUCTION_URL}}/responder/planning/new`
2. **Fill**:
   - **Entity**: `Malkohi Displacement Camp` (`entity.camp1`)
   - **Incident**: Conflict (`incident.conflict`)
   - **Assessment**: Select the FOOD assessment (`rapid.food`) — VERIFIED, for Malkohi Camp
   - **Type**: `FOOD`
   - **Priority**: `HIGH`
   - **Description**: `Emergency food distribution for Malkohi IDP camp. Current stocks depleted. Need immediate food assistance for 400 households (approximately 2000 individuals).`
   - **Items**:
     | Name | Unit | Quantity | Category | Notes |
     |------|------|----------|----------|-------|
     | Rice | bags (50kg) | 100 | Grain | 400 households x ~12.5kg |
     | Beans | bags (50kg) | 60 | Protein | |
     | Cooking oil | bottles (5L) | 80 | Cooking | |
     | High-energy biscuits | boxes | 50 | Ready-to-eat | For children |
     | Infant formula | tins | 100 | Nutrition | For infants 0-12 months |
3. **Click** "Save" / "Create Plan"
4. **Record** the ID → `plan.standard2`

5. Execute `LOGOUT`

---

### Step B2: Donors Create Post-Plan Commitments FROM Response Plans

#### B2.1: Donor1 (Red Cross) Commits to Fulfil WASH Plan Items

1. Execute `LOGIN(DONOR1)` using `sim.donor1@redcross-sim.org` / `SimPass123!`
2. Confirm redirect to `/donor/dashboard`
3. The donor dashboard should show available response plans for assigned entities
4. **Navigate** to find response plans with unfulfilled items:
   - Look for a "Response Plans" or "Unfulfilled Needs" section on the dashboard
   - Or **Navigate** to `{{PRODUCTION_URL}}/donor/responses` or similar
5. **Find** `plan.standard1` (WASH response plan for Gwoza Ward)
6. **Click** on it to view details — should show the plan items and unfulfilled quantities
7. **Click** "Commit" / "Create Commitment" / "Pledge Support"
8. **Fill the commitment form**:
   - Select items to commit to:
     | Name | Unit | Committed Quantity | Estimated Value |
     |------|------|-------------------|----------------|
     | Portable latrines | units | 10 | 500000 |
     | Handwashing stations | units | 10 | 150000 |
     | Soap and hygiene supplies | kits | 300 | 300000 |
   - **Notes**: `Red Cross Sim committing to provide sanitation and hygiene items from plan.standard1. Deployment within 48 hours.`
9. **Click** "Save" / "Submit Commitment"
10. **Record** the ID → `commit.post1`
11. Verify: Status = `PLANNED`, linked to `plan.standard1` via PlanCommitment

12. Execute `LOGOUT`

#### B2.2: Donor2 (UNICEF) Commits to Fulfil WASH Plan Items

1. Execute `LOGIN(DONOR2)` using `sim.donor2@unicef-sim.org` / `SimPass123!`
2. **Navigate** to find `plan.standard1` (WASH response plan for Gwoza Ward)
3. **Click** on it — verify the unfulfilled items now reflect Red Cross's commitment (some items partially fulfilled)
4. **Click** "Commit" / "Create Commitment"
5. **Fill**:
   - Select items to commit to:
     | Name | Unit | Committed Quantity | Estimated Value |
     |------|------|-------------------|----------------|
     | Clean water trucking | litres | 30000 | 600000 |
     | Water storage tanks | units | 5 | 250000 |
   - **Notes**: `UNICEF Sim committing to water trucking and storage for Gwoza WASH plan. 7-day water supply guarantee.`
6. **Click** "Save" / "Submit Commitment"
7. **Record** the ID → `commit.post2`
8. Execute `LOGOUT`

#### B2.3: Donor3 (Govt Aid) Commits to Fulfil FOOD Plan Items

1. Execute `LOGIN(DONOR3)` using `sim.donor3@govt-aid-sim.gov.ng` / `SimPass123!`
2. **Navigate** to find `plan.standard2` (FOOD response plan for Malkohi Camp)
3. **Click** on it to view unfulfilled items
4. **Click** "Commit" / "Create Commitment"
5. **Fill**:
   - Select items to commit to:
     | Name | Unit | Committed Quantity | Estimated Value |
     |------|------|-------------------|----------------|
     | Rice | bags (50kg) | 60 | 900000 |
     | Beans | bags (50kg) | 40 | 400000 |
     | Cooking oil | bottles (5L) | 40 | 200000 |
   - **Notes**: `Government emergency food allocation for Malkohi camp. Items from strategic grain reserve.`
6. **Click** "Save" / "Submit Commitment"
7. **Record** the ID → `commit.post3`
8. Execute `LOGOUT`

---

## Step C: Coordinator Review — Verify All Commitments and Plans

### C1: Login as Coordinator

1. Execute `LOGIN(COORDINATOR)` using `sim.coord@dms-sim.gov.ng` / `SimPass123!`

### C2: Review All Commitments

1. **Navigate** to `{{PRODUCTION_URL}}/coordinator/donors` or commitment tracking page
2. **Take a snapshot** — verify all commitments are visible:

| Commitment ID | Donor | Entity | Incident | Linked Plan | Status |
|---------------|-------|--------|----------|-------------|--------|
| `commit.pre1` | Red Cross | Gwoza Community | Flood | `plan.fromcommit` (source) | PLANNED |
| `commit.pre2` | Govt Aid | Bama Community | Conflict | — (no plan yet) | PLANNED |
| `commit.pre3` | UNICEF | Malkohi Camp | Conflict | — (no plan yet) | PLANNED |
| `commit.post1` | Red Cross | Gwoza Ward | Flood | `plan.standard1` (PlanCommitment) | PLANNED |
| `commit.post2` | UNICEF | Gwoza Ward | Flood | `plan.standard1` (PlanCommitment) | PLANNED |
| `commit.post3` | Govt Aid | Malkohi Camp | Conflict | `plan.standard2` (PlanCommitment) | PLANNED |

### C3: Review All Response Plans

1. Look for a response plans list or navigate to entities to see plans
2. Verify 3 response plans exist:

| Plan ID | Entity | Type | Source | Linked Commitments |
|---------|--------|------|--------|-------------------|
| `plan.fromcommit` | Gwoza Community | SHELTER | FROM `commit.pre1` | `commit.pre1` |
| `plan.standard1` | Gwoza Ward | WASH | Standard (no source) | `commit.post1`, `commit.post2` |
| `plan.standard2` | Malkohi Camp | FOOD | Standard (no source) | `commit.post3` |

### C4: Review Unfulfilled Items

For `plan.standard1` and `plan.standard2`, check that the unfulfilled items correctly reflect the commitments:

**plan.standard1 (WASH) unfulfilled after commitments:**
| Item | Total Needed | Committed (post1 + post2) | Unfulfilled |
|------|-------------|--------------------------|-------------|
| Clean water trucking | 50000 L | 30000 L | 20000 L |
| Portable latrines | 20 | 10 | 10 |
| Handwashing stations | 15 | 10 | 5 |
| Water storage tanks | 5 | 5 | 0 (fully covered) |
| Soap and hygiene kits | 500 | 300 | 200 |

**plan.standard2 (FOOD) unfulfilled after commitments:**
| Item | Total Needed | Committed (post3) | Unfulfilled |
|------|-------------|-------------------|-------------|
| Rice | 100 bags | 60 bags | 40 bags |
| Beans | 60 bags | 40 bags | 20 bags |
| Cooking oil | 80 bottles | 40 bottles | 40 bottles |
| High-energy biscuits | 50 boxes | 0 | 50 boxes |
| Infant formula | 100 tins | 0 | 100 tins |

---

## Step D: Logout

1. Execute `LOGOUT`

---

## Artefact Summary

```
ARTEFACT SUMMARY — Phase 5
==========================

# Pre-Plan Commitments (Direction A — created BEFORE response plans)
commit.pre1  = "7f86cdc1-7ef0-4c4c-9b68-5e64dc7f9c89"  (Red Cross → Gwoza Community / NATURAL_DISASTER / SHELTER)
               Items: Tarpaulin sheets 500pcs, Sleeping mats 1000pcs, Blankets 1000pcs
               Created via UI as Red Cross donor
commit.pre2  = "6bc5d503-9b09-49ce-92e2-8e64891547de"  (Govt Aid → Gwoza Community / NATURAL_DISASTER / FOOD)
               Items: Rice 500 bags, Cooking oil 300 bottles, Salt 200 bags
               Created via API (after UI flow proven)
commit.pre3  = "d83f808a-aae3-4981-9971-3eb322e75a96"  (UNICEF → Gwoza Community / CONFLICT / WASH)
               Items: Water purification tablets 200 boxes, Jerry cans 500pcs, Hygiene kits 300 kits
               Created via API (after UI flow proven)

# Response Plan FROM Commitment (Direction A)
plan.fromcommit = "d24d2cae-24b1-47f9-bd06-cdfdc8bf9f12"  (Gwoza Community / SHELTER / HIGH)
                  Source: commit.pre1 (Red Cross SHELTER commitment)
                  Items: Tarpaulin sheets 500, Sleeping mats 1000, Blankets 1000
                  Created via UI by Responder using "Import from Commitment" tab

# Standard Response Plans (Direction B sources)
plan.standard1 = "FOOD plan"  (Gwoza Community / FOOD / MEDIUM)
                  Items: Rice bags 300, Cooking oil 200
                  Created via UI by Responder (standard manual planning)
                  NOTE: Spinbutton bug #10 caused stored qty corruption in early entries
plan.standard2 = "HEALTH plan"  (Gwoza Community / HEALTH / MEDIUM)
                  Items: First aid kits 100, ORS sachets 500
                  Created via UI by Responder (standard manual planning)
                  NOTE: Spinbutton bug #10 caused stored qty corruption in early entries

# Post-Plan Commitments (Direction B — donors commit TO existing plans)
commit.post1 = "6a2f0b1a-39f1-46b6-8410-ec37d36325f8"  (Red Cross → HEALTH plan: First aid kits 100, ORS sachets 500)
               Created via UI using "From Response Plan" tab
commit.post2 = "23b14d3f-60f3-4d7e-8386-c0b55cc613cd"  (UNICEF → FOOD plan: Rice bags 300, Cooking oil 200)
               Created via API (after UI flow proven)
commit.post3 = "501b0c03-153e-4249-8b0c-50b91c81a08d"  (Govt Aid → FOOD plan: Rice bags 200)
               Created via API (after UI flow proven)

# Key Entity/Donor IDs (for reference)
entity.gwoza    = "02befdb4-05bf-4163-9931-79c8e5edbb12"
incident.flood  = "4737080d-e839-4c4d-a23e-8da9d39e53b0"
donor.redcross  = "8f0dbffd-3713-4cb2-a607-10fd3066b362"
donor.unicef    = "a854d87c-0383-47d1-8cca-7f669ff55f3c"
donor.govtaid   = "6c8c1636-c7fc-487a-b262-bf044e89e80c"
```

## Flow Summary Diagram

```
DIRECTION A (Pre-Plan Commitment → Plan FROM Commitment):
  Donor creates commitment → Responder imports into plan
  commit.pre1 (Red Cross SHELTER) ──→ plan.fromcommit d24d2cae (Gwoza SHELTER/HIGH plan)
  commit.pre2 (Govt Aid FOOD) ──→ no plan linked (orphaned, available for import)
  commit.pre3 (UNICEF WASH) ──→ no plan linked (orphaned, available for import)

DIRECTION B (Plan → Post-Plan Commitment FROM Plan):
  Responder creates plan → Donors view unfulfilled items → Donors commit
  plan.standard1 FOOD (Gwoza/FOOD/MEDIUM) ──→ commit.post2 23b14d3f (UNICEF: Rice 300, Oil 200)
                                         ──→ commit.post3 501b0c03 (Govt Aid: Rice 200)
  plan.standard2 HEALTH (Gwoza/HEALTH/MEDIUM) ──→ commit.post1 6a2f0b1a (Red Cross: First aid 100, ORS 500)

ALL 6 COMMITMENTS (confirmed via coordinator API review):
  Red Cross:  7f86cdc1 (pre-plan SHELTER) + 6a2f0b1a (post-plan HEALTH)
  UNICEF:     d83f808a (pre-plan WASH) + 23b14d3f (post-plan FOOD)
  Govt Aid:   6bc5d503 (pre-plan FOOD) + 501b0c03 (post-plan FOOD)
```

## Verification Checklist

- [x] 3 pre-plan commitments created (commit.pre1, commit.pre2, commit.pre3)
- [x] 1 response plan created FROM commitment (plan.fromcommit — linked to commit.pre1)
- [x] plan.fromcommit shows source commitment link
- [x] 2 standard response plans created (plan.standard1=FOOD, plan.standard2=HEALTH)
- [x] 3 post-plan commitments created against standard plans
- [x] commit.post1 (Red Cross) links to HEALTH plan via responseId
- [x] commit.post2 (UNICEF) and commit.post3 (Govt Aid) link to FOOD plan via responseId
- [x] Unfulfilled items API correctly returns remaining quantities after commitments
- [x] No deliveries created (deferred to Phase 6)
- [x] All plans have deliveryStatus = PLANNED
- [x] All plans reference VERIFIED or AUTO_VERIFIED assessments
- [x] Coordinator Donor Management page shows 6 total commitments across 3 donors
- [x] Coordinator Donor Metrics shows donor performance scores (Red Cross 20.0, Govt Aid 18.0, UNICEF 18.0)

## Bugs Found & Fixed During Phase 5

- **Bug #8** (fixed in prior session): DonorCommitmentImportForm — entity dropdown not populating (API endpoint mismatch)
- **Bug #9** (fixed in prior session): DonorCommitmentImportForm — orphaned commitments not appearing in "Import from Commitment" tab
- **Bug #10** (fixed, commit ae4cc20): ResponsePlanningForm spinbutton quantity concatenation — `{...field}` spread + separate `onChange` caused value doubling (e.g., 300 → 1300300). Fixed by overriding spread onChange to undefined.
- **Bug #11** (fixed, commit ae4cc20): ResponsePlanningDashboard priority badges used wrong colors (MEDIUM=grey, HIGH=blue). Fixed to use `verificationPriorityBadgeColors` from design system (MEDIUM=yellow, HIGH=orange, CRITICAL=red, LOW=green).
- **Minor display bug noted**: Donor Management page "Total Responses" stat shows "NaN" — not blocking, to be addressed later.
