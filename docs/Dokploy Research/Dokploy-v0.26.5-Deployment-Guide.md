# DRMS Deployment Guide: Dokploy v0.26.5 + Hostinger VPS

## **Updated Deployment Strategy for Disaster Response Management System**

### **Phase 1: Infrastructure Preparation**

#### **1.1 Hostinger VPS Setup**
```yaml
VPS Requirements (Verified Compatible):
  Plan: KVM 2
  Specifications:
    - 2 vCPU (meets Dokploy minimum)
    - 8 GB RAM (exceeds Dokploy 2GB requirement)
    - 100 GB NVMe SSD (exceeds Dokploy 30GB requirement)
    - 8 TB bandwidth
    - Intel Xeon/AMD Epyc processors
    - Ubuntu 22.04 LTS (recommended)
  
Cost: $6.99/month (promotional) → $12.99/month (renewal)
```

#### **1.2 Domain & DNS Configuration**
```yaml
Domain Setup:
  Option 1: Use Hostinger domain registration
  Option 2: External domain (Cloudflare/Namecheap)
  
DNS Records Required:
  A Record: drms.yourdomain.com → VPS IP address
  CNAME: www.drms.yourdomain.com → drms.yourdomain.com
```

### **Phase 2: Server Setup & Dokploy Installation**

#### **2.1 Initial Server Configuration**
```bash
# Connect to VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Configure firewall (UFW)
ufw enable
ufw allow 22    # SSH
ufw allow 80    # HTTP (Traefik)
ufw allow 443   # HTTPS (Traefik)

# Install essential packages
apt install -y curl wget git htop
```

#### **2.2 Dokploy v0.26.5 Installation**
```bash
# Run Dokploy installation script
curl -sSL https://dokploy.com/install.sh | sh

# Wait for installation to complete
# Docker will be automatically installed if not present

# Verify installation
docker --version
systemctl status docker
```

### **Phase 3: DRMS Application Deployment (Updated v0.26.5 Workflow)**

#### **3.1 GitHub Repository Setup**
```yaml
Prerequisites:
1. DRMS repository on GitHub
2. Repository access: Public or private with proper credentials
3. Dockerfile verification: Ensure Dockerfile.production works correctly

GitHub Integration in Dokploy v0.26.5:
1. Navigate to: Settings → Git Sources
2. Click "Add GitHub Provider"
3. Configure GitHub Personal Access Token or SSH key
4. Test connection to verify access
```

#### **3.2 Database Creation in Dokploy v0.26.5**
```yaml
Database Setup:
1. Navigate to: Dashboard → Databases tab
2. Click "Create Database" button
3. Configure database:
   - Name: drms_production
   - Type: PostgreSQL (recommended: version 15)
   - Username: drms_user
   - Password: (generate secure password)
4. Click "Create Database"

Database Configuration:
  - Automatic backups enabled by default
  - Internal Docker network access
  - Connection details available in database dashboard
```

#### **3.3 Application Deployment in Dokploy v0.26.5**
```yaml
Create New Application:
1. Navigate to: Dashboard → Applications tab
2. Click "Create Application" button
3. Choose deployment type:
   - Select "Application" (not Docker Compose)
4. Configure basic settings:
   - Application Name: drms-production
   - Description: Disaster Response Management System

Source Configuration:
1. In application dashboard → Settings tab
2. Configure Git Source:
   - Provider: GitHub
   - Repository: select your DRMS repository
   - Branch: main (or master)
   - Build Context: /
   - Dockerfile Path: ./Dockerfile.production
3. Set deployment triggers:
   - Enable auto-deploy on push to main branch

Environment Variables (Press g+e keyboard shortcut):
1. Navigate to: Environment tab
2. Add required variables:
   - NODE_ENV: production
   - DATABASE_URL: postgresql://drms_user:password@drms_production:5432/drms_production
   - JWT_SECRET: (generate 64-character secret)
   - NEXTAUTH_SECRET: (generate 32-character secret)
   - NEXTAUTH_URL: https://drms.yourdomain.com
   - NEXT_PUBLIC_API_URL: https://drms.yourdomain.com/api
   - NEXT_PUBLIC_APP_NAME: "Disaster Response Management System (DRMS)"
   - NEXT_PUBLIC_PWA_ENABLED: true
3. Use multiline format for complex variables if needed
```

