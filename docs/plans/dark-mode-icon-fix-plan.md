# Dark Mode & Icon Fix Plan

**Date:** 2025-05-25
**Author:** Sally (UX Designer)
**Related:** `docs/reports/dark-mode-icon-audit.md`

---

## Track A: Dark Mode Fixes

### Phase 1: Layout Shell (Fixes White Background Immediately)

**Priority:** Critical — This is the user-reported bug

#### File: `src/components/layouts/AppShell.tsx`

| Line | Current | Replace With | Reason |
|------|---------|--------------|--------|
| 51 | `className="min-h-screen bg-gray-50"` | `className="min-h-screen bg-background"` | Unauthenticated wrapper |
| 61 | `className="min-h-screen bg-gray-50"` | `className="min-h-screen bg-background"` | Authenticated wrapper |
| 68 | `className="absolute inset-0 bg-gray-600 opacity-75"` | `className="absolute inset-0 bg-black/50"` | Sidebar overlay |
| 123 | `border-b border-gray-200 bg-white px-4 shadow-sm` | `border-b border-border bg-card px-4 shadow-sm` | Mobile top bar |

**Expected result:** Dark mode toggle will immediately change the main page background.

### Phase 2: Global CSS

#### File: `src/app/globals.css`

Fix `.status-indicator` classes (lines 175-188) to include dark mode variants:

```css
.status-indicator-critical {
  background-color: var(--critical);
  color: white;
}
/* Add dark: variants for all severity levels */
```

### Phase 3: shadcn Primitives

#### File: `src/components/ui/select.tsx`

- `SelectContent` (line 78): Replace `border-gray-200 bg-white text-gray-900` with `border-border bg-popover text-popover-foreground`
- `SelectContent` dark classes: Replace `dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700` (these work but should use semantic tokens)
- `SelectItem` (line 121): Replace `focus:bg-blue-50 focus:text-blue-900 hover:bg-gray-50 hover:text-gray-900` with `focus:bg-accent focus:text-accent-foreground`
- `SelectItem` dark classes: Replace `dark:focus:bg-blue-900 dark:focus:text-blue-100 dark:hover:bg-gray-700 dark:hover:text-gray-100` (should use semantic tokens)

### Phase 4: Component-Level Sweep

Systematic replacement across all ~179 components and ~66 pages.

#### Replacement Rules

| Find | Replace | Context |
|------|---------|---------|
| `bg-gray-50` | `bg-background` | Page/container backgrounds |
| `bg-gray-50` | `bg-muted` | Subtle section backgrounds |
| `bg-white` | `bg-card` | Card-like containers |
| `bg-white` | `bg-background` | Main backgrounds |
| `text-gray-900` | `text-foreground` | Headings, primary text |
| `text-gray-700` | `text-foreground` | Secondary headings |
| `text-gray-600` | `text-muted-foreground` | Body text, descriptions |
| `text-gray-500` | `text-muted-foreground` | Subtle text |
| `text-gray-400` | `text-muted-foreground` | Placeholder/hint text |
| `border-gray-200` | `border-border` | Dividers, card borders |
| `border-gray-100` | `border-border` | Subtle dividers |

#### Priority Order for Phase 4

1. **Auth pages** — login, register (first user impression)
2. **Dashboard components** (41 files, 0% dark mode coverage)
3. **Form components** — delivery, response, assessment forms
4. **Shared components** — StatusBadge, Breadcrumbs, Header, etc.
5. **Remaining pages** — settings, admin, reports

#### Files NOT to Change in Phase 4

- **EntityMarker.tsx** — Map marker icon SVGs (lines 94-121) are intentionally raw SVG for Leaflet DivIcon
- **PopulationImpact.tsx** — Pie chart SVG paths are programmatic data visualizations, not icon/style issues (but this file DOES need Phase 4 dark mode fixes for its Tailwind classes)

### Phase 4 Execution Strategy

Rather than editing files one by one:

1. Use `ripgrep` to find all instances of each hardcoded pattern
2. Batch-edit by pattern across the codebase
3. Verify visually in browser after each batch
4. Run `npm run build` to check for any broken class references

---

## Track B: Icon Migration (lucide-react → hugeicons)

