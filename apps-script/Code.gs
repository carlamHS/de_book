/**
 * De Book Apps Script
 *
 * Required Google Sheet tab: events
 * Required header columns:
 * id, year, title, actors, regions, summary, lat, lng, sources
 *
 * Script Properties (for GitHub publish):
 * GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_PATH, GITHUB_TOKEN
 *
 * Optional Script Property:
 * EVENTS_SHEET (default: events)
 */

const EVENTS_SHEET = 'events';
const REQUIRED_COLUMNS = ['id', 'year', 'title', 'actors', 'regions', 'summary', 'lat', 'lng', 'sources'];
const DAILY_TRIGGER_HANDLER = 'publishToGitHubByTrigger';
const DEFAULT_DAILY_TRIGGER_HOUR = 9;
const DEFAULT_GITHUB_CONFIG = {
  owner: 'carlamHS',
  repo: 'de_book',
  branch: 'main',
  path: 'data/events.json'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('De Book')
    .addItem('Initialize events Sheet', 'initializeEventsSheet')
    .addItem('Validate Rows', 'validateSheet')
    .addItem('Preview JSON (Log)', 'previewJson')
    .addItem('Setup Default GitHub Config', 'setupDefaultGitHubConfig')
    .addItem('Publish events.json to GitHub', 'publishToGitHub')
    .addSeparator()
    .addItem('Setup Daily Auto Publish', 'setupDailyPublishTrigger')
    .addItem('Remove Daily Auto Publish', 'removeDailyPublishTrigger')
    .addItem('Show Auto Publish Status', 'showPublishTriggerStatus')
    .addToUi();
}

function initializeEventsSheet() {
  const sheet = getEventsSheet_({ createIfMissing: true });
  ensureHeader_(sheet);
  SpreadsheetApp.getUi().alert(`Sheet '${sheet.getName()}' is ready with the required header row.`);
}

function previewJson() {
  const payload = buildPayload_();
  Logger.log(JSON.stringify(payload, null, 2));
}

function validateSheet() {
  const sheet = getEventsSheet_();
  ensureHeader_(sheet);

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
  const result = publishToGitHubInternal_();
  SpreadsheetApp.getUi().alert(
    `Published to GitHub successfully.\n\nRepo: ${result.owner}/${result.repo}\nPath: ${result.path}\nBranch: ${result.branch}`
  );
}

function publishToGitHubByTrigger() {
  const result = publishToGitHubInternal_();
  Logger.log(
    `publishToGitHubByTrigger: success ${result.owner}/${result.repo} ${result.path} (${result.branch})`
  );
}

function publishToGitHubInternal_() {
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('GITHUB_OWNER') || DEFAULT_GITHUB_CONFIG.owner;
  const repo = props.getProperty('GITHUB_REPO') || DEFAULT_GITHUB_CONFIG.repo;
  const branch = props.getProperty('GITHUB_BRANCH') || DEFAULT_GITHUB_CONFIG.branch;
  const path = props.getProperty('GITHUB_PATH') || DEFAULT_GITHUB_CONFIG.path;
  const token = props.getProperty('GITHUB_TOKEN');

  if (!token) {
    throw new Error(
      'Missing Script Property: GITHUB_TOKEN. Create a GitHub token with Contents write access, then set GITHUB_TOKEN in Apps Script.'
    );
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

  return { owner: owner, repo: repo, branch: branch, path: path };
}

function setupDefaultGitHubConfig() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    GITHUB_OWNER: DEFAULT_GITHUB_CONFIG.owner,
    GITHUB_REPO: DEFAULT_GITHUB_CONFIG.repo,
    GITHUB_BRANCH: DEFAULT_GITHUB_CONFIG.branch,
    GITHUB_PATH: DEFAULT_GITHUB_CONFIG.path
  }, false);
  SpreadsheetApp.getUi().alert(
    'Default GitHub config saved. Please set GITHUB_TOKEN in Script Properties, then run Publish.'
  );
}

function setupDailyPublishTrigger() {
  removeDailyPublishTrigger_();
  const hour = getDailyPublishHour_();
  ScriptApp.newTrigger(DAILY_TRIGGER_HANDLER)
    .timeBased()
    .everyDays(1)
    .atHour(hour)
    .create();
  SpreadsheetApp.getUi().alert(
    `Daily auto publish trigger created at around ${String(hour).padStart(2, '0')}:00 script timezone.`
  );
}

function removeDailyPublishTrigger() {
  const removed = removeDailyPublishTrigger_();
  SpreadsheetApp.getUi().alert(removed ? 'Daily auto publish trigger removed.' : 'No daily auto publish trigger found.');
}

function showPublishTriggerStatus() {
  const triggers = ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === DAILY_TRIGGER_HANDLER);
  if (!triggers.length) {
    SpreadsheetApp.getUi().alert('Auto publish status: not configured.');
    return;
  }
  const hour = getDailyPublishHour_();
  SpreadsheetApp.getUi().alert(
    `Auto publish status: configured.\nHandler: ${DAILY_TRIGGER_HANDLER}\nApprox time: ${String(hour).padStart(2, '0')}:00 daily`
  );
}

function removeDailyPublishTrigger_() {
  const triggers = ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === DAILY_TRIGGER_HANDLER);
  triggers.forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  return triggers.length > 0;
}

function getDailyPublishHour_() {
  const raw = PropertiesService.getScriptProperties().getProperty('DAILY_PUBLISH_HOUR');
  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 23) {
    return parsed;
  }
  return DEFAULT_DAILY_TRIGGER_HOUR;
}

function buildPayload_() {
  const sheet = getEventsSheet_();
  ensureHeader_(sheet);

  const [header, ...rows] = readTable_(sheet);
  const col = indexByName_(header);

  const missing = REQUIRED_COLUMNS.filter((column) => !(column in col));
  if (missing.length) {
    throw new Error(`Missing columns in sheet '${sheet.getName()}': ${missing.join(', ')}`);
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

function getEventsSheet_(options) {
  const opts = options || {};
  const sheetName = getEventsSheetName_();
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    const target = sheetName.toLowerCase();
    sheet = ss.getSheets().find((s) => s.getName().toLowerCase() === target) || null;
  }

  if (!sheet && opts.createIfMissing) {
    sheet = ss.insertSheet(sheetName);
  }

  if (!sheet) {
    throw new Error(
      `Sheet '${sheetName}' not found. Create it manually, set Script Property EVENTS_SHEET, or run 'De Book -> Initialize events Sheet'.`
    );
  }

  return sheet;
}

function getEventsSheetName_() {
  return PropertiesService.getScriptProperties().getProperty('EVENTS_SHEET') || EVENTS_SHEET;
}

function ensureHeader_(sheet) {
  const current = sheet.getRange(1, 1, 1, REQUIRED_COLUMNS.length).getValues()[0];
  const isBlank = current.every((cell) => String(cell || '').trim() === '');
  if (isBlank) {
    sheet.getRange(1, 1, 1, REQUIRED_COLUMNS.length).setValues([REQUIRED_COLUMNS]);
  }
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
    throw new Error(`Sheet '${sheet.getName()}' is empty.`);
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
