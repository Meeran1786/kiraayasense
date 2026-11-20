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
# 13:30 UTC = 7:00 PM IST: the "you're missing out on your point today" push.
REMINDER_CRON="30 13 * * * bash /home/kiraaya/app/deploy/daily-reminder.sh >> /home/kiraaya/alerts.log 2>&1"
( crontab -l 2>/dev/null | grep -v -e deploy/daily-alerts.sh -e deploy/daily-reminder.sh || true; echo "$ALERTS_CRON"; echo "$REMINDER_CRON" ) | crontab -
# Web push needs a VAPID key pair; create one once. Never change it after
# that, or every device that turned notifications on would have to again.
if ! grep -q '^VAPID_PRIVATE_KEY=' .env; then
  node -e 'const k=require("web-push").generateVAPIDKeys();console.log(`VAPID_PUBLIC_KEY="${k.publicKey}"\nVAPID_PRIVATE_KEY="${k.privateKey}"`)' >> .env
fi

echo "==> Building"
npm run build

echo "==> Reloading"
pm2 startOrReload deploy/ecosystem.config.js --update-env
pm2 save

echo "Deployed $(git rev-parse --short HEAD)"
