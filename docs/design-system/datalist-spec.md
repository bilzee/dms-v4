# DataList Component Family — Design Spec

**Phase:** 3
**Date:** 2026-05-23
**Author:** Sally
**Status:** REVIEW
**Depends on:** Phase 0 (status-colors), Phase 2 (StatusBadge)

---

## Problem

The codebase has 11 data display instances across 5 distinct modes (table, card-list, card-grid, stacked-list, custom-grid). Every instance duplicates logic for:

- Loading skeletons (5 different implementations)
- Empty states (6 different implementations)
- Search/filter controls (6 different inline implementations)
- Row selection + highlight (4 different Set/State patterns)
- Expandable rows/cards (2 different patterns)
- Pagination / load-more (3 different patterns)
- Row action dropdowns (3 different DropdownMenu setups)
- Inline editing + pending changes tracking (2 different patterns)

This spec proposes **3 layout components + 1 header component** that handle the cross-cutting concerns while leaving domain-specific rendering to the consumer.

---

## Design Principle: Structure, Not Content

The DataList family does **not** prescribe what columns or fields to show. It provides:

1. **Consistent chrome** — loading, empty, error, pagination, selection
2. **Layout primitives** — table rows, card wrappers, grid cells
3. **Behavior hooks** — expand, select, search, paginate

The consumer renders the actual content (status badges, text, buttons) inside the provided slots. This avoids the "god component" anti-pattern where a table wrapper needs to know about every domain model.

---

## Components

### 1. `DataListHeader` — Search + Filter Bar

A composable header that provides consistent search and filter layout. It does **not** manage filter state — the parent owns the state and passes onChange callbacks.

```tsx
<DataListHeader
  search={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="Search incidents..."
  filters={[
    { key: 'status', label: 'Status', value: statusFilter, onChange: setStatusFilter, options: STATUS_OPTIONS },
    { key: 'severity', label: 'Severity', value: severityFilter, onChange: setSeverityFilter, options: SEVERITY_OPTIONS },
  ]}
  onClearFilters={() => { setSearchTerm(''); setStatusFilter('all'); setSeverityFilter('all'); }}
  activeFilterCount={2}
  actions={<Button onClick={handleRefresh}><RefreshCw /></Button>}
/>
```

**When to use:** Any list view with search or filter controls. Currently duplicated in Users, IncidentManagement, VerificationQueue, CommitmentDashboard, LeaderboardDisplay.

**When NOT to use:** Simple lists with no search/filter (Roles, GapField, SeverityThreshold).

---

### 2. `DataTable` — Table Layout

Wraps shadcn `<Table>` with built-in loading skeleton rows, empty state, selection highlight, expandable rows, and optional pagination.

```tsx
<DataTable
  data={filteredIncidents}
  columns={[
    { key: 'name', header: 'Incident', sortable: true },
    { key: 'severity', header: 'Severity' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: '', align: 'right' },
  ]}
  loading={isLoading}
  selectable="single"
  selectedId={selectedIncidentId}
  onSelect={(id) => setSelectedIncidentId(id)}
  expandable
  expandedIds={expandedRows}
  onToggleExpand={(id) => toggleExpand(id)}
  emptyState={<EmptyState type="data" title="No incidents found" />}
  pagination={{ page, pageSize: 10, total, onPageChange: setPage }}
  renderRow={(incident) => (
    <DataTable.Row key={incident.id} id={incident.id}>
      <DataTable.Cell>{incident.name}</DataTable.Cell>
      <DataTable.Cell><StatusBadge domain="severity" status={incident.severity} /></DataTable.Cell>
      <DataTable.Cell><StatusBadge domain="incident" status={incident.status} /></DataTable.Cell>
      <DataTable.Cell><DropdownMenu>...</DropdownMenu></DataTable.Cell>
    </DataTable.Row>
  )}
  renderExpandedRow={(incident) => (
    <DataTable.ExpandedRow id={incident.id}>
      <IncidentDetailPanel incident={incident} />
    </DataTable.ExpandedRow>
  )}
/>
```

**When to use:**
- Structured tabular data with consistent columns
- Data that benefits from column headers and alignment
- Admin/config views where scannability matters
- Any current `<Table>` usage with more than 2 columns

**Maps to existing:** Roles table, Users table, IncidentManagement table, GapField table, Database tables.

---

### 3. `DataCardList` — Vertical Card Stack

Renders a stack of cards with consistent spacing, loading skeletons, empty state, selection highlight, expandable cards, and optional load-more or pagination.

