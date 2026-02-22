const DATA_URL = "./data/events.json";

const REGION_CENTROIDS = {
  東亞: [35.0, 105.0],
  南亞: [21.5, 78.0],
  東南亞: [7.5, 110.0],
  西亞: [33.0, 44.0],
  中東: [30.0, 45.0],
  北非: [28.0, 17.0],
  南歐: [42.5, 14.0],
  西歐: [47.0, 2.5],
  東歐: [50.0, 28.0],
  北歐: [61.0, 16.0],
  英國: [54.5, -2.5],
  北美: [44.0, -100.0]
};

const map = L.map("map", { zoomControl: true }).setView([28, 20], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const yearSlider = document.getElementById("yearSlider");
const yearLabel = document.getElementById("yearLabel");
const playBtn = document.getElementById("playBtn");
const cumulativeToggle = document.getElementById("cumulativeToggle");
const searchInput = document.getElementById("searchInput");
const actorFilter = document.getElementById("actorFilter");
const regionFilter = document.getElementById("regionFilter");
const eventList = document.getElementById("eventList");
const visibleCount = document.getElementById("visibleCount");
const totalCount = document.getElementById("totalCount");
const modeLabel = document.getElementById("modeLabel");

let allEvents = [];
let markerLayer = L.layerGroup().addTo(map);
let timelineYears = [];
let currentYearIndex = 0;
let playing = false;
let playTimer = null;

function formatYear(year) {
  if (Number.isNaN(year)) return "-";
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

function eventCoordinate(event) {
  if (typeof event.lat === "number" && typeof event.lng === "number") {
    return [event.lat, event.lng];
  }
  for (const region of event.regions || []) {
    if (REGION_CENTROIDS[region]) return REGION_CENTROIDS[region];
  }
  return [20, 0];
}

function eventText(event) {
  return [
    event.title || "",
    event.summary || "",
    (event.actors || []).join(" "),
    (event.regions || []).join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function activeYear() {
  return timelineYears[currentYearIndex] ?? null;
}

function fillOptions() {
  const actors = new Set();
  const regions = new Set();
  allEvents.forEach((event) => {
    (event.actors || []).forEach((x) => actors.add(x));
    (event.regions || []).forEach((x) => regions.add(x));
  });

  [...actors].sort().forEach((actor) => {
    const option = document.createElement("option");
    option.value = actor;
    option.textContent = actor;
    actorFilter.appendChild(option);
  });

  [...regions].sort().forEach((region) => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    regionFilter.appendChild(option);
  });
}

function matchesFilters(event) {
  const keyword = searchInput.value.trim().toLowerCase();
  if (keyword && !eventText(event).includes(keyword)) return false;

  const actor = actorFilter.value;
  if (actor && !(event.actors || []).includes(actor)) return false;

  const region = regionFilter.value;
  if (region && !(event.regions || []).includes(region)) return false;

  const year = activeYear();
  if (year == null) return false;

  if (cumulativeToggle.checked) {
    if (event.year > year) return false;
  } else if (event.year !== year) {
    return false;
  }
  return true;
}

function clearPlayTimer() {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
}

function setPlayState(nextPlaying) {
  playing = nextPlaying;
  playBtn.textContent = playing ? "Pause" : "Play";
  if (!playing) clearPlayTimer();
}

function render() {
  const year = activeYear();
  yearLabel.textContent = formatYear(year);
  modeLabel.textContent = cumulativeToggle.checked ? "Cumulative mode" : "Selected year";

  const visible = allEvents.filter(matchesFilters).sort((a, b) => a.year - b.year);
  visibleCount.textContent = String(visible.length);
  totalCount.textContent = String(allEvents.length);

  markerLayer.clearLayers();
  const bounds = [];

  visible.forEach((event) => {
    const [lat, lng] = eventCoordinate(event);
    const marker = L.circleMarker([lat, lng], {
      radius: 6,
      color: "#176087",
      fillColor: "#ba5d2a",
      fillOpacity: 0.72,
      weight: 1
    }).bindPopup(`
      <strong>${event.title || "Untitled event"}</strong><br/>
      <small>${formatYear(event.year)}</small><br/>
      Actors: ${(event.actors || []).join(", ") || "-"}<br/>
      Regions: ${(event.regions || []).join(", ") || "-"}<br/>
      <p style="margin:6px 0 0;">${event.summary || ""}</p>
    `);
    markerLayer.addLayer(marker);
    bounds.push([lat, lng]);
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
  }

  eventList.innerHTML = "";
  if (!visible.length) {
    const empty = document.createElement("li");
    empty.className = "event-empty";
    empty.textContent = "No events match the current filters.";
    eventList.appendChild(empty);
    return;
  }

  visible.forEach((event) => {
    const li = document.createElement("li");
    const title = document.createElement("p");
    title.className = "event-title";
    title.textContent = event.title || "Untitled event";

    const meta = document.createElement("p");
    meta.className = "event-meta";
    meta.textContent = `${formatYear(event.year)} | ${(event.actors || []).join(", ") || "-"} | ${(event.regions || []).join(", ") || "-"}`;

    const summary = document.createElement("p");
    summary.className = "event-summary";
    summary.textContent = event.summary || "";

    li.appendChild(title);
    li.appendChild(meta);
    li.appendChild(summary);
    eventList.appendChild(li);
  });
}

function configureTimeline() {
  timelineYears = [...new Set(allEvents.map((x) => x.year))].sort((a, b) => a - b);
  yearSlider.min = "0";
  yearSlider.max = String(Math.max(timelineYears.length - 1, 0));
  yearSlider.step = "1";
  yearSlider.value = String(timelineYears.length - 1);
  currentYearIndex = timelineYears.length - 1;
}

function handlePlayToggle() {
  if (!timelineYears.length) return;
  if (playing) {
    setPlayState(false);
    return;
  }

  setPlayState(true);
  playTimer = setInterval(() => {
    if (currentYearIndex >= timelineYears.length - 1) {
      setPlayState(false);
      return;
    }
    currentYearIndex += 1;
    yearSlider.value = String(currentYearIndex);
    render();
  }, 950);
}

async function boot() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${DATA_URL}: ${response.status}`);
    const payload = await response.json();
    allEvents = (payload.events || [])
      .map((event) => ({
        ...event,
        year: Number(event.year),
        actors: Array.isArray(event.actors) ? event.actors : [],
        regions: Array.isArray(event.regions) ? event.regions : []
      }))
      .filter((event) => Number.isFinite(event.year));

    fillOptions();
    configureTimeline();
    render();
  } catch (error) {
    console.error(error);
    yearLabel.textContent = "Error";
    eventList.innerHTML = `<li class="event-empty">${String(error.message || error)}</li>`;
  }
}

yearSlider.addEventListener("input", () => {
  currentYearIndex = Number(yearSlider.value);
  render();
});
playBtn.addEventListener("click", handlePlayToggle);
cumulativeToggle.addEventListener("change", render);
searchInput.addEventListener("input", render);
actorFilter.addEventListener("change", render);
regionFilter.addEventListener("change", render);

boot();
