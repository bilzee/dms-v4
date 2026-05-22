# DRMS Domain Glossary

Canonical terminology for the Disaster Relief Management System. Use these terms consistently across UI labels, navigation, code, and documentation.

## Core Domain Terms

| Preferred Term | Avoid | Context |
|---|---|---|
| Crisis Dashboard | Situation Dashboard, Dashboard | The role-specific coordinator overview at `/coordinator/dashboard` |
| Situation Awareness | Situation Dashboard | The 3-panel monitoring page at `/coordinator/situation-dashboard` |
| Facility | Entity, Organization | Physical locations receiving aid (hospitals, shelters, schools) |
| Assessment | Field Report, Survey | Rapid needs assessments conducted by field assessors |
| Response Plan | Response Delivery | Planned aid distribution for a specific crisis |
| Verification | Quality Assurance, Validation | Data validation workflow for assessments and responses |
| Dashboard | Home, Overview | The shared landing page at `/dashboard` |

## Role Names

| Preferred Term | Avoid |
|---|---|
| Coordinator | Admin (when referring to crisis coordination), Manager |
| Assessor | Field Worker, Surveyor |
| Responder | Delivery Agent, Field Agent |
| Donor | Sponsor, Funder, Partner |
| Administrator | Super Admin, System Admin |

## Entity & Data Terms

| Preferred Term | Avoid | Context |
|---|---|---|
| Entity | Facility, Organization, Location | Any physical location being assessed or receiving aid |
| Commitment | Pledge, Promise, Donation | A donor's pledge of resources to an entity |
| Delivery | Shipment, Distribution | Physical delivery of committed resources |
| Gap Score | Need Score, Deficit | Assessment metric measuring unmet needs (0-10 scale) |
| Priority | Severity, Urgency | CRITICAL, HIGH, MEDIUM, LOW classification |
| Status | State, Phase | Workflow state of an entity (SUBMITTED, VERIFIED, REJECTED, etc.) |

## Navigation Labels

| Route | Label | Avoid |
|---|---|---|
| `/dashboard` | Dashboard | Home, Overview |
| `/coordinator/dashboard` | Crisis Dashboard | Situation Dashboard |
| `/coordinator/situation-dashboard` | Situation Awareness | Situation Dashboard |
| `/coordinator/verification` | Verification | Quality Assurance |
| `/donor/entities` | Entities | Facilities, Organizations |
| `/donor/analytics` | Analytics | Reports, Statistics |
| `/donor/reports` | Reports | Documents, Exports |
| `/assessor/rapid-assessments` | Assessments | Field Reports, Surveys |
| `/responder/responses` | Responses | Deliveries, Missions |
| `/admin/dashboard` | Administration | System, Settings |

## Status Workflows

### Assessment Status
| Status | Label | Description |
|---|---|---|
| `DRAFT` | Draft | Assessment is being prepared |
| `SUBMITTED` | Pending | Awaiting coordinator verification |
| `VERIFIED` | Verified | Confirmed by coordinator |
| `AUTO_VERIFIED` | Auto-Verified | Automatically approved by system rules |
| `REJECTED` | Rejected | Declined by coordinator |

### Response Status
| Status | Label | Description |
|---|---|---|
| `PLANNED` | Planned | Response plan created, awaiting execution |
| `IN_PROGRESS` | In Progress | Resources being delivered |
| `COMPLETED` | Completed | All resources delivered and confirmed |
| `CANCELLED` | Cancelled | Response plan cancelled |