```tsx
<DataCardList
  data={commitments}
  loading={isLoading}
  emptyState={<EmptyState type="data" title="No commitments found" action={...} />}
  selectable="single"
  selectedId={selectedCommitmentId}
  onSelect={(id) => setSelectedCommitmentId(id)}
  expandable
  expandedIds={expandedIds}
  onToggleExpand={(id) => toggleExpand(id)}
  loadMore={hasMore ? { onLoadMore: () => loadMore(), loading: isLoadingMore } : undefined}
  pagination={{ page, pageSize: 10, total, onPageChange: setPage }}
  renderCard={(commitment) => (
    <DataCardList.Card key={commitment.id} id={commitment.id}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Commitment #{commitment.id.slice(0,8)}</span>
          <StatusBadge domain="commitment" status={commitment.status} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* domain-specific content */}
      </CardContent>
    </DataCardList.Card>
  )}
  renderExpandedCard={(commitment) => (
    <DataCardList.ExpandedCard id={commitment.id}>
      <CommitmentDetailPanel commitment={commitment} />
    </DataCardList.ExpandedCard>
  )}
/>
```

**When to use:**
- Items with heterogeneous/complex content that doesn't fit columns
- Items that need visual hierarchy (title, subtitle, badges, progress bars)
- Items where each card is a mini-dashboard of its own
- Mobile-first views where cards are more usable than tables

**Maps to existing:** VerificationQueue, CommitmentDashboard, SeverityThresholdTable, LeaderboardDisplay.

---

### 4. `DataCardGrid` — Responsive Grid of Cards

Renders a responsive grid of selectable cards with consistent loading skeletons, empty state, and optional load-more.

```tsx
<DataCardGrid
  data={entities}
  columns={3}
  loading={isLoading}
  selectable="single"
  selectedId={selectedEntityId}
  onSelect={(id) => setSelectedEntityId(id)}
  emptyState={<EmptyState type="data" title="No entities assigned" />}
  loadMore={hasMore ? { onLoadMore: () => loadMore(), loading: isLoadingMore } : undefined}
  renderCard={(entity) => (
    <DataCardGrid.Card key={entity.id} id={entity.id}>
      <EntityInsightCard entity={entity} />
    </DataCardGrid.Card>
  )}
/>
```

**When to use:**
- Items that should be compared side-by-side (entity insights, incidents overview)
- Dashboard panels where items are visual tiles, not rows
- When the card itself IS the interaction target (click to select/navigate)

**Maps to existing:** EntityInsightsCards, ExecutiveIncidentsTable.

---

## Variant Selection Logic

Not every list should use the same layout. The decision is driven by **information density** and **interaction pattern**:

```
Is the data fundamentally tabular (same fields per row, benefits from column alignment)?
  YES → DataTable
  NO ↓

Is each item a self-contained summary with mixed content types (badges, progress, sub-lists)?
  YES → DataCardList
  NO ↓

Are items meant to be compared side-by-side or is the card itself the primary UI element?
  YES → DataCardGrid
  NO → DataCardList (default for non-tabular data)
```

### Decision matrix for existing instances:

| Instance | Data Shape | Interaction | Layout | Rationale |
|---|---|---|---|---|
| Roles | Tabular (name, perms, users) | Row actions | **DataTable** | Structured columns, scannable |
| Admin Users | Tabular (name, email, roles) | Row actions, filter | **DataTable** + DataListHeader | Structured columns, needs search |
| Incident Management | Tabular (type, severity, status) | Expand, select, filter | **DataTable** + DataListHeader | Structured, expandable details |
| Gap Field Table | Tabular (name, severity, edit) | Multi-select, inline edit | **DataTable** | Needs column alignment for inline edits |
| Verification Queue | Heterogeneous (entity, assessor, badges, expand) | Select, expand, filter | **DataCardList** + DataListHeader | Complex cards with status + expand |
| Commitment Dashboard | Heterogeneous (items, progress bar, badges) | View/edit actions, filter | **DataCardList** + DataListHeader | Mixed content, progress bars |
| Severity Threshold | Editable cards (inputs per card) | Inline edit per card | **DataCardList** | Each card is an edit form |
| Leaderboard Display | Ranked list with badges | Load more, filter | **DataCardList** + DataListHeader | Ranked cards with gamification |
| Entity Insights | Comparable tiles (score, progress, gaps) | Click to navigate, load more | **DataCardGrid** | Side-by-side comparison |
| Executive Incidents | Comparable tiles (type, severity, status) | Click to select | **DataCardGrid** | Dashboard tiles |
| Database Page | Tabular (backups, tables, query) | Tabbed, row actions | **DataTable** | Multiple structured tables |

---

