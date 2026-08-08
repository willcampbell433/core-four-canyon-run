# Ofishal Business Shared Trip Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the existing vanilla trip board to Vercel with public Supabase-backed realtime state, durable full-CRUD log entries, offline mutation replay, and device-local GPS.

**Architecture:** Keep the current static application and extract shared persistence into an importable `shared-store.js` module. Generate browser-safe Supabase configuration at build time, enforce validation and public access with SQL constraints/RLS, and retain the existing local board as the no-config fallback.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js built-in test runner, `@supabase/supabase-js` browser ESM, Supabase Postgres/Realtime, Vercel static hosting.

## Global Constraints

- Vercel project name is `ofishal-business`.
- Supabase project name is `ofishal-business-board`.
- No Next.js, React, accounts, invite codes, persisted GPS, photo storage, or July archive changes.
- Anonymous visitors may create, read, update, and delete active-trip log entries and update trip state.
- Public browser configuration contains only the Supabase URL and publishable key.
- The active trip slug is `fab-five-2026-08-08`.
- Allowed statuses are `pre-departure`, `underway`, `fishing`, `heading-home`, and `recap`.
- Allowed destinations are `Manasquan Inlet`, `Barnegat Ridge South`, `Barnegat Ridge North`, `Seaside Lumps`, and `Home`.
- GPS coordinates remain local and must never enter shared rows or mutation payloads.

---

### Task 1: Database contract and idempotent seed

**Files:**
- Create: `supabase/migrations/20260808111500_shared_trip_board.sql`
- Create: `tests/migration-contract.test.mjs`

**Interfaces:**
- Produces tables `trips`, `trip_state`, and `trip_log_entries` plus public RLS and realtime publication.
- Produces one active trip, one active state row, and five fixed-ID seed entries.

- [ ] **Step 1: Write failing migration contract tests**

```js
test("migration enforces public CRUD and realtime contracts", async () => {
  const sql = await read("supabase/migrations/20260808111500_shared_trip_board.sql");
  assert.match(sql, /enable row level security/gi);
  assert.match(sql, /for (select|all) to anon/gi);
  assert.match(sql, /supabase_realtime/gi);
  assert.doesNotMatch(sql, /latitude|longitude|coordinates|service_role/gi);
});

test("migration seeds the active trip exactly once", async () => {
  const sql = await read("supabase/migrations/20260808111500_shared_trip_board.sql");
  assert.match(sql, /fab-five-2026-08-08/g);
  assert.match(sql, /on conflict[^;]+do nothing/gi);
  assert.equal((sql.match(/Reached Manasquan Inlet/g) || []).length, 1);
});
```

- [ ] **Step 2: Run `node --test tests/migration-contract.test.mjs` and confirm it fails because the migration is absent**
- [ ] **Step 3: Implement UUID-backed tables, length/value constraints, `updated_at` trigger, grants, public policies, realtime publication, and deterministic seed inserts**
- [ ] **Step 4: Run the migration contract test and the full `npm test` suite**
- [ ] **Step 5: Commit with `git commit -m "feat(WC-398): define shared trip board database"`**

### Task 2: Shared store red-green implementation

**Files:**
- Create: `shared-store.js`
- Create: `tests/shared-store.test.mjs`

**Interfaces:**
- Produces `createSharedStore({ client, storage, online, now })`.
- Produces methods `start()`, `subscribe(listener)`, `addEntry(entry)`, `updateEntry(id, patch)`, `deleteEntry(id)`, `updateTripState(patch)`, and `replayQueue()`.
- Snapshot shape is `{ mode, syncState, trip, tripState, entries, queuedCount, error }`.

- [ ] **Step 1: Write failing tests for local-only startup and cached startup**

```js
test("missing client starts in local-only mode", async () => {
  const store = createSharedStore({ client: null, storage: memoryStorage() });
  await store.start();
  assert.equal(store.getSnapshot().syncState, "local-only");
});
```

- [ ] **Step 2: Run the focused test and verify the missing export failure**
- [ ] **Step 3: Implement snapshot state, cache loading, subscriptions, and local-only mode**
- [ ] **Step 4: Write failing tests for server fetch and realtime INSERT/UPDATE/DELETE reconciliation by ID**
- [ ] **Step 5: Implement initial fetch, cache persistence, and realtime reconciliation without duplicate rows**
- [ ] **Step 6: Write failing tests for optimistic create/update/delete, ordered replay, idempotent UUID creates, validation rollback, and online recovery**
- [ ] **Step 7: Implement the durable queue under `ofishal-business-shared-queue-v1`, original-order replay, zero-row stale-update handling, and plain-language errors**
- [ ] **Step 8: Run `node --test tests/shared-store.test.mjs` and `npm test`**
- [ ] **Step 9: Commit with `git commit -m "feat(WC-398): add realtime offline shared store"`**

