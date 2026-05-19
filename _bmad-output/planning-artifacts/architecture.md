# Disaster Management PWA - Full-Stack Architecture Document
# Part 1: Introduction, Tech Stack & High-Level Architecture

---

## Document Metadata

* **Version:** 1.0
* **Date:** September 30, 2025
* **Author:** Winston (BMad-Method Architect)
* **Status:** Final - Ready for Implementation
* **Optimized For:** LLM-Driven Development with Claude Code
* **Project:** Borno State Disaster Management PWA

---

## Table of Contents - Complete Document

**Part 1: Overview & Foundation** (This Document)
1. Introduction & System Overview
2. Technology Stack
3. High-Level Architecture
4. Project Structure

**Part 2: Data Models & Database**
5. Core Data Models
6. Database Schema (Prisma)
7. Data Relationships

**Part 3: API & Backend Architecture**
8. API Specification
9. Backend Services
10. Synchronization Engine
11. Verification System

**Part 4: Frontend Architecture**
12. Component Architecture
13. State Management
14. Offline Strategy
15. Form Systems

**Part 5: Dashboards & Security**
16. Dashboard Specifications
17. Security Architecture
18. Deployment Strategy

---

## 1. Introduction

### 1.1 System Overview

The Disaster Management PWA is a humanitarian coordination platform for Borno State, Nigeria, enabling structured Assessment → Coordination → Response workflows with offline-first capability. The system serves field workers operating in remote areas with unreliable connectivity, coordinators managing verification workflows, responders documenting aid delivery, and donors tracking commitments.

### 1.2 Architectural Philosophy

**Offline-First, Always**
- 100% core functionality without connectivity
- IndexedDB as primary data store with backend as sync target
- Optimistic UI with background synchronization
- Zero data loss tolerance through multiple persistence layers

**LLM-Optimized Implementation Patterns**
- Consistent file structure and naming conventions
- Explicit TypeScript interfaces for all entities
- Standardized component and API route patterns
- Comprehensive inline documentation for code generation
- Predictable error handling and validation flows

**Progressive Complexity**
- Simple to start, scales with organizational maturity
- Boolean-based gap analysis for MVP (not complex scoring)
- Manual verification with auto-approval configuration
- Last-write-wins conflict resolution (no manual merging)

### 1.3 Key Design Decisions

#### Technology Choices

**Next.js 14 with App Router** (Unchanged)
- Server components for initial load performance
- Client components for offline capability
- Built-in API routes for unified codebase
- Excellent PWA support with next-pwa

**Zustand for State Management** (Unchanged)
- Lightweight (3kb), minimal boilerplate
- TypeScript-friendly with automatic type inference
- Perfect for offline queue and sync status
- Persistence middleware for IndexedDB integration

**Prisma ORM** (Unchanged)
- Type-safe database access with generated types
- Declarative schema as single source of truth
- Migration management for version control
- Excellent performance with PostgreSQL

**Simplified from Original Architecture:**
1. **No BullMQ/Redis** - Removed async job processing complexity
   - Rationale: Response workflow is simpler (just Planned → Delivered)
   - Verification is manual with auto-approval config, not rule engine
   - Media uploads can be synchronous or use Next.js background routes
   
2. **Simplified Response Structure** - Not polymorphic like assessments
   - Responses link to assessments but have simpler data structure
   - Items array with {name, unit, quantity, donor_name, donor_commitment_id}
   - No type-specific response data classes

3. **Auto-Approval Configuration** - Per-entity boolean, not rule engine
   - Simple on/off per entity or global
   - Visual indicators for auto-approved items
   - No override after auto-approval

### 1.4 Architecture Constraints

**Device Reality**
- Mid-range Android devices (minimum Android 7.0)
- Limited CPU/RAM (2GB typical)
- GPS available but may be inaccurate
- Camera quality variable

**Network Reality**
- 2G/3G networks predominant
- Frequent disconnections (minutes to hours)
- High latency when connected (500ms-2s)
- Data costs significant for users

**User Reality**
- Field conditions (dust, heat, rain)
- High-stress disaster scenarios
- Basic smartphone literacy
- Limited technical support

**Data Criticality**
- Human lives depend on accurate data
- Zero tolerance for data loss
- Audit trail required for accountability
- Privacy considerations for affected populations

---

## 2. Technology Stack

### 2.1 Frontend Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Framework | Next.js | 14.2.x | PWA foundation | App Router, built-in PWA support, optimal for LLM development |
| UI Library | React | 18.3.x | Component architecture | Industry standard, extensive ecosystem |
| State Management | Zustand | 4.5.x | Global state & offline queue | Lightweight, persistence-friendly, minimal boilerplate |
| Component Library | Shadcn/ui | Latest | UI components | Copy-paste components, customizable, accessible |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS | Rapid development, consistent design system |
| PWA | next-pwa | 5.6.x | Service worker management | Workbox integration, offline caching |
| Offline Storage | Dexie.js | 4.0.x | IndexedDB wrapper | Simplified offline data management with encryption |
| Forms | React Hook Form | 7.51.x | Form handling | Performance, validation, minimal re-renders |
| Validation | Zod | 3.23.x | Schema validation | Type-safe, Prisma alignment |
| Maps | Leaflet | 1.9.x | Offline mapping | Lightweight, offline tile support |
| Query | TanStack Query | 5.x | Server state | Cache management, automatic refetch |

### 2.2 Backend Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Runtime | Node.js | 20.x LTS | Server runtime | Stable LTS, broad support |
| API Framework | Next.js API Routes | 14.2.x | API endpoints | Unified codebase, serverless-ready |
| Database | Supabase(PostgreSQL) | 16.x | Primary datastore | ACID compliance, JSON support, reliability |
| ORM | Prisma | 5.14.x | Database access | Type safety, migrations, generated types |
| Authentication | NextAuth.js | 4.24.x | Auth management | JWT sessions, flexible providers |
| File Storage | AWS S3 Compatible | Latest | Media storage | Scalable, can use MinIO for self-hosting |
| Monitoring | Sentry | 8.7.x | Error tracking | Production debugging, performance monitoring |

**Removed from Original Architecture:**
- ❌ BullMQ (async job queue) - Not needed for simpler workflow
- ❌ Redis (cache) - Next.js cache + PostgreSQL sufficient for MVP
- ❌ Complex rule engine - Simple boolean auto-approval per entity

### 2.3 Infrastructure & DevOps

| Category | Technology | Purpose |
|----------|------------|---------|
| Deployment | Vercel | Serverless deployment, global CDN, zero-config |
| Database Hosting | Supabase | Managed PostgreSQL with automatic backups |
| Storage | Cloudflare R2 / S3 | Media storage with CDN |
| Monitoring | Sentry | Error tracking and performance monitoring |
| Analytics | Vercel Analytics | Real-time performance metrics |

**Deployment Strategy:**
- Vercel for frontend + API routes (single deployment)
- Managed PostgreSQL (Supabase recommended)
- R2 for media (cheaper than S3, S3-compatible API)
- No containerization needed for MVP (Vercel handles scaling)

---

## 3. High-Level Architecture

### 3.1 System Architecture Diagram

```mermaid
graph TB
    subgraph "Field Devices"
        PWA[PWA Client]
        SW[Service Worker]
        IDB[(IndexedDB)]
        PWA --> SW
        SW --> IDB
    end
    
    subgraph "Vercel Edge Network"
        CDN[CDN/Static Assets]
        EDGE[Edge Functions]
    end
    
    subgraph "Next.js Application"
        SSR[Server Components]
        API[API Routes]
        AUTH[NextAuth.js]
        SYNC[Sync Handler]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL - Supabase)]
        S3[R2/S3 Storage]
    end
    
    subgraph "Monitoring"
        SENTRY[Sentry]
    end
    
    PWA -.->|Offline| IDB
    PWA -->|Online| CDN
    PWA -->|API Calls| EDGE
    EDGE --> API
    API --> AUTH
    API --> SYNC
    API --> PG
    SYNC --> PG
    API --> S3
    API --> SENTRY
```

### 3.2 Architectural Layers

#### 1. Presentation Layer (PWA Client)
**Responsibility:** User interface, offline operation, local data management

**Technologies:** Next.js, React, Zustand, IndexedDB

**Key Features:**
- Role-based dashboards with dynamic navigation
- Offline-capable forms with auto-save
- GPS integration with manual fallback
- Media capture with compression
- Sync queue visualization
- Real-time status indicators

**Critical Paths:**
- Assessment creation: Form → Validation → IndexedDB → Sync Queue
- Response planning: Form → Assessment Link → IndexedDB → Sync Queue
- Role switching: Session Save → Role Change → Session Restore

#### 2. Service Worker Layer
**Responsibility:** Network interception, cache management, background sync

**Technologies:** Workbox (via next-pwa)

**Key Features:**
- Offline page fallback
- Static asset caching (images, CSS, JS)
- API response caching with stale-while-revalidate
- Background sync triggers
- Cache versioning and invalidation

**Caching Strategies:**
- Static assets: CacheFirst (30 days)
- API calls: NetworkFirst (10s timeout, 24h cache)
- Images: CacheFirst with size limits
- Forms: NetworkOnly (never cache POST/PUT)

#### 3. Application Layer (Next.js)
**Responsibility:** Business logic, authentication, API endpoints

**Technologies:** Next.js API Routes, NextAuth.js, Prisma

**Key Features:**
- RESTful API with consistent patterns
- JWT-based authentication with role context
- Role-based authorization middleware
- Request validation with Zod schemas
- Error handling with standardized responses

**API Organization:**
```
/api/v1/
  /auth/          # Authentication endpoints
  /users/         # User management
  /incidents/     # Incident CRUD
  /entities/      # Affected entity management
  /assessments/   # Assessment workflows
  /responses/     # Response workflows
  /verification/  # Verification actions
  /donors/        # Donor management
  /sync/          # Sync endpoints
  /dashboard/     # Dashboard data aggregation
```

#### 4. Synchronization Layer
**Responsibility:** Offline data sync, conflict resolution, queue processing

**Technologies:** Custom sync engine, Prisma transactions

**Key Features:**
- Batch sync operations for efficiency
- Last-write-wins conflict resolution
- Retry logic with exponential backoff
- Sync status tracking per item
- Conflict logging for coordinator review

**Sync Flow:**
1. Client detects online status
2. Retrieves pending items from IndexedDB sync queue
3. Batches items by type (assessments, responses, media)
4. Sends to `/api/v1/sync/push` endpoint
5. Backend validates, detects conflicts, applies changes
6. Returns sync results with new server IDs
7. Client updates IndexedDB with server IDs, clears queue

#### 5. Data Layer
**Responsibility:** Data persistence, file storage, audit trails

**Technologies:** PostgreSQL (Supabase), R2/S3, Prisma

**Key Features:**
- ACID-compliant transactions
- Audit trail for all changes
- Media storage with CDN
- Automated backups (managed by Supabase)
- Point-in-time recovery capability

**Data Flow:**
- Writes: API → Prisma → PostgreSQL
- Reads: API → Prisma → Cache → PostgreSQL
- Media: Upload → API → R2 → CDN URL → Database
- Audit: Trigger → Audit table (automatic)

---

## 4. Project Structure

### 4.1 Directory Organization