### **Phase 4: Database Migration & Setup**

#### **4.1 Prisma Database Migration**
```yaml
Migration Strategy:
1. Database Connection Verification:
   - Use Dokploy terminal in application dashboard
   - Verify DATABASE_URL environment variable is set correctly

2. Run Migrations:
   - Navigate to: Application → Terminal tab
   - Execute: npx prisma migrate deploy
   - Verify: Check database tables created successfully

3. Seed Initial Data (if available):
   - Run: npm run db:seed
   - Create initial admin user
   - Set up basic system configuration
```

### **Phase 5: Domain & SSL Configuration in Dokploy v0.26.5**

#### **5.1 Domain Configuration**
```yaml
Domain Setup (Press g+u keyboard shortcut):
1. Navigate to: Domains tab in application dashboard
2. Click "Add Domain" button
3. Configure domain:
   - Domain: drms.yourdomain.com
   - Port: 3000 (default Next.js port)
   - Enable HTTPS: Yes (recommended)
4. Click "Create Domain"

HTTPS Configuration:
1. Let's Encrypt integration is automatic
2. SSL certificate auto-generated
3. HTTP to HTTPS redirection enabled by default
4. Certificate auto-renewal managed by Dokploy
```

#### **5.2 Traefik Reverse Proxy**
```yaml
Traefik Integration (Automatic):
1. Dokploy uses Traefik as reverse proxy
2. Automatic routing configuration based on domain settings
3. Load balancing for multiple instances (if configured)
4. WebSocket support for Next.js hot reload (development)

Traefik Dashboard (Optional):
1. Access via Dokploy main dashboard
2. View routing rules and middleware
3. Monitor SSL certificate status
4. Check proxy health status
```

### **Phase 6: Monitoring & Backup Strategy**

#### **6.1 Health Monitoring**
```yaml
Built-in Health Checks:
1. Navigate to: Application → Monitoring tab
2. Health check endpoint: /api/health (already implemented)
3. Container status monitoring
4. Resource usage tracking (CPU, Memory, Disk)
5. Application uptime tracking

Health Check Configuration:
- Interval: 30 seconds
- Timeout: 10 seconds
- Start period: 60 seconds (grace period for migrations)
- Retries: 3 before marking unhealthy
```

#### **6.2 Backup Configuration**
```yaml
Database Backups:
1. Navigate to: Database → Backups tab
2. Configure automatic backups:
   - Frequency: Daily (recommended)
   - Retention: 7 days (adjustable)
   - Storage: Local (included with Dokploy)
3. Optional: Configure S3-compatible storage:
   - DigitalOcean Spaces
   - AWS S3
   - Backblaze B2

Application Backups:
- Volume backups for uploaded files
- Configuration backups (environment variables)
- Manual backup creation available
```

### **Phase 7: CI/CD Pipeline & Automation**

#### **7.1 Automatic Deployment Setup**
```yaml
Webhook Configuration:
1. In GitHub repository settings
2. Add webhook: https://your-vps-ip:3000/api/webhooks/github
3. Configure events:
   - Push to main branch
   - Pull request (optional)
4. Test webhook with test trigger

Deployment Process:
1. Push to main branch → Automatic deployment
2. GitHub webhook notifies Dokploy
3. Dokploy pulls latest code
4. Builds new Docker image
5. Deploys new container
6. Health checks verify deployment
7. Traffic switched to new container
```

#### **7.2 Build Optimization**
```yaml
Build Configuration:
1. Build Type: Dockerfile
2. Build Args (auto-configured):
   - NODE_ENV=production
   - NEXT_TELEMETRY_DISABLED=1
3. Build caching: Automatic layer caching
4. Multi-stage build: Already configured in Dockerfile.production

Deployment Logs:
1. Navigate to: Application → Logs tab
2. Real-time build logs
3. Application runtime logs
4. Error filtering and search
```

