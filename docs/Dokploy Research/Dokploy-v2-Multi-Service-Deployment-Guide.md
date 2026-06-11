# DRMS v2 — Multi-Service Deployment Guide for Dokploy v0.26.5

## Overview

This guide deploys the **current version** of DRMS (with Redis, MinIO, Sentry, email, and S3 backup)
alongside the existing v1 deployment on the same Dokploy instance, as a **separate project**.

**Architecture:**

```
┌─────────────────────────────────────────────────────┐
│  Dokploy v0.26.5 (Existing Instance)                │
│                                                      │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │  OLD PROJECT  │     │  NEW PROJECT (DRMS v2)   │  │
│  │  (untouched)  │     │                           │  │
│  │               │     │  App (GitHub → Docker)    │  │
│  │  drms-v1      │     │  ├─ Next.js :3000        │  │
│  │  postgres-v1  │     │  ├─ Prisma migrations    │  │
│  │               │     │  └─ Health /api/health    │  │
│  └──────────────┘     │                           │  │
│                        │  Managed PostgreSQL       │  │
│                        │  ├─ drms_prod database    │  │
│                        │  └─ Port 5432 (internal)  │  │
│                        │                           │  │
│                        │  Compose: Redis + MinIO   │  │
│                        │  ├─ Redis :6379           │  │
│                        │  ├─ MinIO API :9000       │  │
│                        │  └─ MinIO Console :9001   │  │
│                        └──────────────────────────┘  │
│                                                      │
│  Shared: Dokploy Traefik (80/443 → Let's Encrypt)   │
└─────────────────────────────────────────────────────┘
```

**Key decisions:**
- **Dokploy managed PostgreSQL** — simplest, built-in backups, auto-connection string
- **Compose for Redis + MinIO** — Dokploy doesn't have managed Redis/MinIO; Compose is the native way
- **Application type for the app** — GitHub integration, auto-deploy on push, Dockerfile build
- **NO custom Traefik** — Dokploy provides Traefik; omit it from `docker-compose.production.yml`
- **Shared Docker network** — app + DB + Redis + MinIO must all communicate

---

## Pre-Deployment Checklist

Before starting, confirm:

- [ ] Dokploy v0.26.5 is running and accessible
- [ ] You have SSH/admin access to the Dokploy dashboard
- [ ] DNS is configured: A record for your domain → VPS IP
- [ ] GitHub repo `https://github.com/bilzee/dms-v4` is accessible
- [ ] You have the `.env.production.template` values ready to fill in
- [ ] The old DRMS v1 project is running and you know its name (to avoid conflicts)

---

## Step 1: Create a New Dokploy Project

1. Log into your Dokploy dashboard
2. Click **"Add Project"** (or "+" in the projects list)
3. Name it: **`drms-v2`** (or your preferred name)
4. This creates an isolated namespace — the old project remains untouched

---

## Step 2: Create Managed PostgreSQL Database

1. Inside the `drms-v2` project, go to **Databases** tab
2. Click **"Create Database"**
3. Configure:
   - **Name:** `drms-postgres`
   - **Image:** `postgres:15-alpine` (recommended)
   - **Username:** `drms_user`
   - **Password:** Generate a strong password (save it!)
   - **Database name:** `drms_prod`
4. Click **Create**
5. Wait for status: **Running**
6. Note the **internal connection string** (Dokploy shows this):
   ```
   postgresql://drms_user:<password>@drms-postgres:5432/drms_prod
   ```
   This is your `DATABASE_URL` for the app.

---

## Step 3: Create Docker Compose for Redis + MinIO

1. Inside the `drms-v2` project, go to **Compose** tab
2. Click **"Create Compose"**
3. Name it: **`drms-services`**
4. Paste this compose file:

```yaml
services:
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
    networks:
      - drms-v2-network

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - drms-v2-network

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    restart: "no"
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD};
      mc mb myminio/dms-storage --ignore-existing;
      mc mb myminio/db-backups --ignore-existing;
      echo 'MinIO buckets ready: dms-storage, db-backups';
      "
    networks:
      - drms-v2-network

volumes:
  redis_data:
    driver: local
  minio_data:
    driver: local

networks:
  drms-v2-network:
    external: true
```

5. Set **Compose environment variables**:

| Variable | Value |
|---|---|
| `MINIO_ROOT_USER` | Generate: `openssl rand -base64 16` (save it!) |
| `MINIO_ROOT_PASSWORD` | Generate: `openssl rand -base64 24` (save it!) |

6. **Important — Network setup:** The compose references `drms-v2-network` as external.
   Dokploy auto-creates a network per project named `{project-name}_{project-id}`.
   After deploying the compose, check Dokploy's network name and update if needed.
   
   **Alternative (easier):** Remove the `networks` section entirely and let Dokploy handle
   networking automatically. In Dokploy v0.26.5, all resources within a project share
   the same Docker network by default. If you remove the network block, just ensure
   the app references services by their Docker service names (`redis`, `minio`).

