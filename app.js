const departure = new Date("2026-07-03T12:00:00-04:00");
const roughReturn = new Date("2026-07-04T16:00:00-04:00");
const storageKey = "core-four-canyon-run-log";

const points = {
  brick: { lat: 40.0649, lon: -74.0881, label: "John's dock", note: "Departed 12:00 PM off the Metedeconk. Jordan Road bridge opened at 12:30 PM (opens on the half hour)." },
  inlet: { lat: 39.7614, lon: -74.1031, label: "Barnegat Inlet (Barnegat Light)", note: "Brielle Bridge closed for extreme heat, so we ran south down the bay. Cleared Barnegat Light ~2:00 PM, then pointed southeast." },
  shelf: { lat: 39.6, lon: -73.35, label: "Mid-run", note: "Water warms and deepens fast past the 30-fathom line." },
  canyon: { lat: 38.9917, lon: -72.7, label: "South Toms Canyon", note: "First stop: South Toms 500-fathom tip. ETA ~6:00 PM. Troll the edge, watch the temp break, jig marks on the wall." },
};

const route = [points.brick, points.inlet, points.shelf, points.canyon];

const crew = ["John", "Bill", "Will"];

const onboardConditions = {
  waterTempF: 76.9,
  source: "John's SIMRAD",
  observed: "Jul 3, ~4:45 PM",
};

const offshoreSpots = [
  {
    lat: 39.6826,
    lon: -72.4811,
    label: "Hudson Canyon",
    type: "Canyon",
    note: "Major canyon north of Toms. Long run, serious structure.",
  },
  {
    lat: 38.9,
    lon: -72.5833,
    label: "South Toms 1000 fm tip",
    type: "Deep edge",
    note: "Deeper South Toms reference point. Better low-light bigeye/swordfish neighborhood if life stacks deep.",
  },
  {
    lat: 39.7867,
    lon: -72.985,
    label: "Chicken Canyon",
    type: "Canyon",
    note: "Midshore canyon water called out for North Jersey bluefin.",
  },
  {
    lat: 39.6411,
    lon: -73.0525,
    label: "Triple Wrecks",
    type: "Wreck area",
    note: "Known tuna neighborhood east of Barnegat.",
  },
  {
    lat: 39.8821,
    lon: -72.6457,
    label: "Bacardi Wreck",
    type: "Wreck",
    note: "Durley Chine wreck, roughly 65 nm east of Manasquan.",
  },
];

const seedEntries = [
  {
    time: "Jul 3, 12:00 PM",
    type: "Dockside",
    method: "Running",
    moment: "Push off from Brick. Crew loaded, coolers heavy. Guest deckhand clock starts.",
  },
  {
    time: "Jul 3, 12:30 PM",
    type: "Boat life",
    method: "Running",
    moment: "Crossed the Jordan Road bridge in Brick when it opened on the half hour. Brielle Bridge closed for extreme heat, so we ran south down the bay instead.",
  },
  {
    time: "Jul 3, 2:00 PM",
    type: "Boat life",
    method: "Running",
    moment: "Cleared Barnegat Light and pointed southeast. A little under 4 hours to Toms Canyon, ~6:00 PM ETA.",
  },
  {
    time: "Jul 3, ~3 PM",
    type: "Boat life",
    method: "Running",
    moment: "Starlink dropped past 15 nm out — 'unsupported location.' Roam unlimited stops at 15 nm; enabled Ocean Mode ($2/GB) in the app and were back online in 10. John FaceTimed Heidi. Off to the races.",
  },
  {
    time: "Jul 3, pre-bite",
    type: "Boat life",
    method: "Other",
    moment: "Official catches go on John's Waterpoof app first so the fish are publicly logged. This board is for fun, and Waterpoof activity can help steer moves if nearby boats light up.",
  },
  {
    time: "Jul 3, ~4:45 PM",
    type: "Conditions",
    method: "Other",
    moment: "John's SIMRAD showed 76.9°F ocean water. That onboard reading is better than the modeled SST; NDBC 44066's current feed was unreachable.",
  },
];

