# Docker Infrastructure & Integrations Plan

> Complete Docker dev/prod environment with MinIO, Redis, Sentry, Email (Resend/SendGrid), and external S3 backup — all feature-flagged for plug-and-play activation.

**Date:** 2026-05-27
**Owner:** Bilnigma
**Status:** COMPLETE — All phases implemented and wired
**Target:** Single VPS deployment via Dokploy (4-8GB RAM, <100 concurrent users)

---

## Architecture Overview

```
┌─ VPS (4-8GB) ──────────────────────────────────────────┐
│  Dokploy / Docker Compose                               │
│                                                         │
│  ┌──────────────┐                                       │
│  │   Traefik    │ ← Auto SSL (Let's Encrypt), reverse   │
│  │  (port 80/443)│   proxy, replaces Nginx              │
│  └──────┬───────┘                                       │
│         │                                               │
│  ┌──────▼───────┐  ┌────────────┐  ┌───────────────┐   │
│  │  Next.js App  │  │ PostgreSQL │  │  Redis        │   │
│  │  (standalone) │  │ (port 5432)│  │  (port 6379)  │   │
│  │  (port 3000)  │  │            │  │               │   │
│  └──────┬───────┘  └────────────┘  └───────────────┘   │
│         │                                               │
│  ┌──────▼───────┐                                       │
│  │    MinIO     │ ← S3-compatible object storage        │
│  │ (port 9000)  │   for reports, media, backups         │
│  │ (port 9001)  │   9001 = console UI                   │
│  └──────────────┘                                       │
│                                                         │
│  Persistent Volumes:                                    │
│  ├── postgres_data  → /var/lib/postgresql/data          │
│  ├── redis_data     → /data                             │
│  ├── minio_data     → /data                             │
│  ├── app_reports    → /app/reports                      │
│  ├── app_uploads    → /app/uploads                      │
│  ├── app_temp       → /app/temp                         │
│  ├── app_backups    → /app/.backups                     │
│  └── app_logs       → /app/logs                         │
│                                                         │
│  External (cloud, feature-flagged):                     │
│  ├── Sentry free tier  → Error monitoring               │
│  ├── Resend / SendGrid → Email delivery                 │
│  └── External S3       → Offsite backup                 │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 0: Environment Configuration

**Priority:** CRITICAL
**Estimated effort:** 1 hour

### Step 0.1: Update `.env.example`

**Modify:** `.env.example`

Add the following sections after the existing content:

```env
# ===========================================
# MINIO / S3 OBJECT STORAGE
# ===========================================
# MinIO (local Docker) or S3-compatible endpoint
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="dms-storage"
S3_REGION="us-east-1"
# Set to "true" when MinIO/S3 is running
S3_ENABLED=false

# ===========================================
# REDIS
# ===========================================
REDIS_URL="redis://localhost:6379"
# Set to "true" when Redis is running
REDIS_ENABLED=false

# ===========================================
# SENTRY ERROR MONITORING
# ===========================================
# Get DSN from https://sentry.io (free tier: 5k events/month)
SENTRY_DSN=""
# Set to "true" when Sentry DSN is configured
SENTRY_ENABLED=false

# ===========================================
# EMAIL SERVICE
# ===========================================
# Supported providers: "resend" or "sendgrid"
EMAIL_PROVIDER="resend"
# Resend (https://resend.com) — free tier: 100 emails/day
RESEND_API_KEY=""
# SendGrid (https://sendgrid.com) — free tier: 100 emails/day
SENDGRID_API_KEY=""
# Set to "true" when email provider is configured
EMAIL_ENABLED=false
EMAIL_FROM_ADDRESS="noreply@dms-borno.gov.ng"
EMAIL_FROM_NAME="DRMS Borno"

