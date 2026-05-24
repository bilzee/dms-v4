# StatCard Variant Assignment Rules

This document is the canonical reference for which StatCard variant and
severity to use in every context. It lives next to `StatCard.tsx` so that
anyone editing the component sees the rules.

---

## Variant Selection

### Rule 1 — Tinted is the default
Every primary metric row uses `variant="tinted"` (or omit the prop — tinted
is the default). The card carries a subtle background tint matching its
severity. There is no "plain white" variant; `severity="neutral"` gives a
gray wash instead.

### Rule 2 — Compact for secondary rows
Any row of stat cards that appears *below* the primary row on the same page
uses `variant="compact"`. Compact cards are shorter (`py-3`), use a smaller
value size (`text-lg`), and keep the icon inline rather than floating
top-right.

### Rule 3 — Centered for rank / score contexts
Use `variant="centered"` when the value is a single score, rank, or grade
that benefits from centred emphasis. Typical contexts: performance scores,
overall grades, system health indicators.

### Rule 4 — Trend when backend supports it
Add the `trend` prop whenever the backend can provide a comparison value
(previous period, target, benchmark). If no comparison data exists, omit it.
Never fabricate trend data on the frontend.

---

## Severity Colour Semantics

Pick the severity that matches the *meaning* of the metric, not the colour
you want. If no severity fits, use `neutral`.

| Severity   | Meaning                | When to use                                    |
|------------|------------------------|------------------------------------------------|
| `critical` | Alert / danger         | Active incidents, rejected items, errors        |
| `high`     | Urgent                 | High-priority queue items, overdue              |
| `medium`   | Moderate               | In-progress counts, partially completed          |
| `low`      | Nominal / all clear    | Low-priority items, items needing minor attention|
| `warning`  | Pending / awaiting     | Pending verifications, awaiting action           |
| `info`     | Informational / totals | Total counts, system metadata, general stats    |
| `success`  | Positive / completed   | Verified, completed, approved, fulfilled         |
| `neutral`  | Generic / fallback     | No strong signal, mixed or unknown               |

---

## Page-by-Page Assignment

### Coordinator Dashboard
| Position   | Label                   | Variant  | Severity  | Trend? |
|------------|-------------------------|----------|-----------|--------|
| Row 1, #1  | Active Incidents        | tinted   | critical  | yes    |
| Row 1, #2  | Pending Assessments     | tinted   | warning   | yes    |
| Row 1, #3  | Unverified Responses    | tinted   | info      | yes    |
| Row 1, #4  | Verified Today          | tinted   | success   | yes    |

### Verification Management
| Position   | Label                   | Variant  | Severity  | Trend? |
|------------|-------------------------|----------|-----------|--------|
| Row 1, #1  | Pending Assessments     | tinted   | warning   | no     |
| Row 1, #2  | Pending Responses       | tinted   | warning   | no     |
| Row 1, #3  | Verified Today          | tinted   | success   | no     |
| Row 1, #4  | Auto-Verified           | tinted   | info      | no     |
| Row 2, #1  | Assessment Verif. Rate  | compact  | success   | no     |
| Row 2, #2  | Response Verif. Rate    | compact  | success   | no     |
| Row 2, #3  | Avg Processing Time     | compact  | info      | no     |
| Row 2, #4  | Rejection Rate          | compact  | critical  | no     |

### Donor Metrics Dashboard
| Position   | Label                   | Variant  | Severity  | Trend? |
|------------|-------------------------|----------|-----------|--------|
| Row 1, #1  | Total Donors            | tinted   | info      | no     |
| Row 1, #2  | Total Commitments       | tinted   | success   | no     |
| Row 1, #3  | Verified Responses      | tinted   | success   | no     |
| Row 1, #4  | Avg Verification Rate   | tinted   | info      | no     |

### Field Dashboard
| Position   | Label                   | Variant  | Severity  | Trend? |
|------------|-------------------------|----------|-----------|--------|
| Row 1, #1  | My Pending Assessments  | tinted   | warning   | yes    |
| Row 1, #2  | My Completed            | tinted   | success   | yes    |
| Row 1, #3  | Assigned Entities       | tinted   | info      | no     |
| Row 1, #4  | My Verification Rate    | tinted   | success   | no     |

### Donor Dashboard
| Position   | Label                   | Variant  | Severity  | Trend? |
|------------|-------------------------|----------|-----------|--------|
| Row 1, #1  | My Commitments          | tinted   | info      | yes    |
| Row 1, #2  | Verified Responses      | tinted   | success   | yes    |
| Row 1, #3  | Pending Verifications   | tinted   | warning   | no     |
| Row 1, #4  | Fulfilment Rate         | tinted   | success   | no     |

### Crisis Dashboard
| Position   | Label                   | Variant  | Severity  | Trend? |
|------------|-------------------------|----------|-----------|--------|
| Row 1, #1  | Active Incidents        | tinted   | critical  | yes    |
| Row 1, #2  | Pending Responses       | tinted   | warning   | yes    |
| Row 1, #3  | Verified Today          | tinted   | success   | yes    |
| Row 1, #4  | System Health           | tinted   | success   | no     |

### Reports Dashboard
| Position   | Label                   | Variant  | Severity  | Trend? |
|------------|-------------------------|----------|-----------|--------|
| Row 1, #1  | Total Reports           | tinted   | info      | no     |
| Row 1, #2  | Published               | tinted   | success   | no     |
| Row 1, #3  | Drafts                  | tinted   | warning   | no     |
| Row 1, #4  | Last Generated          | tinted   | neutral   | no     |

### Roles / Admin
| Position   | Label                   | Variant  | Severity  | Trend? |
|------------|-------------------------|----------|-----------|--------|
| Row 1, #1  | Total Users             | tinted   | info      | no     |
| Row 1, #2  | Active Sessions         | tinted   | success   | no     |
| Row 1, #3  | Pending Invitations     | tinted   | warning   | no     |
| Row 1, #4  | System Status           | tinted   | success   | no     |

---

## Anti-patterns

- **Do not** use the same severity for all cards in a row. Vary severity by meaning.
- **Do not** put trend arrows on every card. Only where comparison data exists.
- **Do not** use `variant="compact"` on the first (primary) row.
- **Do not** use `variant="centered"` for regular metric counts. Reserve for scores/ranks.
- **Do not** override card background or border colours via `className`. Use severity.
- **Do not** add icons inside coloured circles or squares. Icons sit bare at `h-4 w-4`.