const removedSeedMoments = new Set([
  "Check Windy and NOAA before the long part of the run.",
  "Spread out, eyes up, wait for the chaos.",
]);

const tideFallback = [
  { t: "2026-07-03 00:29", type: "H" },
  { t: "2026-07-03 06:59", type: "L" },
  { t: "2026-07-03 13:08", type: "H" },
  { t: "2026-07-03 18:56", type: "L" },
  { t: "2026-07-04 01:07", type: "H" },
  { t: "2026-07-04 07:33", type: "L" },
  { t: "2026-07-04 13:49", type: "H" },
  { t: "2026-07-04 19:34", type: "L" },
];

const els = {
  days: document.querySelector("#daysValue"),
  hours: document.querySelector("#hoursValue"),
  minutes: document.querySelector("#minutesValue"),
  missionStatus: document.querySelector("#missionStatus"),
  lastUpdate: document.querySelector("#lastUpdate"),
  catchCount: document.querySelector("#catchCount"),
  timeline: document.querySelector("#timelineList"),
  form: document.querySelector("#logForm"),
  replacementGrade: document.querySelector("#replacementGrade"),
  tideList: document.querySelector("#tideList"),
  runDistance: document.querySelector("#runDistance"),
  locateButton: document.querySelector("#locateButton"),
  locationStatus: document.querySelector("#locationStatus"),
  etaReadout: document.querySelector("#etaReadout"),
  crewTally: document.querySelector("#crewTally"),
  buoyHead: document.querySelector("#buoyHead"),
  buoyMetrics: document.querySelector("#buoyMetrics"),
  buoyNote: document.querySelector("#buoyNote"),
  day1Head: document.querySelector("#day1Head"),
  day1Metrics: document.querySelector("#day1Metrics"),
  day2Head: document.querySelector("#day2Head"),
  day2Metrics: document.querySelector("#day2Metrics"),
  sunMoonList: document.querySelector("#sunMoonList"),
  photoInput: document.querySelector("#photoInput"),
  galleryGrid: document.querySelector("#galleryGrid"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- Trip clock ---------- */

function renderTimer() {
  const now = new Date();
  let diff = departure - now;

  if (now >= departure && now <= roughReturn) {
    els.missionStatus.textContent = "Trip underway";
    diff = roughReturn - now;
  } else if (now > roughReturn) {
    els.missionStatus.textContent = "Recap mode";
    diff = 0;
  } else {
    els.missionStatus.textContent = "Pre-departure";
  }

  const totalMinutes = Math.max(0, Math.floor(diff / 60000));
  els.days.textContent = String(Math.floor(totalMinutes / 1440)).padStart(2, "0");
  els.hours.textContent = String(Math.floor((totalMinutes % 1440) / 60)).padStart(2, "0");
  els.minutes.textContent = String(totalMinutes % 60).padStart(2, "0");
}

/* ---------- Trip log ---------- */

function readEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    if (!Array.isArray(parsed)) return seedEntries;
    let cleaned = parsed.filter((entry) => !removedSeedMoments.has(entry.moment));
    seedEntries.forEach((seed) => {
      if (!cleaned.some((entry) => entry.moment === seed.moment)) {
        cleaned = [...cleaned, seed];
      }
    });
    if (cleaned.length !== parsed.length) writeEntries(cleaned);
    return cleaned;
  } catch {
    return seedEntries;
  }
}

function writeEntries(entries) {
  localStorage.setItem(storageKey, JSON.stringify(entries));
}

