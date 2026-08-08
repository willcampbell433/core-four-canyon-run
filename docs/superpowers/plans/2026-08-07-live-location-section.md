# Live Location Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the existing browser GPS tracker into a dedicated full-width section directly below the route map while preserving its Leaflet marker, trail, and ETA behavior.

**Architecture:** Keep the static HTML/CSS/JavaScript architecture and the browser Geolocation API. Move tracker markup into a standalone section, add small state/readout elements, and centralize UI state changes in `setLocationState()` while leaving map ownership inside `initLocationPin()`.

**Tech Stack:** Static HTML5, CSS, browser JavaScript, Leaflet 1.9.4, Node.js built-in test runner

## Global Constraints

- Keep the existing section order; place Live Tracker after the route map and before seafloor reference.
- Use the current viewer's browser Geolocation API only; do not add shared tracking, persistence, authentication, or a backend.
- Preserve the current route, Seaside Lumps destination, weather feeds, trip data, map marker, accuracy circle, and trail.
- Tracker states are exactly `GPS OFF`, `CONNECTING`, `LIVE`, `PAUSED`, and `GPS ERROR`.
- State changes must include text and must not depend on color alone.
- The boat's chartplotter remains the authoritative navigation source.
- Do not add dependencies.

---

### Task 1: Dedicated Tracker Markup and Responsive Presentation

**Files:**
- Modify: `tests/site-contract.test.mjs`
- Modify: `index.html`
- Modify: `styles.css`

**Interfaces:**
- Consumes: Existing IDs `locationStatus`, `etaReadout`, and `locateButton` used by `app.js`.
- Produces: New section anchor `#tracker`, state element `#locationState`, speed/course element `#speedCourseReadout`, and tracker layout classes consumed by CSS and Task 2.

- [ ] **Step 1: Write the failing structure contract**

Add this test to `tests/site-contract.test.mjs`:

```js
test("live GPS has a dedicated section below the route map", async () => {
  const [html, styles] = await Promise.all([read("index.html"), read("styles.css")]);
  const mapStart = html.indexOf('<section class="map-section section-shell" id="map">');
  const trackerStart = html.indexOf('<section class="tracker-section section-shell" id="tracker">');
  const seafloorStart = html.indexOf('<section class="seafloor-section section-shell"');

  assert.ok(mapStart >= 0 && mapStart < trackerStart && trackerStart < seafloorStart);
  assert.match(html, /href="#tracker">Live GPS<\/a>/);
  assert.match(html, /id="locationState"[^>]*>GPS OFF/);
  assert.match(html, /id="locationStatus"/);
  assert.match(html, /id="speedCourseReadout"/);
  assert.match(html, /id="etaReadout"/);
  assert.match(html, /id="locateButton"/);
  assert.match(styles, /\.tracker-section/);
  assert.match(styles, /\.tracker-readouts/);
});
```

- [ ] **Step 2: Run the contract and verify it fails**

Run: `npm test -- --test-name-pattern="live GPS has a dedicated section"`

Expected: FAIL because `#tracker`, `#locationState`, and `#speedCourseReadout` do not exist.

- [ ] **Step 3: Move the tracker into its dedicated section**

In `index.html`:

1. Add `<a href="#tracker">Live GPS</a>` immediately after the Map navigation item.
2. Remove the existing `Boat pin / Live location` card from `.map-notes`.
3. Close the map section after `.map-layout`.
4. Add this section before seafloor content:

```html
<section class="tracker-section section-shell" id="tracker" aria-labelledby="trackerHeading">
  <div class="tracker-shell">
    <div class="tracker-intro">
      <div class="section-heading">
        <span>Live GPS</span>
        <h2 id="trackerHeading">Follow <em>Ofishal Business</em></h2>
      </div>
      <p>Use this device's GPS to plot the boat on the route chart above while the run is underway.</p>
      <p class="tracker-disclaimer">For trip awareness only. Navigate with the boat's chartplotter and the captain's call.</p>
    </div>
    <div class="tracker-control">
      <span class="location-state" id="locationState" data-state="off">GPS OFF</span>
      <p id="locationStatus" aria-live="polite">Start live tracking to follow the boat on the chart.</p>
      <button class="map-button" id="locateButton" type="button">Start live location</button>
    </div>
    <div class="tracker-readouts" aria-label="Live GPS readouts">
      <article>
        <small>Position + accuracy</small>
        <strong id="positionReadout">Waiting for a GPS fix</strong>
      </article>
      <article>
        <small>Speed + course</small>
        <strong id="speedCourseReadout">Available once underway</strong>
      </article>
      <article>
        <small>Distance + ETA</small>
        <strong id="etaReadout">Available once tracking starts</strong>
      </article>
    </div>
  </div>
</section>
```

Add `id="positionReadout"` because Task 2 will keep coordinates out of the prose status region.

5. Wrap the existing `.seafloor-panel` in `<section class="seafloor-section section-shell" id="grounds">` so the top-level order is valid and unchanged visually.

- [ ] **Step 4: Add responsive tracker styling**

In `styles.css`, add focused rules for:

```css
.tracker-section {
  padding: 18px 0 24px;
}

.tracker-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 18px;
  padding: 24px;
  border: 1px solid rgba(109, 244, 212, 0.34);
  border-radius: var(--radius);
  background: linear-gradient(135deg, rgba(109, 244, 212, 0.12), transparent 48%), var(--surface);
  box-shadow: var(--shadow);
}

.tracker-readouts {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
```

Complete the component with existing typography, borders, muted copy, focus, and state colors. Add a reduced-motion-safe live pulse using `@media (prefers-reduced-motion: no-preference)`. In existing mobile media queries, stack `.tracker-shell` and `.tracker-readouts` to one column and keep the button full width.

- [ ] **Step 5: Run tests and verify the structure passes**

Run: `npm test && node --check app.js`

Expected: all tests PASS and JavaScript syntax is valid.

- [ ] **Step 6: Commit the standalone interface**

```bash
git add index.html styles.css tests/site-contract.test.mjs
git commit -m "feat: add dedicated live GPS section"
```

---

### Task 2: Explicit GPS State and Readout Behavior

**Files:**
- Modify: `tests/site-contract.test.mjs`
- Modify: `app.js`

**Interfaces:**
- Consumes: `#locationState`, `#locationStatus`, `#positionReadout`, `#speedCourseReadout`, `#etaReadout`, and `#locateButton` from Task 1.
- Produces: `setLocationState(state: string, message: string): void`; the existing `initLocationPin(map, routeLatLngs): void` updates all tracker elements and the Leaflet map.

- [ ] **Step 1: Write the failing GPS behavior test**

Add a VM-based unit test that extracts the source from `function setLocationState` through the end of `initLocationPin`, supplies Leaflet, map, button, and geolocation fakes, then verifies this sequence:

```js
await click();
assert.equal(els.locationState.textContent, "CONNECTING");

success({
  coords: { latitude: 39.75, longitude: -73.9, accuracy: 12, speed: 6.2, heading: 45 },
});
assert.equal(els.locationState.textContent, "LIVE");
assert.match(els.positionReadout.textContent, /39\.7500, -73\.9000.*12 m/);
assert.match(els.speedCourseReadout.textContent, /12\.1 kt.*NE 45°/);

await click();
assert.equal(els.locationState.textContent, "PAUSED");
assert.equal(clearedWatchId, 7);
```

In the same test, invoke the captured error callback with `{ code: 1, PERMISSION_DENIED: 1 }` and assert `GPS ERROR` plus permission guidance. The fakes must also assert that successful fixes update the Leaflet trail and call the ETA function.

- [ ] **Step 2: Run the behavior test and verify it fails**

Run: `npm test -- --test-name-pattern="live GPS exposes connecting, live, paused, and error states"`

Expected: FAIL because `setLocationState`, `positionReadout`, and `speedCourseReadout` behavior do not exist.

