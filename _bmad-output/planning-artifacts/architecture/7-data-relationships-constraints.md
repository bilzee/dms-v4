# 7. Data Relationships & Constraints

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

