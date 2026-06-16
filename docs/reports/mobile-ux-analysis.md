# Mobile UX Analysis Report

**Date:** June 15, 2026  
**Analyst:** Sally (UX Designer)  
**Method:** Chrome DevTools mobile emulation (iPhone X: 375×812, touch, 2x DPR) + code analysis  
**Scope:** All 5 roles (Admin, Coordinator, Assessor, Responder, Donor) across 71 pages  

---

## Executive Summary

The DMS application was built desktop-first with some responsive considerations, but the mobile experience has **systemic issues** that affect every role. The two most impactful problems are: (1) the global Header overflows horizontally by ~94px on 375px screens, and (2) Card components throughout the app contain action button clusters that overflow without wrapping. Several additional issues — missing branding in the mobile toolbar, cramped charts, and unresolvable table layouts — compound the problem.

**Severity distribution:** 2 Critical · 5 High · 8 Medium · 3 Low

---

## Issue Catalog

### CRITICAL

#### 1. Header Horizontal Overflow (All Pages)

**Severity:** CRITICAL  
**Affected:** Every authenticated page on screens ≤ 375px  
**Evidence:** Measured at 375px viewport — right-side cluster extends to x=469px (94px overflow)

The `Header` component (`src/components/shared/Header.tsx`) renders 5+ elements in a `flex items-center gap-4` row without `flex-wrap`:

```
[DRMS Borno]  [Synced] [Online] [Theme] [Notifications] [Logout]
```

At 375px width, the items from Theme toggle onward are pushed off-screen. The Logout button (ending at x=469) is completely invisible and inaccessible without horizontal scrolling.

**Root cause:** `flex items-center gap-4` on the right-side cluster with no wrapping, no responsive gap reduction, and no responsive hiding of low-priority indicators.

**Impact:** Users cannot log out, toggle theme, or view notifications on mobile.

**Recommendation:**
- Add `flex-wrap` to the right cluster
- Reduce gap on mobile: `gap-1 sm:gap-4`
- Use icon-only buttons on mobile (hide text labels — SyncIndicator and OfflineIndicator already show short text; use icon-only variants under `sm`)
- Consider a mobile "more" menu (three-dot) for Theme/Logout

---

#### 2. Card Action Button Overflow (App-Wide Pattern)

**Severity:** CRITICAL  
**Affected:** 17+ component instances across all roles  
**Evidence:** Code analysis + mobile screenshots of donor entities, entity management, verification queue

The `Card` component (`src/components/ui/card.tsx`) and especially `CardFooter` use `flex items-center` without `flex-wrap`. When pages place 2-4 action buttons inside Card headers/footers, they overflow horizontally on mobile.

**Worst offenders:**

| Component | File:Line | Buttons | Min Width |
|-----------|-----------|---------|-----------|
| ResponsePlanningForm | `src/components/forms/response/ResponsePlanningForm.tsx:866` | 3 buttons with `min-w-32`, `min-w-40`, `min-w-20` | 368px+ |
| AutoApprovalConfig | `src/components/verification/AutoApprovalConfig.tsx:317` | Badge + 2 outline + 1 primary | ~380px+ |
| EnhancedAutoApprovalConfig | `src/components/verification/EnhancedAutoApprovalConfig.tsx:514` | Same as above with dynamic text | ~400px+ |
| CommitmentStatusTracker | `src/components/donor/CommitmentStatusTracker.tsx:183` | Badge + "Update Status" + "Cancel" | ~320px+ |
| Notification Settings | `src/app/(auth)/admin/settings/notifications/page.tsx:389` | Defaults + Discard + Save Changes | ~300px+ |
| Scoring Settings | `src/app/(auth)/coordinator/settings/scoring/page.tsx:216` | Defaults + Discard + Save Changes | ~300px+ |
| AuditLogDashboard pagination | `src/components/dashboards/admin/AuditLogDashboard.tsx:491` | Long text + Prev/Next buttons | ~350px+ |

**Impact:** Action buttons are pushed off-card and off-screen. Users cannot access primary actions (Verify, Reject, Save, Cancel) on mobile.

