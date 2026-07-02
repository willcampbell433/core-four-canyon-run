const departure = new Date("2026-07-03T13:00:00-04:00");
const roughReturn = new Date("2026-07-04T16:00:00-04:00");
const storageKey = "core-four-canyon-run-log";
const phaseKey = "core-four-canyon-run-phase";

const seedEntries = [
  {
    time: "Jul 3, 1:00 PM",
    type: "Dockside",
    method: "Running",
    moment: "Push off from Brick. Core Four loaded. Phil replacement clock starts.",
  },
  {
    time: "Jul 3, afternoon",
    type: "Weather",
    method: "Running",
    moment: "Check Windy and NOAA before the long part of the run.",
  },
  {
    time: "Jul 3, evening",
    type: "Boat life",
    method: "Trolling",
    moment: "Spread out, eyes up, wait for the chaos.",
  },
];

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
  currentPhase: document.querySelector("#currentPhase"),
  lastUpdate: document.querySelector("#lastUpdate"),
  catchCount: document.querySelector("#catchCount"),
  timeline: document.querySelector("#timelineList"),
  form: document.querySelector("#logForm"),
  replacementGrade: document.querySelector("#replacementGrade"),
  tideList: document.querySelector("#tideList"),
  tripMap: document.querySelector("#tripMap"),
  mapReadout: document.querySelector("#mapReadout"),
};

function readEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(parsed) ? parsed : seedEntries;
  } catch {
    return seedEntries;
  }
}

function writeEntries(entries) {
  localStorage.setItem(storageKey, JSON.stringify(entries));
}

function setPhase(phase) {
  localStorage.setItem(phaseKey, phase);
  els.currentPhase.textContent = phase;
  els.lastUpdate.textContent = new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  els.days.textContent = String(days).padStart(2, "0");
  els.hours.textContent = String(hours).padStart(2, "0");
  els.minutes.textContent = String(minutes).padStart(2, "0");
}

function renderTimeline() {
  const entries = readEntries();
  els.timeline.innerHTML = entries
    .slice()
    .reverse()
    .map(
      (entry) => `
        <li>
          <time>${entry.time}</time>
          <div>
            <strong>${escapeHtml(entry.moment)}</strong>
            <span>${escapeHtml(entry.type)} / ${escapeHtml(entry.method)}</span>
          </div>
        </li>
      `,
    )
    .join("");

  const catchCount = entries.filter((entry) => /tuna|mahi/i.test(entry.type)).length;
  els.catchCount.textContent = String(catchCount);
  els.replacementGrade.textContent = catchCount > 0 ? "Trending useful" : "Pending sea trial";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initMap() {
  let zoom = 1;

  function applyZoom() {
    els.tripMap.style.transform = `scale(${zoom})`;
  }

  document.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.mapZoom;
      if (action === "in") zoom = Math.min(1.45, zoom + 0.15);
      if (action === "out") zoom = Math.max(0.85, zoom - 0.15);
      if (action === "reset") zoom = 1;
      applyZoom();
    });
  });

  document.querySelectorAll("[data-point]").forEach((marker) => {
    marker.addEventListener("click", () => {
      els.mapReadout.textContent = marker.dataset.point;
    });
    marker.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        els.mapReadout.textContent = marker.dataset.point;
      }
    });
    marker.setAttribute("tabindex", "0");
    marker.setAttribute("role", "button");
  });
}

function groupTides(predictions) {
  return predictions.reduce((days, prediction) => {
    const [date, time] = prediction.t.split(" ");
    const label = date === "2026-07-03" ? "Jul 3" : "Jul 4";
    const kind = prediction.type === "H" ? "H" : "L";
    const hour = formatTime(time);
    days[label] = [...(days[label] || []), `${kind} ${hour}`];
    return days;
  }, {});
}

function renderTides(predictions) {
  const grouped = groupTides(predictions);
  els.tideList.innerHTML = Object.entries(grouped)
    .map(([day, entries]) => `<li><strong>${day}</strong> ${entries.join(", ")}</li>`)
    .join("");
}

function formatTime(time) {
  const [hourRaw, minute] = time.split(":");
  const hour = Number(hourRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
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

document.querySelectorAll("[data-phase]").forEach((button) => {
  button.addEventListener("click", () => setPhase(button.dataset.phase));
});

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
  };
  const entries = [...readEntries(), entry];
  writeEntries(entries);
  els.form.reset();
  setPhase(`${entry.type} logged`);
  renderTimeline();
});

setPhase(localStorage.getItem(phaseKey) || "Loading ice and bad ideas");
renderTimer();
renderTimeline();
initMap();
refreshTides();
setInterval(renderTimer, 30000);