## Sub-Component API

### DataTable Sub-Components

| Sub-component | Purpose |
|---|---|
| `DataTable.Row` | Styled `<tr>` with selection highlight, hover, click handler |
| `DataTable.Cell` | Styled `<td>` with alignment options |
| `DataTable.ExpandedRow` | Full-width `<tr>` rendered below the parent row |
| `DataTable.SkeletonRow` | Loading skeleton for one table row (auto-generated from column count) |

### DataCardList Sub-Components

| Sub-component | Purpose |
|---|---|
| `DataCardList.Card` | Styled card wrapper with selection ring, hover, click |
| `DataCardList.ExpandedCard` | Content revealed below the parent card |
| `DataCardList.SkeletonCard` | Loading skeleton for one card (auto-generated) |

### DataCardGrid Sub-Components

| Sub-component | Purpose |
|---|---|
| `DataCardGrid.Card` | Grid cell card wrapper with selection ring, hover, click |
| `DataCardGrid.SkeletonCard` | Loading skeleton for one grid card |

---

## Props Reference

### DataTable Props

```tsx
interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn[]
  loading?: boolean
  loadingRowCount?: number          // default: 5

  selectable?: 'none' | 'single' | 'multi'
  selectedId?: string               // for single select
  selectedIds?: Set<string>         // for multi select
  onSelect?: (id: string) => void   // for single select
  onSelectionChange?: (ids: Set<string>) => void  // for multi select
 getRowId?: (item: T) => string    // default: item.id

  expandable?: boolean
  expandedIds?: Set<string>
  onToggleExpand?: (id: string) => void

  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }

  emptyState?: React.ReactNode
  emptyStateFiltered?: React.ReactNode    // shown when data exists but filter returns empty

  className?: string

  renderRow: (item: T) => React.ReactNode
  renderExpandedRow?: (item: T) => React.ReactNode
}

interface DataTableColumn {
  key: string
  header: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  width?: string
}
```

### DataCardList Props

```tsx
interface DataCardListProps<T> {
  data: T[]
  loading?: boolean
  loadingCardCount?: number         // default: 3

  selectable?: 'none' | 'single'
  selectedId?: string
  onSelect?: (id: string) => void
  getRowId?: (item: T) => string

  expandable?: boolean
  expandedIds?: Set<string>
  onToggleExpand?: (id: string) => void

  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  loadMore?: {
    onLoadMore: () => void
    loading?: boolean
  }

  emptyState?: React.ReactNode
  emptyStateFiltered?: React.ReactNode

  className?: string

  renderCard: (item: T) => React.ReactNode
  renderExpandedCard?: (item: T) => React.ReactNode
}
```

### DataCardGrid Props

```tsx
interface DataCardGridProps<T> {
  data: T[]
  columns: 2 | 3 | 4 | 5          // responsive grid columns
  loading?: boolean
  loadingCardCount?: number         // default: 6

  selectable?: 'none' | 'single'
  selectedId?: string
  onSelect?: (id: string) => void
  getRowId?: (item: T) => string

  loadMore?: {
    onLoadMore: () => void
    loading?: boolean
  }

  emptyState?: React.ReactNode

  className?: string

  renderCard: (item: T) => React.ReactNode
}
```

### DataListHeader Props

```tsx
interface DataListHeaderFilterOption {
  value: string
  label: string
}

interface DataListHeaderFilter {
  key: string
  label: string
  value: string
  onChange: (value: string) => void
  options: DataListHeaderFilterOption[]
}

interface DataListHeaderProps {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string

  filters?: DataListHeaderFilter[]
  activeFilterCount?: number
  onClearFilters?: () => void

  resultCount?: number              // "Showing 25 results"
  actions?: React.ReactNode         // right-aligned action buttons

  className?: string
}
```

---

## Visual Specs

### Selection States

**DataTable row selected:** `bg-blue-50 dark:bg-blue-950/30`
**DataTable row hover:** `hover:bg-muted/50` (existing shadcn behavior)
**DataCardList/DataCardGrid card selected:** `ring-2 ring-blue-500 shadow-sm`
**DataCardList/DataCardGrid card hover:** `hover:shadow-md transition-shadow`

### Expanded States

**DataTable expanded row:** Indented content in a `<td colSpan={columns.length}>` with `bg-muted/30` background
**DataCardList expanded card:** Content rendered below the card with `border-t bg-muted/20` within the same card

### Loading Skeletons

