# Phase 3S SaaS Product Shell Design

Date: 2026-06-14

## Goal

Evolve OneFlow from a local-first publishing prototype into the product
architecture foundation of a public SaaS without replacing the existing
Vanilla JS writing workbench.

Phase 3S delivers two things:

1. A documented SaaS architecture with server-owned credentials, publishing
   workers, tenant isolation, usage metering, and billing boundaries.
2. A functional frontend product shell with hash routing, local development
   entry, SaaS authentication placeholders, creator task dashboard, channel
   settings, AI capabilities, billing, team, media, and settings pages.

## Non-Goals

- No React, Vue, bundler migration, or rewrite of `app.js`.
- No real authentication, checkout, subscription, backend API, database,
  queue, worker, object storage, or AI provider integration.
- No fake login credentials or simulated payment success.
- No long-term platform token storage in the browser.
- No formal SaaS publishing path that calls Halo or another platform directly
  from the browser.
- No redesign of the editor-led workbench.

## Product Modes

### Local Development Mode

Local mode continues using the existing localStorage workspace and all Phase
2.5 functionality. It is explicitly labeled as development mode.

The route flow is:

```text
#/login -> choose local development -> #/workbench
```

The selected local mode is stored in `sessionStorage`, not treated as an
authenticated user session, and can be exited from Settings.

### SaaS Cloud Placeholder

The cloud entry shows the intended login/register surface and states that
backend authentication is not connected. It never accepts or validates a
password, creates a fake session, or calls a fake endpoint.

## Hash Routes

The canonical routes are:

```text
#/login
#/dashboard
#/articles
#/workbench
#/publish-history
#/channels
#/media
#/ai-capabilities
#/billing
#/team
#/settings
```

Unknown hashes normalize to `#/dashboard` when local mode is active and
`#/login` otherwise. The hash is the route source of truth, so refresh restores
the current page.

## Frontend Architecture

### `entitlements.js`

A browser-compatible CommonJS module containing:

- plan definitions for `free`, `pro`, and `studio`
- normalized quota values
- AI capability plan requirements
- pure permission functions
- usage-aware decisions with stable reason codes

It exports:

```js
canCreateArticle(context)
canConnectChannel(context)
canPublishBatch(context)
canUseAICapability(context)
canInviteMember(context)
canUseImageHost(context)
canSchedulePublish(context)
canUseDataFeedback(context)
```

Every function returns:

```js
{
  allowed: true,
  reason: null,
  limit: 100,
  used: 12,
  remaining: 88
}
```

Unlimited limits use `null`.

### `saas-shell.js`

A browser-compatible CommonJS module containing:

- route constants and normalization
- local development session-mode helpers
- SaaS mock state
- dashboard task-center selectors derived from current workspace state
- sanitized channel connection view models
- AI capability configuration and toggle behavior
- browser route controller and page rendering

It does not own article editing, persistence, channel adaptation, or publish
batch execution.

### `app.js`

The existing application remains authoritative for:

- current article and channel version state
- local persistence and migration
- editor interactions
- immutable snapshots
- publish batches, tasks, history, and content library
- import/export and sanitizer behavior

It exposes a small browser API:

```js
window.OneFlowApp.getState()
window.OneFlowApp.openLegacyView(view)
window.OneFlowApp.subscribe(listener)
window.OneFlowApp.createNewArticle()
window.OneFlowApp.openImport()
```

The API returns clones and emits state changes after saves or explicit
transitions. SaaS pages consume these projections instead of reaching into
private variables.

## Shell Navigation

The existing top floating navigation remains. It contains the highest-frequency
destinations:

- Dashboard
- Content Library
- Writing Workbench
- Publish History
- Channels

A compact product menu exposes Media, AI Capabilities, Billing, Team, and
Settings. Tablet layouts use the existing layered/drawer approach rather than
compressing eleven labels into the header.

The workbench keeps its current three-column layout. Other pages use a restrained
single-page content surface with the same warm dark background, glass controls,
and solid readable content panels.

## Page Design

### Login

- OneFlow product positioning
- Local development mode action
- SaaS cloud login/register placeholder
- explicit statement that cloud authentication is not connected
- no password input and no fake account

### Dashboard

Dashboard is a creator task center, not an analytics dashboard. It shows:

- recently edited article
- platform versions awaiting confirmation
- failed publish tasks
- channel authorization exceptions
- monthly publish quota
- monthly AI adaptation quota
- quick actions for new article, Markdown import, channel setup, and history

All numbers derive from the current workspace plus explicit SaaS mock usage.
There are no decorative charts or invented revenue metrics.

### Articles

The existing content library is routed to `#/articles` and remains backed by
current local state and immutable article snapshots.

### Workbench

The existing editor-led workbench remains the core route and preserves all
Phase 2.5 interactions.

### Publish History

The existing publish history is routed to `#/publish-history`.

### Channels

Channel rows show:

- connected
- not connected
- reauthorization required
- server-managed credentials
- local development temporary debugging availability

