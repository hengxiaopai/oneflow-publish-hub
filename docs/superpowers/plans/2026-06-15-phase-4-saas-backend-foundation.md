# Phase 4 SaaS Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a runnable Fastify and Prisma backend plus a minimal Vanilla JS API integration while preserving OneFlow Local Demo Mode.

**Architecture:** Fastify exposes workspace-scoped REST APIs backed by Prisma and SQLite. Local development sessions establish user and workspace context, service modules enforce entitlements and encrypt channel credentials, and a synchronous local Mock Worker records publish task state transitions. The existing frontend opts into this backend through `api-client.js`.

**Tech Stack:** Node.js 22, Fastify 5, Prisma ORM, SQLite, AES-256-GCM, Vanilla JavaScript, Node.js test runner.

---

### Task 1: Server Scaffold and Prisma Schema

**Files:**
- Create: `server/package.json`
- Create: `server/prisma.config.ts`
- Create: `server/prisma/schema.prisma`
- Create: `server/.env.example`
- Create: `server/src/config.js`
- Create: `server/src/db.js`

- [ ] Write a failing schema contract test for all required models,
  `workspaceId` ownership, snapshots, and encrypted credentials.
- [ ] Run the test and confirm it fails because the server scaffold is absent.
- [ ] Add Fastify and Prisma dependencies, Prisma configuration, and the SQLite
  schema.
- [ ] Generate Prisma Client, push the test schema, and rerun the contract test.

### Task 2: Local Development Authentication

**Files:**
- Create: `server/src/index.js`
- Create: `server/src/services/sessionService.js`
- Create: `server/src/middleware/auth.js`
- Create: `server/src/routes/auth.js`
- Create: `server/src/routes/workspaces.js`
- Create: `server/tests/helpers.js`
- Create: `server/tests/auth.test.js`

- [ ] Write failing tests for dev session creation, `auth/me`, workspace listing,
  logout, and unauthenticated access.
- [ ] Verify the failures.
- [ ] Implement in-memory dev sessions backed by persisted User, Workspace,
  WorkspaceMember, Subscription, and seeded AI capability records.
- [ ] Rerun the auth tests.

### Task 3: Server Entitlements and Article CRUD

**Files:**
- Create: `server/src/services/entitlementService.js`
- Create: `server/src/services/articleService.js`
- Create: `server/src/routes/articles.js`
- Create: `server/tests/entitlements.test.js`
- Create: `server/tests/articles.test.js`

- [ ] Write failing tests for Free limits, Article CRUD, structured JSON
  fields, and cross-workspace isolation.
- [ ] Verify the failures.
- [ ] Implement pure server entitlement decisions and workspace-scoped Article
  queries.
- [ ] Rerun entitlement and Article tests.

### Task 4: Channel Credentials

**Files:**
- Create: `server/src/services/credentialService.js`
- Create: `server/src/services/channelService.js`
- Create: `server/src/routes/channels.js`
- Create: `server/tests/channels.test.js`
- Create: `server/tests/token-security.test.js`

- [ ] Write failing tests for encrypted storage, API redaction, connection
  testing, updates, Free channel limits, and isolation.
- [ ] Verify the failures.
- [ ] Implement AES-256-GCM helpers, safe response mapping, and channel routes.
- [ ] Rerun channel and token security tests.

### Task 5: Publish Snapshots and Mock Worker

**Files:**
- Create: `server/src/services/mockPublisherService.js`
- Create: `server/src/services/publishService.js`
- Create: `server/src/routes/publish.js`
- Create: `server/tests/publish.test.js`

- [ ] Write failing tests for batch creation, immutable snapshots, generated
  tasks, successful result URLs, deterministic failure, retry success, and
  workspace isolation.
- [ ] Verify the failures.
- [ ] Implement snapshot creation, task transitions, worker execution, batch
  summaries, and retry behavior.
- [ ] Rerun publish tests.

### Task 6: Usage API and Frontend API Client

**Files:**
- Create: `server/src/routes/usage.js`
- Create: `api-client.js`
- Create: `tests/api-client.test.js`
- Modify: `index.html`
- Modify: `saas-shell.js`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `tests/saas-shell.test.js`
- Modify: `tests/app.test.js`

- [ ] Write failing tests for API client headers, backend-unavailable errors,
  SaaS Dev Mode, remote Dashboard data, Article save, and publish sync hooks.
- [ ] Verify the failures.
- [ ] Implement the API client and add the SaaS Dev Mode login action.
- [ ] Connect Dashboard, content library, debounced workbench saves, and local
  batch events to backend API calls without changing Local Demo Mode.
- [ ] Rerun all frontend tests.

### Task 7: Documentation

**Files:**
- Create: `docs/backend-setup.md`
- Create: `docs/server-token-security.md`
- Modify: `docs/backend-api-design.md`
- Modify: `docs/server-side-publisher-design.md`
- Modify: `docs/saas-architecture.md`
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] Document setup, Prisma commands, SQLite location, both frontend modes,
  local-only authentication, encryption limits, Worker behavior, and the
  PostgreSQL migration boundary.
- [ ] Confirm no real tokens, passwords, cookies, databases, or generated
  Prisma Client files are tracked.

### Task 8: Verification and Publish

**Files:**
- Add Phase 4 acceptance screenshots under `docs/screenshots/`.

- [ ] Run frontend tests and syntax checks.
- [ ] Run backend tests and syntax checks.
- [ ] Run `prisma validate`.
- [ ] Run 1440px and 820px browser acceptance against frontend and backend.
- [ ] Inspect console errors and warnings.
- [ ] Run secret scans and staged diff checks.
- [ ] Commit with `feat: add SaaS backend foundation`.
- [ ] Push `main` to GitHub.