# ===========================================
# EXTERNAL S3 BACKUP
# ===========================================
# For offsite backup of MinIO data or direct pg_dump
# Can be AWS S3, Cloudflare R2, Wasabi, or any S3-compatible
BACKUP_S3_ENDPOINT=""
BACKUP_S3_ACCESS_KEY=""
BACKUP_S3_SECRET_KEY=""
BACKUP_S3_BUCKET=""
BACKUP_S3_REGION=""
# Set to "true" when external backup is configured
BACKUP_S3_ENABLED=false
```

### Step 0.2: Update `.env.production.template`

**Modify:** `.env.production.template`

Replace the entire file with production-ready values. Same keys as `.env.example` but with production-appropriate defaults and stronger documentation.

### Step 0.3: Create `.env.docker`

**NEW:** `.env.docker`

Development defaults for Docker Compose. This file is committed (no real secrets).

```env
# Docker Compose Dev Environment
COMPOSE_PROJECT_NAME=dms-dev

# PostgreSQL
POSTGRES_DB=drms_dev
POSTGRES_USER=dms_dev
POSTGRES_PASSWORD=dev_password_change_in_prod
DATABASE_URL=postgresql://dms_dev:dev_password_change_in_prod@postgres:5432/drms_dev?schema=public

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=dms-storage
S3_REGION=us-east-1
S3_ENABLED=true

# Redis
REDIS_URL=redis://redis:6379
REDIS_ENABLED=true

# Auth (dev secrets only)
JWT_SECRET=dev-only-jwt-secret-replace-in-production-min-32-chars
JWT_EXPIRES_IN=24h
NEXTAUTH_SECRET=dev-only-nextauth-secret-replace-in-production
NEXTAUTH_URL=http://localhost:3000

# App
NODE_ENV=development
NEXT_PUBLIC_APP_NAME="DRMS Dev"
NEXT_PUBLIC_APP_VERSION="0.1.0"
NEXT_PUBLIC_PWA_ENABLED=false
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Feature flags (disabled for dev by default)
SENTRY_ENABLED=false
SENTRY_DSN=
EMAIL_ENABLED=false
EMAIL_PROVIDER=resend
RESEND_API_KEY=
SENDGRID_API_KEY=
EMAIL_FROM_ADDRESS=dev@localhost
EMAIL_FROM_NAME="DRMS Dev"
BACKUP_S3_ENABLED=false
```

---

## Phase 1: Docker Compose Files

**Priority:** CRITICAL
**Estimated effort:** 2 hours

### Step 1.1: Create `docker-compose.yml` (Dev)

**NEW:** `docker-compose.yml`

```yaml
# Development Docker Compose
# Usage: docker compose up -d
# MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
# pgAdmin-style access via direct connection on port 5432

version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-drms_dev}
      POSTGRES_USER: ${POSTGRES_USER:-dms_dev}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-dev_password}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-dms_dev} -d ${POSTGRES_DB:-drms_dev}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO bucket initialization (creates bucket on first run)
  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    restart: "no"
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD:-minioadmin};
      mc mb myminio/dms-storage --ignore-existing;
      mc anonymous set download myminio/dms-storage;
      echo 'Bucket dms-storage ready';
      "

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
```

### Step 1.2: Update `docker-compose.production.yml` (Prod)

**Modify:** `docker-compose.production.yml`

Changes from existing file:
- Replace Nginx with Traefik (Dokploy provides Traefik, but include config for standalone use)
- Add MinIO service + init container
- Fix volume mounts (add `reports/`, `temp/`, `.backups/`, `schedules/`)
- Add all environment variables for new services
- Add resource limits
- Add `S3_ENABLED=true`, `REDIS_ENABLED=true` in app env
- Remove `ports` exposure for Postgres/Redis/MinIO (internal only, Traefik handles external)
- Add external S3 backup cron sidecar

```yaml
# Production Docker Compose Configuration
# Optimized for Dokploy / single VPS deployment

