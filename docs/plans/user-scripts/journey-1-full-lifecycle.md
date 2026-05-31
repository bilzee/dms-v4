# Journey 1: Full Assessment-to-Delivery Lifecycle

**Purpose**: Create real data through the entire DMS pipeline using only browser interactions.

**Users involved**:
- Assessor: `assessor@test.com` / `test-password`
- Coordinator: `coordinator@dms.gov.ng` / `coordinator123!`
- Responder: `responder@dms.gov.ng` / `responder123!`

**Seed data used** (already in DB from `prisma/seed.ts`):
- Entities: entity-1 (Maiduguri Metropolitan), entity-2 (Jere), entity-3 (Gwoza)
- Incidents: incident-flood-001 (HIGH), incident-drought-001 (MEDIUM)
- 5 pre-verified assessments already exist
- 4 pre-existing donor commitments

---

## Phase 1: Assessor Creates New Assessments

### Step 1.1: Login as Assessor
1. Navigate to `http://localhost:3000/login`
2. In the "Development Test Users" dropdown, select "Field Assessor"
3. Click "Sign in"
4. **Expected**: Redirect to `/assessor/dashboard`
5. **Verify**: Dashboard loads with stat cards and ActionQueue

### Step 1.2: Navigate to Rapid Assessments
1. Click "Rapid Assessments" in the left sidebar
2. **Expected**: Assessment list page loads showing existing assessments
3. **Verify**: Can see the 5 pre-seeded verified assessments

### Step 1.3: Create HEALTH Assessment for Entity-2 (Jere)
1. Click "New Assessment" (the `data-testid="new-assessment-button"` after selecting type)
   - OR navigate to `/assessor/rapid-assessments/new`
2. Select "Health" type card from the grid
3. **Expected**: Health Assessment Form loads

4. Fill the form:
   - **Entity**: Select "Jere Local Government" from EntitySelector
   - **Incident**: Select "Maiduguri Metropolitan Flooding 2025" from IncidentSelector
   - **Priority**: HIGH
   - **Assessment Date**: Today's date (auto-filled)
   - **GPS Location**: Click "Capture Location" (may need to allow location)
   - Health fields:
     - Has Functional Clinic: No (unchecked)
     - Has Emergency Services: No (unchecked)
     - Number Health Facilities: 0
     - Health Facility Type: "None available"
     - Qualified Health Workers: 2
     - Has Trained Staff: No
     - Has Medicine Supply: No
     - Has Medical Supplies: No
     - Has Maternal Child Services: No
     - Common Health Issues: Check "Diarrhea", "Malaria", "Respiratory Infections"

5. Click "Submit Assessment" button
6. **Expected**: Success message, assessment created with DRAFT status
7. **Verify**: Redirected back to assessment list, new assessment visible

### Step 1.4: Create WASH Assessment for Entity-3 (Gwoza)
1. Navigate to `/assessor/rapid-assessments/new`
2. Select "WASH" type card
3. Fill the form:
   - **Entity**: Select "Gwoza Local Government"
   - **Incident**: Select "Gwoza Agricultural Drought 2025"
   - **Priority**: CRITICAL
   - WASH fields:
     - Water Source: "Borehole", "River"
     - Is Water Sufficient: No
     - Has Clean Water Access: No
     - Functional Latrines: 3
     - Are Latrines Sufficient: No
     - Has Handwashing Facilities: No
     - Has Open Defecation Concerns: Yes

4. Click "Submit Assessment"
5. **Expected**: Assessment created as DRAFT
6. **Verify**: Two new DRAFT assessments now visible in the list

### Step 1.5: Submit Both Assessments
1. On the assessment list page, find the HEALTH assessment for Jere
2. Click "Edit" on that assessment
3. Click "Submit" button to change status from DRAFT to SUBMITTED
4. **Expected**: Status changes to SUBMITTED, green success indicator
5. Repeat for the WASH assessment for Gwoza
6. **Expected**: Both assessments now show SUBMITTED status

---

## Phase 2: Coordinator Verifies Assessments

### Step 2.1: Login as Coordinator
1. Logout (click user menu → Logout)
2. Login as "Crisis Coordinator" (`coordinator@dms.gov.ng`)
3. **Expected**: Redirect to `/coordinator/dashboard`

