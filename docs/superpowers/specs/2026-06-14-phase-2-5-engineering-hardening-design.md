# Phase 2.5 Engineering Hardening Design

## Scope

Harden the approved local-first OneFlow MVP without changing its editor-first
layout. This phase adds immutable publishing records, HTML sanitization, schema
migration, import/export, a cover model, batch inspection, and a local content
library.

## Architecture

### Immutable publishing records

`currentArticle` and `channelVersions` remain mutable workspace records.
Creating a batch appends one `ArticleSnapshot` and one
`ChannelVersionSnapshot` per task. A `PublishTask` stores snapshot IDs and its
own status/result fields. `PublishBatch` references those task IDs and the
article snapshot ID. History and details only read snapshots.

### Safe content boundary

`sanitizer.js` exposes one deterministic allow-list sanitizer. It runs when
editable body HTML enters application state, when persisted data is restored,
and when imported data is accepted. The browser implementation uses DOM APIs;
the Node implementation uses the same token/attribute rules for tests.

### Versioned local storage

`storage.js` moves to schema version 3 and keeps the v2 key as a migration
source. Loading returns an explicit status: empty, loaded, migrated, corrupt,
or unsupported. Corrupt data is preserved and surfaced to the UI instead of
being overwritten.

### Import and export

Export produces a schema v3 JSON envelope containing only supported workspace
models. Import parses, validates, migrates, sanitizes, previews the impact, and
requires a user confirmation before saving.

### UI extension

The existing sidebar gains compact import/export/reset controls. The top
navigation gains a content-library view. The existing dialog becomes the
batch-detail surface. No new visual language or layout system is introduced.

## Error Handling

- Corrupt local data shows a persistent recovery notice with export/reset
  actions.
- Failed imports never replace current state.
- Unsupported future schemas are rejected.
- Sanitization is fail-closed for forbidden tags, attributes, and URL schemes.
- Snapshot creation deep-clones all data required by history.

## Acceptance

- Editing after publishing does not change history or batch details.
- Unsafe HTML cannot survive state updates, restore, or import.
- v1 and v2 data migrate to schema v3.
- Import/export round trips restore the workspace.
- Content library and batch details work on desktop and tablet.
- No secrets, environment files, or browser profiles are committed.
