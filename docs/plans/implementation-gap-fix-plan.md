# Implementation Gap Fix Plan

> Prioritized plan to fix mocked, broken, and incomplete implementations across System Admin, Data Export & Reporting, and Donor Gamification.
> Created: 2026-05-25
> Owner: John (PM), reviewed against audit findings

---

## Relationship to Existing Plans

| Existing Plan | Overlap | Status |
|---------------|---------|--------|
| `fix-mocked-values.md` | Tasks 4 (System Health API), 5 (Admin Dashboard), 6 (Donor Reports) | **Superseded** by this plan where scope overlaps. This plan covers those plus additional gaps found in deeper audit. |
| `fix-api-auth-audit.md` | Audit trail auth | Separate concern, not covered here. |

---

## Triage Summary

| Severity | Category | Gap Count |
|----------|----------|-----------|
| **P0 — Broken** | Bugs producing wrong data | 4 |
| **P1 — Fake** | Entirely mocked, no backend | 3 |
| **P2 — Partial** | Real core, mock edges | 5 |
| **P3 — Polish** | Minor missing features | 3 |

---

## P0: Bugs Producing Wrong Data (Fix Immediately)

### P0-1: Leaderboard response time calculation always yields 0

**File:** `src/app/api/v1/leaderboard/route.ts` line 148
**Bug:** `new Date(r.createdAt).getTime() - new Date(r.createdAt).getTime()` subtracts a date from itself.
**Impact:** Every donor with responses gets `avgResponseTime = 0`, qualifying all for "Quick Response Gold" badge.
**Fix:** Subtract the linked assessment's creation date from response creation date. Requires including the assessment relation in the query.
**Agent:** Amelia (bmad-agent-dev) or bmad-quick-dev
**Quick-dev eligible:** YES — single-file bug fix, clear scope.

### P0-2: Global rankings sorted alphabetically, not by score

**File:** `src/lib/services/leaderboard.service.ts` line 411
**Bug:** `updateGlobalRankings` sorts by `orderBy: { name: 'asc' }`, assigning rank #1 to first donor alphabetically.
**Impact:** Leaderboard rankings are meaningless.
**Fix:** Sort by `leaderboardRank: 'asc'` (after P0-3 fix makes rank reflect score) or by a computed score field.
**Agent:** Amelia (bmad-agent-dev) or bmad-quick-dev
**Quick-dev eligible:** YES — single-line fix.

### P0-3: Inconsistent scoring formulas across leaderboard and gamification

**Files:**
- `src/app/api/v1/leaderboard/route.ts` line 155: `(responseVerificationRate * 100) + totalCommitments`
- `src/lib/services/gamification.service.ts` lines 118-122: weighted average of delivery/value/consistency/speed
**Bug:** Two completely different formulas produce different rankings for the same donors.
**Impact:** Leaderboard shows one ranking, gamification service computes another. Badges and ranks don't match.
**Fix:** Unify on the gamification service's weighted formula. The leaderboard route should call `calculateDonorMetrics` or use the same weights.
**Agent:** Winston (bmad-agent-architect) to decide the canonical formula, then Amelia (bmad-agent-dev) to implement.
**Quick-dev eligible:** PARTIAL — Winston should confirm formula first, then quick-dev can apply it.

### P0-4: Ranking formula in leaderboard service is `score * 0.1`

**File:** `src/lib/services/leaderboard.service.ts` line 365
**Bug:** `const newRank = Math.ceil(metrics.overallScore * 0.1)` — rank is derived from an arbitrary multiplier, not from comparing against other donors.
**Impact:** Ranks don't reflect relative performance.
**Fix:** After computing scores for all donors, sort descending and assign sequential ranks.
**Agent:** Amelia (bmad-agent-dev) or bmad-quick-dev
**Quick-dev eligible:** YES — fix is straightforward once P0-3 resolves the formula question.

---

## P1: Entirely Mocked, No Backend

### P1-1: Database Management page — 100% placeholder

