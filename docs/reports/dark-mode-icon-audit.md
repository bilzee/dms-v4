# Dark Mode & Icon Audit Report

**Date:** 2025-05-25
**Auditor:** Sally (UX Designer)
**Scope:** Full application dark mode support and icon library usage

---

## Part 1: Dark Mode Audit

### Infrastructure Assessment

| Component | Status | Details |
|-----------|--------|---------|
| next-themes | Installed (v0.4.6) | `attribute="class"` strategy, `defaultTheme="system"`, `enableSystem` enabled |
| Tailwind config | Correct | `darkMode: ["class"]` configured |
| CSS Variables | Complete | 12 semantic color pairs defined in `:root` and `.dark` in `globals.css` |
| ThemeProvider | Present | Wraps app in `layout.tsx` with `suppressHydrationWarning` |
| ThemeToggle | Present | Dropdown with Light/Dark/System options |
| shadcn/ui primitives | Theme-aware | Use CSS variables (`bg-popover`, `text-popover-foreground`, etc.) |

### Root Cause: White Background in Dark Mode

**Primary issue:** `AppShell.tsx` uses hardcoded light-only Tailwind classes:

| File | Line | Current | Should Be |
|------|------|---------|-----------|
| AppShell.tsx | 51 | `bg-gray-50` | `bg-background` |
| AppShell.tsx | 61 | `bg-gray-50` | `bg-background` |
| AppShell.tsx | 68 | `bg-gray-600 opacity-75` | `bg-black/50` |
| AppShell.tsx | 123 | `border-gray-200 bg-white` | `border-border bg-card` |

### Coverage Metrics

| Category | Total | With `dark:` classes | Coverage |
|----------|-------|---------------------|----------|
| Components | ~179 | 21 | 12% |
| Pages | ~66 | 5 | 8% |
| Dashboard components | 41 | 0 | 0% |

### Hardcoded Color Patterns Found

| Pattern (light-only) | Semantic Replacement |
|-----------------------|---------------------|
| `bg-gray-50` | `bg-background` or `bg-muted` |
| `bg-white` | `bg-card` or `bg-background` |
| `text-gray-900` | `text-foreground` |
| `text-gray-700` | `text-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `text-gray-400` | `text-muted-foreground` |
| `border-gray-200` | `border-border` |
| `border-gray-100` | `border-border` |

### Specific Files Requiring Fixes

#### Critical (Layout Shell)
- `src/components/layouts/AppShell.tsx` — 4 hardcoded instances (causes the white background)

#### Global CSS
- `src/app/globals.css` — `.status-indicator` classes (lines 175-188) have hardcoded hex colors with no dark variants

#### shadcn Primitives
- `src/components/ui/select.tsx` — `border-gray-200 bg-white text-gray-900` hardcoded in SelectContent and SelectItem
- `src/components/ui/dropdown-menu.tsx` — Already theme-aware (OK)

#### Component Examples (not exhaustive)
- `src/app/(auth)/login/page.tsx`
- `src/components/dashboards/situation/components/PopulationImpact.tsx` — Extensive hardcoded colors
- `src/components/dashboards/crisis/ResponseVerificationQueue.tsx`
- All 41 dashboard components

---

## Part 2: Icon Library Audit

### Libraries Found

| Library | Version | Files Using | Unique Icons |
|---------|---------|-------------|-------------|
| lucide-react | 0.544.0 | 183 | ~155 |
| Raw inline SVGs | N/A | 12 files | Various |

### Design System Standard
The project design system documentation consistently specifies **lucide-react** as the standard icon library. Only one icon library is installed via npm.

### Inline SVG Files (Inconsistency)

12 files contain raw inline SVGs instead of using lucide-react components:

| File | SVG Type | Verdict |
|------|----------|---------|
| `EntityMarker.tsx` | Map marker icons for Leaflet DivIcon | **Keep as-is** — requires raw SVG strings for Leaflet markers |
| `PopulationImpact.tsx` | Pie chart data visualizations | **Keep as-is** — programmatic chart SVG, not icon usage |
| Various form/display components | Icon-like SVGs duplicating lucide icons | **Should migrate** to lucide-react |

### EntityMarker.tsx Analysis

The file uses TWO different icon approaches:

1. **Leaflet DivIcon SVG strings** (lines 94-121) — Raw SVG path data injected into HTML for map markers. These CANNOT use React components because Leaflet's `DivIcon` requires HTML strings. **Do not standardize.**

2. **React-rendered popup icons** (lines 169-276) — Uses lucide-react components (`MapPin`, `Hospital`, `Home`, `Users`, `Droplet`, `Shield`, `Utensils`, `Info`, `Package`). These CAN be migrated to hugeicons.

### PopulationImpact.tsx Analysis

All UI icons use lucide-react (`Users`, `Heart`, `Baby`, `AlertTriangle`, `User`, `Accessibility`, `Users2`, `FileText`, `TrendingUp`, `Loader2`, `AlertCircle`, `Calendar`, `BarChart3`, `PieChart`, `Grid3X3`, `Info`). The inline SVGs are programmatic pie chart rendering — **not icon usage**. No icon standardization needed. However, the component has extensive hardcoded colors requiring dark mode fixes.

### Gap Field Management Tabs Analysis

The icons at `/coordinator/settings/gap-field-management` use the same lucide-react library as the rest of the app. They stand out because:

1. **Semantic icon-to-concept mapping**: Heart=Health, UtensilsCrossed=Food, Droplets=WASH, Home=Shelter, Shield=Security
2. **Domain-specific icons**: These are visually distinctive rather than generic UI icons
3. **Clean tab layout**: `grid-cols-5` TabsList with proper spacing and active state styling from shadcn Tabs
4. **Consistent sizing**: All at `h-4 w-4` with `flex items-center gap-2`

### Full Lucide Icon Inventory

The project uses approximately 155 unique lucide-react icons across 183 files. The most commonly used icons include: `ChevronDown`, `ChevronRight`, `Plus`, `Search`, `Filter`, `Edit`, `Trash2`, `Eye`, `Download`, `Upload`, `Check`, `X`, `ArrowLeft`, `ArrowRight`, `Settings`, `User`, `Users`, `AlertTriangle`, `Info`, `Loader2`, `Calendar`, `Clock`, `MapPin`, `FileText`, `BarChart3`, `PieChart`.

---

## Summary of Findings

### Dark Mode
- Infrastructure is solid (themes, CSS variables, provider, toggle all correct)
- **Root cause is hardcoded Tailwind classes** in layout and components, not missing infrastructure
- Estimated effort: ~200-300 files need at least one hardcoded color replaced
- AppShell.tsx fix alone would resolve the "white background" user-reported issue

### Icons
- Single library (lucide-react) in use — good consistency
- 12 files with inline SVGs need review (2 are justified: EntityMarker, PopulationImpact)
- No custom icon wrapper component exists
- EntityMarker DivIcon SVGs and PopulationImpact chart SVGs should remain as-is
