# Source Tree Analysis

## 1. Overview

This document provides a complete annotated source tree for the Disaster Management System (DMS), a full-stack Next.js application designed to coordinate disaster response operations across northeastern Nigeria. The system is built on the Next.js App Router architecture, using PostgreSQL via Prisma on the backend and Zustand for client-side state management. It supports six role-based workflows (admin, assessor, coordinator, donor, responder, system), offline-first operation via IndexedDB and service workers, and real-time situational awareness dashboards. The API layer follows a versioned convention (`/api/v1/...`) with 25 resource groups covering entities, assessments, incidents, donors, responses, verification, and synchronization.

---

## 2. Annotated Source Tree

```
project-root/
├── src/                                    # Application source code
│   ├── app/                                # Next.js App Router: pages, layouts, and API routes
│   │   ├── api/                            # Backend API route handlers
│   │   │   ├── health/                     # Health check endpoint for monitoring and uptime probes
│   │   │   ├── entities/                   # Legacy non-versioned entity endpoints (pre-v1)
│   │   │   └── v1/                         # Versioned API surface (v1) -- 25 resource groups
│   │   │       ├── assessments/            # Assessment verification and rejection workflows
│   │   │       ├── auth/                   # Authentication: login, logout, me, refresh, profile
│   │   │       ├── auto-assignment/        # Auto-assignment configuration and trigger endpoints
│   │   │       ├── commitments/            # Donor commitment CRUD with assign and notify actions
│   │   │       ├── coordinator/            # Coordinator dashboard statistics aggregation
│   │   │       ├── dashboard/              # Situation dashboard data and resource management
│   │   │       ├── delivery-media/         # Delivery media upload and offline sync
│   │   │       ├── donors/                 # Donor CRUD, metrics, entity links, profile management
│   │   │       ├── entities/               # Entity CRUD, auto-approval, donor links, incident ties
│   │   │       ├── entity-assignments/      # Entity-user assignments, bulk operations, suggestions
│   │   │       ├── exports/                # CSV export, chart export, report export, scheduled exports
│   │   │       ├── gap-field-severities/   # Gap field severity configuration CRUD
│   │   │       ├── incidents/              # Incident CRUD, entity links, assessment summary
│   │   │       ├── leaderboard/            # Donor leaderboard rankings and criteria configuration
│   │   │       ├── permissions/            # Role-based permission enumeration
│   │   │       ├── preliminary-assessments/ # Preliminary assessment CRUD operations
│   │   │       ├── rapid-assessments/      # Rapid assessment CRUD, submit, and priority scoring
│   │   │       ├── relationships/          # Entity-incident relationships, stats, and timeline
│   │   │       ├── reports/                # Report generation, templates, and configurations
│   │   │       ├── responses/              # Response planning, delivery tracking, verification
│   │   │       ├── roles/                  # Role listing endpoint
│   │   │       ├── severity-thresholds/    # Severity threshold configuration CRUD
│   │   │       ├── sync/                   # Offline sync: pull, batch push, conflicts, resolve
│   │   │       ├── users/                  # User CRUD, role assignment, donor account linking
│   │   │       └── verification/           # Verification queues, auto-approval rules, metrics
│   │   ├── (auth)/                         # Authenticated route group -- requires valid session
│   │   │   ├── admin/                      # Admin pages: dashboard, user management, donor overview
│   │   │   ├── assessor/                   # Assessor pages: preliminary and rapid assessment forms
│   │   │   ├── coordinator/                # Coordinator: dashboard, incidents, entities, verification
│   │   │   ├── donor/                      # Donor: dashboard, analytics, entity insights, leaderboard
│   │   │   ├── responder/                  # Responder: planning, responses, delivery documentation
│   │   │   ├── dashboard/                  # Role-agnostic main dashboard
│   │   │   ├── roles/                      # Role switching interface for multi-role users
│   │   │   ├── system/                     # System administration: audit logs, database, settings
│   │   │   └── layout.tsx                  # Authenticated layout with navigation shell
│   │   ├── login/                          # Public login page
│   │   ├── register/                       # Public registration page
│   │   ├── profile/                        # User profile management page
│   │   ├── verification/                   # Verification metrics dashboard
│   │   ├── rapid-assessments/              # Rapid assessments public view
│   │   ├── globals.css                     # Global CSS styles and Tailwind directives
│   │   ├── layout.tsx                      # Root layout -- HTML shell, providers, fonts
│   │   └── page.tsx                        # Root page -- redirects to dashboard or login
│   │
│   ├── components/                         # React UI components organized by domain (17 categories)
│   │   ├── auth/                           # Authentication forms: Login, Register, EditUser
│   │   ├── coordinator/                    # Coordinator views: AssessmentTimeline, EntityAssignment, IncidentMgmt
│   │   ├── dashboards/                     # Dashboard components (43 files across 4 sub-groups)
│   │   │   ├── admin/                      # AuditLogDashboard
│   │   │   ├── crisis/                     # ConflictMgmt, ResourceMgmt, VerificationQueue
│   │   │   ├── situation/                  # 3-panel situational dashboard: map, side panels, executive views
│   │   │   └── shared/exports/             # Shared export components: ExportModal, ExportButton
│   │   ├── delivery/                       # Delivery confirmation and offline sync status indicators
│   │   ├── donor/                          # Donor dashboard, profile, gamification, leaderboard (20 files)
│   │   ├── forms/                          # Domain-specific form components
│   │   │   ├── assessment/                 # 7 assessment type forms: Health, WASH, Food, Shelter, etc.
│   │   │   ├── delivery/                   # Delivery confirmation form and media capture
│   │   │   ├── incident/                   # Incident creation form
│   │   │   └── response/                   # Response planning and commitment import forms
│   │   ├── layouts/                        # Structural layouts: AppShell, Navigation, RoleSwitcher, OfflineLayout
│   │   ├── offline/                        # OfflineGuard component for offline-aware route protection
│   │   ├── providers/                      # React context providers: Auth, Theme, Query
│   │   ├── pwa/                            # PWA install prompt component
│   │   ├── reports/                        # Report builder interface and report management
│   │   ├── response/                       # Response planning dashboard components
│   │   ├── settings/                       # Severity threshold and gap field configuration tables
│   │   ├── shared/                         # Reusable components (17 files): selectors, indicators, routing helpers
│   │   ├── testing/                        # Living documentation dashboard for runtime test visibility
│   │   ├── ui/                             # shadcn/ui base components (29 files): Button, Dialog, Table, etc.
│   │   └── verification/                   # Verification queue, auto-approval config, analytics (13 files)
│   │
│   ├── hooks/                              # Custom React hooks (24 files)
│   │   ├── useAuth.ts                      # Authentication state and session management
│   │   ├── useOffline.ts                   # Online/offline connectivity detection
│   │   ├── useSync.ts                      # Sync engine integration
│   │   ├── useGPS.ts                       # Geolocation position acquisition
│   │   ├── useEntities.ts                  # Entity data fetching (React Query)
│   │   ├── useIncidents.ts                 # Incident data fetching (React Query)
│   │   ├── useIncident.ts                  # Single incident data fetching
│   │   ├── useDonor.ts                     # Donor data fetching
│   │   ├── useDonorMetrics.ts              # Donor performance metrics
│   │   ├── useVerification.ts              # Verification workflow state
│   │   ├── useResponseVerification.ts      # Response verification status
│   │   ├── useResponseVerificationMetrics.ts # Response verification metrics
│   │   ├── useRealTimeVerification.ts      # Real-time verification updates
│   │   ├── useGapAnalysisRealtime.ts       # Real-time gap analysis data
│   │   ├── useRealTimeMonitoring.ts        # Real-time monitoring data stream
│   │   ├── useMapPerformance.ts            # Map rendering optimization
│   │   ├── useTouchGestures.ts             # Touch gesture handling for mobile maps
│   │   ├── usePreliminaryAssessment.ts     # Preliminary assessment state
│   │   ├── useSeverityThresholds.ts        # Severity threshold configuration
│   │   ├── useRoleSession.ts              # Role session management
│   │   ├── useBackgroundSync.ts            # Background sync coordination
│   │   ├── useCollaboration.ts             # Multi-user collaboration state
│   │   └── useConflicts.ts                # Conflict resolution state
│   │
│   ├── lib/                                # Core libraries, services, and infrastructure
│   │   ├── api.ts                          # Authenticated fetch wrappers: apiGet, apiPost, apiPut, apiDelete
│   │   ├── utils.ts                        # Utility functions: cn(), formatNumber()
│   │   ├── auth/                           # Authentication infrastructure (8 files)
│   │   │   ├── auth-options.ts             # NextAuth configuration and providers
│   │   │   ├── config.ts                   # Auth constants and configuration
│   │   │   ├── get-current-user.ts         # Current user resolution from session
│   │   │   ├── middleware.ts               # Auth middleware for route protection
│   │   │   ├── role-check.ts               # Role-based access control checks
│   │   │   ├── service.ts                  # Authentication service layer
│   │   │   ├── token-utils.ts              # JWT token management utilities
│   │   │   └── verify.ts                   # Token and session verification
│   │   ├── services/                       # Business logic services (23 files)
│   │   │   ├── assessment-export.service.ts      # Assessment data export logic
│   │   │   ├── assessment-relationships.service.ts # Assessment-entity relationship management
│   │   │   ├── audit.service.ts                  # Audit trail recording
│   │   │   ├── audit-log.service.ts              # Audit log querying and filtering
│   │   │   ├── commitment.service.ts             # Donor commitment business logic
│   │   │   ├── conflict-export.service.ts        # Conflict data export
│   │   │   ├── database-optimization.service.ts  # Query performance optimization
│   │   │   ├── delivery-media.service.ts         # Delivery media processing
│   │   │   ├── delivery-offline.service.ts       # Offline delivery queue management
│   │   │   ├── entity.service.ts                 # Entity CRUD business logic
│   │   │   ├── entity-assignment.service.ts      # Entity-user assignment logic
│   │   │   ├── gamification.service.ts           # Donor gamification scoring
│   │   │   ├── gap-analysis.service.ts           # Gap analysis computation
│   │   │   ├── gap-field-severity.service.ts     # Gap field severity logic
│   │   │   ├── incident.service.ts               # Incident business logic
│   │   │   ├── leaderboard.service.ts            # Leaderboard ranking computation
│   │   │   ├── preliminary-assessment.service.ts # Preliminary assessment logic
│   │   │   ├── rapid-assessment.service.ts       # Rapid assessment logic
│   │   │   ├── response.service.ts               # Response planning business logic
│   │   │   ├── response-client.service.ts        # Client-side response state
│   │   │   ├── response-offline.service.ts       # Offline response queue
│   │   │   └── verification-broadcast.service.ts # Verification event broadcasting
│   │   ├── sync/                           # Synchronization engine: queue, conflict resolution, merge
│   │   ├── offline/                        # Offline bootstrap: IndexedDB setup, service worker registration
│   │   ├── db/                             # Database clients: Prisma (server) + Dexie (client IndexedDB)
│   │   ├── exports/                        # CSV generation, download management, file streaming
│   │   ├── map/                            # Offline tile caching for Leaflet maps
│   │   ├── reports/                        # Data aggregation engine and report template processor
│   │   ├── validation/                     # Zod validation schemas (8 domain validators)
│   │   │   ├── commitment.ts               # Commitment validation rules
│   │   │   ├── donor.ts                    # Donor validation rules
│   │   │   ├── entity-insights.ts          # Entity insights validation
│   │   │   ├── gamification.ts             # Gamification data validation
│   │   │   ├── incidents.ts                # Incident validation rules
│   │   │   ├── preliminary-assessment.ts   # Preliminary assessment validation
│   │   │   ├── rapid-assessment.ts         # Rapid assessment validation
│   │   │   └── response.ts                # Response validation rules
│   │   ├── config/                         # Network detection and application configuration
│   │   ├── utils/                          # Infrastructure utilities: audit logger, debounce, media manager
│   │   ├── data/                           # Static reference data: Nigeria locations, LGAs, wards
│   │   ├── testing/                        # Living test system for runtime test management
│   │   └── assignment/                     # Auto-assignment algorithm and assignment middleware
│   │
│   ├── stores/                             # Zustand state stores (9 files)
│   │   ├── auth.store.ts                   # Authentication state: user, roles, permissions, sessions
│   │   ├── dashboardLayout.store.ts        # 3-panel dashboard layout: panel sizes, responsive state, map viewport
│   │   ├── entity.store.ts                 # Entity state and user-entity assignments
│   │   ├── export.store.ts                 # Export lifecycle: generation, scheduling, download tracking
│   │   ├── incident.store.ts              # Incident CRUD state and type definitions
│   │   ├── offline.store.ts               # Online/offline status, sync queue depth, pending operations
│   │   ├── preliminary-assessment.store.ts # Preliminary assessment state with offline support
│   │   ├── sync.store.ts                  # Sync engine state: last sync timestamp, conflict count
│   │   └── verification.store.ts          # Dual verification queues (assessment + response)
│   │
│   ├── types/                              # TypeScript type definitions (17 files)
│   │   ├── api.ts                          # API request/response type definitions
│   │   ├── auth.ts                         # Authentication and session types
│   │   ├── assessment-relationships.ts     # Assessment-entity relationship types
│   │   ├── commitment.ts                   # Commitment type definitions
│   │   ├── conflict.ts                     # Conflict resolution types
│   │   ├── donor.ts                        # Donor type definitions
│   │   ├── entity-insights.ts              # Entity analytics and insights types
│   │   ├── gamification.ts                 # Gamification and scoring types
│   │   ├── incident.ts                     # Incident type definitions
│   │   ├── incidents.ts                    # Additional incident-related types
│   │   ├── media.ts                        # Media upload and delivery types
│   │   ├── population-impact.ts            # Population impact calculation types
│   │   ├── preliminary-assessment.ts       # Preliminary assessment types
│   │   ├── rapid-assessment.ts             # Rapid assessment types
│   │   ├── react-leaflet-markercluster.d.ts # Leaflet marker cluster type declarations
│   │   ├── response.ts                     # Response types
│   │   └── response-verification.ts        # Response verification types
│   │       └── verification.ts             # Verification types
│   │
│   ├── providers/                          # React context providers for app-wide state
│   ├── utils/                              # Shared utility functions
│   └── middleware.ts                       # Next.js middleware: route protection and auth checks
│
├── prisma/                                 # Database layer (Prisma ORM)
│   ├── schema.prisma                       # Database schema: 27 models, 15 enums, PostgreSQL target
│   ├── seed.ts                             # Full database seeding script
│   ├── seed-essential.ts                   # Essential/minimal database seeding for development
│   ├── seed-borno-lgas.ts                  # Geographic data seed: Borno State LGAs and wards
│   └── migrations/                         # Prisma migration history
│
├── public/                                 # Static assets served at root: icons, images, manifest
│
├── scripts/                                # Build, deployment, and utility shell/TS scripts
│
├── tests/                                  # Test suites: E2E (Playwright), unit (Jest), integration
│
├── _bmad-output/                           # BMad framework planning and implementation artifacts
│   ├── planning-artifacts/                 # PRD, architecture decisions, design system specifications
│   └── implementation-artifacts/           # User story files (30+) with acceptance criteria
│
├── _bmad/                                  # BMad framework configuration, agent definitions, workflows
│
├── docs/                                   # Project documentation: guides, analysis, testing references
│
├── next.config.js                          # Next.js configuration with PWA plugin integration
├── pwa.config.js                           # PWA service worker: caching strategies, offline routes
├── tailwind.config.ts                      # Tailwind CSS: custom theme, design tokens, plugin config
├── tsconfig.json                           # TypeScript: compiler options, path aliases
├── package.json                            # Dependencies, scripts, and package metadata
├── jest.config.js                          # Jest configuration for unit tests
├── playwright.config.ts                    # Playwright configuration for E2E tests
├── docker-compose.production.yml           # Production Docker Compose: app, PostgreSQL, networking
└── Dockerfile.production                   # Multi-stage production Docker image build
```

