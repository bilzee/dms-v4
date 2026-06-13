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
if [ ! -d "node_modules/.pnpm/@prisma+client" ]; then
    echo "⚠️  Prisma client not found, generating..."
    npx prisma generate || echo "❌ Prisma client generation failed"
else
    echo "✅ Prisma client found"
fi

# Run database migrations
echo ""
echo "=== Running Database Migrations ==="
npx prisma migrate deploy
if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "⚠️  Migrations failed - falling back to db push"
    npx prisma db push --accept-data-loss || echo "❌ Schema push also failed"
fi

# Start the application
echo ""
echo "=== Starting Next.js Server ==="
exec node server.js
