# Design System Unification Plan

**Date:** 2026-05-22
**Owner:** Sally (UX Designer)
**Source Audit:** `docs/reports/design-consistency-audit.html`
**Overall Audit Grade:** D+
**Target Grade:** A-
**Status:** PLANNED

---

## Context

The previous UX remediation plan (`ux-remediation-plan.md`) is **fully complete** — it fixed auth bugs, navigation, accessibility, dark mode, and visual consistency at the tactical level. This plan addresses the deeper structural problem: the codebase has no unified design system. Components are defined locally, copy-pasted with slight variations, and styled with ad-hoc Tailwind classes that differ between files.

The audit found:
- **16 metric card variations** where 1 variant-driven component would do
- **9 data list/table patterns** with no shared wrapper
- **6 filter variations** with different toggle mechanisms
- **10 form variations** mixing raw Label/Input and shadcn FormField
- **Severity color maps duplicated 6+ times** across files
- **LLM tell-tale signs**: inconsistent naming (MetricCard vs KpiCard), slight structural differences in copy-pasted components

## Design Principles

These principles govern every decision in this plan:

1. **Composable over monolithic** — Follow shadcn/ui's pattern: small, composable sub-components (like Card > CardHeader > CardTitle) rather than one component with 20 props. This keeps the API surface small and the output natural.

2. **Variant-driven, not prop-driven** — Use `cva` (class-variance-authority) for named variants rather than boolean props that toggle styles. A `<StatCard variant="colored" severity="critical">` is better than `<StatCard colored={true} borderColor="red" bgColor="red">`.

3. **Centralized color intelligence** — All status/severity/priority color logic lives in `src/lib/utils/status-colors.ts`. Components never hardcode `bg-red-100 text-red-800` inline — they call a function or reference a token.

4. **Dark mode by default** — Every new component supports dark mode from day one. We use CSS variable tokens and the `dark:` Tailwind variant, not hardcoded color pairs.

5. **One canonical version per component type** — No local MetricCard definitions. No inline card patterns. One shared component in `src/components/shared/` that handles all legitimate use-case differences through variants and composition.

6. **Grounded in the existing stack** — We extend shadcn/ui primitives, not replace them. We use the existing `cn()` utility, the existing `priority-colors.ts` (expanded), and the existing `EmptyState.tsx` (kept as-is).

---

## Dependency Graph

```
Phase 0: Foundation Tokens & Utilities
  |-- Step 0.1: Expand status-colors.ts into unified color system
  |-- Step 0.2: Add CSS custom properties for semantic status colors
  \-- Step 0.3: Create design token constants
      (ALL Phase 0 is a BLOCKER for Phases 1-4)

Phase 1: StatCard Component Family
  |-- Step 1.1: Design StatCard spec (present for review)
  |-- Step 1.2: Implement StatCard with variants
  |-- Step 1.3: Implement StatCardGrid layout helper
  \-- Step 1.4: Migrate all 16 metric card instances to StatCard
      (depends on Phase 0)

Phase 2: StatusBadge & Badge System
  |-- Step 2.1: Design StatusBadge spec (present for review)
  |-- Step 2.2: Implement StatusBadge with severity/status variants
  \-- Step 2.3: Migrate all inline badge color maps to StatusBadge
      (depends on Phase 0)

Phase 3: DataList Component Family
  |-- Step 3.1: Design DataList spec (present for review)
  |-- Step 3.2: Implement DataTable wrapper (table mode)
  |-- Step 3.3: Implement DataCardList wrapper (card mode)
  |-- Step 3.4: Implement DataCardGrid wrapper (grid mode)
  \-- Step 3.5: Migrate all list/table instances
      (depends on Phases 0, 2)

Phase 4: FilterPanel Component Family
  |-- Step 4.1: Design FilterPanel spec (present for review)
  |-- Step 4.2: Implement FilterPanel with collapsible advanced
  |-- Step 4.3: Implement FilterBar (inline compact variant)
  \-- Step 4.4: Migrate all filter instances
      (depends on Phases 0, 2)

Phase 5: FormCard Component Family
  |-- Step 5.1: Design FormCard spec (present for review)
  |-- Step 5.2: Implement FormCard with standard action bar
  |-- Step 5.3: Standardize form field approach (pick one)
  \-- Step 5.4: Migrate all form instances
      (depends on Phase 0)

Phase 6: Loading & Error State Unification
  |-- Step 6.1: Design LoadingState spec
  |-- Step 6.2: Expand SafeDataLoader to use unified states
  \-- Step 6.3: Migrate all ad-hoc loading/error patterns
      (depends on Phases 0, 1, 2)

Phase 7: Toast System Consolidation
  |-- Step 7.1: Remove Radix toast, keep Sonner
  \-- Step 7.2: Migrate all toast calls to Sonner
      (independent)

Phase 8: Chart Standardization
  |-- Step 8.1: Standardize on Chart.js (already in use for PeerComparison)
  |-- Step 8.2: Create shared chart color tokens
  \-- Step 8.3: Migrate custom CSS bar charts
      (depends on Phase 0)
```