### Step 2.2: Navigate to Verification Queue
1. Click "Verification Queue" in sidebar (under Operations Management)
   - OR navigate to `/coordinator/verification`
2. **Expected**: Verification Queue Management page loads
3. **Verify**: "Assessments" tab is active, can see submitted assessments in queue
4. **Verify**: The 2 new assessments from Step 1 appear in the queue

### Step 2.3: Verify the HEALTH Assessment
1. Find the HEALTH assessment for "Jere Local Government"
2. Click "Approve" button (green button)
3. **Expected**: Approve dialog opens
4. Optionally add verification notes: "Verified - critical health needs confirmed"
5. Click "Approve Assessment" button in dialog
6. **Expected**: Assessment removed from queue, success message
7. **Verify**: Assessment status changed to VERIFIED

### Step 2.4: Verify the WASH Assessment
1. Find the WASH assessment for "Gwoza Local Government"
2. Click "Approve" → approve dialog
3. Click "Approve Assessment"
4. **Expected**: Assessment verified, removed from queue

### Step 2.5: Check Action Signals on Dashboard
1. Navigate back to Coordinator Dashboard (`/coordinator/dashboard`)
2. **Expected**: ActionQueue now shows new signals:
   - `awaiting-plan` for Jere (HEALTH) — Responder needs to create plan
   - `awaiting-plan` for Gwoza (WASH) — Responder needs to create plan
3. **Verify**: Overdue count and pending verification stats updated

---

## Phase 3: Responder Creates Response Plans

### Step 3.1: Login as Responder
1. Logout
2. Login as "Response Responder" (`responder@dms.gov.ng`)
3. **Expected**: Redirect to `/responder/dashboard`

### Step 3.2: Check ActionQueue Signals
1. On the Responder Dashboard, check ActionQueue
2. **Expected**: Two `awaiting-plan` signals visible:
   - Jere Local Government — HEALTH — Create Plan
   - Gwoza Local Government — WASH — Create Plan

### Step 3.3: Create Response Plan for Jere HEALTH
1. Click "Create Plan" on the Jere signal (or navigate to `/responder/planning/new`)
2. **Expected**: Response Planning Form loads
3. Fill the form:
   - **Entity**: Select "Jere Local Government" (may auto-populate from signal)
   - **Assessment**: Select the verified HEALTH assessment for Jere
   - **Response Type**: AUTO (populated from assessment = HEALTH)
   - **Priority**: AUTO (populated from assessment = HIGH)
   - **Description**: "Emergency health response for flood-affected Jere community"
   - **Resources**:
     - Item 1: Name="First Aid Kits", Unit="kits", Quantity=50
     - Item 2: Name="Oral Rehydration Salts", Unit="packages", Quantity=200
     - Item 3: Name="Antimalarial Medication", Unit="courses", Quantity=150
     - Click "Add Item" to add more
4. Click "Create Plan" button (orange)
5. **Expected**: Success — plan created with PLANNED status
6. **Verify**: Redirected back, plan visible in response plans list

### Step 3.4: Create Response Plan for Gwoza WASH
1. Navigate to `/responder/planning/new`
2. Fill the form:
   - **Entity**: "Gwoza Local Government"
   - **Assessment**: Select verified WASH assessment for Gwoza
   - **Description**: "WASH emergency response for drought-affected Gwoza"
   - **Resources**:
     - Item 1: Name="Water Purification Tablets", Unit="boxes", Quantity=100
     - Item 2: Name="Portable Water Tanks", Unit="units", Quantity=10
     - Item 3: Name="Hygiene Kits", Unit="kits", Quantity=300
3. Click "Create Plan"
4. **Expected**: Plan created successfully

---

## Phase 4: Responder Confirms Delivery

### Step 4.1: Navigate to Response Deliveries
1. Click "Response Deliveries" in sidebar
   - OR navigate to `/responder/responses`
2. **Expected**: Response list page with the 2 new PLANNED responses
3. **Verify**: Both responses show status "Planned"

