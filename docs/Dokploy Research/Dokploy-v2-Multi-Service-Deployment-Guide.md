# DRMS v2 — Multi-Service Deployment Guide for Dokploy v0.26.5

## Overview

This guide deploys the **current version** of DRMS (with Redis, MinIO, Sentry, email, and S3 backup)
alongside the existing v1 deployment on the same Dokploy instance, as a **separate project**.

```
┌──────────────────────────────────────────────────────┐
│  Dokploy v0.26.5 (Your Existing Instance)            │
│                                                       │
│  ┌───────────────┐    ┌────────────────────────────┐ │
│  │  OLD PROJECT   │    │  NEW PROJECT (drms-v2)     │ │
│  │  (untouched)   │    │                             │ │
│  │  drms-v1 app   │    │  Application: drms-app      │ │
│  │  postgres-v1   │    │  ├─ Next.js :3000           │ │
│  │                │    │  └─ Health /api/health       │ │
│  └───────────────┘    │                             │ │
│                        │  Database: drms-postgres     │ │
│                        │  └─ PostgreSQL 15 (managed)  │ │
│                        │                             │ │
│                        │  Compose: drms-services      │ │
│                        │  ├─ Redis :6379              │ │
│                        │  └─ MinIO :9000 / :9001      │ │
│                        └────────────────────────────┘ │
│                                                       │
│  Dokploy Traefik handles 80/443 + Let's Encrypt      │
└──────────────────────────────────────────────────────┘
```

**Dokploy resource types used:**

| Resource | Dokploy Type | Purpose |
|---|---|---|
| PostgreSQL | **Database** (managed) | Built-in backups, auto connection string |
| Redis + MinIO | **Docker Compose** | Dokploy has no managed Redis/MinIO |
| Next.js App | **Application** | GitHub integration, auto-deploy, Dockerfile build |

**Important:** All resources within a Dokploy project share the same Docker network automatically.
No manual network configuration needed — services reference each other by name (e.g., `redis`, `minio`, `drms-postgres`).

---

## Pre-Deployment Checklist

- [ ] Dokploy v0.26.5 running and accessible at your dashboard URL
- [ ] GitHub repo `https://github.com/bilzee/dms-v4` is accessible
- [ ] DNS configured: A record for your domain → VPS IP
- [ ] You have the `.env.production.template` values ready to fill in
- [ ] The old DRMS v1 project is running and untouched

---

## Step 1: Create a New Project

1. Open your Dokploy dashboard
2. Click **"Add Project"** (or the **"+"** button)
3. Name it: **`drms-v2`**
4. Click **Create**

The old project remains completely isolated. You now have a blank project with empty sections for Applications, Databases, and Docker Compose.

---

## Step 2: Create PostgreSQL Database (Managed)

1. In the `drms-v2` project, click **"Databases"** in the sidebar
2. Click **"Create Database"**
3. Fill in the form:
   - **Name:** `drms-postgres`
   - **Image:** `postgres:15-alpine` (set in Advanced tab → Custom Docker Image)
   - **Username:** `drms_user`
   - **Password:** generate a strong password — save this!
   - **Database Name:** `drms_prod`
4. Click **Create**
5. **CRITICAL — you must now deploy it:**
   - You are taken to the database detail page
   - Click **"Deploy"** (or the play button) on the **General** tab
   - Wait for status to change to **"Running"**
   - The "No such container: select-a-container" error means you skipped this step
6. Once running, click the **"Connection"** tab to see your internal connection string:
   ```
   postgresql://drms_user:<password>@drms-postgres:5432/drms_prod
   ```
   Copy this — it's your `DATABASE_URL` for the app env vars.

### Database Tabs Reference

| Tab | What it does |
|---|---|
| **General** | Deploy, stop, restart, delete the database |
| **Environment** | Set env vars for the DB container |
| **Logs** | View container logs |
| **Monitoring** | CPU, memory, disk graphs |
| **Backups** | Configure automated backups (local or S3) |
| **Advanced** | Custom Docker image, volumes, resource limits |

---

## Step 3: Create Docker Compose for Redis + MinIO

1. In the `drms-v2` project, click **"Docker Compose"** in the sidebar
2. Click **"Create Compose"**
3. Name it: **`drms-services`**
4. Paste this compose file into the editor:

```yaml
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    env_file:
      - .env
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
      - dokploy-network

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    env_file:
      - .env
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
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
      - dokploy-network

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    restart: "no"
    env_file:
      - .env
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 $${MINIO_ROOT_USER} $${MINIO_ROOT_PASSWORD};
      mc mb myminio/dms-storage --ignore-existing;
      mc mb myminio/db-backups --ignore-existing;
      echo 'MinIO buckets ready: dms-storage, db-backups';
      "
    networks:
      - dokploy-network

volumes:
  redis_data:
    driver: local
  minio_data:
    driver: local

networks:
  dokploy-network:
    external: true
    name: dokploy-network
```

> **CRITICAL — Before pasting, replace these values directly in the compose file:**
> - Replace `MINIO_USER_REPLACE_ME` with a generated username (e.g., `openssl rand -hex 8`)
> - Replace `MINIO_PASS_REPLACE_ME` with a generated password (e.g., `openssl rand -base64 24`)
> - **Save these values** — you'll need them for the app env vars (`S3_ACCESS_KEY` / `S3_SECRET_KEY`)
>
> We hardcode credentials directly in the compose file because Dokploy's `.env` file handling for compose
> can be unreliable. This is more reliable than variable substitution.

> **IMPORTANT — Network:** The compose MUST join `dokploy-network` (the shared Dokploy network).
> Without this, compose services create their own isolated network and the app/database can't reach them.
> If the deploy fails with "network dokploy-network not found", SSH into your VPS and run `docker network ls`
> to find the exact Dokploy network name, then update the `name:` field accordingly.

6. Click **"Deploy"** on the General tab
7. Wait for all services to show **"Running"**
8. Check **Logs** tab to verify:
   - Redis: "Ready to accept connections"
   - MinIO: "MinIO API endpoint listening"
   - minio-init: "Buckets ready: dms-storage, db-backups" (then exits — this is normal)

### Compose Tabs Reference

| Tab | What it does |
|---|---|
| **General** | Deploy, stop, delete the compose stack |
| **Environment** | Edit `.env` file (variables available as `${VAR}` in compose) |
| **Domains** | Add domains per service (e.g., for MinIO Console) |
| **Logs** | Per-service logs (dropdown to select service) |
| **Monitoring** | Per-service CPU/memory graphs |
| **Advanced** | Volumes, resource limits |

---

## Step 4: Create the Application

1. In the `drms-v2` project, click **"Applications"** in the sidebar
2. Click **"Create Application"**
3. Choose type: **Application** (not Docker Compose)
4. Name it: **`drms-app`**

### 4.1 Configure Git Source

1. Go to **drms-app → General** tab
2. Under **Source**, configure:
   - **Provider:** GitHub (select your connected GitHub account)
   - **Repository:** `bilzee/dms-v4`
   - **Branch:** `master`
   - **Build Path:** `/`
3. Under **Build Type** (sub-page or section):
   - **Type:** Dockerfile
   - **Dockerfile Path:** `./Dockerfile.production`
4. Toggle **Auto-deploy** ON (deploys automatically on push to master)

### 4.2 Configure Environment Variables

Go to **drms-app → Environment** tab. Add ALL of these:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Disaster Response Management System (DRMS)
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_PWA_ENABLED=true
DATABASE_URL=postgresql://drms_user:YOUR_DB_PASSWORD@drms-postgres:5432/drms_prod?schema=public
JWT_SECRET=YOUR_64_CHAR_JWT_SECRET
JWT_EXPIRES_IN=24h
NEXTAUTH_SECRET=YOUR_32_CHAR_NEXTAUTH_SECRET
NEXTAUTH_URL=https://your-drms-domain.com
NEXT_PUBLIC_API_URL=https://your-drms-domain.com/api
REDIS_URL=redis://redis:6379
REDIS_ENABLED=true
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=YOUR_MINIO_ROOT_USER
S3_SECRET_KEY=YOUR_MINIO_ROOT_PASSWORD
S3_BUCKET=dms-storage
S3_REGION=us-east-1
S3_ENABLED=true
EMAIL_ENABLED=false
EMAIL_PROVIDER=resend
RESEND_API_KEY=
SENDGRID_API_KEY=
EMAIL_FROM_ADDRESS=noreply@your-domain.com
EMAIL_FROM_NAME=DRMS
SENTRY_ENABLED=false
SENTRY_DSN=
BACKUP_S3_ENABLED=false
BACKUP_S3_ENDPOINT=
BACKUP_S3_ACCESS_KEY=
BACKUP_S3_SECRET_KEY=
BACKUP_S3_BUCKET=
BACKUP_S3_REGION=
ENABLE_SECURITY_HEADERS=true
```

Replace these placeholders:
- `YOUR_DB_PASSWORD` — from Step 2
- `YOUR_64_CHAR_JWT_SECRET` — generate with `openssl rand -base64 64`
- `YOUR_32_CHAR_NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `YOUR_MINIO_ROOT_USER` / `YOUR_MINIO_ROOT_PASSWORD` — from Step 3
- `your-drms-domain.com` — your actual domain (can update after domain setup)

