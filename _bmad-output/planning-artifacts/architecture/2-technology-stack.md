# 2. Technology Stack

### 2.1 Frontend Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Framework | Next.js | 14.2.x | PWA foundation | App Router, built-in PWA support, optimal for LLM development |
| UI Library | React | 18.3.x | Component architecture | Industry standard, extensive ecosystem |
| State Management | Zustand | 4.5.x | Global state & offline queue | Lightweight, persistence-friendly, minimal boilerplate |
| Component Library | Shadcn/ui | Latest | UI components | Copy-paste components, customizable, accessible |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS | Rapid development, consistent design system |
| PWA | next-pwa | 5.6.x | Service worker management | Workbox integration, offline caching |
| Offline Storage | Dexie.js | 4.0.x | IndexedDB wrapper | Simplified offline data management with encryption |
| Forms | React Hook Form | 7.51.x | Form handling | Performance, validation, minimal re-renders |
| Validation | Zod | 3.23.x | Schema validation | Type-safe, Prisma alignment |
| Maps | Leaflet | 1.9.x | Offline mapping | Lightweight, offline tile support |
| Query | TanStack Query | 5.x | Server state | Cache management, automatic refetch |

### 2.2 Backend Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Runtime | Node.js | 20.x LTS | Server runtime | Stable LTS, broad support |
| API Framework | Next.js API Routes | 14.2.x | API endpoints | Unified codebase, serverless-ready |
| Database | Supabase(PostgreSQL) | 16.x | Primary datastore | ACID compliance, JSON support, reliability |
| ORM | Prisma | 5.14.x | Database access | Type safety, migrations, generated types |
| Authentication | NextAuth.js | 4.24.x | Auth management | JWT sessions, flexible providers |
| File Storage | AWS S3 Compatible | Latest | Media storage | Scalable, can use MinIO for self-hosting |
| Monitoring | Sentry | 8.7.x | Error tracking | Production debugging, performance monitoring |

**Removed from Original Architecture:**
- ❌ BullMQ (async job queue) - Not needed for simpler workflow
- ❌ Redis (cache) - Next.js cache + PostgreSQL sufficient for MVP
- ❌ Complex rule engine - Simple boolean auto-approval per entity

### 2.3 Infrastructure & DevOps

| Category | Technology | Purpose |
|----------|------------|---------|
| Deployment | Vercel | Serverless deployment, global CDN, zero-config |
| Database Hosting | Supabase | Managed PostgreSQL with automatic backups |
| Storage | Cloudflare R2 / S3 | Media storage with CDN |
| Monitoring | Sentry | Error tracking and performance monitoring |
| Analytics | Vercel Analytics | Real-time performance metrics |

**Deployment Strategy:**
- Vercel for frontend + API routes (single deployment)
- Managed PostgreSQL (Supabase recommended)
- R2 for media (cheaper than S3, S3-compatible API)
- No containerization needed for MVP (Vercel handles scaling)

---
