# Single Trip Update Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate live trip state and board-log entry creation into one save path.

**Architecture:** Replace the two forms with one form and a read-only shared-state summary. The submit handler sends the same update text to `trip_state.return_note` and `trip_log_entries.moment` through one shared-store operation that queues both mutations before replay.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node test runner, Supabase client, Vercel static deployment.

## Global Constraints

- Keep the Trip Log section in its current lower-page location.
- Preserve Supabase autosave, realtime updates, local fallback, and offline replay.
- Do not change the July archive.
- Do not add dependencies or database migrations.

---

### Task 1: Consolidated UI contract

**Files:**
- Modify: `tests/shared-ui-contract.test.mjs`

**Interfaces:**
- Consumes: `index.html` and `app.js` as text fixtures.
- Produces: contract coverage for `tripUpdateForm`, `tripUpdateInput`, shared-state summary IDs, conditional catch fields, and one submit handler.

- [ ] **Step 1: Write the failing test**

Assert that the old `tripStateForm` is absent, `tripUpdateForm` is the only update form, current-state summary IDs exist, and the handler passes `tripUpdateInput.value.trim()` to both `return_note` and `moment`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/shared-ui-contract.test.mjs`

Expected: FAIL because the page still has `tripStateForm` and two submit handlers.

- [ ] **Step 3: Commit after the implementation passes**

Commit the test with the production changes in Task 2 so the branch remains bisectable.

### Task 2: One-save trip update flow

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `shared-store.js`
- Modify: `styles.css`
- Test: `tests/shared-ui-contract.test.mjs`
- Test: `tests/shared-store.test.mjs`

**Interfaces:**
- Consumes: the existing shared-store queue and replay behavior.
- Produces: `sharedStore.saveTripUpdate({ state, entry })`, `tripUpdateForm`, `tripUpdateInput`, `currentTripStatus`, `currentTripDestination`, `currentTripNote`, and `catchDetails`.

- [ ] **Step 1: Replace the separate forms**

Create one form with the update, status, destination, type, conditional method/angler fields, sync state, sync error, and one `Save to trip log` submit button.

- [ ] **Step 2: Implement the single handler**

On submit, build one timestamped entry and call `saveTripUpdate({ state, entry })`. The store queues `update-state` followed by `create-entry` before replay. For non-catches, derive `Running` for underway/heading-home and `Other` otherwise.

- [ ] **Step 3: Render current shared state**

Update the read-only summary and form selectors from each store snapshot without overwriting the field the user is actively editing.

- [ ] **Step 4: Toggle catch details**

Show method and angler only when type is Tuna or Mahi mahi, and set `aria-hidden` with the `hidden` attribute for other entry types.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/shared-ui-contract.test.mjs`

Expected: all shared UI contract tests pass.

### Task 3: Full verification and local commit

**Files:**
- Verify all changed files.

**Interfaces:**
- Consumes: repository scripts and the production-like static build.
- Produces: a locally committed branch ready for explicit merge/deploy approval.

- [ ] **Step 1: Run full automated verification**

Run: `npm test && npm run check && npm run build`

Expected: zero failures and a successful static build.

- [ ] **Step 2: Inspect desktop and mobile layouts**

Serve the generated site locally, verify one visible input path, conditional catch details, and the Board Log location at desktop and mobile sizes.

- [ ] **Step 3: Review and commit**

Run: `git diff --check && git diff --stat && git status --short`

Commit message: `Simplify trip updates to one save flow`.
