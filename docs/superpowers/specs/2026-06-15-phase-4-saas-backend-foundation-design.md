# Phase 4 SaaS Backend Foundation Design

Date: 2026-06-15

## Goal

Add a minimal, runnable SaaS backend to OneFlow without replacing the existing
Vanilla JavaScript frontend or its local-first workbench.

Phase 4 introduces:

- Fastify API service
- Prisma schema and SQLite local database
- local development sessions
- workspace-scoped article and channel storage
- encrypted channel credentials
- immutable publish snapshots
- a backend Mock Publisher Worker
- server-side entitlement checks
- a small browser API client and SaaS Dev Mode

## Non-Goals

- No production authentication, OAuth, password login, or billing checkout.
- No real third-party platform publishing.
- No Redis, durable queue, object storage, or production secret manager.
- No React, Vue, bundler, or frontend rewrite.
- No migration of Local Demo Mode data unless the user explicitly saves it
  through SaaS Dev Mode.

## Runtime Architecture

```text
Vanilla JS frontend
  -> api-client.js
  -> Fastify /api
  -> auth and workspace middleware
  -> entitlement service
  -> Prisma Client
  -> SQLite

POST /api/publish-batches
  -> immutable Article snapshot
  -> immutable ChannelVersion snapshot per task
  -> PublishTask records
  -> MockPublisherService
  -> result and remoteUrl write-back
```

The frontend defaults to Local Demo Mode. SaaS Dev Mode is opt-in and displays
a clear fallback when the backend is unavailable.

## Authentication

`POST /api/dev/session` accepts an optional non-secret `profileKey`. It creates
or returns a local development user, default workspace, owner membership, Free
subscription, and server-side in-memory session.

The response returns a random short-lived development session token. The
browser stores it in `sessionStorage` and sends it through
`x-oneflow-dev-session`.

This mechanism is explicitly local-only. It is not a production identity
system and does not accept passwords.

## Workspace Isolation

Tenant-owned tables contain `workspaceId`. Route handlers never trust a
workspace ID supplied in a resource payload. They obtain the active workspace
from the authenticated session and include it in every query.

Resource lookup uses compound conditions:

```js
where: {
  id: request.params.id,
  workspaceId: request.auth.workspaceId,
}
```

Cross-workspace resources return `404`, avoiding tenant enumeration.

## Data Model

Prisma models:

- User
- Workspace
- WorkspaceMember
- Article
- ChannelConfig
- ChannelVersion
- PublishBatch
- PublishTask
- AICapability
- UsageRecord
- Subscription

SQLite stores arrays and object fields as serialized JSON strings. API mappers
return structured arrays and objects.

`PublishBatch.articleSnapshot` and
`PublishTask.channelVersionSnapshot` are immutable serialized JSON values.
Editing an Article after batch creation cannot change publish history.

## Credential Security

`ChannelConfig` stores:

- `encryptedCredential`
- `credentialStatus`
- non-sensitive configuration JSON

AES-256-GCM encryption derives a 32-byte key from `ENCRYPTION_KEY`. Encrypted
values include a version, IV, authentication tag, and ciphertext. API response
mappers omit `encryptedCredential` entirely.

This is a local foundation, not a production key-management solution.
Production must use a managed secret store or envelope encryption with key
rotation.

## Entitlements

The backend owns authoritative decisions. The browser `entitlements.js` remains
presentation-only.

The server exposes pure checks:

- `canCreateArticle`
- `canConnectChannel`
- `canPublishBatch`
- `canUseAICapability`
- `canInviteMember`
- `canUseImageHost`
- `canSchedulePublish`

Article, channel, and publish creation routes enforce the relevant check.

## Mock Publisher Worker

Creating a batch:

1. validates the article and selected channels
2. stores an article snapshot
3. creates task snapshots
4. transitions tasks through `pending`, `validating`, `queued`, and `running`
5. writes `draft_created`, `published`, or `failed`
6. stores result JSON, retry count, duration, and mock remote URL

Channel configuration controls deterministic test behavior:

- `success`
- `failure`
- `fail_once`

Retrying a failed `fail_once` task succeeds while preserving the original task
context and incrementing `retryCount`.

## Frontend Integration

`api-client.js` owns API transport and the dev session header. The shell adds:

- Local Demo Mode
- SaaS Dev Mode
- SaaS backend availability notice
- remote user and usage loading on Dashboard
- remote article list loading
- debounced Article save from the existing workbench
- remote PublishBatch creation after a local batch is created

The existing `app.js` remains authoritative for editor interactions and local
state. A narrow bridge provides state and batch events to the shell.

## Error Handling

API errors use:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Readable explanation",
    "requestId": "req-..."
  }
}
```

Expected codes include:

- `UNAUTHENTICATED`
- `NOT_FOUND`
- `VALIDATION_FAILED`
- `ARTICLE_LIMIT_REACHED`
- `CHANNEL_LIMIT_REACHED`
- `PUBLISH_BATCH_LIMIT_REACHED`
- `TASK_NOT_RETRYABLE`
- `INTERNAL_ERROR`

The frontend translates connection failures to:

> 后端服务未启动，可切换到本地开发模式。

## Testing

Backend tests use Fastify `inject()` and a reset SQLite test database. Coverage
includes sessions, isolation, CRUD, credential redaction and encryption,
publish snapshots, worker success/failure/retry, and Free-plan enforcement.

Frontend tests cover API client request construction, SaaS Dev Mode state, and
all existing local workbench behavior.

Browser acceptance covers 1440px and 820px, Local Demo Mode, SaaS Dev Mode,
backend-fed Dashboard data, remote content library, workbench save, publish
batch creation, no horizontal overflow, and zero console errors or warnings.

## Acceptance Criteria

- The server starts locally with documented commands.
- Prisma validates and SQLite initializes from the checked-in schema.
- Every tenant resource query is workspace-scoped.
- Channel APIs never return credential ciphertext or plaintext.
- Article CRUD and publish flow work through real HTTP requests.
- Mock publishing writes task results and retry outcomes.
- Local Demo Mode remains fully usable without the server.
- SaaS Dev Mode reports backend unavailability without breaking the page.
- Frontend and backend test suites pass.
