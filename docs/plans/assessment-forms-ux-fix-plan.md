# Assessment Forms UX Remediation Plan

**Date:** 2026-06-02
**Source:** Sally UX Audit — All 6 Rapid Assessment Forms + Preliminary Assessment
**Scope:** 8 files (7 form components + 1 host page)
**Status:** PLANNED

---

## Architecture Compliance Rules

All changes must follow the **BMAD Reference Architecture**:

```
Component --> useForm + zodResolver --> apiGet/apiPost (src/lib/api.ts) --> fetch() + Bearer token
```

- **Form library:** `react-hook-form` with `zodResolver`
- **UI primitives:** Shadcn/ui (`<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormMessage>`)
- **Validation:** Zod schemas from `src/lib/validation/rapid-assessment.ts` and `src/lib/validation/preliminary-assessment.ts`
- **Design system components:** `FormCard`, `FormActionBar`, `MediaField`, `GPSCapture`, `EntitySelector`, `IncidentSelector`
- **Auth:** `useAuth()` from `@/hooks/useAuth`
- **API calls:** `apiGet`/`apiPost` from `@/lib/api`

---

## Dependency Graph

```
Phase 1 (P0): Critical UX Anti-Patterns
  |-- Task 1.1: Suppress gap/risk alerts until user interaction     [independent]
  |-- Task 1.2: Fix Preliminary hardcoded incident data             [independent]
  |-- Task 1.3: Unify Preliminary form to design system components  [depends on 1.2]
  \-- (ALL Phase 1 tasks are BLOCKERS for Phase 2-3 testing)

Phase 2 (P1): Design System Conformance                             [depends on Phase 1]
  |-- Task 2.1: Replace raw <select> with Shadcn/ui Select         [independent, Health only]
  |-- Task 2.2: Replace Checkbox with gap-aware pattern            [independent, all 6 rapid]
  |-- Task 2.3: Fix Preliminary form error rendering               [independent]
  |-- Task 2.4: Fix Preliminary media upload to use MediaField     [independent]
  |-- Task 2.5: Normalize FormActionBar variant across forms       [independent]

Phase 3 (P1-P2): Accessibility & Validation                         [depends on Phase 1]
  |-- Task 3.1: Add aria-required and fieldset/legend to checkbox groups  [independent]
  |-- Task 3.2: Fix destructive alert semantics for gap info       [independent]
  |-- Task 3.3: Add cross-field validation to all forms            [independent]
  |-- Task 3.4: Fix WASH hardcoded population estimate             [independent]

Phase 4 (P2-P3): UX Enhancements                                    [depends on Phase 1]
  |-- Task 4.1: Add form progress indicator                        [independent]
  |-- Task 4.2: Pre-fill and lock incident/entity from Action Queue [independent]
  |-- Task 4.3: Add consistent data-testid attributes              [independent]
  |-- Task 4.4: Remove all console.log statements                  [independent]
  |-- Task 4.5: Fix Card-inside-Card nesting                       [independent]
  |-- Task 4.6: Replace form.watch() with useWatch()               [independent]

Phase 5: Systematic Testing                                         [depends on Phases 1-4]
  |-- Task 5.1: Component rendering tests (all 7 forms)
  |-- Task 5.2: Validation tests (all Zod schemas + cross-field)
  |-- Task 5.3: Accessibility tests (ARIA, keyboard, screen reader)
  |-- Task 5.4: Integration tests (submit workflow, offline guard)
  |-- Task 5.5: Visual regression tests (screenshots before/after)
```

---

## Files Affected

### Form Components (7 files)
| File | Tasks |
|------|-------|
| `src/components/forms/assessment/HealthAssessmentForm.tsx` | 1.1, 2.1, 2.2, 3.1, 3.2, 4.3, 4.4, 4.6 |
| `src/components/forms/assessment/FoodAssessmentForm.tsx` | 1.1, 2.2, 3.1, 3.2, 4.3, 4.4, 4.6 |
| `src/components/forms/assessment/PopulationAssessmentForm.tsx` | 1.1, 2.2, 3.2, 3.3, 4.3, 4.4, 4.6 |
| `src/components/forms/assessment/WASHAssessmentForm.tsx` | 1.1, 2.2, 3.1, 3.2, 3.3, 3.4, 4.3, 4.4, 4.6 |
| `src/components/forms/assessment/ShelterAssessmentForm.tsx` | 1.1, 2.2, 3.1, 3.2, 3.3, 4.3, 4.4, 4.6 |
| `src/components/forms/assessment/SecurityAssessmentForm.tsx` | 1.1, 2.2, 3.2, 3.3, 4.3, 4.4, 4.6 |
| `src/components/forms/assessment/PreliminaryAssessmentForm.tsx` | 1.2, 1.3, 2.3, 2.4, 2.5, 4.3, 4.4 |

### Host Pages (1 file)
| File | Tasks |
|------|-------|
| `src/app/(auth)/assessor/rapid-assessments/new/page.tsx` | 4.2 |

### Validation Schemas (2 files)
| File | Tasks |
|------|-------|
| `src/lib/validation/rapid-assessment.ts` | 3.3 |
| `src/lib/validation/preliminary-assessment.ts` | No changes needed |

