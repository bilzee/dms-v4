# Coordinator Analytics Hub — Comprehensive Proposal

**Date:** 2026-06-04  
**Author:** Mary (Business Analyst)  
**Status:** Proposed  
**Phases:** 3 phases, tabbed analytics hub at `/coordinator/analytics`

---

## Current State Assessment

### Existing Analytics Surfaces

| Surface | Location | Content | Type |
|---------|----------|---------|------|
| Signal Analytics | `/coordinator/analytics` | Signal volume over time, resolution velocity, priority distribution, top entities, role engagement | 5 widgets, all focused on the Action Signal subsystem |
| Situation Dashboard | `/coordinator/situation-dashboard` | 3-panel: incident overview, entity assessments, map + gap analysis + aggregate metrics | Operational, not analytical |
| Verification Analytics | Verification page | Queue status, processing metrics, throughput | Verification-specific |
| Donor Metrics Dashboard | Crisis dashboard | Donor performance rankings, commitment metrics | Donor-centric |
| Admin Dashboard | `/admin/dashboard` | System-wide stats | Admin-specific |

### Critical Gap

The current analytics page is entirely centered on the **Action Signal subsystem** — it tells you about the health of the notification/signal engine, not about the disaster response itself. There is no analytics on the actual operational pipeline (assessments → verification → response planning → delivery), no population impact analytics, no resource analytics, and no retrospective/comparative analytics.

---

## Proposed Analytics — Two Categories

### A. ACTIVE DISASTER RESPONSE ANALYTICS
*What a coordinator needs during a live crisis to make faster, better decisions.*

### B. RETROSPECTIVE ANALYTICS
*What a coordinator studies AFTER a disaster to improve future responses.*

---

## A. Active Disaster Response Analytics

### A1. Assessment-to-Response Pipeline Funnel — MUST-HAVE

The single most important operational visualization. Shows the flow of work through the system right now.

| Stage | Data Source |
|-------|-----------|
| Assessments Created | `RapidAssessment` count where `verificationStatus = DRAFT` |
| Submitted for Review | `verificationStatus = SUBMITTED` |
| Verified | `verificationStatus IN (VERIFIED, AUTO_VERIFIED)` |
| Response Planned | `RapidResponse` linked to verified assessments |
| Response Verified | `RapidResponse.verificationStatus IN (VERIFIED, AUTO_VERIFIED)` |
| Delivered | `RapidResponse.deliveryStatus = DELIVERED` |
| Delivery Verified | Linked delivery verified count |

- **Visualization:** Funnel chart (horizontal or vertical) with count at each stage, plus the drop-off percentage between stages. Color-coded: green for healthy conversion (>80%), yellow for moderate (50-80%), red for bottleneck (<50%).
- **Why it matters:** The PRD targets "<2 hours assessment-to-verification" and "<4 hours planning-to-delivery." This funnel instantly answers: *Where are things stuck RIGHT NOW?*
- **Interaction:** Click any funnel stage to drill into the items at that stage.
- **Filters:** Per incident, per entity type, per assessment type (HEALTH/WASH/etc.)

### A2. Assessment Freshness / Staleness Heatmap — MUST-HAVE

In a fast-moving disaster, stale assessments are dangerous. A 3-day-old assessment during an active flood is unreliable.

- **Data Source:** `RapidAssessment.createdAt` grouped by `entityId`, compared against current time.
- **Visualization:** A grid/heatmap — rows are entities, columns are the 6 assessment types (HEALTH, WASH, SHELTER, FOOD, SECURITY, POPULATION). Each cell is color-coded:
  - Green: assessed within last 24h
  - Yellow: 24-72h
  - Orange: 3-7 days
  - Red: >7 days or never assessed
- **Why it matters:** Complements the per-signal notification approach with a strategic overview of which entities need re-assessment NOW.
- **Filters:** Per incident, by entity type, sort by "stalest first."

### A3. Population Impact Tracker — MUST-HAVE

The system captures rich population data but has no dedicated analytics view for it.

- **Visualization (3 sub-widgets):**
  1. **Population Impact Trend** — Stacked area chart over time showing displaced, injured, and deceased counts from `PreliminaryAssessment` and `PopulationAssessment` data.
  2. **Vulnerable Population Breakdown** — Treemap or proportional bar showing distribution of vulnerable groups: under-5, elderly, persons with disability, pregnant women, lactating mothers, separated children.
  3. **Demographic Pyramid** — Horizontal bar chart (male vs. female) with age-band breakdowns.
- **Why it matters:** Enables coordinators to prioritize which entities get resources first based on population impact.

### A4. Resource Commitment Pipeline — MUST-HAVE

Tracks the flow from need identification to resource delivery.