**Recommendation:**
- Add `flex-wrap` to ALL flex containers holding action buttons
- Change `CardFooter` base class to `flex items-center flex-wrap gap-2 p-6 pt-0`
- For `justify-between` patterns, use `flex-col sm:flex-row gap-2` on mobile
- For ResponsePlanningForm specifically: reduce `min-w-*` values or remove them and allow wrapping

---

### HIGH

#### 3. Mobile Top Bar Missing App Branding

**Severity:** HIGH  
**Affected:** All authenticated pages on mobile (under `lg` breakpoint)  
**File:** `src/components/layouts/AppShell.tsx:128-149`

The mobile top bar shows only a hamburger icon and status indicators. The `flex-1` div where branding should appear is empty:

```tsx
<div className="flex flex-1 items-center">
</div>
```

Users on mobile have no visual confirmation of which app they're in or which role they're acting as.

**Recommendation:** Add app name + icon and current role badge to the `flex-1` area.

---

#### 4. SyncIndicator Invisible on Small Phones

**Severity:** HIGH  
**Affected:** Screens < 640px (most phones in portrait)  
**File:** `src/components/layouts/AppShell.tsx:137`

SyncIndicator is wrapped in `<div className="hidden sm:block">`, making it invisible on phones. The mobile navigation drawer also lacks SyncIndicator, so sync status is completely inaccessible on small devices.

**Recommendation:** Show a compact icon-only SyncIndicator on mobile, or include it in the mobile nav drawer.

---

#### 5. Mobile Drawer Missing Branding and Status

**Severity:** HIGH  
**Affected:** All pages on mobile  
**File:** `src/components/layouts/AppShell.tsx:75-96`

The mobile drawer shows a generic "Navigation" heading instead of the app name/logo. Unlike the desktop sidebar which includes branding + SyncIndicator + OfflineIndicator at the bottom, the mobile drawer contains only the Navigation component.

**Recommendation:**
- Replace "Navigation" heading with app name + icon (matching desktop sidebar)
- Add SyncIndicator and OfflineIndicator at the bottom of the drawer
- Add current user name/role info

---

#### 6. No Body Scroll Lock When Drawer Is Open

**Severity:** HIGH  
**Affected:** All pages on mobile  
**File:** `src/components/layouts/AppShell.tsx`

When the mobile sidebar drawer is open, the background page can still scroll. This creates a disorienting experience where swiping on the overlay scrolls the page behind it.

**Recommendation:** Add `document.body.style.overflow = 'hidden'` when `sidebarOpen` is true and restore on close.

---

#### 7. Data Tables Require Horizontal Scroll Without Mobile Adaptation

**Severity:** HIGH  
**Affected:** All pages with DataTable (users, donors, incidents, responses, verification, audit log, leaderboard, entities)  
**Files:** `src/components/shared/DataTable.tsx`, `src/components/ui/table.tsx`

Data tables use `overflow-auto` which enables horizontal scrolling, but no columns are hidden or restructured on mobile. Users must scroll horizontally through 5-8 columns, losing context of which row they're viewing.

**Evidence:** Screenshots of `/admin/users` (6 columns), `/responder/responses` (6 columns), `/donor/leaderboard` (7 columns) — all require horizontal scroll.

**Recommendation:**
- Implement responsive column hiding (hide low-priority columns under `md`)
- Consider a card/list view alternative for mobile (transform rows into stacked cards)
- Show only the most critical 2-3 columns on mobile

---

### MEDIUM

#### 8. Charts and Data Visualizations Cramped on Mobile

**Severity:** MEDIUM  
**Affected:** `/coordinator/analytics`, `/coordinator/situation-dashboard`, `/admin/donors/metrics`, `/donor/analytics`, `/donor/performance`  
**Evidence:** Mobile screenshots of coordinator analytics

Charts (bar charts, line graphs, data grids) render at desktop-scale proportions and become unreadable on 375px width. Axis labels overlap, legends wrap awkwardly, and chart containers don't have responsive height adjustments.

