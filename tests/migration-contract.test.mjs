import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL(
  "../supabase/migrations/20260808111500_shared_trip_board.sql",
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
