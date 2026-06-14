# Phase 3 Halo Publisher Integration Design

Date: 2026-06-14

## Goal

Extend the existing local OneFlow MVP with a real self-hosted Blog / Halo
publishing path while preserving the current editor-led workspace and immutable
publish history.

The default publisher is `MockPublisher`. A user may opt into
`HaloPublisher`, configure a Halo 2.x Console API connection, create a remote
draft, optionally publish that draft, and inspect the normalized remote result
in publish history.

## Confirmed Product Boundary

- Keep the current three-column workbench, queue, publish dock, content library,
  and history layout.
- Add one connection settings dialog and extend existing Blog preview and batch
  detail surfaces.
- Mock mode must work without a token and remain the default for new users.
- Halo mode uses a user-supplied Base URL, configurable Console API endpoint,
  PAT Bearer Token, and explicit draft or publish mode.
- Draft creation is the safe default. Direct publication is never selected by
  default.
- Only the selected, current, ready self-hosted Blog version enters the Phase 3
  executable publisher flow. Other platforms retain their assisted workflows.
- No backend, browser security bypass, `no-cors`, real third-party credentials,
  or hidden automatic publication is introduced.

## Approaches Considered

### 1. Browser Adapter With Mock Default and Optional Halo Direct Connection

This is the selected approach. It satisfies the local MVP goal, exercises the
complete publish lifecycle in Mock mode, and supports a real Halo instance when
that instance permits browser requests. Its limitation is that CORS and local
token exposure remain browser-environment constraints.

### 2. Backend Proxy First

This is the recommended production architecture because it keeps the PAT on a
server and controls CORS, logging, retries, and idempotency. It is not selected
for Phase 3 because it would add a backend and exceed the current local MVP
boundary.

### 3. Halo Skeleton Without Real Requests

This would minimize risk but would not meet the goal of a real Halo publishing
path. It is rejected because the relevant Halo 2.x Console API operations are
confirmed in official Halo sources.

## Architecture

The publisher implementation is split into focused browser-compatible CommonJS
modules:

- `adapters/basePublisher.js` defines the adapter contract, payload validation
  result shape, normalized publisher result, and shared URL/slug helpers.
- `adapters/mockPublisher.js` implements deterministic success, failure, expired
  token, and network scenarios without external services.
- `adapters/haloPublisher.js` maps OneFlow snapshots to Halo `PostRequest`,
  builds Console API URLs, performs authenticated requests through an injected
  `fetch`, and normalizes Halo or network errors.
- `publisherService.js` owns OneFlow preflight checks, immutable batch/task
  creation, task state transitions, result writeback, and retries. It depends on
  the adapter interface rather than Halo-specific behavior.
- `credentialStore.js` stores the PAT in `sessionStorage` under a separate key.
  The PAT never becomes part of `productState`, workspace snapshots, exports,
  logs, test snapshots, or screenshots.

`app.js` remains the view-model and DOM binding layer. It delegates publishing
to `publisherService.js` and contains no Halo endpoint construction or
authorization header logic.

## Publisher Contract

Each adapter exposes:

```js
validateConfig(platformConfig)
validatePayload(payload)
mapArticleToPayload(articleSnapshot, channelVersionSnapshot, platformConfig)
createDraft(articleSnapshot, channelVersionSnapshot, platformConfig)
publishDraft(taskId, platformConfig)
updateDraft(remoteId, articleSnapshot, channelVersionSnapshot, platformConfig)
```

`HaloPublisher` additionally exposes:

```js
buildConsoleApiUrl(baseUrl, endpoint, replacements)
normalizeHaloError(errorOrResponse)
```

`updateDraft()` is a deliberate unsupported operation in Phase 3. It returns a
structured `not_implemented` result instead of issuing an invented request.

## Configuration Model

Non-secret settings live in `workspaceSettings.blogConnection`:

