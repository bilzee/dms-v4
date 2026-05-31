---
title: 'Unify donor ranking formula, icons, and add admin report nav'
type: 'refactor'
created: '2026-05-26'
status: 'in-review'
baseline_commit: 'c2a09e48d707675cbe8fb4c4e3c9fc4af4ff8753'
context:
  - '{project-root}/src/lib/validation/gamification.ts'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Three pages display donor rankings but use different scoring formulas, different rank icons, and one has a broken text display ("Top 1 donorsG"). The `/donor/leaderboard` uses the canonical weighted formula (40% delivery + 30% value + 20% consistency + 10% speed) but documents a wrong simple formula. The coordinator pages (`/coordinator/donors/metrics` and `/coordinator/situation-dashboard`) use a completely different simple formula. Admin users have no sidebar navigation to the report builder pages.

**Approach:** Unify all ranking displays to use `computeOverallScore` from `gamification.service.ts`. Fix the criteria API to document the real weighted formula. Remove the buggy badge distribution text. Add proper tie handling (same score = same rank, skip subsequent). Harmonize top-3 icons to Trophy/Medal/Award across all three displays. Add a Reports section to the ADMIN navigation in `Navigation.tsx`.

## Boundaries & Constraints

**Always:** Use `computeOverallScore` as the single source of truth for scores. Use Trophy (rank 1), Medal (rank 2), Award (rank 3) icons consistently. Handle ties: equal scores get same rank, next rank skips (1, 1, 3 pattern).

**Ask First:** Any changes to the actual weight values or normalization logic in `computeOverallScore`.

**Never:** Do not change the gamification badge thresholds (95/85/70 for delivery, etc.). Do not create new API endpoints — extend existing ones. Do not create admin-specific report pages — reuse existing shared pages.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Two donors with identical overall scores | Score A = Score B = 72.5 | Both get rank 1, next donor gets rank 3 | N/A |
| Donor with zero commitments and zero responses | New donor, no activity | Score = 0 (all normalized values are 0) | Display rank normally |
| Criteria API called by leaderboard page | GET /api/v1/leaderboard/criteria | Returns weighted formula description, correct badge thresholds | N/A |
| Admin user logs in | ADMIN role session | Sidebar shows Reports section with Report Management and Report Builder links | N/A |

</frozen-after-approval>

## Code Map

- `src/app/api/v1/donors/metrics/route.ts` — topPerformers scoring: currently uses simple formula, must switch to `computeOverallScore`
- `src/app/api/v1/leaderboard/criteria/route.ts` — formula documentation: currently wrong simple formula, must document weighted formula correctly
- `src/app/(auth)/donor/leaderboard/page.tsx` — leaderboard page: displays buggy "Top N donorsG" text and wrong formula
- `src/components/donor/LeaderboardDisplay.tsx` — rank icons: already uses Trophy/Medal/Award (canonical)
- `src/components/dashboards/situation/components/TopDonorsSection.tsx` — rank icons: uses Trophy/Star/HandHeart (non-canonical), displays wrong formula text, uses donors/metrics API
- `src/components/dashboards/crisis/DonorMetricsDashboard.tsx` — rank icons: uses plain numbered circles (non-canonical), uses donors/metrics API
- `src/components/layouts/Navigation.tsx` — ADMIN section: missing Reports navigation group
- `src/lib/services/gamification.service.ts` — `computeOverallScore`: canonical scoring function (no changes to logic)

## Tasks & Acceptance