### Research Summary

#### Hugeicons Free Tier
- **Package:** `@hugeicons/core-free-icons` (5,121 stroke rounded icons)
- **Renderer:** `@hugeicons/react`
- **Usage:**
  ```tsx
  import { HugeiconsIcon } from '@hugeicons/react';
  import { Home01Icon } from '@hugeicons/core-free-icons';
  <HugeiconsIcon icon={Home01Icon} size={24} />
  ```
- **Naming:** Numbered suffixes (01=default, 02-05=variants)

#### Migration Tool: `@hugeicons/migrate`
- CLI tool that scans projects, detects lucide-react usage, maps to hugeicons equivalents
- Uses AST transformation for safe code modification
- Claims 70-90% coverage for lucide mappings + fuzzy matching
- Supports `--preview`, `--backup`, and `--rollback` flags

### Coverage Analysis

| Category | Count | Percentage |
|----------|-------|------------|
| Clear 1:1 mappings | 127 | 73% |
| Approximate mappings | 47 | 27% |
| No equivalent | 0-3 | <2% |

**Overall coverage: 100%** (with acceptable visual substitutions)

### Chevron Icon Handling

Hugeicons free tier does NOT have single-chevron arrows (ChevronDown/Left/Right/Up). These are used extensively in:
- `src/components/ui/select.tsx` (SelectTrigger icon)
- `src/components/ui/dropdown-menu.tsx` (SubTrigger)
- Navigation components
- Accordion/collapsible sections

**Decision: Use hugeicons arrow icons as chevron replacements**
- Replace `ChevronDown` → `ArrowDown01Icon` (rendered at smaller size to match chevron feel)
- Replace `ChevronLeft` → `ArrowLeft01Icon`
- Replace `ChevronRight` → `ArrowRight01Icon`
- Replace `ChevronUp` → `ArrowUp01Icon`
- Single icon library — remove `lucide-react` entirely after migration

### EntityMarker.tsx Conclusion

**DivIcon SVG strings (lines 94-121): KEEP AS-IS**
- Leaflet `DivIcon` requires raw HTML strings, not React components
- SVG paths are simplified for 16x16px map markers
- Converting to hugeicons would require extracting raw SVG path data, adding complexity with no benefit

**React popup icons (lines 169-276): MIGRATE**
- These render inside React components (`EntityPopup` memo)
- Currently use lucide-react: `MapPin`, `Hospital`, `Home`, `Users`, `Droplet`, `Shield`, `Utensils`, `Info`, `Package`
- Can be migrated to hugeicons equivalents

### PopulationImpact.tsx Conclusion

**No icon migration needed.** All UI icons are already lucide-react components. The inline SVGs are programmatic pie chart data visualizations (SVG path calculations for donut charts), NOT icon usage.

**Dark mode fixes ARE needed** — extensive hardcoded colors: `text-gray-500`, `text-gray-600`, `text-gray-400`, `bg-gray-50`, `bg-blue-50`, `bg-red-50`, `bg-orange-50`, `bg-green-50`, `bg-pink-50`, `border-blue-200`, `border-red-200`, etc.

### Migration Steps

#### Step 1: Install Packages
```bash
npm install @hugeicons/react @hugeicons/core-free-icons
# lucide-react will be removed after migration is complete
```

#### Step 2: Create Icon Mapping
Create `src/lib/utils/icon-map.ts` mapping all ~155 lucide icons to their hugeicons equivalents.

Priority mappings (most-used icons):

