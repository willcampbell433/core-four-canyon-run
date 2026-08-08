const departure = new Date("2026-08-08T05:15:00-04:00");
const tripDayEnd = new Date("2026-08-09T00:00:00-04:00");
const storageKey = "fab-five-aug-8-2026-log-v1";

const points = {
  manorside: {
    lat: 40.0644,
    lon: -74.0875,
    label: "Manorside dock",
    note: "Lines off at 5:15 AM. Five aboard and moving before sunrise.",
  },
  jordanRoad: {
    lat: 40.0613,
    lon: -74.0922,
    label: "Jordan Road bridge",
    note: "Target the 5:30 AM opening. Captain and bridge tender control the actual transit.",
  },
  manasquanInlet: {
    lat: 40.1017,
    lon: -74.035,
    label: "Manasquan Inlet",
    note: "Planned ocean exit. Confirm the bridge, tide, visibility, traffic, and inlet conditions onboard.",
  },
  ridgeSouth: {
    lat: 39.646433,
    lon: -73.783583,
    label: "Barnegat Ridge South",
    note: "First fishing stop. Work the southern notch and nearby drop if bait is present.",
  },
  ridgeNorth: {
    lat: 39.703383,
    lon: -73.7993,
    label: "Barnegat Ridge North",
    note: "Second stop. Broader tabletop with gullies on either side.",
  },
  seasideLumps: {
    lat: 39.9169,
    lon: -73.900767,
    label: "Seaside Lumps",
    note: "Final planned ground. Stay mobile and follow bluefish, squid, birds, whales, and tuna marks.",
  },
};

let trackerDestination = points.ridgeSouth;

const route = [
  points.manorside,
  points.jordanRoad,
  points.manasquanInlet,
  points.ridgeSouth,
  points.ridgeNorth,
  points.seasideLumps,
];

const crew = ["John", "Bill", "Pete", "Phil", "Will"];

const onboardConditions = {
  waterTempF: null,
  source: "John's SIMRAD",
  observed: "waiting on the first onboard reading",
};

const weatherFallback = {
  day1: {
    head: "Ridge South model slow - use NOAA/Windy",
    metrics: [
      ["Ground", "Barnegat Ridge South"],
      ["Plan", "Watch bait, birds, bluefish, whales, and marks"],
      ["Primary", "Use onboard instruments until data returns"],
    ],
  },
  day2: {
    head: "Seaside model slow - use NOAA/Windy",
    metrics: [
      ["Ground", "Seaside Lumps"],
      ["Forecast", "Use NOAA point forecast + NDBC 44091"],
      ["Reminder", "Official catches go to Waterpoof first"],
    ],
  },
};

const seedEntries = [
  {
    time: "Aug 8, 5:15 AM",
    type: "Plan",
    method: "Running",
    moment: "Planned departure from Manorside. John, Bill, Pete, Phil, and Will aboard.",
  },
  {
    time: "Aug 8, 5:30 AM",
    type: "Plan",
    method: "Running",
    moment: "Target the Jordan Road bridge opening, then head for Manasquan Inlet and clear the inlet before turning toward the grounds.",
  },
  {
    time: "Aug 8, fishing plan",
    type: "Plan",
    method: "Other",
    moment: "Work Barnegat Ridge South, slide to Ridge North, then finish at Seaside Lumps. Life and onboard marks beat the itinerary.",
  },
  {
    time: "Aug 8, before lines in",
    type: "Plan",
    method: "Other",
    moment: "Recheck NOAA bluefin status and marine forecast. Official catches go on John's Waterpoof app first; NOAA reporting follows any landed bluefin or dead discard.",
  },
  {
    time: "Aug 8, 6:00 AM",
    type: "Boat life",
    method: "Running",
    moment: "Reached Manasquan Inlet and started heading toward Barnegat Ridge South.",
  },
];

const removedSeedMoments = new Set([
  "Target the Jordan Road bridge opening, then run south through the bay toward Barnegat Inlet.",
]);

const tideFallback = [
  { t: "2026-08-08 03:43", type: "H" },
  { t: "2026-08-08 09:49", type: "L" },
  { t: "2026-08-08 16:15", type: "H" },
  { t: "2026-08-08 23:01", type: "L" },
];

