# Production Simulation Scripts — DMS v4

## Overview

This directory contains phased, Chrome DevTools-based simulation scripts designed for LLM agents to execute against the production DMS environment. Each phase builds on artefacts created in previous phases.

## Execution Model

Each script is a step-by-step instruction set for an LLM agent using the **Chrome DevTools MCP tools** (`navigate_page`, `take_snapshot`, `fill_form`, `click`, `fill`, `press_key`, etc.) to drive the production UI. No direct API calls — all interactions go through the browser.

## Prerequisites

- Chrome browser with DevTools MCP connection
- Admin credentials and production URL (provided by user before execution)
- All phases run sequentially; later phases reference IDs captured in earlier phases

## Artefact Tracking

At the end of each phase, the agent must produce an **Artefact Summary** listing all created records with their IDs (captured from the UI). These IDs are referenced in subsequent phases.

## Phase Index

| Phase | File | Description | Key Roles |
|-------|------|-------------|-----------|
| 0 | `phase-00-auth-reference.md` | Login/logout reference for all user types | All |
| 1 | `phase-01-admin-setup.md` | Create users (all types + multi-role), donor organisations, entities | ADMIN |
| 2 | `phase-02-assignment-incidents.md` | Entity assignments + incident creation | COORDINATOR |
| 3 | `phase-03-assessments.md` | Preliminary + rapid assessments (all 6 domain types) | ASSESSOR |
| 4 | `phase-04-verification.md` | Assessment verification, rejection/resubmit, severity check | COORDINATOR |
| 5 | `phase-05-commitments-response-plans.md` | Donor commitments (pre-plan & post-plan), response plans from commitments, commitments from plans | DONOR, RESPONDER, COORDINATOR |
| 6 | `phase-06-delivery-verification.md` | Response deliveries, delivery verification, commitment status updates | RESPONDER, COORDINATOR |
| 7 | `phase-07-coordination-reporting.md` | Incident status changes, dashboard checks, final artefact summary | ALL |

## Simulation Dataset Summary

The simulation creates the following permanent records:

### Users (10)
| Username | Email | Roles |
|----------|-------|-------|
| sim.admin | sim.admin@dms-sim.gov.ng | ADMIN |
| sim.coord | sim.coord@dms-sim.gov.ng | COORDINATOR |
| sim.assessor | sim.assessor@dms-sim.gov.ng | ASSESSOR |
| sim.responder | sim.responder@dms-sim.gov.ng | RESPONDER |
| sim.assessor2 | sim.assessor2@dms-sim.gov.ng | ASSESSOR |
| sim.responder2 | sim.responder2@dms-sim.gov.ng | RESPONDER |
| sim.multirole | sim.multirole@dms-sim.gov.ng | ASSESSOR + COORDINATOR + RESPONDER + DONOR |
| sim.donor1 | sim.donor1@redcross-sim.org | DONOR (Red Cross Sim) |
| sim.donor2 | sim.donor2@unicef-sim.org | DONOR (UNICEF Sim) |
| sim.donor3 | sim.donor3@govt-aid-sim.gov.ng | DONOR (Govt Aid Sim) |

### Entities (8)
- 2 COMMUNITY entities
- 2 WARD entities
- 1 LGA entity
- 1 CAMP entity
- 1 FACILITY entity
- 1 STATE entity

### Incidents (3)
- Flood disaster (active)
- Armed conflict / displacement (active)
- Disease outbreak (contained)

### Assessments (9+)
- 3 Preliminary Assessments (one per incident)
- 6 Rapid Assessments (HEALTH, WASH, SHELTER, FOOD, SECURITY, POPULATION) across entities/incidents

### Donor Commitments (4+)
- 2 pre-plan commitments (donors commit before response plans exist)
- 2+ post-plan commitments (donors commit to fulfil unfulfilled response plan items)

### Response Plans (3+)
- 1+ created FROM a donor commitment (responder imports commitment)
- 2+ standard response plans (responder creates plan, then donors commit to them)

### Response Deliveries (3+)
- Deliveries linked to commitments (auto-updating commitment status)
- Deliveries with manual coordinator verification
- At least one rejected delivery (then resubmitted)
