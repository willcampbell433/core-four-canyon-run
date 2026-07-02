const departure = new Date("2026-07-03T13:00:00-04:00");
const roughReturn = new Date("2026-07-04T16:00:00-04:00");
const storageKey = "core-four-canyon-run-log";
const phaseKey = "core-four-canyon-run-phase";
const birdKey = "core-four-canyon-run-bird";

const seedEntries = [
  {
    time: "Jul 3, 1:00 PM",
    type: "Dockside",
    method: "Running",
    moment: "Push off from Brick. Core Four loaded. Phil replacement clock starts.",
  },
  {
    time: "Jul 3, afternoon",
    type: "Boat life",
    method: "Running",
    moment: "Starlink online and the cabin TV officially becomes mission control.",
  },
  {
    time: "Jul 3, evening",
    type: "Birds",
    method: "Spotting",
    moment: "Young eyes scan starts. Seagulls have no idea they are now KPIs.",
  },
];

const els = {
  days: document.querySelector("#daysValue"),
  hours: document.querySelector("#hoursValue"),
  minutes: document.querySelector("#minutesValue"),
  missionStatus: document.querySelector("#missionStatus"),
  currentPhase: document.querySelector("#currentPhase"),
  lastUpdate: document.querySelector("#lastUpdate"),
  catchCount: document.querySelector("#catchCount"),
  birdStatus: document.querySelector("#birdStatus"),
  birdReadout: document.querySelector("#birdReadout"),
  timeline: document.querySelector("#timelineList"),
  form: document.querySelector("#logForm"),
  tvButton: document.querySelector("#tvModeButton"),
  replacementGrade: document.querySelector("#replacementGrade"),
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

function setBirdStatus(status) {
  localStorage.setItem(birdKey, status);
  els.birdStatus.textContent = status.split(".")[0];
  els.birdReadout.textContent = status;
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

document.querySelectorAll("[data-phase]").forEach((button) => {
  button.addEventListener("click", () => setPhase(button.dataset.phase));
});

document.querySelectorAll("[data-bird]").forEach((button) => {
  button.addEventListener("click", () => setBirdStatus(button.dataset.bird));
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
  setPhase(entry.type === "Birds" ? "Birds working bait" : `${entry.type} logged`);
  renderTimeline();
});

els.tvButton.addEventListener("click", () => {
  const enabled = document.body.classList.toggle("tv-mode");
  els.tvButton.setAttribute("aria-pressed", String(enabled));
});

setPhase(localStorage.getItem(phaseKey) || "Loading ice and bad ideas");
setBirdStatus(localStorage.getItem(birdKey) || "Young eyes armed. Sunglasses mandatory.");
renderTimer();
renderTimeline();
setInterval(renderTimer, 30000);