7. Click **Deploy**
8. Wait for all services: **Running**
9. Verify:
   - Redis: Check logs show "Ready to accept connections"
   - MinIO: Check logs show " MinIO API endpoint listening"
   - minio-init: Should show "Buckets ready: dms-storage, db-backups" and exit

---

## Step 4: Create the Application

1. Inside the `drms-v2` project, go to **Applications** tab
2. Click **"Create Application"**
3. Choose type: **Application** (not Compose)
4. Name it: **`drms-app`**

### 4.1 Configure Git Source

1. Go to **drms-app → Settings → General**
2. Configure:
   - **Source type:** GitHub
   - **Repository:** `bilzee/dms-v4`
   - **Branch:** `master`
   - **Build Path:** `/` (root)
   - **Dockerfile Path:** `./Dockerfile.production`
3. Enable **Auto-deploy** on push to `master`

### 4.2 Configure Environment Variables

Go to **drms-app → Environment** tab. Add ALL of these:

```env
# === CORE ===
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Disaster Response Management System (DRMS)
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_PWA_ENABLED=true

# === DATABASE ===
# Use the connection string from Step 2 (Dokploy managed PostgreSQL)
DATABASE_URL=postgresql://drms_user:YOUR_DB_PASSWORD@drms-postgres:5432/drms_prod?schema=public

# === AUTH ===
# Generate: openssl rand -base64 64
JWT_SECRET=YOUR_64_CHAR_JWT_SECRET
JWT_EXPIRES_IN=24h
# Generate: openssl rand -base64 32
NEXTAUTH_SECRET=YOUR_32_CHAR_NEXTAUTH_SECRET
NEXTAUTH_URL=https://your-drms-domain.com
NEXT_PUBLIC_API_URL=https://your-drms-domain.com/api

# === REDIS ===
REDIS_URL=redis://redis:6379
REDIS_ENABLED=true

# === MINIO / S3 ===
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=YOUR_MINIO_ROOT_USER
S3_SECRET_KEY=YOUR_MINIO_ROOT_PASSWORD
S3_BUCKET=dms-storage
S3_REGION=us-east-1
S3_ENABLED=true

# === EMAIL (optional — enable when ready) ===
EMAIL_ENABLED=false
EMAIL_PROVIDER=resend
RESEND_API_KEY=
SENDGRID_API_KEY=
EMAIL_FROM_ADDRESS=noreply@your-domain.com
EMAIL_FROM_NAME=DRMS

# === SENTRY (optional — enable when ready) ===
SENTRY_ENABLED=false
SENTRY_DSN=

# === EXTERNAL S3 BACKUP (optional) ===
BACKUP_S3_ENABLED=false
BACKUP_S3_ENDPOINT=
BACKUP_S3_ACCESS_KEY=
BACKUP_S3_SECRET_KEY=
BACKUP_S3_BUCKET=
BACKUP_S3_REGION=

# === SECURITY ===
ENABLE_SECURITY_HEADERS=true
```

### 4.3 Configure Build

1. Go to **drms-app → Settings → General**
2. Verify:
   - **Build type:** Dockerfile
   - **Dockerfile path:** `./Dockerfile.production`
   - No custom build args needed (DATABASE_URL has a default in the Dockerfile for `prisma generate`)

### 4.4 Configure Health Check

Dokploy may auto-detect the HEALTHCHECK from the Dockerfile. If not, configure:

1. Go to **drms-app → Settings → Health Check** (or Advanced)
2. Set:
   - **Path:** `/api/health`
   - **Port:** `3000`
   - **Interval:** 30s
   - **Timeout:** 10s
   - **Start period:** 60s (important — gives time for Prisma migrations)

---

## Step 5: Ensure Docker Network Connectivity

All services must be on the same Docker network. In Dokploy v0.26.5:

1. Go to **drms-v2 project → Settings** (or Networks section)
2. Note the project's Docker network name (e.g., `drms-v2_abc123`)
3. Ensure the **Compose** (Redis + MinIO), **Database**, and **Application** are all on this network

**Troubleshooting connectivity:**
```bash
# SSH into VPS
ssh root@your-vps

# Check networks
docker network ls | grep drms

# Inspect the app container
docker inspect <app-container-id> | grep -A 20 Networks

# Test from app container
docker exec -it <app-container-id> wget -qO- http://minio:9000/minio/health/live
docker exec -it <app-container-id> wget -qO- redis:6379
```

If the app can't reach Redis or MinIO, you need to connect them to the same network:
```bash
# Find the network
docker network ls

# Connect containers
docker network connect <network-name> <redis-container-id>
docker network connect <network-name> <minio-container-id>
```

