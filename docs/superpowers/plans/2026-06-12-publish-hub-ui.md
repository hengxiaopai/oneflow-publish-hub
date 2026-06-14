# Publish Hub UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, accessible, editor-first multi-channel publishing console in native HTML, CSS, and JavaScript.

**Architecture:** Keep the document structure semantic and render channel groups from a single JavaScript data model. Isolate pure selection and status helpers so channel operations can be tested without a browser, then bind them to queue, preview, authorization, retry, and publishing controls.

**Tech Stack:** HTML5, CSS custom properties, Vanilla JavaScript, Node.js built-in test runner.

---

### Task 1: Channel State Model

**Files:**
- Create: `tests/app.test.js`
- Create: `app.js`

- [ ] Define representative article, draft, repurpose, and error channel states.
- [ ] Test grouping, ready-channel selection, and selection summaries.
- [ ] Implement the smallest pure helpers that satisfy the tests.

### Task 2: Semantic Product Shell

**Files:**
- Create: `index.html`

- [ ] Add the floating navigation and compact six-stage agent rail.
- [ ] Add workspace navigation, the primary article editor, and grouped publish queue.
- [ ] Add the fixed publish dock, preview dialog, and live-region feedback.

### Task 3: Liquid Glass Visual System

**Files:**
- Create: `styles.css`

- [ ] Define restrained material tokens and solid editor surfaces.
- [ ] Implement desktop and tablet layouts with queue/sidebar drawers.
- [ ] Add hover, focus, active, reduced-motion, high-contrast, and reduced-transparency fallbacks.

### Task 4: Product Interactions

**Files:**
- Modify: `app.js`

- [ ] Render grouped channel items and queue summaries.
- [ ] Implement channel selection, confirmation, authorization, retry, edit, and preview actions.
- [ ] Implement schedule, strategy, post-publish actions, and publish feedback.

### Task 5: Skill And Documentation

**Files:**
- Modify: `skills/liquid-glass-product-ui/SKILL.md`
- Create: `README.md`

- [ ] Document Liquid Glass usage rules, tokens, accessibility, anti-slop rules, and checklist.
- [ ] Document how to run and inspect the prototype.

### Task 6: Verification

- [ ] Run Node tests and skill validation.
- [ ] Serve locally and inspect desktop and tablet viewports.
- [ ] Exercise preview, confirmation, authorization, retry, selection, and publish controls.
- [ ] Fix material visual or interaction defects found in browser inspection.
