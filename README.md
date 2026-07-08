# CSM Meeting Notes

Capture meeting notes, get an AI-cleaned summary plus extracted next-step action items, and push those action items straight to your own Google Tasks.

## Local development

This project uses [Bun](https://bun.sh) (no system Node.js install required). It's backed by Postgres rather than SQLite, so you need a `DATABASE_URL` even for local dev — see [Database](#database) below for the fastest way to get one.

```bash
bun install
bun --bun run prisma migrate dev   # first time only, creates the initial migration
bun --bun run dev
```

Open http://localhost:3000. With no Okta app configured (see below), sign-in uses a local dev-mode stub — enter any name/email.

You'll still need real credentials for two things that talk to external services:

- **`ANTHROPIC_API_KEY`** — the "Clean up with AI" step calls the Claude API.
- **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`** — the "Connect Google Tasks" step needs a real Google OAuth client with the Tasks API enabled, even in dev mode.

Copy `.env.example` values you don't have into `.env` and fill them in.

## Database

The app connects to Postgres via `@prisma/adapter-pg` (plain `pg`/TCP), which works with any standard Postgres connection string — including Vercel's "Prisma Postgres" storage integration, a self-hosted Postgres, Neon, RDS, etc.

Get a `DATABASE_URL`:

- **If using Vercel's Prisma Postgres storage** (Project → Storage → Create Database → Prisma Postgres): use the `POSTGRES_URL` value it gives you, **not** `PRISMA_DATABASE_URL` (that one's a `prisma+postgres://` Accelerate URL meant for a different connection method than the plain driver adapter this app uses).
- **Fastest for a quick local check**: `bunx create-db --ttl 24h --env .env` spins up a free temporary Prisma Postgres database and writes `DATABASE_URL` straight into `.env`. It auto-deletes after the TTL unless you claim it — fine for poking around, not for anything you want to keep.

Then run `bun --bun run prisma migrate dev --name init` once to create the schema.

## Deploying to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import `tylersibleyokta/csm-notes-app` from GitHub.
2. Provision a database if you haven't: Project → Storage → Create Database → Prisma Postgres.
3. Set `DATABASE_URL` in Project → Settings → Environment Variables to that database's `POSTGRES_URL` value (see [Database](#database) above — not `PRISMA_DATABASE_URL`).
4. Add the rest of the environment variables from `.env.example`: `APP_BASE_URL` (your Vercel URL), `ANTHROPIC_API_KEY`, `TOKEN_ENCRYPTION_KEY`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`/`SECRET` (redirect URI now `https://<your-app>.vercel.app/api/google/callback`), and later `OKTA_*` once that's set up.
5. Deploy. Then run the initial migration against that database once (e.g. `bun --bun run prisma migrate deploy` with `DATABASE_URL` set locally to the production connection string).

> Note: I tried to do this deploy via the `vercel` CLI, but it failed at login with `self signed certificate in certificate chain` — a corporate TLS-inspection certificate that the CLI's bundled Node doesn't trust. Plain `curl`/browser HTTPS to vercel.com works fine on this machine, so the dashboard flow above should be unaffected; you may hit the same CLI error if you try `vercel login` yourself.

## Wiring up real Okta SSO (when ready)

1. Okta Admin Console → Applications → Create App Integration → OIDC, Web Application.
2. Sign-in redirect URI: `{APP_BASE_URL}/api/auth/callback/okta`.
3. Set `OKTA_ISSUER`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET` in `.env`.

Once all three are set, the app automatically switches from the dev-mode login stub to real Okta sign-in — no code changes needed.

## Wiring up Google Tasks

1. Google Cloud Console → APIs & Services → enable the **Google Tasks API**.
2. Credentials → Create OAuth client ID → Web application.
3. Authorized redirect URI: `{APP_BASE_URL}/api/google/callback`.
4. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`.

This is a separate OAuth flow from app login — it's scoped only to Google Tasks access for the signed-in user, tied to their account via the "Connect Google Tasks" button.

## Known quirks

- `next dev`/`next build` run with `--webpack` (see `package.json`) — Turbopack, the Next 16 default, fails to resolve Prisma 7's generated client under Bun's node_modules layout.
- `next dev` also runs with `NODE_TLS_REJECT_UNAUTHORIZED=0` (see `package.json`) — on networks with corporate TLS inspection, Bun's runtime doesn't respect `pg`'s per-connection `ssl: { rejectUnauthorized: false }` option the way real Node.js does, so the Postgres connection fails with `self signed certificate in certificate chain` without this. This is scoped to the local `dev` script only — it doesn't affect the actual deployed app on Vercel, which runs on Node.js and isn't behind that proxy in the first place, and `prisma migrate` isn't affected either since it uses Prisma's own native migration engine rather than the JS driver.