- **Data Source:** `DonorCommitment` (status: PLANNED → PARTIAL → COMPLETE → CANCELLED) + `RapidResponse` (delivery status) + `PlanCommitment` junction.
- **Visualization:** Stacked horizontal bar per incident — segments for Needed / Committed / In-Transit / Delivered / Verified.
- **Why it matters:** The PRD's success metric is ">80% commitment delivery rate." See at a glance: Are commitments being fulfilled? Which donors are lagging? Which needs have zero commitments?
- **Filters:** Per incident, per resource type (HEALTH/WASH/SHELTER/FOOD/SECURITY), per donor.

### A5. Field Team Workload Distribution — HIGH

- **Data Source:** `EntityAssignment` (assessors/responders per entity) + `RapidAssessment` (count per assessor) + `RapidResponse` (count per responder).
- **Visualization:** Bubble chart or grouped bar chart — each assessor/responder is a row showing: active assignments, assessments completed in last 7 days, assessments pending, assessments overdue.
- **Why it matters:** During active response, the coordinator needs to rebalance workloads.
- **Filters:** By role (assessor/responder), by incident, by entity type.

### A6. Geographic Coverage & Severity Heatmap — HIGH

- **Data Source:** `Entity.coordinates`, `RapidAssessment.coordinates`, `Incident.coordinates`, gap analysis severity per entity.
- **Visualization:** A dedicated analytics map with choropleth/heatmap layer showing assessment coverage density, severity overlay, and coverage gaps.
- **Why it matters:** During active response, the coordinator needs to see geographic blind spots.

### A7. Verification Throughput & Turnaround — HIGH

- **Data Source:** `RapidAssessment.verifiedAt - RapidAssessment.createdAt` (assessment turnaround), `RapidResponse.verifiedAt - RapidResponse.createdAt` (response turnaround).
- **Visualization:**
  1. **Turnaround Trend** — Line chart with dual lines over time, with PRD targets shown as reference lines.
  2. **Turnaround Distribution** — Histogram showing verification time distribution.
- **Why it matters:** The PRD targets "<2 hours assessment-to-verification." Without trend data, the coordinator cannot tell if they're meeting SLAs.

### A8. Incident Severity Trend — MEDIUM

- **Data Source:** `Incident.severity` over time, derived from assessment severity changes.
- **Visualization:** Step chart or annotation timeline showing severity changes with annotations showing what triggered each change.
- **Why it matters:** Answers the most important question during a disaster: *Are we winning?*

### A9. Assessment Type Gap Radar — MEDIUM

- **Data Source:** `gapAnalysis` per entity — gap counts by assessment type.
- **Visualization:** Radar chart (the system already has `getRadarChartOptions()` factory registered but unused). One polygon per entity, with 5 axes: Health, Food, WASH, Shelter, Security.
- **Why it matters:** Instantly reveals sector-wide patterns enabling targeted resource requests.

### A10. Real-Time Alert Pulse — MEDIUM

- **Data Source:** `ActionSignal` (unresolved, grouped by priority) + overdue assessments/responses.
- **Visualization:** Animated counters by priority + scrolling pulse feed of latest events.
- **Why it matters:** Ambient awareness during active response. The current Signal Analytics page is historical; this is the live companion.

---

## B. Retrospective Analytics

### B1. End-to-End Response Time Analysis — MUST-HAVE

- **Data Source:** Timestamps across the pipeline from incident creation through delivery verification.
- **Visualization:** Horizontal bar chart showing average time for each stage, compared against PRD targets. Box-and-whisker plot for variance analysis.
- **Why it matters:** "Coordination Delay Reduction >80%" is a PRD business impact metric. Without baseline measurements, you cannot prove improvement.

### B2. Assessment Quality & Rejection Analysis — HIGH

- **Data Source:** `RapidAssessment.verificationStatus = REJECTED`, `rejectionReason`, `rejectionFeedback`.
- **Visualization:** Rejection rate by assessor (bar chart), rejection reason breakdown (doughnut), rejection trend over time (line chart).
- **Why it matters:** Identifies training needs and form usability issues.

### B3. Donor Reliability Scorecard — HIGH

- **Data Source:** `DonorCommitment` + `Donor` metrics.
- **Visualization:** Commitment vs. Delivery scatter plot, on-time delivery rate per donor, commitment pipeline aging.
- **Why it matters:** "Commitment Delivery Rate >80%" and "Verified Delivery Rate >70%" are PRD KPIs.

### B4. Incident Comparison & Benchmarking — HIGH

- **Data Source:** Cross-incident aggregates.
- **Visualization:** Parallel coordinates chart or side-by-side radar charts.
- **Why it matters:** Enables comparison of response performance across incidents.

### B5. Disaster Type Pattern Analysis — MEDIUM

- **Data Source:** `Incident.type`, `Incident.subType`, `Incident.location`, aggregated over all historical incidents.
- **Visualization:** Geographic incident map, incident type frequency bar chart, common gap patterns by disaster type.
- **Why it matters:** Enables predictive pre-positioning of resources.