version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-drms_prod}
      POSTGRES_USER: ${DB_USER:-drms_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    # Do NOT expose port externally in production
    # Access only via Docker network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-drms_user} -d ${POSTGRES_DB:-drms_prod}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 300M

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    # Do NOT expose ports externally in production
    # Access via Traefik if console needed remotely
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    restart: "no"
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD};
      mc mb myminio/${S3_BUCKET:-dms-storage} --ignore-existing;
      echo 'Bucket ready';
      "

  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER:-drms_user}:${DB_PASSWORD}@postgres:5432/${POSTGRES_DB:-drms_prod}?schema=public&sslmode=require
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-24h}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
      - NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION:-1.0.0}
      - NEXT_PUBLIC_PWA_ENABLED=${NEXT_PUBLIC_PWA_ENABLED:-true}
      # Redis
      - REDIS_URL=redis://redis:6379
      - REDIS_ENABLED=true
      # MinIO / S3
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=${MINIO_ROOT_USER}
      - S3_SECRET_KEY=${MINIO_ROOT_PASSWORD}
      - S3_BUCKET=${S3_BUCKET:-dms-storage}
      - S3_REGION=${S3_REGION:-us-east-1}
      - S3_ENABLED=true
      # Feature-flagged services
      - SENTRY_ENABLED=${SENTRY_ENABLED:-false}
      - SENTRY_DSN=${SENTRY_DSN:-}
      - EMAIL_ENABLED=${EMAIL_ENABLED:-false}
      - EMAIL_PROVIDER=${EMAIL_PROVIDER:-resend}
      - RESEND_API_KEY=${RESEND_API_KEY:-}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY:-}
      - EMAIL_FROM_ADDRESS=${EMAIL_FROM_ADDRESS:-noreply@dms-borno.gov.ng}
      - EMAIL_FROM_NAME=${EMAIL_FROM_NAME:-DRMS Borno}
      - BACKUP_S3_ENABLED=${BACKUP_S3_ENABLED:-false}
      - BACKUP_S3_ENDPOINT=${BACKUP_S3_ENDPOINT:-}
      - BACKUP_S3_ACCESS_KEY=${BACKUP_S3_ACCESS_KEY:-}
      - BACKUP_S3_SECRET_KEY=${BACKUP_S3_SECRET_KEY:-}
      - BACKUP_S3_BUCKET=${BACKUP_S3_BUCKET:-}
      - BACKUP_S3_REGION=${BACKUP_S3_REGION:-}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    volumes:
      - app_reports:/app/reports
      - app_uploads:/app/uploads
      - app_temp:/app/temp
      - app_backups:/app/.backups
      - app_schedules:/app/schedules
      - app_logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 1G

  # Daily PostgreSQL backup to MinIO
  db-backup:
    image: postgres:15-alpine
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    environment:
      - PGHOST=postgres
      - PGUSER=${DB_USER:-drms_user}
      - PGPASSWORD=${DB_PASSWORD}
      - PGDATABASE=${POSTGRES_DB:-drms_prod}
      - S3_ENDPOINT=http://minio:9000
      - AWS_ACCESS_KEY_ID=${MINIO_ROOT_USER}
      - AWS_SECRET_ACCESS_KEY=${MINIO_ROOT_PASSWORD}
    # Requires mc client for MinIO upload
    # Runs pg_dump daily at 2 AM, keeps 30 days
    entrypoint: >
      /bin/sh -c "
      apk add --no-cache curl;
      curl -sL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc;
      chmod +x /usr/local/bin/mc;
      mc alias set myminio $$S3_ENDPOINT $$AWS_ACCESS_KEY_ID $$AWS_SECRET_ACCESS_KEY;
      mc mb myminio/db-backups --ignore-existing;
      while true; do
        FILENAME=drms_backup_$$(date +%Y%m%d_%H%M%S).sql.gz;
        pg_dump -h $$PGHOST -U $$PGUSER $$PGDATABASE | gzip > /tmp/$$FILENAME;
        mc cp /tmp/$$FILENAME myminio/db-backups/$$FILENAME;
        rm /tmp/$$FILENAME;
        # Keep only last 30 backups
        mc ls myminio/db-backups/ --summarize | sort -r | tail -n +31 | awk '{print $$5}' | xargs -I {} mc rm myminio/db-backups/{};
        echo \"Backup done: $$FILENAME\";
        sleep 86400;
      done
      "
    volumes:
      - ./backups:/backups
    deploy:
      resources:
        limits:
          memory: 256M

  # Traefik reverse proxy (use this for standalone production,
  # or omit if Dokploy provides its own Traefik)
  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt_data:/letsencrypt
    depends_on:
      - app
    deploy:
      resources:
        limits:
          memory: 128M

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  app_reports:
    driver: local
  app_uploads:
    driver: local
  app_temp:
    driver: local
  app_backups:
    driver: local
  app_schedules:
    driver: local
  app_logs:
    driver: local
  letsencrypt_data:
    driver: local