---

## 3. Critical Directories Summary

| Directory | Purpose | Key Files |
|---|---|---|
| `src/app/api/v1/` | Backend API surface -- all REST endpoints | 25 route group directories |
| `src/app/(auth)/` | Authenticated page routes by role | 8 role-based section directories |
| `src/components/dashboards/` | Dashboard UI components | `situation/`, `crisis/`, `admin/`, `shared/exports/` |
| `src/components/forms/` | Domain-specific data entry forms | `assessment/` (7 forms), `delivery/`, `incident/`, `response/` |
| `src/components/ui/` | Base UI component library (shadcn/ui) | 29 component files |
| `src/hooks/` | Custom React hooks for state and data | `useAuth.ts`, `useEntities.ts`, `useSync.ts` |
| `src/lib/services/` | Server-side business logic | 23 service files covering all domains |
| `src/lib/auth/` | Authentication and authorization | `auth-options.ts`, `middleware.ts`, `role-check.ts` |
| `src/lib/validation/` | Input validation schemas (Zod) | 8 domain validator files |
| `src/lib/sync/` | Offline synchronization engine | Queue, conflict resolution, merge logic |
| `src/stores/` | Client-side state management (Zustand) | 9 store files |
| `src/types/` | Shared TypeScript type definitions | 17 type definition files |
| `prisma/` | Database schema and migrations | `schema.prisma`, `seed.ts`, `migrations/` |

