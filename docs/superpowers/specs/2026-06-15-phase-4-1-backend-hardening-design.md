# Phase 4.1 Backend Engineering Hardening Design

## Goal

Harden the Phase 4 Fastify, Prisma, SQLite, and Vanilla JS SaaS MVP without
adding product features or changing the workbench layout.

## Architecture

The repository becomes a lightweight npm monorepo. Root scripts orchestrate a
Node static server and the existing Fastify service. The server keeps its
current route and service boundaries, while shared response, error, logging,
security, environment, and OpenAPI modules remove cross-route inconsistency.

## Runtime Configuration

`server/src/env.js` owns parsing and validation for `NODE_ENV`, `PORT`,
`DATABASE_URL`, `ENCRYPTION_KEY`, `CORS_ORIGIN`, and `SESSION_SECRET`.
Encryption and session secrets are mandatory and must be at least 32
characters. Production rejects wildcard CORS. Tests provide explicit isolated
configuration.

## API Contract

All JSON API responses use one envelope:

```json
{ "ok": true, "data": {}, "meta": {} }
```

or:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": {}
  }
}
```

The error handler converts Fastify validation, content type, body limit,
Prisma known-request, 404, and unexpected failures into that contract. Internal
stacks and credentials never enter responses.

## Security

- CORS uses an environment-provided allowlist.
- Security headers are supplied by `@fastify/helmet`.
- `@fastify/rate-limit` protects dev-session and publish mutation endpoints.
- Fastify enforces a configured body limit.
- API requests with bodies must use JSON.
- Logger redaction covers authorization, cookies, session headers,
  credentials, tokens, secrets, and encrypted credentials.

## Database Lifecycle

Prisma seed uses deterministic IDs and unique upserts for a development user,
workspace, membership, Free subscription, channels, one sample article, and AI
capabilities. Re-running seed changes no record counts.

## Developer Experience

Root npm scripts provide frontend, server, combined development, tests, checks,
Prisma lifecycle commands, and sensitive-data scanning. Docker Compose starts
the server with a persistent SQLite volume. GitHub Actions runs the same public
commands without production secrets.

## Frontend Boundary

`api-client.js` understands the unified API envelope, applies request timeout
through `AbortController`, distinguishes timeout from backend unavailability,
and exposes connection state to the existing SaaS shell. Local Demo Mode never
depends on the API.

## Verification

- Frontend and backend Node tests.
- Syntax checks for all JavaScript files.
- Prisma validate, seed idempotency, and schema reset.
- Docker Compose configuration validation and image build when Docker exists.
- Browser checks at 1440px and 820px with server connected and disconnected.
- Console error/warning inspection and sensitive-file scan.
