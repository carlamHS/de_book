/**
 * De Book Apps Script
 *
 * Required Google Sheet tab: events
 * Required header columns:
 * id, year, title, actors, regions, summary, lat, lng, sources
 *
 * Script Properties (for GitHub publish):
 * GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_PATH, GITHUB_TOKEN
 */

const EVENTS_SHEET = 'events';
const REQUIRED_COLUMNS = ['id', 'year', 'title', 'actors', 'regions', 'summary', 'lat', 'lng', 'sources'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('De Book')
    .addItem('Validate Rows', 'validateSheet')
    .addItem('Preview JSON (Log)', 'previewJson')
    .addItem('Publish events.json to GitHub', 'publishToGitHub')
    .addToUi();
}

function previewJson() {
  const payload = buildPayload_();
  Logger.log(JSON.stringify(payload, null, 2));
}

function validateSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(EVENTS_SHEET);
  if (!sheet) {
    throw new Error(`Sheet '${EVENTS_SHEET}' not found.`);
  }

  const [header, ...rows] = readTable_(sheet);
  const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length) {
    throw new Error(`Missing columns: ${missing.join(', ')}`);
  }

  const col = indexByName_(header);
  const errors = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (!String(row[col.id] || '').trim()) {
      errors.push(`Row ${rowNum}: id is required.`);
    }
    if (!isFiniteNumber_(row[col.year])) {
      errors.push(`Row ${rowNum}: year must be a number (BCE can be negative).`);
    }
    if (!String(row[col.title] || '').trim()) {
      errors.push(`Row ${rowNum}: title is required.`);
    }
  });

  const ui = SpreadsheetApp.getUi();
  if (errors.length) {
    ui.alert(`Validation failed:\n\n${errors.slice(0, 12).join('\n')}${errors.length > 12 ? '\n...' : ''}`);
    return;
  }
  ui.alert(`Validation passed. ${rows.length} rows checked.`);
}

function doGet() {
  const payload = buildPayload_();
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function publishToGitHub() {
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('GITHUB_OWNER');
  const repo = props.getProperty('GITHUB_REPO');
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';
  const path = props.getProperty('GITHUB_PATH') || 'data/events.json';
  const token = props.getProperty('GITHUB_TOKEN');

  if (!owner || !repo || !token) {
    throw new Error('Set Script Properties: GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN (optional GITHUB_BRANCH/GITHUB_PATH).');
  }

  const payload = buildPayload_();
  const content = JSON.stringify(payload, null, 2) + '\n';
  const encodedContent = Utilities.base64Encode(content, Utilities.Charset.UTF_8);

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const existing = fetchGitHubFile_(apiUrl, token, branch);

  const body = {
    message: `chore(data): sync events.json from Google Sheets (${new Date().toISOString()})`,
    content: encodedContent,
    branch: branch
  };

  if (existing && existing.sha) {
    body.sha = existing.sha;
  }

  const response = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) {
    throw new Error(`GitHub publish failed (${status}): ${text}`);
  }

  SpreadsheetApp.getUi().alert('Published to GitHub successfully.');
}

function buildPayload_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(EVENTS_SHEET);
  if (!sheet) {
    throw new Error(`Sheet '${EVENTS_SHEET}' not found.`);
  }

  const [header, ...rows] = readTable_(sheet);
  const col = indexByName_(header);

  const missing = REQUIRED_COLUMNS.filter((column) => !(column in col));
  if (missing.length) {
    throw new Error(`Missing columns in sheet '${EVENTS_SHEET}': ${missing.join(', ')}`);
  }

  const events = rows
    .filter((row) => String(row[col.id] || '').trim() && isFiniteNumber_(row[col.year]))
    .map((row) => normalizeRow_(row, col))
    .sort((a, b) => a.year - b.year);

  return {
    meta: {
      project: 'De Book',
      schema_version: '1.0.0',
      generated_at: new Date().toISOString().slice(0, 10),
      source: 'Google Sheets'
    },
    events: events
  };
}

function normalizeRow_(row, col) {
  const event = {
    id: String(row[col.id]).trim(),
    year: Number(row[col.year]),
    title: String(row[col.title] || '').trim(),
    actors: splitList_(row[col.actors]),
    regions: splitList_(row[col.regions]),
    summary: String(row[col.summary] || '').trim()
  };

  const lat = toNumberOrNull_(row[col.lat]);
  const lng = toNumberOrNull_(row[col.lng]);
  const sources = splitList_(row[col.sources]);

  if (lat !== null) event.lat = lat;
  if (lng !== null) event.lng = lng;
  if (sources.length) event.sources = sources;

  return event;
}

function splitList_(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function indexByName_(header) {
  const out = {};
  header.forEach((name, idx) => {
    out[String(name || '').trim()] = idx;
  });
  return out;
}

function readTable_(sheet) {
  const data = sheet.getDataRange().getValues();
  if (!data.length) {
    throw new Error(`Sheet '${EVENTS_SHEET}' is empty.`);
  }
  const header = data[0].map((h) => String(h || '').trim());
  return [header, ...data.slice(1)];
}

function toNumberOrNull_(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isFiniteNumber_(value) {
  return Number.isFinite(Number(value));
}

function fetchGitHubFile_(apiUrl, token, branch) {
  const url = `${apiUrl}?ref=${encodeURIComponent(branch)}`;
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    },
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status === 404) return null;
  if (status < 200 || status >= 300) {
    throw new Error(`GitHub read failed (${status}): ${response.getContentText()}`);
  }
  return JSON.parse(response.getContentText());
}
