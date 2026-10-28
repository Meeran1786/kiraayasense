#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 droplet for KiraayaSense.
# Run as root:   bash bootstrap.sh you@example.com
# (the email is for Let's Encrypt expiry notices). Safe to re-run: each step
# checks whether it already happened. See deploy/README.md for the full flow.
set -euo pipefail

DOMAIN="${DOMAIN:-kiraayasense.com}"
REPO="${REPO:-git@github.com:Meeran1786/kiraayasense.git}"
BRANCH="${BRANCH:-main}"
APP_USER=kiraaya
APP_DIR=/home/$APP_USER/app
EMAIL="${1:-}"

[ "$(id -u)" = 0 ] || { echo "Run as root." >&2; exit 1; }
[ -n "$EMAIL" ] || { echo "Usage: bash bootstrap.sh you@example.com" >&2; exit 1; }
as_app() { sudo -u "$APP_USER" -H bash -lc "$*"; }

echo "==> Swap (next build needs more than 2 GB RAM)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq
if ! command -v node >/dev/null || ! node -v | grep -q '^v20'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
fi
apt-get install -yq nodejs postgresql postgresql-contrib postgis postgresql-16-postgis-3 \
  nginx certbot python3-certbot-nginx git build-essential ufw rclone unattended-upgrades
command -v pm2 >/dev/null || npm install -g pm2

echo "==> Firewall"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

echo "==> App user"
id "$APP_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$APP_USER"

echo "==> Database"
DB_PASS_FILE=/root/.kiraayasense-db-password
[ -f "$DB_PASS_FILE" ] || { openssl rand -hex 24 > "$DB_PASS_FILE"; chmod 600 "$DB_PASS_FILE"; }
DB_PASS="$(cat "$DB_PASS_FILE")"
sudo -u postgres psql -qtc "SELECT 1 FROM pg_roles WHERE rolname='$APP_USER'" | grep -q 1 ||
  sudo -u postgres psql -qc "CREATE ROLE $APP_USER LOGIN PASSWORD '$DB_PASS'"
sudo -u postgres psql -qtc "SELECT 1 FROM pg_database WHERE datname='kiraayasense'" | grep -q 1 ||
  sudo -u postgres createdb -O "$APP_USER" kiraayasense
# Extensions need a superuser; the app role then only needs to own the database.
sudo -u postgres psql -q -d kiraayasense -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS pg_trgm;"

echo "==> GitHub deploy key (read-only access to the repo)"
KEY=/home/$APP_USER/.ssh/github_deploy
if [ ! -f "$KEY" ]; then
  as_app "mkdir -p ~/.ssh && chmod 700 ~/.ssh && ssh-keygen -q -t ed25519 -N '' -C 'kiraayasense-server' -f $KEY"
  as_app "printf 'Host github.com\n  IdentityFile $KEY\n  IdentitiesOnly yes\n' >> ~/.ssh/config && ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null"
fi
if [ ! -d "$APP_DIR/.git" ]; then
  echo
  echo "Add this key at https://github.com/Meeran1786/kiraayasense/settings/keys"
  echo "(title: droplet, leave 'Allow write access' unticked):"
  echo
  cat "$KEY.pub"
  echo
  read -rp "Press Enter once it's added… "
  as_app "git clone --branch $BRANCH $REPO $APP_DIR"
fi

echo "==> Environment"
if [ ! -f "$APP_DIR/.env" ]; then
  read -rp "Google OAuth client ID: " GID
  read -rp "Google OAuth client secret: " GSECRET
  read -rp "Google Places API key (optional, Enter to skip): " GPLACES
  cat > "$APP_DIR/.env" <<ENV
DATABASE_URL="postgresql://$APP_USER:$DB_PASS@localhost:5432/kiraayasense?schema=public"
GOOGLE_CLIENT_ID="$GID"
GOOGLE_CLIENT_SECRET="$GSECRET"
GOOGLE_PLACES_API_KEY="$GPLACES"
NEXTAUTH_URL="https://$DOMAIN"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
ENV
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
fi

echo "==> Install, migrate, build"
as_app "cd $APP_DIR && npm ci --no-audit --no-fund && npx prisma migrate deploy && npx tsx prisma/seed.ts && npm run build"

echo "==> Process manager"
as_app "cd $APP_DIR && pm2 startOrReload deploy/ecosystem.config.js && pm2 save"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" >/dev/null

echo "==> Nginx"
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/kiraayasense
sed -i "s/kiraayasense.com www.kiraayasense.com/$DOMAIN www.$DOMAIN/" /etc/nginx/sites-available/kiraayasense
ln -sf /etc/nginx/sites-available/kiraayasense /etc/nginx/sites-enabled/kiraayasense
rm -f /etc/nginx/sites-enabled/default
# Upload folders (also in the repo as .gitkeep files, but make sure they exist).
sudo -u "$APP_USER" mkdir -p "$APP_DIR/public/uploads/reviews" "$APP_DIR/storage/private/proofs"
# nginx (www-data) must be able to read uploaded review media.
chmod o+x "/home/$APP_USER" "$APP_DIR" "$APP_DIR/public"
nginx -t && systemctl reload nginx

echo "==> Nightly backup at 03:30 IST"
CRON="0 22 * * * bash $APP_DIR/deploy/backup.sh >> /home/$APP_USER/backup.log 2>&1"
( crontab -u "$APP_USER" -l 2>/dev/null | grep -v deploy/backup.sh; echo "$CRON" ) | crontab -u "$APP_USER" -

echo "==> Auto-deploy key for GitHub Actions"
ACTIONS_KEY=/root/kiraayasense-actions-key
if [ ! -f "$ACTIONS_KEY" ]; then
  ssh-keygen -q -t ed25519 -N '' -C 'github-actions-deploy' -f "$ACTIONS_KEY"
  # This key can only run the deploy script, nothing else.
  echo "command=\"bash $APP_DIR/deploy/deploy.sh\",no-port-forwarding,no-agent-forwarding,no-pty $(cat "$ACTIONS_KEY.pub")" \
    >> "/home/$APP_USER/.ssh/authorized_keys"
  chown "$APP_USER:$APP_USER" "/home/$APP_USER/.ssh/authorized_keys"
  chmod 600 "/home/$APP_USER/.ssh/authorized_keys"
fi

echo "==> HTTPS"
IP="$(curl -fsS https://api.ipify.org || true)"
if [ -n "$IP" ] && getent hosts "$DOMAIN" | grep -q "$IP"; then
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --redirect --agree-tos -m "$EMAIL" --non-interactive
else
  echo "DNS for $DOMAIN doesn't point at $IP yet. Once it does, run:"
  echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect --agree-tos -m $EMAIL"
fi

cat <<DONE

Done. Next:
 1. Add these GitHub Actions secrets at https://github.com/Meeran1786/kiraayasense/settings/secrets/actions
    DEPLOY_HOST         $IP
    DEPLOY_KNOWN_HOSTS  $IP $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)
    DEPLOY_SSH_KEY      the whole of: cat $ACTIONS_KEY   (then delete that file)
 2. Sign in at https://$DOMAIN with Google, then make yourself an admin:
      sudo -u $APP_USER -H bash -lc 'cd $APP_DIR && npm run make-admin -- you@example.com'
 3. Optional off-site backups: run 'sudo -u $APP_USER rclone config' and add a remote named "offsite"
    (DigitalOcean Spaces is S3-compatible).
DONE