---

## 4. Entry Points

| Entry Point | File | Role |
|---|---|---|
| Root Layout | `src/app/layout.tsx` | HTML shell, global providers (Auth, Theme, QueryClient), font loading |
| Root Page | `src/app/page.tsx` | Redirects authenticated users to dashboard, unauthenticated to login |
| Authenticated Layout | `src/app/(auth)/layout.tsx` | Navigation shell with role-based sidebar, offline indicator |
| API Gateway | `src/app/api/v1/` | All backend endpoints served by Next.js route handlers |
| Middleware | `src/middleware.ts` | Route-level auth checks, redirects unauthenticated requests |
| Database Schema | `prisma/schema.prisma` | ORM schema definition, migration source of truth |
| PWA Configuration | `pwa.config.js` | Service worker caching rules, offline fallback routes |

---

## 5. Integration Points

The system uses Next.js API routes as a monolithic integration layer where the frontend and backend share a single deployment. Data flows through the following path:

**Client to Server:**
- React components call hooks (`src/hooks/`)
- Hooks use authenticated fetch wrappers (`src/lib/api.ts`)
- Requests hit Next.js API route handlers (`src/app/api/v1/`)
- Route handlers invoke business logic services (`src/lib/services/`)
- Services interact with the database through Prisma (`src/lib/db/`, `prisma/schema.prisma`)

