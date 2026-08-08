# Ofishal Business Shared Trip Board Design

**Date:** August 8, 2026  
**Linear:** WC-398  
**Repository:** `willcampbell433/core-four-canyon-run`

## Objective

Turn the existing static Fab Five trip board into a shared, realtime board that any visitor can update without an account. Move the canonical deployment to Vercel, store shared state in Supabase, preserve the current visual design and July archive, and keep precise GPS data local to each viewer's device.

## Approved Decisions

- Vercel project: `ofishal-business`
- Supabase project: `ofishal-business-board`
- Keep the current vanilla HTML, CSS, and JavaScript application; do not rewrite it in Next.js.
- Anyone with the URL may create, read, update, and delete trip-log entries.
- Anyone with the URL may change trip status, active destination, and return note.
- No accounts, shared code, or private editor mode.
- GPS remains device-local and is never written to Supabase.
- Realtime updates and offline recovery are required.
- The July 3-4 archive remains unchanged and separate from the active trip.

## Approach

### Selected: Vercel static deployment with direct Supabase access

The browser uses Supabase's publishable client credentials and public Row Level Security policies. Supabase Postgres stores data and Supabase Realtime distributes changes to connected clients. Vercel hosts the existing static site and injects the public Supabase configuration during its build.

This is the smallest architecture that provides durable shared state and realtime updates. A server-side API would not add meaningful access control because all writes are intentionally public.

### Rejected: Vercel Functions in front of Supabase

A functions layer could add rate limits, private validation, and audit hooks, but it would duplicate database validation and increase operational surface without changing the approved public-write model.

### Rejected: Neon Postgres with polling

Neon would provide durable relational storage but not the direct realtime subscription path needed by the board. Polling would add latency and unnecessary client traffic.

## Architecture

### Static application

The current root `index.html`, `styles.css`, `app.js`, assets, and archive remain the application. Shared-state logic is isolated into a small module rather than expanding the existing all-purpose script further.

Suggested boundaries:

- `app.js`: current board rendering, map, weather, GPS, and event wiring
- `shared-store.js`: Supabase reads, writes, realtime reconciliation, cache, and offline queue
- `shared-config.js`: build-generated public Supabase URL and publishable key
- `supabase/migrations/*.sql`: schema, policies, realtime publication, and idempotent seed data

### Hosting

Vercel connects to the existing GitHub repository. Pull requests receive preview deployments. The Vercel build command runs the repository test suite, generates `shared-config.js`, and publishes only when both steps succeed. Merges to `main` deploy production automatically. The initial production alias is `ofishal-business.vercel.app`, subject to Vercel name availability.

GitHub Pages remains available during cutover. The Vercel deployment becomes the canonical link only after production verification. The Pages version continues in local-only fallback mode if it has no Supabase configuration.

### Public configuration

Only the Supabase project URL and publishable browser key are exposed to the client. They are designed for browser use and receive only the permissions granted by Row Level Security. The Supabase service-role key is never exposed, committed, or used by the browser.

Vercel environment variables provide the public values to a build script that generates `shared-config.js`. Local development reads equivalent values from an ignored environment file. If configuration is missing, the board remains usable in local-only fallback mode and labels itself accordingly.

## Data Model

### `trips`

One row per trip.

- `id uuid primary key`
- `slug text unique not null`
- `title text not null`
- `trip_date date not null`
- `created_at timestamptz not null default now()`

The active trip slug is `fab-five-2026-08-08`.

### `trip_state`

One mutable row per trip.

- `trip_id uuid primary key references trips(id) on delete cascade`
- `status text not null` with an allowed-value constraint
- `active_destination text not null` with an allowed-value constraint
- `return_note text not null` limited to 160 characters
- `updated_at timestamptz not null default now()`

Allowed statuses are `pre-departure`, `underway`, `fishing`, `heading-home`, and `recap`. Allowed destinations are `Manasquan Inlet`, `Barnegat Ridge South`, `Barnegat Ridge North`, `Seaside Lumps`, and `Home`.

Concurrent state edits use last-write-wins semantics based on the final accepted database update.

### `trip_log_entries`

One row per board-log entry.

- `id uuid primary key`
- `trip_id uuid not null references trips(id) on delete cascade`
- `time_label text not null` limited to 80 characters
- `entry_type text not null` limited to 40 characters
- `method text not null` limited to 40 characters
- `angler text null` limited to 40 characters
- `moment text not null` limited to 500 characters
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Rows display in ascending creation order and the UI reverses them for the newest-first timeline. Catch count and crew standings continue to derive from entry type and angler, preserving current behavior.

Client-generated UUIDs make queued creates idempotent. Replaying the same create cannot duplicate an entry.

## Database Access

Row Level Security is enabled on all tables. The publishable anonymous role receives:

- `SELECT` on the active trip, state, and log entries
- `INSERT`, `UPDATE`, and `DELETE` on `trip_state` and `trip_log_entries`
- no client-side ability to create or delete trip definitions

Policies intentionally permit all visitors. Database constraints enforce allowed state values, field lengths, required fields, and trip relationships. This prevents malformed data but does not attempt to identify editors or prevent deliberate vandalism, matching the approved just-for-fun public model.

Supabase Realtime publishes changes for `trip_state` and `trip_log_entries`.

A shared database trigger refreshes `updated_at` on every state or log update so ordering and last-write-wins behavior use server timestamps rather than client clocks.