### Test Files (new)
| File | Tasks |
|------|-------|
| `tests/unit/components/assessment/assessment-forms.test.tsx` | 5.1 |
| `tests/unit/validation/rapid-assessment-cross-field.test.ts` | 5.2 |
| `tests/unit/components/assessment/assessment-forms-a11y.test.tsx` | 5.3 |
| `tests/integration/assessment/assessment-submit-workflow.test.ts` | 5.4 |

---

## Phase 1: P0 — Critical UX Anti-Patterns

> **Risk:** MEDIUM — changes to gap display logic, form component architecture
> **Rollback:** Revert individual form components
> **Testing:** Open all 7 forms. Verify no gap alerts on initial load. Verify gap alerts appear after field interaction.

### Task 1.1: Suppress Gap/Risk Alerts Until User Interaction

**Severity:** CRITICAL
**Forms affected:** All 6 rapid forms
**Problem:** On first load with all fields defaulted to false/unchecked, the forms immediately show red "N Gaps" badges, destructive alerts listing all gaps, and a full Risk Assessment card with individual red alerts. This creates alert fatigue before the assessor has entered any data.

**Implementation:**

Each form tracks an `hasInteracted` state. Gap analysis and risk assessment sections only render after the user has toggled at least one boolean field or changed a numeric field.

**Per-form changes (identical pattern for all 6 rapid forms):**

1. Add interaction tracking state:
```tsx
const [hasInteracted, setHasInteracted] = useState(false)
```

2. Add an interaction detector function:
```tsx
const markInteracted = () => { if (!hasInteracted) setHasInteracted(true) }
```

3. Wrap each boolean Checkbox's `onCheckedChange` to call `markInteracted()`:
```tsx
<Checkbox
  checked={field.value}
  onCheckedChange={(checked) => {
    markInteracted()
    field.onChange(checked)
  }}
/>
```

4. Wrap each numeric Input's `onChange` to call `markInteracted()` on first change.

5. Conditionally render the gap summary badge, the destructive gap alert, and the entire Risk Assessment `<Card>`:
```tsx
{hasInteracted && gaps.length > 0 && (
  <Alert variant="destructive">
    <AlertDescription>
      <strong>Gaps Identified:</strong> {gaps.map(g => g.label).join(', ')}
    </AlertDescription>
  </Alert>
)}
```

6. Conditionally render the gap count badge in the form header:
```tsx
{hasInteracted && gaps.length > 0 && (
  <Badge variant="destructive">{gaps.length} Gaps</Badge>
)}
```

7. The Risk Assessment card at the bottom of each form should also be gated:
```tsx
{hasInteracted && (
  <Card>
    <CardHeader><CardTitle>Risk Assessment</CardTitle></CardHeader>
    <CardContent>
      {/* existing gap risk alerts */}
    </CardContent>
  </Card>
)}
```

**Validation:**
- Open Health form → no gap badge, no destructive alert, no Risk Assessment card
- Check "Functional Clinic" → gap badge appears, Risk Assessment shows
- Uncheck "Functional Clinic" → gap badge updates, Risk Assessment shows "Gap" for that item
- Refresh page → back to clean state (no interaction)

---

### Task 1.2: Fix Preliminary Form Hardcoded Incident Data

**Severity:** CRITICAL (production-blocking)
**Forms affected:** Preliminary only
**Problem:** The Preliminary form has hardcoded fake incidents:
```tsx
setAvailableIncidents([
  { id: '1', type: 'Flood', location: 'Maiduguri', description: '...' },
  { id: '2', type: 'Fire', location: 'Jere', description: '...' }
])
```

**Implementation:**

1. Replace the hardcoded `setAvailableIncidents` with an API call:
```tsx
const fetchIncidents = useCallback(async () => {
  try {
    const result = await apiGet('/api/v1/incidents?status=ACTIVE&limit=50')
    if (result.success && result.data) {
      setAvailableIncidents(result.data.incidents || result.data)
    }
  } catch (error) {
    console.error('Failed to load incidents:', error)
    setAvailableIncidents([])
  }
}, [])
```

2. Call `fetchIncidents()` in the `useEffect` that currently sets hardcoded data.

3. Verify the `/api/v1/incidents` endpoint exists and returns `{ success: true, data: { incidents: [...] } }`. Check `src/app/api/v1/incidents/route.ts`.

4. If the incidents endpoint doesn't support `?status=ACTIVE` filter, add it or filter client-side:
```tsx
const activeIncidents = (result.data.incidents || result.data).filter(
  (i: any) => i.status === 'ACTIVE'
)
setAvailableIncidents(activeIncidents)
```

**Validation:**
- Open Preliminary form → incident dropdown shows real active incidents from the database
- If no incidents exist → dropdown is empty (not fake data)
- If API fails → dropdown is empty with a subtle error message

---

### Task 1.3: Unify Preliminary Form to Design System Components

**Severity:** HIGH
**Forms affected:** Preliminary only
**Problem:** The Preliminary form uses raw `<Label>`, `<Input>`, and manual error `<p>` tags instead of `<FormField>` + `<FormItem>` + `<FormLabel>` + `<FormMessage>`. It also uses raw `<Input type="file">` instead of `MediaField`.

**Implementation:**

This is the largest task. Convert the Preliminary form from raw form elements to design-system-compliant components.

**Step 1: Wrap the form in `<Form {...form}>` context provider.**

Currently the form uses `const { register, handleSubmit, ... } = useForm(...)`. The 6 rapid forms use `<Form {...form}>` wrapper from Shadcn/ui. Migrate to the same pattern:

```tsx
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PreliminaryAssessmentSchema } from '@/lib/validation/preliminary-assessment'

const form = useForm<PreliminaryAssessmentInput>({
  resolver: zodResolver(PreliminaryAssessmentSchema),
  defaultValues: { ... }
})

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    {/* fields */}
  </form>
</Form>
```

**Step 2: Convert each field from `register()` to `<FormField>`.**

For each field, replace:
```tsx
<Label htmlFor="field">Label</Label>
<Input id="field" {...register('field')} />
{errors.field && <p className="text-sm text-red-600">{errors.field.message}</p>}
```
With:
```tsx
<FormField
  control={form.control}
  name="field"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Step 3: Replace raw `<Input type="file">` with `MediaField`.**

Import and use the existing `MediaField` component (used by all 6 rapid forms):
```tsx
import { MediaField } from '@/components/shared/MediaField'
```

Replace the raw file input with the drag-and-drop media uploader.

**Step 4: Normalize FormActionBar variant.**

Currently uses `variant="default"`. Change to `variant="bordered"` to match all 6 rapid forms:
```tsx
<FormActionBar
  variant="bordered"
  onCancel={onCancel}
  submitLabel="Submit Preliminary Assessment"
  loading={isSubmitting}
  disabled={!form.formState.isValid}
/>
```

**Validation:**
- Open Preliminary form → all fields use design system styling
- Validation errors show via `<FormMessage />` (animated, themed, accessible)
- Media upload shows drag-and-drop interface with previews
- FormActionBar has top border matching rapid forms
- Form submits successfully with real data
- Draft save continues to work

---

## Phase 2: P1 — Design System Conformance

> **Risk:** LOW-MEDIUM — component swaps, no data logic changes
> **Rollback:** Revert individual form components
> **Testing:** Open each form. Verify all UI elements render with design system styling. Submit form and verify data.

### Task 2.1: Replace Raw `<select>` with Shadcn/ui Select (Health Form)

**Severity:** MEDIUM
**Forms affected:** Health only
**File:** `src/components/forms/assessment/HealthAssessmentForm.tsx`
**Problem:** Uses raw HTML `<select>` for facility type instead of Shadcn/ui `Select`.

**Implementation:**

1. Import Shadcn/ui Select components:
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
```

2. Find the `<select>` element for facility type (inside a `<FormField>` render or standalone).

3. Replace with:
```tsx
<FormField
  control={form.control}
  name="healthFacilityType"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Primary Facility Type</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select facility type" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="Hospital">Hospital</SelectItem>
          <SelectItem value="Primary Health Center">Primary Health Center</SelectItem>
          <SelectItem value="Clinic">Clinic</SelectItem>
          <SelectItem value="Dispensary">Dispensary</SelectItem>
          <SelectItem value="Mobile Clinic">Mobile Clinic</SelectItem>
          <SelectItem value="Community Health Post">Community Health Post</SelectItem>
          <SelectItem value="Other">Other</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Validation:**
- Health form facility type dropdown uses Shadcn/ui styling (animation, theme)
- Dark mode works correctly
- Selected value persists through form submission
- Validation error shows if no selection made

---

### Task 2.2: Improve Checkbox Gap Pattern Across All 6 Rapid Forms

**Severity:** MEDIUM (design system conformance)
**Forms affected:** All 6 rapid forms
**Problem:** All boolean fields use raw `<Checkbox>` from Shadcn/ui, which is functional but doesn't match the design system's Component #5 (BooleanField, switch-based with gap visualization). The design system specifies switches, but checkboxes are appropriate for the rapid assessment context (triage-style checklist). The real issue is that unchecked = "Gap" semantics are confusing on first load.

**Implementation:**

Rather than replacing Checkbox with Switch (which would change the interaction model significantly), improve the checkbox presentation to make gap semantics clearer:

1. For each boolean gap field, improve the visual treatment to show a 3-state indicator:
   - **Untouched (default):** Neutral styling — no "Gap" badge, no "No Gap" badge
   - **Checked (true):** Green "No Gap" badge
   - **Unchecked after interaction:** Red "Gap" badge

2. This builds on the `hasInteracted` state from Task 1.1. The StatusBadge next to each checkbox should be:
```tsx
{!hasInteracted ? null : field.value ? (
  <Badge className="bg-green-100 text-green-800">No Gap</Badge>
) : (
  <Badge variant="destructive">Gap</Badge>
)}
```

3. Ensure consistent label text: The checkbox label should state the POSITIVE condition (e.g., "Functional Clinic Available") so that checking it = "this service exists."

**Validation:**
- Open any rapid form → all boolean checkboxes show neutral styling (no gap/no-gap badge)
- Check a checkbox → "No Gap" badge appears in green
- Uncheck a checkbox → "Gap" badge appears in red
- All 6 forms have consistent boolean field presentation

---

### Task 2.3: Fix Preliminary Form Error Rendering

**Severity:** MEDIUM
**Forms affected:** Preliminary only
**Problem:** Uses manual error `<p>` instead of `<FormMessage />`.
**Note:** This is resolved by Task 1.3 (Step 2). If Task 1.3 is fully implemented, this task is redundant. Mark as covered by 1.3.

**If Task 1.3 is partially deferred**, the minimum fix is:
- Add `role="alert"` to each error `<p>`:
```tsx
{errors.field && (
  <p className="text-sm text-red-600" role="alert">{errors.field.message}</p>
)}
```

**Validation:**
- Submit Preliminary form with empty required fields → errors show with `role="alert"`
- Screen reader announces validation errors

---

### Task 2.4: Fix Preliminary Media Upload to Use MediaField

**Severity:** HIGH (design system conformance)
**Forms affected:** Preliminary only
**Note:** This is resolved by Task 1.3 (Step 3). If Task 1.3 is fully implemented, this task is redundant. Mark as covered by 1.3.

**If Task 1.3 is partially deferred**, the minimum fix is to import and render `MediaField`:
```tsx
import { MediaField } from '@/components/shared/MediaField'

