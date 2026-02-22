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

Set these in Apps Script -> Project Settings -> Script properties:

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH` (example: `main`)
- `GITHUB_PATH` (example: `data/events.json`)
- `GITHUB_TOKEN` (PAT with repository write access)

## 4) First Run

From Apps Script editor:

1. Run `validateSheet`
2. Run `publishToGitHub`

Approve permissions when prompted.

## 5) Optional: JSON API Endpoint

Deploy as Web App (Execute as: Me, Access: Anyone with link) and use `doGet` as a read-only JSON endpoint.
