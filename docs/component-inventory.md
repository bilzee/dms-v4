# Disaster Response Management System -- Component Inventory

**Last updated:** 2026-05-24

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design System -- shadcn/ui Base Components](#2-design-system----shadcnui-base-components)
3. [Component Categories](#3-component-categories)
4. [Page Routes](#4-page-routes)
5. [Reusable vs. Domain Components](#5-reusable-vs-domain-components)
6. [Component Patterns](#6-component-patterns)

---

## 1. Overview

The Disaster Response Management System (DRMS) frontend is built on a layered React component architecture. Components are organized by functional domain, ranging from low-level design system primitives to complex domain-specific dashboard assemblies.

### Statistics Summary

| Metric                          | Count |
|---------------------------------|-------|
| Total component files           | 193   |
| Component categories            | 17    |
| shadcn/ui design system files   | 29    |
| Application component files     | 164   |
| Page route files                | 59    |
| Role groups (route groups)      | 6     |
| Design system utility files     | 4     |

### Component Distribution by Category

| Category          | Files | Description                                |
|-------------------|-------|--------------------------------------------|
| ui/               | 29    | shadcn/ui design system primitives         |
| dashboards/       | 41    | Dashboard assemblies and sub-components    |
| donor/            | 20    | Donor portal components                    |
| forms/            | 18    | Domain-specific form components            |
| shared/           | 32    | Cross-cutting reusable components          |
| verification/     | 12    | Verification and approval system           |
| coordinator/      | 5     | Coordinator tooling components             |
| auth/             | 3     | Authentication form components             |
| layouts/          | 4     | Application shell and navigation           |
| providers/        | 4     | React context providers                    |
| response/         | 3     | Response planning components               |
| delivery/         | 2     | Delivery and offline sync                  |
| reports/          | 4     | Report builder components                  |
| settings/         | 2     | Configuration table components             |
| offline/          | 1     | Offline guard component                    |
| pwa/              | 1     | PWA install prompt                         |
| testing/          | 1     | Living documentation dashboard             |

---

## 2. Design System -- shadcn/ui Base Components

All primitive UI elements are provided by **shadcn/ui**, a copy-paste component library built on top of Radix UI primitives and styled with Tailwind CSS. These components live under `src/components/ui/` and form the visual foundation for every application component.

### Component Listing

| Component          | File                          | Purpose                                           |
|--------------------|-------------------------------|---------------------------------------------------|
| Alert              | `alert.tsx`                   | Contextual feedback messages                      |
| AlertDialog        | `alert-dialog.tsx`            | Modal confirmation dialogs                        |
| Avatar             | `avatar.tsx`                  | User profile image display                        |
| Badge              | `badge.tsx`                   | Status labels, role indicators, counts            |
| Button             | `button.tsx`                  | Primary interaction element with variants         |
| Calendar           | `calendar.tsx`                | Date picker calendar grid                         |
| Card               | `card.tsx`                    | Content container with header/body/footer         |
| Checkbox           | `checkbox.tsx`                | Boolean selection control                         |
| Command            | `command.tsx`                 | Searchable command palette (cmdk)                 |
| Dialog             | `dialog.tsx`                  | Accessible modal overlay                          |
| DropdownMenu       | `dropdown-menu.tsx`           | Context menus and action menus                    |
| Form               | `form.tsx`                    | React Hook Form integration wrapper               |
| Input              | `input.tsx`                   | Text input field                                  |
| Label              | `label.tsx`                   | Accessible form field label                       |
| Pagination         | `pagination.tsx`              | Page navigation controls                          |
| Popover            | `popover.tsx`                 | Floating content panel                            |
| Progress           | `progress.tsx`                | Linear progress indicator                         |
| RadioGroup         | `radio-group.tsx`             | Single-selection radio buttons                    |
| ScrollArea         | `scroll-area.tsx`             | Custom scrollbar container                        |
| Select             | `select.tsx`                  | Dropdown selection control                        |
| Separator          | `separator.tsx`               | Visual divider line                               |
| Skeleton           | `skeleton.tsx`                | Loading state placeholder                         |
| Slider             | `slider.tsx`                  | Range input control                               |
| Switch             | `switch.tsx`                  | Toggle switch control                             |
| Table              | `table.tsx`                   | Data table layout primitives                      |
| Tabs               | `tabs.tsx`                    | Tabbed content navigation                         |
| Textarea           | `textarea.tsx`                | Multi-line text input                             |
| Toast              | `toast.tsx`                   | Notification toasts with Sonner integration       |
| Tooltip            | `tooltip.tsx`                 | Hover information overlay                         |

**Customization note:** shadcn/ui components are copied into the project rather than installed as a dependency. They can be modified directly to match the DRMS design system requirements. All components support dark/light theming through CSS custom properties and the ThemeProvider.

---

## 3. Component Categories

### 3.1 auth/ (3 files) -- Authentication Forms

Authentication-related form components for user login, registration, and account management.

| Component         | File                   | Description                                      |
|-------------------|------------------------|--------------------------------------------------|
| LoginForm         | `LoginForm.tsx`        | Email/password login form with validation         |
| RegisterForm      | `RegisterForm.tsx`     | New user registration form with role selection    |
| EditUserForm      | `EditUserForm.tsx`     | Admin form for editing existing user accounts     |

---

### 3.2 layouts/ (4 files) -- Application Shell

Core layout components that define the application's structural frame, navigation, and layout wrappers.

| Component         | File                   | Description                                        |
|-------------------|------------------------|----------------------------------------------------|
| AppShell          | `AppShell.tsx`         | Main application wrapper; renders nav + content    |
| Navigation        | `Navigation.tsx`       | Primary sidebar/top navigation with role-based links|
| RoleSwitcher      | `RoleSwitcher.tsx`     | Dropdown for switching active user role            |
| OfflineLayout     | `OfflineLayout.tsx`    | Layout wrapper that adds offline-aware behavior    |

---

### 3.3 providers/ (4 files) -- Context Providers

React context providers that supply global state to the component tree. These are rendered at the application root level.

| Component         | File                   | Description                                          |
|-------------------|------------------------|------------------------------------------------------|
| AuthProvider      | `AuthProvider.tsx`     | Authentication state context (session, user, tokens) |
| AuthInitializer   | `AuthInitializer.tsx`  | Bootstrap component for auth state on app load       |
| ThemeProvider     | `ThemeProvider.tsx`    | Dark/light theme context via next-themes             |
| QueryProvider     | `QueryProvider.tsx`    | TanStack React Query provider for server state       |

---

### 3.4 dashboards/ (41 files) -- Dashboard Components

The largest component category, organized into sub-directories by dashboard domain. These components render the analytical and operational views of the system.

#### dashboards/admin/ (1 file)

| Component              | File                        | Description                                  |
|------------------------|-----------------------------|----------------------------------------------|
| AuditLogDashboard      | `AuditLogDashboard.tsx`     | System audit log viewer with filtering       |

#### dashboards/crisis/ (9 files)

| Component                    | File                              | Description                                       |
|------------------------------|-----------------------------------|---------------------------------------------------|
| ConflictSummary              | `ConflictSummary.tsx`             | Summary view of data conflicts                    |
| ConflictLog                  | `ConflictLog.tsx`                 | Detailed conflict history log                     |
| ConflictExportDialog         | `ConflictExportDialog.tsx`        | Dialog for exporting conflict data                |
| ResponseVerificationQueue    | `ResponseVerificationQueue.tsx`   | Queue of responses awaiting verification          |
| ResourceManagement           | `ResourceManagement.tsx`          | Resource allocation and tracking panel            |
| ResourceGapAnalysis          | `ResourceGapAnalysis.tsx`         | Gap analysis between needs and resources          |
| DonorMetricsDashboard        | `DonorMetricsDashboard.tsx`       | Donor performance metrics and analytics           |
| VerifiedBadge                | `VerifiedBadge.tsx`               | Badge indicator for verified status               |
| VerificationQueueManagement  | `VerificationQueueManagement.tsx` | Management interface for verification queues      |

#### dashboards/situation/ (6 files)

| Component                  | File                              | Description                                        |
|----------------------------|-----------------------------------|----------------------------------------------------|
| EntityAssessmentPanel      | `EntityAssessmentPanel.tsx`       | Panel displaying entity assessment details          |
| PanelResizer               | `PanelResizer.tsx`                | Drag handle for resizable dashboard panels          |
| InteractiveMap             | `InteractiveMap.tsx`              | Leaflet-based interactive map with entity markers   |
| IncidentOverviewPanel      | `IncidentOverviewPanel.tsx`       | Summary panel for active incidents                  |
| SituationDashboardLayout   | `SituationDashboardLayout.tsx`    | Three-panel dashboard layout orchestrator           |
| ResponsivePanelWrapper     | `ResponsivePanelWrapper.tsx`      | Responsive container for panel content              |

#### dashboards/situation/components/ (15 files)

| Component                     | File                                    | Description                                        |
|-------------------------------|-----------------------------------------|----------------------------------------------------|
| AdvancedFilters               | `AdvancedFilters.tsx`                   | Multi-criteria filter panel for dashboard data      |
| DonorOverlayControl           | `DonorOverlayControl.tsx`               | Toggle controls for donor data on map overlay       |
| AssessmentCategorySummary     | `AssessmentCategorySummary.tsx`         | Summary cards per assessment category               |
| AggregateMetrics              | `AggregateMetrics.tsx`                  | Aggregated statistical metrics display              |
| AggregationInfoPopup          | `AggregationInfoPopup.tsx`              | Popup explaining aggregation methodology            |
| EntityMarker                  | `EntityMarker.tsx`                      | Map marker component for entity locations           |
| EntitySelector                | `EntitySelector.tsx`                    | Dropdown selector for entity filtering              |
| GapIndicator                  | `GapIndicator.tsx`                      | Visual indicator for resource gap severity          |
| GapAnalysisSummary            | `GapAnalysisSummary.tsx`                | Summary view of gap analysis results                |
| IncidentSummary               | `IncidentSummary.tsx`                   | Compact incident summary card                       |
| IncidentSelector              | `IncidentSelector.tsx`                  | Dropdown selector for incident filtering            |
| IndividualEntityGapInfoPopup  | `IndividualEntityGapInfoPopup.tsx`      | Popup with gap details for a single entity          |
| IncidentsOverview             | `IncidentsOverview.tsx`                 | Overview list of all active incidents               |
| OfflineTileLayer              | `OfflineTileLayer.tsx`                  | Map tile layer with offline caching support         |
| TopDonorsSection              | `TopDonorsSection.tsx`                  | Display of top-performing donors                    |
| PopulationImpact              | `PopulationImpact.tsx`                  | Population impact statistics display                |
| PreliminaryImpact             | `PreliminaryImpact.tsx`                 | Preliminary impact assessment visualization         |

#### dashboards/situation/executive/ (3 files)

| Component                | File                                | Description                                        |
|--------------------------|-------------------------------------|----------------------------------------------------|
| ExecutiveIncidentsTable  | `ExecutiveIncidentsTable.tsx`       | Condensed incidents table for executive view        |
| CompactAssessmentTile    | `CompactAssessmentTile.tsx`         | Space-efficient assessment summary tile             |
| GroupedImpactSummary     | `GroupedImpactSummary.tsx`          | Impact summary grouped by category                  |

#### dashboards/situation/layouts/ (2 files)

| Component                | File                                | Description                                        |
|--------------------------|-------------------------------------|----------------------------------------------------|
| CoordinatorPanelLayout   | `CoordinatorPanelLayout.tsx`        | Panel layout optimized for coordinator role         |
| ExecutivePanelLayout     | `ExecutivePanelLayout.tsx`          | Panel layout optimized for executive/donor role     |

#### dashboards/situation/shared/ (1 file)

| Component    | File                | Description                       |
|--------------|---------------------|-----------------------------------|
| ModeToggle   | `ModeToggle.tsx`    | Dashboard view mode switcher      |

#### dashboards/shared/exports/ (2 files)

| Component      | File                | Description                                    |
|----------------|---------------------|------------------------------------------------|
| ExportModal    | `ExportModal.tsx`   | Modal dialog for configuring data exports      |
| ExportButton   | `ExportButton.tsx`  | Trigger button that opens the export modal     |

---

### 3.5 donor/ (20 files) -- Donor Portal

Components powering the donor-facing portal, including commitment management, performance tracking, gamification, and entity insights.

| Component                 | File                              | Description                                           |
|---------------------------|-----------------------------------|-------------------------------------------------------|
| AchievementNotifications  | `AchievementNotifications.tsx`    | Toast notifications for earned achievements           |
| AssessmentExport          | `AssessmentExport.tsx`            | Export functionality for assessment data              |
| AssessmentViewer          | `AssessmentViewer.tsx`            | Read-only assessment detail viewer                    |
| AssessmentTrends          | `AssessmentTrends.tsx`            | Trend charts for assessment data over time            |
| CommitmentDashboard       | `CommitmentDashboard.tsx`         | Overview of donor commitments and status              |
| CommitmentStatusTracker   | `CommitmentStatusTracker.tsx`     | Progress tracker for individual commitments           |
| CommitmentForm            | `CommitmentForm.tsx`              | Form for creating/editing commitments                 |
| DonorPerformanceDashboard | `DonorPerformanceDashboard.tsx`   | Performance analytics dashboard for donors            |
| DonorDashboard            | `DonorDashboard.tsx`              | Main donor portal landing page                        |
| DonorRegistrationForm     | `DonorRegistrationForm.tsx`       | Registration form for new donor accounts              |
| DonorProfile              | `DonorProfile.tsx`                | Donor profile display and editing                     |
| EntityInsightsHeader      | `EntityInsightsHeader.tsx`        | Header component for entity insight views             |
| EntityInsightsCards       | `EntityInsightsCards.tsx`         | Card-based entity insight data display                |
| EntityDonorAssignment     | `EntityDonorAssignment.tsx`       | Component for assigning donors to entities            |
| GameBadgeSystem           | `GameBadgeSystem.tsx`             | Gamification badge display and progression            |
| EntitySelector            | `EntitySelector.tsx`              | Entity selection dropdown for donor context           |
| ExportButton              | `ExportButton.tsx`                | Export trigger button for donor data                  |
| GapAnalysis               | `GapAnalysis.tsx`                 | Gap analysis visualization for donor view             |
| PeerComparison            | `PeerComparison.tsx`              | Donor comparison against peer metrics                 |
| LeaderboardDisplay        | `LeaderboardDisplay.tsx`          | Leaderboard ranking display with gamification         |

---

### 3.6 forms/ (18 files) -- Domain Forms

Specialized form components for data entry across assessment, delivery, incident, and response workflows. All forms use Zod schemas for validation and React Hook Form for state management.

#### forms/ (root) (2 files)

| Component        | File                   | Description                                      |
|------------------|------------------------|--------------------------------------------------|
| LocationSelector | `LocationSelector.tsx` | Location picker with GPS coordinates support     |
| EntityForm       | `EntityForm.tsx`       | Generic entity create/edit form                  |

#### forms/assessment/ (8 files)

| Component                   | File                                | Description                                        |
|-----------------------------|-------------------------------------|----------------------------------------------------|
| PreliminaryAssessmentForm   | `PreliminaryAssessmentForm.tsx`     | Initial rapid assessment data entry                |
| HealthAssessmentForm        | `HealthAssessmentForm.tsx`          | Health sector-specific assessment form             |
| FoodAssessmentForm          | `FoodAssessmentForm.tsx`            | Food security assessment form                      |
| PopulationAssessmentForm    | `PopulationAssessmentForm.tsx`      | Population demographics assessment form            |
| WASHAssessmentForm          | `WASHAssessmentForm.tsx`            | Water, sanitation, hygiene assessment form         |
| ShelterAssessmentForm       | `ShelterAssessmentForm.tsx`         | Shelter and housing assessment form                |
| SecurityAssessmentForm      | `SecurityAssessmentForm.tsx`        | Security conditions assessment form                |

#### forms/delivery/ (3 files)

| Component                      | File                                    | Description                                      |
|--------------------------------|-----------------------------------------|--------------------------------------------------|
| DeliveryConfirmationForm       | `DeliveryConfirmationForm.tsx`           | Form to confirm aid delivery completion           |
| DeliveryMediaField             | `DeliveryMediaField.tsx`                 | Media upload field for delivery evidence          |
| EnhancedDeliveryMediaCapture   | `EnhancedDeliveryMediaCapture.tsx`       | Advanced media capture with camera integration    |

#### forms/incident/ (1 file)

| Component              | File                          | Description                                  |
|------------------------|-------------------------------|----------------------------------------------|
| IncidentCreationForm   | `IncidentCreationForm.tsx`    | Form for creating new disaster incidents     |

#### forms/response/ (2 files)

| Component                    | File                                | Description                                      |
|------------------------------|-------------------------------------|--------------------------------------------------|
| ResponsePlanningForm         | `ResponsePlanningForm.tsx`          | Form for creating response plans                 |
| DonorCommitmentImportForm    | `DonorCommitmentImportForm.tsx`     | Form for importing donor commitment data         |

---

### 3.7 verification/ (12 files) -- Verification System

Components for the verification workflow, including queue management, auto-approval configuration, status indicators, and analytics.

| Component                      | File                                    | Description                                          |
|--------------------------------|-----------------------------------------|------------------------------------------------------|
| AutoApprovalConfig             | `AutoApprovalConfig.tsx`                | Configuration panel for auto-approval rules          |
| ConnectionStatusIndicator      | `ConnectionStatusIndicator.tsx`         | Online/offline connection status display             |
| ConfigurationAuditHistory      | `ConfigurationAuditHistory.tsx`         | History log of configuration changes                 |
| ConfigurationAnalytics         | `ConfigurationAnalytics.tsx`            | Analytics for auto-approval configuration            |
| EnhancedVerificationDashboard  | `EnhVerificationDashboard.tsx`          | Extended verification dashboard with analytics       |
| EnhancedAutoApprovalConfig     | `EnhancedAutoApprovalConfig.tsx`        | Extended auto-approval with advanced rules           |
| VerificationActions            | `VerificationActions.tsx`               | Action buttons for approve/reject/escalate           |
| StatusIndicator                | `StatusIndicator.tsx`                   | Visual indicator for verification status             |
| QueueFilters                   | `QueueFilters.tsx`                      | Filter controls for the verification queue           |
| VerificationQueue              | `VerificationQueue.tsx`                 | Main verification queue list component               |
| VerificationDashboard          | `VerificationDashboard.tsx`             | Overview dashboard for verification metrics          |
| VerificationAnalytics          | `VerificationAnalytics.tsx`             | Charts and metrics for verification performance      |

---

### 3.8 shared/ (32 files) -- Reusable Components

Cross-cutting reusable components used across multiple domain areas. These components have no domain-specific business logic and can be composed freely.

#### Original Shared Components (17 files)

| Component              | File                          | Description                                          |
|------------------------|-------------------------------|------------------------------------------------------|
| EntitySelector         | `EntitySelector.tsx`          | Universal entity selection dropdown                  |
| EmptyState             | `EmptyState.tsx`              | Placeholder display when no data is available        |
| Breadcrumbs            | `Breadcrumbs.tsx`             | Navigation breadcrumb trail                          |
| GPSCapture             | `GPSCapture.tsx`              | GPS coordinate capture with map integration          |
| FormStateManager       | `FormStateManager.tsx`        | HOC for managing form loading/error/success states   |
| EntitySelectorSkeleton | `EntitySelectorSkeleton.tsx`  | Loading skeleton for entity selector                 |
| LocationSelector       | `LocationSelector.tsx`        | Location picker with address/coordinate input        |
| IncidentSelector       | `IncidentSelector.tsx`        | Incident selection dropdown                          |
| Header                 | `Header.tsx`                  | Page header component with title and actions         |
| MediaField             | `MediaField.tsx`              | File upload field with preview                       |
| MultipleEntitySelector | `MultipleEntitySelector.tsx`  | Multi-select entity picker                           |
| OfflineIndicator       | `OfflineIndicator.tsx`        | Visual indicator for offline mode                    |
| SyncIndicator          | `SyncIndicator.tsx`           | Synchronization status indicator                     |
| SafeDataLoader         | `SafeDataLoader.tsx`          | Error-boundary-wrapped data loading component        |
| RoleBasedRoute         | `RoleBasedRoute.tsx`          | Route guard that checks user role permissions        |
| ThemeToggle            | `ThemeToggle.tsx`             | Dark/light theme switch button                       |
| SyncQueue              | `SyncQueue.tsx`               | Display of pending offline sync operations           |

#### Design System Shared Components (15 files)

These components were introduced as part of the design system unification effort, providing standardized patterns for loading states, error handling, filtering, data display, and form layout.

| Component              | File                          | Description                                          |
|------------------------|-------------------------------|------------------------------------------------------|
| ContentSkeleton        | `ContentSkeleton.tsx`         | Loading state skeleton presets (card, table, list, metric, form) |
| ErrorAlert             | `ErrorAlert.tsx`              | Error display component with title, message, and retry button |
| FilterBar              | `FilterBar.tsx`               | Active filter chips display with clear functionality |
| FilterPanel            | `FilterPanel.tsx`             | Collapsible filter configuration panel               |
| FormActionBar          | `FormActionBar.tsx`           | Form action bar with submit/cancel buttons, loading state |
| FormCard               | `FormCard.tsx`                | Standardized form container with title, description, column layout |
| ProgressBar            | `ProgressBar.tsx`             | Progress indicator with 5 variants and 3 sizes, dark mode support |
| StatCard               | `StatCard.tsx`                | Metric display card with 4 variants and trend indicators |
| StatCardGrid           | `StatCardGrid.tsx`            | Responsive grid layout for StatCard components       |
| StatusBadge            | `StatusBadge.tsx`             | Domain-aware status indicator with centralized color mapping |
| DataCardList           | `DataCardList.tsx`            | Card list layout component with selection            |
| DataCardGrid           | `DataCardGrid.tsx`            | Responsive card grid layout component                |
| DataTable              | `DataTable.tsx`               | Data table with sorting, filtering, pagination       |
| DataList               | `DataList.tsx`                | Generic data list component with selection support   |
| SearchToolbar          | `SearchToolbar.tsx`           | Search input toolbar with debounce and clear support |

---

### 3.9 coordinator/ (5 files) -- Coordinator Tools

Components specific to the coordinator operational role, providing tools for assessment review, incident management, and entity assignment.

| Component                | File                              | Description                                        |
|--------------------------|-----------------------------------|----------------------------------------------------|
| AssessmentRelationshipMap| `AssessmentRelationshipMap.tsx`   | Visual map of assessment-to-entity relationships   |
| IncidentManagement       | `IncidentManagement.tsx`          | CRUD interface for incident records                 |
| EntityAssignmentForm     | `EntityAssignmentForm.tsx`        | Form for assigning entities to incidents/assessors  |
| AssessmentTimeline       | `AssessmentTimeline.tsx`          | Timeline view of assessment history and status      |
| PriorityInfoPopup        | `PriorityInfoPopup.tsx`           | Popup displaying priority calculation details       |

---

### 3.10 response/ (3 files) -- Response Planning

Components for the response planning and execution workflow.

| Component                  | File                                | Description                                        |
|----------------------------|-------------------------------------|----------------------------------------------------|
| CollaborationStatus        | `CollaborationStatus.tsx`           | Status display for multi-stakeholder collaboration |
| ResponsePlanningDashboard  | `ResponsePlanningDashboard.tsx`     | Dashboard for managing response plans              |
| AssessmentSelector         | `AssessmentSelector.tsx`            | Selector for linking assessments to responses      |

---

### 3.11 reports/ (4 files) -- Report Builder

Components for the custom report builder feature, allowing users to configure data sources, select templates, and generate reports.

| Component               | File                                  | Description                                       |
|-------------------------|---------------------------------------|---------------------------------------------------|
| ReportManagement        | `ReportManagement.tsx`                | Report listing and management interface            |
| DataSourceConfigurator  | `builder/DataSourceConfigurator.tsx`  | Configuration panel for report data sources        |
| TemplateSelector        | `builder/TemplateSelector.tsx`        | Report template selection component                |
| ReportBuilder           | `builder/ReportBuilder.tsx`           | Main report builder assembly component             |

---

### 3.12 delivery/ (2 files) -- Delivery and Sync

Components for delivery tracking and offline synchronization status.

| Component             | File                        | Description                                       |
|-----------------------|-----------------------------|---------------------------------------------------|
| OfflineSyncStatus     | `OfflineSyncStatus.tsx`     | Status bar showing sync state and pending items   |
| OfflineSyncDashboard  | `OfflineSyncDashboard.tsx`  | Full dashboard for offline sync queue management  |

---

### 3.13 settings/ (2 files) -- Configuration

Administrative settings components for configuring gap analysis parameters.

| Component               | File                          | Description                                          |
|-------------------------|-------------------------------|------------------------------------------------------|
| SeverityThresholdTable  | `SeverityThresholdTable.tsx`  | Editable table for severity threshold configuration  |
| GapFieldTable           | `GapFieldTable.tsx`           | Editable table for gap field definitions             |

---

### 3.14 offline/ (1 file) -- Offline Support

| Component     | File                | Description                                           |
|---------------|---------------------|-------------------------------------------------------|
| OfflineGuard  | `OfflineGuard.tsx`  | Wrapper that prevents actions requiring connectivity  |

---

### 3.15 pwa/ (1 file) -- PWA

| Component      | File                | Description                                      |
|----------------|---------------------|--------------------------------------------------|
| InstallPrompt  | `InstallPrompt.tsx` | Prompt to install the app as a PWA on device     |

---

### 3.16 testing/ (1 file) -- Testing

| Component                      | File                                      | Description                                      |
|--------------------------------|-------------------------------------------|--------------------------------------------------|
| LivingDocumentationDashboard   | `living-documentation-dashboard.tsx`      | Dashboard displaying living test documentation   |

---

### 3.17 Design System Utilities (4 files)

Utility modules that support the design system shared components with centralized configuration, color mapping, and chart defaults. These live under `src/lib/utils/`.

| Utility              | File                        | Description                                                |
|----------------------|-----------------------------|------------------------------------------------------------|
| status-colors        | `status-colors.ts`          | Centralized status-to-color mapping for all domain statuses |
| design-tokens        | `design-tokens.ts`          | Design token constants (spacing, typography, shadows)      |
| chart-config         | `chart-config.ts`           | Chart.js centralized color palette and default options     |
| chart-registration   | `chart-registration.ts`     | Single-point Chart.js module registration                  |

---

## 4. Page Routes

The application uses Next.js App Router with route groups for role-based access control. All authenticated routes are nested under `(auth)/` and further grouped by user role.

### 4.1 Public Routes (3 pages)

| Route                      | Page File                   | Description                           |
|----------------------------|-----------------------------|---------------------------------------|
| `/`                        | `src/app/page.tsx`          | Landing page / redirect               |
| `/login`                   | `src/app/login/page.tsx`    | Login page                            |
| `/register`                | `src/app/register/page.tsx` | Registration page                     |

### 4.2 Admin Routes (7 pages)

All under `src/app/(auth)/admin/`

| Route                      | Page File                       | Description                           |
|----------------------------|---------------------------------|---------------------------------------|
| `/admin/dashboard`         | `dashboard/page.tsx`            | Admin dashboard                       |
| `/admin/donors`            | `donors/page.tsx`               | Donor list                            |
| `/admin/donors/register`   | `donors/register/page.tsx`      | Register new donor                    |
| `/admin/donors/metrics`    | `donors/metrics/page.tsx`       | Donor metrics                         |
| `/admin/donors/[id]`       | `donors/[id]/page.tsx`          | Donor detail view                     |
| `/admin/donors/[id]/edit`  | `donors/[id]/edit/page.tsx`     | Edit donor                            |
| `/admin/users`             | `users/page.tsx`                | User management                       |

### 4.3 Assessor Routes (8 pages)

All under `src/app/(auth)/assessor/`

| Route                                    | Page File                                    | Description                           |
|------------------------------------------|----------------------------------------------|---------------------------------------|
| `/assessor/dashboard`                    | `dashboard/page.tsx`                         | Assessor dashboard                    |
| `/assessor/preliminary-assessment`       | `preliminary-assessment/page.tsx`            | Preliminary assessment list           |
| `/assessor/preliminary-assessment/new`   | `preliminary-assessment/new/page.tsx`        | New preliminary assessment            |
| `/assessor/preliminary-assessment/[id]`  | `preliminary-assessment/[id]/page.tsx`       | View preliminary assessment           |
| `/assessor/rapid-assessments`            | `rapid-assessments/page.tsx`                 | Rapid assessments list                |
| `/assessor/rapid-assessments/new`        | `rapid-assessments/new/page.tsx`             | New rapid assessment                  |
| `/assessor/rapid-assessments/[id]`       | `rapid-assessments/[id]/page.tsx`            | View rapid assessment                 |
| `/assessor/rapid-assessments/[id]/edit`  | `rapid-assessments/[id]/edit/page.tsx`       | Edit rapid assessment                 |

### 4.4 Coordinator Routes (17 pages)

All under `src/app/(auth)/coordinator/`

| Route                                              | Page File                                           | Description                           |
|----------------------------------------------------|-----------------------------------------------------|---------------------------------------|
| `/coordinator/dashboard`                           | `dashboard/page.tsx`                                | Coordinator dashboard                 |
| `/coordinator/situation-dashboard`                 | `situation-dashboard/page.tsx`                      | Situation awareness dashboard         |
| `/coordinator/incidents`                           | `incidents/page.tsx`                                | Incident list                         |
| `/coordinator/incidents/[id]`                      | `incidents/[id]/page.tsx`                           | Incident detail view                  |
| `/coordinator/entities`                            | `entities/page.tsx`                                 | Entity list                           |
| `/coordinator/entity-management`                   | `entity-management/page.tsx`                        | Entity CRUD management                |
| `/coordinator/entity-incident-map`                 | `entity-incident-map/page.tsx`                      | Entity-incident map view              |
| `/coordinator/donors`                              | `donors/page.tsx`                                   | Donor list                            |
| `/coordinator/donors/metrics`                      | `donors/metrics/page.tsx`                           | Donor metrics                         |
| `/coordinator/verification`                        | `verification/page.tsx`                             | Verification queue                    |
| `/coordinator/verification/auto-approval`          | `verification/auto-approval/page.tsx`               | Auto-approval configuration           |
| `/coordinator/verification/deliveries`             | `verification/deliveries/page.tsx`                  | Delivery verification                 |
| `/coordinator/auto-approval`                       | `auto-approval/page.tsx`                            | Auto-approval (legacy route)          |
| `/coordinator/resource-management`                 | `resource-management/page.tsx`                      | Resource management panel             |
| `/coordinator/settings/gap-field-management`       | `settings/gap-field-management/page.tsx`            | Gap field configuration               |
| `/coordinator/settings/severity-thresholds`        | `settings/severity-thresholds/page.tsx`             | Severity threshold configuration      |

### 4.5 Donor Routes (11 pages)

All under `src/app/(auth)/donor/`

| Route                              | Page File                           | Description                           |
|------------------------------------|-------------------------------------|---------------------------------------|
| `/donor/dashboard`                 | `dashboard/page.tsx`                | Donor dashboard                       |
| `/donor/analytics`                 | `analytics/page.tsx`                | Analytics view                        |
| `/donor/entities`                  | `entities/page.tsx`                 | Entity list                           |
| `/donor/entities/[id]`             | `entities/[id]/page.tsx`            | Entity detail view                    |
| `/donor/entities/performance`      | `entities/performance/page.tsx`     | Entity performance metrics            |
| `/donor/leaderboard`               | `leaderboard/page.tsx`              | Donor leaderboard                     |
| `/donor/performance`               | `performance/page.tsx`              | Performance overview                  |
| `/donor/profile`                   | `profile/page.tsx`                  | Profile management                    |
| `/donor/reports`                   | `reports/page.tsx`                  | Report access                         |
| `/donor/responses`                 | `responses/page.tsx`                | Response commitments                  |
| `/donor/rapid-assessments`         | `rapid-assessments/page.tsx`        | Assessment viewer                     |

### 4.6 Responder Routes (7 pages)

All under `src/app/(auth)/responder/`

| Route                              | Page File                           | Description                           |
|------------------------------------|-------------------------------------|---------------------------------------|
| `/responder/dashboard`             | `dashboard/page.tsx`                | Responder dashboard                   |
| `/responder/planning`              | `planning/page.tsx`                 | Response plans list                   |
| `/responder/planning/new`          | `planning/new/page.tsx`             | Create new response plan              |
| `/responder/responses`             | `responses/page.tsx`                | Response list                         |
| `/responder/responses/[id]`        | `responses/[id]/page.tsx`           | Response detail view                  |
| `/responder/responses/[id]/edit`   | `responses/[id]/edit/page.tsx`      | Edit response                         |
| `/responder/responses/[id]/deliver`| `responses/[id]/deliver/page.tsx`   | Delivery confirmation                 |

### 4.7 System Routes (5 pages)

All under `src/app/(auth)/system/`

| Route                        | Page File                      | Description                           |
|------------------------------|--------------------------------|---------------------------------------|
| `/system/audit`              | `audit/page.tsx`               | System audit log                      |
| `/system/database`           | `database/page.tsx`            | Database management                   |
| `/system/settings`           | `settings/page.tsx`            | System settings                       |

Additional shared authenticated routes:

| Route                  | Page File                         | Description                           |
|------------------------|-----------------------------------|---------------------------------------|
| `/dashboard`           | `(auth)/dashboard/page.tsx`       | Role-redirecting dashboard            |
| `/roles`               | `(auth)/roles/page.tsx`           | Role selection page                   |

### 4.8 Other Public Routes

| Route                        | Page File                         | Description                           |
|------------------------------|-----------------------------------|---------------------------------------|
| `/profile`                   | `profile/page.tsx`                | User profile (outside role groups)    |
| `/rapid-assessments`         | `rapid-assessments/page.tsx`      | Public assessment list                |
| `/rapid-assessments/new`     | `rapid-assessments/new/page.tsx`  | New assessment (public)               |
| `/verification/metrics`      | `verification/metrics/page.tsx`   | Verification metrics (public)         |

---

## 5. Reusable vs. Domain Components

### Reusable Components (54 files)

Reusable components are designed for use across multiple feature areas. They contain minimal business logic and accept configuration through props.

**Design System Primitives (29 files):** All `src/components/ui/*` components.

**Cross-Cutting Shared (32 files):** All `src/components/shared/*` components (17 original + 15 design system additions).

**Design System Utilities (4 files):** `src/lib/utils/status-colors.ts`, `design-tokens.ts`, `chart-config.ts`, and `chart-registration.ts`.

**Export Utilities (2 files):** `src/components/dashboards/shared/exports/ExportModal.tsx` and `ExportButton.tsx`.

**Layout Primitives (4 files):** All `src/components/layouts/*` components.

**Infrastructure (7 files):** All `src/components/providers/*` (4) plus `offline/OfflineGuard.tsx`, `pwa/InstallPrompt.tsx`, and `testing/living-documentation-dashboard.tsx`.

### Domain Components (118 files)

Domain components are scoped to specific feature areas and contain business logic, API calls, and domain-specific data transformations.

| Domain         | Files | Key Features                                           |
|----------------|-------|--------------------------------------------------------|
| dashboards/    | 41    | Situation awareness, crisis management, admin audit    |
| donor/         | 20    | Portal, commitments, gamification, entity insights     |
| forms/         | 18    | Assessment, delivery, incident, response data entry    |
| verification/  | 12    | Queue management, auto-approval, status, analytics     |
| coordinator/   | 5     | Assessment review, incident management, assignments    |
| response/      | 3     | Planning dashboard, collaboration, assessment linking  |
| reports/       | 4     | Report builder, data source config, template selection |
| delivery/      | 2     | Offline sync status and dashboard                      |
| settings/      | 2     | Gap field and severity threshold configuration         |
| auth/          | 3     | Login, registration, user editing                      |

---

## 6. Component Patterns

### 6.1 Form Validation with Zod

All form components follow a consistent pattern combining Zod schemas with React Hook Form:

- **Schema definition:** Each form defines a Zod schema (often imported from `src/lib/validations/`) that specifies field types, constraints, and error messages.
- **Form binding:** The `useForm` hook from React Hook Form is configured with `zodResolver(schema)` for automatic validation.
- **UI integration:** The shadcn/ui `Form`, `FormField`, `FormItem`, `FormLabel`, and `FormMessage` components provide consistent form structure and error display.
- **Server validation:** Form submissions validate client-side first, then handle server-side validation errors by mapping them back to form fields.

This pattern is used across all 18 form components in `src/components/forms/`, the 3 auth forms, and domain-specific forms like `CommitmentForm` and `DonorRegistrationForm`.

### 6.2 Role-Based Rendering

The application enforces role-based access control at multiple levels:

- **Route-level protection:** The `RoleBasedRoute` component in `shared/` wraps page content and redirects unauthorized users. Next.js route groups `(admin/)`, `(assessor/)`, etc. provide an additional structural layer.
- **Navigation filtering:** The `Navigation` component filters menu items based on the user's active role. The `RoleSwitcher` allows users with multiple roles to switch between them.
- **Component-level gating:** Many dashboard and panel components conditionally render features based on the current role. For example, coordinator-specific actions are hidden from donor and responder views.
- **API-level enforcement:** Even when UI elements are hidden, backend API routes independently validate role permissions.

The six defined roles are: Admin, Assessor, Coordinator, Donor, Responder, and System.

### 6.3 Offline Awareness

The system is designed as a Progressive Web App (PWA) with comprehensive offline support:

- **Offline detection:** The `OfflineIndicator` component displays the current connectivity state. The `OfflineLayout` wrapper injects offline awareness into page layouts.
- **Offline guard:** The `OfflineGuard` component prevents users from initiating actions that require network connectivity, displaying an informative message instead.
- **Sync queue:** The `SyncQueue` and `SyncIndicator` components show pending operations that will be synchronized when connectivity is restored. The `OfflineSyncDashboard` provides a full management view.
- **Map tiles:** The `OfflineTileLayer` component caches map tiles locally for offline map viewing.
- **Data caching:** TanStack React Query, configured through `QueryProvider`, is set up with stale-while-revalidate strategies to serve cached data when offline.

### 6.4 Dashboard Layout Pattern

The dashboard system uses a composable panel architecture:

- **Three-panel layout:** The `SituationDashboardLayout` arranges three resizable panels (incident overview, entity assessment, gap analysis) managed by `PanelResizer`.
- **Role-specific layouts:** `CoordinatorPanelLayout` and `ExecutivePanelLayout` provide tailored arrangements for different user roles.
- **Responsive behavior:** The `ResponsivePanelWrapper` handles panel stacking and collapse on smaller viewports.
- **Shared export:** The `ExportModal` and `ExportButton` components provide a consistent export experience across all dashboards.

### 6.5 Data Loading Pattern

Data fetching follows a consistent pattern using TanStack React Query:

- **Query hooks:** Custom hooks (e.g., `useAssessments`, `useIncidents`) encapsulate query definitions with caching strategies.
- **Loading states:** The `Skeleton` component from shadcn/ui provides loading placeholders. The `EntitySelectorSkeleton` offers domain-specific loading states.
- **Error handling:** The `SafeDataLoader` component wraps data fetching with error boundary behavior.
- **Empty states:** The `EmptyState` component provides a consistent display when no data is available.

### 6.6 Entity Selection Pattern

Entity selection appears across multiple domains and is implemented with varying complexity:

- **Basic:** `shared/EntitySelector.tsx` -- simple single-entity dropdown.
- **Multiple:** `shared/MultipleEntitySelector.tsx` -- multi-entity picker.
- **Context-specific:** `donor/EntitySelector.tsx` and `dashboards/situation/components/EntitySelector.tsx` provide domain-filtered variants.
- **Skeleton loading:** `shared/EntitySelectorSkeleton.tsx` provides the loading state.

### 6.7 Component File Naming Convention

| Convention             | Example                        | Usage                                 |
|------------------------|--------------------------------|---------------------------------------|
| PascalCase             | `AuditLogDashboard.tsx`        | All React component files             |
| kebab-case             | `living-documentation-dashboard.tsx` | Only in the testing directory    |
| Descriptive suffixes   | `*Form`, `*Dashboard`, `*Panel` | Indicates component purpose           |

All component files use the `.tsx` extension. Component directories map to feature domains.

---

*End of component inventory.*