### **Phase 8: Production Hardening & Security**

#### **8.1 Security Configuration**
```yaml
Security Measures:
1. Disable direct port 3000 access (use domain only)
2. Configure firewall rules in Hostinger panel
3. Enable HTTPS only (already configured)
4. Environment variable security:
   - Never commit secrets to git
   - Use Dokploy's encrypted environment storage
   - Rotate secrets regularly

Application Security:
- JWT authentication implementation
- Database connection encryption
- Security headers configured in Next.js
- Rate limiting on API endpoints
```

#### **8.2 Performance Optimization**
```yaml
Performance Tuning:
1. Resource allocation:
   - Container memory limit: 1GB (adjustable)
   - Container CPU limit: 0.5 cores (adjustable)
2. Database optimization:
   - Connection pooling configured in Prisma
   - Query optimization with indexes
3. Static file caching:
   - Next.js built-in optimization
   - CDN configuration (optional)
4. PWA optimization:
   - Offline functionality
   - Service worker caching strategy
```

### **Phase 9: Deployment Execution Timeline**

```yaml
Estimated Timeline:
Day 1: Infrastructure Setup (1-2 hours)
  - Hostinger VPS provisioning
  - Domain registration/configuration
  - Initial server setup

Day 2: Dokploy Installation (1 hour)
  - Dokploy v0.26.5 installation
  - Initial configuration
  - Security setup

Day 3: Application Deployment (2-3 hours)
  - Database setup in Dokploy
  - Application deployment
  - Environment configuration
  - Database migrations

Day 4: Domain & SSL Setup (30 minutes)
  - Domain configuration in Dokploy
  - SSL certificate auto-generation
  - DNS propagation verification

Day 5: Testing & Optimization (1-2 hours)
  - Functionality testing
  - Performance monitoring
  - Backup verification

Total Estimated Time: 5-9 hours over 5 days
```

### **Phase 10: Post-Deployment Checklist**

```yaml
Verification Steps:
✅ Application accessible via HTTPS
✅ Database migrations successful
✅ All environment variables configured
✅ PWA installation working
✅ Offline functionality operational
✅ CI/CD pipeline functional
✅ Automatic backups running
✅ Health monitoring active
✅ SSL certificate valid and auto-renewing

Performance Validation:
✅ Page load times < 3 seconds
✅ API response times < 500ms
✅ Health endpoint responding correctly
✅ Container stable without crashes
✅ Memory usage stable

Security Validation:
✅ No exposed ports except 80/443
✅ All secrets stored in environment variables
✅ HTTPS enforced with valid certificate
✅ Database not publicly accessible
```

## **Key Differences from Previous Dokploy Versions**

### **v0.26.5 Interface Updates**
```yaml
Navigation Changes:
- Keyboard shortcuts: g+e (environment), g+u (domains), g+d (dashboard)
- Tab-based navigation instead of sidebar
- Real-time build logs in terminal tab
- One-click domain creation with auto SSL

Database Management:
- Built-in database creation (no external services needed)
- Automatic backup configuration
- Internal Docker networking
- Connection string auto-generation

Deployment Process:
- Simplified GitHub integration
- Automatic environment variable suggestions
- Health check monitoring built-in
- One-command SSL certificate generation
```

## **Cost-Benefit Analysis**

### **Total Cost Breakdown**
```yaml
Monthly Costs:
- Hostinger VPS KVM2: $12.99/month
- Domain registration: $10-15/year (~$1/month)
- SSL certificate: Free (Let's Encrypt)
- Dokploy license: Free (open source)
Total: ~$14/month

Annual Savings vs Alternatives:
- vs DigitalOcean App Platform: $780-1,320 saved/year
- vs AWS/Google Cloud: $600-1,000 saved/year
- vs Vercel Pro: $240-480 saved/year
```

