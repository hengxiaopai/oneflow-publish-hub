# Phase 5 SaaS Authentication And Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add password authentication, persistent Cookie Sessions, Workspace tenant enforcement, RBAC, Workspace-plan entitlements, and PostgreSQL-compatible Prisma configuration without rewriting the Vanilla JS frontend.

**Architecture:** Keep SQLite as the executable local/test datasource and add a parallel PostgreSQL schema with identical models. Route both persistent Cookie Auth and non-production dev header auth through one database-backed session service, then apply centralized RBAC and workspace filtering before business services run.

**Tech Stack:** Node.js 22, Fastify 5, Prisma 7, SQLite, PostgreSQL-compatible Prisma schema, `@fastify/cookie`, Argon2id, Vanilla JavaScript, Node test runner.

---

### Task 1: Define failing authentication and session tests

**Files:**
- Create: `server/tests/auth-register-login.test.js`
- Create: `server/tests/session.test.js`
- Modify: `server/tests/helpers.js`

- [ ] Test registration, duplicate email rejection, password hashing, login Cookie, generic invalid credentials, `auth/me`, logout, sensitive field redaction, expiration, and production dev-session denial.
- [ ] Run the two files and confirm they fail because register/login, Cookie parsing, and persistent Session do not exist.

### Task 2: Define failing tenant, RBAC, entitlement, and frontend tests

**Files:**
- Create: `server/tests/workspace-isolation.test.js`
- Create: `server/tests/rbac.test.js`
- Modify: `server/tests/entitlements.test.js`
- Modify: `tests/api-client.test.js`
- Modify: `tests/saas-shell.test.js`

- [ ] Test membership denial, viewer/editor/admin boundaries, Workspace.plan quota decisions, Cookie credentials, Auth Mode markup, state restore, and logout.
- [ ] Run the focused files and confirm the intended failures.

### Task 3: Extend Prisma models and datasource compatibility

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/schema.postgresql.prisma`
- Create: `server/prisma/postgresql.config.ts`
- Create: `server/prisma/migrations/*_phase_5_auth_tenancy/migration.sql`
- Modify: `server/package.json`
- Modify: `package.json`

- [ ] Add User email/name/avatar/passwordHash/status, Session, AuthIdentity, Workspace ownerId/plan, and role indexes.
- [ ] Generate SQLite migration and validate both schemas.
- [ ] Keep all model fields portable between SQLite and PostgreSQL.

### Task 4: Implement password and persistent session services

**Files:**
- Create: `server/src/services/passwordService.js`
- Rewrite: `server/src/services/sessionService.js`
- Modify: `server/src/config.js`
- Modify: `server/src/env.js`
- Modify: `server/.env.example`
- Modify: `server/src/index.js`

- [ ] Add Argon2id hash/verify and normalized email validation.
- [ ] Store only token hashes, expiry, user agent, and hashed IP.
- [ ] Register Cookie parsing and cookie policy configuration.
- [ ] Make authentication middleware resolve Cookie or dev header asynchronously.

### Task 5: Implement auth routes and dev-only behavior

**Files:**
- Rewrite: `server/src/routes/auth.js`
- Modify: `server/src/middleware/auth.js`
- Modify: `server/src/middleware/requestLogger.js`
- Modify: `server/src/middleware/security.js`

- [ ] Implement register/login/logout/me.
- [ ] Create default Workspace and Free subscription transactionally.
- [ ] Apply login/register rate limits and production dev-session denial.
- [ ] Return safe auth projections only.

### Task 6: Add centralized RBAC and tenant enforcement

**Files:**
- Create: `server/src/services/rbacService.js`
- Modify: `server/src/routes/articles.js`
- Modify: `server/src/routes/channels.js`
- Modify: `server/src/routes/publish.js`
- Modify: `server/src/routes/usage.js`
- Modify: `server/src/routes/workspaces.js`

- [ ] Add member/editor/admin/owner permission helpers.
- [ ] Apply write permissions to content, channels, publishing, and retries.
- [ ] Ensure all reads and writes use `request.auth.workspaceId`.

### Task 7: Bind entitlements to Workspace.plan

**Files:**
- Modify: `server/src/services/entitlementService.js`
- Modify: `server/src/routes/articles.js`
- Modify: `server/src/routes/channels.js`
- Modify: `server/src/routes/publish.js`

- [ ] Read plan from Workspace.
- [ ] Preserve Subscription for billing metadata.
- [ ] Return `ENTITLEMENT_LIMIT_EXCEEDED` with structured details for quota rejection.

### Task 8: Update idempotent seed

**Files:**
- Modify: `server/prisma/seed.js`
- Modify: `server/tests/seed.test.js`
- Modify: `.env.example`
- Modify: `server/.env.example`

- [ ] Read `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD`.
- [ ] Hash the password and seed identity/workspace only when both are configured.
- [ ] Keep seed idempotent and never include plaintext credentials in source or output.

### Task 9: Add SaaS Auth Mode to the frontend

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `api-client.js`
- Modify: `saas-shell.js`

- [ ] Replace cloud placeholder with login/register forms.
- [ ] Add register/login/auth restore/logout API calls with `credentials: include`.
- [ ] Reuse remote workspace loading for `saas_auth`.
- [ ] Preserve Local Demo and SaaS Dev behavior.

### Task 10: Update documentation and deployment configuration

**Files:**
- Create: `docs/auth-design.md`
- Create: `docs/workspace-multitenancy.md`
- Create: `docs/rbac-model.md`
- Create: `docs/postgres-migration.md`
- Modify: `docs/security-model.md`
- Modify: `docs/backend-api-design.md`
- Modify: `docs/backend-setup.md`
- Modify: `docs/deployment-notes.md`
- Modify: `README.md`
- Modify: `docker-compose.yml`
- Modify: `.github/workflows/ci.yml`

- [ ] Document Cookie/session behavior, dev-only path, PostgreSQL schema workflow, RBAC, and limitations.
- [ ] Add PostgreSQL validation to CI without requiring a live PostgreSQL server.

### Task 11: Full verification and Git

**Files:**
- Create screenshots under `docs/screenshots/`

- [ ] Run `npm test`, `npm run check`, PostgreSQL schema validation, database reset, and sensitive scan.
- [ ] Browser-test Local, Dev, Auth register/login/refresh/logout at 1440 and 820 with no horizontal overflow.
- [ ] Run `git status`, commit `feat: add SaaS authentication and workspace tenancy`, and push `main`.