---

## Phase 0: Foundation — Tokens & Utilities

> **Status:** NOT STARTED
> **Risk:** LOW — additive only, no existing code changes
> **Files to create/modify:**
> - `src/lib/utils/status-colors.ts` (expand existing `priority-colors.ts`)
> - `src/app/globals.css` (add semantic CSS variables)

### Step 0.1: Unified Status Color System

**Current state:** `priority-colors.ts` has some color maps but they're incomplete and inconsistent. Some use `/10` opacity pattern, others use `-100` solid backgrounds. No single system covers all DRMS status domains.

**Target:** A single color utility that every component references for status/priority/severity colors. Structured as domain-specific maps plus a generic semantic map.

The utility will export:
- `severityColors` — maps CRITICAL/HIGH/MEDIUM/LOW to bg/text/border classes (dark mode aware)
- `verificationStatusColors` — maps VERIFIED/REJECTED/SUBMITTED/AUTO_VERIFIED/DRAFT
- `responseStatusColors` — maps PLANNED/IN_PROGRESS/COMPLETED/CANCELLED
- `commitmentStatusColors` — maps PLANNED/PARTIAL/COMPLETE/CANCELLED
- `incidentStatusColors` — maps ACTIVE/CONTAINED/RESOLVED
- `systemStatusColors` — maps ONLINE/OFFLINE/SYNCING/ERROR
- Semantic aliases: `statusColors.success`, `statusColors.warning`, `statusColors.error`, `statusColors.info`, `statusColors.neutral`
- Helper functions: `getSeverityClasses(level)`, `getStatusClasses(domain, status)`

**Color system rules:**
- Badge backgrounds: `{color}-500/10` (10% opacity) — subtle, not overwhelming
- Badge text: `{color}-700` light / `{color}-400` dark — high contrast, readable
- Badge border: `{color}-500/20` (20% opacity) — visible but not heavy
- Card tinted backgrounds: `{color}-500/5` (5% opacity) — barely there tint
- Card borders: `{color}-500/15` (15% opacity) — subtle edge
- Icon colors: `{color}-600` light / `{color}-400` dark — clear, not neon

This creates a **tiered intensity** system: badge > card > background, with consistent opacity ratios.

### Step 0.2: CSS Custom Properties for Status Colors

Add to `globals.css` `:root` block:

```css
--status-critical: 0 84% 60%;
--status-critical-foreground: 0 84% 98%;
--status-high: 25 95% 53%;
--status-high-foreground: 25 95% 98%;
--status-medium: 45 93% 47%;
--status-medium-foreground: 45 93% 98%;
--status-low: 142 71% 45%;
--status-low-foreground: 142 71% 98%;
```

Plus dark mode variants. These tokens let us use `hsl(var(--status-critical))` in CSS where Tailwind classes don't reach.

### Step 0.3: Design Token Constants

A constants file with spacing/sizing rules for consistent component sizing:

```typescript
// src/lib/utils/design-tokens.ts
export const ICON_SIZE = { xs: 'h-3 w-3', sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6', xl: 'h-8 w-8' } as const;
export const STAT_VALUE_SIZE = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' } as const;
export const CARD_PADDING = { sm: 'p-3', md: 'p-4', lg: 'p-6' } as const;
export const GRID_GAP = { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' } as const;
export const GRID_COLS = { 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' } as const;
```

