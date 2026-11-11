#!/usr/bin/env bash
# 9 AM IST alerts: admin summary, "helpful" digest, points credited.
# Installed as a cron job (03:30 UTC) by deploy/deploy.sh; safe to run by hand.
set -euo pipefail
APP_DIR=/home/kiraaya/app
SECRET=$(grep -E '^CRON_SECRET=' "$APP_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"')
echo "$(date -u +%FT%TZ) $(curl -fsS -m 300 -X POST -H "Authorization: Bearer $SECRET" http://127.0.0.1:3000/api/cron/daily-alerts)"