### B6. Temporal & Seasonal Patterns — MEDIUM

- **Data Source:** All timestamp data, aggregated by month/week/season.
- **Visualization:** Incident calendar heatmap (GitHub-contribution-style), monthly assessment volume area chart.
- **Why it matters:** Enables scheduling and pre-negotiation ahead of predictable peaks.

### B7. Resource Allocation Equity Analysis — MEDIUM

- **Data Source:** Resources delivered per entity vs. population affected per entity.
- **Visualization:** Scatter plot with proportional allocation reference line.
- **Why it matters:** Identifies under-resourced entities relative to their population.

### B8. Response Outcome Effectiveness — MEDIUM

- **Data Source:** Re-assessment data — before/after response delivery.
- **Visualization:** Before/after paired bars per entity showing gap reduction.
- **Why it matters:** The ultimate impact metric — did the response actually close the gaps?

### B9. Coordinator Activity Audit Trail — LOW

- **Data Source:** `AuditLog` filtered by coordinator actions.
- **Visualization:** Timeline of coordinator actions overlaid with key events.
- **Why it matters:** Individual coordinator performance review and organizational learning.

---

## Summary Matrix

| # | Analytics Widget | Category | Priority | Visualization Type | New API Needed? |
|---|-----------------|----------|----------|-------------------|-----------------|
| A1 | Assessment-to-Response Pipeline Funnel | Active | MUST-HAVE | Funnel chart | Yes |
| A2 | Assessment Freshness Heatmap | Active | MUST-HAVE | Color-coded grid/heatmap | Yes |
| A3 | Population Impact Tracker | Active | MUST-HAVE | Stacked area + treemap + pyramid | Yes |
| A4 | Resource Commitment Pipeline | Active | MUST-HAVE | Stacked horizontal bar | Yes |
| A5 | Field Team Workload Distribution | Active | HIGH | Bubble chart / grouped bar | Yes |
| A6 | Geographic Coverage Heatmap | Active | HIGH | Map heatmap layer | Partial |
| A7 | Verification Throughput Trends | Active | HIGH | Line chart + histogram | Yes |
| A8 | Incident Severity Trend | Active | MEDIUM | Step chart with annotations | Yes |
| A9 | Assessment Type Gap Radar | Active | MEDIUM | Radar chart | Partial |
| A10 | Real-Time Alert Pulse | Active | MEDIUM | Animated counters + ticker feed | Yes |
| B1 | End-to-End Response Time | Retrospective | MUST-HAVE | Horizontal bar + box-and-whisker | Yes |
| B2 | Assessment Quality & Rejection | Retrospective | HIGH | Bar + doughnut + line | Yes |
| B3 | Donor Reliability Scorecard | Retrospective | HIGH | Scatter plot + bar chart | Yes |
| B4 | Incident Comparison | Retrospective | HIGH | Parallel coordinates / radar | Yes |
| B5 | Disaster Type Patterns | Retrospective | MEDIUM | Map + bar + stacked bar | Yes |
| B6 | Temporal & Seasonal Patterns | Retrospective | MEDIUM | Calendar heatmap + area chart | Yes |
| B7 | Resource Allocation Equity | Retrospective | MEDIUM | Scatter plot with reference line | Yes |
| B8 | Response Outcome Effectiveness | Retrospective | MEDIUM | Before/after paired bars | Yes |
| B9 | Coordinator Activity Audit | Retrospective | LOW | Timeline overlay | Partial |

---

## Recommended Page Structure

Tabbed analytics hub at `/coordinator/analytics`:

| Tab | Content | Phase |
|-----|---------|-------|
| **Signals** | Existing signal analytics (preserve) | Existing |
| **Pipeline** | A1 (Funnel) + A7 (Verification Throughput) | Phase 1 |
| **Population** | A3 (Population Impact Tracker) | Phase 1 |
| **Resources** | A4 (Commitment Pipeline) + A5 (Workload) | Phase 1 |
| **Coverage** | A2 (Freshness) + A9 (Gap Radar) | Phase 1 |
| **Live Pulse** | A8 (Severity Trend) + A10 (Alert Pulse) | Phase 2 |
| **After Action** | B1-B9 (all retrospective, selectable by incident or date range) | Phase 3 |

---

## Implementation Phases

### Phase 1 — Core Operational Analytics (Pipeline, Population, Resources, Coverage)
Highest-value active response analytics. 4 new tabs.

### Phase 2 — Live Operations & Geographic (Live Pulse, Geographic Heatmap)
Real-time awareness and spatial analytics. 1 new tab + map enhancement.

### Phase 3 — Retrospective Learning (After Action)
Post-disaster analysis and cross-incident learning. 1 new tab with sub-sections.