networks:
  default:
    name: drms_production_network
```

### Step 1.3: Create `Dockerfile.dev`

**NEW:** `Dockerfile.dev`

```dockerfile
FROM node:18-alpine
WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

ENV NODE_ENV=development
EXPOSE 3000

CMD ["pnpm", "run", "dev"]
```

### Step 1.4: Update `.dockerignore`

**Modify:** `.dockerignore`

Add these lines:
```
docker-compose.yml
.env.docker
pgdata/
```

### Step 1.5: Create `docker/scripts/backup-to-external-s3.sh`

**NEW:** `docker/scripts/backup-to-external-s3.sh`

Script that syncs MinIO bucket to external S3 (AWS R2, Wasabi, etc.) for offsite backup. Only runs when `BACKUP_S3_ENABLED=true`.

```bash
#!/bin/bash
# Syncs local MinIO bucket to external S3-compatible storage
# Called by cron or sidecar container
# Requires: mc (MinIO Client)

set -euo pipefail

EXTERNAL_ENDPOINT="${BACKUP_S3_ENDPOINT}"
EXTERNAL_KEY="${BACKUP_S3_ACCESS_KEY}"
EXTERNAL_SECRET="${BACKUP_S3_SECRET_KEY}"
EXTERNAL_BUCKET="${BACKUP_S3_BUCKET}"
LOCAL_BUCKET="myminio/dms-storage"

mc alias set external "$EXTERNAL_ENDPOINT" "$EXTERNAL_KEY" "$EXTERNAL_SECRET"
mc mirror --overwrite --remove "$LOCAL_BUCKET" "external/$EXTERNAL_BUCKET"

echo "$(date): External backup sync completed"
```

---

## Phase 2: MinIO / S3 Integration (Code Changes)

**Priority:** HIGH
**Estimated effort:** 3-4 hours
**Depends on:** Phase 1

### Step 2.1: Install S3 Client SDK

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Step 2.2: Create Storage Service

**NEW:** `src/lib/storage/s3-client.ts`

Singleton S3 client that connects to MinIO locally or any S3-compatible endpoint.

```typescript
import { S3Client } from '@aws-sdk/client-s3'

let s3Client: S3Client | null = null

export function getS3Client(): S3Client | null {
  if (!process.env.S3_ENABLED || process.env.S3_ENABLED !== 'true') {
    return null
  }

  if (s3Client) return s3Client

  s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
    forcePathStyle: true, // Required for MinIO
  })

  return s3Client
}
```

**NEW:** `src/lib/storage/storage.service.ts`

Abstraction layer over S3/MinIO operations.

Key methods:
- `uploadFile(key, buffer, contentType)` → Upload file to bucket
- `downloadFile(key)` → Get file buffer
- `deleteFile(key)` → Remove file
- `getPresignedUrl(key, expiresIn)` → Generate time-limited download URL
- `listFiles(prefix)` → List files with prefix
- `fileExists(key)` → Check existence

All methods check `S3_ENABLED` flag first. When disabled, fall back to local filesystem paths (current behavior).

### Step 2.3: Create File Path Constants

**NEW:** `src/lib/storage/paths.ts`

Centralized path definitions for all file storage:

```typescript
export const STORAGE_PATHS = {
  reports: 'reports',
  deliveryMedia: 'delivery-media',
  assessmentMedia: 'assessment-media',
  responseMedia: 'response-media',
  backups: 'backups',
  exports: 'exports',
} as const

