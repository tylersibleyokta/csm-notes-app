# CSM Meeting Notes

Capture meeting notes, get an AI-cleaned summary plus extracted next-step action items, and push those action items straight to your own Google Tasks.

## Local development

This project uses [Bun](https://bun.sh) (no system Node.js install required).

```bash
bun install
bun --bun run prisma migrate dev   # first time only, creates prisma/dev.db
bun --bun run dev
```

Open http://localhost:3000. With no Okta app configured (see below), sign-in uses a local dev-mode stub — enter any name/email.

You'll still need real credentials for two things that talk to external services:

- **`ANTHROPIC_API_KEY`** — the "Clean up with AI" step calls the Claude API.
- **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`** — the "Connect Google Tasks" step needs a real Google OAuth client with the Tasks API enabled, even in dev mode.

Copy `.env.example` values you don't have into `.env` and fill them in.

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

## Data

Local dev uses SQLite (`prisma/dev.db`) via [`prisma-adapter-bun-sqlite`](https://github.com/mmvsk/prisma-adapter-bun-sqlite) (Bun's native `bun:sqlite`, since `better-sqlite3`'s native bindings [aren't supported under Bun](https://github.com/oven-sh/bun/issues/4290)). To move to Postgres for a real deployment, swap the adapter in `src/lib/prisma.ts` for `@prisma/adapter-pg` and change `datasource db` in `prisma/schema.prisma` to `provider = "postgresql"`.

`next dev`/`next build` run with `--webpack` (see `package.json`) — Turbopack, the Next 16 default, fails to resolve Prisma 7's generated client under Bun's node_modules layout.