function touchLastUpdate() {
  els.lastUpdate.textContent = new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderTimeline() {
  const entries = readEntries();
  els.timeline.innerHTML = entries
    .slice()
    .reverse()
    .map(
      (entry) => `
        <li>
          <time>${escapeHtml(entry.time)}</time>
          <div>
            <strong>${escapeHtml(entry.moment)}</strong>
            <span>${escapeHtml(entry.type)} / ${escapeHtml(entry.method)}${entry.angler ? ` / ${escapeHtml(entry.angler)}` : ""}</span>
          </div>
        </li>
      `,
    )
    .join("");

  const catchCount = entries.filter((entry) => /tuna|mahi/i.test(entry.type)).length;
  els.catchCount.textContent = String(catchCount);
  els.replacementGrade.textContent = catchCount > 0 ? "Trending useful" : "Pending sea trial";
  renderTally(entries);
}

function renderTally(entries) {
  if (!els.crewTally) return;
  const counts = Object.fromEntries(crew.map((name) => [name, 0]));
  entries.forEach((entry) => {
    if (/tuna|mahi/i.test(entry.type) && entry.angler && counts[entry.angler] !== undefined) {
      counts[entry.angler] += 1;
    }
  });
  const leader = Math.max(...crew.map((name) => counts[name]));
  els.crewTally.innerHTML = crew
    .map((name) => {
      const isLeader = leader > 0 && counts[name] === leader;
      return `<li${isLeader ? ' class="leader"' : ""}><span>${name}</span><strong>${counts[name]}</strong>${isLeader ? "<em>leader</em>" : ""}</li>`;
    })
    .join("");
}

/* ---------- Leaflet map ---------- */

function nmBetween(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 3440.065;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function updateEta(remainingNm, speedMs) {
  if (!els.etaReadout) return;
  if (remainingNm < 1) {
    els.etaReadout.textContent = "At South Toms Canyon - lines in.";
    return;
  }
  const kt = Number.isFinite(speedMs) && speedMs !== null ? speedMs * 1.94384 : null;
  let etaText = "";
  if (kt && kt > 1) {
    const hours = remainingNm / kt;
    const eta = new Date(Date.now() + hours * 3600000);
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    const clock = eta.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    etaText = ` | ${h}h ${String(m).padStart(2, "0")}m out, ETA ${clock}`;
  }
  els.etaReadout.textContent = `${remainingNm.toFixed(1)} nm to South Toms Canyon${etaText}`;
}

function initMap() {
  const map = L.map("leafletMap", { scrollWheelZoom: false });

  const oceanLayer = L.tileLayer(
    "https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Esri Ocean Basemap — GEBCO, NOAA, Garmin",
      maxZoom: 10,
    },
  ).addTo(map);

  let tileErrors = 0;
  oceanLayer.on("tileerror", () => {
    tileErrors += 1;
    if (tileErrors < 3) return;
    oceanLayer.off("tileerror");
    map.removeLayer(oceanLayer);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "CARTO / OpenStreetMap",
      maxZoom: 12,
    }).addTo(map);
  });

  const latLngs = route.map((p) => [p.lat, p.lon]);
  const allLatLngs = [...latLngs, ...offshoreSpots.map((p) => [p.lat, p.lon])];
  L.polyline(latLngs, {
    color: "#ff8d4d",
    weight: 4,
    dashArray: "4 10",
    lineCap: "round",
  }).addTo(map);

  const spotTooltip = {
    "Hudson Canyon": { direction: "right", offset: [10, 0] },
    "South Toms 1000 fm tip": { direction: "right", offset: [10, 0] },
    "Chicken Canyon": { direction: "left", offset: [-10, 0] },
    "Triple Wrecks": { direction: "bottom", offset: [0, 10] },
    "Bacardi Wreck": { direction: "top", offset: [0, -10] },
  };

  // Canyon halo, non-interactive so it never eats clicks meant for the South Toms pin.
  L.circle([points.canyon.lat, points.canyon.lon], {
    radius: 22000,
    color: "#ff8d4d",
    weight: 1.5,
    fillColor: "#ff8d4d",
    fillOpacity: 0.12,
    interactive: false,
  }).addTo(map);

  offshoreSpots.forEach((spot) => {
    const tip = spotTooltip[spot.label] || { direction: "right", offset: [10, 0] };
    L.circleMarker([spot.lat, spot.lon], {
      radius: spot.type === "Canyon" ? 8 : 7,
      color: "#f6fbff",
      weight: 2,
      fillColor: spot.type === "Canyon" ? "#6cbcff" : "#f2c94c",
      fillOpacity: 0.92,
    })
      .addTo(map)
      .bindTooltip(spot.label, { permanent: true, ...tip })
      .bindPopup(`<strong>${spot.label}</strong><br><small>${spot.type}</small><br>${spot.note}`);
  });

  route.forEach((p, i) => {
    const isEnd = i === 0 || i === route.length - 1;
    const isCanyon = i === route.length - 1;
    const marker = L.circleMarker([p.lat, p.lon], {
      radius: isEnd ? 10 : 7,
      color: "#04111d",
      weight: 3,
      fillColor: isCanyon ? "#ff8d4d" : i === 0 ? "#6cbcff" : "#6df4d4",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup(`<strong>${p.label}</strong><br>${p.note}`);
    if (isCanyon) {
      marker.bindTooltip("South Toms Canyon", { permanent: true, direction: "right", offset: [12, 0] });
    }
  });

  map.fitBounds(allLatLngs, { padding: [36, 36] });
  if (map.getSize().x < 520) map.setZoom(map.getZoom() - 2);

  let total = 0;
  for (let i = 1; i < route.length; i += 1) total += nmBetween(route[i - 1], route[i]);
  els.runDistance.textContent = `~${Math.round(total)} nm`;

  initLocationPin(map, allLatLngs);
}

function initLocationPin(map, routeLatLngs) {
  if (!els.locateButton || !els.locationStatus) return;

  let watchId = null;
  let locationMarker;
  let accuracyCircle;
  let firstFix = true;
  const trail = [];
  const trailLine = L.polyline([], {
    color: "#6df4d4",
    weight: 3,
    opacity: 0.7,
    lineCap: "round",
  }).addTo(map);

  function stopTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    els.locateButton.textContent = "Start live location";
  }

  function onPosition(position) {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const latLng = [latitude, longitude];

    if (locationMarker) locationMarker.remove();
    if (accuracyCircle) accuracyCircle.remove();

    accuracyCircle = L.circle(latLng, {
      radius: accuracy,
      color: "#6df4d4",
      weight: 1,
      fillColor: "#6df4d4",
      fillOpacity: 0.08,
    }).addTo(map);

    locationMarker = L.circleMarker(latLng, {
      radius: 9,
      color: "#04111d",
      weight: 3,
      fillColor: "#6df4d4",
      fillOpacity: 1,
    }).addTo(map);

    trail.push(latLng);
    trailLine.setLatLngs(trail);

    if (firstFix) {
      map.fitBounds([...routeLatLngs, latLng], { padding: [36, 36] });
      firstFix = false;
    } else {
      map.panTo(latLng);
    }

    const knots = Number.isFinite(speed) && speed !== null ? ` | ${(speed * 1.94384).toFixed(1)} kt` : "";
    const course = Number.isFinite(heading) && heading !== null ? ` | ${compass(heading)} ${Math.round(heading)}°` : "";
    els.locationStatus.textContent =
      `Live: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (±${Math.round(accuracy)} m)${knots}${course}`;

    updateEta(nmBetween({ lat: latitude, lon: longitude }, points.canyon), speed);
    locationMarker.bindPopup(
      `<strong>Ofishal Business</strong><br>${latitude.toFixed(4)}, ${longitude.toFixed(4)}<br>GPS accuracy: ~${Math.round(accuracy)} m`,
    );
  }

  function onError(error) {
    els.locationStatus.textContent =
      error.code === error.PERMISSION_DENIED
        ? "Location permission was blocked. Enable it in the browser to track."
        : "Lost the GPS fix. Still trying…";
  }

  els.locateButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      els.locationStatus.textContent = "GPS is not available in this browser.";
      return;
    }

    if (watchId !== null) {
      stopTracking();
      els.locationStatus.textContent = "Live tracking paused. Trail kept on the chart.";
      return;
    }

    els.locationStatus.textContent = "Waiting on GPS permission…";
    els.locateButton.textContent = "Stop live location";
    firstFix = true;
    watchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });
  });
}