export function getStorageKey(category: string, ...segments: string[]): string {
  return [category, ...segments].join('/')
}
```

### Step 2.4: Update Report Generation to Use MinIO

**Modify:** `src/app/api/v1/reports/generate/route.ts`

- After generating PDF/Excel to local `temp/`, upload to MinIO bucket under `reports/{executionId}.{ext}`
- Update `filePath` stored in `ReportExecution` to be the S3 key instead of local path
- Keep local temp generation, upload after, clean up temp

### Step 2.5: Update Report Download to Use MinIO

**Modify:** `src/app/api/v1/reports/download/[id]/route.ts`

- When `S3_ENABLED=true`, download from MinIO using the S3 key
- When `S3_ENABLED=false`, fall back to local filesystem (current behavior)

### Step 2.6: Update Delivery Media Upload

**Modify:** `src/lib/services/delivery-media.service.ts`

Replace the mock `uploadFileToStorage()` function (line ~282) with real MinIO upload:
- When `S3_ENABLED=true`, upload buffer to MinIO under `delivery-media/{year}/{filename}`
- When `S3_ENABLED=false`, save to local `uploads/` directory

### Step 2.7: Update Assessment/Response Media

**Modify files in:**
- `src/app/api/v1/assessments/` — rapid assessment media handling
- `src/app/api/v1/responses/` — response media handling

Same pattern: when `S3_ENABLED=true`, upload to MinIO; when false, local filesystem.

### Step 2.8: Update Health Check

**Modify:** `src/app/api/v1/system/health/route.ts`

Update the "File Storage" health check to verify MinIO/S3 connectivity when `S3_ENABLED=true`:
- `HeadBucket` command to verify bucket exists and is accessible
- Report storage stats (bucket size, object count)

---

## Phase 3: Redis Integration (Code Changes)

**Priority:** MEDIUM
**Estimated effort:** 2-3 hours
**Depends on:** Phase 1

### Step 3.1: Install Redis Client

```bash
pnpm add ioredis
```

### Step 3.2: Create Redis Client Singleton

**NEW:** `src/lib/cache/redis-client.ts`

```typescript
import Redis from 'ioredis'

let redis: Redis | null = null

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_ENABLED || process.env.REDIS_ENABLED !== 'true') {
    return null
  }

  if (redis) return redis

  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000)
      return delay
    },
  })

  return redis
}
```

### Step 3.3: Create Cache Service Abstraction

**NEW:** `src/lib/cache/cache.service.ts`

Wraps Redis operations with in-memory fallback when `REDIS_ENABLED=false`:

- `get(key)` → Get cached value
- `set(key, value, ttlSeconds)` → Set with optional TTL
- `del(key)` → Delete key
- `invalidate(pattern)` → Delete keys matching pattern
- `publish(channel, message)` → Pub/sub publish
- `subscribe(channel, callback)` → Pub/sub subscribe

When Redis is disabled, uses `Map` with TTL tracking (current in-memory behavior).

### Step 3.4: Replace In-Memory Maps

**Modify:** `src/app/api/v1/responses/[id]/collaboration/route.ts`
- Replace `Map<string, Set<string>>` with cache service calls

**Modify:** `src/app/api/v1/verification/live/route.ts`
- Replace SSE connection tracking with Redis pub/sub when available
- Keep SSE as transport, use Redis for cross-process event broadcasting

### Step 3.5: Add API Response Caching

**Modify frequently-called read endpoints:**
- `/api/v1/system/health` — Already has 30s in-memory cache; extend with Redis
- `/api/v1/dashboard/` — Cache aggregated stats with 60s TTL
- `/api/v1/leaderboard` — Cache rankings with 5-minute TTL

---

## Phase 4: Sentry Integration (Feature-Flagged)

**Priority:** MEDIUM
**Estimated effort:** 1 hour
**Depends on:** Phase 1

### Step 4.1: Install Sentry SDK

```bash
pnpm add @sentry/nextjs
```

### Step 4.2: Create Sentry Initialization

**NEW:** `src/lib/monitoring/sentry.ts`

```typescript
export function initSentry() {
  if (process.env.SENTRY_ENABLED !== 'true' || !process.env.SENTRY_DSN) {
    return
  }

  // Dynamic import to avoid bundling when disabled
  // Initialize Sentry with DSN
  // Configure performance monitoring (tracesSampleRate: 0.1)
  // Configure session replay (replaysSessionSampleRate: 0.1)
}
```

### Step 4.3: Add Sentry Config Files

**NEW:** `sentry.client.config.ts` — Client-side Sentry init (checks `SENTRY_ENABLED`)
**NEW:** `sentry.server.config.ts` — Server-side Sentry init (checks `SENTRY_ENABLED`)
**NEW:** `next.config.js` update — Add `@sentry/nextjs` webpack plugin (conditional on `SENTRY_ENABLED`)

### Step 4.4: Update `next.config.js`

**Modify:** `next.config.js`

Add Sentry webpack plugin conditionally:
```javascript
const withSentryConfig = SENTRY_ENABLED === 'true'
  ? require('@sentry/nextjs').withSentryConfig
  : (config) => config
