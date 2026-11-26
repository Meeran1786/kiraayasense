#!/usr/bin/env bash
# Ships the latest main to this server. Run as the kiraaya user, either by
# hand or by .github/workflows/deploy.yml over SSH.
#
# Order matters: back up, then migrate, then build, then reload. The build
# goes into .next-build, never into the .next the running site reads from, so
# visitors don't see "Application error" pages while it builds, and a failed
# build (out of memory, say) leaves the old site serving untouched.
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

# IndexNow key (lib/indexnow.ts); create one once and keep it.
if ! grep -q '^INDEXNOW_KEY=' .env; then
  echo "INDEXNOW_KEY=\"$(node -e 'console.log(require("crypto").randomBytes(16).toString("hex"))')\"" >> .env
fi

echo "==> Building"
rm -rf .next-build
NEXT_BUILD_DIR=.next-build npm run build

echo "==> Swapping in the new build"
# Keep the previous build's JS/CSS too: pages already open in a browser still
# ask for the old file names until they reload.
# Files already in the new build are left alone (same name, same content);
# -p keeps the old ones' dates, so those over a week old can be dropped.
if [ -d .next/static ]; then cp -rp --update=none .next/static/. .next-build/static/; fi
find .next-build/static -type f -mtime +7 -delete
rm -rf .next-old
if [ -d .next ]; then mv .next .next-old; fi
mv .next-build .next

echo "==> Reloading"
pm2 startOrReload deploy/ecosystem.config.js --update-env
pm2 save

# Tell Bing and other IndexNow engines the main pages may have changed.
# Best effort: a failed ping never fails the deploy.
KEY=$(grep '^INDEXNOW_KEY=' .env | cut -d= -f2- | tr -d '"' || true)
SITE=$(grep '^NEXTAUTH_URL=' .env | cut -d= -f2- | tr -d '"' | sed 's:/*$::' || true)
SITE=${SITE:-https://kiraayasense.com}
if [ -n "$KEY" ]; then
  sleep 5
  curl -s -m 15 -o /dev/null -w "IndexNow: %{http_code}\n" -X POST https://api.indexnow.org/indexnow \
    -H 'Content-Type: application/json; charset=utf-8' \
    -d "{\"host\":\"${SITE#https://}\",\"key\":\"$KEY\",\"keyLocation\":\"$SITE/indexnow-key.txt\",\"urlList\":[\"$SITE/\",\"$SITE/guides\",\"$SITE/about\",\"$SITE/search\",\"$SITE/llms.txt\"]}" || true
fi

echo "Deployed $(git rev-parse --short HEAD)"
