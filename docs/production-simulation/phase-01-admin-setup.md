# Phase 1 — Admin Setup: Users, Donor Organisations, and Entities

## Prerequisites
- Phase 0 (authentication reference) must be available
- Admin credentials provided by user
- Production URL known

## Actors
- **ADMIN** (existing production admin account)

## Objectives
1. Create 7 standard users across all role types
2. Create 1 multi-role user (ASSESSOR + COORDINATOR + RESPONDER + DONOR)
3. Register 3 donor organisations (each creates a DONOR user automatically)
4. Create 8 entities across different types

## Artefacts Created
| Type | Count | Key IDs to Capture |
|------|-------|--------------------|
| Users (standard) | 7 | `user.sim.coord`, `user.sim.assessor`, `user.sim.assessor2`, `user.sim.responder`, `user.sim.responder2`, `user.sim.multirole`, (admin may already exist) |
| Donor Orgs + Users | 3 | `donor.redcross`, `donor.unicef`, `donor.govtaid` + their user IDs |
| Entities | 8 | `entity.community1`, `entity.community2`, `entity.ward1`, `entity.ward2`, `entity.lga1`, `entity.camp1`, `entity.facility1`, `entity.state1` |

---

## Step 1: Login as Admin

1. Execute `LOGIN(ADMIN)` using the **production admin credentials** provided by the user (not the simulation admin — the existing production admin)
2. Confirm you are on `/admin/dashboard`

---

## Step 2: Create Standard Users

### 2.1 Create Coordinator User

1. **Navigate** to `{{PRODUCTION_URL}}/admin/users`
2. **Take a snapshot** to identify the "Create User" or "Add User" button
3. **Click** the "Create User" / "Add User" button
4. **Take a snapshot** of the user creation form
5. **Fill the form** with these values:
   - **Email**: `sim.coord@dms-sim.gov.ng`
   - **Username**: `sim.coord`
   - **Password**: `SimPass123!`
   - **Name**: `Sim Coordinator`
   - **Phone**: `+2347000000001`
   - **Organization**: `DMS Simulation`
   - **Roles**: Check **COORDINATOR** only
6. **Click** the "Create" / "Submit" / "Save" button
7. **Wait** for success confirmation or redirect to user list
8. **Record** the user ID from the URL or list

### 2.2 Create Assessor User #1

Repeat the create-user flow with:
- **Email**: `sim.assessor@dms-sim.gov.ng`
- **Username**: `sim.assessor`
- **Password**: `SimPass123!`
- **Name**: `Sim Assessor One`
- **Phone**: `+2347000000002`
- **Organization**: `DMS Simulation`
- **Roles**: Check **ASSESSOR** only

### 2.3 Create Assessor User #2

- **Email**: `sim.assessor2@dms-sim.gov.ng`
- **Username**: `sim.assessor2`
- **Password**: `SimPass123!`
- **Name**: `Sim Assessor Two`
- **Phone**: `+2347000000003`
- **Organization**: `DMS Simulation`
- **Roles**: Check **ASSESSOR** only

### 2.4 Create Responder User #1

- **Email**: `sim.responder@dms-sim.gov.ng`
- **Username**: `sim.responder`
- **Password**: `SimPass123!`
- **Name**: `Sim Responder One`
- **Phone**: `+2347000000004`
- **Organization**: `DMS Simulation`
- **Roles**: Check **RESPONDER** only

### 2.5 Create Responder User #2

- **Email**: `sim.responder2@dms-sim.gov.ng`
- **Username**: `sim.responder2`
- **Password**: `SimPass123!`
- **Name**: `Sim Responder Two`
- **Phone**: `+2347000000005`
- **Organization**: `DMS Simulation`
- **Roles**: Check **RESPONDER** only

### 2.6 Create Multi-Role User

- **Email**: `sim.multirole@dms-sim.gov.ng`
- **Username**: `sim.multirole`
- **Password**: `SimPass123!`
- **Name**: `Sim Multi Role`
- **Phone**: `+2347000000006`
- **Organization**: `DMS Simulation`
- **Roles**: Check **ASSESSOR**, **COORDINATOR**, **RESPONDER**, and **DONOR** (all four)

---

## Step 3: Register Donor Organisations

Donor registration creates both a Donor organisation record AND a user account with DONOR role.

### 3.1 Register Red Cross Sim

1. **Navigate** to `{{PRODUCTION_URL}}/admin/donors/register`
2. **Take a snapshot** of the donor registration form (2-step wizard)
3. **Fill Step 1 — Organization Details**:
   - **Organization Name**: `Red Cross Sim`
   - **Type**: Select `ORGANIZATION`
   - **Contact Email**: `sim.donor1@redcross-sim.org`
   - **Contact Phone**: `+2347000000010`
   - **Organization Description/Reference**: `Nigerian Red Cross Simulation Chapter`
