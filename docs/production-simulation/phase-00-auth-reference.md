# Phase 0 — Authentication & Login Reference

## Purpose

This is a **reference document** (not a standalone phase to execute alone). It defines the standard login and logout procedures that all subsequent phases reference. Every phase begins by logging in as a specific user using the steps below.

## Production URL

```
https://drms.v2.revlos.cloud
```

## Production Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@drms.local` |
| Password | `Admin@123456` |

---

## Standard Login Procedure

### Generic Login Steps (used by all phases)

> **Reference name:** `LOGIN(user)`

1. **Navigate** to `{{PRODUCTION_URL}}/login`
   - Tool: `navigate_page` with `type: "url"`, `url: "{{PRODUCTION_URL}}/login"`
2. **Take a snapshot** to identify form elements
   - Tool: `take_snapshot`
3. **Identify** the email input field and password input field from the snapshot (look for `uid` values)
4. **Fill** the email field:
   - Tool: `fill` with the email input's `uid`
   - Value: the user's email (see table below)
5. **Fill** the password field:
   - Tool: `fill` with the password input's `uid`
   - Value: the user's password (see table below)
6. **Click** the submit/login button:
   - Tool: `click` on the button's `uid`
7. **Wait** for redirect to the role dashboard:
   - Tool: `wait_for` with the expected dashboard heading text (e.g., `["Dashboard", "Overview"]`)
8. **Take a snapshot** to confirm the dashboard loaded and capture any role-specific UI elements

### Standard Logout Procedure

> **Reference name:** `LOGOUT`

1. **Find** the Logout button/link in the sidebar or header (look for "Logout" text in snapshot)
2. **Click** the Logout element
3. **Wait** for redirect to `/login`
   - Tool: `wait_for` with `["login", "Login", "Sign in"]`

---

## Role Switching Procedure (for multi-role users)

> **Reference name:** `SWITCH_ROLE(targetRole)`

For users with multiple roles (e.g., `sim.multirole`), switch active context:

1. **Take a snapshot** to find the Role Switcher dropdown in the header bar
2. **Click** the Role Switcher dropdown
3. **Take a snapshot** to see available role options
4. **Click** the desired role option (e.g., "COORDINATOR", "RESPONDER", "DONOR", "ASSESSOR")
5. **Wait** for the page to redirect to that role's dashboard
6. **Take a snapshot** to confirm the new role context is active

---

## Simulation User Credentials

> These users are created in Phase 1. Credentials are listed here for reference throughout all phases.

### Standard Password

All simulation users use the same password:

```
SimPass123!
```

### User Lookup Table

| Reference | Email | Password | Role(s) | Default Dashboard |
|-----------|-------|----------|---------|-------------------|
| `ADMIN` | `sim.admin@dms-sim.gov.ng` | `SimPass123!` | ADMIN | `/admin/dashboard` |
| `COORDINATOR` | `sim.coord@dms-sim.gov.ng` | `SimPass123!` | COORDINATOR | `/coordinator/dashboard` |
| `ASSESSOR` | `sim.assessor@dms-sim.gov.ng` | `SimPass123!` | ASSESSOR | `/assessor/dashboard` |
| `ASSESSOR2` | `sim.assessor2@dms-sim.gov.ng` | `SimPass123!` | ASSESSOR | `/assessor/dashboard` |
| `RESPONDER` | `sim.responder@dms-sim.gov.ng` | `SimPass123!` | RESPONDER | `/responder/dashboard` |
| `RESPONDER2` | `sim.responder2@dms-sim.gov.ng` | `SimPass123!` | RESPONDER | `/responder/dashboard` |
| `MULTIROLE` | `sim.multirole@dms-sim.gov.ng` | `SimPass123!` | ASSESSOR, COORDINATOR, RESPONDER, DONOR | `/coordinator/dashboard` (highest priority) |
| `DONOR1` | `sim.donor1@redcross-sim.org` | `SimPass123!` | DONOR | `/donor/dashboard` |
| `DONOR2` | `sim.donor2@unicef-sim.org` | `SimPass123!` | DONOR | `/donor/dashboard` |
| `DONOR3` | `sim.donor3@govt-aid-sim.gov.ng` | `SimPass123!` | DONOR | `/donor/dashboard` |

### Donor Organisation Mapping

| Donor User | Donor Organisation Name | Donor Type |
|------------|------------------------|------------|
| `DONOR1` | Red Cross Sim | ORGANIZATION |
| `DONOR2` | UNICEF Sim | NGO |
| `DONOR3` | Govt Aid Sim | GOVERNMENT |

---

## Capturing Entity IDs from UI

After creating or viewing records, the agent must capture IDs:

1. **After creating a record**: The UI typically navigates to a detail page. The URL contains the record ID (e.g., `/admin/users/abc-123`). Capture this ID.
2. **From a list page**: Click on a record to open its detail page. Capture the ID from the URL.
3. **From snapshot data**: Sometimes IDs appear in `data-*` attributes or table rows.

### Recording Convention

At the end of each phase, record captured IDs in this format:

```
ARTEFACT SUMMARY — Phase X
==========================
entity.sim.community1 = "uuid-here"
entity.sim.ward1 = "uuid-here"
incident.flood = "uuid-here"
...
```

---

---

## Execution Report — Phase 0

**Date**: 2026-06-13
**Environment**: Production (`https://drms.v2.revlos.cloud`)

### Login Test

| Step | Status | Notes |
|------|--------|-------|
| Navigate to `/login` | ✅ Pass | Login page loaded successfully |
| Fill email (`admin@drms.local`) | ✅ Pass | Email field `uid=1_14` |
| Fill password (`Admin@123456`) | ✅ Pass | Password field `uid=1_16` |
| Click "Sign in" button | ✅ Pass | Button `uid=1_17` |
| Redirect to dashboard | ✅ Pass | Landed on `/admin/dashboard` |

### Dashboard Verification

| Check | Status | Notes |
|-------|--------|-------|
| Admin Dashboard heading visible | ✅ Pass | "Admin Dashboard" h1 |
| User name displayed | ✅ Pass | "System Administrator" in header |
| Role context | ✅ Pass | ADMIN sidebar navigation visible |
| Sync indicator | ✅ Pass | "Synced" + "Online" in header |
| Total Users count | ✅ Pass | Shows 1 (admin only, pre-simulation) |
| Active Incidents count | ✅ Pass | Shows 0 (pre-simulation) |
| Total Entities count | ✅ Pass | Shows 27 (pre-existing in production) |
| Donors count | ✅ Pass | Shows 0 (pre-simulation) |

### Key UI Element IDs Captured

| Element | Location | UID (may change on re-render) |
|---------|----------|-------------------------------|
| Logout button (header) | Header bar | `uid=2_4` |
| Logout button (sidebar) | Sidebar bottom | `uid=2_46` |
| Notifications bell | Header bar | `uid=2_2` |
| Theme toggle | Header bar | `uid=1_6` |

### Pre-Simulation State

- **Existing users**: 1 (admin@drms.local — ADMIN)
- **Existing entities**: 27 (pre-existing in production)
- **Existing incidents**: 0
- **Existing donors**: 0
- **Existing assessments**: 0
- **Existing commitments**: 0
- **Existing response plans**: 0

### Result

**Phase 0: PASSS** ✅ — Login flow verified. Production environment accessible and responsive. Ready to proceed to Phase 1.

---

## End of Phase 0

This reference is used by all subsequent phases. No artefacts are created in this phase.