---

## Step 6: Deploy the Application

1. Go to **drms-app → Deployments**
2. Click **"Deploy"** (or trigger via GitHub push)
3. Watch the **build logs** — you should see:
   ```
   ✓ Installing dependencies (pnpm install)
   ✓ Generating Prisma client
   ✓ Building Next.js (output: standalone)
   ✓ Copying static assets
   ✓ HEALTHCHECK configured
   ```
4. First startup will take 1-3 minutes (Prisma migrations + Next.js compilation)
5. Check **runtime logs** — you should see:
   ```
   === Starting DRMS Application ===
   === Checking Prisma Client ===
   ✅ Prisma client found
   === Running Database Migrations ===
   ✅ Migrations completed successfully
   === Starting Next.js Server ===
   ✓ Ready in http://localhost:3000
   ```

---

## Step 7: Configure Domain & HTTPS

1. Go to **drms-app → Domains**
2. Click **"Add Domain"**
3. Enter your domain: `drms.yourdomain.com` (or subdomain)
4. Port: `3000`
5. Enable **HTTPS** (Let's Encrypt — automatic)
6. Click **Create**

Dokploy will:
- Configure Traefik routing
- Generate SSL certificate via Let's Encrypt
- Set up HTTP → HTTPS redirect
- Auto-renew certificates

**Update these env vars after domain is set:**
```env
NEXTAUTH_URL=https://drms.yourdomain.com
NEXT_PUBLIC_API_URL=https://drms.yourdomain.com/api
```
Then redeploy.

---

## Step 8: Verify the Deployment

### 8.1 Health Check
```bash
curl https://drms.yourdomain.com/api/health
# Expected: {"status":"ok","timestamp":"...","uptime":...,"environment":"production"}
```

### 8.2 Login Test
1. Navigate to `https://drms.yourdomain.com/login`
2. Login with admin credentials
3. Verify dashboard loads
4. Test a few key flows (create incident, view map, etc.)

### 8.3 Service Connectivity
1. **Redis:** Check app logs for Redis connection messages
2. **MinIO:** Try uploading a file (e.g., profile picture or incident attachment)
3. **Database:** Verify data persists across page loads

### 8.4 PWA Test
1. Open in Chrome on mobile
2. Check for "Install app" prompt
3. Verify service worker registration in DevTools

---

## Step 9: Post-Deployment Configuration

### 9.1 Database Backups

Dokploy managed PostgreSQL has built-in backup options:
1. Go to **drms-postgres → Backups**
2. Configure:
   - **Frequency:** Daily
   - **Retention:** 7-30 days
   - **Destination:** Local or S3

For additional offsite backups using MinIO, the `start-with-migrations.sh` doesn't include
a backup sidecar (that's in `docker-compose.production.yml` which we're not using directly).
You can set up a cron job on the VPS:

```bash
# SSH into VPS, add cron job
crontab -e
# Add: Daily at 2 AM UTC
0 2 * * * docker exec drms-postgres pg_dump -U drms_user drms_prod | gzip > /backups/drms_$(date +\%Y\%m\%d).sql.gz
```

Or configure the external S3 backup env vars and redeploy.

### 9.2 Enable Sentry (Optional)
1. Create account at https://sentry.io (free tier: 5K events/month)
2. Create a new Next.js project
3. Copy the DSN
4. Update env vars:
   ```env
   SENTRY_ENABLED=true
   SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
   ```
5. Redeploy

### 9.3 Enable Email (Optional)
1. Create account at https://resend.com (free: 100 emails/day)
2. Add and verify your domain
3. Create API key
4. Update env vars:
   ```env
   EMAIL_ENABLED=true
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxxxxx
   EMAIL_FROM_ADDRESS=noreply@your-domain.com
   EMAIL_FROM_NAME=DRMS
   ```
5. Redeploy

---

## Step 10: GitHub Auto-Deploy Setup

Dokploy v0.26.5 supports GitHub webhooks for automatic deployment:

1. Go to **drms-app → Settings → Git**
2. Copy the webhook URL shown
3. In GitHub, go to `https://github.com/bilzee/dms-v4/settings/hooks`
4. Click **"Add webhook"**
5. Configure:
   - **Payload URL:** Paste the Dokploy webhook URL
   - **Content type:** `application/json`
   - **Secret:** (Dokploy provides this, if applicable)
   - **Events:** Just the push event → Branch filter: `master`
6. Click **Add webhook**

Now every `git push origin master` will trigger:
1. Dokploy pulls latest code
2. Builds new Docker image from `Dockerfile.production`
3. Runs Prisma migrations (`start-with-migrations.sh`)
4. Starts new container
5. Health check verifies `/api/health`
6. Traffic routes to new container

---

## Architecture Summary

| Component | Type | Accessible From |
|---|---|---|
| **Next.js App** | Application | External (via Traefik/domain) |
| **PostgreSQL** | Managed Database | Internal only (app, backups) |
| **Redis** | Compose service | Internal only (app) |
| **MinIO** | Compose service | Internal only (app) |
| **MinIO Console** | Compose service | Internal only (optional: expose via domain) |
| **Traefik** | Dokploy built-in | Ports 80, 443 |

### Resource Estimates (4-8 GB RAM VPS)

| Service | Memory Limit |
|---|---|
| Next.js App | 1 GB |
| PostgreSQL | 512 MB (Dokploy default) |
| Redis | 300 MB |
| MinIO | 512 MB |
| **Total DRMS v2** | **~2.3 GB** |
| **+ Old v1** | **~1 GB** |
| **+ Dokploy** | **~500 MB** |
| **Total VPS** | **~3.8 GB** |

Fits comfortably in 4 GB RAM. 8 GB recommended for production headroom.

---

## Troubleshooting

### Build Fails: "pnpm-lock.yaml not found"
The `pnpm-lock.yaml` is in the repo. If missing:
```bash
# Locally
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: ensure pnpm-lock.yaml"
git push
```

### App Can't Connect to Database
```bash
# Check DATABASE_URL format — must use Docker internal hostname
# Correct:   postgresql://drms_user:pass@drms-postgres:5432/drms_prod
# Wrong:     postgresql://drms_user:pass@localhost:5432/drms_prod
# Wrong:     postgresql://drms_user:pass@127.0.0.1:5432/drms_prod
```

### App Can't Connect to Redis
```bash
# Ensure Redis container is on the same Docker network
docker network connect <project-network> <redis-container>

# Test from app container
docker exec -it <app-container> wget -qO- redis:6379
```

### App Can't Connect to MinIO
```bash
# Same network fix as Redis
docker network connect <project-network> <minio-container>

# Test from app container
docker exec -it <app-container> wget --spider http://minio:9000/minio/health/live
```

### Prisma Migration Fails
```bash
# Check if migrations directory exists in the Docker image
docker exec -it <app-container> ls -la prisma/migrations/

# If migrations are missing, the Dockerfile may not have copied them
# The Dockerfile has: COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Check: docker exec -it <app-container> ls -la prisma/

# Manual migration if needed
docker exec -it <app-container> npx prisma migrate deploy
```

### Container Crash Loop
```bash
# Check logs
docker logs <app-container> --tail 100

# Common causes:
# 1. Missing env vars → check all are set in Dokploy
# 2. Database unreachable → check network, DATABASE_URL
# 3. Port conflict → app should use 3000 (default)
# 4. Out of memory → increase container memory limit
```

### MinIO Console Access (Optional)
If you need browser access to MinIO Console:
1. Go to **drms-services → Domains** (in Compose settings)
2. Add domain for the MinIO service, port 9001
3. Access at `https://minio.yourdomain.com`
4. Login with MINIO_ROOT_USER / MINIO_ROOT_PASSWORD

---

## Migration from v1 (When Ready)

When you're ready to decommission the old deployment:

1. **Export data from v1:**
   ```bash
   docker exec <v1-postgres> pg_dump -U <v1-user> <v1-db> > drms_v1_export.sql
   ```

2. **Import into v2:**
   ```bash
   # Option A: Via Dokploy database terminal
   cat drms_v1_export.sql | docker exec -i <v2-postgres> psql -U drms_user drms_prod
   
   # Option B: Via Prisma
   # Be careful with schema conflicts — v2 may have new tables/columns
   ```

3. **Update DNS:** Point domain to v2's Dokploy domain

4. **Decommission v1:** Delete old project in Dokploy dashboard

**Caution:** Only migrate data if the v1 and v2 schemas are compatible. Check the Prisma migration history.

---

## Quick Reference: Files in the Repo

| File | Purpose |
|---|---|
| `Dockerfile.production` | Multi-stage build (deps → build → runtime) |
| `docker-compose.production.yml` | Full standalone stack (NOT used with Dokploy — reference only) |
| `start-with-migrations.sh` | Entrypoint: runs Prisma migrations then `node server.js` |
| `.env.production.template` | Template for all env vars |
| `.dockerignore` | Excludes tests, docs, env files from Docker build |
| `next.config.js` | Has `output: 'standalone'` for Docker deployment |
| `prisma/migrations/` | Database migration files (auto-applied on startup) |
| `src/app/api/health/route.ts` | Health check endpoint for container monitoring |

---

*Last updated: June 2025*
*Tested with: Dokploy v0.26.5, Next.js 14.2.5, Node.js 18, PostgreSQL 15, Redis 7, MinIO latest*
*Repository: https://github.com/bilzee/dms-v4*