No token value, token suffix, credential identifier, header, cookie, or secret
is rendered. The formal SaaS action is `Connect channel` or `Reauthorize`.
Local mode only shows a non-persistent debugging explanation.

### Media

Media is a foundation page for image hosting and the asset library. It shows
current cover assets, crop metadata, storage boundary, plan requirement, and
upload placeholder without pretending object storage exists.

### AI Capabilities

Each capability defines:

- name and stable ID
- input fields
- output fields
- prompt template summary
- enabled state
- automatic execution state
- human confirmation requirement
- minimum plan

Capabilities:

- title generation
- summary generation
- SEO description
- platform-style rewrite
- Xiaohongshu copy
- Douyin script
- Bilibili title and description
- WeChat formatting
- tag recommendation
- publish-risk check

Users can enable or disable locally available capabilities. Automatic execution
can only be enabled when the capability is enabled and the current plan allows
it. Changes persist in local workspace settings as non-secret preferences.

### Billing

Billing shows:

- current plan
- article usage
- monthly publish-batch usage
- monthly AI adaptation usage
- connected-channel usage
- team-member usage
- plan comparison
- upgrade actions marked as checkout placeholders

No purchase or subscription state is fabricated.

### Team

Team shows workspace members, roles, invite entitlement, and an invite
placeholder. It does not send an invitation.

### Settings

Settings shows workspace identity, local/SaaS mode boundary, import/export,
security notes, data reset, and local-mode exit.

## Plans

Initial quotas:

| Capability | Free | Pro | Studio |
|---|---:|---:|---:|
| Articles | 20 | 500 | Unlimited |
| Publish batches / month | 10 | 200 | 1000 |
| AI adaptations / month | 30 | 1000 | 5000 |
| Connected channels | 2 | 10 | 30 |
| Team members | 1 | 1 | 10 |
| Advanced image host | No | Yes | Yes |
| Data feedback | No | Yes | Yes |
| Scheduled publishing | No | Yes | Yes |
| Batch publishing | Limited | Yes | Yes |

`Studio / Team` is represented by the stable plan key `studio`.

## SaaS Architecture Boundary

The target architecture separates:

- browser frontend
- authenticated API service
- relational database
- encrypted credential vault
- object storage and media processing
- durable queue and publisher workers
- AI provider gateway
- billing provider and webhook handler
- usage metering and entitlement service
- audit and observability pipeline

The browser creates a `PublishBatch` request. The backend validates workspace
membership and entitlements, creates immutable snapshots and `PublishTask`
records, and enqueues tasks. Workers decrypt platform credentials only for the
duration of a job, call platform APIs, normalize results, update task records,
and emit status events. The frontend polls or subscribes to those events.

## Halo Transition

Commit `c89aa06` documents a browser-direct Halo approach created for local
Phase 3 validation. Phase 3S supersedes that approach for SaaS:

- `MockPublisher` remains useful for local development and automated tests.
- Browser-direct Halo may remain an explicitly gated local development
  experiment.
- SaaS production uses a server-side `HaloPublisher` worker.
- Halo PAT values are encrypted by the backend and are never returned to the
  browser after connection.
- CORS is not a dependency of the production publishing path.

The prior design is retained as historical context and is not deleted.

## Security Boundary

- Frontend code and exports never contain long-lived platform tokens.
- Secrets are encrypted at rest with envelope encryption and decrypted only in
  isolated worker execution.
- Every application record includes `workspaceId`; authorization checks do not
  trust client-supplied workspace membership.
- HTML is sanitized in the editor and again on the backend.
- Sessions use secure, HttpOnly, SameSite cookies in the target SaaS.
- State-changing API calls require CSRF protection where cookie authentication
  applies.
- API CORS only permits controlled product origins.
- Logs and telemetry redact authorization headers, cookies, content secrets,
  imported credentials, and provider responses.
- Import/export is schema validated, size limited, sanitized, and audited.

## Testing

Automated tests cover:

- all route normalization and route restoration behavior
- local development entry and cloud placeholder behavior
- Free, Pro, and Studio entitlement differences
- quota exhaustion and stable reason codes
- dashboard derivation from workspace state
- token-free channel view models
- AI capability enable/disable and plan gates
- all existing workbench, storage, migration, sanitizer, batch, and snapshot
  tests

Browser acceptance covers:

- login
- local mode to workbench
- dashboard task center
- channels
- AI capabilities
- billing
- articles and publish history legacy routes
- 1440px and 820px layouts
- no horizontal overflow
- zero console errors and warnings

## Acceptance Criteria

- All eleven routes are reachable and survive refresh.
- The cloud entry does not create a fake authenticated session.
- The workbench retains all existing interactions.
- Channel UI and serialized state expose no platform token.
- Plan decisions are pure, tested, and reusable by a future API client.
- Documentation defines backend, worker, storage, AI, billing, and security
  ownership.
- Screenshots demonstrate login, dashboard, channels, AI capabilities, billing,
  workbench, and tablet behavior.