**Offline Path:**
- Components read/write to Zustand stores (`src/stores/`)
- Stores persist to IndexedDB via Dexie (`src/lib/db/`)
- The sync engine (`src/lib/sync/`) batches offline changes
- The sync API endpoint (`src/app/api/v1/sync/`) reconciles server-side

**Authentication:**
- Login/register pages submit to `/api/v1/auth/`
- NextAuth issues JWTs managed in `src/lib/auth/`
- Middleware (`src/middleware.ts`) validates tokens on every request
- Client-side auth state held in `src/stores/auth.store.ts`

**External Integrations:**
- PWA service worker (`pwa.config.js`) manages offline tile caching for maps
- Media uploads flow through `/api/v1/delivery-media/` to the file system

---

## 6. Key Observations

1. **Monolithic architecture with clear separation.** The entire application is a single Next.js project, but concerns are cleanly divided: `components/` for UI, `hooks/` for data binding, `lib/services/` for business logic, and `app/api/` for HTTP handling.

2. **Versioned API convention.** All primary endpoints live under `/api/v1/`, with a legacy `/api/entities/` directory predating the versioning convention. This allows future API versions without breaking existing clients.

3. **Offline-first design.** The system has a substantial offline infrastructure: IndexedDB via Dexie, a sync engine with conflict resolution, offline-tolerant Zustand stores, and a PWA service worker. The `offline.store.ts` and `sync.store.ts` coordinate client-side state with server reconciliation.