**Recommendation:**
- Reduce chart height on mobile
- Simplify chart legends (use icons instead of text)
- Consider tabbed chart views on mobile
- Ensure chart containers have `overflow-x-auto` where needed

---

#### 9. Filter Panels Take Excessive Vertical Space on Mobile

**Severity:** MEDIUM  
**Affected:** `/coordinator/incidents`, `/coordinator/verification`, `/admin/audit`  
**Evidence:** Screenshot of `/coordinator/incidents` — Filters section (Search, Status, Severity, Type) takes ~200px before any data is visible

Filter panels stack vertically on mobile (which is correct), but they're always expanded. On a 375×812 screen, filters consume 25-30% of the viewport before the user sees any actual data.

**Recommendation:**
- Make filter panels collapsible on mobile (collapsed by default)
- Use a "Filters" button that opens a bottom sheet or dialog
- Show active filter count as a badge on the collapsed button

---

#### 10. DataTable Pagination Bar Overflow

**Severity:** MEDIUM  
**Affected:** All pages with paginated DataTable  
**File:** `src/components/shared/DataTable.tsx` (pagination section, outside `overflow-auto` wrapper)

The pagination bar renders up to 7 page-number buttons (36px each = 252px) plus prev/next buttons and "Showing X-Y of Z" text. This sits outside the table's `overflow-auto` wrapper, so it will overflow the card on mobile.

**Recommendation:**
- Show fewer page buttons on mobile (max 3 + first/last)
- Stack pagination vertically on mobile: info text above, buttons below
- Add `flex-wrap` to the pagination container

---

#### 11. FormActionBar Lacks flex-wrap

**Severity:** MEDIUM  
**Affected:** All form pages using FormActionBar with extra children  
**File:** `src/components/shared/FormActionBar.tsx`

When consumers pass additional `children` alongside the default Cancel/Submit buttons, the `flex gap-3` container has no wrapping. The typical 2-button case is fine, but forms that add extra actions (e.g., "Save Draft") will overflow.

**Recommendation:** Add `flex-wrap` to the base class.

---

#### 12. Dashboard Stat Cards — Tight But Functional

**Severity:** MEDIUM  
**Affected:** All role dashboards  
**Evidence:** Screenshots of admin, coordinator, responder, donor, assessor dashboards

Stat cards stack to a single column on mobile (good), but each card has `p-6` (24px) padding which consumes 48px of the 375px width. On a 320px screen (iPhone SE), this leaves only 272px for card content.

**Recommendation:** Reduce Card padding on mobile: `p-4 sm:p-6`.

---

#### 13. Breadcrumbs Take Space but Provide Value

**Severity:** MEDIUM  
**Affected:** All non-dashboard authenticated pages  
**File:** `src/components/layouts/AppShell.tsx:157-159`

Breadcrumbs render above page content on mobile. While they provide navigation context, they consume ~40px of vertical space and can wrap to multiple lines with deep hierarchies.

**Recommendation:** Consider truncating breadcrumbs on mobile (show only parent + current page).

---

#### 14. Rapid Assessment Form — Very Long Scrolling

**Severity:** MEDIUM  
**Affected:** `/assessor/rapid-assessments/new`, `/assessor/rapid-assessments/[id]/edit`  
**Evidence:** Full-page screenshot shows extensive vertical content

The rapid assessment form is extremely long on mobile (10+ sections). While the `FormCard` correctly stacks `grid-cols-1` on mobile, field workers must scroll extensively to complete the form. There's no progress indicator or section navigation.

**Recommendation:**
- Add a sticky section navigator or progress indicator
- Consider breaking the form into wizard steps on mobile
- Add a "Save Draft" capability for field workers who may be interrupted

---

#### 15. Card Padding Too Generous for Mobile

**Severity:** MEDIUM  
**Affected:** All pages using Card components  
**File:** `src/components/ui/card.tsx`

All Card sub-components use fixed `p-6` (24px) padding. On 320-375px screens, this consumes 48px of horizontal space (13-15% of viewport per side).

**Recommendation:** Change base padding to `p-4 sm:p-6` for CardHeader, CardContent, and CardFooter.

