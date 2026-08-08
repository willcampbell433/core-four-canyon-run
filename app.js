const departure = new Date("2026-08-08T05:15:00-04:00");
const roughReturn = new Date("2026-08-08T18:00:00-04:00");
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

const offshoreSpots = [];

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
  form: document.querySelector("#logForm"),
  copyLogButton: document.querySelector("#copyLogButton"),
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

function formatBoardLogExport(entries) {
  const lines = entries.map((entry) => {
    const angler = entry.angler ? ` / ${entry.angler}` : "";
    return `- ${entry.time}: ${entry.moment} (${entry.type} / ${entry.method}${angler})`;
  });
  return `The Fab Five | Aug 8, 2026 board log\n\n${lines.join("\n")}\n\nRaw JSON:\n${JSON.stringify(entries, null, 2)}`;
}

async function copyBoardLog() {
  if (!els.copyLogButton) return;
  const entries = readEntries();
  const text = formatBoardLogExport(entries);
  try {
    await navigator.clipboard.writeText(text);
    els.copyLogButton.textContent = "Board log copied";
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    els.copyLogButton.textContent = "Board log copied";
  }
  setTimeout(() => {
    els.copyLogButton.textContent = "Copy board log";
  }, 2500);
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
  els.replacementGrade.textContent = catchCount > 0 ? "Fish on board" : "Lines not in yet";
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
    els.etaReadout.textContent = "At Seaside Lumps - follow the captain's call.";
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
  els.etaReadout.textContent = `${remainingNm.toFixed(1)} nm to Seaside Lumps${etaText}`;
}

function initMap() {
  if (typeof L === "undefined") {
    if (els.locationStatus) {
      els.locationStatus.textContent = "Map library did not load. Conditions and trip log still work.";
    }
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
  const allLatLngs = [...latLngs, ...offshoreSpots.map((p) => [p.lat, p.lon])];
  L.polyline(latLngs, {
    color: "#ff8d4d",
    weight: 4,
    dashArray: "4 10",
    lineCap: "round",
  }).addTo(map);

  offshoreSpots.forEach((spot) => {
    const tip = { direction: "right", offset: [10, 0] };
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

    const knots = Number.isFinite(speed) && speed !== null ? ` | ${(speed * 1.94384).toFixed(1)} kt` : "";
    const course = Number.isFinite(heading) && heading !== null ? ` | ${compass(heading)} ${Math.round(heading)}°` : "";
    els.locationStatus.textContent =
      `Live: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (±${Math.round(accuracy)} m)${knots}${course}`;

    updateEta(nmBetween({ lat: latitude, lon: longitude }, points.seasideLumps), speed);
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

if (els.copyLogButton) {
  els.copyLogButton.addEventListener("click", copyBoardLog);
}

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
runStartupTask("weather", refreshWeather);
runStartupTask("buoy", refreshBuoy);
runStartupTask("tides", refreshTides);
runStartupTask("map", initMap);
setInterval(renderTimer, 30000);
