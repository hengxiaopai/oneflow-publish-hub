# Phase 4.1 Backend Engineering Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Phase 4 SaaS backend reproducible, consistently observable,
secure by default, documented, and ready for CI and containerized local use.

**Architecture:** Preserve the Fastify route/service structure and Vanilla JS
frontend. Add focused infrastructure modules around it, plus root-level Node
scripts that work on Windows and CI without requiring a frontend framework.

**Tech Stack:** Node.js 22, npm workspaces, Fastify 5, Prisma 7, SQLite,
Vanilla JS, Docker Compose, GitHub Actions.

---

### Task 1: Environment Contract

**Files:**
- Create: `server/src/env.js`
- Modify: `server/src/config.js`
- Modify: `server/.env.example`
- Test: `server/tests/env.test.js`

- [ ] Write tests for missing secrets, short encryption keys, invalid ports,
  wildcard production CORS, and valid test overrides.
- [ ] Run the env test and confirm it fails because `env.js` is absent.
- [ ] Implement parsing and `EnvironmentValidationError`.
- [ ] Run the env test and existing auth test.

### Task 2: API Envelope and Error Boundary

**Files:**
- Create: `server/src/http/response.js`
- Create: `server/src/middleware/errorHandler.js`
- Create: `server/src/middleware/requestLogger.js`
- Modify: `server/src/index.js`
- Modify: `server/src/routes/*.js`
- Test: `server/tests/api-contract.test.js`

- [ ] Write failing tests for success envelopes, validation errors, 404,
  request IDs, content-type errors, and secret redaction.
- [ ] Implement response helpers, not-found handling, Prisma error mapping,
  and request logging.
- [ ] Convert auth, workspace, article, channel, publish, and usage routes.
- [ ] Update existing backend tests to read `body.data` under `ok: true`.

### Task 3: Security Middleware

**Files:**
- Create: `server/src/middleware/security.js`
- Modify: `server/package.json`
- Modify: `server/src/index.js`
- Test: `server/tests/security.test.js`

- [ ] Write failing tests for CORS allow/deny, security headers, JSON-only
  mutations, body limit, and rate limiting.
- [ ] Install compatible Fastify security plugins.
- [ ] Register CORS allowlist, helmet, rate limit, and JSON-only hook.
- [ ] Verify protected routes and existing API tests.

### Task 4: Seed and Database Commands

**Files:**
- Create: `server/prisma/seed.js`
- Modify: `server/prisma.config.ts`
- Modify: `server/package.json`
- Test: `server/tests/seed.test.js`

- [ ] Write an idempotency test that runs seed twice and compares counts.
- [ ] Implement deterministic upserts without credentials.
- [ ] Add generate, migrate, seed, and reset scripts.
- [ ] Verify a fresh SQLite database can be initialized and seeded.

### Task 5: OpenAPI

**Files:**
- Create: `server/src/openapi.js`
- Modify: `server/src/index.js`
- Create: `docs/openapi.md`
- Test: `server/tests/openapi.test.js`

- [ ] Write a failing test for `/api/openapi.json` and required path keys.
- [ ] Implement an OpenAPI 3.1 document and health endpoint.
- [ ] Document viewing and exporting the specification.

### Task 6: Root Monorepo Tooling

**Files:**
- Create: `package.json`
- Create: `scripts/static-server.js`
- Create: `scripts/dev.js`
- Create: `scripts/check.js`
- Create: `scripts/scan-sensitive.js`
- Create: `package-lock.json`

- [ ] Add root scripts for development, tests, checks, Prisma lifecycle, and
  sensitive scanning.
- [ ] Make the combined dev script forward shutdown signals to both children.
- [ ] Run every non-destructive root command.

### Task 7: API Client Stability

**Files:**
- Modify: `api-client.js`
- Modify: `saas-shell.js`
- Modify: `index.html`
- Modify: `styles.css`
- Test: `tests/api-client.test.js`
- Test: `tests/saas-shell.test.js`

- [ ] Write failing tests for envelopes, timeout, malformed responses, and
  connection-state notifications.
- [ ] Implement abort timeout and normalized client errors.
- [ ] Display connecting, connected, unavailable, and local-only states using
  the existing login and profile surfaces.
- [ ] Confirm Local Demo Mode avoids API requests.

### Task 8: Docker and CI

**Files:**
- Create: `server/Dockerfile`
- Create: `server/.dockerignore`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.github/workflows/ci.yml`

- [ ] Add a non-root Node image, health check, SQLite volume, and startup
  initialization.
- [ ] Add CI for install, frontend/backend tests, checks, Prisma validate, and
  sensitive scanning.
- [ ] Validate Compose config and build when Docker is available.

### Task 9: Documentation and Acceptance

**Files:**
- Modify: `README.md`
- Modify: `docs/backend-setup.md`
- Create: `docs/development-workflow.md`
- Create: `docs/api-error-format.md`
- Create: `docs/deployment-notes.md`

- [ ] Document Local Demo, SaaS Dev, environment setup, database lifecycle,
  Docker, API docs, tests, limitations, and production boundaries.
- [ ] Run complete frontend and backend test suites.
- [ ] Run syntax, Prisma, sensitive-data, and Git checks.
- [ ] Verify connected and disconnected browser states at 1440px and 820px.
- [ ] Commit with `chore: harden SaaS backend foundation`.
- [ ] Push `main` and verify local/remote parity.