```
disaster-management-pwa/
├── prisma/
│   ├── schema.prisma           # Database schema (source of truth)
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Seed data for development
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Protected routes
│   │   │   ├── assessor/      # Assessor role pages
│   │   │   ├── coordinator/   # Coordinator role pages
│   │   │   ├── responder/     # Responder role pages
│   │   │   ├── donor/         # Donor role pages
│   │   │   └── admin/         # Admin role pages
│   │   ├── (public)/          # Public routes
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── api/               # API routes
│   │   │   └── v1/            # API version 1
│   │   │       ├── auth/
│   │   │       ├── assessments/
│   │   │       ├── responses/
│   │   │       ├── verification/
│   │   │       ├── sync/
│   │   │       └── dashboard/
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   │
│   ├── components/
│   │   ├── ui/               # Shadcn/ui components (auto-generated)
│   │   ├── forms/            # Form components
│   │   │   ├── assessment/   # Assessment forms (6 types)
│   │   │   ├── response/     # Response forms
│   │   │   └── fields/       # Reusable field components
│   │   ├── dashboards/       # Dashboard components
│   │   │   ├── crisis/       # Crisis Management Dashboard
│   │   │   ├── situation/    # Situation Awareness Dashboard
│   │   │   └── shared/       # Shared dashboard components
│   │   ├── layouts/          # Layout components
│   │   │   ├── AppShell.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── RoleSwitcher.tsx
│   │   └── shared/           # Shared components
│   │       ├── OfflineIndicator.tsx
│   │       ├── SyncQueue.tsx
│   │       ├── GPSCapture.tsx
│   │       └── MediaUpload.tsx
│   │
│   ├── lib/
│   │   ├── db/              # Database utilities
│   │   │   ├── client.ts    # Prisma client singleton
│   │   │   └── offline.ts   # Dexie.js setup
│   │   ├── auth/            # Authentication utilities
│   │   │   ├── config.ts    # NextAuth configuration
│   │   │   └── middleware.ts # Auth middleware
│   │   ├── sync/            # Sync engine
│   │   │   ├── engine.ts    # Core sync logic
│   │   │   ├── queue.ts     # Queue management
│   │   │   └── conflict.ts  # Conflict resolution
│   │   ├── validation/      # Validation schemas
│   │   │   └── schemas.ts   # Zod schemas
│   │   └── utils/           # Utility functions
│   │       ├── gps.ts
│   │       ├── media.ts
│   │       └── format.ts
│   │
│   ├── stores/              # Zustand stores
│   │   ├── auth.store.ts    # Authentication state
│   │   ├── offline.store.ts # Offline/sync state
│   │   ├── entity.store.ts  # Entity assignment state
│   │   └── ui.store.ts      # UI state (sidebar, modals)
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useOffline.ts
│   │   ├── useSync.ts
│   │   ├── useRole.ts
│   │   └── useGPS.ts
│   │
│   └── types/              # TypeScript definitions
│       ├── entities.ts     # Core entity types
│       ├── api.ts          # API types
│       ├── forms.ts        # Form types
│       └── enums.ts        # Enums
│
├── public/
│   ├── icons/              # PWA icons
│   ├── offline-tiles/      # Cached map tiles
│   └── manifest.json       # PWA manifest
│
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
│
├── .env                   # Environment variables
├── .env.example           # Example environment file
├── next.config.js         # Next.js configuration
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

### 4.2 File Naming Conventions

**Components:**
- PascalCase for component files: `AssessmentForm.tsx`
- Match component name: `export const AssessmentForm`
- Index files for complex components: `AssessmentForm/index.tsx`

**API Routes:**
- Kebab-case for directories: `rapid-assessments/`
- `route.ts` for endpoint files (Next.js convention)
- Group by resource, not by HTTP method

**Stores:**
- Camel case with `.store.ts` suffix: `offline.store.ts`
- Single responsibility per store
- Use store name in hook: `useOfflineStore()`

**Types:**
- Camel case with `.ts` suffix: `entities.ts`
- Group related types by domain
- Export interfaces (not types) for entities

**Hooks:**
- Camel case starting with `use`: `useOffline.ts`
- One hook per file
- Co-locate with related logic when complex

### 4.3 Import Organization

**Standard Import Order:**
```typescript
// 1. External libraries
import { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 3. Internal components
import { AssessmentForm } from '@/components/forms/assessment';

// 4. Stores and hooks
import { useAuthStore } from '@/stores/auth.store';
import { useOffline } from '@/hooks/useOffline';

// 5. Utilities and helpers
import { formatDate } from '@/lib/utils/format';

// 6. Types
import type { Assessment, Entity } from '@/types/entities';
```

---

## Part 1 Summary

This completes Part 1 of the architecture document, covering:
- System overview and architectural philosophy
- Complete technology stack with rationale
- High-level architecture with layer descriptions
- Detailed project structure for implementation

**Key Takeaways for LLM Implementation:**
1. Use Zustand for all client state (not Redux or Context API)
2. Use Prisma schema as single source of truth for data models
3. Follow Next.js 14 App Router conventions strictly
4. Implement offline-first with IndexedDB primary, backend sync
5. Use Shadcn/ui components (not Material-UI or custom CSS)
6. Keep file structure flat within categories (avoid deep nesting)

**Next Documents:**
- Part 2: Core data models and database schema
- Part 3: API specification and backend services
- Part 4: Frontend component architecture
- Part 5: Dashboard specifications and security

---

**Implementation Checklist for Part 1:**
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Install core dependencies (Zustand, Prisma, Dexie, etc.)
- [ ] Set up project directory structure
- [ ] Configure Tailwind CSS and Shadcn/ui
- [ ] Initialize Prisma with PostgreSQL
- [ ] Set up environment variables
- [ ] Configure next-pwa for PWA functionality
- [ ] Create basic layout structure (AppShell, Navigation)


# Part 2: Data Models & Database Schema

---

## 5. Core Data Models

### 5.1 LLM Implementation Notes

**Type Generation Strategy:**
1. Prisma schema is the **single source of truth** for database structure
2. Run `npx prisma generate` to create TypeScript types automatically
3. Share domain types through `src/types/` for frontend-backend consistency
4. Use Zod schemas for runtime validation that mirror Prisma types
5. Never manually duplicate types - always reference generated Prisma types

**Naming Conventions:**
- Database tables: PascalCase singular (e.g., `User`, `RapidAssessment`)
- Fields: camelCase (e.g., `affectedEntityId`, `verificationStatus`)
- Enums: SCREAMING_SNAKE_CASE (e.g., `HEALTH`, `AUTO_VERIFIED`)
- Relations: descriptive names (e.g., `assessments`, `affectedEntity`)

---

## 5.2 Entity Relationship Overview

```mermaid
erDiagram
    User ||--o{ UserRole : has
    Role ||--o{ UserRole : assigned_to
    User ||--o{ RapidAssessment : creates
    User ||--o{ RapidResponse : creates
    User ||--o{ EntityAssignment : assigned
    
    Incident ||--o{ PreliminaryAssessment : triggers
    Incident ||--o{ IncidentEntity : affects
    
    AffectedEntity ||--o{ IncidentEntity : affected_by
    AffectedEntity ||--o{ RapidAssessment : has
    AffectedEntity ||--o{ RapidResponse : receives
    AffectedEntity ||--o{ EntityAssignment : assigned_to
    
    RapidAssessment ||--o{ RapidResponse : generates
    RapidAssessment ||--o{ MediaAttachment : has
    
    RapidResponse ||--o{ MediaAttachment : has
    RapidResponse }o--|| Donor : attributed_to
    
    Donor ||--o{ DonorCommitment : makes
    DonorCommitment }o--|| AffectedEntity : targets
    
    SyncConflict }o--|| RapidAssessment : conflicts_with
    SyncConflict }o--|| RapidResponse : conflicts_with
```

---

## 5.3 Core TypeScript Interfaces

### User & Role Management

```typescript
// src/types/entities.ts

export interface User {
  id: string; // UUID
  email: string;
  username: string;
  passwordHash: string;
  name: string;
  phone?: string;
  organization?: string;
  
  // Relationships
  roles: UserRole[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  isLocked: boolean;
}

export interface Role {
  id: string;
  name: RoleName;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  
  // Relationships
  user: User;
  role: Role;
  
  // Metadata
  assignedAt: Date;
  assignedBy: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string; // e.g., "CREATE_ASSESSMENT"
  category: string; // e.g., "ASSESSMENT", "VERIFICATION"
  description: string;
}

export enum RoleName {
  ASSESSOR = 'ASSESSOR',
  COORDINATOR = 'COORDINATOR',
  RESPONDER = 'RESPONDER',
  DONOR = 'DONOR',
  ADMIN = 'ADMIN'
}
```

### Incident & Preliminary Assessment

```typescript
export interface Incident {
  id: string;
  name: string;
  type: IncidentType;
  subType?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  
  // Dates
  declarationDate: Date;
  containedDate?: Date;
  resolvedDate?: Date;
  
  // Location
  locationCoordinates?: {
    latitude: number;
    longitude: number;
  };
  
  // Impact (aggregated from preliminary assessments)
  affectedPopulation?: number;
  
  // Relationships
  preliminaryAssessments: PreliminaryAssessment[];
  affectedEntities: IncidentEntity[];
  
  // Metadata
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PreliminaryAssessment {
  id: string;
  incidentId?: string; // Nullable - can exist before incident created
  
  // Assessment details
  assessmentDate: Date;
  assessorId: string;
  impactDescription: string;
  initialNeeds: string;
  
  // Trigger incident creation
  canTriggerIncident: boolean;
  
  // Status
  verificationStatus: VerificationStatus;
  
  // Impact data
  livesLost: number;
  injured: number;
  displaced: number;
  housesAffected: number;
  
  // Location
  locationCoordinates: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  lga: string;
  ward: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export enum IncidentType {
  FLOOD = 'FLOOD',
  FIRE = 'FIRE',
  LANDSLIDE = 'LANDSLIDE',
  CYCLONE = 'CYCLONE',
  CONFLICT = 'CONFLICT',
  EPIDEMIC = 'EPIDEMIC',
  OTHER = 'OTHER'
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum IncidentStatus {
  ACTIVE = 'ACTIVE',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED'
}
```

### Affected Entity & Assignment

```typescript
export interface AffectedEntity {
  id: string;
  name: string;
  type: EntityType;
  
  // Location
  locationCoordinates: {
    latitude: number;
    longitude: number;
  };
  lga: string;
  ward: string;
  
  // Population (from latest population assessment)
  population?: number;
  vulnerableCount?: number;
  
  // Auto-approval configuration
  autoApproveEnabled: boolean;
  
  // Camp-specific fields (if type = CAMP)
  campDetails?: {
    campName: string;
    campStatus: 'OPEN' | 'CLOSED';
    coordinatorName: string;
    coordinatorPhone: string;
    supervisorName?: string;
    supervisorOrganization?: string;
  };
  
  // Community-specific fields (if type = COMMUNITY)
  communityDetails?: {
    communityName: string;
    contactPersonName: string;
    contactPersonPhone: string;
    contactPersonRole: string;
    estimatedHouseholds?: number;
  };
  
  // Relationships
  incidents: IncidentEntity[];
  assessments: RapidAssessment[];
  responses: RapidResponse[];
  assignments: EntityAssignment[];
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityAssignment {
  id: string;
  entityId: string;
  userId: string;
  role: AssignmentRole; // ASSESSOR, RESPONDER, DONOR
  
  // Relationships
  entity: AffectedEntity;
  user: User;
  
  // Metadata
  assignedBy: string;
  assignedAt: Date;
  isActive: boolean;
}

export interface IncidentEntity {
  incidentId: string;
  entityId: string;
  
  // Relationships
  incident: Incident;
  entity: AffectedEntity;
  
  // Impact
  affectedDate: Date;
  severityLevel: IncidentSeverity;
}

export enum EntityType {
  CAMP = 'CAMP',
  COMMUNITY = 'COMMUNITY'
}

export enum AssignmentRole {
  ASSESSOR = 'ASSESSOR',
  RESPONDER = 'RESPONDER',
  DONOR = 'DONOR'
}
```

### Rapid Assessment

```typescript
export interface RapidAssessment {
  id: string;
  
  // Links
  entityId: string;
  incidentId: string;
  assessorId: string;
  
  // Assessment metadata
  assessmentType: AssessmentType;
  assessmentDate: Date;
  
  // Status tracking
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  rejectionFeedback?: string;
  syncStatus: SyncStatus;
  
  // Offline tracking
  offlineId?: string; // UUID generated on device
  versionNumber: number;
  
  // Assessment data (type-specific JSON)
  assessmentData: HealthAssessmentData 
    | WashAssessmentData 
    | ShelterAssessmentData 
    | FoodAssessmentData 
    | SecurityAssessmentData 
    | PopulationAssessmentData;
  
  // Media
  mediaAttachments: MediaAttachment[];
  
  // Relationships
  affectedEntity: AffectedEntity;
  incident: Incident;
  assessor: User;
  responses: RapidResponse[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export enum AssessmentType {
  HEALTH = 'HEALTH',
  WASH = 'WASH',
  SHELTER = 'SHELTER',
  FOOD = 'FOOD',
  SECURITY = 'SECURITY',
  POPULATION = 'POPULATION'
}

// Type-specific assessment data structures
export interface HealthAssessmentData {
  // Boolean gap indicators
  hasFunctionalClinic: boolean; // gap if FALSE
  hasEmergencyServices: boolean; // gap if FALSE
  hasMedicalSupplies: boolean; // gap if FALSE
  hasTrainedStaff: boolean; // gap if FALSE
  
  // Quantities
  numberHealthFacilities: number;
  healthFacilityTypes: string[];
  qualifiedHealthWorkers: number;
  commonHealthIssues: string[];
  
  // Additional
  hasMaternalChildServices: boolean;
  additionalDetails?: string;
}

export interface WashAssessmentData {
  // Boolean gap indicators
  isWaterSufficient: boolean; // gap if FALSE
  hasCleanWaterAccess: boolean; // gap if FALSE
  areLatrinesSufficient: boolean; // gap if FALSE
  hasHandwashingFacilities: boolean; // gap if FALSE
  
  // Details
  waterSources: string[];
  waterQuality: 'SAFE' | 'CONTAMINATED' | 'UNKNOWN';
  numberToilets: number;
  toiletTypes: string[];
  hasSolidWasteDisposal: boolean;
  
  additionalDetails?: string;
}

export interface ShelterAssessmentData {
  // Boolean gap indicators
  areSheltersSufficient: boolean; // gap if FALSE
  hasSafeStructures: boolean; // gap if FALSE
  hasWeatherProtection: boolean; // gap if FALSE
  
  // Details
  shelterTypes: string[];
  numberShelters: number;
  shelterCondition: 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  needsRepair: boolean;
  needsTarpaulin: boolean;
  needsBedding: boolean;
  
  additionalDetails?: string;
}

export interface FoodAssessmentData {
  // Boolean gap indicators
  isFoodSufficient: boolean; // gap if FALSE
  hasRegularMealAccess: boolean; // gap if FALSE
  hasInfantNutrition: boolean; // gap if FALSE
  
  // Details
  foodSources: string[];
  availableFoodDurationDays: number;
  additionalFoodRequiredPersons: number;
  additionalFoodRequiredHouseholds: number;
  malnutritionCases: number;
  feedingProgramExists: boolean;
  
  additionalDetails?: string;
}

export interface SecurityAssessmentData {
  // Boolean gap indicators
  isSafeFromViolence: boolean; // gap if FALSE
  hasSecurityPresence: boolean; // gap if FALSE
  hasLighting: boolean; // gap if FALSE
  
  // Details
  securityThreats: string[];
  securityProvider?: string;
  incidentsReported: number;
  restrictedMovement: boolean;
  
  additionalDetails?: string;
}

export interface PopulationAssessmentData {
  // Population breakdown
  totalHouseholds: number;
  totalPopulation: number;
  populationMale: number;
  populationFemale: number;
  populationUnder5: number;
  
  // Vulnerable groups
  pregnantWomen: number;
  lactatingMothers: number;
  personWithDisability: number;
  elderlyPersons: number;
  separatedChildren: number;
  
  // Impact
  numberLivesLost: number;
  numberInjured: number;
  
  additionalDetails?: string;
}

export enum VerificationStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  AUTO_VERIFIED = 'AUTO_VERIFIED',
  REJECTED = 'REJECTED'
}

export enum SyncStatus {
  LOCAL = 'LOCAL',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  CONFLICT = 'CONFLICT',
  FAILED = 'FAILED'
}
```

### Rapid Response

```typescript
export interface RapidResponse {
  id: string;
  
  // Links (immutable after creation)
  assessmentId: string;
  entityId: string;
  responderId: string;
  donorId?: string; // Nullable - may not have donor
  
  // Response metadata
  status: ResponseStatus; // PLANNED or DELIVERED
  plannedDate: Date;
  responseDate?: Date; // Set when status = DELIVERED
  
  // Verification
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  rejectionFeedback?: string;
  syncStatus: SyncStatus;
  
  // Offline tracking
  offlineId?: string;
  versionNumber: number;
  
  // Response items (simplified - not type-specific)
  items: ResponseItem[];
  
  // Media evidence
  mediaAttachments: MediaAttachment[];
  
  // Relationships
  assessment: RapidAssessment;
  affectedEntity: AffectedEntity;
  responder: User;
  donor?: Donor;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ResponseItem {
  name: string;
  unit: string;
  quantity: number;
  donorName?: string; // Can be typed in
  donorCommitmentId?: string; // Link if imported
}

export enum ResponseStatus {
  PLANNED = 'PLANNED',
  DELIVERED = 'DELIVERED'
}
```

### Donor Management

```typescript
export interface Donor {
  id: string;
  organizationName: string;
  contactName: string;
  email: string;
  phone?: string;
  
  // Performance metrics (calculated)
  totalCommitments: number;
  totalDelivered: number;
  selfReportedDeliveryRate: number; // Percentage
  verifiedDeliveryRate: number; // Percentage
  leaderboardRank: number;
  
  // Relationships
  commitments: DonorCommitment[];
  responses: RapidResponse[];
  entityAssignments: EntityAssignment[];
  
  // Metadata
  registrationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DonorCommitment {
  id: string;
  donorId: string;
  entityId: string;
  incidentId: string;
  
  // Commitment details
  commitmentDate: Date;
  items: CommitmentItem[];
  totalValueEstimated?: number;
  
  // Delivery tracking
  deliveryStatus: DeliveryStatus;
  deliveredQuantity: number; // Sum of items
  verifiedDeliveredQuantity: number; // From verified responses
  
  // Relationships
  donor: Donor;
  entity: AffectedEntity;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface CommitmentItem {
  name: string;
  unit: string;
  quantity: number;
  delivered: number; // Tracking partial delivery
}

export enum DeliveryStatus {
  PLANNED = 'PLANNED',
  PARTIAL = 'PARTIAL',
  COMPLETE = 'COMPLETE'
}
```

### Media & Sync Management

```typescript
export interface MediaAttachment {
  id: string;
  
  // Storage
  url?: string; // R2/S3 URL after sync
  localPath?: string; // Local device path before sync
  thumbnailUrl?: string;
  
  // File metadata
  mimeType: string;
  size: number;
  filename: string;
  
  // Capture metadata
  metadata: {
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    timestamp: Date;
    captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
  };
  
  // Links
  assessmentId?: string;
  responseId?: string;
  
  // Sync
  syncStatus: SyncStatus;
  
  // Relationships
  assessment?: RapidAssessment;
  response?: RapidResponse;
  
  // Metadata
  createdAt: Date;
  uploadedAt?: Date;
}

export interface SyncConflict {
  id: string;
  
  // Conflict details
  entityType: 'ASSESSMENT' | 'RESPONSE';
  entityId: string;
  conflictDate: Date;
  
  // Resolution
  resolutionMethod: 'LAST_WRITE_WINS';
  winningVersion: any; // JSON of winning data
  losingVersion: any; // JSON of losing data
  resolvedAt: Date;
  
  // Notification
  coordinatorNotified: boolean;
  coordinatorNotifiedAt?: Date;
  
  // Metadata
  createdAt: Date;
}

export interface OfflineQueueItem {
  id: string; // Local UUID
  type: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityId?: string; // Server ID if updating
  data: any; // The actual data to sync
  retryCount: number;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  createdAt: Date;
  lastAttempt?: Date;
  error?: string;
}
```

### Audit Trail

```typescript
export interface AuditLog {
  id: string;
  userId: string;
  action: string; // e.g., "CREATE_ASSESSMENT", "VERIFY_RESPONSE"
  
  // Entity details
  entityType: string; // e.g., "RapidAssessment"
  entityId: string;
  
  // Changes
  beforeValue?: any; // JSON
  afterValue?: any; // JSON
  
  // Context
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  
  // Relationships
  user: User;
  
  // Metadata
  createdAt: Date;
}
```


---

## 6. Database Schema (Prisma)

### 6.1 Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER MANAGEMENT
// ============================================

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  username     String   @unique
  passwordHash String   @map("password_hash")
  name         String
  phone        String?
  organization String?
  
  // Status
  isActive Boolean @default(true) @map("is_active")
  isLocked Boolean @default(false) @map("is_locked")
  lastLogin DateTime? @map("last_login")
  
  // Relationships
  roles                UserRole[]
  createdAssessments   RapidAssessment[] @relation("AssessorRelation")
  createdResponses     RapidResponse[] @relation("ResponderRelation")
  entityAssignments    EntityAssignment[]
  auditLogs            AuditLog[]
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([email])
  @@index([username])
  @@map("users")
}

model Role {
  id          String   @id @default(uuid())
  name        RoleName @unique
  description String
  
  // Relationships
  userRoles   UserRole[]
  permissions Permission[]
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@map("roles")
}

model UserRole {
  id     String @id @default(uuid())
  userId String @map("user_id")
  roleId String @map("role_id")
  
  // Relationships
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  // Metadata
  assignedAt Date @default(now()) @map("assigned_at")
  assignedBy String @map("assigned_by")
  
  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
  @@map("user_roles")
}

model Permission {
  id          String @id @default(uuid())
  name        String
  code        String @unique
  category    String
  description String
  
  // Relationships
  roles Role[]
  
  @@index([category])
  @@map("permissions")
}

enum RoleName {
  ASSESSOR
  COORDINATOR
  RESPONDER
  DONOR
  ADMIN
}

// ============================================
// INCIDENT MANAGEMENT
// ============================================

model Incident {
  id              String          @id @default(uuid())
  name            String
  type            IncidentType
  subType         String?         @map("sub_type")
  severity        IncidentSeverity
  status          IncidentStatus
  
  // Dates
  declarationDate Date            @map("declaration_date")
  containedDate   DateTime?       @map("contained_date")
  resolvedDate    DateTime?       @map("resolved_date")
  
  // Location (optional - may be wide area)
  locationLat     Float?          @map("location_lat")
  locationLng     Float?          @map("location_lng")
  
  // Impact (aggregated)
  affectedPopulation Int?         @map("affected_population")
  
  // Relationships
  preliminaryAssessments PreliminaryAssessment[]
  affectedEntities       IncidentEntity[]
  
  // Metadata
  createdBy String    @map("created_by")
  updatedBy String?   @map("updated_by")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  
  @@index([status])
  @@index([declarationDate])
  @@map("incidents")
}

model PreliminaryAssessment {
  id          String   @id @default(uuid())
  incidentId  String?  @map("incident_id") // Nullable
  
  // Assessment details
  assessmentDate   Date   @map("assessment_date")
  assessorId       String @map("assessor_id")
  impactDescription String @map("impact_description") @db.Text
  initialNeeds     String @map("initial_needs") @db.Text
  
  // Trigger
  canTriggerIncident Boolean @default(false) @map("can_trigger_incident")
  
  // Status
  verificationStatus VerificationStatus @default(PENDING) @map("verification_status")
  
  // Impact numbers
  livesLost      Int @default(0) @map("lives_lost")
  injured        Int @default(0)
  displaced      Int @default(0)
  housesAffected Int @default(0) @map("houses_affected")
  
  // Location
  locationLat Float  @map("location_lat")
  locationLng Float  @map("location_lng")
  lga         String
  ward        String
  
  // Relationships
  incident Incident? @relation(fields: [incidentId], references: [id])
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([incidentId])
  @@index([assessmentDate])
  @@map("preliminary_assessments")
}

enum IncidentType {
  FLOOD
  FIRE
  LANDSLIDE
  CYCLONE
  CONFLICT
  EPIDEMIC
  OTHER
}

enum IncidentSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum IncidentStatus {
  ACTIVE
  CONTAINED
  RESOLVED
}

// ============================================
// AFFECTED ENTITIES
// ============================================

model AffectedEntity {
  id   String     @id @default(uuid())
  name String
  type EntityType
  
  // Location
  locationLat Float @map("location_lat")
  locationLng Float @map("location_lng")
  lga         String
  ward        String
  
  // Population (from latest assessment)
  population       Int? @default(0)
  vulnerableCount  Int? @default(0) @map("vulnerable_count")
  
  // Auto-approval
  autoApproveEnabled Boolean @default(false) @map("auto_approve_enabled")
  
  // Type-specific details (JSON)
  campDetails      Json? @map("camp_details")
  communityDetails Json? @map("community_details")
  
  // Relationships
  incidents     IncidentEntity[]
  assessments   RapidAssessment[]
  responses     RapidResponse[]
  assignments   EntityAssignment[]
  commitments   DonorCommitment[]
  
  // Metadata
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([type])
  @@index([lga, ward])
  @@index([locationLat, locationLng])
  @@map("affected_entities")
}

model IncidentEntity {
  incidentId String @map("incident_id")
  entityId   String @map("entity_id")
  
  // Impact
  affectedDate Date             @map("affected_date")
  severityLevel IncidentSeverity @map("severity_level")
  
  // Relationships
  incident Incident       @relation(fields: [incidentId], references: [id])
  entity   AffectedEntity @relation(fields: [entityId], references: [id])
  
  @@id([incidentId, entityId])
  @@index([incidentId])
  @@index([entityId])
  @@map("incident_entities")
}

model EntityAssignment {
  id       String         @id @default(uuid())
  entityId String         @map("entity_id")
  userId   String         @map("user_id")
  role     AssignmentRole
  
  // Status
  isActive Boolean @default(true) @map("is_active")
  
  // Relationships
  entity AffectedEntity @relation(fields: [entityId], references: [id])
  user   User           @relation(fields: [userId], references: [id])
  
  // Metadata
  assignedBy String   @map("assigned_by")
  assignedAt DateTime @default(now()) @map("assigned_at")
  
  @@unique([entityId, userId, role])
  @@index([entityId])
  @@index([userId])
  @@map("entity_assignments")
}

enum EntityType {
  CAMP
  COMMUNITY
}

enum AssignmentRole {
  ASSESSOR
  RESPONDER
  DONOR
}

// ============================================
// RAPID ASSESSMENTS
// ============================================

model RapidAssessment {
  id             String         @id @default(uuid())
  entityId       String         @map("entity_id")
  incidentId     String         @map("incident_id")
  assessorId     String         @map("assessor_id")
  assessmentType AssessmentType @map("assessment_type")
  assessmentDate Date           @map("assessment_date")
  
  // Status
  verificationStatus VerificationStatus @default(PENDING) @map("verification_status")
  rejectionReason    String?            @map("rejection_reason")
  rejectionFeedback  String?            @db.Text @map("rejection_feedback")
  syncStatus         SyncStatus         @default(LOCAL) @map("sync_status")
  
  // Offline tracking
  offlineId     String? @unique @map("offline_id")
  versionNumber Int     @default(1) @map("version_number")
  
  // Assessment data (type-specific JSON)
  assessmentData Json @map("assessment_data")
  
  // Relationships
  affectedEntity   AffectedEntity    @relation(fields: [entityId], references: [id])
  incident         Incident          @relation(fields: [incidentId], references: [id])
  assessor         User              @relation("AssessorRelation", fields: [assessorId], references: [id])
  responses        RapidResponse[]
  mediaAttachments MediaAttachment[]
  conflicts        SyncConflict[]
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([entityId])
  @@index([incidentId])
  @@index([assessorId])
  @@index([assessmentType])
  @@index([verificationStatus])
  @@index([syncStatus])
  @@map("rapid_assessments")
}

enum AssessmentType {
  HEALTH
  WASH
  SHELTER
  FOOD
  SECURITY
  POPULATION
}

// ============================================
// RAPID RESPONSES
// ============================================

model RapidResponse {
  id           String         @id @default(uuid())
  assessmentId String         @map("assessment_id")
  entityId     String         @map("entity_id")
  responderId  String         @map("responder_id")
  donorId      String?        @map("donor_id") // Nullable
  
  // Status
  status             ResponseStatus     @default(PLANNED)
  plannedDate        Date               @map("planned_date")
  responseDate       DateTime?          @map("response_date")
  
  // Verification
  verificationStatus VerificationStatus @default(DRAFT) @map("verification_status")
  rejectionReason    String?            @map("rejection_reason")
  rejectionFeedback  String?            @db.Text @map("rejection_feedback")
  syncStatus         SyncStatus         @default(LOCAL) @map("sync_status")
  
  // Offline tracking
  offlineId     String? @unique @map("offline_id")
  versionNumber Int     @default(1) @map("version_number")
  
  // Response items (JSON array)
  items Json
  
  // Relationships
  assessment       RapidAssessment     @relation(fields: [assessmentId], references: [id])
  affectedEntity   AffectedEntity      @relation(fields: [entityId], references: [id])
  responder        User                @relation("ResponderRelation", fields: [responderId], references: [id])
  donor            Donor?              @relation(fields: [donorId], references: [id])
  mediaAttachments MediaAttachment[]
  conflicts        SyncConflict[]
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([assessmentId])
  @@index([entityId])
  @@index([responderId])
  @@index([donorId])
  @@index([status])
  @@index([verificationStatus])
  @@index([syncStatus])
  @@map("rapid_responses")
}

enum ResponseStatus {
  PLANNED
  DELIVERED
}

enum VerificationStatus {
  DRAFT
  PENDING
  VERIFIED
  AUTO_VERIFIED
  REJECTED
}

enum SyncStatus {
  LOCAL
  SYNCING
  SYNCED
  CONFLICT
  FAILED
}

// ============================================
// DONOR MANAGEMENT
// ============================================

model Donor {
  id               String   @id @default(uuid())
  organizationName String   @map("organization_name")
  contactName      String   @map("contact_name")
  email            String   @unique
  phone            String?
  
  // Performance metrics (calculated)
  totalCommitments          Int   @default(0) @map("total_commitments")
  totalDelivered            Int   @default(0) @map("total_delivered")
  selfReportedDeliveryRate  Float @default(0) @map("self_reported_delivery_rate")
  verifiedDeliveryRate      Float @default(0) @map("verified_delivery_rate")
  leaderboardRank           Int   @default(0) @map("leaderboard_rank")
  
  // Relationships
  commitments       DonorCommitment[]
  responses         RapidResponse[]
  entityAssignments EntityAssignment[]
  
  // Timestamps
  registrationDate Date     @map("registration_date")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  
  @@index([email])
  @@index([leaderboardRank])
  @@map("donors")
}

model DonorCommitment {
  id         String   @id @default(uuid())
  donorId    String   @map("donor_id")
  entityId   String   @map("entity_id")
  incidentId String   @map("incident_id")
  
  // Commitment details
  commitmentDate       Date  @map("commitment_date")
  items                Json  // Array of {name, unit, quantity, delivered}
  totalValueEstimated  Float? @map("total_value_estimated")
  
  // Delivery tracking
  deliveryStatus            DeliveryStatus @default(PLANNED) @map("delivery_status")
  deliveredQuantity         Int            @default(0) @map("delivered_quantity")
  verifiedDeliveredQuantity Int            @default(0) @map("verified_delivered_quantity")
  
  // Relationships
  donor  Donor          @relation(fields: [donorId], references: [id])
  entity AffectedEntity @relation(fields: [entityId], references: [id])
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([donorId])
  @@index([entityId])
  @@index([incidentId])
  @@index([deliveryStatus])
  @@map("donor_commitments")
}

enum DeliveryStatus {
  PLANNED
  PARTIAL
  COMPLETE
}

// ============================================
// MEDIA ATTACHMENTS
// ============================================

model MediaAttachment {
  id           String  @id @default(uuid())
  url          String? // R2/S3 URL after sync
  localPath    String? @map("local_path") // Device path before sync
  thumbnailUrl String? @map("thumbnail_url")
  
  // File metadata
  mimeType String @map("mime_type")
  size     Int
  filename String
  
  // Capture metadata (JSON)
  metadata Json
  
  // Links
  assessmentId String? @map("assessment_id")
  responseId   String? @map("response_id")
  
  // Sync
  syncStatus SyncStatus @default(LOCAL) @map("sync_status")
  
  // Relationships
  assessment RapidAssessment? @relation(fields: [assessmentId], references: [id])
  response   RapidResponse?   @relation(fields: [responseId], references: [id])
  
  // Timestamps
  createdAt  DateTime  @default(now()) @map("created_at")
  uploadedAt DateTime? @map("uploaded_at")
  
  @@index([assessmentId])
  @@index([responseId])
  @@index([syncStatus])
  @@map("media_attachments")
}

// ============================================
// SYNC MANAGEMENT
// ============================================

model SyncConflict {
  id         String   @id @default(uuid())
  entityType String   @map("entity_type") // "ASSESSMENT" or "RESPONSE"
  entityId   String   @map("entity_id")
  
  // Conflict details
  conflictDate Date @map("conflict_date")
  
  // Resolution
  resolutionMethod String   @default("LAST_WRITE_WINS") @map("resolution_method")
  winningVersion   Json     @map("winning_version")
  losingVersion    Json     @map("losing_version")
  resolvedAt       DateTime @map("resolved_at")
  
  // Notification
  coordinatorNotified   Boolean   @default(false) @map("coordinator_notified")
  coordinatorNotifiedAt DateTime? @map("coordinator_notified_at")
  
  // Relationships (polymorphic)
  assessment RapidAssessment? @relation(fields: [entityId], references: [id])
  response   RapidResponse?   @relation(fields: [entityId], references: [id])
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  
  @@index([entityType])
  @@index([entityId])
  @@index([conflictDate])
  @@map("sync_conflicts")
}

// ============================================
// AUDIT TRAIL
// ============================================

model AuditLog {
  id         String @id @default(uuid())
  userId     String @map("user_id")
  action     String
  
  // Entity details
  entityType String @map("entity_type")
  entityId   String @map("entity_id")
  
  // Changes (JSON)
  beforeValue Json? @map("before_value")
  afterValue  Json? @map("after_value")
  
  // Context
  timestamp  DateTime @map("timestamp")
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @db.Text @map("user_agent")
  
  // Relationships
  user User @relation(fields: [userId], references: [id])
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  
  @@index([userId])
  @@index([entityType])
  @@index([timestamp])
  @@map("audit_logs")
}
```

---

## 6.2 Database Initialization Scripts

### Seed Script for Development

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create permissions
  const permissions = await createPermissions();
  console.log('✅ Created permissions');

  // Create roles with permissions
  const roles = await createRoles(permissions);
  console.log('✅ Created roles');

  // Create test users
  const users = await createUsers(roles);
  console.log('✅ Created users');

  // Create incident
  const incident = await createIncident(users.coordinator);
  console.log('✅ Created incident');

  // Create affected entities
  const entities = await createEntities(users.coordinator);
  console.log('✅ Created affected entities');

  // Link entities to incident
  await linkEntitiesToIncident(incident.id, entities);
  console.log('✅ Linked entities to incident');

  // Create entity assignments
  await createEntityAssignments(users, entities);
  console.log('✅ Created entity assignments');

  // Create sample assessments
  await createSampleAssessments(users.assessor, entities, incident);
  console.log('✅ Created sample assessments');

  // Create donor
  const donor = await createDonor();
  console.log('✅ Created donor');

  // Create donor commitments
  await createDonorCommitments(donor, entities, incident);
  console.log('✅ Created donor commitments');

  console.log('🎉 Seed completed successfully!');
}

async function createPermissions() {
  const permissionData = [
    // Assessment permissions
    { name: 'Create Assessment', code: 'CREATE_ASSESSMENT', category: 'ASSESSMENT' },
    { name: 'Edit Assessment', code: 'EDIT_ASSESSMENT', category: 'ASSESSMENT' },
    { name: 'View Assessment', code: 'VIEW_ASSESSMENT', category: 'ASSESSMENT' },
    { name: 'Delete Assessment', code: 'DELETE_ASSESSMENT', category: 'ASSESSMENT' },
    
    // Response permissions
    { name: 'Create Response', code: 'CREATE_RESPONSE', category: 'RESPONSE' },
    { name: 'Edit Response', code: 'EDIT_RESPONSE', category: 'RESPONSE' },
    { name: 'View Response', code: 'VIEW_RESPONSE', category: 'RESPONSE' },
    
    // Verification permissions
    { name: 'Verify Assessment', code: 'VERIFY_ASSESSMENT', category: 'VERIFICATION' },
    { name: 'Verify Response', code: 'VERIFY_RESPONSE', category: 'VERIFICATION' },
    { name: 'Configure Auto-Approval', code: 'CONFIG_AUTO_APPROVAL', category: 'VERIFICATION' },
    
    // Entity permissions
    { name: 'Create Entity', code: 'CREATE_ENTITY', category: 'ENTITY' },
    { name: 'Assign Entity', code: 'ASSIGN_ENTITY', category: 'ENTITY' },
    
    // Incident permissions
    { name: 'Manage Incidents', code: 'MANAGE_INCIDENTS', category: 'INCIDENT' },
    
    // Donor permissions
    { name: 'Create Commitment', code: 'CREATE_COMMITMENT', category: 'DONOR' },
    { name: 'View Dashboard', code: 'VIEW_DONOR_DASHBOARD', category: 'DONOR' },
    
    // Admin permissions
    { name: 'Manage Users', code: 'MANAGE_USERS', category: 'ADMIN' },
    { name: 'View Audit Logs', code: 'VIEW_AUDIT_LOGS', category: 'ADMIN' },
  ];

  const permissions = await Promise.all(
    permissionData.map(p =>
      prisma.permission.upsert({
        where: { code: p.code },
        update: {},
        create: { ...p, description: p.name },
      })
    )
  );

  return permissions;
}

async function createRoles(permissions: any[]) {
  // Helper to get permission IDs by codes
  const getPermissionIds = (codes: string[]) =>
    permissions.filter(p => codes.includes(p.code)).map(p => ({ id: p.id }));

  const rolesData = [
    {
      name: 'ASSESSOR',
      description: 'Field assessor conducting rapid assessments',
      permissionCodes: [
        'CREATE_ASSESSMENT',
        'EDIT_ASSESSMENT',
        'VIEW_ASSESSMENT',
        'CREATE_ENTITY',
        'VIEW_RESPONSE',
      ],
    },
    {
      name: 'COORDINATOR',
      description: 'Coordinator managing verification and incidents',
      permissionCodes: [
        'VIEW_ASSESSMENT',
        'VERIFY_ASSESSMENT',
        'VIEW_RESPONSE',
        'VERIFY_RESPONSE',
        'CONFIG_AUTO_APPROVAL',
        'CREATE_ENTITY',
        'ASSIGN_ENTITY',
        'MANAGE_INCIDENTS',
      ],
    },
    {
      name: 'RESPONDER',
      description: 'Responder delivering aid',
      permissionCodes: [
        'VIEW_ASSESSMENT',
        'CREATE_RESPONSE',
        'EDIT_RESPONSE',
        'VIEW_RESPONSE',
      ],
    },
    {
      name: 'DONOR',
      description: 'Donor providing resources',
      permissionCodes: [
        'CREATE_COMMITMENT',
        'VIEW_DONOR_DASHBOARD',
        'VIEW_ASSESSMENT',
      ],
    },
    {
      name: 'ADMIN',
      description: 'System administrator',
      permissionCodes: [
        'MANAGE_USERS',
        'VIEW_AUDIT_LOGS',
        'CONFIG_AUTO_APPROVAL',
        'ASSIGN_ENTITY',
      ],
    },
  ];

  const roles = await Promise.all(
    rolesData.map(r =>
      prisma.role.upsert({
        where: { name: r.name as any },
        update: {},
        create: {
          name: r.name as any,
          description: r.description,
          permissions: {
            connect: getPermissionIds(r.permissionCodes),
          },
        },
      })
    )
  );

  return roles;
}

async function createUsers(roles: any[]) {
  const passwordHash = await bcrypt.hash('password123', 10);

  const assessor = await prisma.user.upsert({
    where: { email: 'assessor@example.com' },
    update: {},
    create: {
      email: 'assessor@example.com',
      username: 'assessor1',
      passwordHash,
      name: 'John Assessor',
      phone: '+234 800 000 0001',
      organization: 'Field Operations',
      roles: {
        create: {
          roleId: roles.find(r => r.name === 'ASSESSOR').id,
          assignedBy: 'SYSTEM',
        },
      },
    },
  });

  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinator@example.com' },
    update: {},
    create: {
      email: 'coordinator@example.com',
      username: 'coordinator1',
      passwordHash,
      name: 'Sarah Coordinator',
      phone: '+234 800 000 0002',
      organization: 'Coordination Center',
      roles: {
        create: {
          roleId: roles.find(r => r.name === 'COORDINATOR').id,
          assignedBy: 'SYSTEM',
        },
      },
    },
  });

  const responder = await prisma.user.upsert({
    where: { email: 'responder@example.com' },
    update: {},
    create: {
      email: 'responder@example.com',
      username: 'responder1',
      passwordHash,
      name: 'Mike Responder',
      phone: '+234 800 000 0003',
      organization: 'Response Team',
      roles: {
        create: {
          roleId: roles.find(r => r.name === 'RESPONDER').id,
          assignedBy: 'SYSTEM',
        },
      },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin1',
      passwordHash,
      name: 'Admin User',
      phone: '+234 800 000 0004',
      organization: 'System Administration',
      roles: {
        create: {
          roleId: roles.find(r => r.name === 'ADMIN').id,
          assignedBy: 'SYSTEM',
        },
      },
    },
  });

  return { assessor, coordinator, responder, admin };
}

async function createIncident(coordinator: any) {
  return prisma.incident.create({
    data: {
      name: 'Maiduguri Flood 2025',
      type: 'FLOOD',
      subType: 'River Overflow',
      severity: 'HIGH',
      status: 'ACTIVE',
      declarationDate: new Date('2025-09-01'),
      locationLat: 11.8333,
      locationLng: 13.1500,
      affectedPopulation: 15000,
      createdBy: coordinator.id,
    },
  });
}

async function createEntities(coordinator: any) {
  const camp1 = await prisma.affectedEntity.create({
    data: {
      name: 'Bakassi IDP Camp',
      type: 'CAMP',
      locationLat: 11.8400,
      locationLng: 13.1600,
      lga: 'Maiduguri',
      ward: 'Bakassi',
      population: 5000,
      vulnerableCount: 1200,
      autoApproveEnabled: false,
      campDetails: {
        campName: 'Bakassi IDP Camp',
        campStatus: 'OPEN',
        coordinatorName: 'Ibrahim Ahmed',
        coordinatorPhone: '+234 800 111 1111',
        supervisorName: 'Dr. Fatima Hassan',
        supervisorOrganization: 'UNHCR',
      },
      createdBy: coordinator.id,
    },
  });

  const community1 = await prisma.affectedEntity.create({
    data: {
      name: 'Gwange Community',
      type: 'COMMUNITY',
      locationLat: 11.8500,
      locationLng: 13.1400,
      lga: 'Maiduguri',
      ward: 'Gwange',
      population: 8000,
      vulnerableCount: 2000,
      autoApproveEnabled: true, // Auto-approval enabled for this entity
      communityDetails: {
        communityName: 'Gwange Community',
        contactPersonName: 'Mallam Bukar',
        contactPersonPhone: '+234 800 222 2222',
        contactPersonRole: 'Community Leader',
        estimatedHouseholds: 1200,
      },
      createdBy: coordinator.id,
    },
  });

  return [camp1, community1];
}

async function linkEntitiesToIncident(incidentId: string, entities: any[]) {
  await Promise.all(
    entities.map(entity =>
      prisma.incidentEntity.create({
        data: {
          incidentId,
          entityId: entity.id,
          affectedDate: new Date('2025-09-01'),
          severityLevel: 'HIGH',
        },
      })
    )
  );
}

async function createEntityAssignments(users: any, entities: any[]) {
  // Assign assessor to both entities
  await Promise.all(
    entities.map(entity =>
      prisma.entityAssignment.create({
        data: {
          entityId: entity.id,
          userId: users.assessor.id,
          role: 'ASSESSOR',
          assignedBy: users.coordinator.id,
        },
      })
    )
  );

  // Assign responder to both entities
  await Promise.all(
    entities.map(entity =>
      prisma.entityAssignment.create({
        data: {
          entityId: entity.id,
          userId: users.responder.id,
          role: 'RESPONDER',
          assignedBy: users.coordinator.id,
        },
      })
    )
  );
}

async function createSampleAssessments(
  assessor: any,
  entities: any[],
  incident: any
) {
  // Health assessment for camp (pending verification)
  await prisma.rapidAssessment.create({
    data: {
      entityId: entities[0].id,
      incidentId: incident.id,
      assessorId: assessor.id,
      assessmentType: 'HEALTH',
      assessmentDate: new Date('2025-09-15'),
      verificationStatus: 'PENDING',
      syncStatus: 'SYNCED',
      versionNumber: 1,
      assessmentData: {
        hasFunctionalClinic: false, // GAP
        hasEmergencyServices: true,
        hasMedicalSupplies: false, // GAP
        hasTrainedStaff: true,
        numberHealthFacilities: 1,
        healthFacilityTypes: ['Mobile Clinic'],
        qualifiedHealthWorkers: 3,
        commonHealthIssues: ['Malaria', 'Diarrhea', 'Malnutrition'],
        hasMaternalChildServices: false,
        additionalDetails: 'Urgent need for permanent health facility',
      },
    },
  });

  // WASH assessment for community (auto-verified due to autoApproveEnabled)
  await prisma.rapidAssessment.create({
    data: {
      entityId: entities[1].id,
      incidentId: incident.id,
      assessorId: assessor.id,
      assessmentType: 'WASH',
      assessmentDate: new Date('2025-09-16'),
      verificationStatus: 'AUTO_VERIFIED', // Auto-verified
      syncStatus: 'SYNCED',
      versionNumber: 1,
      assessmentData: {
        isWaterSufficient: false, // GAP
        hasCleanWaterAccess: false, // GAP
        areLatrinesSufficient: false, // GAP
        hasHandwashingFacilities: true,
        waterSources: ['Borehole', 'River'],
        waterQuality: 'CONTAMINATED',
        numberToilets: 15,
        toiletTypes: ['Pit Latrine'],
        hasSolidWasteDisposal: false,
        additionalDetails: 'Water source contaminated by flood',
      },
    },
  });

  // Population assessment for camp (verified)
  await prisma.rapidAssessment.create({
    data: {
      entityId: entities[0].id,
      incidentId: incident.id,
      assessorId: assessor.id,
      assessmentType: 'POPULATION',
      assessmentDate: new Date('2025-09-14'),
      verificationStatus: 'VERIFIED',
      syncStatus: 'SYNCED',
      versionNumber: 1,
      assessmentData: {
        totalHouseholds: 800,
        totalPopulation: 5000,
        populationMale: 2400,
        populationFemale: 2600,
        populationUnder5: 800,
        pregnantWomen: 150,
        lactatingMothers: 200,
        personWithDisability: 100,
        elderlyPersons: 250,
        separatedChildren: 15,
        numberLivesLost: 3,
        numberInjured: 45,
        additionalDetails: 'Population stable, no new arrivals in 48 hours',
      },
    },
  });
}

async function createDonor() {
  return prisma.donor.create({
    data: {
      organizationName: 'Global Relief Foundation',
      contactName: 'Emily Johnson',
      email: 'emily@globalrelief.org',
      phone: '+1 555 000 0000',
      registrationDate: new Date('2025-09-10'),
      totalCommitments: 3,
      totalDelivered: 1,
      selfReportedDeliveryRate: 33.3,
      verifiedDeliveryRate: 33.3,
      leaderboardRank: 5,
    },
  });
}

async function createDonorCommitments(
  donor: any,
  entities: any[],
  incident: any
) {
  await prisma.donorCommitment.create({
    data: {
      donorId: donor.id,
      entityId: entities[0].id,
      incidentId: incident.id,
      commitmentDate: new Date('2025-09-12'),
      deliveryStatus: 'PARTIAL',
      deliveredQuantity: 500,
      verifiedDeliveredQuantity: 500,
      items: [
        { name: 'Water Purification Tablets', unit: 'boxes', quantity: 1000, delivered: 500 },
        { name: 'Oral Rehydration Salts', unit: 'packets', quantity: 2000, delivered: 0 },
      ],
      totalValueEstimated: 5000,
    },
  });

  await prisma.donorCommitment.create({
    data: {
      donorId: donor.id,
      entityId: entities[1].id,
      incidentId: incident.id,
      commitmentDate: new Date('2025-09-13'),
      deliveryStatus: 'PLANNED',
      deliveredQuantity: 0,
      verifiedDeliveredQuantity: 0,
      items: [
        { name: 'Emergency Shelter Kits', unit: 'kits', quantity: 200, delivered: 0 },
        { name: 'Blankets', unit: 'pieces', quantity: 400, delivered: 0 },
      ],
      totalValueEstimated: 15000,
    },
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Migration Commands for LLM Implementation

```bash
# Initialize Prisma (first time only)
npx prisma init

# Create migration from schema changes
npx prisma migrate dev --name initial_schema

# Generate Prisma Client (after schema changes)
npx prisma generate

# Apply migrations to production
npx prisma migrate deploy

# Reset database and reseed (development only)
npx prisma migrate reset

# Seed database
npx prisma db seed

# Open Prisma Studio to view/edit data
npx prisma studio
```

---

## 7. Data Relationships & Constraints

### 7.1 Key Relationships

**User Relationships:**
- One User → Many UserRoles (user can have multiple roles)
- One User → Many RapidAssessments (as assessor)
- One User → Many RapidResponses (as responder)
- One User → Many EntityAssignments

**Entity Relationships:**
- One AffectedEntity → Many IncidentEntities (can be affected by multiple incidents)
- One AffectedEntity → Many RapidAssessments
- One AffectedEntity → Many RapidResponses
- One AffectedEntity → Many EntityAssignments

**Assessment-Response Chain:**
- One RapidAssessment → Many RapidResponses (one assessment can trigger multiple responses)
- One RapidResponse → One RapidAssessment (response must link to assessment)

**Donor Relationships:**
- One Donor → Many DonorCommitments
- One Donor → Many RapidResponses (through attribution)
- One DonorCommitment → One AffectedEntity

### 7.2 Important Constraints

**Immutability Rules:**
```typescript
// These fields cannot be changed after creation
const IMMUTABLE_FIELDS = {
  RapidAssessment: ['assessmentType', 'entityId', 'incidentId'],
  RapidResponse: ['assessmentId', 'entityId'],
  EntityAssignment: ['entityId', 'userId', 'role'], // Can only deactivate
};
```

**Status Transition Rules:**
```typescript
const STATUS_TRANSITIONS = {
  VerificationStatus: {
    DRAFT: ['PENDING', 'DRAFT'], // Can save multiple times
    PENDING: ['VERIFIED', 'AUTO_VERIFIED', 'REJECTED'], // Coordinator actions
    VERIFIED: [], // Terminal state
    AUTO_VERIFIED: [], // Terminal state
    REJECTED: ['PENDING'], // Can resubmit after fixing
  },
  ResponseStatus: {
    PLANNED: ['DELIVERED'], // One-way transition
    DELIVERED: [], // Terminal state
  },
  IncidentStatus: {
    ACTIVE: ['CONTAINED'],
    CONTAINED: ['RESOLVED', 'ACTIVE'], // Can reactivate
    RESOLVED: [], // Terminal state
  },
};
```

**Validation Rules:**
```typescript
// Business logic validation (enforced in API layer)
const VALIDATION_RULES = {
  // Auto-approval only applies to first submission
  autoApproval: {
    condition: 'verificationStatus === PENDING && versionNumber === 1',
    applies: 'entity.autoApproveEnabled === true',
  },
  
  // Cannot reject auto-verified items
  rejection: {
    condition: 'verificationStatus !== AUTO_VERIFIED',
  },
  
  // Response must link to same entity as assessment
  responseEntity: {
    condition: 'response.entityId === assessment.entityId',
  },
  
  // User must be assigned to entity
  entityAccess: {
    condition: 'EntityAssignment exists AND isActive === true',
  },
};
```

---


# Part 3: API Specification & Backend Services

---

## 8. API Specification

### 8.1 API Design Principles

**RESTful Conventions:**
- Use HTTP methods semantically (GET, POST, PATCH, DELETE)
- Resource-based URLs: `/api/v1/{resource}/{id}/{action}`
- Plural nouns for collections: `/api/v1/assessments`
- Consistent status codes and error responses
- Versioned API: `/api/v1/` (ready for future versions)

**Standardized Response Format:**
```typescript
// src/types/api.ts

export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
    requestId: string;
  };
  error?: ApiError;
}

export interface ApiError {
  type: string;
  code: string;
  message: string;
  details?: any;
  stack?: string; // Only in development
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiResponse<T>['meta'] & {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  };
}
```

### 8.2 Authentication Endpoints

```yaml
# Authentication & Authorization
/api/v1/auth:
  /login:
    POST:
      body: { email: string, password: string }
      returns: { user: User, token: string, roles: Role[] }
      status: 200 | 401 | 422
      
  /logout:
    POST:
      headers: { Authorization: "Bearer {token}" }
      returns: { success: boolean }
      status: 200 | 401
      
  /refresh:
    POST:
      headers: { Authorization: "Bearer {token}" }
      returns: { token: string }
      status: 200 | 401
      
  /me:
    GET:
      headers: { Authorization: "Bearer {token}" }
      returns: { user: User, roles: Role[], permissions: Permission[] }
      status: 200 | 401
```

**Implementation Pattern:**
```typescript
// app/api/v1/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { comparePassword, generateToken } from '@/lib/auth/utils';
import { ApiResponse } from '@/types/api';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = LoginSchema.parse(body);
    
    // Find user with roles
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });
    
    if (!user || !user.isActive) {
      return NextResponse.json<ApiResponse<null>>({
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: crypto.randomUUID(),
        },
        error: {
          type: 'authentication_error',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      }, { status: 401 });
    }
    
    // Verify password
    const isValid = await comparePassword(validated.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json<ApiResponse<null>>({
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: crypto.randomUUID(),
        },
        error: {
          type: 'authentication_error',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      }, { status: 401 });
    }
    
    // Generate JWT token
    const roles = user.roles.map(ur => ur.role);
    const permissions = roles.flatMap(r => r.permissions.map(p => p.code));
    
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roles: roles.map(r => r.name),
      permissions: [...new Set(permissions)],
    });
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    
    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = user;
    
    return NextResponse.json<ApiResponse<any>>({
      data: {
        user: userWithoutPassword,
        token,
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
        })),
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID(),
      },
    }, { status: 200 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<null>>({
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: crypto.randomUUID(),
        },
        error: {
          type: 'validation_error',
          code: 'INVALID_INPUT',
          message: 'Validation failed',
          details: error.errors,
        },
      }, { status: 422 });
    }
    
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID(),
      },
      error: {
        type: 'server_error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    }, { status: 500 });
  }
}
```

### 8.3 Assessment Endpoints

```yaml
/api/v1/assessments:
  GET:
    query:
      - entityId?: string
      - incidentId?: string
      - assessmentType?: AssessmentType
      - verificationStatus?: VerificationStatus
      - syncStatus?: SyncStatus
      - page?: number (default: 1)
      - pageSize?: number (default: 20)
    returns: PaginatedResponse<RapidAssessment>
    status: 200 | 401 | 403
    
  POST:
    body: CreateAssessmentInput
    returns: ApiResponse<RapidAssessment>
    status: 201 | 401 | 403 | 422
    
  /batch:
    POST:
      body: { assessments: CreateAssessmentInput[] }
      returns: ApiResponse<BatchResult>
      status: 200 | 401 | 403 | 422
      
  /{id}:
    GET:
      returns: ApiResponse<RapidAssessment>
      status: 200 | 401 | 403 | 404
      
    PATCH:
      body: UpdateAssessmentInput
      returns: ApiResponse<RapidAssessment>
      status: 200 | 401 | 403 | 404 | 422
      
    DELETE:
      returns: ApiResponse<{ deleted: boolean }>
      status: 200 | 401 | 403 | 404
      
  /{id}/verify:
    POST:
      body: { action: 'approve' | 'reject', reason?: string, feedback?: string }
      returns: ApiResponse<RapidAssessment>
      status: 200 | 401 | 403 | 404 | 422
```

**Assessment Creation Schema:**
```typescript
// lib/validation/schemas.ts

import { z } from 'zod';

// Base assessment schema
export const CreateAssessmentSchema = z.object({
  entityId: z.string().uuid(),
  incidentId: z.string().uuid(),
  assessmentType: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']),
  assessmentDate: z.string().datetime().or(z.date()),
  assessmentData: z.object({}).passthrough(), // Type-specific validation below
  offlineId: z.string().uuid().optional(),
  versionNumber: z.number().int().positive().default(1),
});

// Health assessment data schema
export const HealthAssessmentDataSchema = z.object({
  hasFunctionalClinic: z.boolean(),
  hasEmergencyServices: z.boolean(),
  hasMedicalSupplies: z.boolean(),
  hasTrainedStaff: z.boolean(),
  numberHealthFacilities: z.number().int().nonnegative(),
  healthFacilityTypes: z.array(z.string()),
  qualifiedHealthWorkers: z.number().int().nonnegative(),
  commonHealthIssues: z.array(z.string()),
  hasMaternalChildServices: z.boolean(),
  additionalDetails: z.string().optional(),
});

// WASH assessment data schema
export const WashAssessmentDataSchema = z.object({
  isWaterSufficient: z.boolean(),
  hasCleanWaterAccess: z.boolean(),
  areLatrinesSufficient: z.boolean(),
  hasHandwashingFacilities: z.boolean(),
  waterSources: z.array(z.string()),
  waterQuality: z.enum(['SAFE', 'CONTAMINATED', 'UNKNOWN']),
  numberToilets: z.number().int().nonnegative(),
  toiletTypes: z.array(z.string()),
  hasSolidWasteDisposal: z.boolean(),
  additionalDetails: z.string().optional(),
});

// Similar schemas for other assessment types...

// Dynamic validation based on assessment type
export function validateAssessmentData(type: string, data: any) {
  switch (type) {
    case 'HEALTH':
      return HealthAssessmentDataSchema.parse(data);
    case 'WASH':
      return WashAssessmentDataSchema.parse(data);
    // ... other cases
    default:
      throw new Error(`Unknown assessment type: ${type}`);
  }
}
```

### 8.4 Response Endpoints

```yaml
/api/v1/responses:
  GET:
    query:
      - entityId?: string
      - assessmentId?: string
      - responderId?: string
      - status?: ResponseStatus
      - verificationStatus?: VerificationStatus
      - page?: number
      - pageSize?: number
    returns: PaginatedResponse<RapidResponse>
    status: 200 | 401 | 403
    
  POST:
    body: CreateResponseInput
    returns: ApiResponse<RapidResponse>
    status: 201 | 401 | 403 | 422
    
  /batch:
    POST:
      body: { responses: CreateResponseInput[] }
      returns: ApiResponse<BatchResult>
      status: 200 | 401 | 403 | 422
      
  /{id}:
    GET:
      returns: ApiResponse<RapidResponse>
      status: 200 | 401 | 403 | 404
      
    PATCH:
      body: UpdateResponseInput
      returns: ApiResponse<RapidResponse>
      status: 200 | 401 | 403 | 404 | 422
      
  /{id}/deliver:
    POST:
      body: { responseDate: string, mediaAttachments?: MediaInput[] }
      returns: ApiResponse<RapidResponse>
      status: 200 | 401 | 403 | 404 | 422
      note: Converts status from PLANNED to DELIVERED
      
  /{id}/verify:
    POST:
      body: { action: 'approve' | 'reject', reason?: string, feedback?: string }
      returns: ApiResponse<RapidResponse>
      status: 200 | 401 | 403 | 404 | 422
```

**Response Creation Schema:**
```typescript
export const CreateResponseSchema = z.object({
  assessmentId: z.string().uuid(),
  entityId: z.string().uuid(),
  status: z.enum(['PLANNED', 'DELIVERED']).default('PLANNED'),
  plannedDate: z.string().datetime().or(z.date()),
  responseDate: z.string().datetime().or(z.date()).optional(),
  items: z.array(z.object({
    name: z.string().min(1),
    unit: z.string().min(1),
    quantity: z.number().positive(),
    donorName: z.string().optional(),
    donorCommitmentId: z.string().uuid().optional(),
  })).min(1),
  donorId: z.string().uuid().optional(),
  offlineId: z.string().uuid().optional(),
  versionNumber: z.number().int().positive().default(1),
});

// Validation: entityId must match assessment's entityId
export async function validateResponseEntity(assessmentId: string, entityId: string) {
  const assessment = await prisma.rapidAssessment.findUnique({
    where: { id: assessmentId },
    select: { entityId: true },
  });
  
  if (!assessment) {
    throw new Error('Assessment not found');
  }
  
  if (assessment.entityId !== entityId) {
    throw new Error('Response entity must match assessment entity');
  }
}
```

### 8.5 Verification Endpoints

```yaml
/api/v1/verification:
  /queue:
    GET:
      query:
        - type?: 'assessment' | 'response'
        - priority?: 'high' | 'normal' | 'low'
        - entityId?: string
        - page?: number
        - pageSize?: number
      returns: PaginatedResponse<VerificationQueueItem>
      status: 200 | 401 | 403
      
  /batch-verify:
    POST:
      body: {
        items: Array<{
          id: string,
          type: 'assessment' | 'response',
          action: 'approve' | 'reject',
          reason?: string,
          feedback?: string
        }>
      }
      returns: ApiResponse<BatchVerificationResult>
      status: 200 | 401 | 403 | 422
```

### 8.6 Entity Management Endpoints

```yaml
/api/v1/entities:
  GET:
    query:
      - type?: EntityType
      - lga?: string
      - ward?: string
      - incidentId?: string
      - bbox?: string (lat1,lng1,lat2,lng2)
      - page?: number
      - pageSize?: number
    returns: PaginatedResponse<AffectedEntity>
    status: 200 | 401 | 403
    
  POST:
    body: CreateEntityInput
    returns: ApiResponse<AffectedEntity>
    status: 201 | 401 | 403 | 422
    
  /{id}:
    GET:
      returns: ApiResponse<AffectedEntity>
      status: 200 | 401 | 403 | 404
      
    PATCH:
      body: UpdateEntityInput
      returns: ApiResponse<AffectedEntity>
      status: 200 | 401 | 403 | 404 | 422
      
  /{id}/assessments:
    GET:
      query: { type?: AssessmentType, status?: VerificationStatus }
      returns: PaginatedResponse<RapidAssessment>
      status: 200 | 401 | 403 | 404
      
  /{id}/responses:
    GET:
      query: { status?: ResponseStatus }
      returns: PaginatedResponse<RapidResponse>
      status: 200 | 401 | 403 | 404
      
  /{id}/gap-analysis:
    GET:
      returns: ApiResponse<GapAnalysisResult>
      status: 200 | 401 | 403 | 404
      note: Calculates gaps from latest assessments
      
  /{id}/assignments:
    GET:
      returns: ApiResponse<EntityAssignment[]>
      status: 200 | 401 | 403 | 404
      
    POST:
      body: { userId: string, role: AssignmentRole }
      returns: ApiResponse<EntityAssignment>
      status: 201 | 401 | 403 | 404 | 422
      
    DELETE:
      query: { userId: string, role: AssignmentRole }
      returns: ApiResponse<{ deleted: boolean }>
      status: 200 | 401 | 403 | 404
      
  /{id}/auto-approval:
    PATCH:
      body: { enabled: boolean }
      returns: ApiResponse<AffectedEntity>
      status: 200 | 401 | 403 | 404
      permission: CONFIG_AUTO_APPROVAL
```

### 8.7 Synchronization Endpoints

```yaml
/api/v1/sync:
  /status:
    GET:
      returns: ApiResponse<{
        queueSize: number,
        lastSync: string,
        conflicts: number,
        failedItems: number
      }>
      status: 200 | 401
      
  /push:
    POST:
      body: {
        changes: Array<{
          type: 'assessment' | 'response' | 'media',
          action: 'create' | 'update' | 'delete',
          data: any,
          offlineId?: string,
          versionNumber: number
        }>
      }
      returns: ApiResponse<{
        successful: SyncResult[],
        conflicts: ConflictResult[],
        failed: FailedResult[]
      }>
      status: 200 | 401 | 422
      
  /pull:
    GET:
      query: {
        lastSyncTimestamp?: string,
        entities?: string[] (comma-separated entity IDs)
      }
      returns: ApiResponse<{
        assessments: RapidAssessment[],
        responses: RapidResponse[],
        entities: AffectedEntity[],
        syncTimestamp: string
      }>
      status: 200 | 401
      
  /conflicts:
    GET:
      query: { resolved?: boolean, page?: number }
      returns: PaginatedResponse<SyncConflict>
      status: 200 | 401 | 403
```

### 8.8 Dashboard Data Endpoints

```yaml
/api/v1/dashboard:
  /crisis:
    GET:
      returns: ApiResponse<{
        assessmentQueue: QueueItem[],
        responseQueue: QueueItem[],
        conflicts: ConflictItem[],
        metrics: {
          pendingAssessments: number,
          pendingResponses: number,
          autoApprovedToday: number,
          averageVerificationTime: number
        }
      }>
      status: 200 | 401 | 403
      refresh: <30 seconds
      
  /situation:
    GET:
      query: { incidentId: string, entityId?: string }
      returns: ApiResponse<{
        incident: Incident,
        entities: AffectedEntity[],
        assessments: Record<string, RapidAssessment[]>, // keyed by entityId
        gapAnalysis: GapAnalysisResult[],
        populationMetrics: PopulationMetrics
      }>
      status: 200 | 401 | 403
      
  /donor:
    GET:
      query: { donorId: string }
      returns: ApiResponse<{
        commitments: DonorCommitment[],
        responses: RapidResponse[],
        performance: {
          rank: number,
          totalCommitments: number,
          deliveryRate: number,
          verifiedRate: number
        },
        leaderboard: DonorLeaderboardEntry[]
      }>
      status: 200 | 401 | 403
```

### 8.9 Donor Management Endpoints

```yaml
/api/v1/donors:
  GET:
    query: { page?: number, pageSize?: number, sortBy?: 'rank' | 'commitments' | 'deliveryRate' }
    returns: PaginatedResponse<Donor>
    status: 200 | 401
    
  POST:
    body: CreateDonorInput
    returns: ApiResponse<Donor>
    status: 201 | 422
    
  /{id}/commitments:
    GET:
      returns: ApiResponse<DonorCommitment[]>
      status: 200 | 401 | 403 | 404
      
    POST:
      body: {
        entityId: string,
        incidentId: string,
        items: Array<{ name: string, unit: string, quantity: number }>
      }
      returns: ApiResponse<DonorCommitment>
      status: 201 | 401 | 403 | 422
      
  /{id}/leaderboard:
    GET:
      returns: ApiResponse<{
        currentRank: number,
        totalDonors: number,
        topDonors: DonorLeaderboardEntry[],
        performance: DonorPerformance
      }>
      status: 200 | 401 | 403 | 404
```

---

## 9. Backend Services

### 9.1 Supabase Client Setup

// lib/db/supabase.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role (bypasses RLS)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

### 9.2 Authentication Service

```typescript
// lib/auth/service.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/client';

export class AuthService {
  private static JWT_SECRET = process.env.JWT_SECRET!;
  private static JWT_EXPIRES_IN = '24h';
  
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
  
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  static generateToken(payload: {
    userId: string;
    email: string;
    roles: string[];
    permissions: string[];
  }): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }
  
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  static async getUserWithRoles(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });
  }
  
  static async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const user = await this.getUserWithRoles(userId);
    if (!user) return false;
    
    const permissions = user.roles.flatMap(ur =>
      ur.role.permissions.map(p => p.code)
    );
    
    return permissions.includes(permissionCode);
  }
  
  static async hasRole(userId: string, roleName: string): Promise<boolean> {
    const user = await this.getUserWithRoles(userId);
    if (!user) return false;
    
    return user.roles.some(ur => ur.role.name === roleName);
  }
}
```

### 9.3 Authorization Middleware

```typescript
// lib/auth/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './service';

export function withAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({
          error: {
            type: 'authentication_error',
            code: 'MISSING_TOKEN',
            message: 'Authorization token required',
          },
        }, { status: 401 });
      }
      
      const token = authHeader.substring(7);
      const payload = AuthService.verifyToken(token);
      
      // Get fresh user data
      const user = await AuthService.getUserWithRoles(payload.userId);
      if (!user || !user.isActive) {
        return NextResponse.json({
          error: {
            type: 'authentication_error',
            code: 'USER_INACTIVE',
            message: 'User account is inactive',
          },
        }, { status: 401 });
      }
      
      // Build context
      const context: AuthContext = {
        user,
        userId: user.id,
        roles: user.roles.map(ur => ur.role.name),
        permissions: user.roles.flatMap(ur =>
          ur.role.permissions.map(p => p.code)
        ),
      };
      
      return await handler(req, context);
    } catch (error) {
      return NextResponse.json({
        error: {
          type: 'authentication_error',
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      }, { status: 401 });
    }
  };
}

export function requirePermission(permission: string) {
  return (handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>) => {
    return withAuth(async (req, context) => {
      if (!context.permissions.includes(permission)) {
        return NextResponse.json({
          error: {
            type: 'authorization_error',
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Permission required: ${permission}`,
          },
        }, { status: 403 });
      }
      
      return await handler(req, context);
    });
  };
}

export function requireRole(role: string) {
  return (handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>) => {
    return withAuth(async (req, context) => {
      if (!context.roles.includes(role)) {
        return NextResponse.json({
          error: {
            type: 'authorization_error',
            code: 'INSUFFICIENT_ROLE',
            message: `Role required: ${role}`,
          },
        }, { status: 403 });
      }
      
      return await handler(req, context);
    });
  };
}

interface AuthContext {
  user: any;
  userId: string;
  roles: string[];
  permissions: string[];
}
```

### 9.4 Entity Assignment Service

```typescript
// lib/services/entity-assignment.service.ts

import { prisma } from '@/lib/db/client';
import { AssignmentRole } from '@prisma/client';

export class EntityAssignmentService {
  /**
   * Check if user is assigned to entity with specific role
   */
  static async isUserAssigned(
    userId: string,
    entityId: string,
    role?: AssignmentRole
  ): Promise<boolean> {
    const assignment = await prisma.entityAssignment.findFirst({
      where: {
        userId,
        entityId,
        ...(role && { role }),
        isActive: true,
      },
    });
    
    return !!assignment;
  }
  
  /**
   * Get all entities assigned to user
   */
  static async getUserEntities(
    userId: string,
    role?: AssignmentRole
  ) {
    return prisma.affectedEntity.findMany({
      where: {
        assignments: {
          some: {
            userId,
            ...(role && { role }),
            isActive: true,
          },
        },
      },
      include: {
        incidents: {
          include: {
            incident: true,
          },
        },
      },
    });
  }
  
  /**
   * Assign user to entity
   */
  static async assignUser(
    entityId: string,
    userId: string,
    role: AssignmentRole,
    assignedBy: string
  ) {
    // Check if already assigned
    const existing = await prisma.entityAssignment.findFirst({
      where: { entityId, userId, role },
    });
    
    if (existing) {
      // Reactivate if inactive
      if (!existing.isActive) {
        return prisma.entityAssignment.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
      return existing;
    }
    
    // Create new assignment
    return prisma.entityAssignment.create({
      data: {
        entityId,
        userId,
        role,
        assignedBy,
      },
    });
  }
  
  /**
   * Remove user assignment
   */
  static async removeUser(
    entityId: string,
    userId: string,
    role: AssignmentRole
  ) {
    return prisma.entityAssignment.updateMany({
      where: { entityId, userId, role },
      data: { isActive: false },
    });
  }
  
  /**
   * Get all users assigned to entity
   */
  static async getEntityUsers(entityId: string, role?: AssignmentRole) {
    return prisma.user.findMany({
      where: {
        entityAssignments: {
          some: {
            entityId,
            ...(role && { role }),
            isActive: true,
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }
}
```



### 9.4 Auto-Approval Service (Continued)

```typescript
// lib/services/auto-approval.service.ts (continued)

import { prisma } from '@/lib/db/client';
import { VerificationStatus } from '@prisma/client';

export class AutoApprovalService {
  /**
   * Auto-approve response
   */
  static async autoApproveResponse(responseId: string) {
    return prisma.rapidResponse.update({
      where: { id: responseId },
      data: {
        verificationStatus: VerificationStatus.AUTO_VERIFIED,
      },
    });
  }
  
  /**
   * Toggle auto-approval for entity
   */
  static async toggleEntityAutoApproval(
    entityId: string,
    enabled: boolean,
    updatedBy: string
  ) {
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'TOGGLE_AUTO_APPROVAL',
        entityType: 'AffectedEntity',
        entityId,
        beforeValue: { autoApproveEnabled: !enabled },
        afterValue: { autoApproveEnabled: enabled },
        timestamp: new Date(),
      },
    });
    
    return prisma.affectedEntity.update({
      where: { id: entityId },
      data: { autoApproveEnabled: enabled },
    });
  }
}
```

### 9.5 Gap Analysis Service

```typescript
// lib/services/gap-analysis.service.ts

import { prisma } from '@/lib/db/client';
import { AssessmentType } from '@prisma/client';

export interface GapResult {
  assessmentType: AssessmentType;
  hasGaps: boolean;
  gapCount: number;
  severity: 'NONE' | 'MILD' | 'SEVERE';
  gapFields: string[];
  lastAssessmentDate: Date;
}

export interface EntityGapAnalysis {
  entityId: string;
  entityName: string;
  overallSeverity: 'NONE' | 'MILD' | 'SEVERE';
  totalGaps: number;
  assessmentGaps: GapResult[];
}

export class GapAnalysisService {
  // Gap-indicating fields by assessment type
  private static GAP_FIELDS: Record<AssessmentType, string[]> = {
    HEALTH: [
      'hasFunctionalClinic',
      'hasEmergencyServices',
      'hasMedicalSupplies',
      'hasTrainedStaff',
    ],
    WASH: [
      'isWaterSufficient',
      'hasCleanWaterAccess',
      'areLatrinesSufficient',
      'hasHandwashingFacilities',
    ],
    SHELTER: [
      'areSheltersSufficient',
      'hasSafeStructures',
      'hasWeatherProtection',
    ],
    FOOD: [
      'isFoodSufficient',
      'hasRegularMealAccess',
      'hasInfantNutrition',
    ],
    SECURITY: [
      'isSafeFromViolence',
      'hasSecurityPresence',
      'hasLighting',
    ],
    POPULATION: [], // No boolean gaps for population
  };
  
  /**
   * Analyze gaps for a single assessment
   */
  static analyzeAssessmentGaps(
    assessmentType: AssessmentType,
    assessmentData: any
  ): { gapCount: number; gapFields: string[] } {
    const gapFields = this.GAP_FIELDS[assessmentType] || [];
    const detectedGaps: string[] = [];
    
    for (const field of gapFields) {
      // Gap exists if field is FALSE
      if (assessmentData[field] === false) {
        detectedGaps.push(field);
      }
    }
    
    return {
      gapCount: detectedGaps.length,
      gapFields: detectedGaps,
    };
  }
  
  /**
   * Calculate severity based on gap count
   */
  static calculateSeverity(gapCount: number): 'NONE' | 'MILD' | 'SEVERE' {
    if (gapCount === 0) return 'NONE';
    if (gapCount === 1) return 'MILD';
    return 'SEVERE';
  }
  
  /**
   * Get latest assessment per type for entity
   */
  static async getLatestAssessments(entityId: string) {
    const assessmentTypes: AssessmentType[] = [
      'HEALTH',
      'WASH',
      'SHELTER',
      'FOOD',
      'SECURITY',
      'POPULATION',
    ];
    
    const latestAssessments = await Promise.all(
      assessmentTypes.map(async (type) => {
        return prisma.rapidAssessment.findFirst({
          where: {
            entityId,
            assessmentType: type,
            verificationStatus: {
              in: ['VERIFIED', 'AUTO_VERIFIED'],
            },
          },
          orderBy: { assessmentDate: 'desc' },
        });
      })
    );
    
    return latestAssessments.filter(Boolean);
  }
  
  /**
   * Analyze gaps for single entity
   */
  static async analyzeEntityGaps(entityId: string): Promise<EntityGapAnalysis> {
    const entity = await prisma.affectedEntity.findUnique({
      where: { id: entityId },
      select: { name: true },
    });
    
    if (!entity) {
      throw new Error('Entity not found');
    }
    
    const latestAssessments = await this.getLatestAssessments(entityId);
    
    const assessmentGaps: GapResult[] = latestAssessments.map((assessment) => {
      const { gapCount, gapFields } = this.analyzeAssessmentGaps(
        assessment.assessmentType,
        assessment.assessmentData
      );
      
      return {
        assessmentType: assessment.assessmentType,
        hasGaps: gapCount > 0,
        gapCount,
        severity: this.calculateSeverity(gapCount),
        gapFields,
        lastAssessmentDate: assessment.assessmentDate,
      };
    });
    
    // Calculate overall severity (worst among all assessments)
    const totalGaps = assessmentGaps.reduce((sum, g) => sum + g.gapCount, 0);
    const hasSevere = assessmentGaps.some((g) => g.severity === 'SEVERE');
    const hasMild = assessmentGaps.some((g) => g.severity === 'MILD');
    
    const overallSeverity = hasSevere ? 'SEVERE' : hasMild ? 'MILD' : 'NONE';
    
    return {
      entityId,
      entityName: entity.name,
      overallSeverity,
      totalGaps,
      assessmentGaps,
    };
  }
  
  /**
   * Analyze gaps for multiple entities (for incident view)
   */
  static async analyzeIncidentGaps(incidentId: string): Promise<EntityGapAnalysis[]> {
    // Get all entities affected by incident
    const incidentEntities = await prisma.incidentEntity.findMany({
      where: { incidentId },
      include: { entity: true },
    });
    
    // Analyze gaps for each entity
    const gapAnalyses = await Promise.all(
      incidentEntities.map((ie) => this.analyzeEntityGaps(ie.entityId))
    );
    
    return gapAnalyses;
  }
  
  /**
   * Get aggregated gap summary across all entities in incident
   */
  static async getIncidentGapSummary(incidentId: string) {
    const entityGaps = await this.analyzeIncidentGaps(incidentId);
    
    // Count entities by severity
    const severityCounts = {
      NONE: entityGaps.filter((g) => g.overallSeverity === 'NONE').length,
      MILD: entityGaps.filter((g) => g.overallSeverity === 'MILD').length,
      SEVERE: entityGaps.filter((g) => g.overallSeverity === 'SEVERE').length,
    };
    
    // Count gaps by assessment type
    const assessmentTypeCounts: Record<string, { NONE: number; MILD: number; SEVERE: number }> = {};
    
    for (const entityGap of entityGaps) {
      for (const assessmentGap of entityGap.assessmentGaps) {
        if (!assessmentTypeCounts[assessmentGap.assessmentType]) {
          assessmentTypeCounts[assessmentGap.assessmentType] = { NONE: 0, MILD: 0, SEVERE: 0 };
        }
        assessmentTypeCounts[assessmentGap.assessmentType][assessmentGap.severity]++;
      }
    }
    
    return {
      totalEntities: entityGaps.length,
      severityCounts,
      assessmentTypeCounts,
      totalGaps: entityGaps.reduce((sum, g) => sum + g.totalGaps, 0),
    };
  }
}
```

### 9.6 Verification Service

```typescript
// lib/services/verification.service.ts

import { prisma } from '@/lib/db/client';
import { VerificationStatus } from '@prisma/client';
import { AutoApprovalService } from './auto-approval.service';

export class VerificationService {
  /**
   * Verify assessment
   */
  static async verifyAssessment(
    assessmentId: string,
    action: 'approve' | 'reject',
    verifiedBy: string,
    reason?: string,
    feedback?: string
  ) {
    const assessment = await prisma.rapidAssessment.findUnique({
      where: { id: assessmentId },
    });
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    
    // Cannot reject auto-verified items
    if (assessment.verificationStatus === VerificationStatus.AUTO_VERIFIED) {
      throw new Error('Cannot reject auto-verified assessment');
    }
    
    const newStatus = action === 'approve' 
      ? VerificationStatus.VERIFIED 
      : VerificationStatus.REJECTED;
    
    // Update assessment
    const updated = await prisma.rapidAssessment.update({
      where: { id: assessmentId },
      data: {
        verificationStatus: newStatus,
        ...(action === 'reject' && {
          rejectionReason: reason,
          rejectionFeedback: feedback,
        }),
      },
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: verifiedBy,
        action: action === 'approve' ? 'VERIFY_ASSESSMENT' : 'REJECT_ASSESSMENT',
        entityType: 'RapidAssessment',
        entityId: assessmentId,
        beforeValue: { verificationStatus: assessment.verificationStatus },
        afterValue: { 
          verificationStatus: newStatus,
          ...(action === 'reject' && { rejectionReason: reason, rejectionFeedback: feedback }),
        },
        timestamp: new Date(),
      },
    });
    
    return updated;
  }
  
  /**
   * Verify response
   */
  static async verifyResponse(
    responseId: string,
    action: 'approve' | 'reject',
    verifiedBy: string,
    reason?: string,
    feedback?: string
  ) {
    const response = await prisma.rapidResponse.findUnique({
      where: { id: responseId },
      include: { donor: true },
    });
    
    if (!response) {
      throw new Error('Response not found');
    }
    
    // Cannot reject auto-verified items
    if (response.verificationStatus === VerificationStatus.AUTO_VERIFIED) {
      throw new Error('Cannot reject auto-verified response');
    }
    
    const newStatus = action === 'approve'
      ? VerificationStatus.VERIFIED
      : VerificationStatus.REJECTED;
    
    // Update response
    const updated = await prisma.rapidResponse.update({
      where: { id: responseId },
      data: {
        verificationStatus: newStatus,
        ...(action === 'reject' && {
          rejectionReason: reason,
          rejectionFeedback: feedback,
        }),
      },
    });
    
    // Update donor metrics if verified
    if (action === 'approve' && response.donorId) {
      await this.updateDonorMetrics(response.donorId);
    }
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: verifiedBy,
        action: action === 'approve' ? 'VERIFY_RESPONSE' : 'REJECT_RESPONSE',
        entityType: 'RapidResponse',
        entityId: responseId,
        beforeValue: { verificationStatus: response.verificationStatus },
        afterValue: {
          verificationStatus: newStatus,
          ...(action === 'reject' && { rejectionReason: reason, rejectionFeedback: feedback }),
        },
        timestamp: new Date(),
      },
    });
    
    return updated;
  }
  
  /**
   * Get verification queue
   */
  static async getVerificationQueue(
    type?: 'assessment' | 'response',
    page = 1,
    pageSize = 20
  ) {
    const skip = (page - 1) * pageSize;
    
    if (type === 'assessment' || !type) {
      const assessments = await prisma.rapidAssessment.findMany({
        where: {
          verificationStatus: VerificationStatus.PENDING,
        },
        include: {
          affectedEntity: true,
          assessor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize,
      });
      
      const totalCount = await prisma.rapidAssessment.count({
        where: { verificationStatus: VerificationStatus.PENDING },
      });
      
      if (type === 'assessment') {
        return {
          items: assessments,
          totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        };
      }
    }
    
    if (type === 'response' || !type) {
      const responses = await prisma.rapidResponse.findMany({
        where: {
          verificationStatus: VerificationStatus.PENDING,
          status: 'DELIVERED', // Only verify delivered responses
        },
        include: {
          affectedEntity: true,
          responder: {
            select: { id: true, name: true, email: true },
          },
          assessment: {
            select: { id: true, assessmentType: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize,
      });
      
      const totalCount = await prisma.rapidResponse.count({
        where: {
          verificationStatus: VerificationStatus.PENDING,
          status: 'DELIVERED',
        },
      });
      
      if (type === 'response') {
        return {
          items: responses,
          totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        };
      }
    }
    
    // Return combined if no type specified
    // Implementation depends on UI requirements
    return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
  
  /**
   * Update donor performance metrics
   */
  private static async updateDonorMetrics(donorId: string) {
    // Get all commitments
    const commitments = await prisma.donorCommitment.findMany({
      where: { donorId },
    });
    
    // Get all verified responses
    const verifiedResponses = await prisma.rapidResponse.findMany({
      where: {
        donorId,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });
    
    // Calculate metrics
    const totalCommitments = commitments.reduce(
      (sum, c) => sum + (c.items as any[]).reduce((s, i) => s + i.quantity, 0),
      0
    );
    
    const totalDelivered = commitments.reduce(
      (sum, c) => sum + c.deliveredQuantity,
      0
    );
    
    const verifiedDelivered = commitments.reduce(
      (sum, c) => sum + c.verifiedDeliveredQuantity,
      0
    );
    
    const selfReportedRate = totalCommitments > 0 
      ? (totalDelivered / totalCommitments) * 100 
      : 0;
    
    const verifiedRate = totalCommitments > 0 
      ? (verifiedDelivered / totalCommitments) * 100 
      : 0;
    
    // Update donor
    await prisma.donor.update({
      where: { id: donorId },
      data: {
        totalCommitments,
        totalDelivered,
        selfReportedDeliveryRate: selfReportedRate,
        verifiedDeliveryRate: verifiedRate,
      },
    });
    
    // Recalculate leaderboard ranks
    await this.updateLeaderboardRanks();
  }
  
  /**
   * Update leaderboard ranks for all donors
   */
  private static async updateLeaderboardRanks() {
    const donors = await prisma.donor.findMany({
      orderBy: [
        { verifiedDeliveryRate: 'desc' },
        { totalCommitments: 'desc' },
      ],
    });
    
    // Update ranks
    await Promise.all(
      donors.map((donor, index) =>
        prisma.donor.update({
          where: { id: donor.id },
          data: { leaderboardRank: index + 1 },
        })
      )
    );
  }
}
```

---

## 10. Synchronization Engine

### 10.1 Sync Engine Core

```typescript
// lib/sync/engine.ts

import { prisma } from '@/lib/db/client';
import { SyncStatus, VerificationStatus } from '@prisma/client';
import { AutoApprovalService } from '@/lib/services/auto-approval.service';

export interface SyncChange {
  type: 'assessment' | 'response' | 'media';
  action: 'create' | 'update' | 'delete';
  data: any;
  offlineId?: string;
  versionNumber: number;
}

export interface SyncResult {
  offlineId?: string;
  serverId: string;
  status: 'success' | 'conflict' | 'failed';
  message?: string;
}

export class SyncEngine {
  /**
   * Process batch sync from client
   */
  static async processSyncBatch(
    changes: SyncChange[],
    userId: string
  ): Promise<{
    successful: SyncResult[];
    conflicts: SyncResult[];
    failed: SyncResult[];
  }> {
    const results = {
      successful: [] as SyncResult[],
      conflicts: [] as SyncResult[],
      failed: [] as SyncResult[],
    };
    
    for (const change of changes) {
      try {
        const result = await this.processSingleChange(change, userId);
        
        if (result.status === 'success') {
          results.successful.push(result);
        } else if (result.status === 'conflict') {
          results.conflicts.push(result);
        } else {
          results.failed.push(result);
        }
      } catch (error) {
        results.failed.push({
          offlineId: change.offlineId,
          serverId: '',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }
  
  /**
   * Process single sync change
   */
  private static async processSingleChange(
    change: SyncChange,
    userId: string
  ): Promise<SyncResult> {
    switch (change.type) {
      case 'assessment':
        return this.syncAssessment(change, userId);
      case 'response':
        return this.syncResponse(change, userId);
      case 'media':
        return this.syncMedia(change, userId);
      default:
        throw new Error(`Unknown sync type: ${change.type}`);
    }
  }
  
  /**
   * Sync assessment
   */
  private static async syncAssessment(
    change: SyncChange,
    userId: string
  ): Promise<SyncResult> {
    const { action, data, offlineId, versionNumber } = change;
    
    if (action === 'create') {
      // Check for existing by offlineId
      if (offlineId) {
        const existing = await prisma.rapidAssessment.findUnique({
          where: { offlineId },
        });
        
        if (existing) {
          return {
            offlineId,
            serverId: existing.id,
            status: 'success',
            message: 'Assessment already synced',
          };
        }
      }
      
      // Check auto-approval
      const shouldAutoApprove = await AutoApprovalService.shouldAutoApprove(
        data.entityId,
        versionNumber === 1
      );
      
      // Create new assessment
      const created = await prisma.rapidAssessment.create({
        data: {
          ...data,
          assessorId: userId, // Override with authenticated user
          offlineId,
          versionNumber,
          syncStatus: SyncStatus.SYNCED,
          verificationStatus: shouldAutoApprove 
            ? VerificationStatus.AUTO_VERIFIED 
            : VerificationStatus.PENDING,
        },
      });
      
      return {
        offlineId,
        serverId: created.id,
        status: 'success',
      };
    }
    
    if (action === 'update') {
      // Find existing assessment
      const existing = await prisma.rapidAssessment.findUnique({
        where: offlineId ? { offlineId } : { id: data.id },
      });
      
      if (!existing) {
        throw new Error('Assessment not found for update');
      }
      
      // Check for conflict (last-write-wins)
      if (existing.versionNumber >= versionNumber) {
        // Server version is newer - conflict
        await this.logConflict({
          entityType: 'ASSESSMENT',
          entityId: existing.id,
          winningVersion: existing,
          losingVersion: data,
        });
        
        return {
          offlineId,
          serverId: existing.id,
          status: 'conflict',
          message: 'Server version is newer',
        };
      }
      
      // Apply update
      const updated = await prisma.rapidAssessment.update({
        where: { id: existing.id },
        data: {
          ...data,
          versionNumber,
          syncStatus: SyncStatus.SYNCED,
          updatedAt: new Date(),
        },
      });
      
      return {
        offlineId,
        serverId: updated.id,
        status: 'success',
      };
    }
    
    throw new Error(`Unsupported action: ${action}`);
  }
  
  /**
   * Sync response
   */
  private static async syncResponse(
    change: SyncChange,
    userId: string
  ): Promise<SyncResult> {
    const { action, data, offlineId, versionNumber } = change;
    
    if (action === 'create') {
      // Check for existing by offlineId
      if (offlineId) {
        const existing = await prisma.rapidResponse.findUnique({
          where: { offlineId },
        });
        
        if (existing) {
          return {
            offlineId,
            serverId: existing.id,
            status: 'success',
            message: 'Response already synced',
          };
        }
      }
      
      // Validate assessment exists and entityId matches
      const assessment = await prisma.rapidAssessment.findUnique({
        where: { id: data.assessmentId },
        select: { entityId: true },
      });
      
      if (!assessment) {
        throw new Error('Assessment not found');
      }
      
      if (assessment.entityId !== data.entityId) {
        throw new Error('Response entity must match assessment entity');
      }
      
      // Check auto-approval (only if delivered)
      const shouldAutoApprove = data.status === 'DELIVERED' 
        ? await AutoApprovalService.shouldAutoApprove(data.entityId, versionNumber === 1)
        : false;
      
      // Create new response
      const created = await prisma.rapidResponse.create({
        data: {
          ...data,
          responderId: userId, // Override with authenticated user
          offlineId,
          versionNumber,
          syncStatus: SyncStatus.SYNCED,
          verificationStatus: data.status === 'DELIVERED'
            ? (shouldAutoApprove ? VerificationStatus.AUTO_VERIFIED : VerificationStatus.PENDING)
            : VerificationStatus.DRAFT,
        },
      });
      
      return {
        offlineId,
        serverId: created.id,
        status: 'success',
      };
    }
    
    if (action === 'update') {
      // Find existing response
      const existing = await prisma.rapidResponse.findUnique({
        where: offlineId ? { offlineId } : { id: data.id },
      });
      
      if (!existing) {
        throw new Error('Response not found for update');
      }
      
      // Check for conflict (last-write-wins)
      if (existing.versionNumber >= versionNumber) {
        // Server version is newer - conflict
        await this.logConflict({
          entityType: 'RESPONSE',
          entityId: existing.id,
          winningVersion: existing,
          losingVersion: data,
        });
        
        return {
          offlineId,
          serverId: existing.id,
          status: 'conflict',
          message: 'Server version is newer',
        };
      }
      
      // Check if status changed to DELIVERED
      const statusChanged = existing.status !== data.status && data.status === 'DELIVERED';
      const shouldAutoApprove = statusChanged 
        ? await AutoApprovalService.shouldAutoApprove(data.entityId, versionNumber === 1)
        : false;
      
      // Apply update
      const updated = await prisma.rapidResponse.update({
        where: { id: existing.id },
        data: {
          ...data,
          versionNumber,
          syncStatus: SyncStatus.SYNCED,
          ...(statusChanged && {
            verificationStatus: shouldAutoApprove 
              ? VerificationStatus.AUTO_VERIFIED 
              : VerificationStatus.PENDING,
          }),
          updatedAt: new Date(),
        },
      });
      
      return {
        offlineId,
        serverId: updated.id,
        status: 'success',
      };
    }
    
    throw new Error(`Unsupported action: ${action}`);
  }
  
  /**
   * Sync media attachment
   */
  private static async syncMedia(
    change: SyncChange,
    userId: string
  ): Promise<SyncResult> {
    // Media sync implementation
    // This would typically involve uploading to R2/S3
    // For now, placeholder implementation
    
    const { data, offlineId } = change;
    
    // Upload file to storage (implementation depends on storage service)
    // const url = await uploadToStorage(data.localPath);
    
    const created = await prisma.mediaAttachment.create({
      data: {
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
        metadata: data.metadata,
        assessmentId: data.assessmentId,
        responseId: data.responseId,
        syncStatus: SyncStatus.SYNCED,
        // url: url, // Set after upload
      },
    });
    
    return {
      offlineId,
      serverId: created.id,
      status: 'success',
    };
  }
  
  /**
   * Log sync conflict
   */
  private static async logConflict(conflict: {
    entityType: string;
    entityId: string;
    winningVersion: any;
    losingVersion: any;
  }) {
    return prisma.syncConflict.create({
      data: {
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        conflictDate: new Date(),
        resolutionMethod: 'LAST_WRITE_WINS',
        winningVersion: conflict.winningVersion,
        losingVersion: conflict.losingVersion,
        resolvedAt: new Date(),
        coordinatorNotified: false,
      },
    });
  }
  
  /**
   * Get data for pull sync
   */
  static async getPullData(
    userId: string,
    lastSyncTimestamp?: string,
    entityIds?: string[]
  ) {
    const since = lastSyncTimestamp ? new Date(lastSyncTimestamp) : undefined;
    
    // Get user's assigned entities
    const assignments = await prisma.entityAssignment.findMany({
      where: {
        userId,
        isActive: true,
        ...(entityIds && { entityId: { in: entityIds } }),
      },
      select: { entityId: true },
    });
    
    const assignedEntityIds = assignments.map((a) => a.entityId);
    
    // Get assessments
    const assessments = await prisma.rapidAssessment.findMany({
      where: {
        entityId: { in: assignedEntityIds },
        ...(since && { updatedAt: { gte: since } }),
      },
      include: {
        mediaAttachments: true,
      },
    });
    
    // Get responses
    const responses = await prisma.rapidResponse.findMany({
      where: {
        entityId: { in: assignedEntityIds },
        ...(since && { updatedAt: { gte: since } }),
      },
      include: {
        mediaAttachments: true,
      },
    });
    
    // Get entities
    const entities = await prisma.affectedEntity.findMany({
      where: {
        id: { in: assignedEntityIds },
      },
    });
    
    return {
      assessments,
      responses,
      entities,
      syncTimestamp: new Date().toISOString(),
    };
  }
}
```

---

## Part 3B Summary

This completes Part 3 of the architecture document, covering:
- Complete API specification with all endpoints
- Backend services (Auth, Entity Assignment, Auto-Approval, Gap Analysis, Verification)
- Synchronization engine with conflict resolution


# Part 4: Frontend Architecture & Offline Strategy

---

## 11. Component Architecture

### 11.1 Component Organization Strategy

**Component Hierarchy:**
```
UI Layer (Shadcn/ui)
  └── Feature Components (Business Logic)
      └── Layout Components (Structure)
          └── Shared Components (Utilities)
```

**Naming and Location:**
- **UI Components** (`components/ui/`): Shadcn/ui primitives - DO NOT MODIFY
- **Feature Components** (`components/features/`): Domain-specific, self-contained
- **Layout Components** (`components/layouts/`): Page structure, navigation
- **Shared Components** (`components/shared/`): Reusable across features

### 11.2 Core Layout Components

#### AppShell Component

```typescript
// components/layouts/AppShell.tsx

'use client';

import { FC, ReactNode } from 'react';
import { Navigation } from './Navigation';
import { RoleSwitcher } from './RoleSwitcher';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { SyncIndicator } from '@/components/shared/SyncIndicator';
import { useAuthStore } from '@/stores/auth.store';
import { useOfflineStore } from '@/stores/offline.store';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: FC<AppShellProps> = ({ children }) => {
  const { user, currentRole } = useAuthStore();
  const { isOffline, queueSize } = useOfflineStore();
  
  if (!user || !currentRole) {
    return null;
  }
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Navigation 
        user={user} 
        currentRole={currentRole}
        queueSize={queueSize}
        isOffline={isOffline}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <OfflineIndicator isOffline={isOffline} />
            <SyncIndicator queueSize={queueSize} />
          </div>
          
          <div className="flex items-center space-x-4">
            <RoleSwitcher />
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
```

#### Navigation Component

```typescript
// components/layouts/Navigation.tsx

'use client';

import { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  FileText, 
  MapPin, 
  Cloud, 
  AlertTriangle,
  CheckCircle,
  Package,
  TrendingUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { User, RoleName } from '@/types/entities';

interface NavigationProps {
  user: User;
  currentRole: RoleName;
  queueSize: number;
  isOffline: boolean;
}

interface NavItem {
  label: string;
  path: string;
  icon: any;
  badge?: number;
  badgeColor?: string;
}

const NAVIGATION_CONFIG: Record<RoleName, NavItem[]> = {
  ASSESSOR: [
    { label: 'Dashboard', path: '/assessor/dashboard', icon: Home },
    { label: 'Assessments', path: '/assessor/assessments', icon: FileText },
    { label: 'My Entities', path: '/assessor/entities', icon: MapPin },
    { label: 'Sync Queue', path: '/assessor/sync', icon: Cloud },
  ],
  COORDINATOR: [
    { label: 'Crisis Dashboard', path: '/coordinator/dashboard', icon: AlertTriangle },
    { label: 'Verification', path: '/coordinator/verification', icon: CheckCircle },
    { label: 'Monitoring', path: '/coordinator/monitoring', icon: TrendingUp },
    { label: 'Incidents', path: '/coordinator/incidents', icon: AlertTriangle },
    { label: 'Entities', path: '/coordinator/entities', icon: MapPin },
  ],
  RESPONDER: [
    { label: 'Dashboard', path: '/responder/dashboard', icon: Home },
    { label: 'Responses', path: '/responder/responses', icon: Package },
    { label: 'My Entities', path: '/responder/entities', icon: MapPin },
    { label: 'Sync Queue', path: '/responder/sync', icon: Cloud },
  ],
  DONOR: [
    { label: 'Dashboard', path: '/donor/dashboard', icon: TrendingUp },
    { label: 'Commitments', path: '/donor/commitments', icon: Package },
    { label: 'Entities', path: '/donor/entities', icon: MapPin },
  ],
  ADMIN: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: Home },
    { label: 'Users', path: '/admin/users', icon: Home },
    { label: 'Audit Logs', path: '/admin/audit', icon: FileText },
  ],
};

export const Navigation: FC<NavigationProps> = ({ 
  user, 
  currentRole, 
  queueSize,
  isOffline 
}) => {
  const pathname = usePathname();
  const navItems = NAVIGATION_CONFIG[currentRole] || [];
  
  return (
    <aside className="w-64 bg-white border-r h-screen flex flex-col">
      {/* Role Header */}
      <div className="p-4 border-b bg-blue-50">
        <div>
          <p className="text-xs text-gray-500">Active Role</p>
          <h2 className="font-semibold text-lg">{currentRole}</h2>
        </div>
      </div>
      
      {/* User Info */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            const Icon = item.icon;
            const badge = item.label === 'Sync Queue' ? queueSize : item.badge;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                
                {badge !== undefined && badge > 0 && (
                  <span className={cn(
                    'px-2 py-0.5 text-xs rounded-full',
                    item.badgeColor === 'orange' || isOffline
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                  )}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-gray-500 text-center">
          DMS v1.0 - Borno State
        </p>
      </div>
    </aside>
  );
};
```

#### RoleSwitcher Component

```typescript
// components/layouts/RoleSwitcher.tsx

'use client';

import { FC } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { RoleName } from '@/types/entities';
import { useRouter } from 'next/navigation';

const ROLE_PATHS: Record<RoleName, string> = {
  ASSESSOR: '/assessor/dashboard',
  COORDINATOR: '/coordinator/dashboard',
  RESPONDER: '/responder/dashboard',
  DONOR: '/donor/dashboard',
  ADMIN: '/admin/dashboard',
};

export const RoleSwitcher: FC = () => {
  const router = useRouter();
  const { user, currentRole, availableRoles, switchRole } = useAuthStore();
  
  if (!user || availableRoles.length <= 1) {
    return null;
  }
  
  const handleRoleSwitch = async (role: RoleName) => {
    if (role === currentRole) return;
    
    // Save current session state before switching
    // This is handled by Zustand persistence
    
    await switchRole(role);
    router.push(ROLE_PATHS[role]);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-40">
          <span className="flex-1 text-left">{currentRole}</span>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {availableRoles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => handleRoleSwitch(role)}
            className={role === currentRole ? 'bg-blue-50' : ''}
          >
            {role}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

### 11.3 Shared Components

#### OfflineIndicator Component

```typescript
// components/shared/OfflineIndicator.tsx

'use client';

import { FC } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  isOffline: boolean;
}

export const OfflineIndicator: FC<OfflineIndicatorProps> = ({ isOffline }) => {
  if (!isOffline) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <Wifi className="w-4 h-4" />
        <span className="text-sm font-medium">Online</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-2 text-orange-600">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">Offline Mode</span>
    </div>
  );
};
```

#### SyncIndicator Component

```typescript
// components/shared/SyncIndicator.tsx

'use client';

import { FC } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineStore } from '@/stores/offline.store';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SyncIndicatorProps {
  queueSize: number;
}

export const SyncIndicator: FC<SyncIndicatorProps> = ({ queueSize }) => {
  const { syncInProgress, startSync, syncQueue } = useOfflineStore();
  
  if (queueSize === 0) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <Cloud className="w-4 h-4" />
        <span className="text-sm">Synced</span>
      </div>
    );
  }
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {syncInProgress ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CloudOff className="w-4 h-4" />
          )}
          <span className="ml-2">{queueSize} pending</span>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
            {queueSize}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h3 className="font-semibold">Sync Queue</h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {syncQueue.map((item) => (
              <div key={item.id} className="text-sm p-2 bg-gray-50 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.type}</span>
                  <span className="text-xs text-gray-500">
                    {item.retryCount > 0 ? `Retry ${item.retryCount}` : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Button 
            onClick={startSync} 
            disabled={syncInProgress}
            className="w-full"
          >
            {syncInProgress ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
```

### 11.4 Form Field Components

#### BooleanField Component

```typescript
// components/forms/fields/BooleanField.tsx

'use client';

import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AlertCircle } from 'lucide-react';

interface BooleanFieldProps {
  name: string;
  label: string;
  description?: string;
  showGapIndicator?: boolean; // Show red/green indicator
  gapWhenFalse?: boolean; // Gap exists when value is FALSE
}

export const BooleanField: FC<BooleanFieldProps> = ({
  name,
  label,
  description,
  showGapIndicator = false,
  gapWhenFalse = true,
}) => {
  const form = useFormContext();
  
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5 flex-1">
            <FormLabel className="text-base flex items-center gap-2">
              {label}
              {showGapIndicator && (
                <span className={
                  (gapWhenFalse && !field.value) || (!gapWhenFalse && field.value)
                    ? 'text-red-500'
                    : 'text-green-500'
                }>
                  {(gapWhenFalse && !field.value) || (!gapWhenFalse && field.value) ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-green-500" />
                  )}
                </span>
              )}
            </FormLabel>
            {description && (
              <FormDescription>{description}</FormDescription>
            )}
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};
```

#### GPSField Component

```typescript
// components/forms/fields/GPSField.tsx

'use client';

import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import { useGPS } from '@/hooks/useGPS';

interface GPSFieldProps {
  name: string;
  label?: string;
  autoCapture?: boolean;
}

export const GPSField: FC<GPSFieldProps> = ({
  name,
  label = 'GPS Coordinates',
  autoCapture = false,
}) => {
  const form = useFormContext();
  const { captureGPS, isCapturing } = useGPS();
  const [manualEntry, setManualEntry] = useState(false);
  
  const handleCapture = async () => {
    try {
      const coords = await captureGPS();
      form.setValue(name, coords);
    } catch (error) {
      console.error('GPS capture failed:', error);
      setManualEntry(true);
    }
  };
  
  const currentValue = form.watch(name);
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {!currentValue && !manualEntry && (
        <Button
          type="button"
          onClick={handleCapture}
          disabled={isCapturing}
          className="w-full"
        >
          {isCapturing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Capturing GPS...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              Capture GPS Location
            </>
          )}
        </Button>
      )}
      
      {currentValue && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm font-medium text-green-800">
            Location Captured
          </p>
          <p className="text-xs text-green-600 mt-1">
            Lat: {currentValue.latitude.toFixed(6)}, 
            Lng: {currentValue.longitude.toFixed(6)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Accuracy: {currentValue.accuracy?.toFixed(0)}m
          </p>
        </div>
      )}
      
      {(manualEntry || currentValue) && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={currentValue?.latitude || ''}
              onChange={(e) =>
                form.setValue(name, {
                  ...currentValue,
                  latitude: parseFloat(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={currentValue?.longitude || ''}
              onChange={(e) =>
                form.setValue(name, {
                  ...currentValue,
                  longitude: parseFloat(e.target.value),
                })
              }
            />
          </div>
        </div>
      )}
      
      {!manualEntry && !currentValue && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setManualEntry(true)}
          className="w-full text-xs"
        >
          Enter Coordinates Manually
        </Button>
      )}
    </div>
  );
};
```

#### MediaField Component

```typescript
// components/forms/fields/MediaField.tsx

'use client';

import { FC, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface MediaFieldProps {
  name: string;
  label?: string;
  maxFiles?: number;
  accept?: string;
}

export const MediaField: FC<MediaFieldProps> = ({
  name,
  label = 'Photos',
  maxFiles = 5,
  accept = 'image/*',
}) => {
  const form = useFormContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  
  const currentFiles = form.watch(name) || [];
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Limit to maxFiles
    const remainingSlots = maxFiles - currentFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    // Generate previews
    const newPreviews = await Promise.all(
      filesToAdd.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      })
    );
    
    setPreviews([...previews, ...newPreviews]);
    form.setValue(name, [...currentFiles, ...filesToAdd]);
  };
  
  const handleRemove = (index: number) => {
    const newFiles = currentFiles.filter((_: any, i: number) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    setPreviews(newPreviews);
    form.setValue(name, newFiles);
  };
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {currentFiles.length < maxFiles && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <Camera className="w-4 h-4 mr-2" />
          {currentFiles.length === 0 ? 'Add Photos' : `Add More (${maxFiles - currentFiles.length} remaining)`}
        </Button>
      )}
      
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square">
              <Image
                src={preview}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover rounded-md"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 w-6 h-6"
                onClick={() => handleRemove(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {currentFiles.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No photos added</p>
        </div>
      )}
    </div>
  );
};
```

---

## 12. State Management with Zustand

### 12.1 Auth Store

```typescript
// stores/auth.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, RoleName, Permission } from '@/types/entities';

interface AuthState {
  user: User | null;
  token: string | null;
  currentRole: RoleName | null;
  availableRoles: RoleName[];
  permissions: string[];
  
  // Actions
  login: (user: User, token: string, roles: RoleName[]) => void;
  logout: () => void;
  switchRole: (role: RoleName) => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      currentRole: null,
      availableRoles: [],
      permissions: [],
      
      login: (user, token, roles) => {
        set({
          user,
          token,
          availableRoles: roles,
          currentRole: roles[0] || null,
        });
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          currentRole: null,
          availableRoles: [],
          permissions: [],
        });
        
        // Clear all other stores
        localStorage.clear();
      },
      
      switchRole: (role) => {
        const { availableRoles } = get();
        if (!availableRoles.includes(role)) {
          console.error('Role not available:', role);
          return;
        }
        
        set({ currentRole: role });
      },
      
      updateUser: (updates) => {
        const { user } = get();
        if (!user) return;
        
        set({ user: { ...user, ...updates } });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        currentRole: state.currentRole,
        user: state.user,
        availableRoles: state.availableRoles,
      }),
    }
  )
);
```

---

### 12.2 Offline Store

```typescript
// stores/offline.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db/offline';
import { OfflineQueueItem } from '@/types/entities';

interface OfflineState {
  isOffline: boolean;
  queueSize: number;
  syncInProgress: boolean;
  lastSyncTime: Date | null;
  syncQueue: OfflineQueueItem[];
  
  // Actions
  setOfflineStatus: (status: boolean) => void;
  queueItem: (item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retryCount'>) => Promise<void>;
  startSync: () => Promise<void>;
  clearQueue: () => Promise<void>;
  loadQueue: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOffline: !navigator.onLine,
      queueSize: 0,
      syncInProgress: false,
      lastSyncTime: null,
      syncQueue: [],
      
      setOfflineStatus: (status) => set({ isOffline: status }),
      
      queueItem: async (item) => {
        try {
          const queueItem: OfflineQueueItem = {
            ...item,
            id: crypto.randomUUID(),
            retryCount: 0,
            createdAt: new Date(),
          };
          
          await db.syncQueue.add(queueItem);
          await get().loadQueue();
        } catch (error) {
          console.error('Failed to queue item:', error);
          throw error;
        }
      },
      
      startSync: async () => {
        const { syncInProgress, isOffline } = get();
        
        if (syncInProgress || isOffline) {
          return;
        }
        
        set({ syncInProgress: true });
        
        try {
          const queue = await db.syncQueue.toArray();
          
          // Call sync API
          const response = await fetch('/api/v1/sync/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${useAuthStore.getState().token}`,
            },
            body: JSON.stringify({ changes: queue }),
          });
          
          if (!response.ok) {
            throw new Error('Sync failed');
          }
          
          const result = await response.json();
          
          // Remove successful items from queue
          for (const success of result.data.successful) {
            const item = queue.find(q => q.offlineId === success.offlineId);
            if (item) {
              await db.syncQueue.delete(item.id);
            }
          }
          
          // Update retry count for failed items
          for (const failed of result.data.failed) {
            const item = queue.find(q => q.offlineId === failed.offlineId);
            if (item) {
              await db.syncQueue.update(item.id, {
                retryCount: item.retryCount + 1,
                lastAttempt: new Date(),
                error: failed.message,
              });
            }
          }
          
          set({
            lastSyncTime: new Date(),
            syncInProgress: false,
          });
          
          await get().loadQueue();
        } catch (error) {
          console.error('Sync failed:', error);
          set({ syncInProgress: false });
        }
      },
      
      clearQueue: async () => {
        await db.syncQueue.clear();
        set({ queueSize: 0, syncQueue: [] });
      },
      
      loadQueue: async () => {
        const queue = await db.syncQueue.toArray();
        set({
          queueSize: queue.length,
          syncQueue: queue,
        });
      },
    }),
    {
      name: 'offline-storage',
      partialize: (state) => ({
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOfflineStatus(false);
    useOfflineStore.getState().startSync();
  });
  
  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOfflineStatus(true);
  });
}
```

### 12.3 Entity Store

```typescript
// stores/entity.store.ts

import { create } from 'zustand';
import { AffectedEntity, RapidAssessment, RapidResponse } from '@/types/entities';

interface EntityState {
  assignedEntities: AffectedEntity[];
  selectedEntityId: string | null;
  entityAssessments: Record<string, RapidAssessment[]>;
  entityResponses: Record<string, RapidResponse[]>;
  
  // Actions
  setAssignedEntities: (entities: AffectedEntity[]) => void;
  selectEntity: (entityId: string) => void;
  setEntityAssessments: (entityId: string, assessments: RapidAssessment[]) => void;
  setEntityResponses: (entityId: string, responses: RapidResponse[]) => void;
  clearEntityData: () => void;
}

export const useEntityStore = create<EntityState>((set) => ({
  assignedEntities: [],
  selectedEntityId: null,
  entityAssessments: {},
  entityResponses: {},
  
  setAssignedEntities: (entities) => set({ assignedEntities: entities }),
  
  selectEntity: (entityId) => set({ selectedEntityId: entityId }),
  
  setEntityAssessments: (entityId, assessments) =>
    set((state) => ({
      entityAssessments: {
        ...state.entityAssessments,
        [entityId]: assessments,
      },
    })),
  
  setEntityResponses: (entityId, responses) =>
    set((state) => ({
      entityResponses: {
        ...state.entityResponses,
        [entityId]: responses,
      },
    })),
  
  clearEntityData: () =>
    set({
      assignedEntities: [],
      selectedEntityId: null,
      entityAssessments: {},
      entityResponses: {},
    }),
}));
```

---

## 13. Offline Strategy

### 13.1 IndexedDB Schema with Dexie

```typescript
// lib/db/offline.ts

import Dexie, { Table } from 'dexie';
import {
  RapidAssessment,
  RapidResponse,
  AffectedEntity,
  OfflineQueueItem,
} from '@/types/entities';

export class OfflineDatabase extends Dexie {
  assessments!: Table<RapidAssessment, string>;
  responses!: Table<RapidResponse, string>;
  entities!: Table<AffectedEntity, string>;
  syncQueue!: Table<OfflineQueueItem, string>;
  
  constructor() {
    super('DisasterManagementDB');
    
    this.version(1).stores({
      assessments: 'id, offlineId, entityId, assessmentType, verificationStatus, syncStatus, createdAt',
      responses: 'id, offlineId, entityId, assessmentId, status, verificationStatus, syncStatus, createdAt',
      entities: 'id, type, lga, ward, [locationLat+locationLng]',
      syncQueue: '++id, type, action, priority, createdAt, retryCount',
    });
  }
  
  // Encryption helper (uses Web Crypto API)
  async encryptData(data: any): Promise<string> {
    const key = await this.getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  async decryptData(encrypted: string): Promise<any> {
    const key = await this.getOrCreateKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return JSON.parse(new TextDecoder().decode(decrypted));
  }
  
  private async getOrCreateKey(): Promise<CryptoKey> {
    let keyData = localStorage.getItem('encryptionKey');
    
    if (!keyData) {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      const exported = await crypto.subtle.exportKey('jwk', key);
      localStorage.setItem('encryptionKey', JSON.stringify(exported));
      return key;
    }
    
    return crypto.subtle.importKey(
      'jwk',
      JSON.parse(keyData),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }
}

export const db = new OfflineDatabase();

// Initialize database on app startup
export async function initializeOfflineDB() {
  try {
    await db.open();
    console.log('Offline database initialized');
    
    // Clean up old queue items (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldItems = await db.syncQueue
      .where('createdAt')
      .below(sevenDaysAgo)
      .toArray();
    
    if (oldItems.length > 0) {
      await db.syncQueue.bulkDelete(oldItems.map(i => i.id));
      console.log(`Cleaned up ${oldItems.length} old queue items`);
    }
  } catch (error) {
    console.error('Failed to initialize offline database:', error);
  }
}
```

### 13.2 Custom Hooks for Offline Operations

#### useOffline Hook

```typescript
// hooks/useOffline.ts

import { useEffect } from 'react';
import { useOfflineStore } from '@/stores/offline.store';

export function useOffline() {
  const {
    isOffline,
    queueSize,
    syncInProgress,
    lastSyncTime,
    setOfflineStatus,
    queueItem,
    startSync,
    loadQueue,
  } = useOfflineStore();
  
  // Initialize queue on mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);
  
  // Auto-sync when coming online
  useEffect(() => {
    if (!isOffline && queueSize > 0 && !syncInProgress) {
      const timer = setTimeout(() => {
        startSync();
      }, 1000); // Wait 1 second after coming online
      
      return () => clearTimeout(timer);
    }
  }, [isOffline, queueSize, syncInProgress, startSync]);
  
  return {
    isOffline,
    queueSize,
    syncInProgress,
    lastSyncTime,
    queueItem,
    startSync,
  };
}
```

#### useGPS Hook

```typescript
// hooks/useGPS.ts

import { useState } from 'react';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
  captureMethod: 'GPS' | 'MANUAL';
}

export function useGPS() {
  const [isCapturing, setIsCapturing] = useState(false);
  
  const captureGPS = async (): Promise<GPSCoordinates> => {
    setIsCapturing(true);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }
      
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        }
      );
      
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp),
        captureMethod: 'GPS',
      };
    } catch (error) {
      console.error('GPS capture failed:', error);
      throw error;
    } finally {
      setIsCapturing(false);
    }
  };
  
  return {
    captureGPS,
    isCapturing,
  };
}
```

### 13.3 Service Worker Configuration

```javascript
// public/sw.js

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// API Routes - NetworkFirst with short timeout
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// Entities - StaleWhileRevalidate
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/entities'),
  new StaleWhileRevalidate({
    cacheName: 'entities-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Images - CacheFirst
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Offline fallback page
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      return await fetch(event.request);
    } catch (error) {
      const cache = await caches.open('offline-fallback');
      return cache.match('/offline.html');
    }
  }
);

// Background sync for assessments and responses
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // This would trigger the sync process
  // In practice, the app handles sync through Zustand store
  console.log('Background sync triggered');
}
```

### 13.4 PWA Configuration

```javascript
// next.config.js

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\..*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
});

module.exports = withPWA({
  reactStrictMode: true,
  swcMinify: true,
});
```

### 13.5 Manifest Configuration

```json
// public/manifest.json

{
  "name": "Disaster Management System - Borno State",
  "short_name": "DMS Borno",
  "description": "Offline-first disaster management for humanitarian operations",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "New Assessment",
      "short_name": "Assess",
      "description": "Create new rapid assessment",
      "url": "/assessor/assessments/new",
      "icons": [{ "src": "/icons/assess-96.png", "sizes": "96x96" }]
    },
    {
      "name": "Sync Queue",
      "short_name": "Sync",
      "description": "View sync queue",
      "url": "/assessor/sync",
      "icons": [{ "src": "/icons/sync-96.png", "sizes": "96x96" }]
    }
  ]
}
```

### 13.6 Realtime Updates with Supabase

#### Realtime Subscription Pattern
```typescript
// hooks/useRealtimeQueue.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/db/supabase';

export function useRealtimeQueue(
  table: 'rapid_assessments' | 'rapid_responses'
) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: 'verification_status=eq.PENDING',
        },
        (payload) => {
          console.log(`${table} changed:`, payload);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({
            queryKey: ['verification-queue'],
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryClient]);
}

#### Usage in Dashboard

```typescript
// In any dashboard component
export function VerificationQueue() {
  const { data } = useQuery({
    queryKey: ['verification-queue'],
    queryFn: fetchQueue,
    // No refetchInterval needed!
  });
  
  // Subscribe to realtime changes
  useRealtimeQueue('rapid_assessments');
  useRealtimeQueue('rapid_responses');
  
  return (
    // ... render queue
  );
}
```

---

## 14. Form Systems

### 14.1 Assessment Form Template

```typescript
// components/forms/assessment/HealthAssessmentForm.tsx

'use client';

import { FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { BooleanField } from '@/components/forms/fields/BooleanField';
import { GPSField } from '@/components/forms/fields/GPSField';
import { MediaField } from '@/components/forms/fields/MediaField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useOffline } from '@/hooks/useOffline';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db/offline';

const HealthAssessmentSchema = z.object({
  // Gap-indicating boolean fields
  hasFunctionalClinic: z.boolean(),
  hasEmergencyServices: z.boolean(),
  hasMedicalSupplies: z.boolean(),
  hasTrainedStaff: z.boolean(),
  
  // Quantity fields
  numberHealthFacilities: z.number().int().nonnegative(),
  healthFacilityTypes: z.array(z.string()),
  qualifiedHealthWorkers: z.number().int().nonnegative(),
  commonHealthIssues: z.array(z.string()),
  
  // Additional
  hasMaternalChildServices: z.boolean(),
  additionalDetails: z.string().optional(),
  
  // Metadata
  gpsCoordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional(),
    timestamp: z.date(),
    captureMethod: z.enum(['GPS', 'MANUAL']),
  }),
  photos: z.array(z.any()).optional(),
});

type HealthAssessmentFormData = z.infer<typeof HealthAssessmentSchema>;

interface HealthAssessmentFormProps {
  entityId: string;
  incidentId: string;
  onComplete?: () => void;
}

export const HealthAssessmentForm: FC<HealthAssessmentFormProps> = ({
  entityId,
  incidentId,
  onComplete,
}) => {
  const router = useRouter();
  const { isOffline, queueItem } = useOffline();
  
  const form = useForm<HealthAssessmentFormData>({
    resolver: zodResolver(HealthAssessmentSchema),
    defaultValues: {
      hasFunctionalClinic: false,
      hasEmergencyServices: false,
      hasMedicalSupplies: false,
      hasTrainedStaff: false,
      numberHealthFacilities: 0,
      healthFacilityTypes: [],
      qualifiedHealthWorkers: 0,
      commonHealthIssues: [],
      hasMaternalChildServices: false,
    },
  });
  
  const onSubmit = async (data: HealthAssessmentFormData) => {
    try {
      const assessment = {
        id: crypto.randomUUID(),
        entityId,
        incidentId,
        assessmentType: 'HEALTH',
        assessmentDate: new Date(),
        assessmentData: {
          hasFunctionalClinic: data.hasFunctionalClinic,
          hasEmergencyServices: data.hasEmergencyServices,
          hasMedicalSupplies: data.hasMedicalSupplies,
          hasTrainedStaff: data.hasTrainedStaff,
          numberHealthFacilities: data.numberHealthFacilities,
          healthFacilityTypes: data.healthFacilityTypes,
          qualifiedHealthWorkers: data.qualifiedHealthWorkers,
          commonHealthIssues: data.commonHealthIssues,
          hasMaternalChildServices: data.hasMaternalChildServices,
          additionalDetails: data.additionalDetails,
        },
        verificationStatus: 'DRAFT',
        syncStatus: 'LOCAL',
        offlineId: crypto.randomUUID(),
        versionNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Save to IndexedDB
      await db.assessments.add(assessment);
      
      // Queue for sync
      await queueItem({
        type: 'assessment',
        action: 'create',
        data: assessment,
        offlineId: assessment.offlineId,
        priority: 'NORMAL',
      });
      
      // Show success message
      if (isOffline) {
        alert('Assessment saved offline. Will sync when connection is restored.');
      } else {
        alert('Assessment submitted for verification.');
      }
      
      onComplete?.();
      router.push('/assessor/dashboard');
    } catch (error) {
      console.error('Failed to save assessment:', error);
      alert('Failed to save assessment. Please try again.');
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Health Assessment</h2>
          
          {/* Gap-indicating boolean fields */}
          <BooleanField
            name="hasFunctionalClinic"
            label="Functional Clinic Available"
            description="Gap exists if FALSE"
            showGapIndicator
            gapWhenFalse
          />
          
          <BooleanField
            name="hasEmergencyServices"
            label="Emergency Services Available"
            description="Gap exists if FALSE"
            showGapIndicator
            gapWhenFalse
          />
          
          <BooleanField
            name="hasMedicalSupplies"
            label="Adequate Medical Supplies"
            description="Gap exists if FALSE"
            showGapIndicator
            gapWhenFalse
          />
          
          <BooleanField
            name="hasTrainedStaff"
            label="Trained Health Staff Present"
            description="Gap exists if FALSE"
            showGapIndicator
            gapWhenFalse
          />
          
          {/* Quantity fields */}
          <div>
            <Label>Number of Health Facilities</Label>
            <Input
              type="number"
              min="0"
              {...form.register('numberHealthFacilities', { valueAsNumber: true })}
            />
          </div>
          
          <div>
            <Label>Qualified Health Workers</Label>
            <Input
              type="number"
              min="0"
              {...form.register('qualifiedHealthWorkers', { valueAsNumber: true })}
            />
          </div>
          
          {/* Additional boolean */}
          <BooleanField
            name="hasMaternalChildServices"
            label="Maternal & Child Health Services Available"
          />
          
          {/* Text area */}
          <div>
            <Label>Additional Details</Label>
            <Textarea
              placeholder="Any additional health-related observations..."
              {...form.register('additionalDetails')}
            />
          </div>
          
          {/* GPS Capture */}
          <GPSField name="gpsCoordinates" />
          
          {/* Photo Capture */}
          <MediaField name="photos" label="Health Facility Photos" maxFiles={5} />
        </div>
        
        <div className="flex gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {isOffline ? 'Save Offline' : 'Submit Assessment'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};
```

### 14.2 Response Form Pattern

```typescript
// components/forms/response/ResponsePlanningForm.tsx

'use client';

import { FC, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';
import { db } from '@/lib/db/offline';

const ResponseItemSchema = z.object({
  name: z.string().min(1, 'Item name required'),
  unit: z.string().min(1, 'Unit required'),
  quantity: z.number().positive('Quantity must be positive'),
  donorName: z.string().optional(),
  donorCommitmentId: z.string().optional(),
});

const ResponsePlanningSchema = z.object({
  assessmentId: z.string().uuid(),
  plannedDate: z.date(),
  items: z.array(ResponseItemSchema).min(1, 'At least one item required'),
});

type ResponsePlanningFormData = z.infer<typeof ResponsePlanningSchema>;

interface ResponsePlanningFormProps {
  assessmentId: string;
  entityId: string;
  onComplete?: () => void;
}

export const ResponsePlanningForm: FC<ResponsePlanningFormProps> = ({
  assessmentId,
  entityId,
  onComplete,
}) => {
  const { queueItem } = useOffline();
  
  const form = useForm<ResponsePlanningFormData>({
    resolver: zodResolver(ResponsePlanningSchema),
    defaultValues: {
      assessmentId,
      plannedDate: new Date(),
      items: [{ name: '', unit: '', quantity: 0 }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const onSubmit = async (data: ResponsePlanningFormData) => {
    try {
      const response = {
        id: crypto.randomUUID(),
        assessmentId: data.assessmentId,
        entityId,
        status: 'PLANNED',
        plannedDate: data.plannedDate,
        items: data.items,
        verificationStatus: 'DRAFT',
        syncStatus: 'LOCAL',
        offlineId: crypto.randomUUID(),
        versionNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.responses.add(response);
      
      await queueItem({
        type: 'response',
        action: 'create',
        data: response,
        offlineId: response.offlineId,
        priority: 'NORMAL',
      });
      
      alert('Response plan saved successfully');
      onComplete?.();
    } catch (error) {
      console.error('Failed to save response:', error);
      alert('Failed to save response plan');
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Plan Response</h2>
          
          <div>
            <Label>Planned Delivery Date</Label>
            <Input
              type="date"
              {...form.register('plannedDate', { valueAsDate: true })}
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Response Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', unit: '', quantity: 0 })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Item Name</Label>
                    <Input
                      {...form.register(`items.${index}.name`)}
                      placeholder="e.g., Water bottles"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit</Label>
                    <Input
                      {...form.register(`items.${index}.unit`)}
                      placeholder="e.g., bottles"
                    />
                  </div>
                </div>
                
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-4">
          <Button type="submit">Save Plan</Button>
          <Button type="button" variant="outline" onClick={() => onComplete?.()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};
```

---

## Part 4B Summary

This completes Part 4 of the architecture document, covering:
- Complete component architecture with layouts and shared components
- State management with Zustand (Auth, Offline, Entity stores)
- Offline strategy with IndexedDB/Dexie
- Custom hooks for offline operations and GPS
- Service worker and PWA configuration
- Form systems with complete examples


# Part 5: Dashboard Specifications, Security & Deployment

---

## 15. Dashboard Specifications

### 15.1 Crisis Management Dashboard (Coordinator)

#### Layout Structure

```typescript
// app/(auth)/coordinator/dashboard/page.tsx

'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/db/supabase';

export default function CrisisDashboard() {
  const { data, refetch } = useQuery({
    queryKey: ['crisis-dashboard'],
    queryFn: fetchDashboardData,
    // Remove refetchInterval - use realtime instead
  });
  
  // Add realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('crisis-updates')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'rapid_assessments',
          filter: 'verification_status=eq.PENDING'
        },
        () => {
          refetch(); // Update on any change to pending assessments
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'rapid_responses',
          filter: 'verification_status=eq.PENDING'
        },
        () => {
          refetch();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);
  
  // ... rest of component
}
```

#### Verification Queue Component

```typescript
// components/dashboards/crisis/VerificationQueue.tsx

'use client';

import { FC, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface VerificationQueueProps {
  assessments: any[];
  responses: any[];
  onVerify: () => void;
}

export const VerificationQueue: FC<VerificationQueueProps> = ({
  assessments,
  responses,
  onVerify,
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<string | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  
  const handleVerify = async (id: string, type: 'assessment' | 'response', action: 'approve' | 'reject') => {
    try {
      const endpoint = type === 'assessment' 
        ? `/api/v1/assessments/${id}/verify`
        : `/api/v1/responses/${id}/verify`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action,
          ...(action === 'reject' && {
            reason: 'INSUFFICIENT_DATA',
            feedback: rejectionFeedback,
          }),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Verification failed');
      }
      
      setRejectingItem(null);
      setRejectionFeedback('');
      onVerify();
    } catch (error) {
      console.error('Verification error:', error);
      alert('Failed to verify item');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="assessments">
          <TabsList className="w-full">
            <TabsTrigger value="assessments" className="flex-1">
              Assessments ({assessments.length})
            </TabsTrigger>
            <TabsTrigger value="responses" className="flex-1">
              Responses ({responses.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="assessments" className="space-y-2">
            {assessments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pending assessments
              </div>
            ) : (
              assessments.map((assessment) => (
                <div key={assessment.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{assessment.affectedEntity.name}</p>
                      <p className="text-sm text-gray-500">
                        {assessment.assessmentType} - {new Date(assessment.assessmentDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedItem(expandedItem === assessment.id ? null : assessment.id)}
                    >
                      {expandedItem === assessment.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {expandedItem === assessment.id && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="text-sm">
                        <p className="font-medium">Assessor: {assessment.assessor.name}</p>
                        <p className="text-gray-600 mt-1">
                          Assessment Data:
                        </p>
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(assessment.assessmentData, null, 2)}
                        </pre>
                      </div>
                      
                      {rejectingItem === assessment.id ? (
                        <div className="space-y-2">
                          <Label>Rejection Feedback</Label>
                          <Textarea
                            value={rejectionFeedback}
                            onChange={(e) => setRejectionFeedback(e.target.value)}
                            placeholder="Explain why this assessment is being rejected..."
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleVerify(assessment.id, 'assessment', 'reject')}
                            >
                              Confirm Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectingItem(null);
                                setRejectionFeedback('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleVerify(assessment.id, 'assessment', 'approve')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => setRejectingItem(assessment.id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="responses" className="space-y-2">
            {responses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pending responses
              </div>
            ) : (
              responses.map((response) => (
                <div key={response.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{response.affectedEntity.name}</p>
                      <p className="text-sm text-gray-500">
                        {response.items.length} items - {new Date(response.responseDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedItem(expandedItem === response.id ? null : response.id)}
                    >
                      {expandedItem === response.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {expandedItem === response.id && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="text-sm">
                        <p className="font-medium">Responder: {response.responder.name}</p>
                        {response.donorName && (
                          <p className="text-gray-600">Donor: {response.donorName}</p>
                        )}
                        <p className="text-gray-600 mt-1">Items:</p>
                        <ul className="list-disc list-inside">
                          {response.items.map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.quantity} {item.unit} of {item.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleVerify(response.id, 'response', 'approve')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleVerify(response.id, 'response', 'reject')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
```

### 15.2 Situation Awareness Dashboard

```typescript
// app/(auth)/coordinator/monitoring/page.tsx

'use client';

import { FC, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GapAnalysisPanel } from '@/components/dashboards/situation/GapAnalysisPanel';
import { EntityMapPanel } from '@/components/dashboards/situation/EntityMapPanel';
import { AssessmentSummaryPanel } from '@/components/dashboards/situation/AssessmentSummaryPanel';

export default function SituationAwarenessDashboard() {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  
  // Fetch incidents
  const { data: incidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const response = await fetch('/api/v1/incidents?status=ACTIVE', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.json();
    },
  });
  
  // Fetch situation data for selected incident
  const { data: situationData } = useQuery({
    queryKey: ['situation', selectedIncidentId, selectedEntityId],
    queryFn: async () => {
      if (!selectedIncidentId) return null;
      
      const response = await fetch(
        `/api/v1/dashboard/situation?incidentId=${selectedIncidentId}${selectedEntityId !== 'all' ? `&entityId=${selectedEntityId}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      return response.json();
    },
    enabled: !!selectedIncidentId,
    refetchInterval: 30000,
  });
  
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Situation Awareness Dashboard</h1>
        <p className="text-gray-600">Comprehensive disaster monitoring</p>
      </div>
      
      {/* Three-Panel Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Panel: Incident Overview */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Incident Overview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="text-sm font-medium">Select Incident</label>
              <Select value={selectedIncidentId} onValueChange={setSelectedIncidentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select incident..." />
                </SelectTrigger>
                <SelectContent>
                  {incidents?.data.map((incident: any) => (
                    <SelectItem key={incident.id} value={incident.id}>
                      {incident.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {situationData?.data.incident && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Declaration Date</p>
                  <p className="font-medium">
                    {new Date(situationData.data.incident.declarationDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">
                    {Math.ceil(
                      (new Date().getTime() - new Date(situationData.data.incident.declarationDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                    )} days
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Affected Population</p>
                  <p className="font-medium">
                    {situationData.data.populationMetrics.totalPopulation.toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    {situationData.data.incident.status}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Center Panel: Entity Assessment & Map */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
            <div>
              <label className="text-sm font-medium">Select Entity</label>
              <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {situationData?.data.entities.map((entity: any) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto">
              <AssessmentSummaryPanel
                assessments={situationData?.data.assessments || {}}
                entityId={selectedEntityId}
              />
            </div>
            
            <div className="h-64 border rounded-lg">
              <EntityMapPanel
                entities={situationData?.data.entities || []}
                selectedEntityId={selectedEntityId === 'all' ? null : selectedEntityId}
                gapAnalysis={situationData?.data.gapAnalysis || []}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Right Panel: Gap Analysis */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Gap Analysis</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <GapAnalysisPanel
              gapAnalysis={situationData?.data.gapAnalysis || []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---


## 16. Security Architecture

### 16.1 Authentication Implementation

```typescript
// lib/auth/config.ts

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/db/client';
import { AuthService } from './service';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: true,
                  },
                },
              },
            },
          },
        });
        
        if (!user || !user.isActive) {
          return null;
        }
        
        const isValid = await AuthService.comparePassword(
          credentials.password,
          user.passwordHash
        );
        
        if (!isValid) {
          return null;
        }
        
        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles.map(ur => ur.role.name),
          permissions: user.roles.flatMap(ur =>
            ur.role.permissions.map(p => p.code)
          ),
        };
      },
    }),
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
        token.permissions = user.permissions;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};