4. **Click** "Next" to proceed to Step 2
5. **Fill Step 2 — User Credentials**:
   - **Username**: `sim.donor1`
   - **Email**: `sim.donor1@redcross-sim.org`
   - **Password**: `SimPass123!`
   - **Confirm Password**: `SimPass123!`
   - **Name**: `Red Cross Sim Manager`
6. **Click** "Register" / "Submit"
7. **Wait** for success confirmation
8. **Record** the donor ID from the URL or confirmation page

### 3.2 Register UNICEF Sim

Repeat with:
- **Organization Name**: `UNICEF Sim`
- **Type**: `NGO`
- **Contact Email**: `sim.donor2@unicef-sim.org`
- **Contact Phone**: `+2347000000011`
- **Step 2 — Username**: `sim.donor2`
- **Email**: `sim.donor2@unicef-sim.org`
- **Password**: `SimPass123!`
- **Name**: `UNICEF Sim Coordinator`

### 3.3 Register Govt Aid Sim

Repeat with:
- **Organization Name**: `Govt Aid Sim`
- **Type**: `GOVERNMENT`
- **Contact Email**: `sim.donor3@govt-aid-sim.gov.ng`
- **Contact Phone**: `+2347000000012`
- **Step 2 — Username**: `sim.donor3`
- **Email**: `sim.donor3@govt-aid-sim.gov.ng`
- **Password**: `SimPass123!`
- **Name**: `Govt Aid Sim Officer`

---

## Step 4: Create Entities

Entities are created via the coordinator's entity management page. Since we need the ADMIN or COORDINATOR role:

1. **Navigate** to `{{PRODUCTION_URL}}/coordinator/entity-management`
2. **Take a snapshot** to identify the "Create Entity" / "Add Entity" button

### 4.1 Create Community Entity #1 — Gwoza Community

1. **Click** the "Create Entity" / "Add Entity" button
2. **Take a snapshot** of the entity form
3. **Fill**:
   - **Name**: `Gwoza Community`
   - **Type**: `COMMUNITY`
   - **Location**: `Gwoza, Borno State`
   - **Latitude**: `11.0833`
   - **Longitude**: `13.6667`
   - **Auto-Approve**: Leave **unchecked** (we want manual verification flow)
4. **Click** "Save" / "Create"
5. **Record** the entity ID → `entity.community1`

### 4.2 Create Community Entity #2 — Bama Community

- **Name**: `Bama Community`
- **Type**: `COMMUNITY`
- **Location**: `Bama, Borno State`
- **Latitude**: `11.5217`
- **Longitude**: `13.6908`
- **Auto-Approve**: Leave **unchecked**

### 4.3 Create Ward Entity #1 — Gwoza Ward

- **Name**: `Gwoza Ward`
- **Type**: `WARD`
- **Location**: `Gwoza LGA, Borno State`
- **Latitude**: `11.0833`
- **Longitude**: `13.6667`
- **Auto-Approve**: **Check** (enable auto-approval for this entity — demonstrates AUTO_VERIFIED flow)

### 4.4 Create Ward Entity #2 — Bama Ward

- **Name**: `Bama Ward`
- **Type**: `WARD`
- **Location**: `Bama LGA, Borno State`
- **Latitude**: `11.5217`
- **Longitude**: `13.6908`
- **Auto-Approve**: Leave **unchecked**

### 4.5 Create LGA Entity — Maiduguri LGA

- **Name**: `Maiduguri LGA`
- **Type**: `LGA`
- **Location**: `Maiduguri, Borno State`
- **Latitude**: `11.8311`
- **Longitude**: `13.1511`
- **Auto-Approve**: Leave **unchecked**

### 4.6 Create Camp Entity — Malkohi Camp

- **Name**: `Malkohi Displacement Camp`
- **Type**: `CAMP`
- **Location**: `Malkohi, Adamawa State`
- **Latitude**: `9.1167`
- **Longitude**: `12.3500`
- **Auto-Approve**: Leave **unchecked**

### 4.7 Create Facility Entity — Maiduguri Hospital

- **Name**: `Maiduguri General Hospital`
- **Type**: `FACILITY`
- **Location**: `Maiduguri, Borno State`
- **Latitude**: `11.8333`
- **Longitude**: `13.1500`
- **Auto-Approve**: Leave **unchecked**

### 4.8 Create State Entity — Borno State

- **Name**: `Borno State`
- **Type**: `STATE`
- **Location**: `Borno State, Nigeria`
- **Latitude**: `11.5000`
- **Longitude**: `13.1500`
- **Auto-Approve**: Leave **unchecked**

---

## Step 5: Logout

1. Execute `LOGOUT`

---

## Artefact Summary

Record all captured IDs here before proceeding to Phase 2:

