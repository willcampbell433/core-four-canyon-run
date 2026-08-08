import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("active board contains the Fab Five mission contract", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);
  for (const value of [
    "The Fab Five",
    "Aug 8, 2026",
    "Manorside",
    "Jordan Road",
    "Barnegat Ridge South",
    "Barnegat Ridge North",
    "Seaside Lumps",
  ]) {
    assert.match(`${html}\n${app}`, new RegExp(value));
  }
  assert.match(app, /2026-08-08T05:15:00-04:00/);
  assert.match(app, /fab-five-aug-8-2026-log-v1/);
});

test("active route lists the confirmed grounds in order", async () => {
  const app = await read("app.js");
  const south = app.indexOf("points.ridgeSouth");
  const north = app.indexOf("points.ridgeNorth");
  const lumps = app.indexOf("points.seasideLumps");
  assert.ok(south >= 0 && south < north && north < lumps);
});

test("July board remains a separate working archive", async () => {
  const [active, archivedHtml, archivedApp] = await Promise.all([
    read("index.html"),
    read("archive/2026-07-03-canyon-run/index.html"),
    read("archive/2026-07-03-canyon-run/app.js"),
  ]);
  assert.match(active, /archive\/2026-07-03-canyon-run\//);
  assert.match(archivedHtml, /Core Four Canyon Run/);
  assert.match(archivedApp, /core-four-canyon-run-log-v2/);
  assert.doesNotMatch(archivedApp, /fab-five-aug-8-2026-log-v1/);
});

test("required DOM IDs are unique", async () => {
  const html = await read("index.html");
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});
