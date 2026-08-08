import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function loadLocationTracker(app, { hasGeolocation = true } = {}) {
  const start = app.indexOf("function setLocationState");
  const end = app.indexOf("/* ---------- Live weather (Open-Meteo) ---------- */");
  assert.ok(start >= 0 && end > start, "location tracker logic should be extractable");

  let click;
  let success;
  let failure;
  let clearedWatchId = null;
  const trailPoints = [];
  const els = {
    locateButton: {
      textContent: "Start live location",
      addEventListener: (event, handler) => {
        assert.equal(event, "click");
        click = handler;
      },
    },
    locationState: { textContent: "GPS OFF", dataset: { state: "off" } },
    locationStatus: { textContent: "" },
    positionReadout: { textContent: "" },
    speedCourseReadout: { textContent: "" },
    etaReadout: { textContent: "" },
  };
  const layer = () => ({
    addTo() {
      return this;
    },
    bindPopup() {
      return this;
    },
    remove() {},
  });
  const context = {
    els,
    L: {
      circle: layer,
      circleMarker: layer,
      polyline: () => ({
        addTo() {
          return this;
        },
        setLatLngs(points) {
          trailPoints.splice(0, trailPoints.length, ...points);
        },
      }),
    },
    navigator: hasGeolocation
      ? {
          geolocation: {
            watchPosition(onSuccess, onFailure) {
              success = onSuccess;
              failure = onFailure;
              return 7;
            },
            clearWatch(id) {
              clearedWatchId = id;
            },
          },
        }
      : {},
    points: { seasideLumps: { lat: 39.9169, lon: -73.9008 } },
    compass: () => "NE",
    nmBetween: () => 10,
    updateEta: (remainingNm, speed) => {
      els.etaReadout.textContent = `${remainingNm.toFixed(1)} nm | ${speed.toFixed(1)} m/s`;
    },
  };
  runInNewContext(
    `${app.slice(start, end)}\nglobalThis.startLocationTracker = initLocationPin;`,
    context,
  );
  context.startLocationTracker({ fitBounds() {}, panTo() {} }, [[39.9, -74.1]]);

  return {
    els,
    click: () => click(),
    succeed: (position) => success(position),
    fail: (error) => failure(error),
    trailPoints,
    getClearedWatchId: () => clearedWatchId,
  };
}

function renderTripClockAt(app, nowIso) {
  const constantsEnd = app.indexOf("const storageKey");
  const timerStart = app.indexOf("function renderTimer");
  const timerEnd = app.indexOf("/* ---------- Trip log ---------- */");
  assert.ok(constantsEnd > 0 && timerStart > constantsEnd && timerEnd > timerStart);

  const els = {
    missionStatus: { textContent: "" },
    days: { textContent: "" },
    hours: { textContent: "" },
    minutes: { textContent: "" },
  };
  const RealDate = Date;
  function FixedDate(value) {
    return new RealDate(value === undefined ? nowIso : value);
  }

  runInNewContext(
    `${app.slice(0, constantsEnd)}\n${app.slice(timerStart, timerEnd)}\nrenderTimer();`,
    { els, Date: FixedDate },
  );
  return els;
}

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

test("underway trip clock counts elapsed time since departure", async () => {
  const clock = renderTripClockAt(await read("app.js"), "2026-08-08T06:14:00-04:00");

  assert.equal(clock.missionStatus.textContent, "Time underway");
  assert.equal(clock.days.textContent, "00");
  assert.equal(clock.hours.textContent, "00");
  assert.equal(clock.minutes.textContent, "59");
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

test("hosted 6:00 AM underway update appears for returning visitors", async () => {
  const app = await read("app.js");
  const setup = app.slice(0, app.indexOf("function formatBoardLogExport"));
  const context = {
    document: { querySelector: () => ({}) },
    localStorage: {
      getItem: () => "[]",
      setItem: () => {},
    },
  };

  runInNewContext(`${setup}\nglobalThis.readTripEntries = readEntries;`, context);
  const entries = context.readTripEntries();

  assert.equal(
    entries.some(
      (entry) =>
        entry.time === "Aug 8, 6:00 AM" &&
        entry.type === "Boat life" &&
        entry.method === "Running" &&
        entry.moment === "Reached Manasquan Inlet and started heading toward Barnegat Ridge South.",
    ),
    true,
  );
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

test("live GPS has a dedicated section below the route map", async () => {
  const [html, styles] = await Promise.all([read("index.html"), read("styles.css")]);
  const mapStart = html.indexOf('<section class="map-section section-shell" id="map">');
  const trackerStart = html.indexOf('<section class="tracker-section section-shell" id="tracker"');
  const seafloorStart = html.indexOf('<section class="seafloor-section section-shell"');

  assert.ok(mapStart >= 0 && mapStart < trackerStart && trackerStart < seafloorStart);
  assert.match(html, /href="#tracker">Live GPS<\/a>/);
  assert.match(html, /id="locationState"[^>]*>GPS OFF/);
  assert.match(html, /id="locationStatus"/);
  assert.match(html, /id="positionReadout"/);
  assert.match(html, /id="speedCourseReadout"/);
  assert.match(html, /id="etaReadout"/);
  assert.match(html, /id="locateButton"/);
  assert.match(styles, /\.tracker-section/);
  assert.match(styles, /\.tracker-readouts/);
});

test("live GPS exposes connecting, live, and paused states", async () => {
  const tracker = loadLocationTracker(await read("app.js"));

  tracker.click();
  assert.equal(tracker.els.locationState.textContent, "CONNECTING");

  tracker.succeed({
    coords: { latitude: 39.75, longitude: -73.9, accuracy: 12, speed: 6.2, heading: 45 },
  });
  assert.equal(tracker.els.locationState.textContent, "LIVE");
  assert.match(tracker.els.positionReadout.textContent, /39\.7500, -73\.9000.*12 m/);
  assert.match(tracker.els.speedCourseReadout.textContent, /12\.1 kt.*NE 45°/);
  assert.equal(tracker.els.etaReadout.textContent, "10.0 nm | 6.2 m/s");
  assert.equal(tracker.trailPoints.length, 1);
  assert.equal(tracker.trailPoints[0][0], 39.75);
  assert.equal(tracker.trailPoints[0][1], -73.9);

  tracker.click();
  assert.equal(tracker.els.locationState.textContent, "PAUSED");
  assert.equal(tracker.getClearedWatchId(), 7);
});

test("live GPS explains permission and browser failures", async () => {
  const denied = loadLocationTracker(await read("app.js"));
  denied.click();
  denied.fail({ code: 1, PERMISSION_DENIED: 1 });
  assert.equal(denied.els.locationState.textContent, "GPS ERROR");
  assert.match(denied.els.locationStatus.textContent, /permission.*blocked/i);
  assert.equal(denied.els.locateButton.textContent, "Start live location");
  assert.equal(denied.getClearedWatchId(), 7);

  const unsupported = loadLocationTracker(await read("app.js"), { hasGeolocation: false });
  unsupported.click();
  assert.equal(unsupported.els.locationState.textContent, "GPS ERROR");
  assert.match(unsupported.els.locationStatus.textContent, /not available/i);
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
