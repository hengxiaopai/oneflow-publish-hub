# Phase 3S SaaS Product Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Vanilla JS SaaS product shell, entitlement model, architecture documentation, and server-side publishing boundary while preserving the existing local workbench.

**Architecture:** Keep `app.js` authoritative for the local workspace and expose a small read/action API. Add `entitlements.js` for pure plan decisions and `saas-shell.js` for hash routing, SaaS mock projections, and route rendering. The backend remains a documented target architecture; no fake auth, billing, or third-party API is implemented.

**Tech Stack:** HTML, CSS, Vanilla JavaScript, localStorage/sessionStorage, Node.js built-in test runner, in-app browser.

---

### Task 1: Entitlement Model

**Files:**
- Create: `entitlements.js`
- Create: `tests/entitlements.test.js`

- [ ] **Step 1: Write failing tests for plan differences and quota exhaustion**

Test Free, Pro, and Studio decisions for article creation, channel connection,
batch publishing, AI capabilities, member invitation, image hosting, scheduling,
and data feedback. Assert stable `allowed`, `reason`, `limit`, `used`, and
`remaining` fields.

- [ ] **Step 2: Run the entitlement tests and verify missing-module failure**

Run: `node --test tests/entitlements.test.js`

Expected: FAIL because `entitlements.js` does not exist.

- [ ] **Step 3: Implement pure plan definitions and permission functions**

Use stable keys `free`, `pro`, and `studio`; represent unlimited values as
`null`; reject unknown plans with `unknown_plan`; reject exhausted quotas with
specific reason codes such as `article_limit_reached`.

- [ ] **Step 4: Run entitlement tests**

Run: `node --test tests/entitlements.test.js`

Expected: all entitlement tests pass.

### Task 2: SaaS Router and View Models

**Files:**
- Create: `saas-shell.js`
- Create: `tests/saas-shell.test.js`

- [ ] **Step 1: Write failing tests for routes, session mode, dashboard, channels, and AI toggles**

Assert all eleven hashes normalize correctly, unknown routes fall back by mode,
local entry creates only a development session marker, cloud entry remains a
placeholder, dashboard counts derive from a provided workspace state, channel
views never contain token-shaped fields, and AI toggles respect plan gates.

- [ ] **Step 2: Run router tests and verify missing-module failure**

Run: `node --test tests/saas-shell.test.js`

Expected: FAIL because `saas-shell.js` does not exist.

- [ ] **Step 3: Implement pure router and SaaS state helpers**

Export route constants, hash normalization, session-mode actions, SaaS mock
state, dashboard projection, channel projection, capability definitions, and
toggle helpers without touching the DOM.

- [ ] **Step 4: Run router tests**

Run: `node --test tests/saas-shell.test.js`

Expected: all router tests pass.

### Task 3: Existing Workbench Bridge

**Files:**
- Modify: `app.js`
- Modify: `tests/app.test.js`

- [ ] **Step 1: Add a failing source-contract test**

Assert the browser section exposes `window.OneFlowApp` methods for cloned state,
legacy view switching, subscriptions, new article creation, and import opening.

- [ ] **Step 2: Run the app tests and verify the contract test fails**

Run: `node --test tests/app.test.js`

Expected: FAIL because the bridge does not exist.

- [ ] **Step 3: Add the minimal browser bridge**

Emit state subscribers after persisted state changes. Keep Node exports and all
existing pure functions unchanged.

- [ ] **Step 4: Run app tests**

Run: `node --test tests/app.test.js`

Expected: existing and new tests pass.

### Task 4: Product Shell Markup and Styling

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `saas-shell.js`
- Modify: `tests/saas-shell.test.js`

- [ ] **Step 1: Add failing shell structure tests**

Assert required route containers, route links, login actions, product menu,
script loading order, and token-free channel copy exist.

- [ ] **Step 2: Run shell tests and verify structure failures**

Run: `node --test tests/saas-shell.test.js`

Expected: FAIL on missing route containers and controls.

- [ ] **Step 3: Add route containers and browser controller**

Add login, dashboard, channels, media, AI capabilities, billing, team, and
settings containers. Map Articles, Workbench, and Publish History to existing
sections. Bind hash changes, local-mode entry, cloud placeholder, quick actions,
product menu, AI toggles, and non-secret settings.

