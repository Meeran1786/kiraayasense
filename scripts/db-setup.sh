#!/usr/bin/env bash
# One-shot database setup: creates the database (if missing), applies every
# migration under prisma/migrations (including the PostGIS/pg_trgm
# extensions, indexes, CHECK constraints and views Prisma can't express),
# then seeds categories, question sets and sample data.
#
# Prereqs (see RUNBOOK.md): Postgres 16 + PostGIS installed, and a .env with
# DATABASE_URL pointing at it. The database user must be allowed to create
# extensions (a superuser, or the database owner on Postgres 13+ for
# trusted extensions — PostGIS needs superuser the first time).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env — copy .env.example to .env and fill in DATABASE_URL first." >&2
  exit 1
fi

set -a
source .env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set in .env" >&2
  exit 1
fi

# psql/createdb reject Prisma's ?schema= query parameter.
PG_URL="${DATABASE_URL%%\?*}"
DB_NAME="${PG_URL##*/}"

echo "==> Ensuring database '$DB_NAME' exists"
createdb "$DB_NAME" 2>/dev/null || echo "   (already exists, continuing)"

echo "==> Applying migrations"
npx prisma migrate deploy

echo "==> Seeding categories, question sets and sample data"
npx tsx prisma/seed.ts

echo ""
echo "Database is set up. Next: npm run make-admin -- you@example.com (after you've signed in with Google once)."
