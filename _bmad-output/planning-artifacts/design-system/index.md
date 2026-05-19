# Design System Index

## Overview
This design system provides comprehensive UI/UX guidance for the Disaster Management PWA, optimized for LLM-assisted development with efficient context window usage.

## Structure

### 📦 Component Library
Reusable UI components built with Shadcn/ui and Tailwind CSS:

- [**Part 1**](./component-library/dms-component-library-part1.md) - Core components (Button, Card, Form fields)
- [**Part 2**](./component-library/dms-component-library-part2.md) - Advanced components (VerificationQueue, StatusBadge)  
- [**Part 3**](./component-library/dms-component-library-part3.md) - Dashboard components (DashboardCard, Chart components)

### 🏗️ Layout Components
Architectural layout patterns and navigation:

- [**Sections 1-7**](./layout/navigation-layout-sections1-7.md) - AppShell, NavigationSidebar, TopBar, Breadcrumbs
- [**Sections 8-12**](./layout/navigation-layout-sections8-12.md) - TabLayout, Grid systems, Mobile components

### 📱 Wireframes
Visual specifications for key interfaces:

- [**Crisis Management Dashboard**](./wireframes/crisis-management-dashboard-wireframe.md) - Coordinator's main interface
- [**Situation Awareness Dashboard**](./wireframes/situation-awareness-dashboard-wireframe.md) - Monitoring and reporting interface

### 🎨 UX Principles
Technical implementation guidelines and patterns:

- [**Technical Architecture**](./ux-principles/1-technical-architecture.md) - Next.js 14, Zustand, tech stack
- [**User Flows & Navigation**](./ux-principles/2-user-flows-navigation.md) - Role-based routing, auth flows
- [**UI Component Specifications**](./ux-principles/3-ui-component-specifications.md) - Detailed component interfaces
- [**State Management Patterns**](./ux-principles/4-state-management-patterns.md) - Zustand stores, offline patterns
- [**UI/UX Requirements**](./ux-principles/5-uiux-requirements.md) - Design system, accessibility, responsive
- [**Component Implementation Guidelines**](./ux-principles/6-component-implementation-guidelines.md) - Code patterns, examples
- [**PWA Configuration**](./ux-principles/7-pwa-configuration.md) - Service worker, manifest, caching
- [**Testing Strategy**](./ux-principles/8-testing-strategy.md) - Component and E2E testing
- [**Performance Optimization**](./ux-principles/9-performance-optimization.md) - Code splitting, image optimization
- [**Implementation Checklist**](./ux-principles/10-implementation-checklist.md) - Development phases

## Usage Guidelines

### For Development Tasks
1. **Start with UX Principles** - Load relevant technical patterns first
2. **Reference Component Library** - Use existing components before creating new ones
3. **Follow Layout Patterns** - Maintain consistent navigation and structure
4. **Validate Against Wireframes** - Ensure UI matches specifications

### Context Window Optimization
- Each file is optimized for 200k context windows (~1,200-4,200 tokens)
- Load only relevant sections for current task
- Files are self-contained with clear dependencies

### Component Hierarchy
```
AppShell (Layout)
├── NavigationSidebar (Layout)
├── TopBar (Layout)
└── PageContent
    ├── Breadcrumbs (Layout)
    ├── DashboardCard (Component Library)
    ├── VerificationQueue (Component Library)
    └── Form Components (Component Library)
```

## Quick Reference

| Task Type | Load These Files |
|-----------|------------------|
| **New Component** | UX Principles (3,6) + Component Library (relevant part) |
| **Page Layout** | Layout sections + UX Principles (2,3) |
| **Form Implementation** | Component Library (1,2) + UX Principles (6) |
| **Dashboard Creation** | Component Library (3) + Wireframes + UX Principles (3) |
| **PWA Setup** | UX Principles (1,7,9) |
| **Testing Setup** | UX Principles (8) |

## File Size Reference
- **Component Library**: 2,100-2,200 words each (~2,800-3,000 tokens)
- **Layout Components**: 1,700-2,100 words each (~2,300-2,900 tokens)  
- **Wireframes**: 1,400-2,000 words each (~1,900-2,700 tokens)
- **UX Principles**: 50-900 words each (~125-1,200 tokens)

---
*This design system is optimized for LLM-assisted development while maintaining consistency and best practices.*