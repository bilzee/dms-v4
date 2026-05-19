# Project Documentation Index

> Disaster Response Management System (dms-v4-bmad-v6)
> Generated: 2026-05-18 | Scan Level: Deep

## Project Overview

- **Type:** Monolith (single-part Next.js full-stack application)
- **Primary Language:** TypeScript 5.5
- **Framework:** Next.js 14.2.5 (App Router)
- **Architecture:** Layered component-based with offline-first PWA

## Quick Reference

- **Tech Stack:** Next.js 14 + React 18 + TypeScript + Tailwind CSS + Prisma + PostgreSQL
- **Entry Point:** `src/app/layout.tsx` (root) / `src/app/page.tsx` (home)
- **Architecture Pattern:** Monolithic full-stack with versioned REST API
- **API:** 128 endpoints under `/api/v1/`
- **Database:** 27 models, 15 enums (PostgreSQL + Prisma)
- **Components:** 177 components, 59 pages across 6 role groups
- **State:** 9 Zustand stores + React Query (TanStack)
- **Offline:** PWA + Dexie (IndexedDB) + sync engine

## Generated Documentation

| Document | Description |
|---|---|
| [Project Overview](./project-overview.md) | Project identity, purpose, capabilities, and scale |
| [Architecture](./architecture.md) | Full architecture: tech stack, patterns, data, API, offline, auth, testing, deployment |
| [Source Tree Analysis](./source-tree-analysis.md) | Annotated directory tree with entry points and integration flows |
| [API Contracts](./api-contracts.md) | All 128 REST API endpoints across 27 resource groups |
| [Data Models](./data-models.md) | 27 Prisma models, 15 enums, relationships, and design patterns |
| [Component Inventory](./component-inventory.md) | 177 UI components across 17 categories, 59 pages by role |
| [Development Guide](./development-guide.md) | Setup, commands, conventions, patterns, and deployment |

## Existing Documentation (BMad Artifacts)

### Planning Artifacts (`_bmad-output/planning-artifacts/`)

| Document | Description |
|---|---|
| [PRD](../_bmad-output/planning-artifacts/prd/index.md) | Product Requirements Document (11 sections) |
| [Architecture](../_bmad-output/planning-artifacts/architecture/index.md) | Architecture specification (13+ sections) |
| [Design System](../_bmad-output/planning-artifacts/design-system/index.md) | Component library, UX principles, wireframes |

### Implementation Artifacts (`_bmad-output/implementation-artifacts/`)

30+ story files covering Epics 1-10:
- Epic 1: PWA, sync, conflict resolution
- Epic 2: Auth, roles, entity assignment
- Epic 3: Assessments (preliminary + rapid)
- Epic 4: Response planning, delivery, verification
- Epic 5: Donor portal, commitments, gamification
- Epic 6: Verification queue, auto-approval
- Epic 7: Dashboards (3-panel, situation awareness)
- Epic 8: Incident management
- Epic 10: Reports and exports

## Getting Started

1. **New to the project?** Start with [Project Overview](./project-overview.md)
2. **Setting up locally?** Follow [Development Guide](./development-guide.md)
3. **Understanding the API?** See [API Contracts](./api-contracts.md)
4. **Database schema?** Check [Data Models](./data-models.md)
5. **Finding components?** Browse [Component Inventory](./component-inventory.md)
6. **Architecture deep-dive?** Read [Architecture](./architecture.md)

## AI-Assisted Development

When using AI tools (Claude, Copilot, etc.) for development:

- **For new features:** Reference [Architecture](./architecture.md) + [Development Guide](./development-guide.md) for patterns
- **For API changes:** Check [API Contracts](./api-contracts.md) for existing endpoints and conventions
- **For database changes:** Review [Data Models](./data-models.md) for schema and migration patterns
- **For UI work:** Consult [Component Inventory](./component-inventory.md) for existing components and design system
- **For brownfield PRD:** Use this index.md as the primary entry point for the PRD workflow