```

---

## Phase 5: Email Integration (Feature-Flagged)

**Priority:** MEDIUM
**Estimated effort:** 2-3 hours
**Depends on:** Phase 1

### Step 5.1: Install Email Providers

```bash
pnpm add resend @sendgrid/mail
```

### Step 5.2: Create Email Service Abstraction

**NEW:** `src/lib/email/email.service.ts`

Unified email service that routes to Resend or SendGrid based on `EMAIL_PROVIDER`:

```typescript
export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  cc?: string[]
  bcc?: string[]
  replyTo?: string
}

export class EmailService {
  async send(message: EmailMessage): Promise<{ success: boolean; id?: string }> {
    if (process.env.EMAIL_ENABLED !== 'true') {
      console.log('[Email] Disabled — would have sent:', message.subject, 'to', message.to)
      return { success: true, id: 'mock' }
    }

    const provider = process.env.EMAIL_PROVIDER || 'resend'

    switch (provider) {
      case 'resend': return this.sendViaResend(message)
      case 'sendgrid': return this.sendViaSendgrid(message)
      default: throw new Error(`Unknown email provider: ${provider}`)
    }
  }
}

export const emailService = new EmailService()
```

### Step 5.3: Create Email Templates

**NEW:** `src/lib/email/templates/`

- `commitment-notification.ts` — Donor commitment notification
- `report-generated.ts` — Report ready for download
- `password-reset.ts` — Password reset flow
- `user-welcome.ts` — New user welcome email
- `base-template.ts` — Shared HTML layout wrapper

Each template returns `{ subject, html, text }`.

### Step 5.4: Wire Up Existing Notification Points

**Modify:** `src/app/api/v1/commitments/[id]/notify/route.ts`
- Replace simulated `sendNotification()` (line ~173) with `emailService.send()`

**Modify:** `src/app/api/v1/reports/generate/route.ts`
- After report generation, send notification email to the user who triggered it

**Modify:** `src/app/api/v1/auth/login/route.ts` (or equivalent)
- Add optional email notification for new device login (when `EMAIL_ENABLED=true`)

---

## Phase 6: External S3 Backup (Feature-Flagged)

**Priority:** LOW
**Estimated effort:** 1 hour
**Depends on:** Phase 2

### Step 6.1: Create Backup Sync Service

**NEW:** `src/lib/storage/backup-sync.service.ts`

Uses the S3 client to sync MinIO bucket to external S3:

```typescript
export class BackupSyncService {
  async syncToExternal(): Promise<{ synced: number; errors: number }> {
    if (process.env.BACKUP_S3_ENABLED !== 'true') {
      return { synced: 0, errors: 0 }
    }
    // List objects in MinIO bucket
    // Copy each to external S3 endpoint
    // Return stats
  }
}
```

### Step 6.2: Add Backup API Endpoint

**NEW:** `src/app/api/v1/system/backup/external/route.ts`

- `POST` — Trigger manual backup sync (admin only)
- `GET` — Get last backup status

### Step 6.3: Add Backup Status to Health Dashboard

**Modify:** `src/app/api/v1/system/health/route.ts`
- Report external backup status (last sync time, bucket accessible)

---

## Dependency Graph

```
Phase 0 (env config)
    │
    ▼