---

### LOW

#### 16. Dialog Content Can Overflow on Mobile

**Severity:** LOW  
**Affected:** All dialogs (notification settings, audit export, etc.)

Dialog components use `max-w-lg` which is wider than mobile viewports. While they do scale down, the content inside can be cramped, especially dialogs with form fields or multi-column layouts.

**Recommendation:** Ensure dialog content uses responsive layouts inside (`flex-col sm:flex-row`).

---

#### 17. RoleSwitcher Unclear on Mobile

**Severity:** LOW  
**Affected:** All authenticated pages  
**File:** `src/components/layouts/RoleSwitcher.tsx`

The RoleSwitcher component's visibility and behavior on mobile is unclear. Users with multiple roles need an accessible way to switch roles on mobile.

**Recommendation:** Ensure RoleSwitcher is visible and usable in the mobile toolbar or nav drawer.

---

#### 18. Footer Copyright Text Wraps

**Severity:** LOW  
**Affected:** All pages  
**File:** `src/components/shared/BrandedFooter.tsx`

The footer text "DRMS Borno — Disaster Response Management System" wraps to two lines on 375px screens. Minor, but slightly untidy.

**Recommendation:** Acceptable as-is, or reduce font size on mobile.

---

## Role-Specific Findings

### Admin
- **Dashboard:** Functional but table requires horizontal scroll (7 columns for recent users)
- **User Management:** DataTable with 6 columns — no mobile column hiding
- **Donor Management:** Card-based list with action buttons that overflow
- **System Settings:** Forms stack well (single column), but save/reset button clusters overflow
- **Audit Log:** Search + 3 filter buttons + pagination all overflow on mobile

### Coordinator
- **Dashboard:** Stat cards OK; tabs work; overview table needs horizontal scroll
- **Situation Dashboard:** Charts very cramped, nearly unreadable at 375px
- **Incidents:** Filter row takes excessive vertical space; table requires scroll
- **Verification Queue:** Action buttons (Verify/Reject) overflow card boundaries
- **Entity Management:** Card action buttons (View/Edit) overflow
- **Analytics:** Charts are the worst offender — bar charts and data grids unreadable
- **Resource Management:** DataTable overflow with no mobile adaptation
- **Settings (scoring, thresholds):** 3-button action bars overflow

### Assessor
- **Dashboard:** Clean, functional on mobile
- **Rapid Assessment Form:** Very long vertical scroll; FormCard grid correctly stacks to 1 column; no progress indicator
- **Rapid Assessment List:** DataTable with horizontal scroll

### Responder
- **Dashboard:** Stat cards OK; clean layout
- **Planning:** DataTable requires horizontal scroll; creation form has 3-button action bar that overflows
- **Responses:** DataTable requires horizontal scroll

### Donor
- **Dashboard:** Stat cards OK; leaderboard and performance CardTitle buttons overflow
- **Entities:** Card grid stacks to 1 column (good); action buttons in cards may overflow
- **Leaderboard:** 7-column table requires extensive horizontal scroll
- **Performance:** Charts cramped on mobile

---

## Root Cause Analysis

The core issue is that the application was built **desktop-first** with a pattern of `flex` + `justify-between` + `gap-*` that works well at 1024px+ but has no graceful degradation strategy for mobile. Specifically:

1. **No `flex-wrap` discipline:** Developers consistently use `flex` without `flex-wrap` for button clusters, assuming they'll fit. This works on desktop but breaks on mobile.

2. **No responsive padding:** The `p-6` default from shadcn/ui is never overridden for mobile, wasting precious horizontal space.

3. **No mobile-specific layouts for DataTable:** The table component is a desktop paradigm that needs a card-list alternative on mobile.

4. **Charts not mobile-aware:** Chart libraries (likely recharts) are configured with desktop dimensions and don't adapt.

5. **Header designed for desktop:** The header tries to fit everything in one row without a mobile-specific compact layout.

6. **Mobile toolbar incomplete:** The AppShell's mobile top bar was scaffolded but never finished — no branding, missing indicators, no role info.

---