```json
{
  "publisherMode": "mock",
  "blogName": "OneFlow Demo Blog",
  "baseUrl": "",
  "consoleApiEndpoint": "/apis/api.console.halo.run/v1alpha1/posts",
  "publishEndpoint": "/apis/api.console.halo.run/v1alpha1/posts/{name}/publish",
  "publishMode": "create_draft",
  "defaultCategory": "",
  "defaultTags": [],
  "defaultAuthor": "",
  "defaultCoverStrategy": "use_article_cover",
  "writeBackUrl": true,
  "mockScenario": "success"
}
```

The PAT is stored separately in `sessionStorage` and is represented in
application state only by a transient boolean such as `tokenConfigured`. The
settings dialog includes a warning that local browser storage is appropriate
only for this MVP and a `Clear token` action.

Workspace export excludes the token by construction. An optional
`includeConnectionConfig` export flag may include non-secret connection fields;
it never includes the PAT.

## Storage Migration

The workspace schema moves from v3 to v4. Migration adds default
`workspaceSettings.blogConnection` values and expands Blog versions/tasks with
new optional fields while retaining all article snapshots and historical task
records. The credential key is outside the workspace schema and migration
system.

Corrupt or future-version data keeps the existing non-destructive recovery
behavior.

## Blog Channel Version

The self-hosted Blog `ChannelVersion` gains:

```text
title, slug, summary, contentHtml, contentMarkdown, tags, category, cover,
canonicalUrl, seoTitle, seoDescription, publishStatus, remotePostId,
remoteEditUrl, remotePreviewUrl, remotePublicUrl
```

The slug is deterministic for the same title and remains editable in the Blog
preview. Chinese-only titles receive a stable suffix rather than a random
value. `contentHtml` is sanitized immediately before payload mapping.
`contentMarkdown` is generated by a small deterministic HTML-to-Markdown
transform that preserves headings, paragraphs, emphasis, links, lists,
blockquote, code blocks, images, line breaks, and horizontal rules.

## Halo Payload Mapping

`HaloPublisher.mapArticleToPayload()` creates the confirmed Halo shape:

```json
{
  "post": {
    "apiVersion": "content.halo.run/v1alpha1",
    "kind": "Post",
    "metadata": {
      "generateName": "oneflow-"
    },
    "spec": {
      "title": "Article title",
      "slug": "article-slug",
      "excerpt": {
        "autoGenerate": false,
        "raw": "Article summary"
      },
      "categories": [],
      "tags": [],
      "cover": "",
      "owner": "",
      "publish": false,
      "visible": "PUBLIC",
      "allowComment": true
    }
  },
  "content": {
    "content": "<p>Sanitized HTML</p>",
    "raw": "# Markdown source",
    "rawType": "MARKDOWN"
  }
}
```

Empty optional fields are omitted where the Halo model permits it. Category and
tag values are treated as Halo resource names; the UI explains this instead of
pretending display labels are always valid resource identifiers.

The confirmed default endpoints are relative paths:

- Create draft: `POST /apis/api.console.halo.run/v1alpha1/posts`
- Publish draft: `PUT /apis/api.console.halo.run/v1alpha1/posts/{name}/publish`

The Base URL is always user supplied. Both endpoint paths are configurable.

## Preflight Validation

The Blog preview runs mode-aware validation and writes structured
`ValidationIssue` records.

Common blocking checks:

- title, summary, and body are present
- HTML is unchanged after sanitization of prohibited content
- Blog version is not stale
- slug uses the supported mapping rule
- tags and category values satisfy the current mapping constraints
- publish mode is recognized

Halo-only blocking checks:

- Base URL is a valid `http:` or `https:` URL
- PAT exists in the credential store
- create and publish endpoints are present and relative or same-origin-safe

Mock mode does not require a real PAT or Base URL. Its preflight still validates
the article and Blog version so the local path exercises the same workflow.

Any blocking issue disables the create-draft action. Warnings remain visible
without blocking.

## Publish State Machine

Phase 3 tasks use:

```text
pending
  -> validating
  -> creating_draft
  -> draft_created
  -> publishing
  -> published

failed -> retrying -> validating
```

Creating a publish batch first copies an `ArticleSnapshot` and a Blog
`ChannelVersionSnapshot`. The async adapter then receives only those snapshots.
Later article edits cannot change the request context or history record.

