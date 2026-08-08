# Fab Five August 8 Trip Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an August 8, 2026 Fab Five tuna-trip dashboard while keeping the July 3-4 canyon board available as a working archive.

**Architecture:** Keep the existing dependency-light static site. Snapshot the current HTML, JavaScript, and CSS under a dated archive directory, then convert the root files to the new trip. Add zero-dependency Node source-contract tests and browser validation so trip identity, route order, storage isolation, archive navigation, live-data fallbacks, and responsive rendering are covered.

**Tech Stack:** Static HTML5, CSS, browser JavaScript, Leaflet 1.9.4, Open-Meteo, NOAA CO-OPS/NDBC, Node.js built-in test runner, GitHub Pages.

## Global Constraints

- The active trip is The Fab Five on Saturday, August 8, 2026.
- Crew is John, Bill, Pete, Phil, and Will.
- Departure is Manorside at 5:15 AM EDT with the Jordan Road bridge target at 5:30 AM EDT.
- Route order is Manorside, Barnegat Ridge South, Barnegat Ridge North, then Seaside Lumps.
- The July 3-4 canyon trip must remain browsable and functional.
- Active and archived logs must use different local-storage keys.
- Do not invent catches or a guaranteed return time.
- Map, weather, tides, daylight, location, log, tally, and fallback behavior remain available.
- Planning estimates are not navigation instructions; captain and onboard instruments control decisions.
- Keep the existing visual language and avoid framework or runtime dependency additions.

---

### Task 1: Add executable trip-board contracts

**Files:**
- Create: `package.json`
- Create: `tests/site-contract.test.mjs`

**Interfaces:**
- Consumes: `index.html`, `app.js`, and the future archive files as UTF-8 source.
- Produces: `npm test`, a zero-dependency contract suite that fails when active-trip identity, route order, dates, storage isolation, archive navigation, or required DOM IDs regress.

