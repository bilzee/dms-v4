# Dead Links & Missing Routes Audit Report

> Comprehensive audit of all navigation links, route references, and API endpoints that lead to non-existent pages or unimplemented routes.
> Generated: 2026-05-19
> Updated: 2026-05-19 (post mock-values remediation)

---

## Summary

| Category | Count | Description |
|----------|-------|-------------|
| CRITICAL | 5 | Core navigation items with no page |
| HIGH | 9 | Major features with missing pages or API routes |
| MEDIUM | 7 | Secondary navigation dead links |
| LOW | 4 | Phantom route-config entries, breadcrumbs to nowhere |
| RESOLVED | 2 | Fixed by mock-values remediation |
| **Total Dead Links** | **25** | **Unique dead references remaining (1 resolved, 1 new)** |

---

## CRITICAL Findings

### 1. `/users/new` - No Page Exists (3 references)

Linked from the main dashboard's "Add User" quick actions. Users clicking this get a 404.

| Source File | Line | Context |
|------------|------|---------|
| `src/app/(auth)/dashboard/page.tsx` | 114 | `<Link href="/users/new">` |
| `src/app/(auth)/dashboard/page.tsx` | 442 | `<Link href="/users/new">` |
| `src/components/shared/Breadcrumbs.tsx` | 107-110 | Breadcrumb definition for `/users/new` |
| `src/components/layouts/Navigation.tsx` | 334 | Admin nav: "Add New User" |

**Existing pages:** `src/app/(auth)/admin/users/page.tsx` exists, but no `admin/users/new/page.tsx` or `users/new/page.tsx`.

**Fix:** Create `src/app/(auth)/admin/users/new/page.tsx`, or update all links to point to `/admin/users` with a create-user dialog.

---

### 2. `/donor/commitments` - No Page Exists (5 references)

Donor commitment management links all point to a non-existent route.

| Source File | Line | Context |
|------------|------|---------|
| `src/components/layouts/Navigation.tsx` | 235 | Nav parent: "My Commitments" |
| `src/app/(auth)/donor/performance/page.tsx` | 162 | `<a href="/donor/commitments">` |
| `src/components/donor/CommitmentDashboard.tsx` | 432 | `router.push(/donor/commitments/${id})` |
| `src/components/donor/CommitmentDashboard.tsx` | 442 | `router.push(/donor/commitments/${id}/edit)` |
| `src/components/donor/CommitmentForm.tsx` | 174 | `router.push(/donor/commitments/${data.id})` |

**Existing pages:** Only `/donor/dashboard` (with `?tab=commitments`), `/donor/responses` exist. No `/donor/commitments/` directory at all.

**Fix:** Create `/donor/commitments` page, or redirect all links to `/donor/dashboard?tab=commitments`.

---

### 3. `/coordinator/reports` - No Page Exists

| Source File | Line | Context |
|------------|------|---------|
| `src/app/(auth)/coordinator/dashboard/page.tsx` | 264 | `<Link href="/coordinator/reports">` |

**Existing pages:** No `src/app/(auth)/coordinator/reports/` directory. The report builder component exists at `src/components/reports/builder/ReportBuilder.tsx` but has no page route.

**Fix:** Create `src/app/(auth)/coordinator/reports/page.tsx` that renders `ReportManagement`.

---

### 4. `/reports/builder` - No Page Exists (3 references)

| Source File | Line | Context |
|------------|------|---------|
| `src/components/reports/ReportManagement.tsx` | 452 | `window.location.href = '/reports/builder'` |
| `src/components/reports/ReportManagement.tsx` | 480 | `window.location.href = '/reports/builder'` |
| `src/components/reports/ReportManagement.tsx` | 565 | `window.location.href = '/reports/builder?id=...'` |

**Existing pages:** No `src/app/(auth)/reports/builder/` or `src/app/reports/` directory. The `ReportBuilder.tsx` component exists but has no page route.

**Fix:** Create page route for report builder (e.g., `src/app/(auth)/reports/builder/page.tsx`).