<MediaField
  value={mediaFiles}
  onChange={setMediaFiles}
  maxFiles={5}
  maxSizeMB={10}
/>
```

**Validation:**
- Preliminary form media upload shows drag-and-drop zone
- File previews appear after selection
- Max 5 files enforced
- Consistent with rapid form media upload experience

---

### Task 2.5: Normalize FormActionBar Variant

**Severity:** LOW
**Forms affected:** Preliminary only
**Note:** This is resolved by Task 1.3 (Step 4). Mark as covered by 1.3.

**Validation:**
- Preliminary form action bar has top border separator
- Matches the visual treatment of all 6 rapid forms

---

## Phase 3: P1-P2 — Accessibility & Validation

> **Risk:** LOW — additive accessibility attributes, validation additions
> **Rollback:** Revert individual changes
> **Testing:** Keyboard navigation through all forms. Screen reader testing. Submit forms with edge-case data.

### Task 3.1: Add Fieldset/Legend and aria-required to Checkbox Groups

**Severity:** MEDIUM
**Forms affected:** Health, Food, WASH, Shelter
**Problem:** Checkbox groups (e.g., "Common Health Issues", "Food Sources", "Water Sources", "Shelter Types") lack fieldset/legend grouping and ARIA labels.

**Implementation:**

For each checkbox group in the 4 forms, wrap the group in a `<fieldset>` with `<legend>`:

```tsx
<fieldset className="space-y-3">
  <legend className="text-sm font-medium mb-2">Common Health Issues</legend>
  <p className="text-xs text-muted-foreground mb-3">
    Select the most common health issues observed
  </p>
  {healthIssueOptions.map((issue) => (
    <FormField
      key={issue.value}
      control={form.control}
      name="commonHealthIssues"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value?.includes(issue.value)}
              onCheckedChange={(checked) => {
                markInteracted()
                const current = field.value || []
                field.onChange(
                  checked
                    ? [...current, issue.value]
                    : current.filter((v: string) => v !== issue.value)
                )
              }}
            />
          </FormControl>
          <FormLabel className="font-normal">
            {issue.label}
          </FormLabel>
          <FormDescription>{issue.description}</FormDescription>
        </FormItem>
      )}
    />
  ))}
</fieldset>
```

For the incident/entity selectors, add `aria-required="true"`:
```tsx
<FormField
  control={form.control}
  name="incidentId"
  rules={{ required: 'Incident is required' }}
  render={({ field }) => (
    <FormItem aria-required="true">
      ...
    </FormItem>
  )}
/>
```

**Forms and their checkbox groups:**
| Form | Checkbox Groups |
|------|----------------|
| Health | Common Health Issues (Diarrhea, Malaria, Respiratory Infections, Malnutrition, Other) |
| Food | Food Sources (Market, Humanitarian Aid, Farming, Community Sharing, Other) |
| WASH | Water Sources (Borehole, Well, River/Stream, Water Trucking, Other) |
| Shelter | Shelter Types (Permanent House, Temporary Shelter, Tent, Makeshift, Other), Required Shelter Types |

**Validation:**
- Screen reader announces "Common Health Issues" as a group with N items
- Tab through checkboxes → screen reader announces each checkbox label
- Incident/entity selectors announce "required" to screen readers

---

### Task 3.2: Fix Destructive Alert Semantics for Gap Information

**Severity:** MEDIUM (accessibility)
**Forms affected:** All 6 rapid forms
**Problem:** The Risk Assessment section uses `variant="destructive"` alerts for informational gap content. Screen readers announce these as errors/alerts, which is misleading — they're informational status indicators.

**Implementation:**

Change the gap risk items from `<Alert variant="destructive">` to a neutral status component:

```tsx
<div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border" role="status">
  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
  <div>
    <p className="text-sm font-medium">{gap.label} Gap:</p>
    <p className="text-xs text-muted-foreground">{gap.description}</p>
  </div>
