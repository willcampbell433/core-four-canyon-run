import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("active board exposes public shared state controls and sync states", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);

  for (const id of [
    "tripStatusControl",
    "destinationControl",
    "tripUpdateInput",
    "currentTripStatus",
    "currentTripDestination",
    "currentTripNote",
    "syncState",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const label of ["Synced", "Pending", "Offline", "Local only"]) {
    assert.match(`${html}\n${app}`, new RegExp(label, "i"));
  }
  assert.match(html, />Save to trip log</);
  assert.match(app, /saveTripUpdate/);
});

test("one trip update form saves the same update to live state and the board log", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);

  assert.match(html, /<form[^>]+id="tripUpdateForm"/);
  assert.doesNotMatch(html, /id="tripStateForm"|id="logForm"/);
  assert.doesNotMatch(html, /id="saveTripStateButton"|id="returnNoteControl"/);
  assert.equal((html.match(/type="submit"/g) || []).length, 1);

  const logSection = html.indexOf('<section class="tools-grid section-shell" id="log">');
  const tripUpdateForm = html.indexOf('id="tripUpdateForm"');
  const boardLog = html.indexOf('<div class="timeline-panel">');
  assert.ok(logSection >= 0, "trip log section should exist");
  assert.ok(tripUpdateForm > logSection, "trip update form should be inside the trip log section");
  assert.ok(tripUpdateForm < boardLog, "trip update form should sit beside the board log timeline");
  assert.match(app, /tripUpdateForm\.addEventListener\("submit"/);
  assert.equal((app.match(/addEventListener\("submit"/g) || []).length, 1);
  assert.match(app, /const updateText = els\.tripUpdateInput\.value\.trim\(\)/);
  assert.match(app, /return_note: updateText/);
  assert.match(app, /moment: updateText/);
  assert.match(app, /await sharedStore\.saveTripUpdate\(\{[\s\S]*state:[\s\S]*entry/);
});

test("the active update flow uses one Trip Log name and reports the latest entry time", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);

  assert.doesNotMatch(`${html}\n${app}`, /Board Log|Board log|board-log/);
  assert.match(html, /<h2>Trip log<\/h2>/);
  assert.match(html, /adds a timestamped entry to the Trip Log/);
  assert.match(app, /els\.lastUpdate\.textContent = entries\.length\s*\? entryTime\(entries\.at\(-1\)\)\s*:\s*"Stand by"/);
  assert.doesNotMatch(app, /touchLastUpdate/);
});

test("obsolete UI hooks and styles from removed feature paths stay deleted", async () => {
  const [html, app, styles] = await Promise.all([
    read("index.html"),
    read("app.js"),
    read("styles.css"),
  ]);

  assert.doesNotMatch(app, /offshoreSpots|galleryGrid/);
  assert.doesNotMatch(html, /id="(?:runTime|galleryGrid)"/);
  assert.doesNotMatch(styles, /phase-buttons|phase-display|tracker-card|eta-readout/);
  assert.doesNotMatch(styles, /\.log-form \+ \.secondary-action\.full/);
});

test("custom regions and grouped readouts expose their accessibility roles", async () => {
  const html = await read("index.html");

  for (const label of [
    "Live GPS readouts",
    "Fishing grounds",
    "Canyon intel",
    "Current shared trip status",
    "Fish Box Standings",
  ]) {
    assert.match(html, new RegExp(`role="(?:region|group)" aria-label="${label}"`));
  }
  assert.match(html, /<section class="mission-panel" aria-label="Mission countdown">/);
  assert.match(html, /<section class="seafloor-panel" aria-label="Seafloor profile">/);
  assert.match(html, /<section id="leafletMap" aria-label="Trip route map"><\/section>/);
  assert.match(html, /<aside class="boat-facts" aria-label="Boat details">/);
  assert.match(html, /<aside class="map-notes" aria-label="Route notes">/);
});

test("catch details appear only for fish entries", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);

  assert.match(html, /id="catchDetails"[^>]*hidden/);
  assert.match(html, /id="typeInput"[\s\S]*<option>Tuna<\/option>[\s\S]*<option>Mahi mahi<\/option>/);
  assert.match(app, /function isCatchType\(type\)/);
  assert.match(app, /catchDetails\.hidden = !show/);
  assert.match(app, /typeInput\.addEventListener\("change", updateCatchDetailsVisibility\)/);
});

test("active log supports public edit and confirmed delete", async () => {
  const app = await read("app.js");

  assert.match(app, /data-entry-edit/);
  assert.match(app, /data-entry-delete/);
  assert.match(app, /confirm\(/);
  assert.match(app, /updateEntry/);
  assert.match(app, /deleteEntry/);
});

test("shared log relies on automatic persistence without legacy manual actions", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);

  assert.doesNotMatch(html, /Publish my local entries|Copy board log/);
  assert.doesNotMatch(html, /id="(?:publishLocalButton|copyLogButton)"/);
  assert.doesNotMatch(app, /publishLocalButton|copyLogButton|copyBoardLog|formatBoardLogExport/);
  assert.match(app, /await sharedStore\.saveTripUpdate\(/);
  assert.match(app, /window\.addEventListener\("online", \(\) => sharedStore\.replayQueue\(\)\)/);
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

test("trip gallery exposes one accessible shared photo upload pathway", async () => {
  const [html, archiveHtml] = await Promise.all([
    read("index.html"),
    read("archive/2026-07-03-canyon-run/index.html"),
  ]);

  assert.match(html, /<label[^>]+for="photoPicker"[^>]*>[\s\S]*Add photos[\s\S]*<\/label>/i);
  assert.match(html, /<input[^>]+id="photoPicker"[^>]+type="file"[^>]+accept="image\/\*"[^>]+multiple/);
  assert.match(html, /id="photoUploadPanel"[^>]*hidden/);
  assert.match(html, /id="photoCaptionInput"[^>]+maxlength="240"/);
  assert.match(html, /id="uploadPhotosButton"[^>]+type="button"/);
  assert.match(html, /id="photoUploadStatus"[^>]+role="status"/);
  assert.match(html, /id="sharedPhotoList"/);
  assert.match(html, /data-static-photo/);
  assert.doesNotMatch(archiveHtml, /photoPicker|photoUploadPanel|sharedPhotoList/);
});

test("shared photo flow uses Supabase Storage, realtime metadata, and confirmed delete", async () => {
  const app = await read("app.js");

  assert.match(app, /import\("\.\/photo-utils\.js"\)/);
  assert.match(app, /storage\.from\("trip-photos"\)\.upload/);
  assert.match(app, /from\("trip_photos"\)\.insert/);
  assert.match(app, /from\("trip_photos"\)\.delete/);
  assert.match(app, /storage\.from\("trip-photos"\)\.remove/);
  assert.match(app, /table: "trip_photos"/);
  assert.match(app, /confirm\("Delete this shared trip photo\?"\)/);
  assert.match(app, /navigator\.onLine/);
  assert.doesNotMatch(app, /localStorage[^\n]+photo|photo[^\n]+localStorage/i);
});

test("shared photo captions render through textContent and uploads report partial failure", async () => {
  const app = await read("app.js");

  assert.match(app, /caption[^\n]+textContent/);
  assert.doesNotMatch(app, /innerHTML[^\n]+caption|caption[^\n]+innerHTML/);
  assert.match(app, /uploadedCount/);
  assert.match(app, /failedMessages/);
  assert.match(app, /removeUploadedObject/);
});
