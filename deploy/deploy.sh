#!/usr/bin/env bash
# Ships the latest main to this server. Run as the kiraaya user, either by
# hand or by .github/workflows/deploy.yml over SSH.
#
# Order matters: back up, then migrate, then build, then reload. If the build
# fails the old build keeps serving (PM2 is only reloaded at the end).
set -euo pipefail
cd /home/kiraaya/app

BRANCH="${1:-main}"
echo "==> Fetching $BRANCH"
git fetch --quiet origin "$BRANCH"
# Uploads and .env are gitignored, so a hard reset never touches them.
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies"
npm ci --no-audit --no-fund

echo "==> Backing up before migrating"
bash deploy/backup.sh

echo "==> Migrating the database"
npx prisma migrate deploy
npx tsx prisma/seed.ts   # adds new categories/question sets; never overwrites

echo "==> Settings and scheduled jobs"
# The 9 AM alerts job authenticates with CRON_SECRET; create one once.
grep -q '^CRON_SECRET=' .env || echo "CRON_SECRET=\"$(openssl rand -hex 24)\"" >> .env
# 03:30 UTC = 9:00 IST. Re-written on every deploy so the line stays current.
ALERTS_CRON="30 3 * * * bash /home/kiraaya/app/deploy/daily-alerts.sh >> /home/kiraaya/alerts.log 2>&1"
( crontab -l 2>/dev/null | grep -v deploy/daily-alerts.sh || true; echo "$ALERTS_CRON" ) | crontab -

echo "==> Building"
npm run build

echo "==> Reloading"
pm2 startOrReload deploy/ecosystem.config.js --update-env
pm2 save

echo "Deployed $(git rev-parse --short HEAD)"
