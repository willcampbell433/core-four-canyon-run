import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("active board exposes public shared state controls and sync states", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);

  for (const id of ["tripStatusControl", "destinationControl", "returnNoteControl", "syncState"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const label of ["Synced", "Pending", "Offline", "Local only"]) {
    assert.match(`${html}\n${app}`, new RegExp(label, "i"));
  }
  assert.match(html, />Add to shared log</);
  assert.match(app, /updateTripState/);
});

test("live trip state editor sits beside the board log and uses a generic note", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);

  assert.match(html, /<form[^>]+id="tripStateForm"/);
  assert.match(html, /id="saveTripStateButton"[^>]*>Save trip update</);
  assert.match(html, /<label class="return-note-control">\s*Note\s*<input id="returnNoteControl"/);
  assert.doesNotMatch(html, /Return note/i);

  const logSection = html.indexOf('<section class="tools-grid section-shell" id="log">');
  const tripStateForm = html.indexOf('id="tripStateForm"');
  const boardLog = html.indexOf('<div class="timeline-panel">');
  assert.ok(logSection >= 0, "trip log section should exist");
  assert.ok(tripStateForm > logSection, "trip state editor should be inside the trip log section");
  assert.ok(tripStateForm < boardLog, "trip state editor should sit beside the board log timeline");
  assert.match(app, /tripStateForm\.addEventListener\("submit"/);
  assert.doesNotMatch(app, /element\.addEventListener\("change"/);
});

test("active log supports public edit and confirmed delete", async () => {
  const app = await read("app.js");

  assert.match(app, /data-entry-edit/);
  assert.match(app, /data-entry-delete/);
  assert.match(app, /confirm\(/);
  assert.match(app, /updateEntry/);
  assert.match(app, /deleteEntry/);
});

test("Supabase bootstrap maps tables without GPS fields", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);

  assert.match(html, /shared-config\.js/);
  assert.match(app, /@supabase\/supabase-js/);
  assert.match(app, /trip_log_entries/);
  assert.match(app, /trip_state/);
  const sharedBootstrap = app.slice(app.indexOf("async function createSharedClient"));
  assert.doesNotMatch(sharedBootstrap, /latitude|longitude|coordinates/);
});

test("July archive remains isolated from shared storage", async () => {
  const [html, app] = await Promise.all([
    read("archive/2026-07-03-canyon-run/index.html"),
    read("archive/2026-07-03-canyon-run/app.js"),
  ]);

  assert.doesNotMatch(html, /shared-config|shared-store|supabase/i);
  assert.doesNotMatch(app, /shared-config|shared-store|supabase/i);
  assert.match(app, /core-four-canyon-run-log-v2/);
});