</div>
```

For the summary alert at the top (after interaction per Task 1.1), keep `<Alert variant="destructive">` since it IS an alert about identified gaps, but only show it when `hasInteracted && gaps.length > 0`.

**Validation:**
- Screen reader announces gap items as "status" not "alert"
- No false error announcements on form load
- Visual appearance is still informative (orange icon, muted background)

---

### Task 3.3: Add Cross-Field Validation to All Forms

**Severity:** MEDIUM
**Forms affected:** Food, WASH, Shelter, Security (Population already has it)
**Problem:** Only the Population form has cross-field validation. Other forms accept nonsensical data (e.g., "food required for 500 people" when "food sufficient" is checked).

**Implementation:**

Add `.refine()` calls to the Zod schemas in `src/lib/validation/rapid-assessment.ts`:

**Food Assessment:**
```ts
export const FoodAssessmentSchema = z.object({
  // ... existing fields
}).refine(
  (data) => {
    if (data.isFoodSufficient && data.additionalFoodRequiredPersons > 0) return false
    return true
  },
  {
    message: 'Food is marked as sufficient but additional food is requested',
    path: ['additionalFoodRequiredPersons']
  }
).refine(
  (data) => {
    if (data.isFoodSufficient && data.availableFoodDurationDays < 7) return false
    return true
  },
  {
    message: 'Food is marked as sufficient but available duration is less than 7 days',
    path: ['availableFoodDurationDays']
  }
)
```

**WASH Assessment:**
```ts
export const WASHAssessmentSchema = z.object({
  // ... existing fields
}).refine(
  (data) => {
    if (data.areLatrinesSufficient && data.functionalLatrinesAvailable === 0) return false
    return true
  },
  {
    message: 'Latrines marked as sufficient but none are functional',
    path: ['functionalLatrinesAvailable']
  }
)
```

**Shelter Assessment:**
```ts
export const ShelterAssessmentSchema = z.object({
  // ... existing fields
}).refine(
  (data) => {
    if (data.areSheltersSufficient && data.numberSheltersRequired > 0) return false
    return true
  },
  {
    message: 'Shelters marked as sufficient but additional shelters are required',
    path: ['numberSheltersRequired']
  }
)
```

**Security Assessment:** No obvious cross-field contradiction. Skip unless domain expert identifies one.

**Display the validation errors in forms:**
In each form, add a form-level error display near the submit button:
```tsx
{Object.keys(form.formState.errors).length > 0 && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Please fix the validation errors above before submitting.
    </AlertDescription>
  </Alert>
)}
```

**Validation:**
- Food form: Check "food sufficient" + enter 100 persons needing food → validation error
- WASH form: Check "latrines sufficient" + enter 0 functional latrines → validation error
- Shelter form: Check "shelters sufficient" + enter 50 shelters required → validation error
- Population form: Existing cross-field validation still works

---

### Task 3.4: Fix WASH Hardcoded Population Estimate

**Severity:** MEDIUM
**Forms affected:** WASH only
**File:** `src/components/forms/assessment/WASHAssessmentForm.tsx`
**Problem:** Hardcoded `const estimatedPopulation = 1000` for latrine coverage calculation.

**Implementation:**

1. Accept population data from props or fetch from the entity's latest population assessment:

```tsx
const estimatedPopulation = useMemo(() => {
  if (initialData?.populationData?.totalPopulation) {
    return initialData.populationData.totalPopulation
  }
  if (latestPopulationAssessment?.data?.totalPopulation) {
    return latestPopulationAssessment.data.totalPopulation
  }
  return 0
}, [initialData, latestPopulationAssessment])
```

2. If no population data is available, show a warning instead of calculating with 1000:
```tsx
{estimatedPopulation === 0 ? (
  <p className="text-xs text-muted-foreground">
    Latrine coverage cannot be calculated without population data.
    Complete a Population Assessment first.
  </p>
) : (
  <p className="text-xs text-muted-foreground">
    Estimated latrine coverage: {latrineCoverage}% (based on population of {estimatedPopulation.toLocaleString()})
  </p>
)}
```

**Validation:**
- WASH form without population data → shows "cannot calculate" message
- WASH form with population data → shows accurate coverage percentage
- No hardcoded "1000" in the form

---

## Phase 4: P2-P3 — UX Enhancements

> **Risk:** LOW — quality-of-life improvements, no breaking changes
> **Rollback:** Revert individual changes
> **Testing:** Verify each enhancement independently.

### Task 4.1: Add Form Progress Indicator

**Severity:** MEDIUM (UX enhancement)
**Forms affected:** All 7 forms
**Problem:** No indication of how far along the assessor is in completing the form.

**Implementation:**

Create a shared `FormProgress` component:

```tsx
// src/components/shared/FormProgress.tsx
interface FormProgressProps {
  currentStep: number
  totalSteps: number
  labels?: string[]
}

export function FormProgress({ currentStep, totalSteps, labels }: FormProgressProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100)
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{labels?.[currentStep - 1] || `Section ${currentStep}`}</span>
        <span>{percentage}% complete</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
```

Integrate into each form by counting visible `<Card>` sections and tracking which ones have been touched. A simpler approach: use form dirty state to estimate progress:

```tsx
const watchedFields = form.watch()
const filledCount = Object.values(watchedFields).filter(v =>
  v !== undefined && v !== null && v !== '' && v !== 0 && v !== false
).length
const totalFields = 15 // per form
const progress = Math.min(100, Math.round((filledCount / totalFields) * 100))
```

**Alternative (simpler, recommended):** Add a sticky progress bar at the top of the form that shows `% of required fields completed`:
```tsx
const requiredFields = ['incidentId', 'entityId'] // + form-specific requireds
const filledRequired = requiredFields.filter(f => {
  const val = form.getValues(f)
  return val !== undefined && val !== null && val !== ''
}).length
const progress = Math.round((filledRequired / requiredFields.length) * 100)
```

Place the progress indicator just below the form title and make it sticky on mobile:
```tsx
<div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
  <FormProgress currentStep={filledRequired} totalSteps={requiredFields.length} />
