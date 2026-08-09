import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL(
  "../supabase/migrations/20260808111500_shared_trip_board.sql",
  import.meta.url,
);
const photoMigrationUrl = new URL(
  "../supabase/migrations/20260808165500_trip_photos.sql",
  import.meta.url,
);
const photoAppendOnlyMigrationUrl = new URL(
  "../supabase/migrations/20260808185000_photo_gallery_append_only.sql",
  import.meta.url,
);
const destinationMigrationUrl = new URL(
  "../supabase/migrations/20260808195800_tracker_destinations.sql",
  import.meta.url,
);
const tripUpdateLengthMigrationUrl = new URL(
  "../supabase/migrations/20260809022000_expand_trip_update_length.sql",
  import.meta.url,
);

test("migration enforces public CRUD and realtime contracts", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.equal((sql.match(/enable row level security/gi) || []).length, 3);
  assert.match(sql, /grant select on public\.trips to anon/i);
  assert.match(sql, /grant select, insert, update, delete on public\.trip_state to anon/i);
  assert.match(sql, /grant select, insert, update, delete on public\.trip_log_entries to anon/i);
  assert.match(sql, /alter publication supabase_realtime add table public\.trip_state/i);
  assert.match(sql, /alter publication supabase_realtime add table public\.trip_log_entries/i);
  assert.doesNotMatch(sql, /latitude|longitude|coordinates|service_role/gi);
});

test("migration seeds the active trip and five entries idempotently", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /fab-five-2026-08-08/g);
  assert.ok((sql.match(/on conflict[^;]+do nothing/gi) || []).length >= 2);
  assert.equal((sql.match(/Reached Manasquan Inlet/g) || []).length, 1);
  assert.equal((sql.match(/insert into public\.trip_log_entries/gi) || []).length, 1);
  assert.match(sql, /Barnegat Ridge South/);
  assert.match(sql, /Late afternoon, exact time TBD/);
});

test("photo migration creates constrained public metadata and storage", async () => {
  const sql = await readFile(photoMigrationUrl, "utf8");

  assert.match(sql, /create table if not exists public\.trip_photos/i);
  for (const column of ["trip_id", "storage_path", "caption", "width", "height", "created_at"]) {
    assert.match(sql, new RegExp(`\\b${column}\\b`, "i"));
  }
  assert.match(sql, /char_length\(caption\) between 1 and 240/i);
  assert.match(sql, /storage_path like 'fab-five-2026-08-08\/%'/i);
  assert.match(sql, /insert into storage\.buckets/i);
  assert.match(sql, /'trip-photos'/);
  assert.match(sql, /5242880/);
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]) {
    assert.match(sql, new RegExp(type));
  }
  assert.match(sql, /grant select, insert, delete on public\.trip_photos to anon/i);
  assert.match(sql, /bucket_id = 'trip-photos'/i);
  assert.match(sql, /storage\.foldername\(name\).*fab-five-2026-08-08/is);
  assert.match(sql, /alter publication supabase_realtime add table public\.trip_photos/i);
  assert.doesNotMatch(sql, /service[_-]?role/i);
});

test("photo gallery is append-only for anonymous visitors", async () => {
  const sql = await readFile(photoAppendOnlyMigrationUrl, "utf8");

  assert.match(sql, /revoke delete on public\.trip_photos from anon/i);
  assert.match(sql, /drop policy if exists "Public trip photos are deletable" on public\.trip_photos/i);
  assert.match(sql, /drop policy if exists "Public active trip photos are deletable" on storage\.objects/i);
  assert.doesNotMatch(sql, /create policy[^;]+for delete/is);
});

test("tracker destination migration allows every selectable waypoint", async () => {
  const sql = await readFile(destinationMigrationUrl, "utf8");

  assert.match(sql, /drop constraint if exists trip_state_active_destination_check/i);
  for (const destination of [
    "Manasquan Inlet",
    "Barnegat Ridge South",
    "Barnegat Ridge North",
    "Seaside Lumps",
    "Monster Ledge",
    "Home",
  ]) {
    assert.match(sql, new RegExp(destination));
  }
});

test("trip update migration supports the shared 500-character save boundary", async () => {
  const sql = await readFile(tripUpdateLengthMigrationUrl, "utf8");

  assert.match(sql, /alter table public\.trip_state/i);
  assert.match(sql, /drop constraint if exists trip_state_return_note_check/i);
  assert.match(sql, /char_length\(return_note\) between 1 and 500/i);
});
