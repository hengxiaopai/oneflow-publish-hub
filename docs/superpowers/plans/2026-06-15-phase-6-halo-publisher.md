# Phase 6 Halo Publisher Implementation Plan

1. Add failing unit tests for Halo config validation, URL construction, payload
   mapping, error normalization, and fake HTTP responses.
2. Add failing API/integration tests for credential encryption, redaction,
   RBAC, connection lifecycle, task remote result persistence, stale blocking,
   and retry.
3. Extend both Prisma schemas and create the SQLite migration.
4. Implement `HaloPublisherService`, shared batch status refresh, and
   `PublisherRouterService`.
5. Refactor publish creation/retry to route tasks while preserving Mock
   behavior and immutable snapshots.
6. Add Halo channel APIs and register them in Fastify.
7. Extend the frontend API client and Channels UI with the Halo drawer and
   publish-history remote details.
8. Update public documentation and OpenAPI notes.
9. Run frontend/backend tests, syntax checks, Prisma validation, security scan,
   Liquid Glass skill validation, and browser QA at 1440 px and 820 px.
10. Commit with `feat: add server-side Halo publisher` and push `main`.
