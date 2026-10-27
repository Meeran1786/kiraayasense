#!/usr/bin/env bash
# Nightly backup: a compressed pg_dump plus the uploaded files (review media
# and private proofs). Keeps 14 days locally. If rclone has a remote named
# "offsite" configured (e.g. DigitalOcean Spaces), copies there too, so a
# deleted droplet no longer means lost data.
#
# Installed as a cron job by deploy/bootstrap.sh; run by hand any time:
#   bash ~/app/deploy/backup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/home/kiraaya/app}"
BACKUP_DIR="${BACKUP_DIR:-/home/kiraaya/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
set -a; source "$APP_DIR/.env"; set +a
PG_URL="${DATABASE_URL%%\?*}"

pg_dump --format=custom --no-owner --file="$BACKUP_DIR/db-$STAMP.dump" "$PG_URL"
tar -czf "$BACKUP_DIR/files-$STAMP.tar.gz" -C "$APP_DIR" public/uploads storage/private

find "$BACKUP_DIR" -name 'db-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'files-*.tar.gz' -mtime +"$KEEP_DAYS" -delete

if command -v rclone >/dev/null && rclone listremotes | grep -q '^offsite:'; then
  rclone copy "$BACKUP_DIR" "offsite:${OFFSITE_PATH:-kiraayasense-backups}" --max-age 25h
fi

echo "Backup $STAMP done: $(du -sh "$BACKUP_DIR" | cut -f1) in $BACKUP_DIR"
