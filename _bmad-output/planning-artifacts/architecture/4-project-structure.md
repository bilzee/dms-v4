# 4. Project Structure

### 4.1 Directory Organization

```
disaster-management-pwa/
├── prisma/
│   ├── schema.prisma           # Database schema (source of truth)
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Seed data for development
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Protected routes
│   │   │   ├── assessor/      # Assessor role pages
│   │   │   ├── coordinator/   # Coordinator role pages
│   │   │   ├── responder/     # Responder role pages
│   │   │   ├── donor/         # Donor role pages
│   │   │   └── admin/         # Admin role pages
│   │   ├── (public)/          # Public routes
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── api/               # API routes
│   │   │   └── v1/            # API version 1
│   │   │       ├── auth/
│   │   │       ├── assessments/
│   │   │       ├── responses/
│   │   │       ├── verification/
│   │   │       ├── sync/
│   │   │       └── dashboard/
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   │
│   ├── components/
│   │   ├── ui/               # Shadcn/ui components (auto-generated)
│   │   ├── forms/            # Form components
│   │   │   ├── assessment/   # Assessment forms (6 types)
│   │   │   ├── response/     # Response forms
│   │   │   └── fields/       # Reusable field components
│   │   ├── dashboards/       # Dashboard components
│   │   │   ├── crisis/       # Crisis Management Dashboard
│   │   │   ├── situation/    # Situation Awareness Dashboard
│   │   │   └── shared/       # Shared dashboard components
│   │   ├── layouts/          # Layout components
│   │   │   ├── AppShell.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── RoleSwitcher.tsx
│   │   └── shared/           # Shared components
│   │       ├── OfflineIndicator.tsx
│   │       ├── SyncQueue.tsx
│   │       ├── GPSCapture.tsx
│   │       └── MediaUpload.tsx
│   │
│   ├── lib/
│   │   ├── db/              # Database utilities
│   │   │   ├── client.ts    # Prisma client singleton
│   │   │   └── offline.ts   # Dexie.js setup
│   │   ├── auth/            # Authentication utilities
│   │   │   ├── config.ts    # NextAuth configuration
│   │   │   └── middleware.ts # Auth middleware
│   │   ├── sync/            # Sync engine
│   │   │   ├── engine.ts    # Core sync logic
│   │   │   ├── queue.ts     # Queue management
│   │   │   └── conflict.ts  # Conflict resolution
│   │   ├── validation/      # Validation schemas
│   │   │   └── schemas.ts   # Zod schemas
│   │   └── utils/           # Utility functions
│   │       ├── gps.ts
│   │       ├── media.ts
│   │       └── format.ts
│   │
│   ├── stores/              # Zustand stores
│   │   ├── auth.store.ts    # Authentication state
│   │   ├── offline.store.ts # Offline/sync state
│   │   ├── entity.store.ts  # Entity assignment state
│   │   └── ui.store.ts      # UI state (sidebar, modals)
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useOffline.ts
│   │   ├── useSync.ts
│   │   ├── useRole.ts
│   │   └── useGPS.ts
│   │
│   └── types/              # TypeScript definitions
│       ├── entities.ts     # Core entity types
│       ├── api.ts          # API types
│       ├── forms.ts        # Form types
│       └── enums.ts        # Enums
│
├── public/
│   ├── icons/              # PWA icons
│   ├── offline-tiles/      # Cached map tiles
│   └── manifest.json       # PWA manifest
│
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
│
├── .env                   # Environment variables
├── .env.example           # Example environment file
├── next.config.js         # Next.js configuration
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

### 4.2 File Naming Conventions

**Components:**
- PascalCase for component files: `AssessmentForm.tsx`
- Match component name: `export const AssessmentForm`
- Index files for complex components: `AssessmentForm/index.tsx`

**API Routes:**
- Kebab-case for directories: `rapid-assessments/`
- `route.ts` for endpoint files (Next.js convention)
- Group by resource, not by HTTP method

**Stores:**
- Camel case with `.store.ts` suffix: `offline.store.ts`
- Single responsibility per store
- Use store name in hook: `useOfflineStore()`

**Types:**
- Camel case with `.ts` suffix: `entities.ts`
- Group related types by domain
- Export interfaces (not types) for entities

**Hooks:**
- Camel case starting with `use`: `useOffline.ts`
- One hook per file
- Co-locate with related logic when complex

### 4.3 Import Organization

**Standard Import Order:**
```typescript
// 1. External libraries
import { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 3. Internal components
import { AssessmentForm } from '@/components/forms/assessment';

// 4. Stores and hooks
import { useAuthStore } from '@/stores/auth.store';
import { useOffline } from '@/hooks/useOffline';

// 5. Utilities and helpers
import { formatDate } from '@/lib/utils/format';

// 6. Types
import type { Assessment, Entity } from '@/types/entities';
```

---
