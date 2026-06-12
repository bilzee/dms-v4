#!/bin/sh

echo "=== Starting DRMS Application ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo "Node: $(node --version)"
echo "Working directory: $(pwd)"
echo "Database: ${DATABASE_URL:+configured}"

# Check if Prisma client exists, generate if needed
echo ""
echo "=== Checking Prisma Client ==="
if [ ! -d "node_modules/.prisma" ]; then
    echo "⚠️  Prisma client not found, generating..."
    if npx prisma generate; then
        echo "✅ Prisma client generated successfully"
    else
        echo "❌ Prisma client generation failed - this may cause issues"
    fi
else
    echo "✅ Prisma client found"
fi

# Check if migrations exist
echo ""
echo "=== Checking for Migrations ==="
if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "✅ Migration files found"
    
    # Run database migrations
    echo ""
    echo "=== Running Database Migrations ==="
    if npx prisma migrate deploy; then
        echo "✅ Migrations completed successfully"
    else
        echo "❌ Migrations failed - attempting to start anyway (tables might already exist)"
    fi
else
    echo "⚠️  No migration files found - using db push instead"
    echo ""
    echo "=== Pushing Schema to Database ==="
    if npx prisma db push --accept-data-loss; then
        echo "✅ Schema pushed successfully"
    else
        echo "❌ Schema push failed - database tables may not exist"
    fi
fi

# Start the application
echo ""
echo "=== Starting Next.js Server ==="
echo "Container will stay alive as long as server.js runs"

# Use exec to replace shell with node process (proper signal handling)
exec node server.js