---

### 5. `/rapid-assessments/[id]` - Detail View Has No Page

| Source File | Line | Context |
|------------|------|---------|
| `src/app/(auth)/assessor/dashboard/page.tsx` | 281 | `<Link href={/rapid-assessments/${assessment.id}}>` |

**Existing pages:** `src/app/rapid-assessments/page.tsx` and `src/app/rapid-assessments/new/page.tsx` exist, but there is no `src/app/rapid-assessments/[id]/page.tsx` for viewing individual assessment details.

**Fix:** Create `src/app/rapid-assessments/[id]/page.tsx` or redirect to `/assessor/rapid-assessments/[id]`.

---

## HIGH Severity Findings

### 6. `/dashboard/crisis` - No Page Exists

| Source File | Line | Context |
|------------|------|---------|
| `src/app/(auth)/dashboard/page.tsx` | 220 | `<Link href="/dashboard/crisis">` ("View All Activity" button) |

**Fix:** Create the page or change link to an existing activity page.

---

### 7. `/system/health` - No Page Exists

| Source File | Line | Context |
|------------|------|---------|
| `src/app/(auth)/dashboard/page.tsx` | 262 | `<Link href="/system/health">` ("Detailed Health Report" button) |

**Fix:** Create `src/app/(auth)/system/health/page.tsx` or link to `/system/database` instead.

---

### ~~8. Missing API Route: `/api/v1/verification/analytics`~~ -- RESOLVED

> **Status: FIXED** - API route created at `src/app/api/v1/verification/analytics/route.ts` as part of mock-values remediation.
>
> Both `ConfigurationAnalytics.tsx` and `VerificationAnalytics.tsx` now successfully fetch from this endpoint.
>
> **Consumers:**
> - `src/components/verification/ConfigurationAnalytics.tsx:83` - `fetch('/api/v1/verification/analytics?...')`
> - `src/components/verification/VerificationAnalytics.tsx:49` - `fetch('/api/v1/verification/analytics?...')`

---

### 9. Missing API Route: `/api/v1/verification/audit/[id]/rollback`

| Source File | Line | Context |
|------------|------|---------|
| `src/components/verification/ConfigurationAuditHistory.tsx` | 172 | `fetch('/api/v1/verification/audit/${auditLogId}/rollback')` |

**Existing routes:** `src/app/api/v1/verification/audit/route.ts` exists, but no `[id]/rollback/` sub-route.

**Fix:** Create `src/app/api/v1/verification/audit/[id]/rollback/route.ts`.

---

### 10. Missing API Route: `/api/v1/verification/audit/export`

| Source File | Line | Context |
|------------|------|---------|
| `src/components/verification/ConfigurationAuditHistory.tsx` | 203 | `fetch('/api/v1/verification/audit/export?...')` |

**Existing routes:** No `export` sub-route under `verification/audit/`.

**Fix:** Create `src/app/api/v1/verification/audit/export/route.ts`.

---

### 11. Role-Based Rapid Assessment Redirects - 3 Routes Missing

`src/app/rapid-assessments/page.tsx` (lines 19, 22, 28) redirects to role-specific rapid assessment pages that don't exist:

| Target Route | Source Line | Status |
|-------------|------------|--------|
| `/coordinator/rapid-assessments` | 19 | No page exists |
| `/responder/rapid-assessments` | 22 | No page exists |
| `/admin/rapid-assessments` | 28 | No page exists |

**Note:** `/assessor/rapid-assessments` and `/donor/rapid-assessments` DO exist. Only these 3 are dead.

**Fix:** Create these pages or redirect these roles to existing pages (e.g., `/rapid-assessments` for viewing, role-specific dashboards for management).

---

### 12. `/admin/users/new` - No Page Exists

| Source File | Line | Context |
|------------|------|---------|
| `src/app/(auth)/admin/dashboard/page.tsx` | 343 | `<a href="/admin/users/new">Create User</a>` |
| `src/components/layouts/Navigation.tsx` | 334 | Admin nav: "Add New User" |