### Step 4.2: Confirm Delivery for Jere HEALTH Response
1. Find the HEALTH response for "Jere Local Government"
2. Click "Confirm Delivery" button
3. **Expected**: Navigates to `/responder/responses/{id}/deliver`
4. Delivery Confirmation Form loads
5. Fill the form:
   - **Delivered Items**: Verify quantities match plan
     - First Aid Kits: 50 kits (mark as delivered)
     - Oral Rehydration Salts: 200 packages
     - Antimalarial Medication: 150 courses
   - **Delivery Location**: Click "Capture Location" or use default
   - **Delivery Notes**: "Delivered to Jere community health center. All items received in good condition."
6. Click "Confirm Delivery" button
7. **Expected**: Success page — "Delivery Confirmed!"
8. **Verify**: Status shows DELIVERED, verification status shows SUBMITTED

### Step 4.3: Confirm Delivery for Gwoza WASH Response
1. Navigate back to `/responder/responses`
2. Find the WASH response for Gwoza
3. Click "Confirm Delivery"
4. Fill delivery form:
   - Water Purification Tablets: 100 boxes
   - Portable Water Tanks: 10 units
   - Hygiene Kits: 300 kits
   - Notes: "Delivered to Gwoza community center. Distribution ongoing."
5. Click "Confirm Delivery"
6. **Expected**: Delivery confirmed

---

## Phase 5: Coordinator Verifies Deliveries

### Step 5.1: Login as Coordinator
1. Logout, login as Coordinator

### Step 5.2: Navigate to Verification Queue — Responses Tab
1. Go to `/coordinator/verification` or click "Verification Queue"
2. Click the "Responses" tab
3. **Expected**: ResponseVerificationQueue shows 2 pending deliveries
4. **Verify**: Both HEALTH (Jere) and WASH (Gwoza) deliveries visible with SUBMITTED status

### Step 5.3: Verify Jere HEALTH Delivery
1. Find the HEALTH delivery for Jere
2. Click "Verify" (green button, `data-testid="verify-response-btn"`)
3. **Expected**: Verification succeeds, status changes to VERIFIED
4. **Verify**: Item removed from pending queue

### Step 5.4: Verify Gwoza WASH Delivery
1. Find the WASH delivery for Gwoza
2. Click "Verify"
3. **Expected**: Delivery verified

### Step 5.5: Final Dashboard Check
1. Return to Coordinator Dashboard
2. **Expected**: ActionQueue updated:
   - `awaiting-plan` signals resolved (plans exist)
   - `awaiting-delivery` signals resolved (delivered)
   - Verified Today count increased
3. **Verify**: Stats cards reflect the new data

---

## Phase 6: Verify Cross-Role Data Visibility

### Step 6.1: Check Assessor Dashboard
1. Login as Assessor
2. **Expected**: Dashboard shows no new action signals for already-assessed entities
3. **Verify**: Completed assessments show verified status

### Step 6.2: Check Responder Dashboard
1. Login as Responder
2. **Expected**: ActionQueue shows no more `awaiting-plan` or `awaiting-delivery` for these entities
3. **Verify**: Response plans show DELIVERED/VERIFIED status

### Step 6.3: Check Coordinator Dashboard
1. Login as Coordinator
2. **Expected**: ActionQueue may show new `reassessment-needed` signals for entities with verified deliveries
3. **Verify**: All signals reflect current state of data

---

## Expected Data Created

| Item | Entity | Type | Status |
|------|--------|------|--------|
| Health Assessment | Jere (entity-2) | HEALTH | VERIFIED |
| WASH Assessment | Gwoza (entity-3) | WASH | VERIFIED |
| Response Plan | Jere (entity-2) | HEALTH | DELIVERED → VERIFIED |
| Response Plan | Gwoza (entity-3) | WASH | DELIVERED → VERIFIED |
| Action Signals | Multiple | awaiting-plan, awaiting-delivery | Auto-resolved |

## Signal Lifecycle Verification

1. Assessment created (DRAFT) → No signals
2. Assessment submitted (SUBMITTED) → No signals (coordinator action not a signal)
3. Assessment verified (VERIFIED) → `awaiting-plan` signal for responder, `assessment-needs-response` signal for donor
4. Response plan created (PLANNED) → `awaiting-plan` resolved, `plan-needs-commitment` signal for donor
5. Delivery confirmed (DELIVERED) → `awaiting-delivery` resolved
6. Delivery verified (VERIFIED) → All resolved, potentially `reassessment-needed` for assessor