**Execution:**
- [x] `src/app/api/v1/donors/metrics/route.ts` — Replace simple scoring formula in topPerformers sort with `computeOverallScore` from gamification.service. Pass the required metrics (verifiedDeliveryRate, totalCommitmentValue, activityFrequency, avgResponseTimeHours). Add tie handling: equal scores get same rank, next rank skips. Update `successRate` field to reflect the new score. — Ensures coordinator pages show same scores as leaderboard.
- [x] `src/app/api/v1/leaderboard/criteria/route.ts` — Update `calculation.formula` to document the actual weighted formula: "Score = (Delivery Rate × 0.4) + (Commitment Value × 0.3) + (Consistency × 0.2) + (Response Speed × 0.1)". Update `performanceMetrics.overallScore.calculation` and description accordingly. Update `performanceMetrics.responseVerificationRate.contribution` to say "40% weight in overall score" and add entries for commitment value, consistency, response speed. — Fixes documentation mismatch.
- [x] `src/app/(auth)/donor/leaderboard/page.tsx` — Remove the buggy `{stats.badgeDistribution.gold}G {stats.badgeDistribution.silver}S {stats.badgeDistribution.bronze}B` text and the `{criteria.calculation.formula}` mono display. Replace with a clearer formula explanation using the corrected criteria data. — Fixes broken text display.
- [x] `src/components/dashboards/situation/components/TopDonorsSection.tsx` — Change rank icons from Trophy/Star/HandHeart to Trophy/Medal/Award. Update formula text at bottom to show weighted formula. Remove the comment referencing "updated ranking formula: responseVerificationRate + totalCommitments". — Harmonizes icons and formula with leaderboard.
- [x] `src/components/dashboards/crisis/DonorMetricsDashboard.tsx` — Add Trophy/Medal/Award icons for top 3 donors (replacing plain numbered circles). Update `donor.successRate` display label. Update the "Rate: X% + Y commits" breakdown to reflect the new weighted components. — Harmonizes icons with leaderboard.
- [x] `src/components/layouts/Navigation.tsx` — Add a Reports section to the ADMIN navigation array with children: "Report Management" → `/coordinator/reports` and "Report Builder" → `/reports/builder`, using FileText and BarChart3 icons (matching coordinator pattern). — Gives admin users sidebar access to reports.
- [x] `src/app/api/v1/leaderboard/route.ts` — Add tie handling in rank assignment: when consecutive entries have same overallScore, assign same rank and skip. Currently `index + 1` always increments. — Ensures consistent tie handling.

**Acceptance Criteria:**
- Given `/donor/leaderboard` is loaded, when viewing top donor scores, then the scores match exactly what `/coordinator/donors/metrics` and `/coordinator/situation-dashboard` show for the same donor
- Given two donors have identical overall scores, when rankings are displayed on any page, then both show the same rank number and the next donor skips
- Given an admin user is logged in, when viewing the sidebar, then a Reports section is visible with Report Management and Report Builder links
- Given `/donor/leaderboard` is loaded, when the explanation section renders, then no "Top N donorsG" broken text is visible and the formula shows the weighted 4-factor formula
- Given the top 3 donors on any page, when rank icons are displayed, then rank 1 shows Trophy, rank 2 shows Medal, rank 3 shows Award

## Spec Change Log

## Design Notes

**Tie handling pattern:** After sorting by score descending, iterate with a counter. If current score equals previous score, reuse previous rank. Otherwise, rank = counter position (not index + 1). This produces standard competition ranking (1, 1, 3, 4...).

**computeOverallScore in donors/metrics API:** The donors/metrics API currently computes metrics differently from the leaderboard API. To use `computeOverallScore`, we need to calculate `verifiedDeliveryRate` (verified items / committed items × 100), `totalCommitmentValue`, `activityFrequency`, and `avgResponseTimeHours` for each donor within that API — the leaderboard API already does this, so we mirror the same calculation.

**Score display precision:** The leaderboard API returns `overallScore.toFixed(1)`. The donors/metrics API currently returns `successRate.toFixed(2)`. Unify to `.toFixed(1)` for consistency.

## Verification

**Commands:**
- `npx next build` — expected: no type errors
- `npx tsc --noEmit` — expected: clean compilation

**Manual checks:**
- Load `/donor/leaderboard` and verify no broken text, correct formula displayed
- Load `/coordinator/situation-dashboard` and verify top donors show Trophy/Medal/Award icons with matching scores
- Load `/coordinator/donors/metrics` and verify top performers show Trophy/Medal/Award icons with matching scores
- Log in as admin and verify Reports section appears in sidebar