4. **Role-based route partitioning.** The `(auth)/` route group splits pages into six role-specific sections (admin, assessor, coordinator, donor, responder, system), plus shared dashboard and role-switching pages. This maps directly to the six user roles defined in the Prisma schema.

5. **Heavy service layer.** With 23 service files, the business logic is well-extracted from route handlers. Services cover assessment workflows, gamification, gap analysis, leaderboard computation, verification broadcasting, and offline queuing.

6. **Dual database strategy.** Prisma with PostgreSQL for server-side persistence, and Dexie (IndexedDB) for client-side offline storage. The sync engine bridges these two, handling push/pull cycles and conflict resolution.

7. **Comprehensive type coverage.** Seventeen dedicated type definition files in `src/types/` ensure type safety across the frontend. Zod schemas in `src/lib/validation/` provide runtime validation matching the TypeScript types.

8. **Domain-specific form architecture.** Assessment forms are organized by humanitarian sector (Health, WASH, Food, Shelter, Education, Protection, CCCM), reflecting the system's origin in disaster response coordination for northeastern Nigeria.

9. **Component density in dashboards.** With 43 files, the dashboard component directory is the largest single category, reflecting the system's emphasis on situational awareness and the 3-panel crisis dashboard as the primary operational interface.

10. **BMad artifact retention.** The `_bmad-output/` and `_bmad/` directories contain planning artifacts (PRD, architecture decisions) and 30+ user story files. These represent the development methodology artifacts and are not part of the runtime application.