This ensures components use the same sizing vocabulary.

---

## Phase 1: StatCard Component Family

> **Status:** NOT STARTED
> **Audit finding:** 16 variations, Grade F
> **Risk:** MEDIUM — replacing components across 15+ files
> **Files to create:**
> - `src/components/shared/StatCard.tsx`
> - `src/components/shared/StatCardGrid.tsx`

### Step 1.1: StatCard Design Spec (Present for Review)

The spec will define:

**Component:** `<StatCard>`

A composable stat card with these sub-components:
- `<StatCard>` — outer container, handles variant styling
- `<StatCardHeader>` — icon + title row
- `<StatCardValue>` — the big number
- `<StatCardDescription>` — optional subtitle
- `<StatCardTrend>` — optional trend indicator

**Variants (via `cva`):**

| Variant | Description | Use Cases |
|---------|-------------|-----------|
| `default` | White bg, no tint, icon right | Admin dashboard, generic metrics |
| `tinted` | Subtle colored bg tint + border | Verification queue, status-aware metrics |
| `compact` | Smaller padding, smaller value font | Inline within panels, sidebars |
| `centered` | Centered text, value above label | Peer comparison, leaderboard |

**Props per sub-component:**
- `StatCard` — `variant`, `severity` (auto-applies color to tinted variant), `loading`, `className`
- `StatCardHeader` — `icon`, `iconClassName`, `title`, `severity` (colored icon option)
- `StatCardValue` — `children` (formatted value), `className` (for color overrides)
- `StatCardDescription` — `children`
- `StatCardTrend` — `direction` (up/down/neutral), `value`, `label`

**Layout helper:** `<StatCardGrid>` — `columns` (2|3|4), `gap` (sm|md|lg)

**Coverage of existing variations:**

| Existing Variation | StatCard Equivalent |
|---|---|
| V1 Admin MetricCard | `<StatCard variant="default">` |
| V2 Donor MetricCard | `<StatCard variant="default">` (same as V1) |
| V3 Verification colored | `<StatCard variant="tinted" severity="amber">` |
| V5 KpiCard with trend | `<StatCard variant="default">` + `<StatCardTrend>` |
| V6 Home Dashboard | `<StatCard variant="tinted" severity="green">` (with dark mode) |
| V7 Coordinator CardHeader | `<StatCard variant="default">` + `<StatCardHeader>` |
| V9 Icon before title | `<StatCardHeader icon={Clock} iconPosition="left">` |
| V13 Centered | `<StatCard variant="centered">` |
| V14 AggregateMetrics | `<StatCard variant="compact">` + `<StatCardTrend>` |

### Step 1.2: Implement StatCard

Build the component following the approved spec. Uses `cva` for variants, `cn()` for className merging, lucide-react for icons. All sizes reference `design-tokens.ts` constants.

### Step 1.3: Implement StatCardGrid

Simple layout helper:
```tsx
<StatCardGrid columns={4}>
  <StatCard>...</StatCard>
  <StatCard>...</StatCard>
  <StatCard>...</StatCard>
  <StatCard>...</StatCard>
</StatCardGrid>
```

### Step 1.4: Migrate All 16 Metric Card Instances

Files to migrate (delete local MetricCard/KpiCard definitions, replace with shared imports):

1. `src/app/(auth)/admin/dashboard/page.tsx` — delete MetricCard (lines 446-471)
2. `src/components/donor/DonorDashboard.tsx` — delete MetricCard (lines 667-692)
3. `src/components/verification/VerificationDashboard.tsx` — delete MetricCard (lines 381-415), migrate performance cards (lines 114-157)
4. `src/components/verification/EnhancedVerificationDashboard.tsx` — delete MetricCard (lines 594-628)
5. `src/components/verification/VerificationAnalytics.tsx` — delete KpiCard (lines 343-400), migrate inline stats (lines 565-584)
6. `src/app/(auth)/dashboard/page.tsx` — migrate inline cards (lines 171-231)
7. `src/app/(auth)/coordinator/dashboard/page.tsx` — migrate CardHeader cards (lines 135-214)
8. `src/components/donor/GapAnalysis.tsx` — migrate cards (lines 166-222)
9. `src/components/dashboards/crisis/VerificationQueueManagement.tsx` — migrate cards (lines 159-221)
10. `src/components/verification/AutoApprovalConfig.tsx` — migrate inline cards (lines 277-330)
11. `src/components/verification/EnhancedAutoApprovalConfig.tsx` — migrate inline cards (lines 455-510)
12. `src/components/dashboards/crisis/DonorMetricsDashboard.tsx` — delete MetricCard (lines 416-442)
13. `src/components/donor/PeerComparison.tsx` — migrate centered cards (lines 284-300)
14. `src/components/dashboards/situation/components/AggregateMetrics.tsx` — migrate operational cards (lines 231-335)

