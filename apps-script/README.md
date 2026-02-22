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
- `DAILY_PUBLISH_HOUR` (0-23, optional; default `9`)
- `EVENT_SUBMIT_KEY` (required for web app event input)
- `AUTO_PUBLISH_ON_SUBMIT` (`true` or `false`, optional; default `false`)

## 4) First Run

From Apps Script editor:

1. Run `initializeEventsSheet` (or menu `De Book -> Initialize events Sheet`)
2. Run `validateSheet`
3. Run `setupDefaultGitHubConfig` (or use menu action)
4. Run `publishToGitHub`

Approve permissions when prompted.

## 5) Optional: Daily Auto Publish

From sheet menu:

- `De Book -> Setup Daily Auto Publish`
- `De Book -> Show Auto Publish Status`
- `De Book -> Remove Daily Auto Publish`

By default trigger runs around `09:00` (script timezone).  
Set Script Property `DAILY_PUBLISH_HOUR` to change this.

## 6) Optional: Web App Event Input Endpoint

This project supports event creation through `doPost` for the web UI admin form.

Deploy as Web App:

1. Apps Script -> Deploy -> New deployment
2. Type: `Web app`
3. Execute as: `Me`
4. Who has access: `Anyone`
5. Copy the deployed URL (`.../exec`)

Then in your website admin form:

- set `Apps Script URL` to that deployed URL
- set `Submit Key` to your `EVENT_SUBMIT_KEY` value

Security note:

- `EVENT_SUBMIT_KEY` is required for every submit request
- do not hardcode the key into public source code