const els = {
  days: document.querySelector("#daysValue"),
  hours: document.querySelector("#hoursValue"),
  minutes: document.querySelector("#minutesValue"),
  missionStatus: document.querySelector("#missionStatus"),
  lastUpdate: document.querySelector("#lastUpdate"),
  catchCount: document.querySelector("#catchCount"),
  timeline: document.querySelector("#timelineList"),
  replacementGrade: document.querySelector("#replacementGrade"),
  tideList: document.querySelector("#tideList"),
  runDistance: document.querySelector("#runDistance"),
  locateButton: document.querySelector("#locateButton"),
  locationState: document.querySelector("#locationState"),
  locationStatus: document.querySelector("#locationStatus"),
  positionReadout: document.querySelector("#positionReadout"),
  speedCourseReadout: document.querySelector("#speedCourseReadout"),
  etaReadout: document.querySelector("#etaReadout"),
  crewTally: document.querySelector("#crewTally"),
  tripUpdateForm: document.querySelector("#tripUpdateForm"),
  tripUpdateInput: document.querySelector("#tripUpdateInput"),
  tripStatusControl: document.querySelector("#tripStatusControl"),
  destinationControl: document.querySelector("#destinationControl"),
  typeInput: document.querySelector("#typeInput"),
  methodInput: document.querySelector("#methodInput"),
  anglerInput: document.querySelector("#anglerInput"),
  catchDetails: document.querySelector("#catchDetails"),
  currentTripStatus: document.querySelector("#currentTripStatus"),
  currentTripDestination: document.querySelector("#currentTripDestination"),
  currentTripNote: document.querySelector("#currentTripNote"),
  saveTripUpdateButton: document.querySelector("#saveTripUpdateButton"),
  syncState: document.querySelector("#syncState"),
  syncError: document.querySelector("#syncError"),
  photoPickerAction: document.querySelector("#photoPickerAction"),
  photoPicker: document.querySelector("#photoPicker"),
  photoUploadPanel: document.querySelector("#photoUploadPanel"),
  photoSelectionSummary: document.querySelector("#photoSelectionSummary"),
  photoCaptionInput: document.querySelector("#photoCaptionInput"),
  uploadPhotosButton: document.querySelector("#uploadPhotosButton"),
  photoUploadStatus: document.querySelector("#photoUploadStatus"),
  sharedPhotoList: document.querySelector("#sharedPhotoList"),
  buoyHead: document.querySelector("#buoyHead"),
  buoyMetrics: document.querySelector("#buoyMetrics"),
  buoyNote: document.querySelector("#buoyNote"),
  day1Head: document.querySelector("#day1Head"),
  day1Metrics: document.querySelector("#day1Metrics"),
  day2Head: document.querySelector("#day2Head"),
  day2Metrics: document.querySelector("#day2Metrics"),
  sunMoonList: document.querySelector("#sunMoonList"),
};

let sharedStore = null;
let sharedEntries = null;

function entryTime(entry) {
  return entry.time_label ?? entry.time ?? "Update";
}

function entryType(entry) {
  return entry.entry_type ?? entry.type ?? "Boat life";
}

function formatTripStatus(status) {
  return {
    "pre-departure": "Pre-departure",
    underway: "Underway",
    fishing: "Fishing",
    "heading-home": "Heading home",
    recap: "Recap",
  }[status] || status;
}

function isCatchType(type) {
  return type === "Tuna" || type === "Mahi mahi";
}

function updateCatchDetailsVisibility() {
  const show = isCatchType(els.typeInput.value);
  els.catchDetails.hidden = !show;
  els.catchDetails.setAttribute("aria-hidden", String(!show));
}

