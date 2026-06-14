# Phase 2.5 Engineering Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immutable publish snapshots, safe HTML persistence, schema v3
migration, import/export, content library, and detailed local publishing audit.

**Architecture:** Keep domain transitions as pure functions in `app.js`, isolate
HTML filtering in `sanitizer.js`, and isolate migration/serialization in
`storage.js`. Existing views bind to derived history and library records.

**Tech Stack:** HTML, CSS, Vanilla JavaScript, localStorage, Node test runner,
Git, GitHub CLI.

---

### Task 1: HTML Sanitizer

**Files:**
- Create: `sanitizer.js`
- Create: `tests/sanitizer.test.js`
- Modify: `index.html`
- Modify: `app.js`

- [ ] Add failing tests for forbidden elements, event attributes,
  `javascript:` URLs, image attributes, and external-link `rel`.
- [ ] Implement the allow-list sanitizer.
- [ ] Sanitize editor updates, restored body HTML, and imported body HTML.
- [ ] Run sanitizer and application tests.

### Task 2: Storage Schema V3

**Files:**
- Modify: `storage.js`
- Create: `tests/storage-migration.test.js`
- Modify: `tests/storage.test.js`

- [ ] Add failing migration tests for v1, v2, v3, corrupt, and unsupported data.
- [ ] Add ordered migrations and v2-key discovery.
- [ ] Add `exportWorkspaceData()` and `importWorkspaceData()`.
- [ ] Preserve corrupt raw data and return a recovery state.
- [ ] Run storage tests.

### Task 3: Immutable Publish Snapshots

**Files:**
- Modify: `app.js`
- Modify: `tests/app.test.js`

- [ ] Add failing tests proving history is unchanged after article edits.
- [ ] Add `articleSnapshots` and `channelVersionSnapshots` collections.
- [ ] Create new immutable PublishTask records for each batch.
- [ ] Derive history and detail records exclusively from snapshots.
- [ ] Run application tests.

### Task 4: Cover Model And Local Content Library

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `tests/app.test.js`

- [ ] Add the structured `Article.cover` model and migrate legacy cover fields.
- [ ] Bind cover alt and description editing.
- [ ] Add content-library derived rows and open/copy/delete operations.
- [ ] Implement the content-library view with existing product components.

### Task 5: Import Export And Recovery UI

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`

- [ ] Add sidebar import, export, and reset controls.
- [ ] Add a hidden JSON file input and explicit import confirmation dialog.
- [ ] Add corrupt-data recovery notice and backup export.
- [ ] Rehydrate all views after a successful import.

### Task 6: Batch Details

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

- [ ] Render snapshot title, strategy, counts, and per-platform task details.
- [ ] Add per-platform copy and batch reuse actions.
- [ ] Verify details never read current mutable article/version data.

### Task 7: Documentation, Browser QA, And GitHub

**Files:**
- Modify: `docs/product-data-model.md`
- Modify: `docs/publish-batch-flow.md`
- Create: `docs/html-sanitization.md`
- Create: `docs/storage-migration.md`
- Modify: `README.md`

- [ ] Document schema v3, snapshots, sanitizer, and backend migration.
- [ ] Run all tests, syntax checks, skill validation, and secret scan.
- [ ] Verify 1440px and 820px flows in the in-app browser.
- [ ] Export screenshots to `docs/screenshots/`.
- [ ] Commit with `feat: 完成 Phase 2.5 本地数据安全加固`.
- [ ] Push `main` to `hengxiaopai/oneflow-publish-hub`.
