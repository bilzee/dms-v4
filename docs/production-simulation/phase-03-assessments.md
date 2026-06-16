# Phase 3 — Preliminary & Rapid Assessments

## Prerequisites
- Phase 2 completed (entity assignments and incidents created)
- All Phase 2 artefact IDs recorded

## Actors
- **ASSESSOR** (`sim.assessor@dms-sim.gov.ng`) — primary assessor
- **ASSESSOR2** (`sim.assessor2@dms-sim.gov.ng`) — secondary assessor

## Objectives
1. Create 3 Preliminary Assessments (one per incident)
2. Create 6 Rapid Assessments covering all 6 domain types (HEALTH, WASH, SHELTER, FOOD, SECURITY, POPULATION)
3. One rapid assessment on an auto-approve entity (→ AUTO_VERIFIED)
4. Remaining rapid assessments go to SUBMITTED status (→ verified in Phase 4)

## Artefacts Created
| Type | Count | Key IDs to Capture |
|------|-------|--------------------|
| Preliminary Assessments | 3 | `prelim.flood`, `prelim.conflict`, `prelim.outbreak` |
| Rapid Assessments | 6 | `rapid.health`, `rapid.wash`, `rapid.shelter`, `rapid.food`, `rapid.security`, `rapid.population` |

---

## Step 1: Login as Assessor

1. Execute `LOGIN(ASSESSOR)` using `sim.assessor@dms-sim.gov.ng` / `SimPass123!`
2. Confirm redirect to `/assessor/dashboard`

---

## Step 2: Create Preliminary Assessments

### 2.1 Navigate to Preliminary Assessment Form

1. **Navigate** to `{{PRODUCTION_URL}}/assessor/preliminary-assessment/new`
2. **Take a snapshot** of the form to identify all fields

### 2.2 Create Preliminary Assessment #1 — Flood (Gwoza)

Fill the form with:
- **Reporting LGA**: `Gwoza`
- **Reporting Ward**: `Gwoza Central`
- **Reporting Date**: Today's date
- **GPS Coordinates**: Capture or enter manually:
  - Latitude: `11.0833`
  - Longitude: `13.6667`
- **Number of Lives Lost**: `5`
- **Number of Injured**: `25`
- **Number of Displaced**: `1200`
- **Number of Houses Affected**: `350`
- **Number of Schools Affected**: `3`
- **Schools Affected (names)**: `Gwoza Primary School, Gwoza Secondary School, Gwoza Islamic School`
- **Number of Medical Facilities Affected**: `1`
- **Medical Facilities Affected**: `Gwoza Health Clinic`
- **Estimated Agricultural Lands Affected**: `Approximately 200 hectares of farmland submerged`
- **Reporting Agent**: `Sim Assessor One`
- **Active Incident**: Select `incident.flood` from the dropdown (the flood incident created in Phase 2)
- **Affected Entities**: Multi-select `entity.community1` (Gwoza Community)
- **Additional Details**: Leave blank or add: `Access to Gwoza community is limited due to flooded roads. Aerial assessment confirms widespread damage.`

**Click** "Save" / "Submit"
**Record** the ID → `prelim.flood`

### 2.3 Create Preliminary Assessment #2 — Conflict (Bama)

**Logout**, then **Login as ASSESSOR** (same user is assigned to community2 as well).

Actually, `sim.assessor` is assigned to community2 (Bama). Continue:

**Navigate** to `{{PRODUCTION_URL}}/assessor/preliminary-assessment/new`

Fill with:
- **Reporting LGA**: `Bama`
- **Reporting Ward**: `Bama Central`
- **Reporting Date**: Today's date
- **GPS Coordinates**:
  - Latitude: `11.5217`
  - Longitude: `13.6908`
