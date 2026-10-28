# KiraayaSense — production-track local setup

This turns the local test harness into a real stack: Google sign-in backed
by a real Postgres database, and an admin CMS for banners and property
details. Phone/email OTP is still mocked (no SMS/email gateway account
configured yet) — see "What's still mocked" at the bottom.

Run everything below in your own Mac Terminal, in the `kiraayasense` project
folder — not through Claude, since installing Homebrew packages and running
a long-lived dev server both need your actual Mac shell.

## 1. Install Postgres + PostGIS (one-time)

```bash
brew install postgresql@16 postgis
brew services start postgresql@16
```

If `brew install postgis` fails because it can't find your Postgres version,
run `brew info postgis` to see which Postgres versions it supports and
install that version instead of 16.

## 2. Create a Google OAuth client (one-time)

1. Go to https://console.cloud.google.com/apis/credentials (create a project
   first if you don't have one).
2. Configure the OAuth consent screen (External, in Testing mode is fine for
   now — add your own Google account as a test user).
3. Create Credentials → OAuth client ID → Application type: **Web
   application**.
4. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy the Client ID and Client Secret — you'll need them in step 3.

## 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` — adjust the username/password/port if your local Postgres
  isn't on the default `postgresql://localhost:5432`.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from step 2.
- `NEXTAUTH_SECRET` — generate one with `openssl rand -base64 32`.

## 4. Install dependencies and set up the database

```bash
npm install
npm run db:setup
```

`db:setup` creates the database and applies every migration in
`prisma/migrations` (PostGIS/pg_trgm, tables, indexes, CHECK constraints and
the ratings view), then seeds the category tree and question sets from
`prisma/data/taxonomy.ts`.

For local development, also load the fictional sample businesses and
reviews (never do this in production):

```bash
SEED_SAMPLE_DATA=1 npm run db:seed
```

After a schema change, create a new migration with
`npx prisma migrate dev --name <what-changed>` and commit it; production
applies migrations with `npx prisma migrate deploy`.

## 5. Run the app and become an admin

```bash
npm run dev
```

Open http://localhost:3000, click **Sign in**, and sign in with your Google
account (must be added as a test user in step 2 if the consent screen is
still in Testing mode). This creates your real `users` row.

Then, in a second terminal tab:

```bash
npm run make-admin -- you@example.com
```

Refresh the site and visit **http://localhost:3000/admin** — you should
land on the dashboard. From there:
- **/admin/banners** — create, edit, pause, or delete promotional banners.
- **/admin/properties** — edit a listing's name, category, address fields,
  rent range, or status (approve/unpublish).

## What's still mocked or simplified

- **Phone/email OTP sign-in** is still a local mock (any 6-digit code
  works). Wiring it up needs an SMS gateway (MSG91/Twilio) or email gateway
  (SES/Postmark) account and API key — tell me when you have one and I'll
  wire it the same way Google OAuth is wired now.
- **File uploads** (review photos/videos and payment proofs) now write to
  local disk (`public/uploads/reviews/` and `storage/private/proofs/`)
  instead of a mock in-memory endpoint — this is real persistence, but it's
  not S3/Cloudflare R2 yet. Swapping in real object storage later only
  touches `app/api/uploads/local/route.ts` and `lib/uploadClient.ts`.
- **Payment-proof redaction** (blurring account numbers etc., per the PRD's
  DPDP-compliance requirement) is not implemented — treat every file under
  `storage/private/proofs/` as raw, unredacted, and sensitive.
- **Review moderation** doesn't have a queue/UI yet — reviews submitted
  through the site land as `PENDING_REVIEW` and won't show publicly until
  someone flips their status (currently only doable via a DB tool or a
  future admin moderation screen, which isn't built).
- **Deployment to www.kiraayasense.com** hasn't started — this is all still
  local. We agreed to get this solid locally first before touching the live
  domain (see IMPLEMENTATION_PLAN.md's hosting-fit-check note about
  confirming your current hosting plan supports Node.js/SSR + Postgres).
- **Known npm audit findings**: `next@14.2.35` (the latest 14.x patch) still
  carries a handful of advisories that are only fixed in the Next.js 16
  major version, which has breaking changes to the App Router API. Since
  this is local-only for now, I left it on 14.2.x rather than risk a large
  breaking upgrade mid-build — worth revisiting before any public
  deployment.

## A note on how this was verified

This session's cloud sandbox couldn't reach Prisma's binary CDN
(`binaries.prisma.sh` returned 403 on every request), so `prisma generate`
could not run here, which means the full app was never actually built here —
without a generated client, TypeScript can't resolve the Prisma model types
that `lib/db/properties.ts` and the reviews/admin API routes rely on. I
checked every Prisma field/relation/enum name used in that code by hand
against `prisma/schema.prisma` (they match), and ran `tsc --noEmit` to
confirm every *non-database* file (pages, components, auth wiring, the
upload route — about 40 of the 45 changed files) compiles cleanly. But that
is not the same guarantee as a real build.

**Please run `npm run build` right after `npm run db:setup` on your Mac**
and send me any error output. Since your Mac can reach Prisma's CDN
normally, that will be the first real compile of the database layer end to
end, and I'll fix anything that comes up immediately.
