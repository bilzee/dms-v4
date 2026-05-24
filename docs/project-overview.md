# Disaster Response Management System (DMS)

## 1. Project Identity

| Field | Value |
|---|---|
| **Name** | Disaster Response Management System (dms-v4-bmad-v6) |
| **Type** | Full-stack Progressive Web Application |
| **Domain** | Emergency / Disaster Management |
| **Context** | Built for Nigerian emergency management, specifically for Borno State and surrounding regions |

---

## 2. Purpose and Vision

The Disaster Response Management System is a comprehensive disaster response management platform that enables multi-role coordination for disaster assessment, response planning, donor management, and resource tracking. It supports offline-first field data collection in areas with limited connectivity, making it practical for deployment in regions where network infrastructure is unreliable.

The system is designed to serve the full lifecycle of disaster response: from initial incident reporting and field assessment, through response planning and resource allocation, to delivery verification and donor accountability. By providing role-based access and real-time dashboards, it ensures that every stakeholder -- from field assessors to coordinators to donors -- has the information they need to act decisively.

---

## 3. Key Capabilities

### Multi-Role Access Control
Five distinct roles with granular permissions: Admin, Assessor, Coordinator, Responder, and Donor. Each role has tailored views, workflows, and data access boundaries.

### Assessment Management
Preliminary and rapid assessments spanning six humanitarian sectors:
- Health
- WASH (Water, Sanitation, and Hygiene)
- Shelter
- Food Security
- Security
- Population

Assessments capture field data, classify severity, and feed into the gap analysis system.

### Incident Management
Create, track, and manage disaster incidents with severity classification. Incidents serve as the central organizing entity linking assessments, responses, and donor commitments.

### Response Planning
Plan, deliver, and verify disaster response activities. The response workflow includes donor commitment tracking, delivery documentation, and verification checkpoints to ensure accountability.

### Donor Portal
A dedicated portal for donors featuring registration, commitment management, performance tracking, gamification elements, and leaderboards to encourage timely and complete pledge fulfillment.

### Verification Workflows
Assessment and delivery verification with configurable auto-approval rules. Ensures data quality while reducing administrative bottlenecks for high-trust submissions.

### Situation Awareness Dashboard
An interactive three-panel dashboard providing:
- Incident overview with real-time data
- Entity assessment panels
- Interactive gap analysis maps with geographic visualization

### Offline-First Data Collection
Full offline capability powered by PWA and IndexedDB (Dexie). Field workers can collect and submit data without connectivity. A synchronization engine handles data exchange when connectivity is restored, including conflict resolution for concurrent edits.

### Reporting and Exports
Custom report builder with support for PDF, CSV, and Excel export formats. Includes scheduled report generation for recurring operational needs.

---

## 4. Technology Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.5 |
| **UI** | React 18 + Tailwind CSS + Radix UI/shadcn + Sonner (toasts) |
| **State Management** | Zustand + TanStack React Query |
| **Database** | PostgreSQL + Prisma ORM |
| **Authentication** | NextAuth.js (JWT) |
| **Offline Storage** | PWA + Dexie (IndexedDB) |
| **Maps** | Leaflet |
| **Charts** | Chart.js (centralized configuration via `chart-config.ts`) |
| **Testing** | Playwright + Jest |

---

## 5. Architecture Summary

The application follows a monolithic Next.js full-stack architecture using a layered, component-based pattern.

- **Architecture Type**: Monolithic Next.js full-stack application
- **Design Pattern**: Layered component-based architecture
- **API Layer**: 128 REST endpoints, versioned at `/api/v1/`
- **Data Layer**: 27 database models, 15 enumerations
- **UI Layer**: 193 components across 59 pages, organized into 6 role-based groups
- **Design System**: Unified component layer (StatCard, FormCard, StatusBadge, FilterPanel, etc.) providing consistent UI patterns
- **State Layer**: 9 Zustand stores, 24 custom hooks
- **Service Layer**: 23 backend services

---

## 6. Project Scale

| Metric | Count |
|---|---|
| API Endpoints | 128 |
| Database Models | 27 |
| UI Components | 193 |
| Pages | 59 |
| Custom Hooks | 24 |
| Backend Services | 23 |
| Enumerations | 15 |

---

## 7. Detailed Documentation

The following documents provide in-depth information on specific aspects of the system:

| Document | Description |
|---|---|
| [Architecture](architecture.md) | System architecture, design decisions, and structural overview |
| [API Contracts](api-contracts.md) | REST API endpoint specifications and request/response schemas |
| [Data Models](data-models.md) | Database schema, Prisma models, and entity relationships |
| [Component Inventory](component-inventory.md) | Complete UI component catalog and usage guidelines |
| [Development Guide](development-guide.md) | Setup instructions, coding standards, and development workflows |
| [Source Tree Analysis](source-tree-analysis.md) | Project directory structure and file organization |