```

### 16.2 API Security Middleware

```typescript
// lib/middleware/security.ts

import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'express-rate-limit';

// Rate limiting configuration
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

// Security headers middleware
export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self)'
  );
  
  return response;
}

// CORS middleware
export function withCORS(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}

// Input sanitization
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  
  return input;
}
```

### 16.3 Data Encryption

```typescript
// lib/security/encryption.ts

import crypto from 'crypto';

export class EncryptionService {
  private static ALGORITHM = 'aes-256-gcm';
  private static KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  
  static encrypt(data: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }
  
  static decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      this.KEY,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

---

## 17. Deployment Architecture

### 17.1 Environment Configuration

```bash
# .env.production

# Database
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..." # Server-side only, bypasses RLS

# Authentication
NEXTAUTH_URL="https://dms.example.com"
NEXTAUTH_SECRET="your-production-secret-min-32-chars"
JWT_SECRET="separate-jwt-secret-for-api"

# Encryption
ENCRYPTION_KEY="64-char-hex-string-for-aes-256"

# Storage (Cloudflare R2)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="dms-media"
R2_PUBLIC_URL="https://media.dms.example.com"

# Monitoring
SENTRY_DSN="https://key@sentry.io/project"
SENTRY_ENVIRONMENT="production"

# Feature Flags
ENABLE_AUTO_APPROVAL="true"
ENABLE_DONOR_FEATURES="true"

# CORS
ALLOWED_ORIGINS="https://dms.example.com,https://app.dms.example.com"
```

### 17.2 Vercel Deployment Configuration

```json
// vercel.json

{
  "buildCommand": "npx prisma generate && npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "JWT_SECRET": "@jwt-secret",
    "ENCRYPTION_KEY": "@encryption-key"
  },
  "functions": {
    "app/api/v1/sync/push/route.ts": {
      "maxDuration": 30,
      "memory": 1024
    },
    "app/api/v1/assessments/batch/route.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    }
  ]
}
```

### 17.3 Database Deployment (Supabase)

```bash
# Create Supabase project (via dashboard or CLI)
npx supabase init
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Push Prisma schema to Supabase
npx prisma db push

# Or use migrations
npx prisma migrate deploy

# Enable realtime for specific tables
-- Run in Supabase SQL Editor:
ALTER PUBLICATION supabase_realtime ADD TABLE rapid_assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE rapid_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_conflicts;

# Optional: Set up Row Level Security (RLS)
-- Users can only see their assigned entities
CREATE POLICY "Users see assigned entities" ON rapid_assessments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM entity_assignments
      WHERE entity_id = rapid_assessments.entity_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );
```
