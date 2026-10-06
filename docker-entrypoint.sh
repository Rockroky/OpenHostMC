#!/bin/sh
set -e

echo "==> Starting OpenHostMC container entrypoint..."

# Extract DB host and port from DATABASE_URL if present, otherwise default to postgres:5432
DB_HOST=""
DB_PORT="5432"

if [ -n "$DATABASE_URL" ]; then
  DB_HOST=$(echo "$DATABASE_URL" | sed -E -n 's/.*@([^:/]+)(:([0-9]+))?.*/\1/p')
  PARSED_PORT=$(echo "$DATABASE_URL" | sed -E -n 's/.*@[^:/]+:([0-9]+).*/\1/p')
  if [ -n "$PARSED_PORT" ]; then
    DB_PORT="$PARSED_PORT"
  fi
fi

if [ -z "$DB_HOST" ]; then
  DB_HOST="postgres"
fi

echo "==> Waiting for Postgres at $DB_HOST:$DB_PORT to be ready..."
MAX_TRIES=30
COUNT=0

if command -v pg_isready > /dev/null 2>&1; then
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" > /dev/null 2>&1 || [ "$COUNT" -ge "$MAX_TRIES" ]; do
    COUNT=$((COUNT + 1))
    echo "    Postgres not ready yet (attempt $COUNT/$MAX_TRIES). Waiting 2s..."
    sleep 2
  done
else
  # Fallback to node socket checker
  node scripts/wait-for-db.js
fi

if [ "$COUNT" -ge "$MAX_TRIES" ]; then
  echo "⚠️ Warning: Postgres at $DB_HOST:$DB_PORT did not become ready within timeout."
  echo "    Continuing anyway so services can start or retry connection..."
else
  echo "✅ Postgres is ready at $DB_HOST:$DB_PORT!"
fi

# Run prisma db push safely
echo "==> Synchronizing Prisma schema with database..."
npx prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss || {
  echo "⚠️ Warning: Prisma db push failed. Orchestrator service will retry DB connection on startup."
}

echo "==> Starting OpenHostMC services..."
exec "$@"
