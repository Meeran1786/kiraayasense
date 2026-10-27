#!/usr/bin/env bash
# One-shot local Postgres setup: creates the database (if missing), applies
# the raw-SQL PostGIS/pg_trgm bootstrap that Prisma can't express, runs the
# Prisma migration for everything else, applies the CHECK-constraint +
# materialized-view follow-up SQL, then seeds sample data.
#
# Prereqs (see RUNBOOK.md): Postgres + PostGIS installed via Homebrew, and a
# .env.local with DATABASE_URL pointing at it.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env — copy .env.example to .env and fill in DATABASE_URL first." >&2
  exit 1
fi

# Load DATABASE_URL (and everything else) from .env for the psql/createdb
# steps below. Using plain .env (not .env.local) because the Prisma CLI only
# auto-loads .env, not .env.local — Next.js reads both, so keeping
# everything in .env works for both without duplicating it.
set -a
source .env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set in .env.local" >&2
  exit 1
fi

DB_NAME=$(echo "$DATABASE_URL" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')

echo "==> Ensuring database '$DB_NAME' exists"
createdb "$DB_NAME" 2>/dev/null || echo "   (already exists, continuing)"

echo "==> Applying PostGIS / pg_trgm bootstrap (prisma/manual/000_postgis.sql)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/manual/000_postgis.sql

echo "==> Running Prisma migration"
npx prisma migrate dev --name init --skip-seed

echo "==> Applying CHECK constraints + materialized view (prisma/manual/001_checks_and_aggregates.sql)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/manual/001_checks_and_aggregates.sql

echo "==> Seeding sample properties/reviews"
npx tsx prisma/seed.ts

echo ""
echo "Database is set up. Next: npm run make-admin -- you@example.com (after you've signed in with Google once)."