### 4.3 Configure Resource Limits (Optional)

Go to **drms-app → Advanced → Resources**:
- **Memory limit:** 1 GB recommended
- **CPU limit:** 0.5 cores minimum

### 4.4 Deploy the Application

1. Go to **drms-app → General** tab
2. Click **"Deploy"**
3. Watch the **Logs** tab — build phase shows:
   ```
   ✓ Installing dependencies (pnpm install)
   ✓ Generating Prisma client (npx prisma generate)
   ✓ Building Next.js (pnpm run build:production)
   ✓ Copying standalone output + static assets
   ```
4. After build, the container starts. Runtime logs show:
   ```
   === Starting DRMS Application ===
   === Checking Prisma Client ===
   ✅ Prisma client found
   === Running Database Migrations ===
   ✅ Migrations completed successfully
   === Starting Next.js Server ===
   ✓ Ready in http://localhost:3000
   ```
5. First deployment takes 2-5 minutes (build + Prisma migrations + startup)

> **The Dockerfile already has a HEALTHCHECK** that probes `/api/health` every 30s.
> Dokploy will show the health status on the General tab.

---

## Step 5: Configure Domain & HTTPS

1. Go to **drms-app → Domains** tab
2. Click **"Add Domain"**
3. Configure:
   - **Host:** `drms.yourdomain.com` (your actual domain or subdomain)
   - **Container Port:** `3000`
   - **HTTPS:** Toggle ON
   - **Certificate:** Select `(letsencrypt)` for auto-SSL
4. Click **Create**

Dokploy automatically:
- Configures Traefik routing
- Generates Let's Encrypt SSL certificate
- Sets up HTTP → HTTPS redirect
- Handles certificate auto-renewal

5. **Update env vars** with the real domain:
   - Go to Environment tab
   - Update `NEXTAUTH_URL=https://drms.yourdomain.com`
   - Update `NEXT_PUBLIC_API_URL=https://drms.yourdomain.com/api`
6. **Redeploy** (General tab → Deploy) to pick up the new env vars

### Application Tabs Reference

| Tab | What it does |
|---|---|
| **General** | Source config, deploy button, stop, restart, delete |
| **Environment** | App env vars (KEY=VALUE format) |
| **Logs** | Build logs + runtime logs (dropdown to switch) |
| **Deployments** | Deployment history, webhook URL, cancel |
| **Domains** | Add/manage domains with HTTPS |
| **Monitoring** | CPU, memory, disk, network graphs |
| **Advanced** | Build Type, Resources, Volumes, Ports, Traefik config |

---

## Step 6: Verify Everything Works

### 6.1 Health Check
```bash
curl https://drms.yourdomain.com/api/health
# Expected: {"status":"ok",...}
```

### 6.2 Login Test
1. Open `https://drms.yourdomain.com/login`
2. Login with admin credentials
3. Verify dashboard loads

### 6.3 Service Connectivity
- **Redis:** Check app logs for Redis connection messages
- **MinIO:** Try uploading a file (incident attachment or profile picture)
- **Database:** Data persists across page reloads

### 6.4 PWA
1. Open in Chrome mobile
2. Look for "Install app" prompt
3. Check DevTools → Application → Service Workers

---

## Step 7: Optional Post-Deployment

### 7.1 Database Backups

