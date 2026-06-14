# Phase 2 Local Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OneFlow a persistent, editable, local-first publishing workbench.

**Architecture:** Store one versioned normalized workspace snapshot through a
small storage adapter. Keep domain transitions in pure functions in `app.js`,
then bind them to the existing editor, queue, preview, dock, and a new publish
history view.

**Tech Stack:** HTML, CSS, Vanilla JavaScript, localStorage, Node test runner.

---

### Task 1: Persistence Contract

**Files:**
- Create: `storage.js`
- Modify: `index.html`
- Test: `tests/app.test.js`

- [ ] Add failing tests for successful save/load, corrupt snapshots, and reset.
- [ ] Implement a versioned storage repository returning `{ ok, state, error }`.
- [ ] Load `storage.js` before `app.js`.
- [ ] Run `node --test tests/app.test.js`.

### Task 2: Article Editing And Version Freshness

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`
- Test: `tests/app.test.js`

- [ ] Add failing tests for metrics and stale-version transitions.
- [ ] Extend `Article` with summary, body HTML, cover description, and save time.
- [ ] Add `versionStatus` and source article timestamps to `ChannelVersion`.
- [ ] Bind title, summary, body, tags, and cover description to state.
- [ ] Add debounced saving status and live article metrics.
- [ ] Run `node --test tests/app.test.js`.

### Task 3: Adaptation, Confirmation, And Batch History

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`
- Test: `tests/app.test.js`

- [ ] Add failing tests for re-adaptation, confirmation, batch counts, and reuse.
- [ ] Implement transitions from stale to review to ready.
- [ ] Extend batch records with article, channels, strategy, and result counts.
- [ ] Add publish-history navigation, detail, and reuse actions.
- [ ] Persist every queue and batch mutation.
- [ ] Run `node --test tests/app.test.js`.

### Task 4: Preview And Queue Density

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`
- Test: `tests/app.test.js`

- [ ] Add stale state and preflight checks to preview decisions.
- [ ] Rename preview actions and bind confirmation to ready state.
- [ ] Add comfortable and compact queue modes backed by `WorkspaceSettings`.
- [ ] Verify button, focus, active, and disabled states.

### Task 5: Documentation And Verification

**Files:**
- Modify: `docs/product-data-model.md`
- Create: `docs/local-persistence.md`
- Create: `docs/publish-batch-flow.md`
- Modify: `README.md`

- [ ] Document schema versioning, data flow, limitations, and backend migration.
- [ ] Run all automated tests and syntax checks.
- [ ] Verify persistence and interactions in the in-app browser at 1440px.
- [ ] Verify tablet behavior at 820px.
- [ ] Export final screenshots to `docs/screenshots/`.

