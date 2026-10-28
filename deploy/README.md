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