/* ---------- Live weather (Open-Meteo) ---------- */

function compass(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function dominantDirection(degrees) {
  const counts = {};
  degrees.forEach((deg) => {
    const dir = compass(deg);
    counts[dir] = (counts[dir] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function daySlice(times, values, date) {
  return values.filter((_, i) => times[i].startsWith(date));
}

function ftRange(values) {
  const ft = values.map((m) => m * 3.28084);
  return `${Math.round(Math.min(...ft))}-${Math.round(Math.max(...ft))} ft`;
}

function renderWeatherDay(headEl, listEl, wind, gusts, dirs, waves, periods) {
  const windLine = `${dominantDirection(dirs)} ${Math.round(Math.min(...wind))}-${Math.round(Math.max(...wind))} kt`;
  headEl.textContent = `${windLine}, seas ${ftRange(waves)}`;
  listEl.innerHTML = `
    <li><strong>Wind</strong> ${windLine}</li>
    <li><strong>Gusts</strong> to ${Math.round(Math.max(...gusts))} kt</li>
    <li><strong>Waves</strong> ${ftRange(waves)}</li>
    <li><strong>Period</strong> ~${Math.round(periods.reduce((a, b) => a + b, 0) / periods.length)} sec</li>
  `;
}

const MOON_NAMES = [
  "New moon",
  "Waxing crescent",
  "First quarter",
  "Waxing gibbous",
  "Full moon",
  "Waning gibbous",
  "Last quarter",
  "Waning crescent",
];

function moonPhase(date) {
  const synodic = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const age = (((date.getTime() - knownNewMoon) / 86400000) % synodic + synodic) % synodic;
  const index = Math.round((age / synodic) * 8) % 8;
  const illumination = Math.round((1 - Math.cos((2 * Math.PI * age) / synodic)) * 50);
  return { name: MOON_NAMES[index], illumination };
}

function formatClock(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

async function refreshWeather() {
  const { lat, lon } = points.canyon;
  const dates = ["2026-07-03", "2026-07-04"];
  const windUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&daily=sunrise,sunset` +
    `&wind_speed_unit=kn&timezone=America%2FNew_York&start_date=${dates[0]}&end_date=${dates[1]}`;
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
    `&hourly=wave_height,wave_period&timezone=America%2FNew_York&start_date=${dates[0]}&end_date=${dates[1]}`;

  try {
    const [windRes, marineRes] = await Promise.all([fetch(windUrl), fetch(marineUrl)]);
    if (!windRes.ok || !marineRes.ok) throw new Error("weather fetch failed");
    const windData = await windRes.json();
    const marineData = await marineRes.json();

    const wTimes = windData.hourly.time;
    const mTimes = marineData.hourly.time;

    [
      { head: els.day1Head, list: els.day1Metrics, date: dates[0] },
      { head: els.day2Head, list: els.day2Metrics, date: dates[1] },
    ].forEach(({ head, list, date }) => {
      renderWeatherDay(
        head,
        list,
        daySlice(wTimes, windData.hourly.wind_speed_10m, date),
        daySlice(wTimes, windData.hourly.wind_gusts_10m, date),
        daySlice(wTimes, windData.hourly.wind_direction_10m, date),
        daySlice(mTimes, marineData.hourly.wave_height, date),
        daySlice(mTimes, marineData.hourly.wave_period, date),
      );
    });

    const moon = moonPhase(departure);
    els.sunMoonList.innerHTML = `
      <li><strong>Sunset Jul 3</strong> ${formatClock(windData.daily.sunset[0])}</li>
      <li><strong>Sunrise Jul 4</strong> ${formatClock(windData.daily.sunrise[1])}</li>
      <li><strong>Sunset Jul 4</strong> ${formatClock(windData.daily.sunset[1])}</li>
      <li><strong>Moon</strong> ${moon.name}, ${moon.illumination}% lit</li>
    `;
  } catch {
    const fallback = "Live feed unavailable. Use the NOAA and Windy links below.";
    els.day1Head.textContent = fallback;
    els.day2Head.textContent = fallback;
    const moon = moonPhase(departure);
    els.sunMoonList.innerHTML = `
      <li><strong>Sunset Jul 3</strong> ~8:30 PM</li>
      <li><strong>Sunrise Jul 4</strong> ~5:35 AM</li>
      <li><strong>Moon</strong> ${moon.name}, ${moon.illumination}% lit</li>
    `;
  }
}

/* ---------- Live buoy (NDBC 44066 Texas Tower) ---------- */

async function refreshBuoy() {
  if (!els.buoyHead) return;
  try {
    const res = await fetch("https://www.ndbc.noaa.gov/data/realtime2/44066.txt");
    if (!res.ok) throw new Error("ndbc request failed");
    const text = await res.text();
    const row = text
      .trim()
      .split("\n")
      .find((line) => !line.startsWith("#"));
    if (!row) throw new Error("no buoy data");
    const c = row.trim().split(/\s+/);
    const num = (v) => (v === undefined || v === "MM" ? null : Number(v));
    const wtmp = num(c[14]);
    const wvht = num(c[8]);
    const wspd = num(c[6]);
    const gst = num(c[7]);
    const wdir = num(c[5]);

    if (wtmp === null && wvht === null && wspd === null) throw new Error("buoy fields empty");

    const waterF = wtmp === null ? null : (wtmp * 9) / 5 + 32;
    const waveFt = wvht === null ? null : wvht * 3.28084;
    const windKt = wspd === null ? null : wspd * 1.94384;
    const gustKt = gst === null ? null : gst * 1.94384;
    const obs = `${c[1]}/${c[2]} ${c[3]}:${c[4]} UTC`;

    els.buoyHead.textContent = waterF === null ? "Buoy 44066 reporting" : `${waterF.toFixed(1)}°F water`;
    els.buoyMetrics.innerHTML = `
      <li><strong>Water</strong> ${waterF === null ? "n/a" : `${waterF.toFixed(1)}°F`}</li>
      <li><strong>Waves</strong> ${waveFt === null ? "n/a" : `${waveFt.toFixed(1)} ft`}</li>
      <li><strong>Wind</strong> ${windKt === null ? "n/a" : `${wdir === null ? "" : `${compass(wdir)} `}${Math.round(windKt)} kt`}</li>
      <li><strong>Gusts</strong> ${gustKt === null ? "n/a" : `to ${Math.round(gustKt)} kt`}</li>
    `;
    els.buoyNote.textContent = `Observed at buoy 44066, ${obs}. Water temp is the tuna tell.`;
  } catch {
    buoyFallback();
  }
}

async function buoyFallback() {
  const { lat, lon } = points.canyon;
  try {
    const marineUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
      `&current=sea_surface_temperature,wave_height&timezone=America%2FNew_York`;
    const windUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn&timezone=America%2FNew_York`;
    const [marineRes, windRes] = await Promise.all([fetch(marineUrl), fetch(windUrl)]);
    if (!marineRes.ok || !windRes.ok) throw new Error("fallback fetch failed");
    const marine = (await marineRes.json()).current;
    const wind = (await windRes.json()).current;

    const sstC = marine.sea_surface_temperature;
    const waveM = marine.wave_height;
    const waterF = sstC === null || sstC === undefined ? null : (sstC * 9) / 5 + 32;

    const hasOnboardWater = onboardConditions.waterTempF !== null && onboardConditions.waterTempF !== undefined;
    els.buoyHead.textContent = hasOnboardWater
      ? `${onboardConditions.waterTempF.toFixed(1)}°F water`
      : waterF === null
        ? "Live canyon conditions"
        : `${waterF.toFixed(1)}°F water`;
    els.buoyMetrics.innerHTML = `
      <li><strong>SIMRAD</strong> ${hasOnboardWater ? `${onboardConditions.waterTempF.toFixed(1)}°F` : "n/a"}</li>
      <li><strong>Model SST</strong> ${waterF === null ? "n/a" : `${waterF.toFixed(1)}°F`}</li>
      <li><strong>Waves</strong> ${waveM === null || waveM === undefined ? "n/a" : `${(waveM * 3.28084).toFixed(1)} ft`}</li>
      <li><strong>Wind</strong> ${compass(wind.wind_direction_10m)} ${Math.round(wind.wind_speed_10m)} kt</li>
      <li><strong>Gusts</strong> to ${Math.round(wind.wind_gusts_10m)} kt</li>
    `;
    els.buoyNote.textContent =
      `${onboardConditions.source} reading from ${onboardConditions.observed}. ` +
      "Waves/wind are modeled canyon conditions (Open-Meteo); buoy 44066's current feed was unreachable.";
  } catch {
    els.buoyHead.textContent = "Buoy feed unavailable";
    els.buoyMetrics.innerHTML = "<li>Check NDBC buoy 44066 directly for water temp and seas.</li>";
    els.buoyNote.textContent = "";
  }
}

/* ---------- Tides ---------- */

function formatTime(time) {
  const [hourRaw, minute] = time.split(":");
  const hour = Number(hourRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function renderTides(predictions) {
  const grouped = predictions.reduce((days, prediction) => {
    const [date, time] = prediction.t.split(" ");
    const label = date === "2026-07-03" ? "Jul 3" : "Jul 4";
    days[label] = [...(days[label] || []), `${prediction.type === "H" ? "H" : "L"} ${formatTime(time)}`];
    return days;
  }, {});
  els.tideList.innerHTML = Object.entries(grouped)
    .map(([day, entries]) => `<li><strong>${day}</strong> ${entries.join(", ")}</li>`)
    .join("");
}

async function refreshTides() {
  const url =
    "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=core-four-canyon-run&begin_date=20260703&end_date=20260704&datum=MLLW&station=8532703&time_zone=lst_ldt&units=english&interval=hilo&format=json";
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("NOAA tide request failed");
    const data = await response.json();
    if (Array.isArray(data.predictions)) renderTides(data.predictions);
  } catch {
    renderTides(tideFallback);
  }
}

/* ---------- Photo gallery ---------- */

function initGallery() {
  els.photoInput.addEventListener("change", () => {
    [...els.photoInput.files].forEach((file) => {
      const figure = document.createElement("figure");
      figure.className = "gallery-photo";
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      figure.appendChild(img);
      els.galleryGrid.prepend(figure);
    });
    els.photoInput.value = "";
  });
}

/* ---------- Wire up ---------- */

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(els.form);
  const now = new Date();
  const entry = {
    time: now.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    moment: formData.get("moment"),
    type: formData.get("type"),
    method: formData.get("method"),
    angler: formData.get("angler") || "",
  };
  writeEntries([...readEntries(), entry]);
  els.form.reset();
  touchLastUpdate();
  renderTimeline();
});

renderTimer();
renderTimeline();
initMap();
refreshWeather();
refreshBuoy();
refreshTides();
initGallery();
setInterval(renderTimer, 30000);
