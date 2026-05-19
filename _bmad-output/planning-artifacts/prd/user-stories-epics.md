# User Stories \& Epics

## Epic 1: Offline-First Foundation

**Goal:** Establish robust offline-first PWA infrastructure with complete data persistence and synchronization capabilities.

### Story 1.1: PWA Setup \& Offline Infrastructure

**As a** field worker,  
**I want** the app to work completely offline,  
**so that** I can continue working regardless of connectivity.

**Acceptance Criteria:**

1. PWA installs successfully on Android/iOS devices
2. Service worker caches all critical assets
3. IndexedDB stores all user data with encryption
4. App loads in <3 seconds offline
5. Clear online/offline status indicator visible
6. All forms accessible without connectivity
7. Session state persists across app restarts
8. Integration tests verify offline functionality

### Story 1.2: Data Synchronization Engine

**As a** field worker with intermittent connectivity,  
**I want** my data to sync automatically when online,  
**so that** I don't lose any work or need manual intervention.

**Acceptance Criteria:**

1. Queue management for offline-created documents
2. Automatic sync triggers on connectivity restore
3. Visual sync status for each queued item
4. Retry logic with exponential backoff
5. Conflict resolution with last-write-wins
6. Sync progress indicators
7. Zero data loss during sync operations
8. Backend integration tests for sync scenarios

### Story 1.3: Conflict Resolution System

**As a** coordinator,  
**I want** to see and understand sync conflicts,  
**so that** I can ensure data integrity.

**Acceptance Criteria:**

1. Conflict log displays in Crisis Management Dashboard
2. Last-write-wins resolution automatic
3. Timestamp and version tracking for conflicts
4. Clear indication of winning/losing versions
5. Grouped display by entity and assessment type
6. Export capability for conflict reports
7. Backend API for conflict retrieval

## Epic 2: Multi-Role User Management

**Goal:** Implement flexible multi-role system with seamless role switching and session preservation.

### Story 2.1: User Authentication \& Role Assignment

**As an** admin,  
**I want** to assign multiple roles to users,  
**so that** field staff can perform various functions.

**Acceptance Criteria:**

1. User creation with email/username
2. Multiple role assignment without restrictions
3. Role-based permission enforcement
4. JWT token includes all assigned roles
5. Audit trail for role assignments
6. Backend API for user management
7. Integration tests for authentication flow

### Story 2.2: Role Switching Interface

**As a** user with multiple roles,  
**I want** to switch between roles easily,  
**so that** I can perform different tasks efficiently.

**Acceptance Criteria:**

1. Role dropdown selector in header (right side)
2. Current role clearly indicated
3. Session state saved per role
4. Work preserved when switching roles
5. Graceful handling of unauthorized access
6. Warning for unsaved changes
7. Role context maintained across pages

### Story 2.3: Entity Assignment Management

**As a** coordinator,  
**I want** to assign entities to assessors and responders,  
**so that** they only access relevant locations.

**Acceptance Criteria:**

1. Assignment interface in coordinator dashboard
2. Bulk assignment capabilities
3. De-assignment functionality
4. Auto-assignment for entity creators
5. Assignment inheritance for workflows
6. Multiple users per entity supported
7. Backend API for assignment management

## Epic 3: Assessment Workflow

**Goal:** Complete assessment creation, submission, and verification workflow with offline support.

### Story 3.1: Preliminary Assessment Creation

**As an** assessor,  
**I want** to create preliminary disaster assessments,  
**so that** incidents can be properly initialized.

**Acceptance Criteria:**

1. Preliminary assessment form with all fields
2. GPS coordinate capture (manual fallback)
3. Media attachment with location stamps
4. Offline form completion
5. Can trigger incident creation
6. Draft saving capability
7. Backend API for submission

### Story 3.2: Rapid Assessment Forms (All 6 Types)

**As an** assessor,  
**I want** to complete rapid assessments for all categories,  
**so that** entity needs are documented.

**Acceptance Criteria:**

1. Six assessment forms (Health, WASH, Shelter, Food, Security, Population)
2. Boolean fields for gap analysis
3. GPS and timestamp auto-capture
4. Media attachment per assessment
5. Offline completion for all forms
6. Progressive validation
7. Only assigned entities accessible
8. Backend integration for all assessment types

### Story 3.3: Assessment Verification Workflow

**As a** coordinator,  
**I want** to verify or reject assessments,  
**so that** data quality is maintained.

**Acceptance Criteria:**

1. Verification queue in Crisis Management Dashboard
2. Expandable assessment details
3. Inline approve/reject actions
4. Structured rejection reasons
5. Feedback text for rejections
6. Auto-approval configuration per entity
7. Status indicators (Verified/Auto-approved/Pending/Rejected)
8. Backend API for verification actions

## Epic 4: Response Planning \& Delivery

**Goal:** Implement complete response workflow from planning through delivery with donor integration.

### Story 4.1: Response Planning Mode

**As a** responder,  
**I want** to plan responses before delivery,  
**so that** resources can be prepared.

**Acceptance Criteria:**