- [ ] **Step 4: Add responsive visual treatment**

Reuse existing color, glass, focus, motion, transparency, and solid-paper
patterns. Keep the workbench layout untouched. Ensure SaaS pages use readable
solid panels and the tablet product menu becomes layered navigation.

- [ ] **Step 5: Run shell and full tests**

Run: `node --test tests/*.test.js`

Expected: all tests pass.

### Task 5: SaaS Documentation and Data Models

**Files:**
- Create: `docs/saas-architecture.md`
- Create: `docs/product-information-architecture.md`
- Create: `docs/pricing-entitlement-model.md`
- Create: `docs/backend-api-design.md`
- Create: `docs/security-model.md`
- Create: `docs/server-side-publisher-design.md`
- Modify: `docs/product-data-model.md`
- Modify: `docs/halo-integration.md` if present
- Modify: `README.md`

- [ ] **Step 1: Document architecture ownership**

Define frontend, backend, database, worker/queue, object storage, AI provider,
billing, usage metering, and security responsibilities. State that long-lived
tokens are backend encrypted and workers execute publisher adapters.

- [ ] **Step 2: Document information architecture and API contracts**

Cover every requested product module and endpoint with request fields, response
fields, error codes, permission requirements, and entitlement checks.

- [ ] **Step 3: Extend product models**

Define User, Workspace, WorkspaceMember, Role, Session, AuthProvider,
Subscription, Plan, Entitlement, UsageQuota, UsageRecord, and BillingCustomer
with fields, purpose, and JSON examples.

- [ ] **Step 4: Mark the browser-direct Halo design as transitional**

Reference commit `c89aa06` as a Phase 3 local validation artifact superseded by
the Phase 3S server-side publisher design.

- [ ] **Step 5: Validate documentation and public safety**

Run secret-pattern searches and confirm no credentials, fake accounts, or token
examples are included.

### Task 6: Browser Acceptance and Screenshots

**Files:**
- Add: `docs/screenshots/phase-3s-login-1440.png`
- Add: `docs/screenshots/phase-3s-dashboard-1440.png`
- Add: `docs/screenshots/phase-3s-channels-1440.png`
- Add: `docs/screenshots/phase-3s-ai-capabilities-1440.png`
- Add: `docs/screenshots/phase-3s-billing-1440.png`
- Add: `docs/screenshots/phase-3s-workbench-1440.png`
- Add: `docs/screenshots/phase-3s-tablet-820.png`

- [ ] **Step 1: Run the local static server**

Serve `G:/codex/oneToMany` at `http://127.0.0.1:4173/`.

- [ ] **Step 2: Verify desktop routes and interactions**

Exercise login, local entry, dashboard quick actions, articles, workbench,
history, channels, AI enable/disable, billing, team, media, and settings.

- [ ] **Step 3: Verify tablet behavior**

At 820px, verify the product menu, readable SaaS pages, existing workbench
drawers, no horizontal overflow, and no publish-dock obstruction.

- [ ] **Step 4: Inspect browser console**

Require zero errors and zero warnings across tested routes.

- [ ] **Step 5: Save acceptance screenshots**

Capture the specified route states under `docs/screenshots/`.

### Task 7: Final Verification and GitHub Publish

**Files:**
- Modify: `.gitignore` only if safety checks reveal a missing exclusion

- [ ] **Step 1: Run full automated verification**

Run:

```powershell
node --test tests/*.test.js
node --check app.js
node --check storage.js
node --check sanitizer.js
node --check entitlements.js
node --check saas-shell.js
$env:PYTHONUTF8='1'; python 'C:\Users\Administrator\.codex\skills\.system\skill-creator\scripts\quick_validate.py' skills\liquid-glass-product-ui
```

- [ ] **Step 2: Run repository safety checks**

Inspect `git status`, tracked files, staged diff, ignored secret files, token
patterns, cookies, credentials, browser profiles, caches, and generated output.

- [ ] **Step 3: Commit the completed Phase 3S scope**

Run:

```powershell
git add .
git commit -m "feat: add SaaS architecture and product shell"
```

- [ ] **Step 4: Push main**

Run `git push`.

- [ ] **Step 5: Report evidence**

Report tests, screenshots, final commit hash, repository URL, push status, and
remaining product risks.