- **Number of Lives Lost**: `12`
- **Number of Injured**: `45`
- **Number of Displaced**: `3500`
- **Number of Houses Affected**: `800`
- **Number of Schools Affected**: `5`
- **Schools Affected**: `Bama Primary School 1-3, Bama Secondary School, Bama Girls School`
- **Number of Medical Facilities Affected**: `2`
- **Medical Facilities Affected**: `Bama General Hospital, Bama Primary Health Centre`
- **Estimated Agricultural Lands Affected**: `Farmers abandoned approximately 500 hectares due to insecurity`
- **Reporting Agent**: `Sim Assessor One`
- **Active Incident**: Select `incident.conflict`
- **Affected Entities**: Multi-select `entity.community2` (Bama Community) and `entity.camp1` (Malkohi Camp)

**Click** "Save" / "Submit"
**Record** the ID → `prelim.conflict`

### 2.4 Create Preliminary Assessment #3 — Outbreak (Maiduguri)

**Navigate** to `{{PRODUCTION_URL}}/assessor/preliminary-assessment/new`

Fill with:
- **Reporting LGA**: `Maiduguri Metropolitan Council`
- **Reporting Ward**: `Bolori Ward`
- **Reporting Date**: Today's date
- **GPS Coordinates**:
  - Latitude: `11.8311`
  - Longitude: `13.1511`
- **Number of Lives Lost**: `3`
- **Number of Injured**: `0` (disease outbreak — no injuries)
- **Number of Displaced**: `0` (containment, no new displacement)
- **Number of Houses Affected**: `0`
- **Number of Schools Affected**: `0`
- **Number of Medical Facilities Affected**: `1`
- **Medical Facilities Affected**: `Maiduguri General Hospital`
- **Estimated Agricultural Lands Affected**: `Not applicable`
- **Reporting Agent**: `Sim Assessor One`
- **Active Incident**: Select `incident.outbreak`
- **Affected Entities**: Multi-select `entity.facility1` (Maiduguri General Hospital)

**Click** "Save" / "Submit"
**Record** the ID → `prelim.outbreak`

### 2.5 Verify Preliminary Assessments

1. **Navigate** to `{{PRODUCTION_URL}}/assessor/preliminary-assessment`
2. **Take a snapshot** — verify all 3 preliminary assessments appear in the list

---

## Step 3: Create Rapid Assessments

### 3.1 Create Rapid Assessment #1 — HEALTH (Gwoza Community / Flood)

This assessment is on `entity.community1` (Gwoza Community) which does NOT have auto-approve. It will go to SUBMITTED status.

1. **Navigate** to `{{PRODUCTION_URL}}/assessor/rapid-assessments/new`
2. **Take a snapshot** of the form
3. **Select Assessment Type**: `HEALTH`
4. **Fill Common Fields**:
   - **Entity**: `Gwoza Community` (`entity.community1`)
   - **Incident**: Flood incident (`incident.flood`)
   - **Assessment Date**: Today's date
   - **Assessor Name**: `Sim Assessor One`
   - **Location**: `Gwoza Community Health Clinic`
   - **GPS**: Latitude `11.0833`, Longitude `13.6667`
   - **Priority**: Leave as default (`MEDIUM`) — will be auto-calculated by gap analysis
5. **Fill HEALTH-specific fields** (`healthData`):
   - **Has Functional Clinic**: `No` (uncheck / false)
   - **Has Emergency Services**: `No` (uncheck / false)
   - **Number of Health Facilities**: `1`
   - **Health Facility Type**: `Primary Health Clinic`
   - **Qualified Health Workers**: `2`
   - **Has Trained Staff**: `No` (uncheck / false)
   - **Has Medicine Supply**: `No` (uncheck / false)
   - **Has Medical Supplies**: `No` (uncheck / false)
   - **Has Maternal Child Services**: `No` (uncheck / false)
   - **Common Health Issues**: Select/tag: `Diarrhea`, `Malaria`, `Respiratory Infections`
   - **Additional Health Details**: `Clinic severely damaged by flood. Medical supplies washed away. Urgent need for emergency medical intervention.`
6. **Click** "Save" / "Submit"
7. **Wait** for confirmation — assessment should be created with status `SUBMITTED`
8. **Record** the ID → `rapid.health`

