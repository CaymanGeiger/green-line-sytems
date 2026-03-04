# DevOps Incident Command Center

A portfolio-grade, production-minded SaaS for incident response, reliability operations, and team-scoped DevOps collaboration.

DevOps Incident Command Center combines:
- Unified command dashboard for incidents, deploys, alerts, logs, and errors
- Team-scoped operations with org/team/member permission controls
- Incident lifecycle management with timelines, assignees, and postmortems
- Runbook authoring and version history
- Action-item remediation queue
- Saved views for reusable filters
- Full DevOps Failure Simulator (`/test-dev-ops`) that writes real telemetry into the platform data model

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- React 19
- Prisma ORM 7
- SQLite for local development
- Postgres-compatible Prisma schema design for deployment
- Tailwind CSS v4
- Zod for request/input validation
- `bcryptjs` for password hashing
- Vitest for unit/API tests
- Playwright for end-to-end UI regression coverage

## Features

- Command Dashboard (`/`)
  - KPI cards for open incidents, SEV distribution, deploy volume, error spikes, MTTA, MTTR
  - Active incidents table
  - Recent deploys panel
  - Recent errors panel
  - team/service/environment/time-window filtering
  - simulation-only metric filtering

- Incidents (`/incidents`, `/incidents/[id]`)
  - searchable/filterable incident list
  - status/severity/service/date/sort filters
  - paginated list with timeline context
  - incident detail with status/severity updates and timeline notes
  - linked deploys/alerts/runbooks panels

- Services (`/services`, `/services/[id]`)
  - service inventory with current operational context
  - service-level incident/deploy/error signals
  - simulation-only filtering

- Runbooks (`/runbooks`, `/runbooks/[id]`)
  - runbook library by team/service
  - create/edit runbooks with markdown + versioning
  - active/inactive state and version history

- Postmortems (`/postmortems`, `/postmortems/[incidentId]`)
  - postmortem index for resolved incidents
  - structured postmortem editor
  - embedded action-item definition

- Action Items (`/action-items`)
  - remediation queue workspace
  - create/update/complete/delete item flows
  - owner, due date, status, priority controls

- Saved Views (`/saved-views`)
  - save dashboard/incidents filter sets
  - open/apply/reset views directly on target pages

- Organizations and Permissions (`/organizations`, `/permissions`)
  - multi-organization support
  - org members + invites
  - team creation and membership assignment
  - feature-level permission matrix (view/create/update/delete)
  - full-access toggles and inherited org-admin access semantics

- Account and Access Controls (`/account`)
  - profile + password management
  - delete-account with ownership transfer or full-delete safeguards
  - onboarding/get-started drawer
  - employee access request + verification flow

- DevOps Failure Simulator (`/test-dev-ops`)
  - team selector + environment profile entry
  - service simulators with healthy/warning/failure outcomes
  - one-click incident presets
  - global fault injection controls
  - live telemetry feed (polling)
  - recover and purge simulator-generated data

## Architecture Overview

### Data Ingestion and Simulation

Primary signal sources in this app:

1. Internal sync ingest endpoint
- `POST /api/internal/sync/events`
- accepts deploy/error/log/alert batches (internal token protected)

2. Simulator API ingest
- `POST /api/test-dev-ops/simulate`
- `POST /api/test-dev-ops/preset`
- `POST /api/test-dev-ops/recover`
- `POST /api/test-dev-ops/purge`
- `GET /api/test-dev-ops/feed`

3. Scripts for local/dev data workflows
- `scripts/seed.ts`
- `scripts/sync-mock-events.ts`
- `scripts/recompute-metrics.ts`
- `scripts/backfill-simulated.ts`

Flow:
1. Create baseline org/team/user/service graph with `seed.ts`.
2. Generate telemetry from simulator routes or `sync-mock-events.ts`.
3. Persist canonical rows in `DeployEvent`, `ErrorEvent`, `LogEvent`, `AlertEvent`, plus `Incident`/`IncidentTimelineEvent` when thresholds require.
4. Recompute materialized daily reliability metrics via `recompute-metrics.ts`.
5. Render dashboard/service/incident pages from those normalized relational tables.

### Storage Model

Prisma schema (`prisma/schema.prisma`) includes:

Core identity/access:
- `User`, `Session`
- `Organization`, `OrganizationMembership`, `OrganizationInvite`
- `Team`, `TeamMembership`, `TeamPermission`, `TeamInvite`
- `EmployeeAccessGrantInvite`
- `UiPreference`, `SavedView`

Operational domain:
- `Service`, `Environment`
- `Incident`, `IncidentAssignee`, `IncidentTimelineEvent`
- `DeployEvent`, `ErrorEvent`, `LogEvent`, `AlertEvent`
- `Runbook`, `Postmortem`, `ActionItem`
- `DailyServiceMetric`