Phase 1 (Docker Compose)
    │
    ├─────────────┬─────────────┬─────────────┐
    ▼             ▼             ▼             ▼
Phase 2       Phase 3       Phase 4       Phase 5
(MinIO/S3)    (Redis)       (Sentry)      (Email)
    │             │
    ▼             │
Phase 6          │
(Ext Backup)     │
    │             │
    └──────┬──────┘
           ▼
    All phases complete
```

**Parallel execution:** Phases 2-5 can run in parallel after Phase 1 completes. Phase 6 depends on Phase 2.

---

## File Map

### New Files (18)

| File | Phase | Purpose |
|------|-------|---------|
| `.env.docker` | 0 | Dev Docker environment defaults |
| `docker-compose.yml` | 1 | Dev Docker Compose |
| `Dockerfile.dev` | 1 | Dev Docker image |
| `docker/scripts/backup-to-external-s3.sh` | 1 | External backup script |
| `src/lib/storage/s3-client.ts` | 2 | S3/MinIO client singleton |
| `src/lib/storage/storage.service.ts` | 2 | File upload/download abstraction |
| `src/lib/storage/paths.ts` | 2 | Storage path constants |
| `src/lib/cache/redis-client.ts` | 3 | Redis client singleton |
| `src/lib/cache/cache.service.ts` | 3 | Cache abstraction with fallback |
| `src/lib/monitoring/sentry.ts` | 4 | Sentry initialization |
| `sentry.client.config.ts` | 4 | Client Sentry config |
| `sentry.server.config.ts` | 4 | Server Sentry config |
| `src/lib/email/email.service.ts` | 5 | Unified email service |
| `src/lib/email/templates/base-template.ts` | 5 | Shared email HTML layout |
| `src/lib/email/templates/commitment-notification.ts` | 5 | Commitment email template |
| `src/lib/email/templates/report-generated.ts` | 5 | Report email template |
| `src/lib/email/templates/password-reset.ts` | 5 | Password reset template |
| `src/lib/storage/backup-sync.service.ts` | 6 | External S3 backup sync |
| `src/app/api/v1/system/backup/external/route.ts` | 6 | Backup trigger API |

### Modified Files (12)

| File | Phase | Changes |
|------|-------|---------|
| `.env.example` | 0 | Add all new env vars |
| `.env.production.template` | 0 | Add all new env vars with production docs |
| `docker-compose.production.yml` | 1 | Add MinIO, Traefik, fix volumes, add backup sidecar |
| `.dockerignore` | 1 | Add dev compose + env.docker |
| `src/app/api/v1/reports/generate/route.ts` | 2 | Upload reports to MinIO |
| `src/app/api/v1/reports/download/[id]/route.ts` | 2 | Download from MinIO |
| `src/lib/services/delivery-media.service.ts` | 2 | Real MinIO uploads |
| `src/app/api/v1/system/health/route.ts` | 2,3,6 | MinIO health, Redis cache, backup status |
| `src/app/api/v1/responses/[id]/collaboration/route.ts` | 3 | Redis for collaboration |
| `src/app/api/v1/verification/live/route.ts` | 3 | Redis pub/sub |
| `next.config.js` | 4 | Conditional Sentry plugin |
| `src/app/api/v1/commitments/[id]/notify/route.ts` | 5 | Real email sending |

---

## Success Criteria

- [ ] `docker compose up` starts PostgreSQL, Redis, and MinIO locally
- [ ] MinIO console accessible at `http://localhost:9001` with `dms-storage` bucket created
- [ ] Report PDF/Excel files upload to MinIO when `S3_ENABLED=true`
- [ ] Report downloads work from MinIO when enabled, local filesystem when disabled
- [ ] Delivery media uploads go to MinIO when enabled
- [ ] Redis connection verified; in-memory fallback works when disabled
- [ ] `SENTRY_ENABLED=false` → zero Sentry code loaded
- [ ] `SENTRY_ENABLED=true` + valid DSN → errors captured in Sentry dashboard
- [ ] `EMAIL_ENABLED=false` → emails logged to console only
- [ ] `EMAIL_ENABLED=true` + `EMAIL_PROVIDER=resend` → real emails sent
- [ ] `EMAIL_ENABLED=true` + `EMAIL_PROVIDER=sendgrid` → real emails sent
- [ ] `BACKUP_S3_ENABLED=false` → no external backup attempts
- [ ] `BACKUP_S3_ENABLED=true` + valid credentials → MinIO synced to external S3
- [ ] `docker compose -f docker-compose.production.yml up` runs full stack
- [ ] All services healthy after `docker compose` restart
- [ ] Daily pg_dump backup runs to MinIO `db-backups` bucket
- [ ] Old backups pruned (30-day retention)

