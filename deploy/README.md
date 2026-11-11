# Deploying KiraayaSense

One DigitalOcean droplet runs Next.js (PM2), PostgreSQL 16 with PostGIS,
and Nginx with a Let's Encrypt certificate. Pushing to `main` deploys
automatically once CI passes. This replaces the old hand-run runbook; it
adds the backups and the auto-deploy that the old setup lacked.

## What you do once

1. **Lock down DigitalOcean first.** Remove unknown team members, API
   tokens and SSH keys; turn on two-factor authentication for every member.
2. **SSH key.** On your Mac, `ls ~/.ssh/id_ed25519.pub || ssh-keygen -t ed25519`,
   then add the `.pub` contents under Settings → Security → SSH Keys.
3. **Create the droplet.** Ubuntu **24.04** LTS, Basic $12/mo (2 GB),
   region **BLR1**, your SSH key, hostname `kiraayasense-prod`.
   Tick **Backups** (weekly whole-disk snapshots, about $2.40/mo) and,
   once created, turn on deletion protection if your account offers it.
4. **DNS (GoDaddy).** A records for `@` and `www` pointing to the droplet IP.
5. **Google OAuth.** Create a new OAuth client (treat the old secret as
   leaked). Redirect URI `https://kiraayasense.com/api/auth/callback/google`,
   JavaScript origin `https://kiraayasense.com`. Publish the consent screen
   so anyone can sign in. Details in RUNBOOK.md section 2.
6. **Run the setup script** from your Mac:

   ```bash
   scp deploy/bootstrap.sh root@DROPLET_IP:
   ssh root@DROPLET_IP 'bash bootstrap.sh you@example.com'
   ```

   It installs everything, creates the database with a random password,
   asks you to add a read-only deploy key to GitHub, asks for the Google
   client ID and secret, builds and starts the app, sets up Nginx, a
   firewall (SSH and web only), 2 GB swap, a nightly backup, and HTTPS (if
   DNS already points at the droplet; otherwise it prints the one command
   to run later). Safe to re-run.