> **Expected behaviour**: Since `entity.community1` does NOT have auto-approve enabled, the assessment status will be `SUBMITTED`. Gap analysis will compute HIGH or CRITICAL severity (6 out of 6 health gap fields triggered).

### 3.2 Create Rapid Assessment #2 — WASH (Gwoza Ward / Flood)

This assessment is on `entity.ward1` (Gwoza Ward) which HAS auto-approve enabled. It should go to `AUTO_VERIFIED` status.

1. **Navigate** to `{{PRODUCTION_URL}}/assessor/rapid-assessments/new`
2. **Select Assessment Type**: `WASH`
3. **Fill Common Fields**:
   - **Entity**: `Gwoza Ward` (`entity.ward1`)
   - **Incident**: Flood incident (`incident.flood`)
   - **Assessment Date**: Today's date
   - **Assessor Name**: `Sim Assessor One`
   - **Location**: `Gwoza Ward — Water and Sanitation Assessment`
   - **GPS**: Latitude `11.0833`, Longitude `13.6667`
4. **Fill WASH-specific fields** (`washData`):
   - **Water Source**: Tag: `Shallow Well`, `River/Pond`
   - **Is Water Sufficient**: `No` (false)
   - **Has Clean Water Access**: `No` (false)
   - **Functional Latrines Available**: `5`
   - **Are Latrines Sufficient**: `No` (false)
   - **Has Handwashing Facilities**: `No` (false)
   - **Has Open Defecation Concerns**: `Yes` (true — gap indicator)
   - **Additional WASH Details**: `Flood has contaminated traditional water sources. No water treatment available. High risk of cholera and waterborne diseases.`
5. **Click** "Save" / "Submit"
6. **Wait** for confirmation — assessment should be `AUTO_VERIFIED` (because Gwoza Ward has auto-approve enabled)
7. **Record** the ID → `rapid.wash`

> **Expected behaviour**: Since `entity.ward1` has `autoApproveEnabled = true`, this assessment will be `AUTO_VERIFIED` immediately with `verifiedAt` set.

### 3.3 Create Rapid Assessment #3 — SHELTER (Bama Community / Conflict)

**Note**: `sim.assessor` is assigned to `entity.community2` (Bama Community).

1. **Navigate** to `{{PRODUCTION_URL}}/assessor/rapid-assessments/new`
2. **Select Assessment Type**: `SHELTER`
3. **Fill Common Fields**:
   - **Entity**: `Bama Community` (`entity.community2`)
   - **Incident**: Conflict incident (`incident.conflict`)
   - **Assessment Date**: Today's date
   - **Assessor Name**: `Sim Assessor One`
   - **Location**: `Bama Community — Shelter Assessment`
   - **GPS**: Latitude `11.5217`, Longitude `13.6908`
4. **Fill SHELTER-specific fields** (`shelterData`):
   - **Are Shelters Sufficient**: `No` (false)
   - **Has Safe Structures**: `No` (false)
   - **Shelter Types**: Tag: `Makeshift/Tarpaulin`, `Damaged Buildings`
   - **Required Shelter Type**: Tag: `Tents`, `Permanent Housing`
   - **Number of Shelters Required**: `350`
   - **Are Overcrowded**: `Yes` (true — gap indicator)
   - **Provide Weather Protection**: `No` (false)
   - **Additional Shelter Details**: `Most structures damaged or destroyed by conflict. IDPs living in overcrowded makeshift shelters without adequate weather protection.`
5. **Click** "Save" / "Submit"
6. **Record** the ID → `rapid.shelter`

### 3.4 Create Rapid Assessment #4 — FOOD (Malkohi Camp / Conflict)

`sim.assessor` is assigned to `entity.camp1` (Malkohi Camp).

1. **Navigate** to `{{PRODUCTION_URL}}/assessor/rapid-assessments/new`
2. **Select Assessment Type**: `FOOD`
3. **Fill Common Fields**:
   - **Entity**: `Malkohi Displacement Camp` (`entity.camp1`)
   - **Incident**: Conflict incident (`incident.conflict`)
   - **Assessment Date**: Today's date
   - **Assessor Name**: `Sim Assessor One`
   - **Location**: `Malkohi Camp — Food Security Assessment`
   - **GPS**: Latitude `9.1167`, Longitude `12.3500`
