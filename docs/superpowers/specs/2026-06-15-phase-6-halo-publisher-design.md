# Phase 6 Server-side Halo Publisher Design

## Goal

Complete OneFlow's first real publishing loop without changing the Vanilla JS
frontend architecture:

1. The browser creates a `PublishBatch`.
2. The backend creates immutable `PublishTask` snapshots.
3. The publisher router selects Halo only for a Halo channel configured with
   `publisherMode = halo`; all other tasks keep using MockPublisher.
4. The backend decrypts the PAT only while executing the task.
5. Halo creates a draft first and optionally publishes that draft.
6. Remote identifiers, URLs, status, timing, and a redacted response summary
   are persisted and shown in publish history.

## Confirmed Halo Contract

The implementation targets Halo 2.25's documented PAT authentication and
Console API:

- `Authorization: Bearer <PAT>`
- `POST /apis/api.console.halo.run/v1alpha1/posts`
- `GET /apis/api.console.halo.run/v1alpha1/posts`
- `PUT /apis/api.console.halo.run/v1alpha1/posts/{name}/publish`
- Draft payload: `PostRequest { post, content }`

The Console API path remains configurable because Halo deployments can use a
reverse proxy or a non-root base path.

## Data Design

`ChannelConfig` gains first-class operational fields:

- `publisherMode`: `mock | halo`
- `lastTestedAt`
- `lastTestStatus`
- `lastTestMessage`

Non-secret Halo settings remain in `configuration`:

- `baseUrl`
- `consoleApiEndpoint`
- `publishMode`
- `defaultCategory`
- `defaultTags`
- `defaultOwner`
- `defaultCoverStrategy`

The PAT remains only in `encryptedCredential`.

`PublishTask` gains remote result fields:

- `remotePostId`
- `remotePostName`
- `remoteEditUrl`
- `remotePreviewUrl`
- `remotePublicUrl`
- `remoteStatus`
- `draftCreatedAt`
- `publishedAt`
- `lastSyncAt`
- `rawResponseSummary`

`ValidationIssue` stores publishing precheck failures per workspace and task.

## Publisher Architecture

`PublisherRouterService` owns task routing and batch status refresh.

- Halo task: `platformId === "halo"` and `publisherMode === "halo"`
- Fallback task: MockPublisher

`HaloPublisherService` owns configuration validation, payload validation,
mapping, URL construction, network calls, error normalization, and task result
mapping. It receives an injectable `fetchImpl`, so automated tests never depend
on a real Halo instance.

## Validation

Before any Halo request, the worker checks:

- stored credential exists and decrypts
- base URL and endpoint are valid
- publish mode is `draft` or `publish`
- article title and body exist
- HTML is already equal to the server sanitizer output
- channel version is not stale
- slug is valid
- workspace entitlement was already accepted by the publish API

Failures create `ValidationIssue` records and leave the remote Halo site
untouched.

## Security Boundary

- PAT never appears in API responses, logs, screenshots, task results, or
  workspace exports.
- PAT decryption happens inside the backend publisher immediately before the
  request.
- Halo requests are server-side only.
- `rawResponseSummary` is an allowlisted summary, never raw headers.
- Only workspace owner/admin roles may connect, test, clear, or replace Halo
  credentials.

## Frontend Scope

The existing Channels page gets a focused Halo connection drawer. Saved
credentials are represented only by `credentialStatus`; reopening the drawer
never fills the token field. Local Demo Mode explains that real Halo publishing
requires SaaS Auth Mode.

Publish history shows remote Halo identifiers and safe links without changing
the overall product shell or workbench layout.

