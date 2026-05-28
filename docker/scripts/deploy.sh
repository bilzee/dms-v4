#!/bin/bash
set -euo pipefail

# DRMS Production Deployment Script
# Usage: ./deploy.sh [command]
#
# Commands:
#   deploy     Build and start all services (default)
#   start      Start existing services (no rebuild)
#   stop       Stop all services
#   restart    Restart all services
#   status     Show service status
#   logs       Tail logs from all services
#   health     Check health of all services
#   backup     Trigger a manual database backup
#   migrate    Run database migrations
#   clean      Remove all containers, volumes, and images

COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
PROJECT_NAME="drms-prod"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        error "Missing $ENV_FILE. Copy .env.production.template and fill in secrets."
    fi

    local missing=0
    for var in DB_PASSWORD JWT_SECRET NEXTAUTH_SECRET NEXTAUTH_URL MINIO_ROOT_USER MINIO_ROOT_PASSWORD; do
        if grep -q "^${var}=REPLACE\|^${var}=$\|^${var}=\"\"$" "$ENV_FILE" 2>/dev/null || ! grep -q "^${var}=" "$ENV_FILE" 2>/dev/null; then
            error "Required variable $var not set in $ENV_FILE"
            missing=$((missing + 1))
        fi
    done

    if [ $missing -gt 0 ]; then
        error "Fix the above missing variables in $ENV_FILE before deploying."
    fi
    ok "Environment configuration valid"
}

cmd_deploy() {
    info "Starting DRMS production deployment..."
    check_env

    info "Building application image..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT_NAME" build --no-cache app

    info "Starting all services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT_NAME" up -d

    info "Waiting for services to be healthy..."
    sleep 15
    cmd_health

    ok "Deployment complete!"
    info "Application: ${NEXTAUTH_URL:-http://localhost:3000}"
    info "MinIO Console: http://localhost:9001"
}

cmd_start() {
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT_NAME" up -d
    ok "Services started"
}

cmd_stop() {
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
    ok "Services stopped"
}

cmd_restart() {
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT_NAME" restart
    ok "Services restarted"
}

cmd_status() {
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
}

cmd_logs() {
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs -f --tail=100 "${@:2}"
}

cmd_health() {
    info "Checking service health..."
    local all_healthy=true

    for service in postgres redis minio app; do
        local status
        status=$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps --format json "$service" 2>/dev/null | grep -o '"Health":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown")
        if [ "$status" = "healthy" ]; then
            ok "$service: healthy"
        else
            warn "$service: $status"
            all_healthy=false
        fi
    done

    if [ "$all_healthy" = true ]; then
        ok "All services healthy"
    fi
}

cmd_backup() {
    info "Triggering manual database backup..."
    local backup_container
    backup_container=$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps -q db-backup 2>/dev/null | head -1)
    if [ -z "$backup_container" ]; then
        error "Backup container not running"
    fi
    docker exec "$backup_container" sh -c "pg_dump -h \$PGHOST -U \$PGUSER \$PGDATABASE | gzip > /tmp/manual_backup_\$(date -u +%Y%m%d_%H%M%S).sql.gz && mc cp /tmp/manual_backup_*.sql.gz myminio/db-backups/ && rm -f /tmp/manual_backup_*.sql.gz"
    ok "Manual backup completed"
}

cmd_migrate() {
    info "Running database migrations..."
    local app_container
    app_container=$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps -q app 2>/dev/null | head -1)
    if [ -z "$app_container" ]; then
        error "App container not running"
    fi
    docker exec "$app_container" npx prisma migrate deploy
    ok "Migrations completed"
}

cmd_clean() {
    warn "This will remove all containers, volumes, and images for $PROJECT_NAME"
    read -p "Are you sure? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down -v --rmi local
        ok "Cleaned up all resources"
    fi
}

COMMAND=${1:-deploy}

case "$COMMAND" in
    deploy)   cmd_deploy ;;
    start)    cmd_start ;;
    stop)     cmd_stop ;;
    restart)  cmd_restart ;;
    status)   cmd_status ;;
    logs)     cmd_logs "$@" ;;
    health)   cmd_health ;;
    backup)   cmd_backup ;;
    migrate)  cmd_migrate ;;
    clean)    cmd_clean ;;
    *)
        echo "Usage: $0 {deploy|start|stop|restart|status|logs|health|backup|migrate|clean}"
        exit 1
        ;;
esac
