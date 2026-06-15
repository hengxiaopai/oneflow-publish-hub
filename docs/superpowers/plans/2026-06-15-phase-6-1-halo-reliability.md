# Phase 6.1 Halo Publisher Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SSRF protection, smoke testing, idempotent task execution, database locks, explainable retries, slug conflict recovery, and safe task timelines to the existing server-side Halo publisher.

**Architecture:** Keep the current Fastify and Prisma process-internal worker, but extract reliability concerns into focused services. The Halo worker becomes an orchestrator that acquires a database lease, emits safe events, applies retry policy, resolves one slug conflict, and reuses terminal idempotent results.

**Tech Stack:** Node.js 22, Fastify, Prisma, SQLite/PostgreSQL schemas, Vanilla JS, Node test runner.

---

### Task 1: Environment And URL Safety

**Files:**
- Create: `server/src/services/urlSafetyService.js`
- Create: `server/tests/url-safety.test.js`
- Modify: `server/src/env.js`
- Modify: `server/src/index.js`
- Modify: `server/src/routes/haloChannels.js`
- Modify: `server/.env.example`

- [ ] Write failing tests for private IPv4, localhost, metadata hosts, invalid schemes, production HTTP, and explicit development override.
- [ ] Run `node --test server/tests/url-safety.test.js` with a prepared test database and confirm failures are caused by missing service behavior.
- [ ] Implement `assertSafeRemoteUrl(value, { nodeEnv, allowPrivateHaloUrls, resolveHost })` with normalized `UNSAFE_REMOTE_URL` errors.
- [ ] Inject URL safety into Halo connect, test and request execution.
- [ ] Run URL safety and existing Halo channel tests.

### Task 2: Smoke Test

**Files:**
- Create: `server/scripts/halo-smoke-test.js`
- Create: `server/tests/halo-smoke-script.test.js`
- Modify: `package.json`
- Modify: `server/package.json`

- [ ] Write failing tests for missing-env skip, PAT redaction, timestamped title and safe remote output.
- [ ] Implement a dependency-injectable `runHaloSmokeTest()` plus CLI entrypoint.
- [ ] Add `test:halo-smoke` scripts; do not add it to CI or the normal test command.
- [ ] Verify the script skips with exit code 0 when variables are missing.

### Task 3: Prisma Reliability Fields

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `server/prisma/schema.postgresql.prisma`
- Create: `server/prisma/migrations/20260615193000_halo_publisher_reliability/migration.sql`
- Modify: `server/tests/schema.test.js`

- [ ] Add failing schema assertions for idempotency, lock, retry and event fields.
- [ ] Add `PublishTaskEvent` relations and a workspace-scoped unique idempotency constraint.
- [ ] Validate both Prisma schemas and regenerate the client.

### Task 4: Idempotency And Task Locks

**Files:**
- Create: `server/src/services/publishIdempotencyService.js`
- Create: `server/src/services/taskLockService.js`
- Create: `server/tests/publish-idempotency.test.js`
- Create: `server/tests/task-lock.test.js`
- Modify: `server/src/services/publishService.js`

- [ ] Write failing tests for stable keys, duplicate batch reuse, one concurrent execution and expired lock recovery.
- [ ] Generate SHA-256 keys from canonical JSON values.
- [ ] Acquire locks with atomic conditional `updateMany`, lease expiry and owner identity.
- [ ] Reuse terminal task remote results without another publisher call.
- [ ] Run idempotency, lock, publish and Halo integration tests.

### Task 5: Retry Policy And Slug Conflict

**Files:**
- Create: `server/src/services/retryPolicyService.js`
- Create: `server/src/services/slugService.js`
- Create: `server/tests/retry-policy.test.js`
- Create: `server/tests/slug-conflict.test.js`
- Modify: `server/src/services/publishers/haloPublisherService.js`
- Modify: `server/src/services/haloPublishWorkerService.js`

- [ ] Write failing table-driven retry policy tests.
- [ ] Write a failing integration test where first create returns 409 and second request uses a suffixed slug.
- [ ] Implement deterministic slug normalization and a single SHA-derived suffix attempt.
- [ ] Persist `retryable`, error code/message and `nextRetryAt`; reject manual retries that violate policy.
- [ ] Run the focused tests and existing Halo publisher tests.

### Task 6: Task Events

**Files:**
- Create: `server/src/services/publishTaskEventService.js`
- Create: `server/tests/publish-task-events.test.js`
- Modify: `server/src/services/haloPublishWorkerService.js`
- Modify: `server/src/services/publishService.js`
- Modify: `server/src/routes/publish.js`

- [ ] Write failing tests for ordered event types and secret redaction.
- [ ] Implement event metadata sanitization and event creation.
- [ ] Emit lifecycle, lock, Halo request, retry, failure and completion events.
- [ ] Include events in task API views.

### Task 7: Frontend Reliability Details

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `saas-shell.js`
- Modify: `tests/saas-shell.test.js`

- [ ] Add failing source/DOM tests for URL safety copy, last test time, timeline dialog and retry disabled reason.
- [ ] Add inline Halo connection validation presentation and loading states.
- [ ] Add task reliability summary and an accessible timeline dialog.
- [ ] Keep existing layout and responsive breakpoints unchanged.

### Task 8: Documentation And Verification

**Files:**
- Create: `docs/halo-smoke-test.md`
- Create: `docs/publisher-reliability.md`
- Create: `docs/url-safety-and-ssrf.md`
- Modify: `docs/server-side-publisher-design.md`
- Modify: `docs/halo-integration.md`
- Modify: `docs/deployment-notes.md`
- Modify: `README.md`

- [ ] Document fake Halo, real smoke test, SSRF policy, idempotency, process-internal worker limits and queue migration.
- [ ] Run frontend tests, backend tests, syntax checks, Prisma validation and sensitive scan.
- [ ] Run browser acceptance at 1440px and 820px, export screenshots and verify zero console errors/warnings.
- [ ] Commit with `chore: harden Halo publisher reliability` and push `main`.
