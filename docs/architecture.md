# Disaster Response Management System (DMS) - Architecture Documentation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Data Architecture](#4-data-architecture)
5. [API Design](#5-api-design)
6. [Component Architecture](#6-component-architecture)
7. [State Management Strategy](#7-state-management-strategy)
8. [Offline & Synchronization Architecture](#8-offline--synchronization-architecture)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Testing Strategy](#10-testing-strategy)
11. [Deployment Architecture](#11-deployment-architecture)

---

## 1. Executive Summary

The Disaster Response Management System (DMS) is a Progressive Web Application (PWA) designed for disaster response coordination in the Nigerian emergency management context. The system provides offline-first data collection capabilities, multi-role access control, real-time situational dashboards, and field-level data synchronization between field operatives and centralized coordination centers.

The application is built as a monolithic full-stack Next.js solution with a layered component-based architecture. It supports five distinct user roles -- Assessor, Coordinator, Responder, Donor, and Administrator -- each with dedicated interfaces and workflows. The offline-first design ensures uninterrupted field operations in areas with limited or intermittent network connectivity, with a robust synchronization engine that handles conflict detection and resolution when connectivity is restored.

Key architectural characteristics include:

- **Offline-First Design**: Service worker caching combined with IndexedDB storage via Dexie enables full offline operation for field data collection.
- **Layered Architecture**: Clear separation between presentation, state management, API routing, business logic, and data persistence layers.
- **Role-Based Access Control**: Five-role system with hierarchical permissions governing access to features and data.
- **Real-Time Dashboards**: Interactive dashboards with map visualization, gap analysis, and situational awareness panels.
- **128 REST API Endpoints**: Comprehensive API surface organized into 27 resource groups.
- **27 Prisma Data Models**: Covering users, entities, incidents, assessments, responses, donors, reports, and synchronization metadata.

---

## 2. Technology Stack

| Category | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.2.5 | Full-stack React framework with server-side rendering |
| Language | TypeScript | 5.5.4 | Type-safe development across the entire stack |
| Frontend | React | 18.3.1 | Component-based UI library |
| Styling | Tailwind CSS | 3.4.6 | Utility-first CSS framework |
| UI Components | Radix UI + shadcn/ui | multiple | Accessible, unstyled component primitives and design system |
| State Management | Zustand | 4.5.5 | Client-side global state management (9 stores) |
| Server State | TanStack React Query | 5.90.2 | Async data fetching, caching, and synchronization |
| Database | PostgreSQL | - | Primary relational data store |
| ORM | Prisma | 6.16.3 | Type-safe database access and migration management |
| Auth | NextAuth.js | 4.24.11 | Authentication, session management, and JWT handling |
| Offline DB | Dexie (IndexedDB) | 4.0.8 | Client-side offline data persistence |
| PWA | next-pwa | 5.6.0 | Service worker generation and offline caching |
| Forms | React Hook Form + Zod | 7.51.5 / 3.23.8 | Form state management and schema validation |
| Maps | Leaflet + react-leaflet | 1.9.4 / 4.2.1 | Interactive map visualization |
| Charts | Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 | Data visualization and charting |
| Export | ExcelJS, PDFKit | - | PDF and Excel report generation |
| Testing (E2E) | Playwright | 1.55.1 | End-to-end browser automation testing |
| Testing (Unit) | Jest + Testing Library | 29.7.0 | Unit and integration testing |
| Deployment | Docker (standalone) | - | Production containerization |

---

## 3. Architecture Overview

### 3.1 Architectural Pattern

The system employs a **layered component-based architecture** built on the Next.js App Router. This pattern organizes the application into distinct layers with clear responsibilities and well-defined boundaries between them.

```
+---------------------------------------------------------------+
|                     Presentation Layer                         |
|   Pages (59 files)  |  Components (177 files)  |  Layouts     |
+---------------------------------------------------------------+
|                     State Layer                                |
|   Zustand Stores (9)  |  React Query (24 hooks)  |  Contexts   |
+---------------------------------------------------------------+
|                     API Layer                                  |
|   Route Handlers (128 endpoints)  |  Middleware  |  Validation |
+---------------------------------------------------------------+
|                     Business Logic Layer                       |
|   Services  |  Utilities  |  Sync Engine  |  Conflict Resolution|
+---------------------------------------------------------------+
|                     Data Access Layer                          |
|   Prisma ORM  |  Dexie (Offline)  |  Migrations              |
+---------------------------------------------------------------+
|                     Infrastructure Layer                       |
|   PostgreSQL  |  Service Worker  |  IndexedDB  |  File System |
+---------------------------------------------------------------+
```

### 3.2 Application Style

The application follows a **monolithic full-stack** deployment model with offline-first capabilities. The Next.js App Router serves both the React frontend and the REST API from a single deployment unit. This approach simplifies deployment and reduces operational overhead while maintaining clear separation of concerns through the layered architecture.

### 3.3 Routing Model

The application uses Next.js App Router file-system-based routing:

```
app/
  (auth)/              -- Authentication routes
    login/
    register/
  (dashboard)/         -- Role-based dashboard routes
    admin/
    assessor/
    coordinator/
    responder/
    donor/
  api/
    v1/                -- REST API endpoints
      auth/
      assessments/
      entities/
      incidents/
      ...
```

The `(auth)` and `(dashboard)` route groups enable shared layouts and middleware for authentication-protected pages. Each role has its own route group with dedicated pages and access controls.

### 3.4 Data Flow

The data flow follows a predictable unidirectional pattern:

```
User Action
    |
    v
React Component
    |
    v
React Query Hook (server state) or Zustand Store (client state)
    |
    v
API Route Handler (/api/v1/...)
    |
    v
Service Layer (business logic)
    |
    v
Prisma ORM (database access)
    |
    v
PostgreSQL

Offline Path:
User Action --> React Component --> Zustand Store --> Dexie (IndexedDB)
                                                          |
                                                    Connectivity Restored
                                                          |
                                                          v
                                                    Sync Engine --> API --> Prisma --> PostgreSQL
```

- **Server state** is managed through React Query, which handles caching, refetching, and optimistic updates.
- **Client state** (UI state, form state, offline queue) is managed through Zustand stores.
- **Offline writes** are queued in Dexie and synchronized through the sync engine when connectivity returns.

---

## 4. Data Architecture

### 4.1 Database Overview

The system uses **27 Prisma models** backed by a PostgreSQL database. The schema covers the full domain of disaster response management, from user management through field assessments to donor coordination and report generation.

### 4.2 Core Domain Models

The data models are organized into the following domain areas:

**User Management:**
- `User` -- Core user accounts with profile information
- `Role` -- Role definitions (ASSESSOR, COORDINATOR, RESPONDER, DONOR, ADMIN)
- `Permission` -- Granular permission definitions
- `RolePermission` -- Many-to-many role-permission mapping
- `AuditLog` -- Immutable audit trail for all significant actions

**Geographic & Organizational Entities:**
- `Entity` -- Polymorphic entity model supporting communities, wards, LGAs (Local Government Areas), facilities, and camps
- `EntityRelationship` -- Hierarchical and lateral relationships between entities

**Incident & Assessment:**
- `Incident` -- Disaster events with type, severity, location, and status tracking
- `PreliminaryAssessment` -- Initial rapid assessments of affected areas
- `Assessment` -- Detailed assessments with six specialized types
- `HealthAssessment` -- Health-specific assessment data
- `WASHAssessment` -- Water, sanitation, and hygiene assessment data
- `ShelterAssessment` -- Shelter and housing assessment data
- `FoodAssessment` -- Food security assessment data
- `SecurityAssessment` -- Security situation assessment data
- `PopulationAssessment` -- Population displacement and demographic data

**Response & Coordination:**
- `Response` -- Response plans linked to incidents and assessments
- `ResponseDelivery` -- Delivery tracking for response commitments
- `DeliveryMedium` -- Delivery method and logistics tracking

**Donor Management:**
- `Donor` -- Donor organizations and individuals
- `Commitment` -- Donor pledges and commitments
- `GapFieldSeverity` -- Severity thresholds for gap analysis fields

**Reporting & Analytics:**
- `Report` -- Generated reports (situation reports, dashboards, custom)
- `DashboardLayout` -- User-customizable dashboard configurations
- `SeverityThreshold` -- Configurable thresholds for severity classification

**Synchronization:**
- `SyncConflict` -- Detected sync conflicts requiring resolution
- `SyncMetadata` -- Timestamps and checksums for sync engine operation

### 4.3 Enumerations

The system defines **15 enums** with a total of **73 values**, providing type-safe enumeration of:

- User roles and statuses
- Entity types and relationship kinds
- Incident types, severities, and statuses
- Assessment types and statuses
- Response statuses and delivery methods
- Report types and formats
- Sync conflict types and resolution strategies

### 4.4 Database Design Principles

- **Primary Keys**: UUIDs for all tables, ensuring globally unique identifiers that support offline sync.
- **JSON Columns**: Used for flexible, semi-structured data such as assessment metadata, custom field values, and sync payloads.
- **Composite Indexes**: Strategic indexes on frequently queried column combinations (e.g., incident status + entity, assessment type + date range).
- **Referential Integrity**: Foreign key constraints enforced at the database level with appropriate cascade rules.
- **Timestamps**: All models include `createdAt` and `updatedAt` fields for audit and sync purposes.
- **Soft Deletes**: Critical entities use status fields rather than hard deletes to preserve data integrity and audit trails.

### 4.5 Schema Management

Database migrations are managed through **Prisma Migrate**, providing:

- Versioned migration files stored in the repository
- Reproducible schema changes across environments
- Type-safe query generation automatically synchronized with the schema
- Seed scripts for development and testing data

---

## 5. API Design

### 5.1 API Overview

The REST API consists of **128 endpoints** organized under the `/api/v1/` prefix. All endpoints follow consistent conventions for authentication, validation, error handling, and response formatting.

### 5.2 Resource Groups

The API is organized into **27 resource groups**:

| Group | Purpose | Key Operations |
|---|---|---|
| `auth` | Authentication | Login, logout, session management |
| `users` | User management | CRUD, role assignment, profile |
| `roles` | Role management | CRUD, permission assignment |
| `permissions` | Permission management | List, check, assign |
| `entities` | Entity management | CRUD, hierarchical queries |
| `entity-assignments` | Entity-role assignments | Assign, unassign, transfer |
| `relationships` | Entity relationships | CRUD, graph traversal |
| `incidents` | Incident management | CRUD, status transitions |
| `assessments` | Assessment management | CRUD, type-specific data |
| `preliminary-assessments` | Rapid assessments | Create, verify, escalate |
| `rapid-assessments` | Quick field assessments | Create, update, submit |
| `responses` | Response planning | CRUD, verification workflow |
| `delivery-media` | Delivery tracking | CRUD, status updates |
| `donors` | Donor management | CRUD, portal access |
| `commitments` | Commitment tracking | CRUD, import, fulfillment |
| `verification` | Verification workflows | Queue management, approval |
| `auto-assignment` | Automatic routing | Configuration, execution |
| `dashboard` | Dashboard data | Aggregated metrics, panels |
| `gap-field-severities` | Gap analysis | Severity calculation, thresholds |
| `severity-thresholds` | Threshold configuration | CRUD, evaluation |
| `reports` | Report generation | Create, export (PDF/Excel) |
| `exports` | Data export | Bulk export, format selection |
| `leaderboard` | Gamification | Rankings, scores, achievements |
| `coordinator` | Coordinator tools | Assignment, overview |
| `sync` | Synchronization | Push, pull, conflict resolution |

### 5.3 Authentication & Middleware

Most API routes are wrapped with a `withAuth` middleware that:

```typescript
function withAuth(handler: NextRequestHandler): NextRequestHandler
```

- Extracts the JWT token from the request headers
- Validates the session via NextAuth.js
- Injects the authenticated user context into the request
- Returns a 401 response for unauthenticated requests
- Returns a 403 response for insufficient permissions

### 5.4 Response Format

All API responses use a standardized `ApiResponse<T>` envelope:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}
```

Paginated endpoints include `meta` fields with pagination metadata. Error responses include a machine-readable `code` and a human-readable `message`.

### 5.5 Validation

Request validation is performed using **Zod schemas** that define the expected shape of request bodies, query parameters, and path parameters. Validation errors return a 422 status with detailed field-level error messages.

---

## 6. Component Architecture

### 6.1 Component Inventory

The application comprises **190+ component files** organized into **17 categories** and **59 page files** distributed across **6 role-based route groups**.

### 6.2 Component Organization

```
components/
  ui/                    -- shadcn/ui design system primitives
    button.tsx
    input.tsx
    dialog.tsx
    ...
  shared/                -- Unified design system component layer
    StatCard.tsx         -- Metric display card (4 variants)
    StatCardGrid.tsx     -- Responsive grid for StatCards
    StatusBadge.tsx      -- Domain-aware status indicators
    FormCard.tsx         -- Standardized form container (3 variants)
    FormActionBar.tsx    -- Form action buttons (submit/cancel)
    FilterPanel.tsx      -- Collapsible filter configuration
    FilterBar.tsx        -- Active filter chips display
    ContentSkeleton.tsx  -- Loading state skeletons (5 presets)
    ErrorAlert.tsx       -- Error display with retry
    ProgressBar.tsx      -- Progress indicator (5 variants, 3 sizes)
    DataCardList.tsx     -- Card list layout component
    DataCardGrid.tsx     -- Responsive card grid component
    DataTable.tsx        -- Table with sorting/filtering
    SafeDataLoader.tsx   -- Error-safe data fetching wrapper
    EmptyState.tsx       -- Empty state displays
    RoleBasedRoute.tsx   -- Role-based route guard
    AppShell.tsx         -- Main application shell layout
  forms/                 -- Form components with validation
    assessment-forms/
    entity-forms/
    incident-forms/
  dashboards/            -- Dashboard panels and widgets
    crisis/              -- Crisis management dashboards
    situation/           -- Situation awareness dashboards
  maps/                  -- Map visualization components
    interactive-map.tsx
    gap-analysis-map.tsx
  offline/               -- Offline-aware components
    offline-guard.tsx
    offline-indicator.tsx
    sync-indicator.tsx
    sync-queue.tsx
  layout/                -- Layout and navigation components
```

```
lib/utils/
  status-colors.ts       -- Centralized status-to-color mapping
  design-tokens.ts       -- Design token constants
  chart-config.ts        -- Chart.js centralized colors and options
  chart-registration.ts  -- Single Chart.js module registration
```

### 6.3 Page Organization

Pages are organized by role, each group with its own layout and navigation:

```
app/
  (auth)/
    login/page.tsx
    register/page.tsx
  (dashboard)/
    admin/
      page.tsx           -- Admin dashboard
      users/page.tsx     -- User management
      roles/page.tsx     -- Role management
    assessor/
      page.tsx           -- Assessor dashboard
      assessments/       -- Assessment workflows
      entities/          -- Entity views
    coordinator/
      page.tsx           -- Coordinator dashboard
      incidents/         -- Incident management
      responses/         -- Response planning
    responder/
      page.tsx           -- Responder dashboard
      deliveries/        -- Delivery tracking
    donor/
      page.tsx           -- Donor dashboard
      commitments/       -- Commitment tracking
```

### 6.4 Design System

The UI is built on a **unified design system** layered on top of shadcn/ui, combining Radix UI primitives with Tailwind CSS styling and a centralized token system.

#### Foundation Layer

- **Accessibility**: All components meet WCAG 2.1 AA standards through Radix UI primitives.
- **Consistency**: Centralized design tokens (`status-colors.ts`, `design-tokens.ts`) ensure uniform colors, spacing, typography, and shadows.
- **Composability**: Small, focused components that compose into larger interfaces.
- **Theme Support**: CSS custom properties for light and dark theme variants, with chart colors adapting to theme via `chart-config.ts`.
- **Responsive**: Mobile-first responsive design with breakpoints for field tablet and desktop use.
- **Toast System**: Sonner for notifications (replaces Radix Toast), configured with `richColors`, `position="top-right"`, `closeButton`, and `duration={4000}`.

#### Component Families

| Family | Components | Purpose |
|--------|-----------|----------|
| Data Display | StatCard, StatCardGrid, StatusBadge, ProgressBar | Metrics, status indicators, progress |
| Forms | FormCard, FormActionBar | Standardized form containers and actions |
| Filtering | FilterPanel, FilterBar, DataTable | Data filtering and tabular display |
| Layout | DataCardList, DataCardGrid, DataTable | Responsive list/grid/table layouts |
| Loading/Error | ContentSkeleton, ErrorAlert, SafeDataLoader | Loading, error, and empty states |
| Charts | chart-config.ts, chart-registration.ts | Centralized Chart.js configuration |

#### Design Tokens

- **Status Colors**: Domain-aware color mapping (e.g., verification statuses, commitment statuses, priority levels) via `status-colors.ts`
- **Chart Colors**: Semantic color palette (primary, success, warning, danger, neutral) with dark mode support via `chart-config.ts`
- **Component Variants**: Consistent variant systems (e.g., StatCard has 4 variants, ProgressBar has 5 variants and 3 sizes, FormCard has 3 variants)

### 6.5 Key Component Patterns

**Form Components with FormCard:**

Forms use `FormCard` as their container (replacing raw Card usage) with `FormActionBar` for submit/cancel actions. This provides consistent form layout, title/description headers, and 2-column grid support. Forms still use React Hook Form with Zod schemas for runtime validation.

Example:
```tsx
<FormCard title="Create Entity" description="..." variant="default" columns={2}>
  <form onSubmit={handleSubmit(onSubmit)}>
    {/* form fields */}
    <FormActionBar submitLabel="Create" loading={isSubmitting} />
  </form>
</FormCard>
```

**Loading States with ContentSkeleton:**

Pages use `ContentSkeleton` with 5 presets (card, table, list, metric, form) instead of raw `animate-pulse` divs. This ensures consistent loading states across the application.

Example:
```tsx
{isLoading ? <ContentSkeleton variant="table" rows={5} /> : <DataTable ... />}
```

**Error Handling with ErrorAlert:**

Pages use `ErrorAlert` for error states with optional retry button, replacing inline error divs.

**Status Indicators with StatusBadge:**

Domain-aware status display using `StatusBadge` with centralized color mapping from `status-colors.ts`. Supports verification statuses, commitment statuses, priority levels, and more.

**Metrics Display with StatCard:**

Dashboard metrics use `StatCard` with 4 variants (default, success, warning, danger), optional trend indicators, and `StatCardGrid` for responsive layout.

**Charts with Centralized Configuration:**

Chart.js components use `chart-config.ts` for colors (with dark mode support) and `chart-registration.ts` for single-point module registration. Use `getChartColor()` and `getChartBgColor()` instead of hardcoded RGB values.

**Dashboard Panels:**

Dashboard components follow a panel-based layout pattern where each panel is an independent, composable unit that can be configured per-user. Panels fetch their own data via React Query hooks and manage their own loading and error states.

**Role-Based Rendering:**

Components use a role-checking pattern to conditionally render features based on the authenticated user's role. This is implemented through both hook-based checks and wrapper components.

---

## 7. State Management Strategy

### 7.1 Dual State Architecture

The application uses a dual state management strategy that separates concerns based on data origin and lifecycle:

```
Server State (React Query)          Client State (Zustand)
    |                                     |
    +-- API responses                     +-- UI state
    +-- Cached data                       +-- Form state (transient)
    +-- Optimistic updates                +-- Offline queue
    +-- Background refetching             +-- Dashboard layouts
    +-- Pagination state                  +-- Sync status
    +-- Cache invalidation                +-- Map viewport
```

### 7.2 React Query (Server State)

TanStack React Query manages all server-derived state with **24 custom hooks** covering:

- Data fetching with automatic caching and background refetching
- Optimistic updates for immediate UI feedback
- Cache invalidation strategies for data consistency
- Pagination and infinite scrolling patterns
- Error handling with automatic retry logic
- Polling for near-real-time data refresh

Example hook categories:

| Hook Category | Purpose | Examples |
|---|---|---|
| Assessment hooks | Assessment CRUD operations | `useAssessments`, `useCreateAssessment` |
| Entity hooks | Entity queries and mutations | `useEntities`, `useEntityTree` |
| Incident hooks | Incident management | `useIncidents`, `useUpdateIncident` |
| Dashboard hooks | Aggregated dashboard data | `useDashboardMetrics`, `useGapAnalysis` |
| Sync hooks | Synchronization operations | `useSyncStatus`, `usePushChanges` |

### 7.3 Zustand Stores (Client State)

Nine dedicated Zustand stores manage client-side state:

| Store | Purpose |
|---|---|
| `auth` | Authentication state, current user, role, permissions |
| `dashboardLayout` | User-customizable dashboard panel arrangement |
| `entity` | Selected entity, entity tree expansion state |
| `export` | Export progress, format selection, download state |
| `incident` | Selected incident, filter state, map viewport |
| `offline` | Online/offline status, pending operations count |
| `preliminary-assessment` | Assessment form state, step tracking, draft management |
| `sync` | Sync queue status, conflict count, last sync timestamp |
| `verification` | Verification queue state, selected item, filters |

Zustand was selected for its minimal boilerplate, TypeScript support, and ability to create independent stores with fine-grained subscriptions. Each store follows a consistent pattern:

```typescript
interface StoreState {
  data: StoreData
  isLoading: boolean
  error: Error | null
}

interface StoreActions {
  setData: (data: StoreData) => void
  reset: () => void
}
```

### 7.4 State Synchronization

The interaction between React Query and Zustand is carefully managed:

- **React Query** is the source of truth for server-derived data. Components read from React Query cache and trigger mutations through React Query hooks.
- **Zustand** stores hold transient UI state that does not persist on the server. When server data influences client state (e.g., selecting an entity from a fetched list), the component reads from React Query and writes the selection to the Zustand store.
- **Offline transitions** are handled by writing mutations to the Zustand sync store when offline, then replaying them through React Query mutations when connectivity returns.

---

## 8. Offline & Synchronization Architecture

### 8.1 Offline-First Design Philosophy

The DMS is designed for field deployment in areas with unreliable network connectivity. The offline-first architecture ensures that all critical data collection and review workflows function without network access, with seamless synchronization when connectivity is restored.

### 8.2 Service Worker Caching

The service worker, generated by **next-pwa**, implements multiple caching strategies:

| Strategy | Applied To | Behavior |
|---|---|---|
| NetworkFirst | API calls (`/api/v1/`) | Attempt network, fall back to cache. Ensures fresh data when online. |
| StaleWhileRevalidate | Entity data, configuration | Serve from cache immediately, update in background. |
| CacheFirst | Static assets, images, fonts | Serve from cache, update on cache miss. Long TTL. |
| Precache | App shell, critical pages | Cached at service worker install time for instant loading. |

### 8.3 IndexedDB via Dexie

Client-side offline data persistence uses **Dexie** on top of IndexedDB:

- **Encrypted Storage**: Sensitive data is encrypted before storage in IndexedDB.
- **Structured Tables**: Dexie provides typed table access with indexing and querying capabilities comparable to a lightweight database.
- **Offline Queue**: Write operations performed while offline are stored in a dedicated queue table with metadata for replay.
- **Data Snapshots**: Frequently accessed reference data (entities, configuration) is cached for offline access.

### 8.4 Synchronization Engine

The sync engine manages bidirectional data synchronization between the client and server:

```
Client (Offline)                        Server
    |                                      |
    v                                      |
Dexie Queue                               |
    |                                      |
    v                                      |
Sync Engine (on reconnect)                |
    |                                      |
    +-- Push Phase ----------------------->|
    |   (batch queued operations)          |
    |                                      v
    |                                  Conflict Detection
    |                                      |
    |                                      v
    |                              Conflict Resolution
    |                              (server-wins, client-wins, merge)
    |                                      |
    |<---------- Pull Phase ---------------+
    |   (server state since last sync)     
    |                                      |
    v                                      |
Dexie Cache Updated                       |
    |                                      |
    v                                      |
React Query Cache Invalidated             |
    |                                      |
    v                                      |
UI Refreshed                              |
```

**Push Phase:**
- The sync engine reads all queued operations from Dexie.
- Operations are batched and sent to the `/api/v1/sync/push` endpoint.
- Each operation includes a client timestamp, operation type, and payload.

**Pull Phase:**
- After a successful push, the client requests all changes since its last sync timestamp from `/api/v1/sync/pull`.
- The server returns a delta of changes with server timestamps.
- The client merges these changes into Dexie and invalidates React Query caches.

### 8.5 Conflict Detection & Resolution

The sync engine detects conflicts when the same record has been modified on both the client and server:

- **Conflict Detection**: Server-side comparison of client timestamps against the last known modification timestamp. If the server record has been modified after the client's last pull, a conflict is flagged.
- **Resolution Strategies**:
  - **Server Wins**: Default for authoritative data (e.g., verified assessments).
  - **Client Wins**: Default for field-collected data where the field operative has the most current information.
  - **Manual Merge**: For complex conflicts, the system queues the conflict for manual resolution through the coordinator interface.
- **Conflict Storage**: Detected conflicts are stored in the `SyncConflict` model with full context for both versions.

### 8.6 Offline-Aware UI Components

Several components provide offline awareness to the user interface:

- **OfflineGuard**: Wraps routes or components that require connectivity, displaying an appropriate message when offline.
- **OfflineIndicator**: Persistent UI indicator showing current online/offline status.
- **SyncIndicator**: Displays sync progress, pending operation count, and last successful sync time.
- **SyncQueue**: Administrative view of pending sync operations with the ability to inspect and manage queued items.

### 8.7 Auto-Sync Configuration

- **Interval-Based**: Configurable auto-sync interval (default: 5 minutes when online).
- **Connectivity-Triggered**: Automatic sync initiated immediately when connectivity is restored.
- **Manual Trigger**: Users can manually initiate sync from the sync indicator.
- **Selective Sync**: Priority-based sync ordering ensures critical data (new assessments, incident updates) syncs before lower-priority data.

---

## 9. Authentication & Authorization

### 9.1 Authentication Architecture

Authentication is implemented using **NextAuth.js** with JWT-based session management:

```
User Credentials
    |
    v
NextAuth.js (Credentials Provider)
    |
    v
Credential Verification (bcrypt password comparison)
    |
    v
JWT Token Generation (signed, with role and permissions)
    |
    v
Session Cookie (httpOnly, secure, SameSite=Strict)
    |
    v
Subsequent Requests (token in Authorization header or cookie)
    |
    v
withAuth Middleware (token validation on API routes)
```

### 9.2 Role System

The system defines **five user roles**, each representing a distinct operational function:

| Role | Description | Primary Functions |
|---|---|---|
| **ADMIN** | System administrator | User management, role assignment, system configuration, all data access |
| **ASSESSOR** | Field assessment operative | Create and submit assessments, view assigned entities, offline data collection |
| **COORDINATOR** | Operations coordinator | Incident management, assignment routing, verification workflows, response planning |
| **RESPONDER** | Response delivery agent | View response assignments, update delivery status, document delivery |
| **DONOR** | Donor organization representative | View commitments, update pledge status, access donor dashboard |

### 9.3 Permission Model

The authorization system follows a **role-permission** model:

- **Permissions** are granular access rights (e.g., `assessment:create`, `incident:update`, `report:export`).
- **Roles** are collections of permissions. Each role has a predefined set of permissions appropriate to its function.
- **Role-Permission Mapping** is stored in the database, allowing administrators to customize permissions per role without code changes.
- **Route-Level Enforcement**: The `withAuth` middleware checks permissions at the API route level.
- **Component-Level Enforcement**: UI components conditionally render based on the current user's permissions using a `usePermissions` hook.

### 9.4 Session Management

- **JWT Tokens**: Signed with a server-side secret, containing user ID, role, and permissions.
- **Token Expiry**: Configurable expiration period with automatic refresh.
- **Secure Cookies**: Session tokens stored in httpOnly, secure, SameSite cookies.
- **Logout**: Server-side token invalidation and client-side cleanup including Dexie cache clearing.

### 9.5 Entity Assignment

Beyond role-based access, the system implements **entity-level access control**:

- Assessors are assigned to specific geographic entities (communities, wards, LGAs).
- Coordinators have access to entities within their operational area.
- Responders are assigned to specific response deliveries.
- This ensures that field operatives can only access and modify data within their assigned area of operation.

---

## 10. Testing Strategy

### 10.1 Testing Pyramid

The testing strategy follows a layered approach:

```
            /  E2E Tests (Playwright)  \
           /   Critical user workflows   \
          /   Story-specific scenarios     \
         /__________________________________\
        /  Integration Tests (Jest)          \
       /   API route handlers                 \
      /   Service layer functions              \
     /__________________________________________\
    /  Unit Tests (Jest + Testing Library)       \
   /   Component rendering                        \
  /   Utility functions                            \
 /   State management logic                         \
/____________________________________________________\
```

### 10.2 End-to-End Testing (Playwright)

**Playwright** is used for end-to-end testing with the following test categories:

- **Smoke Tests**: Verify core application functionality -- login, navigation, data display, and basic CRUD operations across all user roles.
- **Story-Specific Tests**: Each user story has corresponding E2E tests that validate the acceptance criteria. Tests are named according to the story ID (e.g., `story-5.1-donor-registration`).
- **Cross-Browser**: Tests run against Chromium (primary), with Firefox and WebKit available for compatibility verification.
- **Offline Scenarios**: Specialized tests that simulate network disconnection and verify offline data collection and sync recovery.

### 10.3 Unit & Integration Testing (Jest)

**Jest** with **Testing Library** handles unit and integration testing:

- **Component Tests**: React component rendering, user interactions, and state changes using Testing Library's `render` and `screen` utilities.
- **Hook Tests**: Custom hooks tested with `renderHook` to verify data fetching, caching, and state transitions.
- **Utility Tests**: Pure functions for data transformation, validation, and calculation.
- **API Integration Tests**: Route handler tests that verify request validation, business logic, and response formatting against a test database.

### 10.4 Living Test System

A custom **living test system** provides continuous validation:

- Tests that run against the deployed application to verify ongoing health.
- Automated checks for critical paths that alert on regression.
- Combined with the feature impact analyzer to assess the blast radius of changes.

### 10.5 Regression Prevention

- **Feature Impact Analyzer**: Tool that analyzes code changes and identifies which stories and test scenarios are potentially affected.
- **Baseline Verification**: Snapshot-based verification of API responses and data structures to detect unintended schema changes.
- **Schema Validation Tests**: Automated tests that validate the Prisma schema against expected model structures and relationships.

---

## 11. Deployment Architecture

### 11.1 Containerized Deployment

The application is deployed as a **standalone Docker container** using Next.js standalone output mode:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

### 11.2 Build Configuration

The Next.js build is configured for standalone output:

```javascript
module.exports = {
  output: 'standalone',
  poweredByHeader: false,
}
```

- **Standalone Output**: Produces a minimal server bundle that does not require the full `node_modules` directory, resulting in smaller Docker images.
- **Powered-By Header Disabled**: Removes the `X-Powered-By: Next.js` header for security.

### 11.3 Production Security Headers

The production deployment applies security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`: Configured for the application's specific resource requirements.

### 11.4 Environment Configuration

The application requires the following environment variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_URL` | Application base URL |
| `NEXT_PUBLIC_APP_URL` | Public-facing URL for PWA manifest |

Additional configuration is managed through environment-specific `.env` files and Docker environment variables.

### 11.5 Production Preparation

The project includes scripts for production deployment preparation:

- **Database Migration**: `npx prisma migrate deploy` applies pending migrations.
- **Seed Data**: Optional seed scripts for initial configuration and reference data.
- **Health Checks**: Application health endpoint for container orchestration.
- **Graceful Shutdown**: Signal handling for clean connection draining.

### 11.6 Infrastructure Requirements

| Component | Requirement |
|---|---|
| Runtime | Node.js 20+ |
| Database | PostgreSQL 14+ |
| Memory | Minimum 512MB RAM for the application server |
| Storage | Persistent volume for database; ephemeral for application container |
| Network | Outbound access for PWA service worker updates; inbound on configured port |

---

*This document describes the architecture of the Disaster Response Management System as of the current development state. The architecture is designed to support iterative development, with the layered approach allowing independent evolution of each layer as requirements grow.*