**File:** `src/app/(auth)/system/database/page.tsx`
**Gap:** Zero API calls. All data hardcoded (`mockStats`, `mockBackups`, `mockTables`). All 4 operations (backup, restore, query, optimize) fake delays with `setTimeout`. Referenced API endpoints (`/api/v1/admin/database/*`) don't exist.
**Scope:**
1. Create API routes: `/api/v1/admin/database/stats`, `/api/v1/admin/database/backup`, `/api/v1/admin/database/restore/[id]`, `/api/v1/admin/database/query`, `/api/v1/admin/database/optimize`, `/api/v1/admin/database/tables`
2. Wire frontend to real API calls
3. Remove all `mock*` constants and simulated `setTimeout` operations
**Agent:** Winston (bmad-agent-architect) for API design, Amelia (bmad-agent-dev) for implementation.
**Quick-dev eligible:** NO — too large (6 new API routes + frontend rewire). Better suited for bmad-dev-story or bmad-create-story to formalize as a story first.

### P1-2: Scheduled Reports — in-memory storage, no-op email

**Files:**
- `src/app/api/v1/exports/schedule/route.ts` — uses in-memory `Map`, lost on restart
- Email sending function builds content but never delivers (line 482)
- Cron scheduling uses `setTimeout`, not persistent
**Scope:**
1. Add `ScheduledReport` Prisma model for persistence
2. Replace in-memory `Map` with database queries
3. Integrate email service (or at minimum, create the service interface)
4. Replace `setTimeout` cron with a proper job queue or at minimum document the limitation
**Agent:** Winston (bmad-agent-architect) for data model + job queue design, Amelia (bmad-agent-dev) for implementation.
**Quick-dev eligible:** NO — requires schema migration, new service layer, and architectural decisions.

### P1-3: Report Builder page doesn't save templates

**File:** `src/app/(auth)/reports/builder/page.tsx`
**Gap:** Does not pass `initialTemplate` or `onSave` props to `<ReportBuilder />`. Building a report works in the UI, but saving does nothing.
**Scope:** Wire `onSave` to call `/api/v1/reports/templates` (which already exists and is fully functional). Add template loading for edit mode via `?id=` param.
**Agent:** Amelia (bmad-agent-dev) or bmad-quick-dev
**Quick-dev eligible:** YES — straightforward prop wiring to existing API.

---

## P2: Real Core, Mock Edges

### P2-1: Gamification response time hardcoded to 24h

**File:** `src/lib/services/gamification.service.ts` line 107
**Gap:** `const responseHours = 24` — always 24 regardless of actual data. Comment says "Simplified calculation."
**Impact:** Speed component of overall score is static. "Quick Response" badge thresholds meaningless.
**Fix:** Compute actual response time from commitment creation to first linked delivery, or from assessment date to commitment date.
**Agent:** Amelia (bmad-agent-dev) or bmad-quick-dev
**Quick-dev eligible:** YES — single-value replacement with a real calculation.

### P2-2: Badge awards never persisted

**File:** `src/lib/services/leaderboard.service.ts` lines 347-348
**Gap:** `awardBadge` is `console.log` only. Badges are never stored.
**Fix:** Either persist to a `BadgeAward` table in Prisma or store badges on the Donor model's existing fields. At minimum, write computed badges back to donor record.
**Agent:** Amelia (bmad-agent-dev) or bmad-quick-dev
**Quick-dev eligible:** YES if storing on existing Donor model fields. NO if adding new Prisma model (needs schema migration).

### P2-3: Notifications are console.log only

**Files:**
- `src/lib/services/leaderboard.service.ts` lines 427-434 — both `sendAchievementNotification` and `sendRankingChangeNotification` are `console.log`
**Gap:** Users never see achievement or ranking change alerts.
**Fix:** Create notification service interface. For MVP, store notifications in a `Notification` Prisma model and display via existing UI patterns. Email can be deferred.
**Agent:** Winston (bmad-agent-architect) for notification architecture, Amelia (bmad-agent-dev) for implementation.
**Quick-dev eligible:** PARTIAL — simple in-app notification storage is quick-dev eligible. Email integration is not.