## Recommended Priority Order

### Phase 1: Critical Fixes (Immediate) — ✅ COMPLETED June 16, 2026

**1. Header Overflow Fix** (`src/components/shared/Header.tsx`)
- Added `flex-wrap justify-end` to the right-side action cluster
- Reduced gap on mobile: `gap-2 sm:gap-4`
- Wrapped SyncIndicator and OfflineIndicator in `hidden sm:block` containers (hidden on < 640px)
- Logout button now renders icon-only on mobile (`sm:hidden` SVG), text on `sm+`
- Inner action gap reduced: `gap-2 sm:gap-3`
- **Result:** Header overflow eliminated — measured from +94px overflow to -16px (16px breathing room) at 375px viewport

**2. Card Button Cluster Sweep** (16 component files updated)
- `CardFooter` base class updated: `flex items-center flex-wrap gap-2 p-6 pt-0` (`src/components/ui/card.tsx`)
- Added `flex-wrap` to `justify-between` button containers in:
  - `ResponsePlanningForm.tsx` — submit buttons row
  - `AutoApprovalConfig.tsx` — bulk actions bar
  - `EnhancedAutoApprovalConfig.tsx` — bulk actions bar
  - `CommitmentStatusTracker.tsx` — status header actions
  - `AuditLogDashboard.tsx` — search/filter row + pagination
  - `ResponseVerificationQueue.tsx` — verify/reject buttons
  - `QueueFilters.tsx` — filter header
  - `FilterPanel.tsx` — filter header
  - `LocationSelector.tsx` — coordinate/action row
  - `ReportBuilder.tsx` — element toolbar
  - `DonorCommitmentImportForm.tsx` — dialog footer
  - `DonorDashboard.tsx` — leaderboard + performance card titles
  - `entity-incident-map/page.tsx` — incident selection header
  - `notifications/page.tsx` — settings action bar
  - `scoring/page.tsx` — settings action bar

**3. FormActionBar** (`src/components/shared/FormActionBar.tsx`)
- Added `flex-wrap` to base class: `flex flex-wrap gap-3 pt-6`

**Verification:** `tsc --noEmit` passes clean, `next lint` produces zero new warnings.

### Phase 2: High-Impact Improvements — ✅ COMPLETED June 16, 2026

**4. Mobile Branding + Status Indicators (Issues 3, 4, 5)** (`src/components/layouts/AppShell.tsx`)
- Added app name + icon to mobile top bar `flex-1` area
- Added compact SyncIndicator to mobile top bar (visible on all breakpoints)
- Mobile drawer now shows app branding header with icon + name (matching desktop sidebar)
- Added SyncIndicator + OfflineIndicator at bottom of mobile drawer

**5. Body Scroll Lock for Mobile Drawer (Issue 6)** (`src/components/layouts/AppShell.tsx`)
- Added `useEffect` that sets `document.body.style.overflow = 'hidden'` when `sidebarOpen` is true
- Restores overflow to `''` on cleanup (drawer close or unmount)

**6. DataTable Responsive Column Hiding (Issue 7)** (`src/components/shared/DataTable.tsx` + 8 consumer files)
- `hideOnMobile` property on `ColumnDef` already existed; applied it to low-priority columns across:
  - `admin/donors/page.tsx` — Contact, Activity columns hidden on mobile
  - `coordinator/donors/page.tsx` — Contact, Activity columns hidden on mobile
  - `admin/users/page.tsx` + `pageV2.tsx` — Email, Joined columns hidden on mobile
  - `coordinator/IncidentManagement.tsx` — Population Impact, Linked Assessments hidden on mobile
  - `coordinator/verification/deliveries/page.tsx` — Responder, Type, Location hidden on mobile
  - `roles/page.tsx` — Description, Permissions, Created hidden on mobile
  - `coordinator/entities/page.tsx` — Organization, Entity Type, Location, Assigned Date hidden on mobile (3 tab tables)
- Improved PaginationBar: stacks vertically on mobile (`flex-col sm:flex-row`), uses windowed page buttons (max 5 around current page), smaller buttons on mobile (`h-8 w-8 sm:h-9 sm:w-9`)