</div>
```

**Validation:**
- Open any form → progress indicator shows 0% or minimal
- Fill required fields → progress increases
- All required fields filled → progress shows 100%

---

### Task 4.2: Pre-fill and Lock Incident/Entity from Action Queue

**Severity:** MEDIUM
**Forms affected:** All 6 rapid forms (via host page)
**File:** `src/app/(auth)/assessor/rapid-assessments/new/page.tsx`
**Problem:** When navigating from the Action Queue (which knows both incident and entity), the form still shows them as interactive selectors.

**Implementation:**

In the host page `NewAssessmentContent`:

1. When `prefillEntityId` and `prefillIncidentId` are present, pass a `locked` flag to the form:
```tsx
const isPreFilled = !!(prefillEntityId && prefillIncidentId)

const commonProps = {
  entityId: prefillEntityId,
  incidentId: prefillIncidentId,
  lockEntityAndIncident: isPreFilled,
  initialData: latestAssessmentData,
  onSubmit: handleAssessmentSubmit,
  onCancel: handleGoBack,
}
```

2. In each rapid form component, accept `lockEntityAndIncident` prop:
```tsx
interface AssessmentFormProps {
  // ... existing props
  lockEntityAndIncident?: boolean
}
```

3. When `lockEntityAndIncident` is true:
   - Render the entity and incident as read-only display (not dropdowns):
   ```tsx
   {lockEntityAndIncident ? (
     <div className="p-3 bg-muted/50 rounded-lg">
       <p className="text-sm font-medium">{incidentName}</p>
       <p className="text-xs text-muted-foreground">{entityName}</p>
     </div>
   ) : (
     <EntitySelector ... />
   )}
   ```
   - Skip the Incident/Entity card sections entirely, or collapse them

**Validation:**
- Navigate from Action Queue "Start Assessment" → form opens with entity/incident pre-filled and locked
- Navigate directly to `/assessor/rapid-assessments/new?type=HEALTH` → entity/incident are editable dropdowns

---

### Task 4.3: Add Consistent data-testid Attributes

**Severity:** LOW
**Forms affected:** All 7 forms
**Problem:** Only the Health form has `data-testid` attributes. The other forms lack them.

**Implementation:**

Add `data-testid` to key interactive elements in each form:

```tsx
<FormLabel data-testid="field-label-functional-clinic">Functional Clinic</FormLabel>
<Checkbox data-testid="field-functional-clinic" ... />
<Input data-testid="field-health-facilities" ... />
<SelectTrigger data-testid="field-facility-type" ... />
<Button data-testid="btn-submit" ... />
<Button data-testid="btn-cancel" ... />
```

Follow a naming convention: `field-{form-type}-{field-name}` for fields, `btn-{action}` for buttons.

| Form | Prefix |
|------|--------|
| Health | `field-health-*` |
| Food | `field-food-*` |
| Population | `field-pop-*` |
| WASH | `field-wash-*` |
| Shelter | `field-shelter-*` |
| Security | `field-security-*` |
| Preliminary | `field-prelim-*` |

**Validation:**
- Each form has test IDs on all interactive elements
- Tests can select elements by test ID

---

### Task 4.4: Remove All console.log Statements

**Severity:** LOW
**Forms affected:** All 7 forms + host page
**Problem:** Debug logging left in production code.

**Implementation:**

Remove or guard all `console.log` statements:

```tsx
// BEFORE
console.log('Submitting assessment data:', formData)
console.log('Assessment submitted successfully:', result.data)
console.error('Error submitting assessment:', error)

// AFTER — remove entirely, or guard for development only:
if (process.env.NODE_ENV === 'development') {
  console.log('Submitting assessment data:', formData)
}
```

Prefer removing entirely. Error logging should use proper error reporting (Sentry, etc.).

**Files and approximate line numbers:**
- `HealthAssessmentForm.tsx`: ~3 occurrences
- `FoodAssessmentForm.tsx`: ~2 occurrences
- `PopulationAssessmentForm.tsx`: ~3 occurrences
- `WASHAssessmentForm.tsx`: ~2 occurrences
- `ShelterAssessmentForm.tsx`: ~2 occurrences
- `SecurityAssessmentForm.tsx`: ~3 occurrences
- `PreliminaryAssessmentForm.tsx`: ~2 occurrences
- `src/app/(auth)/assessor/rapid-assessments/new/page.tsx`: ~3 occurrences

**Validation:**
- Search all 8 files for `console.log` → zero results (or only dev-guarded)

---

### Task 4.5: Fix Card-Inside-Card Nesting

**Severity:** LOW
**Forms affected:** All 6 rapid forms
**Problem:** Each form wraps everything in `<FormCard className="max-w-4xl mx-auto">` (which is itself a Card), then puts multiple `<Card>` sections inside. This creates Card-inside-Card visual nesting.

**Implementation:**

Change the outer `FormCard` to not render as a Card. Use the `FormCard` as a layout container only:

Option A: Remove the outer `FormCard` wrapper and use a plain `<div>`:
```tsx
<div className="max-w-4xl mx-auto space-y-6">
  {/* Card sections */}
</div>
```

Option B: Use `FormCard` with no border/shadow variant:
```tsx
<FormCard variant="compact" className="max-w-4xl mx-auto border-0 shadow-none">
```

Either approach eliminates the double-border visual. The inner `<Card>` sections provide the visual grouping.

**Validation:**
- Forms no longer show double borders or nested card shadows
- Visual grouping of sections is maintained by inner Cards
- FormActionBar at the bottom is not inside a Card

---

### Task 4.6: Replace form.watch() with useWatch()

**Severity:** LOW (performance)
**Forms affected:** All 6 rapid forms
**Problem:** All rapid forms use `form.watch()` at the top level, which subscribes to ALL field changes and re-renders the entire form on every keystroke. On mobile (the primary assessor device), this can cause lag.

**Implementation:**

Replace:
```tsx
const watchedFields = form.watch()
```

With targeted subscriptions using `useWatch`:
```tsx
import { useWatch } from 'react-hook-form'