Each transition is persisted. A failure stores normalized error code, message,
HTTP status when available, attempt count, timestamps, and the original
snapshot references. Retry reuses those references and does not regenerate the
payload from current editor state.

## Result Writeback

Successful draft creation writes these non-sensitive fields to the batch task:

```text
remotePostId, remoteEditUrl, remotePreviewUrl, remotePublicUrl, remoteStatus,
draftCreatedAt, publishedAt, lastSyncAt, durationMs, rawResponseSummary
```

`rawResponseSummary` is allowlisted and never stores request headers, response
headers, tokens, cookies, or the complete server response.

Remote URLs are taken from a normalized response when available. Otherwise they
may be generated only from user-configured URL templates. The application does
not invent theme-specific Halo public routes.

## Error Handling

`normalizeHaloError()` maps:

- `401` / `403` to invalid token or insufficient permission
- `404` to missing endpoint or resource
- `409` to name or slug conflict
- `422` to invalid payload
- browser `TypeError` or failed fetch without a response to a combined
  CORS/network error with the message:
  `当前 Halo 不允许浏览器直连或网络不可用，请使用后端代理或调整服务端 CORS。`

The implementation never uses `no-cors`. User-facing errors do not include the
PAT, authorization header, or raw sensitive response content.

## UI Changes

The existing visual system remains intact.

- `平台账号` and the Blog queue card can open the Blog connection dialog.
- The dialog contains Mock/Halo mode selection, connection fields, publish mode,
  defaults, a token warning, token clear action, and Mock scenario selection.
- The Blog preview shows editable slug, publisher mode, connection/preflight
  checks, and `创建 Blog 草稿` when valid.
- The publish dock count is derived from selected ready executable Blog
  channels. Assisted third-party channels remain visible but do not become real
  API tasks.
- Batch detail displays remote ID, status, URLs, duration, error, retry count,
  copy/open/retry actions, and the immutable platform title snapshot.
- Token inputs are password fields and are cleared from the DOM after saving.

All new controls include hover, focus, active, and disabled states. Existing
reduced-motion and reduced-transparency behavior is reused.

## Testing

Node tests remain independent from a real Halo service. `fetch` is injected
into `HaloPublisher`.

Required automated coverage:

- Mock draft creation succeeds and writes normalized remote URLs.
- Mock failure retains task context and retry succeeds.
- Missing Halo Base URL, endpoint, or token blocks publication.
- Halo payload mapping produces `PostRequest { post, content }`.
- Halo status codes normalize to stable error codes and messages.
- A network/CORS failure produces the explicit browser-direct warning.
- A stale Blog version blocks publication.
- Workspace export never contains the PAT.
- Editing the article after batch creation does not alter the request snapshots
  or history detail.
- Storage v3 migrates to v4 without losing history.

Browser acceptance covers the settings dialog, Mock draft flow, failed/retry
flow, Blog preview, history detail, 1440px and 820px layouts, horizontal
overflow, and console errors/warnings.

## Official Sources

- [Halo REST API introduction](https://docs.halo.run/developer-guide/restful-api/introduction)
- [Halo generated Python client](https://github.com/halo-dev/python_client)
- [PostV1alpha1ConsoleApi](https://github.com/halo-dev/python_client/blob/main/docs/PostV1alpha1ConsoleApi.md)
- [PostRequest](https://github.com/halo-dev/python_client/blob/main/docs/PostRequest.md)
- [ContentUpdateParam](https://github.com/halo-dev/python_client/blob/main/docs/ContentUpdateParam.md)
- [PostSpec](https://github.com/halo-dev/python_client/blob/main/docs/PostSpec.md)

## Explicit Risks

- Browser direct connection can fail because the Halo deployment does not allow
  the OneFlow origin through CORS.
- A PAT available to frontend JavaScript is exposed to XSS and browser
  extensions even when isolated in `sessionStorage`.
- Halo categories, tags, permissions, installed plugins, and Console behavior
  vary by deployment and must be verified against the target instance.
- Remote edit, preview, and public URL formats can vary by Halo Console version
  and theme; absent links remain absent unless returned or configured.
- Idempotency and secure token custody require a backend proxy before production
  use.