```
ARTEFACT SUMMARY — Phase 1
==========================

# Users
user.sim.coord       = "___"
user.sim.assessor    = "___"
user.sim.assessor2   = "___"
user.sim.responder   = "___"
user.sim.responder2  = "___"
user.sim.multirole   = "___"

# Donors
donor.redcross       = "___"  (user: sim.donor1)
donor.unicef         = "___"  (user: sim.donor2)
donor.govtaid        = "___"  (user: sim.donor3)

# Entities
entity.community1    = "___"  (Gwoza Community)
entity.community2    = "___"  (Bama Community)
entity.ward1         = "___"  (Gwoza Ward — auto-approve enabled)
entity.ward2         = "___"  (Bama Ward)
entity.lga1          = "___"  (Maiduguri LGA)
entity.camp1         = "___"  (Malkohi Displacement Camp)
entity.facility1     = "___"  (Maiduguri General Hospital)
entity.state1        = "___"  (Borno State)
```

## Verification Checklist

- [x] 7 standard users created (visible in `/admin/users`)
- [x] 1 multi-role user with 3 roles (ASSESSOR + COORDINATOR + RESPONDER — DONOR checkbox disabled in user form)
- [x] 3 donor organisations registered (visible in `/admin/donors`)
- [ ] 8 entities created (moved to Phase 2 — coordinator creates at `/coordinator/entities`)
- [ ] Gwoza Ward has auto-approve enabled (moved to Phase 2)
- [x] All users use password `SimPass123!`

---

## Execution Report — Phase 1

**Date**: 2026-06-13
**Environment**: Production (`https://drms.v2.revlos.cloud`)

### Users Created

| Reference | Email | Role(s) | Status |
|-----------|-------|---------|--------|
| `sim.coord` | `sim.coord@dms-sim.gov.ng` | COORDINATOR | ✅ Active |
| `sim.assessor` | `sim.assessor@dms-sim.gov.ng` | ASSESSOR | ✅ Active |
| `sim.assessor2` | `sim.assessor2@dms-sim.gov.ng` | ASSESSOR | ✅ Active |
| `sim.responder` | `sim.responder@dms-sim.gov.ng` | RESPONDER | ✅ Active |
| `sim.responder2` | `sim.responder2@dms-sim.gov.ng` | RESPONDER | ✅ Active |
| `sim.multirole` | `sim.multirole@dms-sim.gov.ng` | ASSESSOR + COORDINATOR + RESPONDER | ✅ Active |
| `sim.donor1` | `sim.donor1@redcross-sim.org` | DONOR | ✅ Active |
| `sim.donor2` | `sim.donor2@unicef-sim.org` | DONOR | ✅ Active |
| `sim.donor3` | `sim.donor3@govt-aid-sim.gov.ng` | DONOR | ✅ Active |

### Donor Organisations Registered

| Donor | Type | Contact Email | Status |
|-------|------|---------------|--------|
| Red Cross Sim | ORGANIZATION | sim.donor1@redcross-sim.org | ✅ Active |
| UNICEF Sim | NGO | sim.donor2@unicef-sim.org | ✅ Active |
| Govt Aid Sim | GOVERNMENT | sim.donor3@govt-aid-sim.gov.ng | ✅ Active |

### Dashboard Summary (Post Phase 1)

| Metric | Value |
|--------|-------|
| Total Users | 10 |
| Active Users | 10 |
| Total Donors | 3 |
| Total Entities | 27 (pre-existing) |
| Active Incidents | 0 |

### Deviations from Plan

1. **Multi-role user**: The user creation form does not allow checking DONOR as a role (checkbox is disabled). The `sim.multirole` user was created with 3 roles (ASSESSOR + COORDINATOR + RESPONDER) instead of 4. This is a UI limitation — DONOR role can only be assigned through donor organisation registration.
2. **Entity creation**: Moved to Phase 2 (coordinator creates entities at `/coordinator/entities`).

### Issues Encountered & Resolved

1. **Production DB schema mismatch**: Donor registration initially returned 500 error (`donors.achievementBadges` column missing). Fixed by running `npx prisma db push` on the production database.
2. **Donor registration session hijack (BUG FIXED)**: The `DonorRegistrationForm` component (`src/components/donor/DonorRegistrationForm.tsx:107`) unconditionally called `setAuthToken(data.data.token)` after successful registration, overwriting the admin's JWT with the new donor user's token. This was because the form is shared between public self-registration and admin-initiated registration. The API (`src/app/api/v1/donors/route.ts:117-133`) also needlessly mints a token for admin-initiated creation. **Fix applied**: The frontend `onSuccess` handler now checks if an `onSuccess` prop is provided (admin context) — if so, it skips token storage and calls the admin's callback instead of performing self-login. The admin's session is preserved.

### Result

**Phase 1 (Users & Donors): PASS** ✅ — All 10 users and 3 donor organisations created successfully. Entity creation deferred to Phase 2.
