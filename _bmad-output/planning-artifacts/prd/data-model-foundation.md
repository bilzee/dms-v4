# Data Model Foundation

## Existing Data Model Reference

**Foundation Document:** "DMS Data Model Detailed v3.0.md" provides the structural foundation for PWA implementation.

## Core Entities

### Primary Entities

* **User**

  * id, username, email, password\_hash
  * created\_at, updated\_at, last\_login
  * active\_status, locked\_status

* **Role**

  * id, name, description
  * permissions (JSON)
  * created\_at, updated\_at

* **UserRole** (Junction)

  * user\_id, role\_id
  * assigned\_at, assigned\_by

* **Incident**

  * id, name, type, sub\_type
  * severity (Low/Medium/High/Critical)
  * status (Active/Contained/Resolved)
  * declaration\_date, resolution\_date
  * location\_coordinates
  * affected\_population
  * created\_by, updated\_by

* **PreliminaryAssessment**

  * id, incident\_id (nullable)
  * assessment\_date, assessor\_id
  * impact\_description
  * initial\_needs
  * can\_trigger\_incident (boolean)
  * verification\_status

* **AffectedEntity**

  * id, name, type (Camp/Community)
  * location\_coordinates
  * population, vulnerable\_count
  * created\_by, created\_at
  * auto\_approve\_enabled (boolean)

* **EntityAssignment**

  * entity\_id, user\_id
  * role (Assessor/Responder/Donor)
  * assigned\_by, assigned\_at
  * active (boolean)

* **IncidentEntity** (Junction)

  * incident\_id, entity\_id
  * affected\_date, severity\_level

* **RapidAssessment**

  * id, entity\_id, incident\_id
  * assessment\_type (Health/WASH/Shelter/Food/Security/Population)
  * assessor\_id, assessment\_date
  * verification\_status (Draft/Pending/Verified/Rejected/Auto-approved)
  * rejection\_reason, rejection\_feedback
  * sync\_status (Local/Syncing/Synced/Conflict)
  * version\_number, created\_at, updated\_at
  * assessment\_data (JSON - type-specific fields)

* **RapidResponse**

  * id, assessment\_id, entity\_id
  * responder\_id, donor\_id (nullable)
  * status (Planned/Delivered)
  * response\_date, planned\_date
  * verification\_status (Draft/Pending/Verified/Rejected/Auto-approved)
  * rejection\_reason, rejection\_feedback
  * sync\_status (Local/Syncing/Synced/Conflict)
  * version\_number, created\_at, updated\_at
  * items (JSON array of {name, unit, quantity, donor\_name, donor\_commitment\_id})

* **Donor**

  * id, organization\_name, contact\_name
  * email, phone
  * registration\_date
  * total\_commitments, total\_delivered
  * self\_reported\_delivery\_rate
  * verified\_delivery\_rate
  * leaderboard\_rank

* **DonorCommitment**

  * id, donor\_id, entity\_id
  * commitment\_date
  * items (JSON array of {name, unit, quantity})
  * total\_value\_estimated
  * delivery\_status (Planned/Partial/Complete)
  * delivered\_quantity
  * verified\_delivered\_quantity

* **SyncConflict**

  * id, entity\_type (Assessment/Response)
  * entity\_id, conflict\_date
  * resolution\_method (LastWriteWins)
  * winning\_version, losing\_version
  * coordinator\_notified (boolean)

* **AuditLog**

  * id, user\_id, action
  * entity\_type, entity\_id
  * before\_value, after\_value
  * timestamp, ip\_address

## Assessment Structure (MVP)

### Boolean-Based Gap Analysis

The following fields are examples of gap-indicating fields in their respective assessments

* **Health Assessment:** 
* 	**hasFunctionalClinic (gap if FALSE, but may need more clinics even if TRUE)**
* 	**hasEmergencyServices (gap if FALSE, but may need more even if TRUE)**
* 	**hasMedicalSupplies (gap if FALSE, but may need more even if TRUE)**
* 	**hasTrainedStaff (gap if FALSE, but may need more even if TRUE)**
* **WASH Assessment:** 
* 	**isWaterSufficient (gap if FALSE)**
* 	**hasCleanWaterAccess (gap if FALSE, but may need more even if TRUE)**
* 	**areLatrinesSufficient (gap if FALSE)**
* 	**hasHandwashingFacilities (gap if FALSE, but may need more even if TRUE)**
* **Shelter Assessment:** 
* 	**areSheltersSufficient (gap if FALSE)**
* 	**hasSafeStructures (gap if FALSE, but may need more even if TRUE)**
* 	**hasWeatherProtection (gap if FALSE, but may need more even if TRUE)**
* 	**Food Assessment:** 
* 	**isFoodSufficient (gap if FALSE)**
* 	**hasRegularMealAccess (gap if FALSE, but may need more even if TRUE)**
* 	**hasInfantNutrition (gap if FALSE, but may need more even if TRUE)**
* **Security Assessment:** 
* 	**isSafeFromViolence (gap if FALSE)**
* 	**hasSecurityPresence (gap if FALSE, but may need more even if TRUE)**
* 	**hasLighting (gap if FALSE, but may need more even if TRUE)**

## Relationship Architecture

* **One-to-Many:**

  * User → RapidAssessment (as assessor)
  * User → RapidResponse (as responder)
  * Incident → PreliminaryAssessment
  * AffectedEntity → RapidAssessment
  * RapidAssessment → RapidResponse
  * Donor → DonorCommitment

* **Many-to-Many:**

  * User ↔ Role (through UserRole)
  * Incident ↔ AffectedEntity (through IncidentEntity)
  * User ↔ AffectedEntity (through EntityAssignment)
  * Donor ↔ AffectedEntity (through assignments)