**7. Filter Panels Collapsible on Mobile (Issue 9)** (5 files)
- **FilterPanel** (`src/components/shared/FilterPanel.tsx`): CardContent collapses on mobile via ChevronDown toggle; always expanded on `md+`
- **QueueFilters** (`src/components/verification/QueueFilters.tsx`): Same collapsible pattern
- **IncidentManagement** (`src/components/coordinator/IncidentManagement.tsx`): Filter card collapses on mobile
- **Delivery Verification** (`src/app/(auth)/coordinator/verification/deliveries/page.tsx`): Filter card collapses on mobile
- **Entity Management** (`src/app/(auth)/coordinator/entity-management/page.tsx`): Filter card collapses on mobile
- Pattern: collapsed by default on mobile, expanded by default on desktop (`md:hidden` chevron, `hidden md:block` fallback)

**Verification:** `tsc --noEmit` passes clean, `next lint` produces zero new warnings.

### Phase 3: Polish — ✅ COMPLETED June 16, 2026

**8. Reduce Card Padding on Mobile (Issue 15)** (`src/components/ui/card.tsx`)
- `CardHeader`: `p-6` → `p-4 sm:p-6`
- `CardContent`: `p-6 pt-0` → `p-4 pt-0 sm:p-6 sm:pt-0`
- `CardFooter`: `p-6 pt-0` → `p-4 pt-0 sm:p-6 sm:pt-0`
- Saves 16px of horizontal space per side (32px total) on 320–375px screens

**9. DataTable Pagination Overflow (Issue 10)** — Already completed in Phase 2
- Windowed page buttons (max 5 around current page), vertical stacking on mobile, smaller button sizes

**10. Optimize Charts for Mobile (Issue 8)** (10 chart component files updated)
- Applied responsive height classes to all chart container divs:
  - Chart wrappers: `h-80` → `h-64 sm:h-80`, `h-72` → `h-56 sm:h-72`
  - Empty-state placeholders: `h-64` → `h-48 sm:h-64`
  - Skeleton loaders: `h-64` → `h-48 sm:h-64`
  - Scrollable data containers: `max-h-64` → `max-h-48 sm:max-h-64`
- Files updated:
  - `VolumeOverTimeChart.tsx`, `ResolutionVelocityChart.tsx`, `GapRadarChart.tsx`
  - `PriorityDistributionChart.tsx`, `PopulationImpactCharts.tsx`
  - `AfterActionWidgets.tsx`, `ResourcePipelineCharts.tsx`, `VerificationThroughputChart.tsx`
  - `DonorPerformanceDashboard.tsx`, `PeerComparison.tsx`

**11. Truncate Breadcrumbs on Mobile (Issue 13)** (`src/components/shared/Breadcrumbs.tsx`)
- On mobile (under `sm`): hides middle breadcrumb items, shows `…` ellipsis between Home and current page
- On desktop (`sm+`): shows full breadcrumb trail as before
- Current page name gets `truncate` to prevent overflow with long titles
- Deep hierarchies (3+ levels) collapse to: `Home › … › Current Page`

**12. Progress Indicator for Long Assessment Forms (Issue 14)** (New component + HealthAssessmentForm exemplar)
- Created `SectionProgress` component (`src/components/shared/SectionProgress.tsx`):
  - Sticky top bar, mobile-only (`md:hidden`)
  - Numbered circle buttons for each form section (tap to scroll)
  - Active section highlighted, completed sections show checkmark
  - Progress bar fills as user scrolls through sections
  - Percentage indicator
  - Uses IntersectionObserver to track scroll position
- Integrated into `HealthAssessmentForm.tsx` as the reference pattern:
  - Added `id` attributes to each Card section
  - Renders `<SectionProgress>` above `<StickyFormHeader>`
  - Other rapid assessment forms can follow the same pattern