**DataTable skeleton:** N rows of `<Skeleton>` bars matching column widths. Column headers still visible.
**DataCardList skeleton:** N cards with `<Skeleton>` blocks: title bar (60% width), 2 content lines (80%, 50%), status badge (30%).
**DataCardGrid skeleton:** N cards with `<Skeleton>` blocks: full-width image area, title, subtitle.

### Empty States

Use the existing `<EmptyState>` component. The DataList components accept an `emptyState` prop and render it centered in the list area.

For filtered-empty (data exists but no results match), a second prop `emptyStateFiltered` allows a different message. Falls back to `emptyState` if not provided.

### Pagination

Two modes:
1. **Standard pagination** — "Showing X-Y of Z" + Previous/Next buttons. Rendered below the list.
2. **Load more** — A single "Load More" button at the bottom. For infinite-scroll-like experiences.

Both are built on the existing `<Pagination>` shadcn primitive.

---

## File Structure

```
src/components/shared/DataListHeader.tsx    (~150 lines)
src/components/shared/DataTable.tsx          (~250 lines)
src/components/shared/DataCardList.tsx       (~200 lines)
src/components/shared/DataCardGrid.tsx       (~150 lines)
```

Total: ~750 lines across 4 files. Each is focused and composable.

---

## Migration Map

| # | File | Current | Target | Notes |
|---|---|---|---|---|
| 1 | `roles/page.tsx` | Raw `<Table>` | **DataTable** | Remove skeleton, empty state duplication |
| 2 | `admin/users/page.tsx` | Raw `<Table>` + filter card | **DataTable** + **DataListHeader** | Extract filter card into DataListHeader |
| 3 | `coordinator/IncidentManagement.tsx` | Raw `<Table>` + expand + filter | **DataTable** + **DataListHeader** | Expandable rows, selection |
| 4 | `settings/GapFieldTable.tsx` | Raw HTML `<table>` + multi-select | **DataTable** | Multi-select checkboxes, inline edit |
| 5 | `verification/VerificationQueue.tsx` | Custom card list + filter | **DataCardList** + **DataListHeader** | Expandable cards, pagination |
| 6 | `donor/CommitmentDashboard.tsx` | Custom card list + filter | **DataCardList** + **DataListHeader** | Status badges, progress bars |
| 7 | `settings/SeverityThresholdTable.tsx` | Editable cards | **DataCardList** | Inline edit cards |
| 8 | `donor/EntityInsightsCards.tsx` | Custom grid + load more | **DataCardGrid** | Per-card loading |
| 9 | `situation/executive/ExecutiveIncidentsTable.tsx` | Custom CSS grid | **DataCardGrid** | Type configs, selection |
| 10 | `donor/LeaderboardDisplay.tsx` | Custom stacked cards + filter | **DataCardList** + **DataListHeader** | Gamification badges |
| 11 | `system/database/page.tsx` | Raw `<Table>` (tabbed) | **DataTable** | Multiple tables in tabs |

---

## What This Does NOT Cover

These are intentionally out of scope for the DataList family:

- **Analytics dashboards** (VerificationAnalytics, PeerComparison) — these are chart-heavy visualizations, not data lists
- **Form builders** (ReportBuilder) — wizard/step UI, not a list
- **Donor reports page** — embeds ReportBuilder, minimal list
- **SafeDataLoader integration** — consumers still wrap in SafeDataLoader for data fetching; DataList handles loading/empty/error display within the list area
- **Column sorting** — columns declare `sortable: true` but actual sort logic is left to the consumer (server-side or client-side)
- **Inline editing** — DataTable provides the row structure, consumers add `<Input>` and `<Select>` inside cells. Pending changes tracking remains in the consumer.

---

## Questions for Review

1. **DataListHeader** — Should it also support a "compact" variant that renders inline (no Card wrapper) for embedding inside existing cards? The current Users page has its filter inside a `<Card>` while VerificationQueue has filters inline in a header div.

2. **Multi-select in DataCardList** — The audit found multi-select only in DataTable (GapField). Should DataCardList also support multi-select, or is single-select + load-more sufficient for card views?

3. **DataTable `columns` array** — Is the column definition approach (with key, header, align) the right level of abstraction, or should we keep it fully render-prop (just `renderRow`) and let the consumer define headers manually? Column definitions enable auto-skeleton and auto-colSpan for expanded rows, but they're more rigid.

4. **Should DataListHeader live inside or outside the list component?** Proposal: outside (composable). The header is a separate component placed above the list, not a sub-component of DataTable/DataCardList. This matches the current architecture where filter state lives in the page component.

5. **Generic vs typed** — The components use `<T>` generics. Should `getRowId` default to `(item) => item.id` assuming all domain objects have an `id` field, or require explicit `getRowId` always?
