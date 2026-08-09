# Gallery and Trip Log UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support 500-character multi-line trip updates and show only newest-first uploaded photos in the gallery.

**Architecture:** Preserve the single trip-update save flow, widen its shared-state database constraint, and make narrow markup/rendering changes. No new dependencies or storage paths are introduced.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js test runner, Supabase Postgres/Storage, Vercel.

## Global Constraints

- Trip updates accept 1 to 500 characters.
- The gallery contains no static stock image.
- Shared uploads remain append-only and render newest first.
- GPS behavior and existing shared persistence are unchanged.

---

### Task 1: Define the UI and database contracts

**Files:**
- Modify: `tests/shared-ui-contract.test.mjs`
- Modify: `tests/migration-contract.test.mjs`

**Interfaces:**
- Consumes: current `index.html`, `app.js`, and Supabase migrations.
- Produces: failing contracts for a 500-character textarea, no stock gallery image, newest-first photo ordering, and a 500-character state-note constraint.

- [ ] **Step 1: Write the failing tests**

Add assertions that `tripUpdateInput` is a textarea with `maxlength="500"`, `sharedPhotoList` has no `data-static-photo`, photo queries/order sort descending by `created_at`, and the new migration replaces the state-note check with a 500-character maximum.

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `node --test tests/shared-ui-contract.test.mjs tests/migration-contract.test.mjs`

Expected: failures for the textarea, stock image removal, and missing migration.

### Task 2: Implement the approved behavior

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Create: `supabase/migrations/20260809022000_expand_trip_update_length.sql`

**Interfaces:**
- Consumes: `#tripUpdateInput`, `trip_state.return_note`, and `#sharedPhotoList`.
- Produces: a multi-line update field, a widened database boundary, and an upload-only gallery.

- [ ] **Step 1: Implement the minimal markup and migration changes**

Replace the text input with `<textarea id="tripUpdateInput" maxlength="500" ...></textarea>`, add focused textarea sizing styles, remove the static gallery figure, and add an idempotent migration that drops the old `trip_state_return_note_check` before adding a 1-to-500-character check.

- [ ] **Step 2: Run focused tests to verify they pass**

Run: `node --test tests/shared-ui-contract.test.mjs tests/migration-contract.test.mjs`

Expected: all focused tests pass.

### Task 3: Verify and release

**Files:**
- Modify: `docs/superpowers/specs/2026-08-08-gallery-log-ux-design.md`
- Modify: `docs/superpowers/plans/2026-08-08-gallery-log-ux.md`

**Interfaces:**
- Consumes: completed branch and production services.
- Produces: verified main branch, applied Supabase migration, and live Vercel release.

- [ ] **Step 1: Run full automated verification**

Run: `npm run build`

Expected: all tests, syntax checks, and static build pass.

- [ ] **Step 2: Verify browser behavior**

Confirm the textarea is multi-line, accepts 500 characters, the gallery has no stock image, uploaded photos are newest first, and mobile has no horizontal overflow.

- [ ] **Step 3: Commit, push, merge, and deploy**

Commit the branch, open and merge a pull request to `main`, apply the Supabase migration, wait for Vercel production to become Ready, then re-run smoke checks against the live URL.