**Existing pages:** `src/app/(auth)/admin/users/page.tsx` exists, but no `new/` subdirectory.

**Fix:** Create `src/app/(auth)/admin/users/new/page.tsx` or add user creation dialog to the users list page.

---

### 13. Login Redirect for RESPONDER: `/responder/planning`

| Source File | Line | Context |
|------------|------|---------|
| `src/components/auth/LoginForm.tsx` | 141 | `router.push('/responder/planning')` |

**Existing pages:** `src/app/(auth)/responder/planning/page.tsx` exists - this link is VALID. Listed for reference only.

---

### 25. `/users` - Wrong Path in Admin Dashboard (NEW)

| Source File | Line | Context |
|------------|------|---------|
| `src/app/(auth)/admin/dashboard/page.tsx` | ~356 | `<a href="/users">Manage Users</a>` |

**Existing pages:** The admin user list page is at `src/app/(auth)/admin/users/page.tsx` (path `/admin/users`), but the admin dashboard links to `/users` which does not exist.

**Introduced by:** Mock-values remediation updated `admin/dashboard/page.tsx` to fetch real health data.

**Fix:** Change `href="/users"` to `href="/admin/users"`.

---

## MEDIUM Severity Findings

### 14. Navigation Parent Items With No Page (Navigation.tsx)

These are parent nav items where the `href` itself is used as an expandable section toggle, but if JavaScript fails or a user tries to navigate directly, they hit 404s:

| Nav Item | Href | Line | Page Exists? |
|----------|------|------|-------------|
| Operations Management | `/coordinator/operations` | 106 | No |
| Donor Relations | `/coordinator/donor-relations` | 143 | No |
| Configuration | `/coordinator/configuration` | 168 | No |
| Mapping & Visualization | `/coordinator/mapping` | 193 | No |
| System Administration | `/admin/system` | 367 | No |

**Fix:** These are currently expand-only items (onClick toggles expansion). For resilience, either create redirect pages or use `href="#"` and prevent default navigation.

---

### 15. `/resources` - No Page Exists

| Source File | Line | Context |
|------------|------|---------|
| `src/components/layouts/Navigation.tsx` | 129 | Coordinator nav: "Resource Allocation" |

**Fix:** Change to `/coordinator/resource-management` which exists, or create `/resources` page.

---

### 16. `/tasks` - No Page Exists

| Source File | Line | Context |
|------------|------|---------|
| `src/components/layouts/Navigation.tsx` | 218 | Responder nav: "My Tasks" |

**Fix:** Create page or remove from navigation.

---

### 17. `/team` - No Page Exists

| Source File | Line | Context |
|------------|------|---------|
| `src/components/layouts/Navigation.tsx` | 223 | Responder nav: "Team Status" |

**Fix:** Create page or remove from navigation.

---

### 18. `/donor/donations` - No Page Exists

| Source File | Line | Context |
|------------|------|---------|
| `src/components/layouts/Navigation.tsx` | 258 | Donor nav child: "Donation Management" |

**Fix:** Create page or change to `/donor/responses` which exists.

---

### 19. `/donor/entities/impact` - No Page Exists

| Source File | Line | Context |
|------------|------|---------|
| `src/components/layouts/Navigation.tsx` | 283 | Donor nav child: "Entity Impact" |

**Note:** API routes exist at `/api/v1/donors/entities/impact/...` but no frontend page.

**Fix:** Create page or link to `/donor/entities/performance`.

---

### 20. `/help` - No Page Exists

| Source File | Line | Context |
|------------|------|---------|
| `src/components/layouts/Navigation.tsx` | 57 | Base nav: "Help & Support" |

**Fix:** Create a help/support page or remove from base navigation.

---

## LOW Severity Findings

### 21. Phantom Paths in `ROLE_ACCESSIBLE_PATHS` (route-config.ts)

These paths are listed in `ROLE_ACCESSIBLE_PATHS` (line 27-33) but have no corresponding page files:

| Role | Phantom Path | Line |
|------|-------------|------|
| ASSESSOR | `/assessments` | 28 |
| ASSESSOR | `/assessments/new` | 28 |
| ASSESSOR | `/surveys` | 28 |
| COORDINATOR | `/coordination` | 29 |
| COORDINATOR | `/responses` | 29 |
| COORDINATOR | `/verification` | 29 |
| COORDINATOR | `/reports` | 29 |
| RESPONDER | `/response` | 30 |
| RESPONDER | `/incidents` | 30 |
| RESPONDER | `/tasks` | 30 |
| DONOR | `/donations` | 31 |
| DONOR | `/resources` | 31 |
| DONOR | `/impact` | 31 |
| ADMIN | `/users` | 32 |
| ADMIN | `/reports` | 32 |

**Impact:** These are used by `RoleBasedRoute.canAccessPath()` for route guard checks. They won't match actual routes, so users can never access these "allowed" paths. The existing actual paths like `/assessor/rapid-assessments` are NOT in this list.

**Fix:** Update `ROLE_ACCESSIBLE_PATHS` to use actual route paths that exist in the app.

---

### 22. Breadcrumbs for Non-Existent Routes

| Source File | Line | Route |
|------------|------|-------|
| `src/components/shared/Breadcrumbs.tsx` | 37, 42, 47, 52 | `/assessments` |
| `src/components/shared/Breadcrumbs.tsx` | 50 | `/assessments/new` |
| `src/components/shared/Breadcrumbs.tsx` | 55-58 | `/surveys` |

These breadcrumb definitions point to pages that don't exist. They appear in breadcrumb navigation but clicking them leads to 404.

**Fix:** Update breadcrumb paths to existing routes (e.g., `/assessor/rapid-assessments`).

---

### 23. Phantom Path Patterns in `ROLE_PATH_PATTERNS` (route-config.ts)

The `ROLE_PATH_PATTERNS` (line 19-25) include regex patterns for routes that don't exist:

| Role | Phantom Pattern | Actual Route |
|------|----------------|-------------|
| ASSESSOR | `/surveys` | No surveys feature exists |
| COORDINATOR | `/coordination` | Should be `/coordinator` |
| COORDINATOR | `/responses` | Should be `/coordinator/verification` or `/responder/responses` |
| RESPONDER | `/response` | Should be `/responder` |
| RESPONDER | `/incidents` | Should be `/coordinator/incidents` |
| DONOR | `/donations` | Should be `/donor` |
| DONOR | `/resources` | Should be `/coordinator/resource-management` |

**Impact:** Users with these roles may be incorrectly granted or denied access to routes.

---

### 24. `/logout` - No Page (API Only)

| Source File | Line | Context |
|------------|------|---------|
| `src/components/layouts/Navigation.tsx` | 63 | Base nav: "Logout" |

The API route `/api/v1/auth/logout/route.ts` exists, but there is no `/logout` page. This link will show a 404 page. It should either call the API directly or use `onClick` handler instead of a page link.

**Fix:** Change to use `onClick` handler that calls `/api/v1/auth/logout` and redirects.

---

## Pages With No Incoming Links (Orphan Routes)

These pages exist in the app directory but have NO links pointing to them from anywhere in the codebase:

| Page | Path | Status |
|------|------|--------|
| Donor Analytics | `/donor/analytics` | No links found |
| Donor Leaderboard | `/donor/leaderboard` | Linked from `/donor/performance` - NOT orphan |
| Donor Profile | `/donor/profile` | No links found |
| Donor Rapid Assessments | `/donor/rapid-assessments` | Linked from `EntitySelector.tsx:104` - NOT orphan |
| Verification Metrics | `/verification/metrics` | No links found |
| Coordinator Entity Incident Map | `/coordinator/entity-incident-map` | Linked from Navigation.tsx - NOT orphan |
| Coordinator Settings: Gap Field Mgmt | `/coordinator/settings/gap-field-management` | Linked from Navigation.tsx - NOT orphan |
| Coordinator Settings: Severity Thresholds | `/coordinator/settings/severity-thresholds` | Linked from Navigation.tsx - NOT orphan |
| Coordinator Donor Metrics | `/coordinator/donors/metrics` | Linked from Navigation.tsx + resource-mgmt - NOT orphan |
| Coordinator Donors List | `/coordinator/donors` | Linked from resource-mgmt - NOT orphan |