### P2-4: System Health page — Service Status section hardcoded

**File:** `src/app/(auth)/system/health/page.tsx` lines 110-150
**Gap:** Web Server, Authentication, File Storage statuses and uptimes are all hardcoded. TODO comments at lines 120-121.
**Fix:** Add service health checks to the `/api/v1/system/health` API route. At minimum: auth service liveness (try token verification), file storage check (try write/read temp file). Uptime can come from process.uptime() or a startup timestamp.
**Agent:** Amelia (bmad-agent-dev) or bmad-quick-dev
**Quick-dev eligible:** YES — extend existing API route + replace hardcoded values.

### P2-5: Template Engine Preview uses random mock data

**File:** `src/lib/reports/template-engine.ts` lines 397-449
**Gap:** `renderTemplatePreview` calls `generateMockData` with `Math.random()`. KPIs show hardcoded "150", "85%". Charts show "Chart Preview" text.
**Fix:** Accept real data as a parameter. The `/api/v1/reports/generate` route already has a working `DataAggregator` — wire the preview to use it.
**Agent:** Amelia (bmad-agent-dev) or bmad-quick-dev
**Quick-dev eligible:** YES — refactor `renderTemplatePreview` to accept optional real data parameter.

---

## P3: Minor Missing Features

### P3-1: Region filtering not implemented on leaderboard

**File:** `src/app/api/v1/leaderboard/route.ts` lines 63-64
**Gap:** Region filter accepted as param but ignored. All donors show region "Unassigned".
**Fix:** Requires donors to have entity assignments with geographic data. Add region field to donor or derive from assigned entities.
**Agent:** Amelia (bmad-agent-dev)
**Quick-dev eligible:** YES — if we derive region from entity assignments.

### P3-2: Chart export always returns SVG (PNG/PDF formats unimplemented)

**File:** `src/app/api/v1/exports/charts/route.ts` lines 165-167
**Gap:** Requesting PNG or PDF format always returns SVG regardless.
**Fix:** Add sharp (for PNG rasterization) or puppeteer (for PDF) to pipeline. Or remove PNG/PDF from accepted formats.
**Agent:** Amelia (bmad-agent-dev) or bmad-quick-dev
**Quick-dev eligible:** YES — either implement via sharp library or remove the format options. Removing is trivial.

### P3-3: CSV export lacks proper value escaping

**File:** `src/app/api/v1/exports/csv/route.ts` lines 131, 199, 243, 292, 372
**Gap:** Uses `row.join(',')` without escaping commas or quotes in data values. Will produce malformed CSV for values containing commas.
**Fix:** Wrap values in double quotes and escape internal quotes per RFC 4180.
**Agent:** Amelia (bmad-agent-dev) or bmad-quick-dev
**Quick-dev eligible:** YES — small utility function fix.

---

## Execution Plan

### Phase 1: Fix Broken Data (P0) — ~4 hours
**Goal:** Stop serving wrong data to users.

| Order | Item | Owner | Time | Quick-dev? |
|-------|------|-------|------|------------|
| 1a | P0-3: Unify scoring formula | Winston decides, Amelia implements | 1h | Partial |
| 1b | P0-1: Fix response time bug | Amelia | 30min | YES |
| 1c | P0-4: Fix ranking formula | Amelia | 30min | YES |
| 1d | P0-2: Fix alphabetical sort | Amelia | 15min | YES |

**Verification:** bmad-code-review after all P0 fixes. Confirm leaderboard produces correct rankings with test data.

### Phase 2: Wire Up Fakes (P1-3 + P2 quick wins) — ~5 hours
**Goal:** Make existing features actually work end-to-end.