function activeEntries() {
  return sharedEntries || readEntries();
}

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

  if (now >= departure && now < tripDayEnd) {
    els.missionStatus.textContent = "Time underway";
    diff = now - departure;
  } else if (now >= tripDayEnd) {
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

function renderTimeline(entries = activeEntries()) {
  els.timeline.innerHTML = entries
    .slice()
    .reverse()
    .map(
      (entry) => `
        <li${entry._pending ? ' class="pending"' : ""}>
          <time>${escapeHtml(entryTime(entry))}</time>
          <div>
            <strong>${escapeHtml(entry.moment)}</strong>
            <span>${escapeHtml(entryType(entry))} / ${escapeHtml(entry.method)}${entry.angler ? ` / ${escapeHtml(entry.angler)}` : ""}</span>
            ${entry.id ? `<div class="entry-actions"><button type="button" data-entry-edit="${escapeHtml(entry.id)}">Edit</button><button type="button" data-entry-delete="${escapeHtml(entry.id)}">Delete</button></div>` : ""}
          </div>
        </li>
      `,
    )
    .join("");

  const catchCount = entries.filter((entry) => /tuna|mahi/i.test(entryType(entry))).length;
  els.catchCount.textContent = String(catchCount);
  els.lastUpdate.textContent = entries.length ? entryTime(entries.at(-1)) : "Stand by";
  els.replacementGrade.textContent = catchCount > 0 ? "Fish on board" : "Lines not in yet";
  renderTally(entries);
}

function renderTally(entries) {
  if (!els.crewTally) return;
  const counts = Object.fromEntries(crew.map((name) => [name, 0]));
  entries.forEach((entry) => {
    if (/tuna|mahi/i.test(entryType(entry)) && entry.angler && counts[entry.angler] !== undefined) {
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
    els.etaReadout.textContent = `At ${trackerDestination.label} - follow the captain's call.`;
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
  els.etaReadout.textContent = `${remainingNm.toFixed(1)} nm to ${trackerDestination.label}${etaText}`;
}

function setLocationState(state, message) {
  if (els.locationState) {
    els.locationState.textContent = state;
    els.locationState.dataset.state = state.toLowerCase().replace("gps ", "");
  }
  if (els.locationStatus) els.locationStatus.textContent = message;
}

function initMap() {
  if (typeof L === "undefined") {
    setLocationState("GPS ERROR", "The route chart did not load, so live tracking is unavailable. The rest of the board still works.");
    return;
  }

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
  const allLatLngs = latLngs;
  L.polyline(latLngs, {
    color: "#ff8d4d",
    weight: 4,
    dashArray: "4 10",
    lineCap: "round",
  }).addTo(map);

  route.forEach((p, i) => {
    const isEnd = i === 0 || i === route.length - 1;
    const isDestination = i === route.length - 1;
    const isInlet = p === points.manasquanInlet;
    const marker = L.circleMarker([p.lat, p.lon], {
      radius: isEnd ? 10 : 7,
      color: "#04111d",
      weight: 3,
      fillColor: isDestination ? "#ff8d4d" : i === 0 ? "#6cbcff" : "#6df4d4",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup(`<strong>${p.label}</strong><br>${p.note}`);
    if (isDestination) {
      marker.bindTooltip("Seaside Lumps", { permanent: true, direction: "right", offset: [12, 0] });
    } else if (isInlet) {
      marker.bindTooltip("Manasquan Inlet", { permanent: true, direction: "right", offset: [10, 0] });
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

    const speedReadout = Number.isFinite(speed) && speed !== null ? `${(speed * 1.94384).toFixed(1)} kt` : "Speed unavailable";
    const courseReadout = Number.isFinite(heading) && heading !== null ? `${compass(heading)} ${Math.round(heading)}°` : "Course unavailable";
    if (els.positionReadout) {
      els.positionReadout.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)} (±${Math.round(accuracy)} m)`;
    }
    if (els.speedCourseReadout) {
      els.speedCourseReadout.textContent = `${speedReadout} | ${courseReadout}`;
    }
    setLocationState("LIVE", "Position is updating on the route chart above.");

    updateEta(nmBetween({ lat: latitude, lon: longitude }, trackerDestination), speed);
    locationMarker.bindPopup(
      `<strong>Ofishal Business</strong><br>${latitude.toFixed(4)}, ${longitude.toFixed(4)}<br>GPS accuracy: ~${Math.round(accuracy)} m`,
    );
  }

  function onError(error) {
    const permissionDenied = error.code === 1 || error.code === error.PERMISSION_DENIED;
    if (permissionDenied) stopTracking();
    setLocationState(
      "GPS ERROR",
      permissionDenied
        ? "Location permission was blocked. Enable it in the browser to track."
        : "Lost the GPS fix. Still trying to reconnect…",
    );
  }

  els.locateButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setLocationState("GPS ERROR", "GPS is not available in this browser.");
      return;
    }

    if (watchId !== null) {
      stopTracking();
      setLocationState("PAUSED", "Live tracking paused. Your trail stays on the chart.");
      return;
    }

    setLocationState("CONNECTING", "Waiting on GPS permission and a position fix…");
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
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function renderMetricList(listEl, metrics) {
  listEl.innerHTML = metrics.map(([label, value]) => `<li><strong>${label}</strong> ${value}</li>`).join("");
}

function renderWeatherFallback() {
  els.day1Head.textContent = weatherFallback.day1.head;
  renderMetricList(els.day1Metrics, weatherFallback.day1.metrics);
  els.day2Head.textContent = weatherFallback.day2.head;
  renderMetricList(els.day2Metrics, weatherFallback.day2.metrics);
}

async function refreshWeather() {
  const date = "2026-08-08";
  const locations = [
    { point: points.ridgeSouth, head: els.day1Head, list: els.day1Metrics },
    { point: points.seasideLumps, head: els.day2Head, list: els.day2Metrics },
  ];

  try {
    const forecasts = await Promise.all(
      locations.map(async ({ point, head, list }) => {
        const windUrl =
          `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}` +
          `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&daily=sunrise,sunset` +
          `&wind_speed_unit=kn&timezone=America%2FNew_York&start_date=${date}&end_date=${date}`;
        const marineUrl =
          `https://marine-api.open-meteo.com/v1/marine?latitude=${point.lat}&longitude=${point.lon}` +
          `&hourly=wave_height,wave_period&timezone=America%2FNew_York&start_date=${date}&end_date=${date}`;
        const [windRes, marineRes] = await Promise.all([
          fetchWithTimeout(windUrl, {}, 9000),
          fetchWithTimeout(marineUrl, {}, 9000),
        ]);
        if (!windRes.ok || !marineRes.ok) throw new Error("weather fetch failed");
        return {
          head,
          list,
          windData: await windRes.json(),
          marineData: await marineRes.json(),
        };
      }),
    );

    forecasts.forEach(({ head, list, windData, marineData }) => {
      renderWeatherDay(
        head,
        list,
        daySlice(windData.hourly.time, windData.hourly.wind_speed_10m, date),
        daySlice(windData.hourly.time, windData.hourly.wind_gusts_10m, date),
        daySlice(windData.hourly.time, windData.hourly.wind_direction_10m, date),
        daySlice(marineData.hourly.time, marineData.hourly.wave_height, date),
        daySlice(marineData.hourly.time, marineData.hourly.wave_period, date),
      );
    });

    const windData = forecasts[0].windData;
    const moon = moonPhase(departure);
    els.sunMoonList.innerHTML = `
      <li><strong>Depart</strong> 5:15 AM, before sunrise</li>
      <li><strong>Sunrise Aug 8</strong> ${formatClock(windData.daily.sunrise[0])}</li>
      <li><strong>Sunset Aug 8</strong> ${formatClock(windData.daily.sunset[0])}</li>
      <li><strong>Moon</strong> ${moon.name}, ${moon.illumination}% lit</li>
    `;
  } catch {
    renderWeatherFallback();
    const moon = moonPhase(departure);
    els.sunMoonList.innerHTML = `
      <li><strong>Depart</strong> 5:15 AM, before sunrise</li>
      <li><strong>Sunrise Aug 8</strong> ~6:01 AM</li>
      <li><strong>Sunset Aug 8</strong> ~8:00 PM</li>
      <li><strong>Moon</strong> ${moon.name}, ${moon.illumination}% lit</li>
    `;
  }
}

/* ---------- Live buoy (NDBC 44091 Barnegat) ---------- */

async function refreshBuoy() {
  if (!els.buoyHead) return;
  const { lat, lon } = points.seasideLumps;
  try {
    const stationUrl = "https://api.weather.gov/stations/44091/observations/latest";
    const marineUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
      `&current=sea_surface_temperature,wave_height&timezone=America%2FNew_York`;
    const windUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn&timezone=America%2FNew_York`;
    const [stationRes, marineRes, windRes] = await Promise.all([
      fetchWithTimeout(stationUrl, { headers: { Accept: "application/geo+json" } }, 8000),
      fetchWithTimeout(marineUrl, {}, 8000),
      fetchWithTimeout(windUrl, {}, 8000),
    ]);
    if (!stationRes.ok || !marineRes.ok || !windRes.ok) throw new Error("conditions request failed");

    const station = (await stationRes.json()).properties;
    const marine = (await marineRes.json()).current;
    const wind = (await windRes.json()).current;
    const airC = station.temperature?.value;
    const airF = airC === null || airC === undefined ? null : (airC * 9) / 5 + 32;
    const waterC = marine.sea_surface_temperature;
    const waterF = waterC === null || waterC === undefined ? null : (waterC * 9) / 5 + 32;
    const waveM = marine.wave_height;
    const observed = station.timestamp
      ? new Date(station.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : "latest report";

    els.buoyHead.textContent = waterF === null ? "Live grounds conditions" : `${waterF.toFixed(1)}°F model SST`;
    els.buoyMetrics.innerHTML = `
      <li><strong>NDBC air</strong> ${airF === null ? "n/a" : `${airF.toFixed(1)}°F`}</li>
      <li><strong>Model SST</strong> ${waterF === null ? "n/a" : `${waterF.toFixed(1)}°F`}</li>
      <li><strong>Waves</strong> ${waveM === null || waveM === undefined ? "n/a" : `${(waveM * 3.28084).toFixed(1)} ft`}</li>
      <li><strong>Wind</strong> ${compass(wind.wind_direction_10m)} ${Math.round(wind.wind_speed_10m)} kt</li>
      <li><strong>Gusts</strong> to ${Math.round(wind.wind_gusts_10m)} kt</li>
    `;
    els.buoyNote.textContent =
      `NDBC 44091 air observed at ${observed}; water, waves, and wind are modeled at Seaside Lumps. ` +
      "Use the linked NDBC page and onboard instruments for the captain's final check.";
  } catch {
    await buoyFallback();
  }
}

async function buoyFallback() {
  const { lat, lon } = points.seasideLumps;
  try {
    const marineUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
      `&current=sea_surface_temperature,wave_height&timezone=America%2FNew_York`;
    const windUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn&timezone=America%2FNew_York`;
    const [marineRes, windRes] = await Promise.all([
      fetchWithTimeout(marineUrl, {}, 8000),
      fetchWithTimeout(windUrl, {}, 8000),
    ]);
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
        ? "Live Seaside conditions"
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
      "Waves and wind are modeled Seaside Lumps conditions (Open-Meteo); buoy 44091's current feed was unreachable.";
  } catch {
    const hasOnboardWater = onboardConditions.waterTempF !== null && onboardConditions.waterTempF !== undefined;
    els.buoyHead.textContent = hasOnboardWater
      ? `${onboardConditions.waterTempF.toFixed(1)}°F water`
      : "Conditions feed slow";
    renderMetricList(els.buoyMetrics, [
      ["SIMRAD", hasOnboardWater ? `${onboardConditions.waterTempF.toFixed(1)}°F` : "waiting on reading"],
      ["Buoy 44091", "unreachable"],
      ["Model feed", "slow/offline"],
    ]);
    els.buoyNote.textContent =
      `${onboardConditions.source} reading from ${onboardConditions.observed}. Check NDBC/NOAA links when Starlink catches up.`;
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
    const [, time] = prediction.t.split(" ");
    const label = "Aug 8";
    days[label] = [...(days[label] || []), `${prediction.type === "H" ? "H" : "L"} ${formatTime(time)}`];
    return days;
  }, {});
  els.tideList.innerHTML = Object.entries(grouped)
    .map(([day, entries]) => `<li><strong>${day}</strong> ${entries.join(", ")}</li>`)
    .join("");
}

async function refreshTides() {
  const url =
    "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=fab-five-trip-board&begin_date=20260808&end_date=20260808&datum=MLLW&station=8532591&time_zone=lst_ldt&units=english&interval=hilo&format=json";
  try {
    const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) throw new Error("NOAA tide request failed");
    const data = await response.json();
    if (Array.isArray(data.predictions)) renderTides(data.predictions);
  } catch {
    renderTides(tideFallback);
  }
}

async function createSharedClient() {
  const config = window.OFISHAL_SHARED_CONFIG || {};
  if (!config.url || !config.publishableKey) return null;

  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  const supabase = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  function unwrap(result) {
    if (result.error) throw result.error;
    return result.data;
  }

  async function removeUploadedObject(storagePath) {
    unwrap(await supabase.storage.from("trip-photos").remove([storagePath]));
  }

  return {
    async load(slug) {
      const trip = unwrap(await supabase.from("trips").select("*").eq("slug", slug).single());
      const [stateResult, entriesResult] = await Promise.all([
        supabase.from("trip_state").select("*").eq("trip_id", trip.id).single(),
        supabase.from("trip_log_entries").select("*").eq("trip_id", trip.id).order("created_at"),
      ]);
      return {
        trip,
        tripState: unwrap(stateResult),
        entries: unwrap(entriesResult),
      };
    },
    async mutate(mutation) {
      if (mutation.kind === "create-entry") {
        unwrap(await supabase.from("trip_log_entries").upsert(mutation.row, { onConflict: "id" }));
      } else if (mutation.kind === "update-entry") {
        unwrap(await supabase.from("trip_log_entries").update(mutation.row).eq("id", mutation.row.id));
      } else if (mutation.kind === "delete-entry") {
        unwrap(await supabase.from("trip_log_entries").delete().eq("id", mutation.id));
      } else if (mutation.kind === "update-state") {
        unwrap(await supabase.from("trip_state").upsert(mutation.row, { onConflict: "trip_id" }));
      }
    },
    async listPhotos(tripId) {
      return unwrap(
        await supabase.from("trip_photos").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }),
      );
    },
    async uploadPhoto({ id, tripId, storagePath, blob, caption, width, height }) {
      unwrap(
        await supabase.storage.from("trip-photos").upload(storagePath, blob, {
          cacheControl: "31536000",
          contentType: "image/jpeg",
          upsert: false,
        }),
      );
      try {
        return unwrap(
          await supabase.from("trip_photos").insert({
            id,
            trip_id: tripId,
            storage_path: storagePath,
            caption: caption || null,
            width,
            height,
          }).select("*").single(),
        );
      } catch (error) {
        try {
          await removeUploadedObject(storagePath);
        } catch {
          // The metadata error is the actionable failure; cleanup can be retried from Supabase.
        }
        throw error;
      }
    },
    async deletePhoto(photo) {
      await removeUploadedObject(photo.storage_path);
      unwrap(await supabase.from("trip_photos").delete().eq("id", photo.id));
    },
    photoUrl(storagePath) {
      return supabase.storage.from("trip-photos").getPublicUrl(storagePath).data.publicUrl;
    },
    subscribePhotos(handler) {
      const channel = supabase
        .channel("ofishal-business-photos")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trip_photos" },
          (payload) => handler({ table: "trip_photos", ...payload }),
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    },
    subscribe(handler) {
      const channel = supabase
        .channel("ofishal-business-board")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trip_state" },
          (payload) => handler({ table: "trip_state", ...payload }),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trip_log_entries" },
          (payload) => handler({ table: "trip_log_entries", ...payload }),
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    },
  };
}