**Validation:**
- Every dashboard page renders identically to before (visual comparison)
- No local MetricCard/KpiCard definitions remain in any file
- Dark mode works on all StatCard instances
- Loading state works on all StatCard instances that previously had it

---

## Phase 2: StatusBadge & Badge System

> **Status:** NOT STARTED
> **Audit finding:** 4 approaches, Grade C-
> **Risk:** LOW — mostly replacing inline className patterns
> **Files to create:**
> - `src/components/shared/StatusBadge.tsx`

### Step 2.1: StatusBadge Design Spec (Present for Review)

**Component:** `<StatusBadge>`

A thin wrapper over shadcn `<Badge>` that centralizes all status color logic.

**Props:**
- `status` — the status string (e.g., "VERIFIED", "CRITICAL", "ACTIVE")
- `domain` — which color map to use: `severity` | `verification` | `response` | `commitment` | `incident` | `system`
- `variant` — `badge` (default, filled bg) | `dot` (colored dot + text) | `outline` (border only)
- `icon` — optional icon component
- `size` — `sm` | `default`

**Example usage:**
```tsx
<StatusBadge status="CRITICAL" domain="severity" />
<StatusBadge status="VERIFIED" domain="verification" icon={CheckCircle} />
<StatusBadge status="ACTIVE" domain="incident" variant="dot" />
```

This replaces every inline `cn(status === 'VERIFIED' && 'bg-green-100 text-green-800')` pattern.

### Step 2.2: Implement StatusBadge

Build the component. Color resolution comes from `status-colors.ts`.

### Step 2.3: Migrate All Inline Badge Colors

Search for all inline badge color patterns:
- `bg-red-100 text-red-800` style patterns in Badge className
- `getStatusColor()` helper functions (inline in components)
- `severityColors` local objects

Replace with `<StatusBadge>` imports. Estimated 30+ occurrences across 15+ files.

---

## Phase 3: DataList Component Family

> **Status:** NOT STARTED
> **Audit finding:** 9 patterns, Grade D
> **Risk:** MEDIUM-HIGH — structural changes to data display components
> **Files to create:**
> - `src/components/shared/DataTable.tsx` (wrapper over shadcn Table)
> - `src/components/shared/DataCardList.tsx` (card-based list)
> - `src/components/shared/DataCardGrid.tsx` (grid of cards)

### Step 3.1: DataList Design Spec (Present for Review)

Three layout modes, one consistent approach to actions, status, empty states, and loading.

**DataTable** — wraps shadcn `<Table>` with:
- Standard column header styling
- Row action pattern (DropdownMenu by default)
- Empty state (uses shared EmptyState)
- Loading state (skeleton rows)
- Selection state (selected row highlight)

**DataCardList** — stack of cards with:
- Consistent card styling (`border rounded-lg p-4`)
- Expand/collapse pattern
- Action buttons (inline or dropdown)
- Empty/loading states

**DataCardGrid** — grid of cards with:
- Column config (2|3|4|5)
- Click-to-select pattern
- Selected state styling
- Empty/loading states

### Step 3.2-3.5: Implement & Migrate