7. **Auto-deploy.** Add the three secrets the script prints
   (`DEPLOY_HOST`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_SSH_KEY`) under the repo's
   Settings → Secrets and variables → Actions, then delete
   `/root/kiraayasense-actions-key` from the droplet. That key can only run
   `deploy/deploy.sh`.
8. **Become admin.** Sign in with Google on the site, then on the droplet:
   `sudo -u kiraaya -H bash -lc 'cd ~/app && npm run make-admin -- you@example.com'`.
9. **Seed businesses** (optional, can be later). See RUNBOOK.md section 6.

## Every release

Merge a pull request into `main`. CI checks it on a fresh database; when it
passes, the Deploy workflow SSHes in and runs `deploy/deploy.sh`, which backs
up, migrates, builds and reloads. If the build fails the old version keeps
serving. You can also run it by hand on the droplet as `kiraaya`, or from the
Actions tab (Deploy → Run workflow).

## Review translation (optional)

The "Translate" button on reviews uses Microsoft Azure AI Translator when
`AZURE_TRANSLATOR_KEY` is set in `/home/kiraaya/app/.env` (free F0 tier: 2
million characters a month). Create a Translator resource in the Azure
portal, pick the Free F0 tier and a region such as Central India, then copy
Key 1 and the region:

```bash
AZURE_TRANSLATOR_KEY="..."
AZURE_TRANSLATOR_REGION="centralindia"
```

Reload with `pm2 reload kiraayasense --update-env`. Each review is translated
once per language and stored in `review_translations`, so repeat readers
cost nothing. Without a key the button opens Google Translate in a new tab.

## Ask assistant (optional)

The "Ask" button answers tenants' questions from the site's own listings and
reviews, using Anthropic's Claude. It stays hidden until a key is set:

1. Create an account at https://console.anthropic.com, add billing, and under
   Settings → Limits set a monthly spend limit (for example $20) as a hard
   backstop.
2. Create an API key and add it to `/home/kiraaya/app/.env`:

```bash
ANTHROPIC_API_KEY="sk-ant-..."
ASSISTANT_MODEL="claude-haiku-5-5"   # or claude-sonnet-5-5 / claude-opus-5-5
ASSISTANT_DAILY_QUESTIONS=20         # per signed-in user per day
ASSISTANT_DAILY_BUDGET_USD=5         # whole site per day; the assistant pauses when reached
```

3. Reload with `pm2 reload kiraayasense --update-env`.

Only signed-in users can ask. Usage per user per day is in the
`assistant_usage` table; today's estimated spend in dollars:

```bash
psql kiraayasense -c "select sum(questions) as questions, sum(\"costMicroUsd\")/1e6 as usd from assistant_usage where day = current_date"
```

## Alerts: email and WhatsApp (optional)

Every alert appears on the bell at the top of the site. Email and WhatsApp
copies are sent once these are set up. Each person chooses which alerts they
get under **Profile → Alerts**.

**Email (Resend)**

1. Create an account at https://resend.com and add the domain
   `kiraayasense.com`.
2. Add the DNS records it shows (one MX, two TXT for SPF and DKIM) in GoDaddy
   → My Products → kiraayasense.com → DNS. Wait until Resend shows Verified.
3. Create an API key and add it to `/home/kiraaya/app/.env`:

```bash
RESEND_API_KEY="re_..."
ALERTS_FROM_EMAIL="KiraayaSense <alerts@kiraayasense.com>"
```

**WhatsApp (Meta Cloud API)**

1. In https://business.facebook.com create a Meta Business account, then in
   https://developers.facebook.com create an app of type Business and add
   the WhatsApp product.
2. Add a phone number that is **not** on the WhatsApp or WhatsApp Business
   app, verify it by SMS, and set the display name "KiraayaSense".
3. Add a payment method in WhatsApp Manager (India utility messages cost
   about ₹0.12 each; the code messages cost a little more).
4. Create a System User (Business settings → Users → System users), give it
   the app with `whatsapp_business_messaging` and
   `whatsapp_business_management`, and generate a permanent token.
5. Submit every template in `deploy/WHATSAPP_TEMPLATES.md`.
6. Add to `.env`:

```bash
WHATSAPP_PHONE_NUMBER_ID="..."   # from WhatsApp → API setup, not the phone number itself
WHATSAPP_ACCESS_TOKEN="..."
```

Reload with `pm2 reload kiraayasense --update-env`. Then sign in, open
Profile → Alerts, verify your own number with the code, and switch on the
alerts you want.

**9 AM summary.** `deploy.sh` creates `CRON_SECRET` in `.env` and installs a
cron job at 03:30 UTC (9:00 IST) that calls `/api/cron/daily-alerts`. It
sends the admin summary, the day's "helpful" digest and the points credited.
Its log is `/home/kiraaya/alerts.log`. To run it by hand:
`bash /home/kiraaya/app/deploy/daily-alerts.sh`.

## Backups

- `deploy/backup.sh` runs nightly at 03:30 IST: a `pg_dump` plus the uploaded
  review media and private proofs, kept 14 days in `/home/kiraaya/backups`.
  It also runs before every deploy.
- These sit on the droplet, so they die with it. For off-site copies, create
  a DigitalOcean Spaces bucket and an access key, then on the droplet run
  `sudo -u kiraaya rclone config` and add an S3-compatible remote named
  `offsite`. The backup script copies there automatically from then on.
- Restore: `pg_restore --clean --no-owner -d "postgresql://…/kiraayasense" db-<stamp>.dump`
  and `tar -xzf files-<stamp>.tar.gz -C /home/kiraaya/app`.

## Useful commands on the droplet

```bash
sudo -u kiraaya pm2 logs kiraayasense     # app logs
sudo -u kiraaya pm2 status
tail -f /home/kiraaya/backup.log
certbot renew --dry-run                   # certificates renew automatically
```