function photoErrorMessage(error) {
  const message = error?.message || String(error || "Photo upload failed.");
  if (/network|fetch|offline/i.test(message)) return "Connection lost. Reconnect and try the photo upload again.";
  if (/row-level security|policy/i.test(message)) return "Photo storage permissions are not ready yet.";
  return message;
}

function formatPhotoTime(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function setupSharedPhotos(client, trip) {
  if (!els.photoPicker || !els.sharedPhotoList) return;
  if (!client || !trip) {
    els.photoUploadStatus.textContent = "Shared photo uploads require the live Vercel board.";
    return;
  }

  const { buildPhotoPath, preparePhoto, validatePhotoFile } = await import("./photo-utils.js");
  let photos = [];
  let selectedFiles = [];

  function setPhotoAvailability(available) {
    els.photoPicker.disabled = !available;
    els.photoPickerAction.classList.toggle("is-disabled", !available);
    els.photoPickerAction.setAttribute("aria-disabled", String(!available));
  }

  function upsertPhoto(photo) {
    photos = [photo, ...photos.filter((candidate) => candidate.id !== photo.id)]
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
  }

  function renderPhotos() {
    els.sharedPhotoList.querySelectorAll("[data-shared-photo]").forEach((node) => node.remove());
    photos.forEach((photo) => {
      const figure = document.createElement("figure");
      figure.className = "gallery-photo";
      figure.dataset.sharedPhoto = photo.id;

      const link = document.createElement("a");
      link.href = client.photoUrl(photo.storage_path);
      link.target = "_blank";
      link.rel = "noreferrer";
      link.setAttribute("aria-label", `Open full-size trip photo from ${formatPhotoTime(photo.created_at)}`);

      const image = document.createElement("img");
      image.src = link.href;
      image.alt = photo.caption || "Shared trip photo";
      image.loading = "lazy";
      image.width = photo.width;
      image.height = photo.height;
      link.append(image);

      const meta = document.createElement("figcaption");
      meta.className = "shared-photo-meta";
      const caption = document.createElement("p");
      caption.textContent = photo.caption || "Trip photo";
      const timestamp = document.createElement("small");
      timestamp.textContent = formatPhotoTime(photo.created_at);
      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-photo-button";
      deleteButton.type = "button";
      deleteButton.dataset.photoDelete = photo.id;
      deleteButton.textContent = "Delete photo";
      meta.append(caption, timestamp, deleteButton);
      figure.append(link, meta);
      els.sharedPhotoList.append(figure);
    });
  }

  function reconcilePhoto(event) {
    const id = event.eventType === "DELETE" ? event.old?.id : event.new?.id;
    photos = photos.filter((photo) => photo.id !== id);
    if (event.eventType !== "DELETE" && event.new) upsertPhoto(event.new);
    renderPhotos();
  }

  function updateSelectionSummary() {
    const count = selectedFiles.length;
    els.photoSelectionSummary.textContent = count
      ? `${count} photo${count === 1 ? "" : "s"} selected`
      : "No photos selected";
    els.photoUploadPanel.hidden = count === 0;
  }

  els.photoPicker.addEventListener("change", () => {
    const failedMessages = [];
    selectedFiles = Array.from(els.photoPicker.files || []).filter((file) => {
      const validation = validatePhotoFile(file);
      if (!validation.valid) failedMessages.push(validation.error);
      return validation.valid;
    });
    updateSelectionSummary();
    els.photoUploadStatus.textContent = failedMessages.join(" ");
  });

  els.uploadPhotosButton.addEventListener("click", async () => {
    if (!selectedFiles.length) return;
    if (!navigator.onLine) {
      els.photoUploadStatus.textContent = "Photo uploads need an internet connection. Reconnect and try again.";
      return;
    }

    const caption = els.photoCaptionInput.value.trim();
    const failedMessages = [];
    const failedFiles = [];
    let uploadedCount = 0;
    els.uploadPhotosButton.disabled = true;

    for (const [index, file] of selectedFiles.entries()) {
      els.photoUploadStatus.textContent = `Preparing photo ${index + 1} of ${selectedFiles.length}...`;
      try {
        const { blob, width, height } = await preparePhoto(file);
        const id = crypto.randomUUID();
        const storagePath = buildPhotoPath({ tripSlug: trip.slug, id });
        els.photoUploadStatus.textContent = `Uploading photo ${index + 1} of ${selectedFiles.length}...`;
        const photo = await client.uploadPhoto({
          id,
          tripId: trip.id,
          storagePath,
          blob,
          caption,
          width,
          height,
        });
        upsertPhoto(photo);
        renderPhotos();
        uploadedCount += 1;
      } catch (error) {
        failedFiles.push(file);
        failedMessages.push(`${file.name}: ${photoErrorMessage(error)}`);
      }
    }

    selectedFiles = failedFiles;
    els.uploadPhotosButton.disabled = false;
    if (!failedFiles.length) {
      els.photoPicker.value = "";
      els.photoCaptionInput.value = "";
    }
    updateSelectionSummary();
    els.photoUploadStatus.textContent = failedMessages.length
      ? `${uploadedCount} uploaded. ${failedMessages.join(" ")}`
      : `${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded.`;
  });

  els.sharedPhotoList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-photo-delete]");
    if (!button) return;
    const photo = photos.find((candidate) => candidate.id === button.dataset.photoDelete);
    if (!photo || !confirm("Delete this shared trip photo?")) return;

    button.disabled = true;
    els.photoUploadStatus.textContent = "Deleting photo...";
    try {
      await client.deletePhoto(photo);
      photos = photos.filter((candidate) => candidate.id !== photo.id);
      renderPhotos();
      els.photoUploadStatus.textContent = "Photo deleted.";
    } catch (error) {
      button.disabled = false;
      els.photoUploadStatus.textContent = photoErrorMessage(error);
    }
  });

  setPhotoAvailability(navigator.onLine);
  window.addEventListener("online", () => setPhotoAvailability(true));
  window.addEventListener("offline", () => {
    setPhotoAvailability(false);
    els.photoUploadStatus.textContent = "Photo uploads are offline. Existing photos remain available.";
  });

  try {
    photos = await client.listPhotos(trip.id);
    renderPhotos();
    client.subscribePhotos(reconcilePhoto);
  } catch (error) {
    setPhotoAvailability(false);
    els.photoUploadStatus.textContent = photoErrorMessage(error);
  }
}