**True Orphans (no incoming links at all):**

1. **`/donor/analytics`** - `src/app/(auth)/donor/analytics/page.tsx` - Not reachable from any navigation or link
2. **`/donor/profile`** - `src/app/(auth)/donor/profile/page.tsx` - Not reachable from any navigation or link
3. **`/verification/metrics`** - `src/app/verification/metrics/page.tsx` - Not reachable from any navigation or link

---

## Missing API Routes Referenced by Frontend

These `fetch()` calls in frontend components target API endpoints that don't exist:

| API Endpoint | Source File | Line | Missing Route File | Status |
|-------------|------------|------|-------------------|--------|
| ~~`GET /api/v1/verification/analytics`~~ | ~~`ConfigurationAnalytics.tsx`~~ | ~~83~~ | ~~`src/app/api/v1/verification/analytics/route.ts`~~ | **RESOLVED** |
| `POST /api/v1/verification/audit/[id]/rollback` | `ConfigurationAuditHistory.tsx` | 172 | `src/app/api/v1/verification/audit/[id]/rollback/route.ts` | Missing |
| `GET /api/v1/verification/audit/export` | `ConfigurationAuditHistory.tsx` | 203 | `src/app/api/v1/verification/audit/export/route.ts` | Missing |

**Previously missing, now resolved by mock-values remediation:**
| API Endpoint | Route File Created |
|-------------|-------------------|
| `GET /api/v1/system/health` | `src/app/api/v1/system/health/route.ts` |
| `GET /api/v1/verification/analytics` | `src/app/api/v1/verification/analytics/route.ts` |
| `POST /api/v1/donors/reports/generate` | `src/app/api/v1/donors/reports/generate/route.ts` |
| `GET/PUT /api/v1/system/settings` | `src/app/api/v1/system/settings/route.ts` |

---

## Prioritized Remediation

### Immediate (CRITICAL)
1. **Create user creation page** - `/admin/users/new/page.tsx` or add dialog; update `/users/new` links
2. **Fix donor commitment routes** - Create `/donor/commitments/` page or redirect to dashboard tab
3. **Create coordinator reports page** - `/coordinator/reports/page.tsx`
4. **Create report builder page** - `/reports/builder/page.tsx`
5. **Create rapid assessment detail view** - `/rapid-assessments/[id]/page.tsx`

### Short-term (HIGH)
6. **Create `/dashboard/crisis`** activity page
7. **Create `/system/health`** page
8. ~~**Create missing verification API routes**~~ (analytics ~~RESOLVED~~, audit rollback, audit export)
9. **Fix missing role-specific rapid assessment pages** (coordinator, responder, admin)
10. **Create admin user creation page** at `/admin/users/new`
11. **Fix `/users` link in admin dashboard** - Change to `/admin/users` (Finding #25)

### Medium-term (MEDIUM)
11. **Fix Navigation.tsx parent items** - Use `href="#"` for expand-only items
12. **Fix `/resources` link** to point to `/coordinator/resource-management`
13. **Remove or implement `/tasks` and `/team`** from responder nav
14. **Fix `/donor/donations`** link in Navigation.tsx
15. **Fix `/donor/entities/impact`** - Create page or redirect
16. **Create `/help`** page

### Low Priority
17. **Update `ROLE_ACCESSIBLE_PATHS`** to match actual routes
18. **Update `ROLE_PATH_PATTERNS`** to match actual routes
19. **Fix breadcrumb paths** to point to existing routes
20. **Fix `/logout`** to use onClick handler instead of page link