- [ ] **Step 3: Add tracker DOM references and state helper**

Extend `els` in `app.js`:

```js
locationState: document.querySelector("#locationState"),
positionReadout: document.querySelector("#positionReadout"),
speedCourseReadout: document.querySelector("#speedCourseReadout"),
```

Add:

```js
function setLocationState(state, message) {
  if (els.locationState) {
    els.locationState.textContent = state;
    els.locationState.dataset.state = state.toLowerCase().replace("gps ", "");
  }
  if (els.locationStatus) els.locationStatus.textContent = message;
}
```

- [ ] **Step 4: Route every GPS transition through the helper**

Update `initMap()` and `initLocationPin()` so:

- Missing Leaflet uses `GPS ERROR` and explains that the chart is unavailable.
- Start uses `CONNECTING` and `Waiting on GPS permission and a position fix…`.
- Successful fixes use `LIVE`, write coordinates/accuracy to `positionReadout`, and write speed/course to `speedCourseReadout`.
- Missing speed or heading uses readable waiting copy for only the missing values.
- Stop uses `PAUSED`, keeps the trail, and restores the start button label.
- Unsupported geolocation and permission/position errors use `GPS ERROR` with specific messages.
- A later successful fix recovers the state from `GPS ERROR` back to `LIVE`.

Keep `updateEta()` as the owner of `etaReadout`, the Leaflet layer code unchanged, and Seaside Lumps as the ETA destination.

- [ ] **Step 5: Run behavior and full contract tests**

Run: `npm test && node --check app.js && git diff --check`

Expected: all tests PASS, syntax is valid, and no whitespace errors are reported.

- [ ] **Step 6: Commit the GPS state model**

```bash
git add app.js tests/site-contract.test.mjs
git commit -m "feat: surface live GPS status and readouts"
```

---

### Task 3: Rendered Desktop and Mobile Verification

**Files:**
- Modify only if verification finds a defect: `index.html`, `styles.css`, `app.js`, `tests/site-contract.test.mjs`
- Do not commit screenshots, traces, temporary scripts, or reports.

**Interfaces:**
- Consumes: Completed tracker section and GPS behavior from Tasks 1 and 2.
- Produces: Verified desktop/mobile layout and interaction evidence; no new application API.

- [ ] **Step 1: Start the static site locally**

Run: `python3 -m http.server 4173 --bind 127.0.0.1`

Expected: the active board is available at `http://127.0.0.1:4173/`.

- [ ] **Step 2: Verify the baseline render**

At a desktop viewport and a mobile viewport, verify page identity, meaningful content, no framework overlay, no relevant console warnings/errors, no clipping or horizontal overflow, and a visually distinct tracker below the route map.

- [ ] **Step 3: Exercise the target flow**

Use a browser geolocation override near the planned route, then follow:

`/#tracker -> Start live location -> CONNECTING -> LIVE readouts and map pin/trail -> Stop live location -> PAUSED`

Verify coordinates/accuracy, speed/course when provided, and distance/ETA update. Verify the trail remains after stopping.

- [ ] **Step 4: Exercise the denied-permission state**

Block location permission, click Start live location, and verify `GPS ERROR` with actionable permission copy while the rest of the page remains usable.

- [ ] **Step 5: Fix any rendered defects and rerun the full verification**

For each defect, first add or tighten a failing contract test when practical, then make the smallest correction. Repeat desktop/mobile and interaction checks after reloading.

- [ ] **Step 6: Run final repository verification**

Run: `npm test && node --check app.js && node --check archive/2026-07-03-canyon-run/app.js && git diff --check && git status --short`

Expected: all tests PASS, syntax checks pass, diff check is clean, and the worktree contains only intended committed changes.

- [ ] **Step 7: Commit any QA corrections**

If Task 3 required source changes:

```bash
git add index.html styles.css app.js tests/site-contract.test.mjs
git commit -m "fix: polish live GPS section rendering"
```

If no source changes were needed, do not create an empty commit.