| Lucide | Hugeicons |
|--------|-----------|
| `Activity` | `Activity01Icon` |
| `AlertCircle` | `AlertCircleIcon` |
| `AlertTriangle` | `AlertDiamondIcon` |
| `ArrowDown` | `ArrowDown01Icon` |
| `ArrowLeft` | `ArrowLeft01Icon` |
| `ArrowRight` | `ArrowRight01Icon` |
| `ArrowUp` | `ArrowUp01Icon` |
| `BarChart3` | `BarChart01Icon` |
| `Bell` | `Notification01Icon` |
| `Calendar` | `Calendar01Icon` |
| `Check` | `Tick01Icon` |
| `CheckCircle` | `CheckmarkCircle01Icon` |
| `Clock` | `Clock01Icon` |
| `Download` | `Download01Icon` |
| `Edit` | `Edit01Icon` |
| `Eye` | `ViewIcon` |
| `Filter` | `FilterHorizontalIcon` |
| `Heart` | `FavouriteIcon` |
| `Home` | `Home01Icon` |
| `Info` | `InformationCircleIcon` |
| `Link` | `Link01Icon` |
| `Loader2` | `Loading03Icon` |
| `Lock` | `LockIcon` |
| `LogOut` | `Logout01Icon` |
| `MapPin` | `Location01Icon` |
| `Menu` | `Menu01Icon` |
| `MessageSquare` | `Comment01Icon` |
| `Moon` | `Moon01Icon` |
| `MoreHorizontal` | `MoreHorizontalIcon` |
| `Package` | `Package01Icon` |
| `Pencil` | `PencilEdit01Icon` |
| `Phone` | `TelephoneIcon` |
| `PieChart` | `PieChart01Icon` |
| `Play` | `PlayIcon` |
| `Plus` | `Add01Icon` |
| `RefreshCw` | `ReloadIcon` |
| `Save` | `SaveIcon` |
| `Search` | `Search01Icon` |
| `Send` | `Sent02Icon` |
| `Settings` | `Settings01Icon` |
| `Share2` | `Share01Icon` |
| `Shield` | `Shield01Icon` |
| `Smartphone` | `SmartPhone01Icon` |
| `Star` | `StarIcon` |
| `Sun` | `Sun01Icon` |
| `Trash2` | `Delete01Icon` |
| `Upload` | `Upload01Icon` |
| `User` | `UserIcon` |
| `UserPlus` | `UserAdd01Icon` |
| `Users` | `UserGroupIcon` |
| `X` | `Cancel01Icon` |
| `Zap` | `FlashIcon` |

#### Step 3: Run Migration Tool
```bash
npx @hugeicons/migrate --source=src --framework=react --preview
# Review changes, then:
npx @hugeicons/migrate --source=src --framework=react --backup
```

#### Step 4: Manual Fixes
- Review and fix the 47 approximate mappings
- Replace chevron icons with hugeicons arrow equivalents (ArrowDown01Icon, etc.)
- Handle the 12 inline SVG files (keep EntityMarker DivIcon SVGs and PopulationImpact chart SVGs)
- Remove lucide-react from package.json after all migrations verified

#### Step 5: Test
- Visual regression test across all 183 affected files
- Verify dark mode rendering with new icons
- Test all interactive states (hover, focus, active)
- `npm run build` to verify no import errors

---

## Implementation Order

1. **Phase 1 (Dark Mode)** — AppShell.tsx (immediate fix, ~5 min)
2. **Phase 2 (Dark Mode)** — globals.css (~10 min)
3. **Phase 3 (Dark Mode)** — select.tsx (~10 min)
4. **Step 1 (Icons)** — Install hugeicons packages (~2 min)
5. **Step 2-3 (Icons)** — Create mapping + run migration tool (~30 min)
6. **Step 4 (Icons)** — Manual review and fixes (~1-2 hours)
7. **Phase 4 (Dark Mode)** — Component sweep (~3-4 hours)
8. **Step 5 (Icons)** — Testing and verification (~1 hour)

**Estimated total effort:** 6-8 hours

---

## Files to Create/Modify

### Create
- `src/lib/utils/icon-map.ts` — Lucide → Hugeicons mapping
- `src/components/ui/icon.tsx` — Unified icon wrapper component (optional)

### Modify (Dark Mode - Phase 1-3)
- `src/components/layouts/AppShell.tsx`
- `src/app/globals.css`
- `src/components/ui/select.tsx`

### Modify (Dark Mode - Phase 4)
- ~179 components and ~66 pages with hardcoded colors

### Modify (Icons)
- 183 files importing from lucide-react
- 12 files with inline SVGs (10 to migrate, 2 to keep)

### Keep As-Is
- `EntityMarker.tsx` DivIcon SVG strings (lines 94-121)
- `PopulationImpact.tsx` pie chart SVG paths