## Client Data Flow

### Startup

1. Render the last cached shared snapshot immediately when available.
2. Initialize the existing local GPS and non-shared board features independently.
3. Connect to Supabase and fetch the active trip, trip state, and ordered log entries.
4. Replace the cached snapshot with the server result.
5. Subscribe to state and log changes.
6. Replay queued mutations in original order.

### Create, edit, and delete

1. Apply the change optimistically in the browser.
2. Add a mutation record to the local queue before attempting the network request.
3. Send the mutation to Supabase.
4. On success, remove it from the queue and mark the board synced.
5. On failure, retain it, show pending/offline state, and retry when connectivity returns.

Creates use client-generated UUIDs. Updates and deletes target those UUIDs. Mutations replay in order, so an offline edit followed by a delete produces the same final result when connectivity returns. A server-side delete causes later stale updates to affect zero rows rather than resurrecting the row.

### Realtime reconciliation

Realtime inserts, updates, and deletes reconcile by row ID. The cache is rewritten after each accepted remote event. Echoes of the current client's optimistic mutations replace the optimistic record without duplication.

### Conflict behavior

- State and entry edits are last-write-wins.
- Deletes win because deleted rows cannot be updated.
- The UI does not attempt field-level merge or display an audit history.

## User Interface

### Shared-state controls

Add compact controls near the mission panel for:

- trip status
- active destination
- return note

Changes save immediately and appear on all connected devices. The tracker uses the shared active destination for distance and ETA, but its position continues to come only from the local device.

### Shared log

- Change the form action from `Add locally` to `Add to shared log`.
- Add edit and delete actions to each active-trip entry.
- Use a confirmation prompt before delete to reduce accidental taps; no authorization is required.
- Preserve the existing time, type, method, angler, and moment fields.
- Continue deriving catch count and crew tally from the shared entries.

### Sync state

Display one clear state near the log and shared controls:

- `Synced`: server snapshot is current and no writes are queued
- `Pending`: one or more mutations are queued or in flight
- `Offline`: network or Supabase is unavailable; changes remain queued locally
- `Local only`: Supabase configuration is missing, used by the Pages fallback

Errors remain visible until recovery. Successful reconnect and queue replay return the badge to `Synced`.

## Migration

The schema migration inserts the active trip, current state, and each hosted Fab Five seed entry with fixed UUIDs and timestamps. Every seed insert uses `on conflict do nothing`, making migration and recovery reruns safe.

Existing per-browser local entries cannot be centrally discovered. On first shared launch, a browser that has non-seed local entries offers a one-time `Publish my local entries` action. Published entries receive deterministic client UUIDs so retrying the import cannot duplicate them.

The archived July application and its storage key remain untouched.

## Failure Handling

- Supabase unavailable at startup: render cache or existing seeds and show `Offline`.
- Write fails: keep the mutation queued and the optimistic row visibly pending.
- Realtime disconnects: retain the last snapshot, show `Offline`, refetch after reconnect, then replay the queue.
- Invalid public write: roll back the optimistic change and show the database validation message in plain language.
- Vercel deployment failure: production remains on the last successful deployment.
- Supabase migration failure: stop before Vercel promotion; do not point the canonical link at a partially configured backend.

## Testing

Automated coverage includes:

- shared-store CRUD mapping and row reconciliation
- idempotent queued creates
- ordered queue replay for create, update, and delete
- startup cache, offline, pending, synced, and local-only states
- validation rollback behavior
- shared active destination driving tracker ETA without publishing local coordinates
- catch count and crew tally from shared rows
- idempotent seed migration contracts
- July archive isolation
- existing map, weather, clock, and local GPS regression coverage

Deployment verification includes:

- local full test suite and JavaScript syntax checks
- Vercel preview build
- production smoke test on desktop and mobile layouts
- two-client realtime create, edit, delete, state, and destination checks
- offline queued write followed by reconnect and idempotent replay
- a production smoke entry that is edited and deleted after verification
- confirmation that no GPS coordinates appear in Supabase network payloads or tables

## Rollout and Rollback

1. Provision Supabase and apply the idempotent schema/seed migration.
2. Link the GitHub repository to Vercel as `ofishal-business`.
3. Configure Vercel public environment values.
4. Deploy and verify a preview.
5. Merge the implementation and verify production.
6. Publish the Vercel URL as canonical while leaving GitHub Pages available during the transition.

Rollback repoints Vercel to the last known-good deployment. Supabase data remains intact. The existing GitHub Pages site continues to provide its local-only board as a fallback.

## Non-Goals

- user accounts, invite codes, or editor identity
- anti-spam or abuse prevention beyond database constraints
- public or persisted GPS tracking
- photo uploads or shared gallery storage
- a Next.js or React rewrite
- changes to the July archive
- generalized multi-boat fleet management

## Acceptance Criteria

- The Vercel production site loads the existing board and July archive.
- Public visitors can add, edit, and delete active-trip log entries without signing in.
- Status, destination, and return note update without a code deployment.
- Open clients receive shared changes in realtime.
- Catch count and crew tally reflect shared entries.
- Pending writes survive connectivity loss and replay without duplicates.
- Current hosted entries exist exactly once after migration.
- Local GPS continues to work and no coordinates are persisted or transmitted to Supabase.
- GitHub `main` automatically deploys production through Vercel, and a failing test blocks publication.
- Automated and public desktop/mobile verification pass.
