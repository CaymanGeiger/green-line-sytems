# GreenLine Systems

A portfolio-grade, production-minded SaaS for incident response and reliability operations.

The app consolidates incidents, deploys, errors, logs, alerts, runbooks, and postmortems into a single command dashboard with hardened auth and API controls.

## Overview

- Monitor system health and reliability KPIs from one dashboard.
- Open, triage, and manage incidents with timeline events and assignees.
- Correlate deploy, error, log, and alert signals.
- Maintain versioned runbooks by service/team.
- Author postmortems with action items and owners.
- Track MTTA/MTTR and daily service metrics.

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS
- Prisma ORM 7
- SQLite for local development (schema remains Postgres-compatible by design)
- Route Handlers for server APIs
- Zod for input validation
- `bcryptjs` for password hashing
- `jose` for reset token signing/verification

## Architecture

### Frontend

- App Router route groups:
  - `(auth)` for `signin/signup/forgot-password`
  - `(protected)` for app pages behind session checks
- Shared shell (`src/components/app-shell.tsx`) with active nav underline behavior.
- Route-specific loading skeletons for all major app routes.

### Backend

- Route handlers in `src/app/api/**`.
- Prisma data access layer in `src/lib/prisma.ts`.
- Shared API/auth helpers:
  - `src/lib/api.ts`
  - `src/lib/auth/*`
  - `src/lib/validation.ts`

### Data

- Full incident-command schema in `prisma/schema.prisma`.
- Materialized analytics support via `DailyServiceMetric`.
- Seed and sync scripts in `scripts/`.

## Prisma Schema Summary

Implemented models:

- `User`, `Session`, `Team`, `TeamMembership`
- `Service`, `Environment`
- `Incident`, `IncidentAssignee`, `IncidentTimelineEvent`
- `DeployEvent`, `ErrorEvent`, `LogEvent`, `AlertEvent`
- `Runbook`
- `Postmortem`, `ActionItem`
- `IntegrationCredential`
- `DailyServiceMetric`
- `ApiRateLimitBucket`
- `PasswordResetCode`
- `SavedView` (optional extra)

Implemented enums include:

- User/Team roles
- Service tier
- Incident severity/status/assignee/timeline event types
- Deploy/error/log/alert enums
- Action item status/priority
- Integration providers

## Security Controls Implemented

- Strong password policy with detailed requirement feedback.
- Password hashing with bcrypt + salt (`12` rounds).
- Session cookies:
  - `HttpOnly`
  - `SameSite=Lax`
  - `Secure` in production
  - explicit expiry and path
- Session tokens stored as SHA-256 hashes in DB (`Session.tokenHash`).
- JWT secret guard (min 32 chars) via env validation.
- Forgot password flow:
  - request -> verify -> reset
  - code TTL, max attempts, consume-on-use
  - reset code hashed via keyed HMAC (not plain hash)
- CSRF protection for mutation endpoints using `Origin` and `Sec-Fetch-Site` logic.
- DB-backed rate limiting (`ApiRateLimitBucket`) for auth/sensitive endpoints and internal sync.
- Internal sync endpoint requires `x-internal-token` with timing-safe comparison.
- Strict response hygiene:
  - generic client-facing error messages
  - detailed server-side logging only
- Hardened response headers in `next.config.ts`:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Strict-Transport-Security`
  - `Content-Security-Policy`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure env:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Run migrations:

```bash
npm run prisma:migrate -- --name init
```

5. Seed demo data:

```bash
npm run db:seed
```

6. (Optional) Recompute daily metrics:

```bash
npm run metrics:recompute
```

7. Run dev server:

```bash
npm run dev
```

App URL: [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example`:

- `DATABASE_URL`
- `AUTH_JWT_SECRET`
- `INTERNAL_SYNC_TOKEN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `APP_URL`
- `NODE_ENV`

## Demo Credentials

- `admin@demo.dev / password`
- `ic@demo.dev / password`
- `engineer@demo.dev / password`

## Scripts

- `npm run dev` - start local server
- `npm run lint` - run ESLint
- `npm run build` - production build (webpack mode)
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - run Prisma migrate dev
- `npm run db:seed` - seed database with realistic demo data
- `npm run sync:mock-events` - ingest additional mock incidents/events
- `npm run metrics:recompute` - rebuild `DailyServiceMetric`

## API Surface

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/signout`
- `GET /api/auth/session`
- `POST /api/auth/forgot-password/request`
- `POST /api/auth/forgot-password/verify`
- `POST /api/auth/forgot-password/reset`

Account:

- `GET/PATCH /api/account/profile`
- `PATCH /api/account/password`

Incident domain:

- `GET/POST /api/incidents`
- `GET/PATCH /api/incidents/[id]`
- `POST /api/incidents/[id]/timeline`

Knowledge/reliability:

- `GET/POST /api/runbooks`
- `GET/PATCH /api/runbooks/[id]`
- `GET/PUT /api/postmortems/[incidentId]`

Internal ingest:

- `POST /api/internal/sync/events` (`x-internal-token` required)

Optional extras:

- `GET/POST/DELETE /api/saved-views`

## Deploy Notes (Vercel + Managed DB)

### Vercel

- Add all env vars in Vercel project settings.
- Use `npm run build` as build command.
- Ensure `AUTH_JWT_SECRET` and `INTERNAL_SYNC_TOKEN` are strong random values.

### Database

- Local dev uses SQLite (`file:./dev.db`).
- For production, prefer managed Postgres.
- Schema is modeled to remain Postgres-compatible (enums/relations/indexing patterns are portable).

### Migration in CI/CD

- Run `npm run prisma:generate`
- Run `npm run prisma:migrate -- --name deploy` in controlled deploy workflows

## Limitations

- Forgot-password email delivery depends on valid `RESEND_API_KEY` + `RESEND_FROM_EMAIL` configuration.
- Internal sync currently ingests batches but does not yet implement dedupe logic for all provider payload variants.
- Saved views are user-scoped and basic (no sharing/ACL model yet).

## Future Improvements

- Add SSO/SAML/OIDC and MFA.
- Add background jobs/queues for connector ingestion and retries.
- Add audit logs for all mutation endpoints.
- Add OpenTelemetry tracing and error budget/SLO widgets.
- Add richer charts for KPI trends and service reliability forecasting.
- Add encrypted secrets-at-rest integration for `IntegrationCredential`.