| Order | Item | Owner | Time | Quick-dev? |
|-------|------|-------|------|------------|
| 2a | P1-3: Report Builder save wiring | Amelia | 1h | YES |
| 2b | P2-1: Gamification response time | Amelia | 1h | YES |
| 2c | P2-2: Badge award persistence | Amelia | 1h | YES (if on Donor model) |
| 2d | P2-4: System Health service checks | Amelia | 1.5h | YES |
| 2e | P3-3: CSV escaping fix | Amelia | 15min | YES |
| 2f | P3-2: Remove fake chart formats | Amelia | 15min | YES |

**Verification:** bmad-code-review after Phase 2.

### Phase 3: New Backend Infrastructure (P1-1, P1-2) — ~12-16 hours
**Goal:** Replace placeholder infrastructure with real backend services.

| Order | Item | Owner | Time | Quick-dev? |
|-------|------|-------|------|------------|
| 3a | P1-1: Database Management API + frontend | Winston designs, Amelia builds | 8-10h | NO |
| 3b | P1-2: Scheduled Reports persistence | Winston designs, Amelia builds | 4-6h | NO |

**Agent flow:**
1. **Winston** (bmad-agent-architect) — Design API contracts and data models for P1-1 and P1-2. Output: architecture addendum.
2. **Amelia** (bmad-agent-dev) — Implement as formal stories via bmad-dev-story.
3. **bmad-code-review** — Review after each story.

### Phase 4: Polish & Deferred Items (P2-3, P2-5, P3-1) — ~5-7 hours
**Goal:** Complete the remaining edges.

| Order | Item | Owner | Time | Quick-dev? |
|-------|------|-------|------|------------|
| 4a | P2-5: Template preview with real data | Amelia | 2h | YES |
| 4b | P2-3: In-app notifications | Winston designs, Amelia builds | 2-3h | Partial |
| 4c | P3-1: Leaderboard region filtering | Amelia | 1-2h | YES |

---

## Quick-Dev Eligibility Summary

| # | Item | Quick-Dev? | Reason |
|---|------|-----------|--------|
| P0-1 | Response time bug | YES | Single-file bug fix |
| P0-2 | Alphabetical sort | YES | Single-line fix |
| P0-3 | Scoring formula unification | PARTIAL | Needs Winston input first |
| P0-4 | Ranking formula | YES | Simple fix after P0-3 |
| P1-1 | Database Management backend | NO | 6 new API routes + schema + frontend |
| P1-2 | Scheduled Reports persistence | NO | Schema migration + job queue design |
| P1-3 | Report Builder save | YES | Prop wiring to existing API |
| P2-1 | Gamification response time | YES | Replace hardcoded value with calculation |
| P2-2 | Badge persistence | YES/NO | YES if on Donor model, NO if new table |
| P2-3 | Notifications | PARTIAL | In-app is quick, email is not |
| P2-4 | System Health service checks | YES | Extend existing API + UI |
| P2-5 | Template preview real data | YES | Refactor to accept data param |
| P3-1 | Region filtering | YES | Derive from entity assignments |
| P3-2 | Chart format cleanup | YES | Remove fake format options |
| P3-3 | CSV escaping | YES | Small utility fix |

**Quick-dev can handle:** 10 of 15 items directly, 3 partially, 2 not at all.

---

## Total Effort Estimate

| Phase | Hours | Quick-Dev Items |
|-------|-------|-----------------|
| Phase 1 (P0 bugs) | ~4h | 3 of 4 |
| Phase 2 (wire fakes) | ~5h | 6 of 6 |
| Phase 3 (new infra) | ~12-16h | 0 of 2 |
| Phase 4 (polish) | ~5-7h | 2 of 3 |
| **Total** | **~26-32h** | |

---

## Recommended Next Step

1. Invoke **Winston** (bmad-agent-architect) to decide on the canonical scoring formula for P0-3.
2. Run **bmad-quick-dev** on P0-1, P0-2, P0-4 (bugs) as a batch — they're independent and each is a small fix.
3. After formula decision, run **bmad-quick-dev** on P0-3 + P2-1 together (both touch gamification scoring).
4. Tackle Phase 2 quick-dev items in any order.
5. Phase 3 items go through **bmad-create-story** → **bmad-dev-story** formal pipeline.