1. Response form with "planned" status
2. Link to specific assessment (immutable)
3. Item details (name, unit, quantity)
4. Editable while in planned status
5. Multiple responders can access if assigned
6. Offline planning capability
7. Backend API for planned responses

### Story 4.2: Response Delivery Documentation

**As a** responder,  
**I want** to document actual deliveries,  
**so that** aid distribution is tracked.

**Acceptance Criteria:**

1. Convert planned to delivered status
2. Edit capability before delivery
3. No re-entry of data required
4. Auto-submission for verification
5. GPS and timestamp capture
6. Media attachment for proof
7. Backend integration tests

### Story 4.3: Donor Commitment Import

**As a** responder,  
**I want** to import donor commitment details,  
**so that** response documentation is accurate and efficient.

**Acceptance Criteria:**

1. Import interface showing available commitments
2. Select items from donor commitments
3. Partial commitment usage tracking
4. Auto-populate response fields
5. Maintain donor attribution
6. Mark imported items as delivered
7. Backend API for commitment retrieval
8. Integration tests for import workflow

### Story 4.4: Response Verification Process

**As a** coordinator,  
**I want** to verify response deliveries,  
**so that** aid distribution is confirmed.

**Acceptance Criteria:**

1. Response verification queue in dashboard
2. Expandable response details
3. Donor attribution visible
4. Approve/reject with feedback
5. Auto-approval support
6. Verified badge for donor metrics
7. Backend API for verification
8. Integration tests for verification flow

## Epic 5: Donor Management \& Gamification

**Goal:** Implement donor portal with commitment tracking and competitive gamification features.

### Story 5.1: Donor Registration \& Portal

**As a** donor organization,  
**I want** to register and access the system,  
**so that** I can contribute to disaster response.

**Acceptance Criteria:**

1. Donor registration form
2. Organization profile management
3. Contact information capture
4. Dashboard access upon login
5. Read-only assessment viewing
6. Entity selection interface
7. Backend API for donor management

### Story 5.2: Commitment Management

**As a** donor,  
**I want** to register aid commitments,  
**so that** responders can plan distributions.

**Acceptance Criteria:**

1. Commitment form (item, unit, quantity)
2. Entity assignment by coordinator
3. Commitment is per incident
4. Reporting of commitment delivery should indicate the affected entities (self or verified by responder)  
5. Commitment editing before delivery
6. Status tracking (Planned/Partial/Complete)
7. Value estimation display
8. Backend API for commitments

### Story 5.3: Donor Performance Gamification

**As a** donor,  
**I want** to see performance rankings,  
**so that** I'm motivated to fulfill commitments.

**Acceptance Criteria:**

1. Public leaderboard display
2. Commitment metrics: available items committed
3. Delivery metrics: self-reported and verified
4. Delivery percentage calculations
5. Visual verification badges
6. Comparative rankings
7. Historical performance trends
8. Export capability for reports
9. Backend API for metrics calculation

### Story 5.4: Donor Entity Insights

**As a** donor,  
**I want** to see assessment details for assigned entities,  
**so that** I can make informed contribution decisions.

**Acceptance Criteria:**

1. Read-only assessment viewer
2. Latest assessment per category
3. Gap analysis display
4. Historical assessment trends
5. Entity demographic information
6. Download assessment reports
7. Backend integration for data retrieval

## Epic 6: Crisis Management Dashboard

**Goal:** Implement comprehensive coordinator dashboard for crisis management and verification workflows.

### Story 6.1: Verification Queue Management

**As a** coordinator,  
**I want** to manage verification queues efficiently,  
**so that** assessments and responses are processed quickly.

**Acceptance Criteria:**

1. Separate queues for assessments and responses
2. Real-time updates (<30 seconds)
3. Sort/filter capabilities
4. Expandable detail views
5. Inline verification actions
6. Queue depth indicators
7. Performance metrics display
8. Backend WebSocket/polling for updates

### Story 6.2: Auto-Approval Configuration

**As a** coordinator,  
**I want** to configure automatic approvals,  
**so that** workflow doesn't bottleneck during crises.

**Acceptance Criteria:**

1. Configuration interface in dashboard
2. Per-entity settings
3. Global settings option
4. Clear auto-approved indicators
5. Cannot override after auto-approval
6. Configuration audit trail
7. Backend API for configuration

### Story 6.3: Resource \& Donation Management

**As a** coordinator,  
**I want** to manage donor-entity relationships,  
**so that** resources are distributed effectively.

**Acceptance Criteria:**

1. Donation overview display
2. Commitment vs. delivery tracking
3. Entity-donor assignment interface
4. Multi-donor per entity support
5. Assignment notifications to donors
6. Resource gap identification
7. Backend API for assignments

### Story 6.4: Conflict Resolution Interface

**As a** coordinator,  
**I want** to review sync conflicts,  
**so that** data integrity is maintained.

**Acceptance Criteria:**

1. Conflict log section in dashboard
2. Grouped by entity and type
3. Resolution timestamp display
4. Version comparison view
5. Last-write-wins indicators
6. Export conflict reports
7. Clear resolved status
8. Backend API for conflict data

## Epic 7: Situation Awareness Dashboard