// Only subscribe to the fields used for gap analysis
const booleanFields = useWatch({
  control: form.control,
  name: ['hasFunctionalClinic', 'hasEmergencyServices', 'hasTrainedStaff',
          'hasMedicineSupply', 'hasMedicalSupplies', 'hasMaternalChildServices']
})
```

Or, for the gap calculation, extract it into a memoized hook:
```tsx
const gaps = useMemo(() => {
  const gapFields = [
    { name: 'hasFunctionalClinic', label: 'Functional Clinic' },
    // ...
  ]
  return gapFields.filter(f => !form.getValues(f.name))
}, [form, /* depend on specific watched fields */])
```

**Validation:**
- Form typing in numeric fields does not cause visible lag on mobile
- Gap analysis still updates correctly when boolean fields change
- No functional regression

---

## Phase 5: Systematic Testing

> **Risk:** LOW — additive test coverage
> **Dependencies:** All previous phases should be complete before Phase 5

### Task 5.1: Component Rendering Tests (All 7 Forms)

**File:** `tests/unit/components/assessment/assessment-forms.test.tsx`

Test cases for each form:

1. **Renders without crashing** — mount with default props
2. **Shows correct form title and description** — verify heading text
3. **Shows incident/entity selectors** — verify selector components render
4. **Shows GPS capture** — verify GPSCapture component renders
5. **Shows media upload** — verify MediaField component renders
6. **Shows submit and cancel buttons** — verify FormActionBar renders
7. **Submit button is disabled by default** — verify initial state
8. **Shows form-specific fields** — verify category-specific fields render
9. **No gap alerts on initial load** — verify no destructive alerts before interaction
10. **Gap alerts appear after boolean toggle** — verify alerts appear after interaction

### Task 5.2: Validation Tests (Cross-Field)

**File:** `tests/unit/validation/rapid-assessment-cross-field.test.ts`

Test cases:

1. **Food: food sufficient + persons required = error**
2. **Food: food sufficient + < 7 days duration = error**
3. **WASH: latrines sufficient + 0 functional = error**
4. **Shelter: shelters sufficient + shelters required > 0 = error**
5. **Population: male + female > total = error** (existing, verify still works)
6. **Population: vulnerable > total = error** (existing, verify still works)
7. **Health: all fields valid = passes**
8. **Security: all fields valid = passes**

### Task 5.3: Accessibility Tests

**File:** `tests/unit/components/assessment/assessment-forms-a11y.test.tsx`

Test cases:

1. **All form inputs have associated labels** — verify label-for-input mapping
2. **Checkbox groups have fieldset/legend** — verify grouping
3. **Required fields have aria-required** — verify attribute
4. **Error messages have role="alert"** — verify FormMessage renders with role
5. **No exclusively color-based indicators** — verify text labels alongside colors
6. **Keyboard navigation through all fields** — verify Tab order
7. **GPS capture button is keyboard-accessible** — verify focus/activation

### Task 5.4: Integration Tests (Submit Workflow)

**File:** `tests/integration/assessment/assessment-submit-workflow.test.ts`

Test cases:

1. **Health form: fill + submit → API call with correct payload**
2. **Preliminary form: fill + submit → API call with correct payload**
3. **Form cancel → navigates back without API call**
4. **Pre-filled from Action Queue → entity/incident locked**
5. **Direct navigation → entity/incident editable**
6. **Offline guard shows download prompt when data missing**

### Task 5.5: Visual Regression Tests

Take screenshots before and after each phase for visual comparison:

| Page | URL | Viewport |
|------|-----|----------|
| Health form (clean) | `/assessor/rapid-assessments/new?type=HEALTH` | 1920x1080, 375x812 |
| Food form (clean) | `/assessor/rapid-assessments/new?type=FOOD` | 1920x1080 |
| Population form | `/assessor/rapid-assessments/new?type=POPULATION` | 1920x1080 |
| WASH form | `/assessor/rapid-assessments/new?type=WASH` | 1920x1080 |
| Shelter form | `/assessor/rapid-assessments/new?type=SHELTER` | 1920x1080 |
| Security form | `/assessor/rapid-assessments/new?type=SECURITY` | 1920x1080 |
| Preliminary form | `/assessor/preliminary-assessment/new` | 1920x1080, 375x812 |

---

## Execution Order & Time Estimates

```
Day 1-2: Phase 1 — P0 Critical Fixes
  Task 1.1: Suppress gap alerts (2h × 6 forms = 12h)
  Task 1.2: Fix Preliminary hardcoded data (2h)
  → Validate: Open all 7 forms, verify no false alerts

Day 3-4: Phase 1 continued
  Task 1.3: Unify Preliminary form (8h — large refactor)
  → Validate: Preliminary form matches rapid form architecture

Day 5-6: Phase 2 — Design System Conformance
  Task 2.1: Replace raw <select> (1h)
  Task 2.2: Improve checkbox gap pattern (3h × 6 = 18h — can parallelize)
  → Validate: All forms use design system components