function stableEntryUuid(entry, index) {
  const source = `${entry.time}|${entry.type}|${entry.method}|${entry.angler || ""}|${entry.moment}|${index}`;
  let first = 2166136261;
  let second = 2246822519;
  for (const char of source) {
    first = Math.imul(first ^ char.charCodeAt(0), 16777619) >>> 0;
    second = Math.imul(second ^ char.charCodeAt(0), 3266489917) >>> 0;
  }
  const hex = `${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}fab5000000000000`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function legacyEntryToShared(entry, index) {
  return {
    id: stableEntryUuid(entry, index),
    trip_id: "fabe5000-0000-4000-8000-000000000001",
    time_label: entry.time,
    entry_type: entry.type,
    method: entry.method,
    angler: entry.angler || null,
    moment: entry.moment,
    created_at: new Date(departure.getTime() + index * 60000).toISOString(),
    updated_at: new Date(departure.getTime() + index * 60000).toISOString(),
  };
}

function renderSharedSnapshot(snapshot) {
  sharedEntries = snapshot.entries;
  renderTimeline(snapshot.entries);

  const state = snapshot.tripState;
  if (state) {
    if (document.activeElement !== els.tripStatusControl) els.tripStatusControl.value = state.status;
    if (document.activeElement !== els.destinationControl) els.destinationControl.value = state.active_destination;
    els.currentTripStatus.textContent = formatTripStatus(state.status);
    els.currentTripDestination.textContent = state.active_destination;
    els.currentTripNote.textContent = state.return_note;
    trackerDestination = Object.values(points).find((point) => point.label === state.active_destination) || points.ridgeSouth;
  }

  const labels = {
    synced: "Synced",
    pending: "Pending",
    offline: "Offline",
    "local-only": "Local only",
  };
  els.syncState.textContent = labels[snapshot.syncState] || "Pending";
  els.syncState.dataset.state = snapshot.syncState;
  els.syncError.hidden = !snapshot.error;
  els.syncError.textContent = snapshot.error || "";
}

async function setupSharedBoard() {
  const [{ createSharedStore }, client] = await Promise.all([
    import("./shared-store.js"),
    createSharedClient(),
  ]);
  const localEntries = readEntries();
  const sharedSeeds = localEntries.map(legacyEntryToShared);
  sharedStore = createSharedStore({ client, seeds: sharedSeeds });
  sharedStore.subscribe(renderSharedSnapshot);
  await sharedStore.start();
  els.saveTripUpdateButton.disabled = false;
  await setupSharedPhotos(client, sharedStore.getSnapshot().trip);
  window.addEventListener("online", () => sharedStore.replayQueue());
}

/* ---------- Wire up ---------- */

els.typeInput.addEventListener("change", updateCatchDetailsVisibility);
updateCatchDetailsVisibility();

els.tripUpdateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!sharedStore) return;

  const updateText = els.tripUpdateInput.value.trim();
  if (!updateText) return;

  const status = els.tripStatusControl.value;
  const type = els.typeInput.value;
  const catchEntry = isCatchType(type);
  const now = new Date();
  const entry = {
    time_label: now.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    moment: updateText,
    entry_type: type,
    method: catchEntry
      ? els.methodInput.value
      : (["underway", "heading-home"].includes(status) ? "Running" : "Other"),
    angler: catchEntry ? (els.anglerInput.value || null) : null,
  };

  els.saveTripUpdateButton.disabled = true;
  els.saveTripUpdateButton.textContent = "Saving...";
  await sharedStore.saveTripUpdate({
    state: {
      status,
      active_destination: els.destinationControl.value,
      return_note: updateText,
    },
    entry,
  });

  const snapshot = sharedStore.getSnapshot();
  const accepted = !snapshot.error || snapshot.queuedCount > 0;
  els.saveTripUpdateButton.textContent = accepted
    ? (snapshot.queuedCount ? "Update queued" : "Saved to trip log")
    : "Try again";
  els.saveTripUpdateButton.disabled = false;
  if (accepted) {
    els.tripUpdateInput.value = "";
    els.typeInput.value = "Boat life";
    els.methodInput.value = "Trolling";
    els.anglerInput.value = "";
    updateCatchDetailsVisibility();
  }
});

