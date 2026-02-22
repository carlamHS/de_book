# De Book Apps Script Setup

This Apps Script project reads the `events` sheet and publishes `data/events.json` to GitHub.

## 1) Google Sheet Structure

Create a sheet tab named `events` with this header row:

```csv
id,year,title,actors,regions,summary,lat,lng,sources
```

Conventions:

- `year`: integer. BCE years are negative (example: `-221`).
- `actors`: comma-separated list.
- `regions`: comma-separated list.
- `lat`, `lng`: optional numeric values.
- `sources`: optional comma-separated URLs/refs.

## 2) Apps Script Project

1. Open the Google Sheet.
2. Extensions -> Apps Script.
3. Replace the default code with `apps-script/Code.gs`.
4. Add `apps-script/appsscript.json` content in Project Settings -> Show appsscript.json.

## 3) Script Properties

The script now has defaults for this repository:

- `GITHUB_OWNER=carlamHS`
- `GITHUB_REPO=de_book`
- `GITHUB_BRANCH=main`
- `GITHUB_PATH=data/events.json`

You can apply these defaults from the sheet menu:

- `De Book -> Setup Default GitHub Config`

Required Script Property:

- `GITHUB_TOKEN` (PAT with repository write access)

Optional Script Property:

- `EVENTS_SHEET` (if your data tab is not named `events`)

## 4) First Run

From Apps Script editor:

1. Run `initializeEventsSheet` (or menu `De Book -> Initialize events Sheet`)
2. Run `validateSheet`
3. Run `setupDefaultGitHubConfig` (or use menu action)
4. Run `publishToGitHub`

Approve permissions when prompted.

## 5) Optional: JSON API Endpoint

Deploy as Web App (Execute as: Me, Access: Anyone with link) and use `doGet` as a read-only JSON endpoint.
