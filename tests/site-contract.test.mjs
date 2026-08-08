import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

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

test("active route exits through Manasquan Inlet before the fishing grounds", async () => {
  const app = await read("app.js");
  const bridge = app.indexOf("points.jordanRoad");
  const inlet = app.indexOf("points.manasquanInlet");
  const south = app.indexOf("points.ridgeSouth");

  assert.ok(bridge >= 0 && bridge < inlet && inlet < south);
  assert.match(app, /label: "Manasquan Inlet"/);
  assert.doesNotMatch(app, /label: "Barnegat Inlet"/);
});

test("active conditions use the Manasquan Inlet tide station", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);
  assert.match(`${html}\n${app}`, /Manasquan Inlet tides/);
  assert.match(`${html}\n${app}`, /8532591/);
  assert.match(html, /H 3:43 AM, L 9:49 AM, H 4:15 PM, L 11:01 PM/);
  assert.doesNotMatch(`${html}\n${app}`, /Barnegat Inlet tides/);
  assert.doesNotMatch(`${html}\n${app}`, /8533615/);
});

test("stored trip logs migrate away from the old Barnegat detour", async () => {
  const app = await read("app.js");
  const setup = app.slice(0, app.indexOf("function formatBoardLogExport"));
  const oldMoment = "Target the Jordan Road bridge opening, then run south through the bay toward Barnegat Inlet.";
  const savedEntries = [
    { time: "Aug 8, 5:30 AM", type: "Plan", method: "Running", moment: oldMoment },
    { time: "Aug 8, 6:00 AM", type: "Boat life", method: "Running", moment: "User-added entry" },
  ];
  const writes = [];
  const context = {
    document: { querySelector: () => ({}) },
    localStorage: {
      getItem: () => JSON.stringify(savedEntries),
      setItem: (_key, value) => writes.push(JSON.parse(value)),
    },
  };

  runInNewContext(`${setup}\nglobalThis.readTripEntries = readEntries;`, context);
  const migrated = context.readTripEntries();

  assert.equal(migrated.some((entry) => entry.moment === oldMoment), false);
  assert.equal(migrated.some((entry) => entry.moment.includes("Manasquan Inlet")), true);
  assert.equal(migrated.some((entry) => entry.moment === "User-added entry"), true);
  assert.equal(writes.length, 1);
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

test("active live conditions avoid the NDBC text feed CORS failure", async () => {
  const app = await read("app.js");
  assert.doesNotMatch(app, /www\.ndbc\.noaa\.gov\/data\/realtime2\/44091\.txt/);
  assert.match(app, /api\.weather\.gov\/stations\/44091\/observations\/latest/);
});

test("archived July board also avoids its legacy NDBC CORS failure", async () => {
  const app = await read("archive/2026-07-03-canyon-run/app.js");
  assert.doesNotMatch(app, /www\.ndbc\.noaa\.gov\/data\/realtime2\/44066\.txt/);
});