Security/ops support:
- `ApiRateLimitBucket` (DB-backed rate limiting)
- `PasswordResetCode` (TTL + attempts + consume-on-use)
- `IntegrationCredential` (encrypted connector token placeholder)

### App Routing

Auth routes (`src/app/(auth)`):
- `/signin`, `/signup`
- `/forgot-password`
- `/team-invite`, `/team-invite/verify`

Protected routes (`src/app/(protected)`):
- `/` dashboard
- `/incidents`, `/incidents/[id]`
- `/services`, `/services/[id]`
- `/runbooks`, `/runbooks/[id]`
- `/postmortems`, `/postmortems/[incidentId]`
- `/action-items`
- `/saved-views`
- `/organizations`
- `/permissions`
- `/account`
- `/test-dev-ops`, `/test-dev-ops/[teamId]`, `/test-dev-ops/[teamId]/[serviceId]`

### API Design Pattern

- Route Handlers under `src/app/api/**`
- Mutation guards via shared helpers in `src/lib/api.ts`
- Zod validation in `src/lib/validation.ts`
- Team-scoped authz checks in `src/lib/auth/permissions.ts`
- Generic client errors + server-side diagnostics

## Security Model

This project uses server-side session auth with database-backed session records and strong route protection defaults.

### Authentication and Sessions

- Sign-in creates a cryptographically random session token
- Only token hash is stored in DB (`Session.tokenHash`)
- Cookie name: `dcc_session`
- Cookie flags:
  - `HttpOnly`
  - `SameSite=Lax`
  - `Secure` in production
  - explicit `path=/` and expiry
- Session TTL defaults to 7 days

Key file:
- `src/lib/auth/session.ts`

### Authorization

- All protected pages require authenticated user context
- Team-scoped permission checks gate each domain feature (dashboard, incidents, services, runbooks, postmortems, action items, simulator, permissions, etc.)
- Org-level and team-level role inheritance is enforced server-side

Key files:
- `src/lib/auth/permissions.ts`
- `src/lib/auth/team-access.ts`

### CSRF Mitigation

Mutation requests enforce CSRF checks:
- reject disallowed `sec-fetch-site` values
- validate `origin` host/protocol when provided

Key file:
- `src/lib/auth/csrf.ts`

### Brute-Force and Abuse Controls

Rate limiting is DB-backed (`ApiRateLimitBucket`) and applied to:
- auth endpoints (signin/signup/reset flows)
- sensitive account/team/org mutation routes
- simulator mutation endpoints
- internal sync endpoint

Key files:
- `src/lib/auth/rate-limit.ts`
- `src/lib/api.ts`

### Password Security

- Password policy requires:
  - minimum 8 characters
  - at least one uppercase letter
  - at least one special char from `! ? @ # $`
- Password hashing via `bcrypt` (`12` rounds)

Key file:
- `src/lib/auth/password.ts`

### Password Reset Security

- Reset flow: request -> verify -> reset
- 6-digit code format
- Code storage via keyed HMAC hash (`sha256` + secret), never plaintext
- TTL and max-attempt checks
- consume-on-use semantics

Key files:
- `src/lib/auth/reset.ts`
- `src/app/api/auth/forgot-password/*`

### Invite and Employee-Access Security

- Team/org invite tokens stored and validated via token hash
- Employee access request links are signed and expiry-bound
- Verification grants are explicit and auditable through DB records

Key files:
- `src/lib/auth/team-invite.ts`
- `src/lib/auth/organization-invite.ts`
- `src/lib/auth/employee-access-request-link.ts`
- `src/lib/auth/employee-access-grant.ts`

### Internal Sync Endpoint Protection

- Internal ingest route requires `x-internal-token`
- token comparison uses timing-safe compare
- additional rate limiting applied by client IP

Route:
- `POST /api/internal/sync/events`

Key file:
- `src/app/api/internal/sync/events/route.ts`

### Security Headers

Configured globally in `next.config.ts`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restrictive defaults
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `poweredByHeader: false`

## Environment Variables

Create `.env` in project root:

```bash
# Database
DATABASE_URL="file:./dev.db"

# Auth and signed token utilities (min 32 chars)
AUTH_JWT_SECRET="replace-with-a-long-random-secret-at-least-32-characters"

# Internal sync route protection
INTERNAL_SYNC_TOKEN="replace-with-a-long-random-internal-token"

# Email delivery
RESEND_API_KEY=""
RESEND_FROM_EMAIL="noreply@example.com"

# App URL and env
APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## Local Development

Install dependencies:

```bash
npm install
```

Generate Prisma client + run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

Seed demo data:

```bash
npm run db:seed
```

Run development server:

```bash
npm run dev
```

Open:
- [http://localhost:3000](http://localhost:3000)

## Data Sync and Seed Commands

### Seed baseline platform data

```bash
npm run db:seed
```

### Generate additional realistic telemetry

```bash
npm run sync:mock-events
```

### Recompute daily reliability metrics

```bash
npm run metrics:recompute
```

### Backfill simulator flags for legacy data

```bash
npm run db:backfill-simulated
```

## API Routes (App Router)

Auth:
- `POST /api/auth/signin`
- `POST /api/auth/signup`
- `POST /api/auth/signout`
- `GET /api/auth/session`
- `POST /api/auth/forgot-password/request`
- `POST /api/auth/forgot-password/verify`
- `POST /api/auth/forgot-password/reset`
- `POST /api/auth/team-invite`
- `POST /api/auth/team-invite/accept`
- `POST /api/auth/team-invite/verify-existing`

Account and preferences:
- `PATCH /api/account/profile`
- `PATCH /api/account/password`
- `POST /api/account/delete`
- `POST /api/account/active-team`
- `PATCH /api/account/ui-preferences`

Organizations, teams, members, permissions:
- `POST /api/account/organizations`
- `PATCH /api/account/organizations/[organizationId]`
- `POST/DELETE /api/account/organizations/[organizationId]/members`
- `POST /api/account/teams`
- `POST/DELETE /api/account/teams/[teamId]/members`
- `PUT /api/account/teams/[teamId]/permissions`

Employee access flow:
- `GET /api/account/employee-access/options`
- `POST /api/account/employee-access/resolve`
- `POST /api/account/employee-access/issue`

Core domain APIs:
- `GET/POST /api/incidents`
- `GET/PATCH /api/incidents/[id]`
- `POST /api/incidents/[id]/timeline`
- `GET/POST /api/runbooks`
- `GET/PATCH /api/runbooks/[id]`
- `GET/PUT /api/postmortems/[incidentId]`
- `GET/POST /api/action-items`
- `PATCH/DELETE /api/action-items/[id]`
- `GET/POST/DELETE /api/saved-views`

Simulator APIs:
- `POST /api/test-dev-ops/simulate`
- `POST /api/test-dev-ops/preset`
- `GET /api/test-dev-ops/feed`
- `POST /api/test-dev-ops/recover`
- `POST /api/test-dev-ops/purge`

Internal ingest:
- `POST /api/internal/sync/events` (requires `x-internal-token`)

## Database Workflows

Create/update local migration after schema changes:

```bash
npm run prisma:migrate -- --name your_migration_name
```

Regenerate Prisma client:

```bash
npm run prisma:generate
```

Apply migrations in production:

```bash
npx prisma migrate deploy
```

Open Prisma Studio:

```bash
npx prisma studio
```

## Deployment

Recommended stack:
- Vercel (Next.js host)
- Managed Postgres (Neon/Supabase/RDS/Render/etc.)

### Production checklist

1. Set production `DATABASE_URL` to Postgres.
2. Set high-entropy `AUTH_JWT_SECRET` (>= 32 chars).
3. Set high-entropy `INTERNAL_SYNC_TOKEN`.
4. Configure `APP_URL` to production origin.
5. Configure `RESEND_API_KEY` and verified `RESEND_FROM_EMAIL`.
6. Run migrations with `npx prisma migrate deploy` in CI/CD.
7. Validate HTTPS + secure cookies + CSP behavior in production.

Suggested build/deploy sequence:

```bash
npm run prisma:generate && npx prisma migrate deploy && npm run build
```

## Testing and Quality

Lint:

```bash
npm run lint
```

Unit/API tests:

```bash
npm run test:run
```

E2E tests:

```bash
npm run test:e2e
```

Production build verification:

```bash
npm run build
```

## Demo Credentials

Seed script creates these demo users:
- `admin@demo.dev / password`
- `ic@demo.dev / password`
- `engineer@demo.dev / password`
- `viewer@demo.dev / password`

## Known Tradeoffs / Future Improvements

- Some analytics are computed on demand; heavy org-scale workloads can be moved to scheduled materialization/background jobs.
- DB-backed rate limiting works well locally/single DB, but ultra-high throughput may benefit from dedicated Redis-based limiter infrastructure.
- Integration credentials are modeled for extension; production-grade encrypted secret management/HSM integration can be expanded.
- Additional contract tests can be added for connector payload drift and long-running simulator sequence scenarios.
- Alert deduplication/correlation rules can be expanded for advanced incident intelligence.

## Portfolio Notes

This project demonstrates practical full-stack SaaS engineering across:
- multi-tenant-like org/team data modeling and access control
- secure auth/session architecture and hardening
- operational domain modeling for incident management and reliability telemetry
- modern App Router UX with loading states, skeletons, and responsive behavior
- high-signal simulation tooling for live product demonstrations
- automated quality workflows (unit, API, and E2E testing)
