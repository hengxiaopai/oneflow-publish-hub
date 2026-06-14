# Phase 2 Local Workbench Design

## Scope

Turn the approved OneFlow prototype into a local-first content workbench without
changing its editor-first layout or visual language.

## Chosen Approach

Use a versioned `localStorage` repository. The current data set is small, cover
assets remain file references, and synchronous restore keeps the static Vanilla
JS app simple. The repository API is isolated so IndexedDB or a remote API can
replace it later.

Alternatives considered:

- IndexedDB: better for binary assets and large histories, but unnecessary for
  this phase.
- Per-model storage keys: easier partial writes, but introduces cross-record
  consistency risks. Phase 2 stores one versioned workspace snapshot instead.

## State And Data Flow

1. Load a normalized demo state.
2. Restore a persisted snapshot and merge it with current schema defaults.
3. Hydrate the editor, queue, settings, and publish history from that state.
4. Article edits update metrics and mark every `ChannelVersion` as
   `needs_adaptation`.
5. Re-adaptation returns an authorized version to `needs_review`.
6. Confirmation changes a current, valid version to `ready`, while preserving
   its actual delivery method.
7. Publishing creates a `PublishBatch` containing selected `ready` tasks only.
8. Every state mutation is saved locally and reports saving status in the UI.

## UI Changes

- Keep the solid paper editor and make title, summary, body, cover description,
  and tags editable.
- Add live word count, reading time, and SEO summary length.
- Add a small save-status control and a reset-demo action.
- Add a comfortable/compact queue density switch.
- Add a publish-history view using the existing top navigation.
- Extend the existing preview dialog with version freshness and validation.

## Error Handling

- Storage parse failures fall back to demo data and show `保存失败`.
- Storage writes return a result object instead of throwing into UI handlers.
- Unknown or older snapshots merge with current defaults.
- Re-adaptation never clears authorization or publish-failure issues.
- Stale, unauthorized, and failed tasks cannot enter a publish batch.

## Acceptance

- Refresh restores edited article fields and queue state.
- Editing content makes channel versions stale.
- Re-adaptation and confirmation produce a ready task.
- Publishing produces a persistent history row.
- Reset restores the original demo workspace.
- Desktop and tablet retain the approved layout without horizontal overflow.