**Goal:** Create comprehensive monitoring dashboard for real-time disaster situation awareness.

### Story 7.1: Three-Panel Dashboard Layout

**As a** user,  
**I want** a comprehensive situation dashboard,  
**so that** I can understand the disaster situation at a glance.

**Acceptance Criteria:**

1. Three-panel responsive layout
2. Full-screen optimization
3. Mobile responsive design
4. No vertical scroll on standard displays
5. Panel resize capability
6. Customizable layout preferences
7. Backend API for dashboard data

### Story 7.2: Incident Overview Panel (Left Panel)

**As a** user,  
**I want** to see incident summaries,  
**so that** I understand the scope of disasters.

**Acceptance Criteria:**

1. Incident dropdown selector
2. Declaration date and duration
3. Current status display
4. Population impact statistics (aggregating latest population assessment and preliminary assessments)
5. Aggregate metrics
6. Duration calculator for incident in current state
7. Historical incident access
8. Backend integration for metrics

### Story 7.3: Entity Assessment Panel (Centre Panel - Up)

**As a** user,  
**I want** to see entity-specific assessments,  
**so that** I understand localized needs.

**Acceptance Criteria:**

1. Entity dropdown (filtered by incident)
2. Latest Assessment summary per category (Non-Gap-Indicating fields on the left and Gap-Indicating fields on the right)
3. Latest assessment display
4. Gap analysis with visual indicators (Gap-Indicating fields colored as red or green to show gap or no-gap)
5. "All Entities" as default option in Entity dropdown
6. Aggregation of Assessments and Gaps if "All Entities" (Summation for quantities, averages for time or rates, count for Boolean)
7. Backend API for assessment data

### Story 7.4: Interactive Gap Analysis Map (Centre Panel - Down)

**As a** user,  
**I want** an interactive map showing affected entities,  
**so that** I can visualize geographic distribution.

**Acceptance Criteria:**

1. Map displays all affected entities
2. Selected entity highlighting
3. Option to display/overlay donors assigned to displayed entities
4. Gap severity color coding
5. Clustering for performance
6. Offline map tiles
7. Zoom and pan controls
8. Entity details on click
9. Backend API for location data

### Story 7.5: Gap Analysis Summary

**As a** user,  
**I want** to see gap analysis across entities,  
**so that** I can prioritize responses.

**Acceptance Criteria:**

1. Displayed entities are filtered by selected Incident in left panel
2. Summary panel with visual indicators
3. Color coding (green/yellow/red) of assessment types by severity
4. Severity calculation from Gap-Indicating boolean fields
5. Export gap analysis CSV
6. Real-time updates
7. Backend integration for calculations

## Epic 8: Incident Management

**Goal:** Implement complete incident lifecycle management from creation through resolution.

### Story 8.1: Incident Creation \& Management

**As a** coordinator,  
**I want** to create and manage incidents,  
**so that** disasters are properly tracked.

**Acceptance Criteria:**

1. Incident creation form
2. Type and sub-type selection
3. Severity classification
4. Status management (Active/Contained/Resolved)
5. Link to preliminary assessments
6. Population impact tracking (by aggregating data from latest population assessment and preliminary assessments)
7. Backend API for incident CRUD

### Story 8.2: Entity-Incident Relationships

**As a** coordinator,  
**I want** to link entities to incidents,  
**so that** impact scope is defined.

**Acceptance Criteria:**

1. Entity assignment to incidents
2. Multiple entities per incident
3. Multiple incidents per entity
4. Severity per entity-incident
5. Timeline tracking
6. Relationship visualization
7. Backend API for relationships

## Epic 9: Admin \& System Management

**Goal:** Implement administrative functions for user management and system configuration.

### Story 9.1: User Management Interface

**As an** admin,  
**I want** to manage system users,  
**so that** access is properly controlled.

**Acceptance Criteria:**

1. User CRUD operations
2. Password reset functionality
3. Account activation/deactivation
4. Last login tracking
5. Session management
6. User search and filter
7. Backend API for user operations

### Story 9.2: Audit Trail \& Monitoring

**As an** admin,  
**I want** to view system audit trails,  
**so that** I can ensure compliance and security.

**Acceptance Criteria:**

1. Comprehensive audit logging
2. Action-based filtering
3. User activity reports
4. Entity change history
5. Export audit logs
6. Retention policy implementation
7. Backend API for audit retrieval

## Epic 10: Data Export \& Reporting

**Goal:** Enable comprehensive data export and reporting capabilities for stakeholder communication.

### Story 10.1: Dashboard Export Functions

**As a** user,  
**I want** to export dashboard data,  
**so that** I can create reports for stakeholders.

**Acceptance Criteria:**

1. CSV export for all data tables
2. Chart image export (PNG/SVG)
3. PDF report generation
4. Scheduled report automation
5. Custom date ranges
6. Backend API for export generation

### Story 10.2: Custom Report Builder

**As a** coordinator,  
**I want** to create custom reports,  
**so that** I can communicate specific insights.

**Acceptance Criteria:**

1. Report template selection
2. Data source configuration
3. Filter and aggregation options
4. Visualization selection
5. Report scheduling
6. Backend API for report generation