### **Key Advantages**
```yaml
Technical Benefits:
✅ 5-40 second deployments
✅ Built-in PostgreSQL database
✅ Modern web interface with keyboard shortcuts
✅ Automatic SSL certificate management
✅ Complete data sovereignty for humanitarian operations
✅ Offline-capable deployment for remote disaster areas
✅ Zero vendor lock-in (open source platform)

Operational Benefits:
✅ 65-85% cost reduction vs managed platforms
✅ Professional management UI without premium cost
✅ Built-in CI/CD with GitHub integration
✅ Automated backup system
✅ Comprehensive monitoring and alerting
✅ Multi-server support for scaling
```

## **Troubleshooting Guide**

### **Common Issues & Solutions**

#### **Deployment Failures**
```yaml
Issue: Build fails during deployment
Solutions:
1. Check build logs in Application → Logs tab
2. Verify Dockerfile.production is valid
3. Check environment variables are set correctly
4. Ensure GitHub repository is accessible
5. Verify build context and Dockerfile path are correct
```

#### **Database Connection Issues**
```yaml
Issue: Application cannot connect to database
Solutions:
1. Verify DATABASE_URL environment variable format
2. Check database is running in Dokploy dashboard
3. Ensure both are on same Docker network
4. Test connection using application terminal
5. Verify database credentials are correct
```

#### **SSL Certificate Issues**
```yaml
Issue: HTTPS not working or certificate errors
Solutions:
1. Verify DNS propagation is complete (may take 24-48 hours)
2. Check domain is correctly pointed to VPS IP
3. Ensure ports 80 and 443 are open in firewall
4. Check Traefik logs for certificate generation errors
5. Try recreating domain in Dokploy interface
```

#### **Container Crashes**
```yaml
Issue: Application container keeps restarting
Solutions:
1. Check application logs for crash reasons
2. Verify environment variables are set correctly
3. Ensure database migrations ran successfully
4. Check health endpoint is accessible
5. Verify file permissions (should be nextjs:nodejs)
6. Check resource limits (memory/CPU)
```

## **Emergency Procedures**

### **Disaster Recovery**
```yaml
Backup Restoration:
1. Database: Database → Backups → Select backup → Restore
2. Application: Application → Settings → Rollback to previous deployment
3. VPS: Hostinger snapshot restoration (contact support)

System Recovery:
1. VPS snapshot restoration (Hostinger control panel)
2. Dokploy reinstallation: curl -sSL https://dokploy.com/install.sh | sh
3. Application redeployment from GitHub
4. Database restoration from automatic backups
```

### **Health Check Monitoring**
```yaml
Application Health:
- Endpoint: /api/health
- Response: { status: 'ok', timestamp: '...', uptime: ..., environment: '...' }
- Monitoring: Automatic in Dokploy dashboard
- Alerts: Configure notification webhooks

Container Health:
- Docker health check: wget --spider http://localhost:3000/api/health
- Interval: 30 seconds
- Grace period: 60 seconds (for database migrations)
- Restart policy: Always restart on failure
```

## **Success Criteria**

### **Deployment Success Indicators**
```yaml
Build Success:
✅ "✓ Compiled successfully" in build logs
✅ "Ready in 95ms" or similar message
✅ No database connection errors during build
✅ Standalone build generated correctly
✅ All files copied with proper permissions

Runtime Success:
✅ Container starts without crashes
✅ Health endpoint responds with 200 OK
✅ Application accessible via HTTPS domain
✅ Database migrations completed successfully
✅ No continuous restart loops
✅ Stable operation for 5+ hours
```

---

**This deployment guide is specifically updated for Dokploy v0.26.5 and reflects the current user interface and workflow as of 2025.** 

*Last updated: January 2025*  
*Tested with: Dokploy v0.26.5, Next.js 14.2.5, Node.js 18, PostgreSQL 15*  
*Deployment cost: $14/month*  
*Estimated savings: $780-1,320/year vs alternatives*