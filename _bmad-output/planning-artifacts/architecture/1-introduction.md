# 1. Introduction

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
