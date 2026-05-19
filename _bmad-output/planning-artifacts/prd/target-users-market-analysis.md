# Target Users \& Market Analysis

## Primary User Groups

### 1\. Assessors (Primary Field Users)

* **Role:** Field workers conducting health, WASH, shelter, food, security, and population rapid assessments in affected entities like camps and communities. Also responsible for preliminary disaster assessments before or after disaster declaration.
* **Responsibilities:**

  * Preliminary disaster assessments
  * Rapid assessments of affected entities (camps/communities)
  * Creation and management of affected entities
  * Media and GPS data collection

* **Operating Context:** Remote areas with unreliable connectivity requiring complete offline capability
* **Key Needs:**

  * Reliable data capture of assessments with GPS/media attachment
  * Editable/reviewable assessments before submission
  * Queue management for synchronization
  * Prevention of data loss during connectivity gaps
  * Real-time operational dashboard capabilities
  * Access to assigned affected entities

* **Pain Points:**

  * Assessment data loss during handoffs
  * Inability to complete forms without connectivity
  * Complex form validation requirements
  * No visibility into sync status

* **Role Flexibility:** May serve multiple roles including Responder depending on operational needs

### 2\. Coordinators (Critical Gatekeepers)

* **Role:** Staff responsible for verifying submitted assessments and responses, incident creation and management, affected entity oversight, and donor coordination
* **Responsibilities:**

  * Assessment/response verification (approve/reject with feedback)
  * Incident status management (Active → Contained → Resolved)
  * Affected entity creation and assignment to assessors/responders
  * Workflow oversight and conflict resolution
  * Linking donations from donors to verified responses
  * Configuring automatic approval rules per affected entity

* **Operating Context:** Central processing hub handling multiple submissions of assessments and responses
* **Key Needs:**

  * Efficient verification workflow with automatic approval configuration
  * Clear verification status indicators (Verified/Auto-approved/Pending)
  * Real-time operational dashboard capabilities
  * Gap analysis showing needs of affected entities
  * Conflict resolution tools for sync conflicts
  * Entity assignment management interface

* **Pain Points:**

  * Verification backlogs delaying response coordination
  * Inability to assess data currency due to offline forms awaiting sync
  * Managing multiple user assignments to entities

* **Critical Features:**

  * Crisis Management Dashboard with verification queues
  * Monitoring dashboard for comprehensive disaster situation awareness
  * Automatic approval configuration per entity or globally
  * Conflict resolution interface for last-write-wins conflicts

### 3\. Responders (Primary Service Delivery)

* **Role:** Personnel delivering aid to affected populations (distinct from donors)
* **Responsibilities:**

  * Response planning with "planned" status
  * Response/aid delivery execution
  * Response delivery documentation
  * Status conversion from planned to delivered

* **Operating Context:** Require offline capability for response planning and documentation during delivery missions
* **Key Needs:**

  * Response planning mode for expected response
  * Seamless conversion from planned to delivered status
  * Editable/reviewable response plans
  * Queue management for synchronization
  * Access to assigned affected entities
  * Import capability from donor commitments
  * Real-time operational dashboard capabilities

* **Pain Points:**

  * Data re-entry between planning and execution phases
  * Inability to document deliveries offline
  * Complex form validation during field operations
  * Coordination with multiple responders on same entity

* **Role Flexibility:** May serve multiple roles including Assessor depending on operational structure

### 4\. Donors (Partners)

* **Role:** Organizations and individuals providing aid items and resources
* **Responsibilities:**

  * Donation planning and commitment registration
  * Delivery status updates (self-reported)
  * Performance tracking via gamification
  * Self-selection of affected entities for support

* **Operating Context:** Remote engagement with accountability and performance visibility requirements
* **Key Features:**

  * Read-only access to assessments for assigned entities
  * Commitment management interface (item name, unit, quantity)
  * Public leaderboards for performance metrics
  * Two delivery performance measures:

    * Self-reported delivery percentage
    * Verified delivery percentage (with visual verification badges)

  * Competition-based engagement driving improved donation outcomes

* **Value Proposition:** Enhanced accountability and motivation through gamification features including comparative leaderboards for commitment and delivery performance

### 5\. Admin (System Management)

* **Role:** System administration and oversight
* **Responsibilities:**

  * User creation and management
  * Role assignment (multiple roles per user supported)
  * Basic audit activities
  * System configuration

* **Operating Context:** Backend system management with security and compliance oversight
* **Key Features:**

  * User management interface
  * Role assignment with no restrictions on combinations
  * Audit trail access
  * System health monitoring

## Market Context

Borno State humanitarian operations currently rely on paper-based processes with significant coordination gaps. No existing digital solution addresses the offline-first requirement combined with role flexibility and automatic approval capabilities essential for field conditions. The system's unique combination of offline capability, role flexibility, and gamification features positions it as a transformative solution for disaster management in connectivity-challenged regions.