### Task 3: Build-generated public configuration

**Files:**
- Create: `scripts/generate-shared-config.mjs`
- Create: `shared-config.example.js`
- Create: `vercel.json`
- Modify: `.gitignore`
- Modify: `package.json`
- Create: `tests/build-contract.test.mjs`

**Interfaces:**
- Consumes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Produces ignored `shared-config.js` containing `window.OFISHAL_SHARED_CONFIG`.

- [ ] **Step 1: Write failing tests that require config generation, secret rejection, test-before-build ordering, and static output**
- [ ] **Step 2: Run `node --test tests/build-contract.test.mjs` and confirm expected failures**
- [ ] **Step 3: Implement a generator that writes empty configuration when public variables are absent and rejects keys containing `service_role`**
- [ ] **Step 4: Add `pretest`, `build`, and `check` scripts so syntax checks and the full tests run before Vercel publishes**
- [ ] **Step 5: Add `shared-config.js` to `.gitignore`, commit the safe example, and configure Vercel as a static deployment**
- [ ] **Step 6: Run `npm run build`, verify generated config is ignored, and run `git diff --check`**
- [ ] **Step 7: Commit with `git commit -m "build(WC-398): add safe Vercel config generation"`**

### Task 4: Shared controls and public log CRUD UI

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Modify: `tests/site-contract.test.mjs`
- Create: `tests/shared-ui-contract.test.mjs`

**Interfaces:**
- Consumes `window.OFISHAL_SHARED_CONFIG` and `createSharedStore`.
- Shared control IDs are `tripStatusControl`, `destinationControl`, `returnNoteControl`, and `syncState`.
- Entry actions use `data-entry-edit` and `data-entry-delete` attributes.

- [ ] **Step 1: Write failing DOM/source contract tests for the shared controls, sync states, edit/delete actions, Supabase bootstrap, and unchanged archive files**
- [ ] **Step 2: Run the focused tests and confirm failures are due to missing shared UI**
- [ ] **Step 3: Add compact status, destination, return-note, and sync-state controls near the mission panel**
- [ ] **Step 4: Refactor active-board log rendering to consume store snapshots while keeping seed/local fallback behavior**
- [ ] **Step 5: Wire add, edit, confirmed delete, copy export, catch count, and crew tally to shared rows**
- [ ] **Step 6: Make the tracker resolve its destination from shared state while keeping `watchPosition` output only in local DOM/map state**
- [ ] **Step 7: Add one-time `Publish my local entries` import using deterministic client UUIDs**
- [ ] **Step 8: Style controls, action buttons, pending rows, and sync badges for mobile and desktop**
- [ ] **Step 9: Run focused tests, full tests, and `node --check app.js && node --check shared-store.js`**
- [ ] **Step 10: Commit with `git commit -m "feat(WC-398): connect board UI to shared state"`**

### Task 5: Provision backend and preview deployment

**Files:**
- Modify only deployment-owned local metadata ignored by Git (`.vercel/`, `.supabase/`, and generated config).

**Interfaces:**
- Produces Supabase project `ofishal-business-board` and Vercel project `ofishal-business`.
- Produces preview URL and linked Git repository deployment settings.

- [ ] **Step 1: Confirm project-name availability, account/team ownership, region, and free-tier eligibility before creating billable resources**
- [ ] **Step 2: Create/link Supabase, apply the migration, and query row counts and policy/publication metadata**
- [ ] **Step 3: Create/link Vercel, set public URL/key for preview and production, and connect `willcampbell433/core-four-canyon-run`**
- [ ] **Step 4: Push the WC-398 branch and create a PR whose title includes `WC-398`**
- [ ] **Step 5: Verify preview build logs show tests and config generation succeeding**
- [ ] **Step 6: Run public HTTP, desktop, mobile, two-client realtime CRUD/state, offline replay, and network-payload GPS privacy checks**
- [ ] **Step 7: Delete the temporary smoke entry and confirm the five seed rows remain exactly once**

### Task 6: Production rollout and closure

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces canonical production URL and documented local/Pages fallback behavior.

- [ ] **Step 1: Write a failing README contract requiring the production URL and local-only fallback instructions**
- [ ] **Step 2: Update README with canonical Vercel URL, local testing/build commands, public-write warning, and rollback notes**
- [ ] **Step 3: Run the full test/build/syntax/diff verification gate and review the complete diff for secrets or GPS payloads**
- [ ] **Step 4: Merge the PR, verify Vercel production deployment from `main`, and repeat the public smoke/realtime/offline/privacy checks**
- [ ] **Step 5: Leave one detailed Linear closing comment with PR, deployment, schema, tests, and verification evidence, then mark WC-398 Done**
- [ ] **Step 6: Confirm main is current, remove the WC-398 worktree, and record the deployment in the daily memory note**
