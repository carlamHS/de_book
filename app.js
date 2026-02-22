const DATA_URL = "./data/events.json";
const APPS_SCRIPT_ENDPOINT_DEFAULT = "";

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
const syncStatus = document.getElementById("syncStatus");
const eventSubmitForm = document.getElementById("eventSubmitForm");
const endpointInput = document.getElementById("endpointInput");
const submitKeyInput = document.getElementById("submitKeyInput");
const inputYear = document.getElementById("inputYear");
const inputTitle = document.getElementById("inputTitle");
const inputActors = document.getElementById("inputActors");
const inputRegions = document.getElementById("inputRegions");
const inputLat = document.getElementById("inputLat");
const inputLng = document.getElementById("inputLng");
const inputSources = document.getElementById("inputSources");
const inputSummary = document.getElementById("inputSummary");
const submitStatus = document.getElementById("submitStatus");

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

function splitCsvInput(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEvent(event) {
  return {
    ...event,
    year: Number(event.year),
    actors: Array.isArray(event.actors) ? event.actors : splitCsvInput(event.actors),
    regions: Array.isArray(event.regions) ? event.regions : splitCsvInput(event.regions),
    sources: Array.isArray(event.sources) ? event.sources : splitCsvInput(event.sources)
  };
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
  const previousActor = actorFilter.value;
  const previousRegion = regionFilter.value;

  const actors = new Set();
  const regions = new Set();
  allEvents.forEach((event) => {
    (event.actors || []).forEach((x) => actors.add(x));
    (event.regions || []).forEach((x) => regions.add(x));
  });

  actorFilter.innerHTML = '<option value="">All actors</option>';
  [...actors].sort().forEach((actor) => {
    const option = document.createElement("option");
    option.value = actor;
    option.textContent = actor;
    actorFilter.appendChild(option);
  });

  regionFilter.innerHTML = '<option value="">All regions</option>';
  [...regions].sort().forEach((region) => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    regionFilter.appendChild(option);
  });

  if (previousActor && actors.has(previousActor)) actorFilter.value = previousActor;
  if (previousRegion && regions.has(previousRegion)) regionFilter.value = previousRegion;
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

function setSubmitStatus(message, isError) {
  if (!submitStatus) return;
  submitStatus.textContent = message;
  submitStatus.style.color = isError ? "#8a1f11" : "#295b2d";
}

async function handleEventSubmit(event) {
  event.preventDefault();
  if (!eventSubmitForm) return;

  const endpoint = (endpointInput.value || "").trim();
  const submitKey = (submitKeyInput.value || "").trim();
  const year = Number(inputYear.value);
  const title = (inputTitle.value || "").trim();
  const summary = (inputSummary.value || "").trim();

  if (!endpoint) {
    setSubmitStatus("Missing Apps Script URL.", true);
    return;
  }
  if (!submitKey) {
    setSubmitStatus("Missing submit key.", true);
    return;
  }
  if (!Number.isFinite(year)) {
    setSubmitStatus("Year must be a number.", true);
    return;
  }
  if (!title) {
    setSubmitStatus("Title is required.", true);
    return;
  }
  if (!summary) {
    setSubmitStatus("Summary is required.", true);
    return;
  }

  const lat = inputLat.value === "" ? null : Number(inputLat.value);
  const lng = inputLng.value === "" ? null : Number(inputLng.value);
  if (lat !== null && !Number.isFinite(lat)) {
    setSubmitStatus("Latitude must be a number.", true);
    return;
  }
  if (lng !== null && !Number.isFinite(lng)) {
    setSubmitStatus("Longitude must be a number.", true);
    return;
  }

  const payload = {
    submit_key: submitKey,
    event: {
      year: year,
      title: title,
      summary: summary,
      actors: splitCsvInput(inputActors.value),
      regions: splitCsvInput(inputRegions.value),
      sources: splitCsvInput(inputSources.value)
    }
  };
  if (lat !== null) payload.event.lat = lat;
  if (lng !== null) payload.event.lng = lng;

  setSubmitStatus("Submitting...", false);
  try {
    const body = new URLSearchParams();
    body.set("payload", JSON.stringify(payload));
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: body.toString()
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: response.ok, raw: text };
    }

    if (!response.ok || !data.ok) {
      const errMsg = data && data.error ? data.error : `Submit failed (${response.status})`;
      throw new Error(errMsg);
    }

    if (data.event) {
      const created = normalizeEvent(data.event);
      if (Number.isFinite(created.year)) {
        allEvents.push(created);
        fillOptions();
        configureTimeline();
        currentYearIndex = timelineYears.length - 1;
        yearSlider.value = String(currentYearIndex);
        render();
      }
    }

    localStorage.setItem("debook_submit_endpoint", endpoint);
    inputTitle.value = "";
    inputSummary.value = "";
    inputLat.value = "";
    inputLng.value = "";
    inputSources.value = "";
    setSubmitStatus(
      data.auto_published
        ? "Event submitted and auto-published."
        : "Event submitted. Run publishToGitHub or wait for daily trigger.",
      false
    );
  } catch (error) {
    setSubmitStatus(String(error.message || error), true);
  }
}

async function boot() {
  try {
    if (endpointInput) {
      endpointInput.value =
        localStorage.getItem("debook_submit_endpoint") || APPS_SCRIPT_ENDPOINT_DEFAULT || "";
    }
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${DATA_URL}: ${response.status}`);
    const payload = await response.json();
    if (syncStatus) {
      const generatedAt = payload.meta && payload.meta.generated_at ? payload.meta.generated_at : null;
      syncStatus.textContent = generatedAt ? `Last synced: ${generatedAt}` : "Last synced: unknown";
    }
    allEvents = (payload.events || [])
      .map(normalizeEvent)
      .filter((event) => Number.isFinite(event.year));

    fillOptions();
    configureTimeline();
    render();
  } catch (error) {
    console.error(error);
    yearLabel.textContent = "Error";
    if (syncStatus) syncStatus.textContent = "Last synced: unavailable";
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
if (eventSubmitForm) {
  eventSubmitForm.addEventListener("submit", handleEventSubmit);
}
if (endpointInput) {
  endpointInput.addEventListener("change", () => {
    const value = endpointInput.value.trim();
    if (value) {
      localStorage.setItem("debook_submit_endpoint", value);
    }
  });
}

boot();