---

## Environment Variable Quick Reference

| Variable | Default | When Active | Phase |
|----------|---------|-------------|-------|
| `S3_ENABLED` | `false` | Set `true` in `.env.docker` | 2 |
| `S3_ENDPOINT` | — | MinIO URL | 2 |
| `S3_ACCESS_KEY` | — | MinIO access key | 2 |
| `S3_SECRET_KEY` | — | MinIO secret key | 2 |
| `S3_BUCKET` | `dms-storage` | Bucket name | 2 |
| `REDIS_ENABLED` | `false` | Set `true` in `.env.docker` | 3 |
| `REDIS_URL` | — | Redis connection URL | 3 |
| `SENTRY_ENABLED` | `false` | Set `true` + configure DSN | 4 |
| `SENTRY_DSN` | — | From Sentry project settings | 4 |
| `EMAIL_ENABLED` | `false` | Set `true` + configure API key | 5 |
| `EMAIL_PROVIDER` | `resend` | `resend` or `sendgrid` | 5 |
| `RESEND_API_KEY` | — | From Resend dashboard | 5 |
| `SENDGRID_API_KEY` | — | From SendGrid dashboard | 5 |
| `EMAIL_FROM_ADDRESS` | — | Sender email | 5 |
| `EMAIL_FROM_NAME` | — | Sender display name | 5 |
| `BACKUP_S3_ENABLED` | `false` | Set `true` + configure external S3 | 6 |
| `BACKUP_S3_ENDPOINT` | — | External S3 URL | 6 |
| `BACKUP_S3_ACCESS_KEY` | — | External S3 key | 6 |
| `BACKUP_S3_SECRET_KEY` | — | External S3 secret | 6 |
| `BACKUP_S3_BUCKET` | — | External bucket name | 6 |

---

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Environment Config | COMPLETE | .env.example, .env.production.template, .env.docker created |
| Phase 1: Docker Compose | COMPLETE | Dev: postgres:5435, redis:6379, minio:9100/9101. Prod: full stack with Traefik, backup sidecar |
| Phase 2: MinIO / S3 | COMPLETE | Storage wired into report generate/download + delivery media uploads |
| Phase 3: Redis | COMPLETE | Cache wired into collaboration route + health endpoint |
| Phase 4: Sentry | COMPLETE | next.config.js updated with conditional Sentry plugin |
| Phase 5: Email | COMPLETE | Email wired into commitment notify route |
| Phase 6: External Backup | COMPLETE | Backup sync service + API endpoint created |
| **Wiring** | **COMPLETE** | **All services integrated into existing code** |