Files to migrate:
- `src/app/(auth)/roles/page.tsx` — table
- `src/app/(auth)/admin/users/page.tsx` — table
- `src/components/coordinator/IncidentManagement.tsx` — table with expand
- `src/components/settings/GapFieldTable.tsx` — raw HTML table → DataTable
- `src/components/verification/VerificationQueue.tsx` — card list
- `src/components/donor/CommitmentDashboard.tsx` — card list
- `src/components/verification/ConfigurationAuditHistory.tsx` — card list
- `src/components/settings/SeverityThresholdTable.tsx` — config cards
- `src/components/donor/EntityInsightsCards.tsx` — card grid
- `src/components/dashboards/situation/executive/ExecutiveIncidentsTable.tsx` — card grid
- `src/components/donor/LeaderboardDisplay.tsx` — leaderboard rows
- `src/components/donor/PeerComparison.tsx` — metric rows
- `src/app/(auth)/system/database/page.tsx` — 2 tables

---

## Phase 4: FilterPanel Component Family

> **Status:** NOT STARTED
> **Audit finding:** 6 variations, Grade D+
> **Files to create:**
> - `src/components/shared/FilterPanel.tsx`
> - `src/components/shared/FilterBar.tsx`

### Step 4.1: FilterPanel Design Spec (Present for Review)

Two variants:

**FilterPanel** — full filter card with:
- Search input (with icon)
- Filter groups (checkboxes or toggle buttons — pick one canonical approach)
- Date range inputs
- Collapsible "Advanced" section
- Preset quick filters
- Active filter summary
- Reset/Apply actions

**FilterBar** — compact single-row variant:
- Search input + dropdowns in a horizontal flex row
- For simpler pages (Users, Roles)

### Step 4.2-4.4: Implement & Migrate

Files to migrate:
- `src/components/verification/QueueFilters.tsx` → FilterPanel
- `src/components/dashboards/situation/components/AdvancedFilters.tsx` → FilterPanel
- `src/app/(auth)/admin/users/page.tsx` → FilterBar
- Situational selectors (IncidentSelector, EntitySelector) — keep as-is, they're comboboxes not filter panels

---

## Phase 5: FormCard Component Family

> **Status:** NOT STARTED
> **Audit finding:** 10 variations, Grade D+
> **Files to create:**
> - `src/components/shared/FormCard.tsx`
> - `src/components/shared/FormActionBar.tsx`

### Step 5.1: FormCard Design Spec (Present for Review)

**FormCard** — wraps the standard form layout:
- Card container with title + description in CardHeader
- Standardized field spacing (`space-y-6`)
- `<FormActionBar>` — standardized action buttons:
  - `justify-end` alignment
  - Cancel (outline) + Submit (primary) pattern
  - Optional border-t separator
  - Loading state on submit button