4. **Fill FOOD-specific fields** (`foodData`):
   - **Is Food Sufficient**: `No` (false)
   - **Has Regular Meal Access**: `No` (false)
   - **Has Infant Nutrition**: `No` (false)
   - **Food Source**: Tag: `Humanitarian Aid`, `Community Sharing`
   - **Available Food Duration Days**: `3` (less than a week)
   - **Additional Food Required Persons**: `2000`
   - **Additional Food Required Households**: `400`
   - **Additional Food Details**: `Camp food stocks critically low. Last humanitarian delivery was 5 days ago. Infant formula and nutritional supplements urgently needed.`
5. **Click** "Save" / "Submit"
6. **Record** the ID → `rapid.food`

### 3.5 Switch to ASSESSOR2 for Remaining Assessments

1. Execute `LOGOUT`
2. Execute `LOGIN(ASSESSOR2)` using `sim.assessor2@dms-sim.gov.ng` / `SimPass123!`

### 3.6 Create Rapid Assessment #5 — SECURITY (Bama Ward / Conflict)

`sim.assessor2` is assigned to `entity.ward2` (Bama Ward).

1. **Navigate** to `{{PRODUCTION_URL}}/assessor/rapid-assessments/new`
2. **Select Assessment Type**: `SECURITY`
3. **Fill Common Fields**:
   - **Entity**: `Bama Ward` (`entity.ward2`)
   - **Incident**: Conflict incident (`incident.conflict`)
   - **Assessment Date**: Today's date
   - **Assessor Name**: `Sim Assessor Two`
   - **Location**: `Bama Ward — Security Assessment`
   - **GPS**: Latitude `11.5217`, Longitude `13.6908`
4. **Fill SECURITY-specific fields** (`securityData`):
   - **Is Safe From Violence**: `No` (false)
   - **GBV Cases Reported**: `Yes` (true — gap indicator)
   - **Has Security Presence**: `No` (false)
   - **Has Protection Reporting Mechanism**: `No` (false)
   - **Vulnerable Groups Have Access**: `No` (false)
   - **Has Lighting**: `No` (false)
   - **Additional Security Details**: `Reported incidents of gender-based violence. No security personnel stationed in the area. Women and children at high risk. No safe reporting channels available.`
5. **Click** "Save" / "Submit"
6. **Record** the ID → `rapid.security`

### 3.7 Create Rapid Assessment #6 — POPULATION (Maiduguri Hospital / Outbreak)

`sim.assessor2` is assigned to `entity.facility1` (Maiduguri General Hospital).

1. **Navigate** to `{{PRODUCTION_URL}}/assessor/rapid-assessments/new`
2. **Select Assessment Type**: `POPULATION`
3. **Fill Common Fields**:
   - **Entity**: `Maiduguri General Hospital` (`entity.facility1`)
   - **Incident**: Outbreak incident (`incident.outbreak`)
   - **Assessment Date**: Today's date
   - **Assessor Name**: `Sim Assessor Two`
   - **Location**: `Maiduguri General Hospital — Population Assessment`
   - **GPS**: Latitude `11.8333`, Longitude `13.1500`
4. **Fill POPULATION-specific fields** (`populationData`):
   - **Total Households**: `1500`
   - **Total Population**: `7500`
   - **Population Male**: `3600`
   - **Population Female**: `3900`
   - **Population Under 5**: `900`
   - **Pregnant Women**: `225`
   - **Lactating Mothers**: `300`
   - **Person With Disability**: `150`
   - **Elderly Persons**: `450`
   - **Separated Children**: `25`
   - **Number of Lives Lost**: `3`
   - **Number of Injured**: `45` (number of confirmed cholera cases being treated)
   - **Additional Population Details**: `Hospital serving as primary treatment centre for cholera outbreak. Catchment area includes Maiduguri metropolitan and surrounding communities.`
