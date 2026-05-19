# 1. Technical Architecture

## 1.1 Technology Stack

**Core Framework:**
- **Next.js 14** with App Router
  - File-based routing for predictable patterns
  - Server components for optimal performance
  - Built-in API routes for backend integration
  - Excellent PWA support with next-pwa

**State Management:**
- **Zustand** - Lightweight, TypeScript-friendly
  - Offline queue store
  - Sync status store
  - User/role context store
  - Entity assignment store

**UI Components:**
- **Shadcn/ui** - Copy-paste components
  - Consistent design patterns
  - Built on Radix UI primitives
  - Tailwind CSS for styling
  - Fully accessible by default

**Data Layer:**
- **Prisma** - Type-safe database client
- **Dexie.js** - IndexedDB wrapper for offline storage
- **React Query/TanStack Query** - Server state management with offline support

**PWA Infrastructure:**
- **next-pwa** - Service worker generation
- **Workbox** - Advanced caching strategies
- **IndexedDB** via Dexie for offline data

## 1.2 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth-required routes
│   │   ├── assessor/      # Assessor role pages
│   │   ├── coordinator/  # Coordinator role pages
│   │   ├── responder/    # Responder role pages
│   │   ├── donor/        # Donor role pages
│   │   └── admin/        # Admin role pages
│   ├── api/              # API routes
│   └── layout.tsx        # Root layout with PWA setup
├── components/
│   ├── ui/              # Shadcn/ui components
│   ├── forms/           # Assessment/Response forms
│   ├── dashboards/      # Dashboard components
│   └── shared/          # Shared components
├── lib/
│   ├── stores/          # Zustand stores
│   ├── db/              # Dexie database schemas
│   ├── sync/            # Sync engine logic
│   └── utils/           # Utility functions
├── hooks/               # Custom React hooks
└── types/              # TypeScript definitions
```