**Form field standardization decision:**
- Pick **shadcn FormField** approach (it's the more structured option)
- All new forms use `<Form>` + `<FormField>` + `<FormItem>` + `<FormLabel>` + `<FormMessage>`
- Gradually migrate raw Label/Input forms during form updates

### Step 5.2-5.4: Implement & Migrate

Files to migrate:
- All 10 form components listed in the audit
- Priority: forms that already use shadcn FormField (minimal changes)
- Lower priority: forms using raw Label/Input (larger refactor)

---

## Phase 6: Loading & Error State Unification

> **Status:** NOT STARTED
> **Files to modify:**
> - `src/components/shared/SafeDataLoader.tsx` (expand)
> - All components with ad-hoc loading/error patterns

Standardize on:
- **Loading:** `<SafeDataLoader>` for data-fetching components, `<Skeleton>` for inline card loading
- **Error:** `<Alert variant="destructive">` with retry button
- **Empty:** `<EmptyState>` (already shared)

Remove all `animate-pulse` inline skeleton divs and `Loader2` spinner patterns in favor of the shared approach.

---

## Phase 7: Toast System Consolidation

> **Status:** NOT STARTED
> **Risk:** LOW

Remove Radix toast system, keep Sonner. Migrate any remaining `useToast()` calls to `toast()` from sonner.

Files:
- Delete `src/components/ui/toast.tsx`, `toaster.tsx`, `use-toast.ts`
- Search for `from '@/components/ui/use-toast'` imports → replace with `from 'sonner'`
- Remove `<Toaster />` from layout if it references the radix toaster

---

## Phase 8: Chart Standardization

> **Status:** NOT STARTED

Standardize on Chart.js (already used by PeerComparison).
- Migrate custom CSS bar charts in VerificationAnalytics to Chart.js
- Create shared chart color tokens that reference the design system colors
- Wrap chart options in a shared config utility

---

## Execution Order

```
Week 1: Phase 0 (Foundation) + Phase 7 (Toast — quick win, independent)
  Day 1-2: Step 0.1-0.3 (status-colors, CSS tokens, design tokens)
  Day 3: Phase 7 (remove Radix toast, migrate to Sonner)
  Day 4-5: Review and testing

Week 2: Phase 1 (StatCard) + Phase 2 (StatusBadge)
  Day 1: Step 1.1 (design spec — present to Bilnigma for review)
  Day 2: Step 1.2-1.3 (implement StatCard + StatCardGrid)
  Day 3: Step 2.1 (design spec — present to Bilnigma for review)
  Day 4: Step 2.2 (implement StatusBadge)
  Day 5: Steps 1.4 + 2.3 (begin migration)

Week 3: Phase 1-2 migration continues + Phase 3 begins
  Day 1-2: Complete StatCard + StatusBadge migration
  Day 3: Step 3.1 (DataList design spec — present for review)
  Day 4-5: Steps 3.2-3.3 (implement DataTable + DataCardList)

Week 4: Phase 3 migration + Phase 4 begins
  Day 1-3: Step 3.5 (migrate all list/table instances)
  Day 4: Step 4.1 (FilterPanel design spec — present for review)
  Day 5: Steps 4.2-4.3 (implement FilterPanel + FilterBar)

Week 5: Phase 5 (FormCard) + Phase 6 (Loading/Error)
  Day 1: Step 5.1 (FormCard design spec — present for review)
  Day 2-3: Steps 5.2-5.4 (implement and migrate forms)
  Day 4-5: Phase 6 (loading/error unification)

Week 6: Phase 8 (Charts) + Final validation
  Day 1-2: Chart standardization
  Day 3-5: Full regression testing, visual audit, accessibility testing
```

---

## Design Spec Methodology (Phase 3+)

Starting from Phase 3, every component design spec follows this process:

1. **Research first** -- Study established UI patterns from authoritative design systems (Material Design, Ant Design, Carbon, Apple HIG, Salesforce Lightning, NN/g) and domain-specific patterns (disaster management, humanitarian ops, logistics). Do NOT derive variants from what currently exists in the codebase.

2. **Principles then variants** -- Define the UX principles that govern variant selection (information density, user task, interaction pattern, role context). Then derive component variants from those principles.

3. **Variant selection logic** -- Propose a clear, rule-based decision framework for which variant to use in which context. This logic is applied to the DRMS pages to produce the mapping, not the other way around.

4. **Cohesive visual design** -- All variants must share a unified visual language derived from the actual shadcn/ui component source in `src/components/ui/`. Research the Tailwind classes used by shadcn primitives (Card, Table, Badge, Input, Select, Skeleton, Button) and reproduce those exact patterns in the HTML spec. Every variant must look like it belongs to the same design system -- same border-radius (`rounded-lg` / `rounded-md`), same shadow depth (`shadow-sm`), same font sizes (`text-sm` body, `text-xs` labels, `text-2xl font-semibold` titles), same spacing (`p-4` / `p-6`), same color tokens (HSL CSS variables: `hsl(var(--background))`, `hsl(var(--muted))`, etc.), same border colors (`hsl(var(--border))`), same interactive states (`hover:bg-muted/50`). Do NOT invent ad-hoc CSS classes or import external design system styles. The spec's CSS must replicate what Tailwind generates from our `globals.css` tokens so the mockups are pixel-accurate previews of the final implementation.

5. **HTML visual spec** -- Create an HTML file at `docs/design-system/` with CSS-rendered mockups of all variants, showing real DRMS data examples. The spec must include:
   - The research sources and principles
   - The variant selection logic (flowchart or decision tree)
   - Visual mockups of each variant using cohesive shadcn/tailwind styling (see point 4)
   - The proposed page-to-variant mapping with rationale
   - Component API (props, sub-components)

6. **Review gate** -- Bilnigma reviews the spec, accepts or adjusts. Only then does implementation begin.

This ensures we build a design system grounded in UX best practices with a cohesive visual identity, not a codification of existing inconsistencies or a collection of mismatched styles.

---

## Review Checkpoints

Each "present for review" step is a hard gate. The design spec methodology (above) applies to all phases from Phase 3 onward. The review documents will be saved to `docs/design-system/` as HTML files.

---

## Success Criteria

After all phases are complete:

- [ ] Zero local MetricCard/KpiCard definitions — all use `<StatCard>`
- [ ] Zero inline badge color maps — all use `<StatusBadge>`
- [ ] Zero raw HTML `<table>` for data — all use `<DataTable>` or shadcn `<Table>`
- [ ] Zero duplicate filter panels — all use `<FilterPanel>` or `<FilterBar>`
- [ ] All forms use `<FormCard>` with `<FormActionBar>`
- [ ] Severity/status colors defined in exactly 1 file (`status-colors.ts`)
- [ ] One toast system (Sonner only)
- [ ] Dark mode works on every component
- [ ] `npm run build` succeeds
- [ ] Visual regression: every page looks the same or better than before
- [ ] Target audit grade: A-

---

## File Map — New Files to Create

```
src/lib/utils/status-colors.ts          (expand from priority-colors.ts)
src/lib/utils/design-tokens.ts          (new)
src/components/shared/StatCard.tsx      (new)
src/components/shared/StatCardGrid.tsx  (new)
src/components/shared/StatusBadge.tsx   (new)
src/components/shared/DataTable.tsx     (new)
src/components/shared/DataCardList.tsx  (new)
src/components/shared/DataCardGrid.tsx  (new)
src/components/shared/FilterPanel.tsx   (new)
src/components/shared/FilterBar.tsx     (new)
src/components/shared/FormCard.tsx      (new)
src/components/shared/FormActionBar.tsx (new)
docs/design-system/                     (directory for review specs)
```

## File Map — Files to Delete

```
src/components/ui/toast.tsx             (Phase 7)
src/components/ui/toaster.tsx           (Phase 7)
src/components/ui/use-toast.ts          (Phase 7)
```

## File Map — Files to Modify (Migration)

~45 component/page files across Phases 1-6. Each will have local component definitions removed and imports added from `@/components/shared/`.

---

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Foundation | COMPLETE | status-colors.ts expanded, severity color maps added |
| Phase 1: StatCard | COMPLETE | StatCard + StatCardGrid built, 36 files migrated |
| Phase 2: StatusBadge | COMPLETE | StatusBadge component built, 20 files migrated, 7 domains |
| Phase 3: DataList | PARTIAL | Steps 3.1-3.4 complete. Migrated roles/page.tsx, GapFieldTable.tsx. Deferred complex migrations (IncidentManagement, VerificationQueue, etc.) — already use shadcn Table, low ROI |
| Phase 4: FilterPanel | COMPLETE | FilterPanel + FilterBar + useFilters hook + QueueFiltersV2 built. Migrated admin/users (FilterBar), coordinator/verification Assessment+Response tabs (FilterPanel with QueueFiltersV2). Standardized both verification tabs to use unified filter system |
| Phase 5: FormCard | COMPLETE | FormCard + FormActionBar components built. 20 forms migrated (5 initial + 6 assessment + 9 response/delivery/profile/edit). Spec: `docs/design-system/formcard-spec.html` |
| Phase 6: Loading/Error | COMPLETE | ContentSkeleton (5 variants) + ErrorAlert components built. Enhanced error.tsx boundaries with shadcn Button. 23 files migrated from animate-pulse. All remaining animate-pulse are legitimate inline indicators. Spec: `docs/design-system/loading-error-spec.html` |
| Phase 7: Toast | COMPLETE | Standardized on Sonner. Migrated 2 Radix files (roles, donor/reports), deleted 3 Radix toast files, updated layout.tsx. Spec: `docs/design-system/toast-system-spec.html` |
| Phase 8: Charts | COMPLETE | chart-config.ts + chart-registration.ts + ProgressBar component built. Migrated 2 Chart.js components (DonorPerformance, PeerComparison) to centralized colors with dark mode. 8 CSS progress bars migrated to ProgressBar across 6 files. Spec: `docs/design-system/charts-spec.html` |