els.timeline.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-entry-edit]");
  const deleteButton = event.target.closest("[data-entry-delete]");
  if (!sharedStore || (!editButton && !deleteButton)) return;

  if (editButton) {
    const id = editButton.dataset.entryEdit;
    const entry = activeEntries().find((candidate) => candidate.id === id);
    const moment = prompt("Edit this trip log entry", entry?.moment || "");
    if (moment && moment.trim()) await sharedStore.updateEntry(id, { moment: moment.trim() });
  }

  if (deleteButton) {
    const id = deleteButton.dataset.entryDelete;
    if (confirm("Delete this shared trip log entry?")) await sharedStore.deleteEntry(id);
  }
});

function runStartupTask(name, task) {
  try {
    const result = task();
    if (result && typeof result.catch === "function") {
      result.catch((error) => console.warn(`${name} failed`, error));
    }
  } catch (error) {
    console.warn(`${name} failed`, error);
  }
}

runStartupTask("timer", renderTimer);
runStartupTask("timeline", renderTimeline);
runStartupTask("shared board", setupSharedBoard);
runStartupTask("weather", refreshWeather);
runStartupTask("buoy", refreshBuoy);
runStartupTask("tides", refreshTides);
runStartupTask("map", initMap);
setInterval(renderTimer, 30000);