- [ ] **Step 1: Write the failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("active board contains the Fab Five mission contract", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);
  for (const value of ["The Fab Five", "Aug 8, 2026", "Manorside", "Jordan Road", "Barnegat Ridge South", "Barnegat Ridge North", "Seaside Lumps"]) {
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/site-contract.test.mjs`

Expected: FAIL because the active board still describes July and the archive directory does not exist.

- [ ] **Step 3: Add the test command**

```json
{
  "name": "core-four-canyon-run",
  "private": true,
  "scripts": {
    "test": "node --test tests/*.test.mjs"
  }
}
```

- [ ] **Step 4: Re-run and preserve the expected red state**

Run: `npm test`

Expected: the same mission/archive contract failures, proving the command executes the tests.

- [ ] **Step 5: Commit the red tests**

```bash
git add package.json tests/site-contract.test.mjs
git commit -m "test: define Fab Five trip board contracts"
```

### Task 2: Preserve the July canyon board

**Files:**
- Create: `archive/2026-07-03-canyon-run/index.html`
- Create: `archive/2026-07-03-canyon-run/app.js`
- Create: `archive/2026-07-03-canyon-run/styles.css`
- Modify: `archive/2026-07-03-canyon-run/index.html`

**Interfaces:**
- Consumes: the pre-change root files at commit `69aed44` and shared image assets at `assets/`.
- Produces: a self-contained archived page at `/archive/2026-07-03-canyon-run/` with its original `core-four-canyon-run-log-v2` browser storage.

- [ ] **Step 1: Copy the pre-change source into the archive**

Run:

```bash
mkdir -p archive/2026-07-03-canyon-run
cp index.html app.js styles.css archive/2026-07-03-canyon-run/
```

- [ ] **Step 2: Make archive asset paths and current-trip navigation work**

Change each `assets/...` image URL in archived HTML to `../../assets/...`, keep local `styles.css` and `app.js`, and add this header link:

```html
<a href="../../" aria-label="Open the current Fab Five trip">Current trip</a>
```

- [ ] **Step 3: Run the archive contract**

Run: `node --test --test-name-pattern="July board" tests/site-contract.test.mjs`

Expected: FAIL only because the active homepage does not link back to the archive yet; archive files and old storage assertions pass.

- [ ] **Step 4: Commit the archive**

```bash
git add archive/2026-07-03-canyon-run
git commit -m "feat: archive July canyon trip board"
```

### Task 3: Convert the active board to the Fab Five trip

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Test: `tests/site-contract.test.mjs`

**Interfaces:**
- Consumes: the confirmed mission contract and researched waypoint/live-data endpoints.
- Produces: root dashboard sections and the existing DOM IDs consumed by `app.js`; route endpoints `points.ridgeSouth`, `points.ridgeNorth`, and `points.seasideLumps`; unique storage key `fab-five-aug-8-2026-log-v1`.

- [ ] **Step 1: Update active HTML identity and content**

Replace July/Toms Canyon copy with the confirmed Aug 8 mission. Add a visible archive link:

```html
<a href="archive/2026-07-03-canyon-run/">July canyon archive</a>
```

Ensure all five crew cards describe current participants, route cards follow the confirmed ground order, weather labels say Saturday Aug 8, and the checklist includes bridge timing and an official forecast/float-plan check.

- [ ] **Step 2: Update active JavaScript trip state**

Use these exact state boundaries:

```js
const departure = new Date("2026-08-08T05:15:00-04:00");
const roughReturn = new Date("2026-08-08T18:00:00-04:00");
const storageKey = "fab-five-aug-8-2026-log-v1";
const crew = ["John", "Bill", "Pete", "Phil", "Will"];
const route = [points.manorside, points.jordanRoad, points.ridgeSouth, points.ridgeNorth, points.seasideLumps];
```

The return is a board-state ceiling only; UI copy must label it flexible. Seed only departure/route planning milestones. Update weather query dates to `2026-08-08`, tide query dates to `20260808`, daylight labels to Aug 8, and location ETA destination to Seaside Lumps.

- [ ] **Step 3: Fix active markup regressions encountered in scope**

Remove the duplicate `id="locationStatus"` paragraph and keep one instance so browser lookups are deterministic.

- [ ] **Step 4: Run the mission contracts**

Run: `npm test`

Expected: PASS for identity, route order, archive isolation, and unique DOM IDs.

- [ ] **Step 5: Run JavaScript and HTML source checks**

Run:

```bash
node --check app.js
git diff --check
rg -n "2026-07-0[34]|Jul [34]|South Toms|Core Four goes offshore|core-four-canyon-run-log-v2" index.html app.js
```

Expected: syntax and diff checks exit 0; the stale-copy search returns no active-page matches.

- [ ] **Step 6: Commit the active trip conversion**

```bash
git add index.html app.js styles.css tests/site-contract.test.mjs
git commit -m "feat: launch Fab Five August tuna trip"
```

### Task 4: Validate live data and rendered behavior

**Files:**
- Modify if failures require fixes: `index.html`, `app.js`, `styles.css`, `tests/site-contract.test.mjs`
- Do not commit: screenshots and temporary browser scripts.

**Interfaces:**
- Consumes: local server URL and external Open-Meteo/NOAA/Leaflet services.
- Produces: browser evidence for the active trip, archived trip, responsive layout, log interaction, and archive navigation.

- [ ] **Step 1: Verify external data endpoints directly**

Run `curl --fail --silent --show-error` against the exact active Open-Meteo weather, marine, NOAA CO-OPS tide, and selected buoy URLs from `app.js`; parse JSON responses with `node -e` and confirm non-empty Aug 8 arrays.

- [ ] **Step 2: Start a local static server**

Run: `python3 -m http.server 4173 --bind 127.0.0.1`

Expected: local server listens only on `127.0.0.1:4173`.

- [ ] **Step 3: Validate the active desktop flow**

Flow: `/` loads -> Fab Five mission renders -> map and live cards populate -> add a tuna log for Will -> catch tally changes -> July archive link opens.

Check page title/URL, non-blank DOM, no framework overlay, relevant console warnings/errors, screenshot, and visible interaction state.

- [ ] **Step 4: Validate mobile and archive flows**

At a phone-sized viewport, check hero, navigation, mission cards, route map, weather cards, log form, and horizontal overflow. Open `/archive/2026-07-03-canyon-run/`, verify July identity and original log, then follow Current trip back to `/`.

- [ ] **Step 5: Add a failing regression test for any defect found**

For each source-addressable defect, add a minimal `node:test` assertion, run it to observe the expected failure, implement the smallest fix, and rerun `npm test` to green.

- [ ] **Step 6: Commit verified fixes**

```bash
git add index.html app.js styles.css tests/site-contract.test.mjs
git commit -m "fix: harden Fab Five trip board"
```

Skip the commit if browser QA finds no additional source changes.

### Task 5: Publish and verify GitHub Pages

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: fully verified branch and the repository's existing Pages workflow.
- Produces: GitHub `main` containing the active Aug 8 board plus July archive, and deployed URLs for both.

- [ ] **Step 1: Update repository documentation**

Document the active trip and archive paths, local server command, and test command in `README.md`.

- [ ] **Step 2: Run the full final verification**

Run:

```bash
npm test
node --check app.js
git diff --check
git status --short
```

Expected: all tests pass, syntax and diff checks pass, and only intended README changes remain before the final commit.

- [ ] **Step 3: Commit documentation**

```bash
git add README.md
git commit -m "docs: update Fab Five trip board usage"
```

- [ ] **Step 4: Push and merge the requested GitHub update**

Push `feat/fab-five-20260808`, open a PR into `main`, confirm checks, and merge. Do not force-push.

- [ ] **Step 5: Verify deployment**

Confirm the GitHub Pages workflow succeeds, then fetch the deployed root and `/archive/2026-07-03-canyon-run/`. Verify root contains The Fab Five and archive contains Core Four Canyon Run.