**13. Save Draft for Rapid Assessment Forms (Issue 14b)** (New hook + HealthAssessmentForm exemplar)
- Created `useRapidAssessmentDrafts` hook (`src/hooks/useRapidAssessmentDrafts.ts`):
  - localStorage-based persistence (same pattern as PreliminaryAssessmentForm)
  - `saveDraft()` — manual save with form data, entity ID, incident ID
  - Auto-save effect — saves every 30 seconds when form is dirty
  - Stores up to 5 drafts per assessment type
  - `loadDraft()`, `deleteDraft()`, `clearCurrentDraft()` methods
- Integrated into `HealthAssessmentForm.tsx`:
  - Save Draft button with Save icon (placed before Submit in FormActionBar)
  - Auto-save runs every 30s when form is dirty and not disabled
  - "Draft saved successfully" feedback message (auto-dismisses after 2s)
  - Draft count indicator when drafts exist

**Verification:** `tsc --noEmit` passes clean, `next lint` produces zero new warnings.

---

## Implementation Status Summary

| Phase | Status | Issues Addressed |
|-------|--------|-----------------|
| Phase 1: Critical Fixes | ✅ COMPLETED | Issues 1, 2 (Header overflow, Card button clusters, FormActionBar) |
| Phase 2: High-Impact | ✅ COMPLETED | Issues 3, 4, 5, 6, 7, 9 (Mobile branding, scroll lock, DataTable columns, collapsible filters) |
| Phase 3: Polish | ✅ COMPLETED | Issues 8, 10, 13, 14, 15 (Card padding, charts, breadcrumbs, progress indicator, Save Draft) |

### Remaining Items (Low Priority — Not Blocking)
- Issue 16: Dialog content can overflow on mobile (LOW — acceptable as-is)
- Issue 17: RoleSwitcher unclear on mobile (LOW — needs design review)
- Issue 18: Footer copyright text wraps (LOW — acceptable as-is)
- Roll out SectionProgress + Save Draft pattern to remaining 5 rapid assessment forms (Food, WASH, Shelter, Security, Population)

---

## Appendix: Files Requiring Changes

| File | Issue |
|------|-------|
| `src/components/shared/Header.tsx` | Header overflow, no flex-wrap, no responsive gap |
| `src/components/ui/card.tsx` | Fixed p-6 padding, CardFooter no flex-wrap |
| `src/components/shared/FormActionBar.tsx` | No flex-wrap |
| `src/components/shared/DataTable.tsx` | No responsive columns, pagination overflow |
| `src/components/layouts/AppShell.tsx` | Missing branding in mobile toolbar, no scroll lock, SyncIndicator hidden |
| `src/components/forms/response/ResponsePlanningForm.tsx:866` | 3 buttons with min-w, no flex-wrap |
| `src/components/verification/AutoApprovalConfig.tsx:317` | 4 elements in justify-between, no flex-wrap |
| `src/components/verification/EnhancedAutoApprovalConfig.tsx:514` | Same pattern |
| `src/components/donor/CommitmentStatusTracker.tsx:183` | Badge + 2 buttons, no flex-wrap |
| `src/app/(auth)/admin/settings/notifications/page.tsx:389` | 3 buttons, no flex-wrap |
| `src/app/(auth)/coordinator/settings/scoring/page.tsx:216` | 3 buttons, no flex-wrap |
| `src/components/dashboards/admin/AuditLogDashboard.tsx:292,491` | Search + 3 buttons; pagination overflow |
| `src/components/dashboards/crisis/ResponseVerificationQueue.tsx:431` | 2 long-label buttons, no flex-wrap |
| `src/components/donor/DonorDashboard.tsx:532,601` | CardTitle with justify-between + button |
| `src/components/forms/LocationSelector.tsx:85` | Coordinates + 2 buttons, no flex-wrap |
| `src/components/reports/builder/ReportBuilder.tsx:691` | 3 conditional buttons, no flex-wrap |
| `src/components/shared/FilterPanel.tsx:608` | Title + 2 buttons, no flex-wrap |
| `src/components/verification/QueueFilters.tsx:172` | Title + 2 buttons, no flex-wrap |
| `src/app/(auth)/coordinator/entity-incident-map/page.tsx:162` | Variable buttons in CardHeader |