Day 7: Phase 3 — Accessibility & Validation
  Task 3.1: Add fieldset/legend (3h)
  Task 3.2: Fix alert semantics (2h)
  Task 3.3: Add cross-field validation (4h)
  Task 3.4: Fix WASH population (1h)
  → Validate: Submit forms with edge-case data, keyboard navigate

Day 8: Phase 4 — UX Enhancements
  Task 4.1: Form progress indicator (3h)
  Task 4.2: Pre-fill/lock from Action Queue (2h)
  Task 4.3: Add data-testid (2h)
  Task 4.4: Remove console.log (1h)
  Task 4.5: Fix card nesting (1h)
  Task 4.6: Replace form.watch (1h)
  → Validate: Verify all enhancements

Day 9-10: Phase 5 — Testing
  Task 5.1: Component rendering tests (4h)
  Task 5.2: Validation tests (2h)
  Task 5.3: Accessibility tests (3h)
  Task 5.4: Integration tests (3h)
  Task 5.5: Visual regression (2h)
  → Validate: All tests pass

Day 11: Final regression
  Full workflow test as all 5 roles
  `npm run build` succeeds
  `npx tsc --noEmit` passes
```

---

## Success Criteria

After all phases are complete:

- [ ] No gap/risk alerts appear on any form's initial load
- [ ] Preliminary form fetches real incident data from API
- [ ] Preliminary form uses `<FormField>` + `<FormMessage>` + `MediaField` (matches rapid forms)
- [ ] Health form facility type uses Shadcn/ui Select (not raw `<select>`)
- [ ] All boolean fields show neutral styling until user interacts
- [ ] All checkbox groups have fieldset/legend accessibility
- [ ] All required fields have `aria-required`
- [ ] Gap indicators use `role="status"` not `role="alert"` (or `variant="destructive"`)
- [ ] Cross-field validation catches contradictory data in Food, WASH, Shelter forms
- [ ] WASH form does not use hardcoded population estimate
- [ ] Forms show progress indicator (required field completion)
- [ ] Entity/incident are locked when navigating from Action Queue
- [ ] All forms have consistent `data-testid` attributes
- [ ] Zero `console.log` statements in production form code
- [ ] No Card-inside-Card nesting
- [ ] `form.watch()` replaced with `useWatch()` for performance
- [ ] All component rendering tests pass
- [ ] All cross-field validation tests pass
- [ ] All accessibility tests pass
- [ ] `npm run build` succeeds with zero errors
- [ ] `npx tsc --noEmit` passes

---

## Relationship to Existing Plans

| This Plan Task | ux-remediation-plan.md Task | Relationship |
|---|---|---|
| 2.1 Replace raw `<select>` | 4.2 Replace native HTML elements | Overlap — this plan is specific to Health form |
| 3.1 Add fieldset/legend | 5.3 Add ARIA to navigation | Complementary — different components |
| 3.2 Fix alert semantics | (New finding) | Unique to this audit |
| 4.4 Remove console.log | 2.5 Remove dev artifacts | Overlap — coordinate to avoid duplicate work |
| 4.6 Replace form.watch | (Not in existing plan) | Unique to this audit |

**Recommendation:** Execute this plan independently. The `ux-remediation-plan.md` is already marked COMPLETED (2026-05-22). This plan addresses assessment-form-specific findings that were out of scope of the broader UX remediation.

---

## Implementation Status

| Phase | Status | Date |
|-------|--------|------|
| Phase 1: P0 Critical | COMPLETED | 2026-06-02 |
| Phase 2: Design System | COMPLETED | 2026-06-02 |
| Phase 3: Accessibility & Validation | COMPLETED | 2026-06-02 |
| Phase 4: UX Enhancements | PARTIAL (4.1, 4.2, 4.3 deferred) | 2026-06-02 |
| Phase 5: Testing | NOT STARTED | — |

### Completed Tasks
- 1.1: Suppress gap/risk alerts until user interaction (all 6 rapid forms)
- 1.2: Fix Preliminary hardcoded incident data
- 1.3: Unify Preliminary form (MediaField + FormActionBar + real incidents)
- 2.1: Replace raw `<select>` with Shadcn/ui Select (Health)
- 2.2: Improve checkbox gap pattern (all 6 rapid forms)
- 2.3: Covered by 1.3
- 2.4: Covered by 1.3
- 2.5: Covered by 1.3
- 3.1: Add fieldset/legend and aria-required to checkbox groups
- 3.2: Fix destructive alert semantics for gap info
- 3.3: Add cross-field validation to Food, WASH, Shelter forms
- 3.4: Fix WASH hardcoded population estimate
- 4.4: Remove all console.log statements
- 4.5: Fix Card-inside-Card nesting (all 6 rapid forms)
- 4.6: Replace form.watch() with useWatch() (all 6 rapid forms)

### Deferred Tasks
- 4.1: Form progress indicator (enhancement, not blocking)
- 4.2: Pre-fill/lock from Action Queue (requires host page changes)
- 4.3: data-testid attributes (can be added incrementally)
- Phase 5: Systematic tests (should be done in a separate test-focused session)

### Validation Results
- `npx tsc --noEmit`: PASSED (zero errors)
- `npm run build`: Pre-existing `ignore-loader` issue (not related to form changes)
- Visual check (Health form): PASSED — no gap badges, no destructive alerts, Shadcn Select renders, fieldset grouping works, no Card-in-Card nesting