5. **Click** "Save" / "Submit"
6. **Record** the ID → `rapid.population`

---

## Step 4: Verify Assessment Statuses

1. **Navigate** to `{{PRODUCTION_URL}}/assessor/rapid-assessments`
2. **Take a snapshot** — verify all 6 rapid assessments appear
3. Check the `verificationStatus` column:
   - `rapid.health` → `SUBMITTED`
   - `rapid.wash` → `AUTO_VERIFIED` (entity has auto-approve)
   - `rapid.shelter` → `SUBMITTED`
   - `rapid.food` → `SUBMITTED`
   - `rapid.security` → `SUBMITTED`
   - `rapid.population` → `SUBMITTED`
4. Check the `priority` column — priorities should have been auto-calculated by gap analysis (e.g., HIGH or CRITICAL for assessments with many gap fields)

---

## Step 5: Logout

1. Execute `LOGOUT`

---

## Artefact Summary

```
ARTEFACT SUMMARY — Phase 3
==========================

# Preliminary Assessments (created via API)
prelim.flood      = "50cef4cc-6914-4729-bda5-51c261c32bd7"  (Gwoza — linked to incident.flood)
prelim.conflict   = "97ef4355-6c06-4ed4-b0a5-b3c83187f240"  (Bama — linked to incident.conflict)
prelim.outbreak   = "0c85b90c-2a2c-4102-a7fa-b2601fa0b560"  (Maiduguri — linked to incident.outbreak)

# Preliminary Assessment UI Validation (created via UI after 5 bug fixes)
prelim.flood.ui   = "eb533151-dd97-4816-9e77-e640f31c9395"  (Gwoza — linked to incident.flood)

# Rapid Assessments
rapid.health      = "c641a704-1b0c-4615-88d4-0ec219fe969f"  (HEALTH — community1 / flood)
rapid.wash        = "1615da9c-6a6a-4f97-9820-63f51376c8af"  (WASH — ward1 / flood — AUTO_VERIFIED)
rapid.shelter     = "18131209-cf7f-45bf-be3c-35acf9f86631"  (SHELTER — community2 / conflict)
rapid.food        = "2a0f280e-b465-4e1a-8af1-c45e1865a97b"  (FOOD — community1 / flood)
rapid.security    = "88620f30-808b-4697-b1df-a3ff6f8bf4b7"  (SECURITY — ward1 / conflict)
rapid.population  = "a0b062f5-8e65-4c4e-a1d6-9975e76be30b"  (POPULATION — LGA1 / flood)
```

## Bugs Discovered and Fixed During UI Validation

| # | Commit | Bug | Root Cause |
|---|--------|-----|------------|
| 1 | `3c5a521` | datetime-local format mismatch | Zod used `z.coerce.date()` but datetime-local input needs `yyyy-MM-ddThh:mm` string |
| 2 | `d99cbe5` | estimatedAgriculturalLandsAffected type mismatch | Form sends `number`, Zod expected `string`, Prisma column is `String?` |
| 3 | `f216d8a` | disabled fields excluded from RHF | `disabled={true}` causes RHF to exclude fields from form data → `undefined` → validation failure |
| 4 | `da97c78` | valueAsNumber produces NaN for empty inputs | RHF checks `valueAsNumber` before `setValueAs`; empty string → `NaN` instead of `0` |
| 5 | `79b5843` | String() conversion in handleFormSubmit | Leftover `String()` on estimatedAgriculturalLandsAffected caused server-side Zod `z.number()` rejection (400) |

## Verification Checklist

- [x] 3 preliminary assessments created and linked to correct incidents
- [x] Preliminary assessment UI validated (5 bugs found and fixed)
- [x] 6 rapid assessments created covering all domain types
- [x] `rapid.wash` (Gwoza Ward) shows `AUTO_VERIFIED` status
- [x] Other 5 rapid assessments show `SUBMITTED` status
- [x] Priority/severity auto-calculated for each rapid assessment (not all `MEDIUM`)
- [ ] Incident severities may have started updating (check incident list shows non-UNCLASSIFIED for flood)