1. Go to **drms-postgres → Backups** tab
2. Configure:
   - **Frequency:** Daily
   - **Retention:** 7-30 days
   - **Destination:** Local (default) or S3

### 7.2 Enable Sentry
1. Create account at https://sentry.io (free: 5K events/month)
2. Create Next.js project, copy DSN
3. Update env vars: `SENTRY_ENABLED=true`, `SENTRY_DSN=https://...`
4. Redeploy

### 7.3 Enable Email
1. Create account at https://resend.com (free: 100 emails/day)
2. Verify domain, create API key
3. Update env vars: `EMAIL_ENABLED=true`, `RESEND_API_KEY=re_...`
4. Redeploy

### 7.4 MinIO Console Access
1. Go to **drms-services → Domains** tab
2. Add domain for the `minio` service, port `9001`
3. Access at `https://minio-console.yourdomain.com`
4. Login with MINIO_ROOT_USER / MINIO_ROOT_PASSWORD

---

## Step 8: GitHub Auto-Deploy (Already Configured)

If you enabled Auto-deploy in Step 4.1, every `git push origin master` triggers:
1. Dokploy receives GitHub webhook
2. Pulls latest code
3. Builds new Docker image from `Dockerfile.production`
4. Deploys new container
5. Runs Prisma migrations (`start-with-migrations.sh`)
6. Health check verifies `/api/health`
7. Traffic routes to new container

To set up the GitHub webhook manually:
1. Go to **drms-app → Deployments** tab — copy the webhook URL
2. In GitHub: `https://github.com/bilzee/dms-v4/settings/hooks` → Add webhook
3. Payload URL: paste webhook URL
4. Content type: `application/json`
5. Events: Just push → Branch filter: `master`

---

## Troubleshooting

### "No such container: select-a-container"
**Cause:** Resource was created but never deployed.
**Fix:** Go to the resource → General tab → click **Deploy**.

### Build Fails: "pnpm-lock.yaml not found"
The `pnpm-lock.yaml` exists in the repo. If somehow missing:
```bash
pnpm install
git add pnpm-lock.yaml && git commit -m "chore: add lockfile" && git push
```

### App Can't Connect to Database
```
# WRONG:   postgresql://drms_user:pass@localhost:5432/drms_prod
# CORRECT: postgresql://drms_user:pass@drms-postgres:5432/drms_prod
```
Must use Docker internal hostname. Check Connection tab on the database for the exact string.

### App Can't Connect to Redis or MinIO
All project resources share a Docker network. If services can't reach each other:
```bash
# SSH into VPS and check
docker network ls | grep drms
docker inspect <app-container> | grep -A 10 Networks

# If not on same network, manually connect:
docker network connect <project-network> <container-name>
```

### Prisma Migration Fails
```bash
# Check if migrations exist in the container
docker exec -it <app-container> ls -la prisma/migrations/

# Run manually if needed
docker exec -it <app-container> npx prisma migrate deploy
```

### Container Crash Loop
```bash
docker logs <app-container> --tail 100
# Common: missing env vars, DB unreachable, out of memory
```

---

## Architecture Summary

| Component | Dokploy Type | Memory | Access |
|---|---|---|---|
| Next.js App | Application | 1 GB | External (domain) |
| PostgreSQL | Database (managed) | 512 MB | Internal only |
| Redis | Compose service | 300 MB | Internal only |
| MinIO | Compose service | 512 MB | Internal only |

**Total DRMS v2:** ~2.3 GB RAM (+ old v1 ~1 GB + Dokploy ~0.5 GB = ~3.8 GB total)
Fits in 4 GB VPS. 8 GB recommended for production headroom.

---

## Migration from v1 (When Ready)

```bash
# Export from v1
docker exec <v1-postgres> pg_dump -U <v1-user> <v1-db> > drms_v1_export.sql

# Import into v2
cat drms_v1_export.sql | docker exec -i <v2-postgres> psql -U drms_user drms_prod
```

Update DNS to point to v2 domain, then delete old project.

**Caution:** Only migrate if v1 and v2 schemas are compatible.

---

*Last updated: June 2025*
*Dokploy v0.26.5 · Next.js 14.2.5 · Node.js 18 · PostgreSQL 15 · Redis 7 · MinIO*
*Repo: https://github.com/bilzee/dms-v4*
